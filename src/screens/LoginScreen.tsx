import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../components/Button';
import {Input} from '../components/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../components/Card';
import {colors, spacing, typography, borderRadius} from '../styles/theme';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({onLogin}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);

    // Simulate login API call
    setTimeout(() => {
      setLoading(false);
      // For demo purposes, accept any credentials
      // In production, this would validate against an API
      onLogin(username.trim(), password);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logoText}>Clean Earth Inc.</Text>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>
              Sign in to access your service management dashboard
            </Text>
          </View>

          <Card style={styles.loginCard}>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Technician Login</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                containerStyle={styles.inputContainer}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                containerStyle={styles.inputContainer}
                onSubmitEditing={handleLogin}
              />

              <Button
                title="Sign In"
                variant="primary"
                size="lg"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
              />

              <View style={styles.demoHint}>
                <Text style={styles.demoHintText}>
                  Demo: Enter any username and password to continue
                </Text>
              </View>
            </CardContent>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Forgot your password? Contact your administrator
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    ...typography['3xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  logoDot: {
    color: colors.primary,
  },
  welcomeText: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subtitleText: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  loginCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  demoHint: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  demoHintText: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});

export default LoginScreen;
