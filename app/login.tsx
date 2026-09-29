import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { loginUser } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const t = translations[language].login;

  const onLogin = async () => {
    setErrorMsg(null);
    if (!phone || !password) {
      setErrorMsg(t.fillFields);
      return;
    }

    try {
      setLoading(true);
      await loginUser({ phone, password });
      router.replace({ pathname: '/dashboard', params: { lang: language } });
    } catch (err: any) {
      const message = err.message || '';
      console.log('Login error message:', message);
      const lowerMsg = message.toLowerCase();
      
      if (
        lowerMsg.includes('password') ||
        lowerMsg.includes('passe') ||
        lowerMsg.includes('incorrect') ||
        lowerMsg.includes('credentials') ||
        lowerMsg.includes('denied')
      ) {
        setErrorMsg(t.incorrectCredentials);
      } else if (
        lowerMsg.includes('user') ||
        lowerMsg.includes('client') ||
        lowerMsg.includes('not found') ||
        lowerMsg.includes('trouvé') ||
        lowerMsg.includes('inexistant') ||
        lowerMsg.includes('aucun')
      ) {
        setErrorMsg(t.clientNotFound);
      } else {
        setErrorMsg(message || t.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.formWrap}>
          <Text style={[styles.title, isRtl && styles.rtlText]}>{t.title}</Text>

          <TextInput
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            placeholder={t.phonePlaceholder}
            placeholderTextColor="#6E7483"
            style={[styles.input, isRtl && styles.rtlInput]}
            maxLength={8}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              value={password}
              onChangeText={(text) => setPassword(text.replace(/[^0-9]/g, ''))}
              secureTextEntry={!showPassword}
              keyboardType="number-pad"
              placeholder={t.passwordPlaceholder}
              placeholderTextColor="#6E7483"
              style={[styles.passwordInput, isRtl && styles.rtlInput]}
            />
            <Pressable style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={24} 
                color="#6E7483" 
              />
            </Pressable>
          </View>

          {errorMsg && (
            <Text style={[styles.errorText, isRtl && styles.rtlText]}>
              {errorMsg}
            </Text>
          )}

          <Pressable onPress={() => router.push({ pathname: '/forgot-password', params: { lang: language } })}>
            <Text style={[styles.forgot, isRtl && styles.rtlText]}>{t.forgotPassword}</Text>
          </Pressable>

          <Pressable onPress={onLogin} disabled={loading} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{loading ? t.loading : t.loginButton}</Text>
          </Pressable>

          <Link href={{ pathname: '/register', params: { lang: language } }} style={styles.linkText}>
            {t.signup}
          </Link>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#052A63',
  },
  flex: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formWrap: {
    paddingTop: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '700',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FAF9F1',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C7CFD9',
    paddingHorizontal: 20,
    paddingVertical: 11,
    fontSize: 18,
    color: '#132240',
    marginBottom: 16,
    height: 54,
  },
  forgot: {
    color: '#F4BA42',
    textAlign: 'right',
    fontSize: 14,
    marginBottom: 24,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#F4BA42',
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54, 
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  linkText: {
    marginTop: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F1',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C7CFD9',
    marginBottom: 16,
    paddingRight: 16,
    height: 54,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 11,
    fontSize: 18,
    color: '#132240',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '600',
  },
});
