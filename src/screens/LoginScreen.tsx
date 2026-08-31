import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({onLogin}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    console.log('[LoginScreen] handleLogin called with username:', username);
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(username.trim(), password);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clean Earth Inc.</Text>
        <Text style={styles.subtitle}>Service Management</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={[styles.input, error?.includes('username') && styles.inputError]}
          placeholder="Enter username"
          value={username}
          onChangeText={text => {
            setUsername(text);
            if (error) setError(null);
          }}
          editable={!loading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, error?.includes('password') && styles.inputError]}
          placeholder="Enter password"
          value={password}
          onChangeText={text => {
            setPassword(text);
            if (error) setError(null);
          }}
          secureTextEntry
          editable={!loading}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}>
          <Text style={styles.buttonText}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.demo}>
          Demo: Enter any username and password to continue
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
  inputError: {
    borderColor: colors.destructive,
  },
  errorText: {
    ...typography.sm,
    color: colors.destructive,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  button: {
    backgroundColor: '#65B230',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  demo: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
  },
});

export default LoginScreen;
