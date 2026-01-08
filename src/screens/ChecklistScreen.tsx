import React, {useState, useMemo, useEffect} from 'react';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());

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

  // Ensure currentQuestionIndex is valid when flatQuestions changes
  useEffect(() => {
    if (currentQuestionIndex >= flatQuestions.length && flatQuestions.length > 0) {
      setCurrentQuestionIndex(flatQuestions.length - 1);
    }
  }, [flatQuestions.length, currentQuestionIndex]);

  const currentFlatQuestion = flatQuestions[currentQuestionIndex];
  const currentQuestion = currentFlatQuestion?.question;
  const progress = flatQuestions.length > 0 
    ? ((currentQuestionIndex + 1) / flatQuestions.length) * 100 
    : 0;

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        value,
      },
    }));
  };

  const getCurrentAnswer = (): ChecklistAnswer | undefined => {
    return currentQuestion ? answers[currentQuestion.id] : undefined;
  };

  // Initialize date answer to today if not set
  useEffect(() => {
    if (currentQuestion?.type === 'Date' && !answers[currentQuestion.id]) {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          value: todayString,
        },
      }));
    }
  }, [currentQuestion?.id, currentQuestion?.type]);

  const isAnswerValid = (): boolean => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    
    const answer = getCurrentAnswer();
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

  const handleNext = () => {
    if (!isAnswerValid()) {
      Alert.alert('Required Field', 'Please answer this question before continuing.');
      return;
    }

    if (currentQuestionIndex < flatQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question - show completion
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
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
      // Find first missing question
      const firstMissingIndex = flatQuestions.findIndex(
        fq => missingRequired.some(mr => mr.id === fq.question.id)
      );
      if (firstMissingIndex >= 0) {
        setCurrentQuestionIndex(firstMissingIndex);
      }
      return;
    }

    onComplete(allAnswers);
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const answer = getCurrentAnswer();
    const answerValue = answer?.value;

    switch (currentQuestion.type) {
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
                  ]}
                  onPress={() => handleAnswerChange(currentQuestion.id, option)}>
                  <Text
                    style={[
                      styles.choiceButtonText,
                      isSelected && styles.choiceButtonTextSelected,
                    ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'Single Choice':
        if (!currentQuestion.choices) return null;
        return (
          <View style={styles.choiceContainer}>
            {currentQuestion.choices.map(choice => {
              const isSelected = answerValue === choice.id || answerValue === choice.label;
              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                  ]}
                  onPress={() => handleAnswerChange(currentQuestion.id, choice.id)}>
                  <Text
                    style={[
                      styles.choiceButtonText,
                      isSelected && styles.choiceButtonTextSelected,
                    ]}>
                    {choice.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'Multiple Choice':
        if (!currentQuestion.choices) return null;
        const selectedValues = Array.isArray(answerValue) 
          ? answerValue 
          : answerValue ? [answerValue] : [];
        
        return (
          <View style={styles.choiceContainer}>
            {currentQuestion.choices.map(choice => {
              const isSelected = selectedValues.includes(choice.id) || 
                               selectedValues.includes(choice.label);
              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                  ]}
                  onPress={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== choice.id && v !== choice.label)
                      : [...selectedValues, choice.id];
                    handleAnswerChange(currentQuestion.id, newValues);
                  }}>
                  <Text
                    style={[
                      styles.choiceButtonText,
                      isSelected && styles.choiceButtonTextSelected,
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
                currentQuestion.id,
                isNaN(num) ? null : num
              );
            }}
            placeholder="Enter a number"
            size="lg"
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
        
        const handleDateSelect = (date: Date) => {
          const dateStr = date.toISOString().split('T')[0];
          handleAnswerChange(currentQuestion.id, dateStr);
          setShowDatePicker(false);
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
              style={styles.dateInputButton}
              onPress={() => {
                setDatePickerMonth(selectedDate);
                setShowDatePicker(true);
              }}>
              <Text style={styles.dateInputText}>
                {formatDateForDisplay(dateString) || 'Select Date'}
              </Text>
              <Text style={styles.dateInputIcon}>📅</Text>
            </TouchableOpacity>
            
            {/* Simple Calendar Date Picker Modal */}
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContent}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity
                      onPress={() => navigateMonth('prev')}
                      style={styles.datePickerNavButton}>
                      <Text style={styles.datePickerNavText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerMonthText}>
                      {monthNames[datePickerMonth.getMonth()]} {datePickerMonth.getFullYear()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigateMonth('next')}
                      style={styles.datePickerNavButton}>
                      <Text style={styles.datePickerNavText}>›</Text>
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
                          onPress={() => handleDateSelect(item.date)}>
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
                        handleDateSelect(today);
                      }}
                      variant="outline"
                      size="sm"
                    />
                    <Button
                      title="Cancel"
                      onPress={() => setShowDatePicker(false)}
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
            onChangeText={text => handleAnswerChange(currentQuestion.id, text)}
            placeholder="Enter your answer"
            size="lg"
            style={styles.textInput}
          />
        );

      default:
        return null;
    }
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>No questions available</Text>
          <Button title="Go Back" onPress={onCancel} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

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
            Question {currentQuestionIndex + 1} of {flatQuestions.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.questionCard}>
          <CardContent>
            {currentFlatQuestion.level > 0 && (
              <View style={styles.branchIndicator}>
                <View style={styles.branchLine} />
                <Text style={styles.branchText}>
                  {currentFlatQuestion.branch} ({currentFlatQuestion.level} level deep)
                </Text>
              </View>
            )}

            <CardTitle>
              <CardTitleText>{currentQuestion.text} &nbsp;
                                    {currentQuestion.required && (
                                        <View style={[styles.tag, styles.tagRequired]}>
                                          <Text style={styles.tagText}>Required</Text>
                                        </View>
                                      )}
                </CardTitleText>
            </CardTitle>

            {currentQuestion.description && (
              <Text style={styles.description}>{currentQuestion.description}</Text>
            )}

            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {/* {currentQuestion.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))} */}

              </View>
            )}

            <View style={styles.inputContainer}>
              {renderQuestionInput()}
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Previous"
          onPress={handlePrevious}
          variant="outline"
          disabled={currentQuestionIndex === 0}
          style={styles.footerButton}
        />
        <Button
          title={currentQuestionIndex === flatQuestions.length - 1 ? 'Complete' : 'Next'}
          onPress={handleNext}
          variant="primary"
          style={styles.footerButton}
          fullWidth={currentQuestionIndex === 0}
        />
      </View>
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
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
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

