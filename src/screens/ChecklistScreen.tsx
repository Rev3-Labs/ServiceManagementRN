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

interface ChecklistScreenProps {
  checklist: Checklist;
  onComplete: (answers: ChecklistAnswer[]) => void;
  onCancel: () => void;
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
}) => {
  const [answers, setAnswers] = useState<Record<string, ChecklistAnswer>>({});
  const [visibleQuestionIndices, setVisibleQuestionIndices] = useState<number[]>([0]);
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [datePickerQuestionId, setDatePickerQuestionId] = useState<string | null>(null);
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

  // Get the current question index (last visible question)
  const currentQuestionIndex = visibleQuestionIndices[visibleQuestionIndices.length - 1] ?? 0;
  const currentFlatQuestion = flatQuestions[currentQuestionIndex];
  const currentQuestion = currentFlatQuestion?.question;
  
  // Ensure visibleQuestionIndices includes all questions up to currentQuestionIndex
  useEffect(() => {
    if (flatQuestions.length > 0) {
      setVisibleQuestionIndices(prev => {
        const maxIndex = Math.max(...prev, currentQuestionIndex);
        const newIndices: number[] = [];
        for (let i = 0; i <= maxIndex && i < flatQuestions.length; i++) {
          if (!newIndices.includes(i)) {
            newIndices.push(i);
          }
        }
        return newIndices.length > 0 ? newIndices : [0];
      });
    }
  }, [flatQuestions.length, currentQuestionIndex]);
  
  // Calculate progress based on answered questions
  const answeredCount = Object.keys(answers).filter(id => {
    const answer = answers[id];
    return answer && answer.value !== null && answer.value !== undefined;
  }).length;
  const progress = flatQuestions.length > 0 
    ? (answeredCount / flatQuestions.length) * 100 
    : 0;

  const handleAnswerChange = (questionId: string, value: any, questionType: QuestionType) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: {
          questionId,
          value,
        },
      };
      
      // Check if we should auto-advance for Yes/No/NA or Single Choice
      const shouldAutoAdvance = questionType === 'Yes/No/NA' || questionType === 'Single Choice';
      
      if (shouldAutoAdvance && value !== null && value !== undefined) {
        // Mark as confirmed since it auto-advances
        setConfirmedQuestions(prev => new Set(prev).add(questionId));
        // Auto-advance to next question after a short delay
        setTimeout(() => {
          handleNextQuestion();
        }, 300);
      }
      
      return newAnswers;
    });
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < flatQuestions.length) {
      setVisibleQuestionIndices(prev => {
        if (!prev.includes(nextIndex)) {
          return [...prev, nextIndex];
        }
        return prev;
      });
    }
    // Don't auto-complete - user must click "Complete Checklist" button
  };


  // Initialize date answer to today if not set for visible questions
  useEffect(() => {
    visibleQuestionIndices.forEach(index => {
      const flatQuestion = flatQuestions[index];
      if (flatQuestion?.question.type === 'Date') {
        setAnswers(prev => {
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
  }, [visibleQuestionIndices, flatQuestions]);

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

    // Mark as confirmed when user clicks Continue
    setConfirmedQuestions(prev => new Set(prev).add(questionId));
    handleNextQuestion();
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
      // Find first missing question and make it visible
      const firstMissingIndex = flatQuestions.findIndex(
        fq => missingRequired.some(mr => mr.id === fq.question.id)
      );
      if (firstMissingIndex >= 0) {
        setVisibleQuestionIndices([firstMissingIndex]);
      }
      return;
    }

    onComplete(allAnswers);
  };

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
        <View style={styles.content}>
          <Text style={styles.errorText}>No questions available</Text>
          <Button title="Go Back" onPress={onCancel} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  // Get visible questions (all answered + current unanswered)
  const visibleQuestions = visibleQuestionIndices
    .map(index => flatQuestions[index])
    .filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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

          const cardStyles = [
            styles.questionCard,
            isAnswered && styles.questionCardAnswered,
            isCurrentQuestion && !isAnswered && styles.questionCardCurrent,
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

                <CardTitle>
                  <CardTitleText>
                    {question.text}&nbsp; 
                    {question.required && (
                      <View style={[styles.tag, styles.tagRequired]}>
                        <Text style={styles.tagText}>Required</Text>
                      </View>
                    )}
                  </CardTitleText>
                </CardTitle>

                {question.description && (
                  <Text style={styles.description}>{question.description}</Text>
                )}

                {question.tags && question.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {/* Tags can be displayed here if needed */}
                  </View>
                )}

                <View style={styles.inputContainer}>
                  {renderQuestionInput(question, isAnswered)}
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

                {isAnswered && isCurrentQuestion && currentQuestionIndex < flatQuestions.length - 1 && (
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  cancelButtonText: {
    ...typography.base,
    color: colors.mutedForeground,
    fontWeight: '500',
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
  tagText: {
    ...typography.xs,
    color: colors.foreground,
    fontWeight: '500',
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
  choiceButton: {
    minHeight: touchTargets.comfortable,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default ChecklistScreen;

