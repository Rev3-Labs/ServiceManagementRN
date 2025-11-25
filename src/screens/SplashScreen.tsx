import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, spacing, typography} from '../styles/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({onFinish}) => {
  useEffect(() => {
    // Simulate app initialization (check auth, load data, etc.)
    const timer = setTimeout(() => {
      onFinish();
    }, 2000); // 2 second splash screen

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Clean Earth Inc.</Text>
          <Text style={styles.tagline}>Service Management</Text>
        </View>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    ...typography['3xl'],
    fontWeight: '700',
    color: colors.primaryForeground,
    marginBottom: spacing.sm,
  },
  logoDot: {
    color: colors.card,
  },
  tagline: {
    ...typography.lg,
    color: colors.primaryForeground,
    opacity: 0.9,
    fontWeight: '500',
  },
  loader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.base,
    color: colors.primaryForeground,
    opacity: 0.8,
  },
});

export default SplashScreen;
