import React, {useState, useMemo, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {Button} from '../components/Button';
import {Input} from '../components/Input';
import {Card, CardContent, CardTitle, CardTitleText} from '../components/Card';
import {Icon} from '../components/Icon';
import {colors, spacing, typography, borderRadius, touchTargets} from '../styles/theme';
import {
  Checklist,
  ChecklistQuestion,
  ChecklistAnswer,
  QuestionType,
  ConditionalBranch,
} from '../types/checklist';
import {checklistDraftService} from '../services/checklistDraftService';

interface ChecklistScreenProps {
  checklist: Checklist;
  onComplete: (answers: ChecklistAnswer[]) => void;
  onCancel: () => void;
  /**
   * Stable key under which to persist in-progress answers, so the user can
   * cancel and re-enter without losing work. Defaults to `checklist.id` —
   * callers that want per-order or per-context persistence should pass
   * something like `${orderNumber}:${checklist.id}`.
   */
  draftKey?: string;
  /**
   * If provided, the screen renders a read-only Q&A summary of the previously
   * submitted answers (with a Reset button) instead of the editable form.
   * The parent owns the completed-answers state — `onReset` is invoked when
   * the user confirms the reset, and the parent should clear that state.
   */
  completedAnswers?: ChecklistAnswer[] | null;
  onReset?: () => void;
}

interface FlatQuestion {
  question: ChecklistQuestion;
  parentAnswer?: string; // The answer that triggered this question
  branch?: ConditionalBranch;
  level: number; // Indentation level for sub-questions
}

const ChecklistScreen: React.FC<ChecklistScreenProps> = ({
  checklist,
  onComplete,
  onCancel,
  draftKey,
  completedAnswers,
  onReset,
}) => {
  // Effective key for persisting / restoring in-progress drafts.
  const effectiveDraftKey = draftKey ?? checklist.id;

  const isReadOnly = !!(completedAnswers && completedAnswers.length > 0);

  // Lazy initial-state init from the draft service (synchronous read against
  // the in-memory cache populated by the service on app start). If the draft
  // service hasn't finished its initial async load yet, we hydrate again
  // inside an effect below once it's ready.
  const initialDraft = checklistDraftService.getDraft(effectiveDraftKey);
  const [answers, setAnswers] = useState<Record<string, ChecklistAnswer>>(
    initialDraft?.answers ?? {},
  );
  // confirmedQuestions = the set of question IDs the user has resolved (answered + Continued, auto-advanced, or skipped).
  // Visibility is derived from this — see `currentFlatQuestionIndex` / `visibleQuestions` below.
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<string>>(
    () => new Set(initialDraft?.confirmedIds ?? []),
  );
  // skippedQuestions is a strict subset of confirmedQuestions — used only to render the "Skipped" indicator.
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(
    () => new Set(initialDraft?.skippedIds ?? []),
  );

  // If the draft service hadn't finished loading at mount time, hydrate now.
  // Guarded so it only fires when the service was not yet loaded AND we
  // haven't already started the user on a fresh state.
  const hasHydratedRef = useRef(initialDraft !== null || checklistDraftService.isLoaded());
  useEffect(() => {
    if (hasHydratedRef.current) return;
    let cancelled = false;
    checklistDraftService.ready().then(() => {
      if (cancelled || hasHydratedRef.current) return;
      const draft = checklistDraftService.getDraft(effectiveDraftKey);
      if (draft) {
        setAnswers(draft.answers);
        setConfirmedQuestions(new Set(draft.confirmedIds));
        setSkippedQuestions(new Set(draft.skippedIds));
      }
      hasHydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveDraftKey]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [datePickerQuestionId, setDatePickerQuestionId] = useState<string | null>(null);
  // Tracks the open reset-confirmation modal (null = closed). 'inProgress' is
  // triggered from the form header; 'completed' is triggered from the read-only
  // view's footer — different copy + different post-confirm behavior.
  const [resetConfirmMode, setResetConfirmMode] = useState<
    'inProgress' | 'completed' | null
  >(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Flatten questions with conditional logic
  const flatQuestions = useMemo(() => {
    const flattened: FlatQuestion[] = [];
    
    const processQuestion = (
      question: ChecklistQuestion,
      level: number = 0,
      parentAnswer?: string,
      branch?: ConditionalBranch
    ) => {
      // Add the main question
      flattened.push({
        question,
        parentAnswer,
        branch,
        level,
      });

      // Process conditional questions if answer exists
      if (question.conditionalQuestions && answers[question.id]) {
        const answer = answers[question.id];
        const answerValue = Array.isArray(answer.value) 
          ? answer.value[0] 
          : answer.value?.toString().toLowerCase();

        question.conditionalQuestions.forEach(conditional => {
          // Check if this conditional branch should be shown
          const shouldShow = 
            (conditional.branch === 'IF YES' && (answerValue === 'yes' || answerValue === 'true')) ||
            (conditional.branch === 'IF NO' && (answerValue === 'no' || answerValue === 'false'));

          if (shouldShow) {
            processQuestion(
              conditional.question,
              level + 1,
              answerValue,
              conditional.branch
            );
          }
        });
      }
    };

    checklist.questions.forEach(q => processQuestion(q));
    return flattened;
  }, [checklist.questions, answers]);

  // Derive the current question position from confirmedQuestions: the first flatQuestion
  // whose ID is NOT confirmed is the user's current focus. If everything is confirmed,
  // current = the last flatQuestion (the user is at the end and ready to complete).
  // This auto-handles edits + branch flips: when the user un-confirms an earlier
  // question (Edit) or changes an answer that reshuffles conditional branches, the
  // visible chain naturally collapses to the new current and any later questions
  // whose IDs are still confirmed retain their state.
  const currentFlatQuestionIndex = useMemo(() => {
    if (flatQuestions.length === 0) return 0;
    for (let i = 0; i < flatQuestions.length; i++) {
      if (!confirmedQuestions.has(flatQuestions[i].question.id)) {
        return i;
      }
    }
    return flatQuestions.length - 1;
  }, [flatQuestions, confirmedQuestions]);

  // Kept under the legacy name so the rest of the render code reads naturally.
  const currentQuestionIndex = currentFlatQuestionIndex;
  const currentFlatQuestion = flatQuestions[currentQuestionIndex];
  const currentQuestion = currentFlatQuestion?.question;

  // Visible chain = flatQuestions up to (and including) the current question.
  // Anything past the current question is hidden until the user advances past current.
  const visibleQuestions = useMemo(
    () => flatQuestions.slice(0, currentFlatQuestionIndex + 1),
    [flatQuestions, currentFlatQuestionIndex],
  );

  // Calculate progress based on answered + skipped questions (both count as resolved).
  // Only count answers/skips for questions that are still part of flatQuestions —
  // orphaned values from a since-flipped conditional branch don't contribute.
  const liveQuestionIds = useMemo(
    () => new Set(flatQuestions.map((fq) => fq.question.id)),
    [flatQuestions],
  );
  const answeredCount = Object.keys(answers).filter((id) => {
    if (!liveQuestionIds.has(id)) return false;
    const answer = answers[id];
    return answer && answer.value !== null && answer.value !== undefined;
  }).length;
  const liveSkippedCount = Array.from(skippedQuestions).filter((id) =>
    liveQuestionIds.has(id),
  ).length;
  const resolvedCount = answeredCount + liveSkippedCount;
  const progress = flatQuestions.length > 0
    ? (resolvedCount / flatQuestions.length) * 100
    : 0;

  // Refs that always mirror the latest state — used by the unmount-flush below
  // so we can save the most recent draft synchronously when the modal is closed.
  const answersRef = useRef(answers);
  const confirmedRef = useRef(confirmedQuestions);
  const skippedRef = useRef(skippedQuestions);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    confirmedRef.current = confirmedQuestions;
  }, [confirmedQuestions]);
  useEffect(() => {
    skippedRef.current = skippedQuestions;
  }, [skippedQuestions]);

  // Tracks whether the user explicitly completed the checklist — if so, we don't
  // want the unmount-flush to re-create the draft we just cleared.
  const completedRef = useRef(false);

  // Debounced save during normal use (so we don't write on every keystroke).
  useEffect(() => {
    if (isReadOnly) return;
    if (!hasHydratedRef.current) return;
    const timer = setTimeout(() => {
      checklistDraftService.saveDraft(
        effectiveDraftKey,
        answers,
        Array.from(confirmedQuestions),
        Array.from(skippedQuestions),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [effectiveDraftKey, answers, confirmedQuestions, skippedQuestions, isReadOnly]);

  // Flush latest state on unmount so canceling within the debounce window
  // doesn't drop the most recent change.
  useEffect(() => {
    if (isReadOnly) return;
    return () => {
      if (!hasHydratedRef.current) return;
      if (completedRef.current) return;
      checklistDraftService.saveDraft(
        effectiveDraftKey,
        answersRef.current,
        Array.from(confirmedRef.current),
        Array.from(skippedRef.current),
      );
    };
  }, [effectiveDraftKey, isReadOnly]);

  const handleAnswerChange = (questionId: string, value: any, questionType: QuestionType) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        value,
      },
    }));

    // For auto-advance question types, hold the selection visible for a moment
    // (so the user sees their choice highlight) before confirming + revealing the next.
    const shouldAutoAdvance = questionType === 'Yes/No/NA' || questionType === 'Single Choice';
    if (shouldAutoAdvance && value !== null && value !== undefined) {
      // If the user is editing a previously-skipped question, clear the skipped flag.
      setSkippedQuestions(prev => {
        if (!prev.has(questionId)) return prev;
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setTimeout(() => {
        setConfirmedQuestions(prev => new Set(prev).add(questionId));
      }, 300);
    }
  };

  // Initialize date answer to today if not set for any currently visible Date question.
  useEffect(() => {
    if (isReadOnly) return;
    visibleQuestions.forEach((flatQuestion) => {
      if (flatQuestion.question.type === 'Date') {
        setAnswers((prev) => {
          if (prev[flatQuestion.question.id]) {
            return prev; // Already has an answer
          }
          const today = new Date();
          const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
          return {
            ...prev,
            [flatQuestion.question.id]: {
              questionId: flatQuestion.question.id,
              value: todayString,
            },
          };
        });
      }
    });
  }, [visibleQuestions, isReadOnly]);

  const isAnswerValid = (question: ChecklistQuestion): boolean => {
    if (!question.required) return true;
    
    const answer = answers[question.id];
    if (!answer || answer.value === null || answer.value === undefined) {
      return false;
    }
    
    if (Array.isArray(answer.value)) {
      return answer.value.length > 0;
    }
    
    if (typeof answer.value === 'string') {
      return answer.value.trim().length > 0;
    }
    
    return true;
  };

  const handleContinue = (questionId: string) => {
    const question = flatQuestions.find(fq => fq.question.id === questionId)?.question;
    if (!question) return;

    if (!isAnswerValid(question)) {
      Alert.alert('Required Field', 'Please answer this question before continuing.');
      return;
    }

    // Mark as confirmed; visibility advancement is derived from confirmed state.
    setConfirmedQuestions(prev => new Set(prev).add(questionId));
    // If the user previously skipped this question and is now answering it,
    // remove it from the skipped set.
    setSkippedQuestions(prev => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleSkipQuestion = (questionId: string) => {
    const question = flatQuestions.find(fq => fq.question.id === questionId)?.question;
    if (!question || question.required) return;

    // Clear any in-progress answer so the question stays visually "unanswered",
    // mark it as skipped (for the indicator) and confirmed (so the flow advances).
    setAnswers(prev => {
      if (!(questionId in prev)) return prev;
      const next = {...prev};
      delete next[questionId];
      return next;
    });
    setSkippedQuestions(prev => new Set(prev).add(questionId));
    setConfirmedQuestions(prev => new Set(prev).add(questionId));
  };

  const handleResetInProgress = () => {
    setResetConfirmMode('inProgress');
  };

  const handleConfirmReset = () => {
    const mode = resetConfirmMode;
    checklistDraftService.clearDraft(effectiveDraftKey);
    setAnswers({});
    setConfirmedQuestions(new Set());
    setSkippedQuestions(new Set());
    setResetConfirmMode(null);
    if (mode === 'completed') {
      onReset?.();
    }
  };

  const handleComplete = () => {
    const allAnswers = Object.values(answers);
    const requiredQuestions = flatQuestions
      .map(fq => fq.question)
      .filter(q => q.required);
    
    const missingRequired = requiredQuestions.filter(
      q => !allAnswers.find(a => a.questionId === q.id && a.value != null)
    );

    if (missingRequired.length > 0) {
      Alert.alert(
        'Incomplete Checklist',
        `Please answer all required questions. ${missingRequired.length} question(s) remaining.`
      );
      // Un-confirm the first missing question (and everything after it) so it
      // becomes the current question and the user is taken straight to it.
      const firstMissingIndex = flatQuestions.findIndex(
        fq => missingRequired.some(mr => mr.id === fq.question.id)
      );
      if (firstMissingIndex >= 0) {
        const idsToUnconfirm = new Set<string>();
        for (let i = firstMissingIndex; i < flatQuestions.length; i++) {
          idsToUnconfirm.add(flatQuestions[i].question.id);
        }
        setConfirmedQuestions(prev => {
          const next = new Set(prev);
          idsToUnconfirm.forEach(id => next.delete(id));
          return next;
        });
        setSkippedQuestions(prev => {
          const next = new Set(prev);
          idsToUnconfirm.forEach(id => next.delete(id));
          return next;
        });
      }
      return;
    }

    // Checklist is complete — clear the persisted draft so re-entering starts fresh.
    completedRef.current = true;
    checklistDraftService.clearDraft(effectiveDraftKey);
    onComplete(allAnswers);
  };

  const renderRadioIndicator = (isSelected: boolean) => (
    <View
      style={[
        styles.choiceIndicator,
        styles.radioIndicator,
        isSelected && styles.choiceIndicatorSelected,
      ]}>
      {isSelected && <View style={styles.radioInner} />}
    </View>
  );

  const renderCheckboxIndicator = (isSelected: boolean) => (
    <View
      style={[
        styles.choiceIndicator,
        styles.checkboxIndicator,
        isSelected && styles.choiceIndicatorSelected,
      ]}>
      {isSelected && (
        <Icon name="check" size={16} color={colors.primary} />
      )}
    </View>
  );

  const renderQuestionInput = (question: ChecklistQuestion, isAnswered: boolean) => {
    const answer = answers[question.id];
    const answerValue = answer?.value;

    switch (question.type) {
      case 'Yes/No/NA':
        return (
          <View style={styles.choiceContainer}>
            {['Yes', 'No', 'N/A'].map(option => {
              const isSelected = answerValue?.toString().toLowerCase() === option.toLowerCase();
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                    isAnswered && !isSelected && styles.choiceButtonDisabled,
                  ]}
                  onPress={() => !isAnswered && handleAnswerChange(question.id, option, question.type)}
                  disabled={isAnswered}>
                  {renderRadioIndicator(isSelected)}
                  <Text
                    style={[
                      styles.choiceButtonText,
                      isSelected && styles.choiceButtonTextSelected,
                      isAnswered && !isSelected && styles.choiceButtonTextDisabled,
                    ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'Single Choice':
        if (!question.choices) return null;
        return (
          <View style={styles.choiceContainer}>
            {question.choices.map(choice => {
              const isSelected = answerValue === choice.id || answerValue === choice.label;
              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                    isAnswered && !isSelected && styles.choiceButtonDisabled,
                  ]}
                  onPress={() => !isAnswered && handleAnswerChange(question.id, choice.id, question.type)}
                  disabled={isAnswered}>
                  {renderRadioIndicator(isSelected)}
                  <Text
                    style={[
                      styles.choiceButtonText,
                      isSelected && styles.choiceButtonTextSelected,
                      isAnswered && !isSelected && styles.choiceButtonTextDisabled,
                    ]}>
                    {choice.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'Multiple Choice':
        if (!question.choices) return null;
        const selectedValues = Array.isArray(answerValue)
          ? answerValue
          : answerValue ? [answerValue] : [];

        return (
          <View style={styles.choiceContainer}>
            {question.choices.map(choice => {
              const isSelected = selectedValues.includes(choice.id) ||
                               selectedValues.includes(choice.label);
              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                    isAnswered && !isSelected && styles.choiceButtonDisabled,
                  ]}
                  onPress={() => {
                    if (isAnswered) return;
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== choice.id && v !== choice.label)
                      : [...selectedValues, choice.id];
                    handleAnswerChange(question.id, newValues, question.type);
                  }}
                  disabled={isAnswered}>
                  {renderCheckboxIndicator(isSelected)}
                  <Text
                    style={[
                      styles.choiceButtonText,
                      isSelected && styles.choiceButtonTextSelected,
                      isAnswered && !isSelected && styles.choiceButtonTextDisabled,
                    ]}>
                    {choice.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'Number':
        return (
          <Input
            keyboardType="numeric"
            value={answerValue?.toString() || ''}
            onChangeText={text => {
              const num = parseFloat(text);
              handleAnswerChange(
                question.id,
                isNaN(num) ? null : num,
                question.type
              );
            }}
            placeholder="Enter a number"
            size="lg"
            editable={!isAnswered}
          />
        );

      case 'Date':
        const dateString = answerValue && !Array.isArray(answerValue) 
          ? answerValue.toString() 
          : '';
        const selectedDate = dateString ? new Date(dateString) : new Date();
        
        // Format date for display (YYYY-MM-DD to MM/DD/YYYY)
        const formatDateForDisplay = (dateStr: string) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
          return dateStr;
        };
        
        // Get calendar days for current month
        const getCalendarDays = (date: Date) => {
          const year = date.getFullYear();
          const month = date.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const daysInMonth = lastDay.getDate();
          const startingDayOfWeek = firstDay.getDay();
          
          const days: Array<{day: number; date: Date; isCurrentMonth: boolean}> = [];
          
          // Add previous month's trailing days
          const prevMonth = new Date(year, month - 1, 0);
          for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
              day: prevMonth.getDate() - i,
              date: new Date(year, month - 1, prevMonth.getDate() - i),
              isCurrentMonth: false,
            });
          }
          
          // Add current month's days
          for (let day = 1; day <= daysInMonth; day++) {
            days.push({
              day,
              date: new Date(year, month, day),
              isCurrentMonth: true,
            });
          }
          
          // Add next month's leading days to fill the grid
          const remainingDays = 42 - days.length; // 6 rows × 7 days
          for (let day = 1; day <= remainingDays; day++) {
            days.push({
              day,
              date: new Date(year, month + 1, day),
              isCurrentMonth: false,
            });
          }
          
          return days;
        };
        
        const calendarDays = getCalendarDays(datePickerMonth);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        const handleDateSelect = (date: Date, qId: string) => {
          const dateStr = date.toISOString().split('T')[0];
          handleAnswerChange(qId, dateStr, question.type);
          setShowDatePicker(false);
          setDatePickerQuestionId(null);
        };
        
        const navigateMonth = (direction: 'prev' | 'next') => {
          const newDate = new Date(datePickerMonth);
          if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
          } else {
            newDate.setMonth(newDate.getMonth() + 1);
          }
          setDatePickerMonth(newDate);
        };
        
        return (
          <View>
            <TouchableOpacity
              style={[
                styles.dateInputButton,
                isAnswered && styles.dateInputButtonDisabled,
              ]}
              onPress={() => {
                if (isAnswered) return;
                setDatePickerMonth(selectedDate);
                setDatePickerQuestionId(question.id);
                setShowDatePicker(true);
              }}
              disabled={isAnswered}>
              <Text style={[
                styles.dateInputText,
                isAnswered && styles.dateInputTextDisabled,
              ]}>
                {formatDateForDisplay(dateString) || 'Select Date'}
              </Text>
              <Text style={styles.dateInputIcon}>📅</Text>
            </TouchableOpacity>
            
            {/* Simple Calendar Date Picker Modal */}
            <Modal
              visible={showDatePicker && datePickerQuestionId === question.id}
              transparent={true}
              animationType="slide"
              onRequestClose={() => {
                setShowDatePicker(false);
                setDatePickerQuestionId(null);
              }}>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContent}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity
                      onPress={() => navigateMonth('prev')}
                      style={styles.datePickerNavButton}>
                      <Icon name="chevron-left" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={styles.datePickerMonthText}>
                      {monthNames[datePickerMonth.getMonth()]} {datePickerMonth.getFullYear()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigateMonth('next')}
                      style={styles.datePickerNavButton}>
                      <Icon name="chevron-right" size={24} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.datePickerGrid}>
                    {/* Day headers */}
                    {dayNames.map(day => (
                      <View key={day} style={styles.datePickerDayHeader}>
                        <Text style={styles.datePickerDayHeaderText}>{day}</Text>
                      </View>
                    ))}
                    
                    {/* Calendar days */}
                    {calendarDays.map((item, index) => {
                      const isSelected = dateString && 
                        item.date.toISOString().split('T')[0] === dateString;
                      const isToday = item.date.toDateString() === new Date().toDateString();
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.datePickerDay,
                            !item.isCurrentMonth ? styles.datePickerDayOtherMonth : undefined,
                            isSelected ? styles.datePickerDaySelected : undefined,
                            isToday && !isSelected ? styles.datePickerDayToday : undefined,
                          ]}
                          onPress={() => handleDateSelect(item.date, question.id)}>
                          <Text
                            style={[
                              styles.datePickerDayText,
                              !item.isCurrentMonth ? styles.datePickerDayTextOtherMonth : undefined,
                              isSelected ? styles.datePickerDayTextSelected : undefined,
                              isToday && !isSelected ? styles.datePickerDayTextToday : undefined,
                            ]}>
                            {item.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <View style={styles.datePickerFooter}>
                    <Button
                      title="Today"
                      onPress={() => {
                        const today = new Date();
                        handleDateSelect(today, question.id);
                      }}
                      variant="outline"
                      size="sm"
                    />
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setShowDatePicker(false);
                        setDatePickerQuestionId(null);
                      }}
                      variant="outline"
                      size="sm"
                    />
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        );

      case 'Text':
        return (
          <Input
            multiline
            numberOfLines={4}
            value={answerValue?.toString() || ''}
            onChangeText={text => handleAnswerChange(question.id, text, question.type)}
            placeholder="Enter your answer"
            size="lg"
            style={styles.textInput}
            editable={!isAnswered}
          />
        );

      default:
        return null;
    }
  };

  if (flatQuestions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {checklist.name}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityLabel="Close checklist"
              accessibilityRole="button">
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>No questions available</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isReadOnly) {
    const answerMap = new Map(
      (completedAnswers ?? []).map(a => [a.questionId, a]),
    );

    type SummaryItem = {
      question: ChecklistQuestion;
      level: number;
      answer: ChecklistAnswer | undefined;
    };
    const summaryItems: SummaryItem[] = [];
    const walkSummary = (q: ChecklistQuestion, level: number) => {
      const a = answerMap.get(q.id);
      summaryItems.push({question: q, level, answer: a});
      if (q.conditionalQuestions && a && a.value != null) {
        const raw = Array.isArray(a.value)
          ? a.value[0]?.toString().toLowerCase()
          : a.value.toString().toLowerCase();
        q.conditionalQuestions.forEach(cond => {
          const shouldShow =
            (cond.branch === 'IF YES' && (raw === 'yes' || raw === 'true')) ||
            (cond.branch === 'IF NO' && (raw === 'no' || raw === 'false'));
          if (shouldShow) walkSummary(cond.question, level + 1);
        });
      }
    };
    checklist.questions.forEach(q => walkSummary(q, 0));

    const formatAnswerValue = (
      q: ChecklistQuestion,
      a: ChecklistAnswer | undefined,
    ): string => {
      if (
        !a ||
        a.value === null ||
        a.value === undefined ||
        (Array.isArray(a.value) && a.value.length === 0) ||
        (typeof a.value === 'string' && a.value.trim() === '')
      ) {
        return 'Not answered';
      }
      const value = a.value;
      switch (q.type) {
        case 'Yes/No/NA':
          return value.toString();
        case 'Single Choice': {
          const choice = q.choices?.find(
            c => c.id === value || c.label === value,
          );
          return choice?.label ?? value.toString();
        }
        case 'Multiple Choice': {
          const arr = Array.isArray(value) ? value : [value];
          return arr
            .map(v => {
              const choice = q.choices?.find(
                c => c.id === v || c.label === v,
              );
              return choice?.label ?? v.toString();
            })
            .join(', ');
        }
        case 'Date': {
          const s = value.toString();
          const parts = s.split('-');
          if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
          return s;
        }
        case 'Number':
        case 'Text':
        default:
          return value.toString();
      }
    };

    const handleReset = () => {
      setResetConfirmMode('completed');
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.summaryHeaderTextColumn}>
              <Text style={styles.summaryHeaderTitle} numberOfLines={1}>
                {checklist.name}
              </Text>
              <Text style={styles.summaryHeaderSubtitle}>
                Completed — {summaryItems.length} question
                {summaryItems.length === 1 ? '' : 's'} answered
              </Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityLabel="Close checklist"
              accessibilityRole="button">
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {summaryItems.map((item, idx) => (
            <View
              key={`${item.question.id}-${idx}`}
              style={[
                styles.summaryItem,
                item.level > 0 && {
                  paddingLeft: spacing.md + spacing.lg * item.level,
                  borderLeftWidth: 2,
                  borderLeftColor: colors.border,
                  marginLeft: spacing.md * item.level,
                },
              ]}>
              <Text style={styles.summaryQuestion}>{item.question.text}</Text>
              <Text style={styles.summaryAnswer}>
                {formatAnswerValue(item.question, item.answer)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Reset Checklist"
            onPress={handleReset}
            variant="outline"
            size="lg"
          />
        </View>

        <ResetConfirmDialog
          mode={resetConfirmMode}
          onCancel={() => setResetConfirmMode(null)}
          onConfirm={handleConfirmReset}
        />
      </SafeAreaView>
    );
  }

  const hasProgress =
    Object.keys(answers).length > 0 ||
    confirmedQuestions.size > 0 ||
    skippedQuestions.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {checklist.name}
          </Text>
          {hasProgress && (
            <TouchableOpacity
              onPress={handleResetInProgress}
              style={styles.headerResetButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityLabel="Reset checklist"
              accessibilityRole="button">
              <Icon
                name="refresh"
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={styles.headerResetText}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onCancel}
            style={styles.closeButton}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            accessibilityLabel="Close checklist"
            accessibilityRole="button">
            <Icon name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
          </View>
          <Text style={styles.progressText}>
            {answeredCount} of {flatQuestions.length} answered
          </Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => {
          // Auto-scroll to bottom when new question appears
          if (scrollViewRef.current && visibleQuestions.length > 0) {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }}>
        {visibleQuestions.map((flatQuestion, questionIndex) => {
          const question = flatQuestion.question;
          const answer = answers[question.id];
          const hasAnswer = answer && answer.value !== null && answer.value !== undefined;
          const isConfirmed = confirmedQuestions.has(question.id);
          const isSkipped = skippedQuestions.has(question.id);
          // A question is "answered" (visually) only if it has an answer AND is confirmed
          // OR if it's auto-advance type (Yes/No/NA, Single Choice) and has an answer
          const isAnswered = hasAnswer && (
            isConfirmed ||
            question.type === 'Yes/No/NA' ||
            question.type === 'Single Choice'
          );
          const isCurrentQuestion = questionIndex === visibleQuestions.length - 1;
          const isLastQuestion = currentQuestionIndex === flatQuestions.length - 1;
          // Don't show continue button for the last question - user will use "Complete Checklist" button
          const needsContinueButton = hasAnswer && !isConfirmed && isCurrentQuestion &&
            !isLastQuestion &&
            question.type !== 'Yes/No/NA' &&
            question.type !== 'Single Choice';
          // Skip button: only on the current, non-required, not-yet-resolved question.
          // (Hidden on the very last question — there's nothing to advance to; the user
          // can simply tap "Complete Checklist" without answering.)
          const canSkip =
            !question.required &&
            isCurrentQuestion &&
            !isAnswered &&
            !isSkipped &&
            !isLastQuestion;

          const cardStyles = [
            styles.questionCard,
            (isAnswered || isSkipped) && styles.questionCardAnswered,
            isCurrentQuestion && !isAnswered && !isSkipped && styles.questionCardCurrent,
          ].filter(Boolean);

          return (
            <Card
              key={question.id}
              style={cardStyles.length > 1 ? cardStyles : cardStyles[0]}>
              <CardContent>
                {flatQuestion.level > 0 && (
                  <View style={styles.branchIndicator}>
                    <View style={styles.branchLine} />
                    <Text style={styles.branchText}>
                      {flatQuestion.branch} ({flatQuestion.level} level deep)
                    </Text>
                  </View>
                )}

                <View style={styles.questionHeaderRow}>
                  <View style={styles.questionTitleColumn}>
                    <CardTitle>
                      <CardTitleText>
                        {question.text}&nbsp;
                        {question.required ? (
                          <View style={[styles.tag, styles.tagRequired]}>
                            <Text style={styles.tagText}>Required</Text>
                          </View>
                        ) : (
                          <View style={[styles.tag, styles.tagOptional]}>
                            <Text style={[styles.tagText, styles.tagTextOptional]}>Optional</Text>
                          </View>
                        )}
                      </CardTitleText>
                    </CardTitle>
                  </View>
                  {canSkip && (
                    <TouchableOpacity
                      onPress={() => handleSkipQuestion(question.id)}
                      style={styles.skipHeaderButton}
                      hitSlop={8}
                      activeOpacity={0.7}>
                      <Text style={styles.skipHeaderButtonText}>Skip</Text>
                      <Icon
                        name="chevron-right"
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {question.description && (
                  <Text style={styles.description}>{question.description}</Text>
                )}

                {question.tags && question.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {/* Tags can be displayed here if needed */}
                  </View>
                )}

                {question.type === 'Multiple Choice' && (
                  <Text style={styles.choiceHint}>Select all that apply</Text>
                )}

                <View style={styles.inputContainer}>
                  {/* Inputs are always enabled — the user can change any answer
                      at any time, which will reflow conditional branches and
                      collapse subsequent confirmed questions out of view as needed. */}
                  {renderQuestionInput(question, false)}
                </View>

                {needsContinueButton && (
                  <View style={styles.continueButtonContainer}>
                    <Button
                      title={currentQuestionIndex === flatQuestions.length - 1 ? 'Complete' : 'Continue'}
                      onPress={() => handleContinue(question.id)}
                      variant="primary"
                      size="lg"
                    />
                  </View>
                )}

                {isSkipped && (
                  <View style={styles.answeredIndicator}>
                    <Icon
                      name="skip-next"
                      size={16}
                      color={colors.mutedForeground}
                      style={styles.answeredIcon}
                    />
                    <Text style={[styles.answeredText, styles.skippedText]}>Skipped</Text>
                  </View>
                )}

                {isAnswered && !isSkipped && isCurrentQuestion && currentQuestionIndex < flatQuestions.length - 1 && (
                  <View style={styles.answeredIndicator}>
                    <Icon name="check" size={16} color={colors.success} style={styles.answeredIcon} />
                    <Text style={styles.answeredText}>Answered</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          );
        })}
      </ScrollView>

      {currentQuestionIndex === flatQuestions.length - 1 && (
        <View style={styles.footer}>
          <Button
            title="Complete Checklist"
            onPress={handleComplete}
            variant="primary"
            size="lg"
          />
        </View>
      )}

      <ResetConfirmDialog
        mode={resetConfirmMode}
        onCancel={() => setResetConfirmMode(null)}
        onConfirm={handleConfirmReset}
      />
    </SafeAreaView>
  );
};

interface ResetConfirmDialogProps {
  mode: 'inProgress' | 'completed' | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const ResetConfirmDialog: React.FC<ResetConfirmDialogProps> = ({
  mode,
  onCancel,
  onConfirm,
}) => (
  <Modal
    visible={mode !== null}
    transparent
    animationType="fade"
    onRequestClose={onCancel}>
    <View style={styles.confirmOverlay}>
      <View style={styles.confirmDialog}>
        <Text style={styles.confirmTitle}>Reset Checklist</Text>
        <Text style={styles.confirmMessage}>
          {mode === 'completed'
            ? 'Are you sure you want to reset this checklist? All answers will be cleared and you will need to fill it out again.'
            : 'Are you sure you want to start over? All current answers will be cleared.'}
        </Text>
        <View style={styles.confirmActions}>
          <Button
            title="Cancel"
            variant="outline"
            size="md"
            onPress={onCancel}
          />
          <Button
            title="Reset"
            variant="destructive"
            size="md"
            onPress={onConfirm}
          />
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmDialog: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 480,
  },
  confirmTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  confirmMessage: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  questionCard: {
    marginBottom: spacing.lg,
  },
  questionCardAnswered: {
    opacity: 0.8,
    borderColor: colors.muted,
  },
  questionCardCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  branchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
  },
  branchLine: {
    width: 4,
    height: 40,
    backgroundColor: colors.destructive,
    marginRight: spacing.sm,
    borderRadius: 2,
  },
  branchText: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  description: {
    ...typography.base,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagRequired: {
    backgroundColor: colors.warning,
  },
  tagOptional: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    ...typography.xs,
    color: colors.foreground,
    fontWeight: '500',
  },
  tagTextOptional: {
    color: colors.mutedForeground,
  },
  inputContainer: {
    marginTop: spacing.md,
  },
  textInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  choiceContainer: {
    gap: spacing.md,
  },
  choiceHint: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  choiceButton: {
    minHeight: touchTargets.comfortable,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  choiceIndicator: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.input,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceIndicatorSelected: {
    borderColor: colors.primaryForeground,
    backgroundColor: colors.primaryForeground,
  },
  radioIndicator: {
    borderRadius: 11,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  checkboxIndicator: {
    borderRadius: borderRadius.sm,
  },
  choiceButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceButtonText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  choiceButtonTextSelected: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  choiceButtonDisabled: {
    opacity: 0.5,
  },
  choiceButtonTextDisabled: {
    opacity: 0.5,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
  },
  continueButtonContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  questionTitleColumn: {
    flexShrink: 1,
    flexGrow: 1,
  },
  skipHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    flexShrink: 0,
  },
  skipHeaderButtonText: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '600',
    marginRight: 2,
  },
  answeredIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  answeredIcon: {
    marginRight: spacing.xs / 2,
  },
  answeredText: {
    ...typography.sm,
    color: colors.success,
    fontWeight: '600',
  },
  skippedText: {
    color: colors.mutedForeground,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.lg,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  dateInputButton: {
    minHeight: touchTargets.comfortable,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    ...typography.base,
    color: colors.foreground,
  },
  dateInputIcon: {
    fontSize: 24,
  },
  dateInputButtonDisabled: {
    opacity: 0.5,
  },
  dateInputTextDisabled: {
    opacity: 0.5,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 500,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  datePickerNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  datePickerNavText: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  datePickerMonthText: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  datePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  datePickerDayHeader: {
    width: '14.28%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  datePickerDayHeaderText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  datePickerDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    margin: 2,
  },
  datePickerDayOtherMonth: {
    opacity: 0.3,
  },
  datePickerDaySelected: {
    backgroundColor: colors.primary,
  },
  datePickerDayToday: {
    backgroundColor: colors.muted,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  datePickerDayText: {
    ...typography.base,
    color: colors.foreground,
  },
  datePickerDayTextOtherMonth: {
    color: colors.mutedForeground,
  },
  datePickerDayTextSelected: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  datePickerDayTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  headerResetText: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  summaryHeaderTextColumn: {
    flex: 1,
  },
  summaryHeaderTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  summaryHeaderSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  summaryItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryQuestion: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  summaryAnswer: {
    ...typography.base,
    color: colors.mutedForeground,
  },
});

export default ChecklistScreen;

