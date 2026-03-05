import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export default function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps): React.JSX.Element {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (): Promise<void> => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Navigation will happen automatically via AuthContext state change
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kayıt başarısız';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>📚</Text>
          <Text style={styles.title}>Salen Hocam</Text>
          <Text style={styles.subtitle}>Yeni Hesap Oluştur</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Ad Soyad</Text>
          <TextInput
            style={styles.input}
            placeholder="Adınız Soyadınız"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            editable={!loading}
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="En az 6 karakter"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            editable={!loading}
          />

          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi tekrar girin"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={onSwitchToLogin}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Zaten hesabınız var mı? <Text style={styles.linkTextBold}>Giriş Yapın</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  button: {
    height: 50,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#94b8e8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    fontWeight: '600',
    color: '#1a73e8',
  },
});
