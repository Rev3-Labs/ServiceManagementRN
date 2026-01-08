import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView, Modal} from 'react-native';
import {colors, typography, spacing, borderRadius} from '../styles/theme';
import {Button} from '../components/Button';
import {Card, CardContent, CardTitle, CardTitleText} from '../components/Card';
import ChecklistScreen from './ChecklistScreen';
import {sampleChecklist} from '../data/sampleChecklist';
import {ChecklistAnswer} from '../types/checklist';

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

interface ServiceCloseoutScreenProps {
  onNavigate: (screen: Screen) => void;
  onGoBack: () => void;
}

const ServiceCloseoutScreen: React.FC<ServiceCloseoutScreenProps> = ({
  onNavigate,
  onGoBack,
}) => {
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistAnswers, setChecklistAnswers] = useState<ChecklistAnswer[] | null>(null);
  const [serviceAcknowledged, setServiceAcknowledged] = useState(false);

  const handleStartChecklist = () => {
    setShowChecklist(true);
  };

  const handleChecklistComplete = (answers: ChecklistAnswer[]) => {
    console.log('[ServiceCloseout] Checklist completed:', answers);
    setChecklistAnswers(answers);
    setShowChecklist(false);
    // Answers are saved in state, ready for service completion
  };

  const handleChecklistCancel = () => {
    Alert.alert(
      'Cancel Checklist',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            setShowChecklist(false);
          },
        },
      ]
    );
  };

  const handleEditChecklist = () => {
    setShowChecklist(true);
  };

  const handleAcknowledgeService = () => {
    if (!checklistAnswers || checklistAnswers.length === 0) {
      Alert.alert(
        'Checklist Required',
        'Please complete the checklist before acknowledging the service.'
      );
      return;
    }

    Alert.alert(
      'Acknowledge Service',
      'Are you sure you want to acknowledge and complete this service? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Acknowledge',
          onPress: () => {
            setServiceAcknowledged(true);
            handleCompleteService();
          },
        },
      ]
    );
  };

  const handleCompleteService = () => {
    // Here you would send the service completion data to your backend
    const serviceCompletionData = {
      checklistId: sampleChecklist.id,
      checklistAnswers: checklistAnswers,
      acknowledgedAt: new Date().toISOString(),
      completed: true,
    };

    console.log('[ServiceCloseout] Service completed:', serviceCompletionData);

    Alert.alert(
      'Service Completed',
      'The service has been successfully acknowledged and completed.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Optionally navigate back or reset
            // onGoBack();
          },
        },
      ]
    );
  };


  const isChecklistCompleted = checklistAnswers !== null && checklistAnswers.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        activeOpacity={0.7}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Service Closeout</Text>
          <Text style={styles.subtitle}>
            Complete the checklist and acknowledge service completion
          </Text>
        </View>

        {/* Checklist Section */}
        <Card style={styles.sectionCard}>
          <CardContent>
            <CardTitle>
              <CardTitleText>Service Checklist</CardTitleText>
            </CardTitle>
            <Text style={styles.sectionDescription}>
              {sampleChecklist.description || 'Complete the required checklist items'}
            </Text>

            <View style={styles.checklistStatusContainer}>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusIndicator,
                  isChecklistCompleted ? styles.statusIndicatorComplete : styles.statusIndicatorPending
                ]}>
                  <Text style={[
                    styles.statusIndicatorText,
                    isChecklistCompleted ? styles.statusIndicatorTextComplete : styles.statusIndicatorTextPending
                  ]}>
                    {isChecklistCompleted ? '✓' : '○'}
                  </Text>
                </View>
                <Text style={styles.statusText}>
                  {isChecklistCompleted 
                    ? `Checklist Completed (${checklistAnswers?.length} answers)`
                    : 'Checklist Not Started'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {isChecklistCompleted ? (
                <Button
                  title="Edit Checklist"
                  onPress={handleEditChecklist}
                  variant="outline"
                  fullWidth
                />
              ) : (
                <Button
                  title="Start Checklist"
                  onPress={handleStartChecklist}
                  variant="primary"
                  fullWidth
                />
              )}
            </View>
          </CardContent>
        </Card>


        {/* Checklist Summary (if completed) */}
        {isChecklistCompleted && (
          <Card style={styles.sectionCard}>
            <CardContent>
              <CardTitle>
                <CardTitleText>Checklist Summary</CardTitleText>
              </CardTitle>
              <Text style={styles.summaryText}>
                {checklistAnswers.length} question(s) answered
              </Text>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={handleEditChecklist}
                activeOpacity={0.7}>
                <Text style={styles.viewDetailsText}>View/Edit Checklist Details</Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {/* Checklist Modal */}
      <Modal
        visible={showChecklist}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleChecklistCancel}>
        <ChecklistScreen
          checklist={sampleChecklist}
          onComplete={handleChecklistComplete}
          onCancel={handleChecklistCancel}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  backButtonText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionDescription: {
    ...typography.base,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  checklistStatusContainer: {
    marginVertical: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusIndicatorPending: {
    backgroundColor: colors.muted,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusIndicatorComplete: {
    backgroundColor: colors.success,
  },
  statusIndicatorText: {
    ...typography.base,
    fontWeight: '600',
  },
  statusIndicatorTextPending: {
    color: colors.mutedForeground,
  },
  statusIndicatorTextComplete: {
    color: colors.primaryForeground,
  },
  statusText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  warningBox: {
    backgroundColor: colors.warning + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
  },
  warningText: {
    ...typography.base,
    color: colors.foreground,
  },
  acknowledgedBox: {
    backgroundColor: colors.success + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
  },
  acknowledgedText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  acknowledgedDate: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  summaryText: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  viewDetailsButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  viewDetailsText: {
    ...typography.base,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default ServiceCloseoutScreen;

