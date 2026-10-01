import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { registerUser, sendSignupOtp } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].register;

  // Step: 1 = form, 2 = OTP verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form fields
  const [name, setName] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OTP fields
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<any>(null);
  const otpInputRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [resendTimer]);

  // Step 1: Validate form then send OTP
  const handleSendOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name || !prenom || !phone || !password || !confirmPassword) {
      setErrorMsg(t.requiredFields);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(translations[language].profile.passwordMismatch);
      return;
    }

    try {
      setLoading(true);
      await sendSignupOtp(phone);
      setSuccessMsg(t.otpSent);
      setResendTimer(120);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || t.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      await sendSignupOtp(phone);
      setSuccessMsg(t.otpSent);
      setResendTimer(120);
    } catch (err: any) {
      setErrorMsg(err.message || t.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP then create account
  const handleRegister = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otpCode) {
      setErrorMsg(translations[language].login.fillFields);
      return;
    }

    try {
      setLoading(true);
      // Odoo backend verifies the OTP code internally in signup_user_mobile
      await registerUser({
        first_name: prenom,
        last_name: name,
        phone,
        password,
        confirm_password: confirmPassword,
        otp_code: otpCode,
      });
      setSuccessMsg(t.registerSuccess);
      setTimeout(() => {
        router.replace({ pathname: '/login', params: { lang: language } });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || t.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Back button for step 2 */}
          {step === 2 && (
            <Pressable
              style={[styles.backBtn, isRtl && styles.rtlBackBtn]}
              onPress={() => { setStep(1); setErrorMsg(null); setSuccessMsg(null); setOtpCode(''); }}
            >
              <MaterialCommunityIcons
                name={isRtl ? 'arrow-right' : 'arrow-left'}
                size={26}
                color="#FFFFFF"
              />
            </Pressable>
          )}

          <Text style={[styles.title, isRtl && styles.rtlText]}>{t.title}</Text>
          <Text style={[styles.stepIndicator, isRtl && styles.rtlText]}>
            {translations[language].forgotPassword.step} {step} / 2
          </Text>

          {/* Error / Success */}
          {errorMsg && (
            <View style={styles.alertBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF4D4D" />
              <Text style={[styles.alertText, { color: '#FF4D4D' }, isRtl && styles.rtlText]}>{errorMsg}</Text>
            </View>
          )}
          {successMsg && (
            <View style={styles.alertBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#4CD964" />
              <Text style={[styles.alertText, { color: '#4CD964' }, isRtl && styles.rtlText]}>{successMsg}</Text>
            </View>
          )}

          {/* ─── STEP 1: Registration form ─── */}
          {step === 1 && (
            <View style={styles.card}>
              <Text style={[styles.label, isRtl && styles.rtlText]}>{t.name}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={[styles.input, isRtl && styles.rtlInput]}
                placeholder={t.name}
                placeholderTextColor="#6E7483"
              />

              <Text style={[styles.label, isRtl && styles.rtlText]}>{t.prenom}</Text>
              <TextInput
                value={prenom}
                onChangeText={setPrenom}
                style={[styles.input, isRtl && styles.rtlInput]}
                placeholder={t.prenom}
                placeholderTextColor="#6E7483"
              />

              <Text style={[styles.label, isRtl && styles.rtlText]}>{t.phone}</Text>
              <TextInput
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                style={[styles.input, isRtl && styles.rtlInput]}
                keyboardType="phone-pad"
                placeholder={t.phonePlaceholder}
                placeholderTextColor="#6E7483"
                maxLength={8}
              />


              <Text style={[styles.label, isRtl && styles.rtlText]}>{t.password}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={(text) => setPassword(text.replace(/[^0-9]/g, ''))}
                  secureTextEntry={!showPassword}
                  style={[styles.passwordInput, isRtl && styles.rtlInput]}
                  keyboardType="number-pad"
                  placeholder={t.password}
                  placeholderTextColor="#6E7483"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6E7483"
                  />
                </Pressable>
              </View>

              <Text style={[styles.label, isRtl && styles.rtlText]}>{t.confirmPassword}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => setConfirmPassword(text.replace(/[^0-9]/g, ''))}
                  secureTextEntry={!showConfirm}
                  style={[styles.passwordInput, isRtl && styles.rtlInput]}
                  keyboardType="number-pad"
                  placeholder={t.confirmPassword}
                  placeholderTextColor="#6E7483"
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                  <MaterialCommunityIcons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6E7483"
                  />
                </Pressable>
              </View>

              <Pressable onPress={handleSendOtp} disabled={loading} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {loading ? t.loading : t.sendOtp}
                </Text>
              </Pressable>

              <Link href={{ pathname: '/login', params: { lang: language } }} style={styles.linkText}>
                {t.alreadyAccount}
              </Link>
            </View>
          )}

          {/* ─── STEP 2: OTP verification ─── */}
          {step === 2 && (
            <View style={styles.card}>
              <Text style={[styles.otpHint, isRtl && styles.rtlText]}>
                📱 {t.otpSent}
              </Text>

              <Text style={[styles.label, isRtl && styles.rtlText]}>{t.otpLabel}</Text>
              <Pressable
                style={[styles.otpBoxesContainer, isRtl && styles.rtlRow]}
                onPress={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = otpCode[index] || '';
                  const isFocused = otpCode.length === index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        isFocused && styles.otpBoxFocused,
                      ]}
                    >
                      <Text style={styles.otpBoxText}>{char}</Text>
                    </View>
                  );
                })}
              </Pressable>
              <TextInput
                ref={otpInputRef}
                value={otpCode}
                onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.hiddenInput}
                caretHidden
              />

              <Text style={[styles.expireHint, isRtl && styles.rtlText]}>
                ⚠️ {t.otpExpiredMsg}
              </Text>

              <View style={styles.resendRow}>
                {resendTimer > 0 ? (
                  <Text style={[styles.timerText, isRtl && styles.rtlText]}>
                    {t.resendIn}: {String(Math.floor(resendTimer / 60)).padStart(2, '0')}:{String(resendTimer % 60).padStart(2, '0')}
                  </Text>
                ) : (
                  <Pressable onPress={handleResend} disabled={loading}>
                    <Text style={[styles.resendText, isRtl && styles.rtlText]}>
                      🔄 {t.resendOtp}
                    </Text>
                  </Pressable>
                )}
              </View>

              <Pressable onPress={handleRegister} disabled={loading} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {loading ? t.loading : t.verifyOtp}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052A63' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 32 },
  backBtn: {
    position: 'absolute', top: 8, left: 0, zIndex: 10,
    padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  rtlBackBtn: { left: undefined, right: 0 },
  title: {
    color: '#FFFFFF', fontSize: 34, fontWeight: '700',
    marginBottom: 4, textAlign: 'center',
  },
  stepIndicator: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14,
    textAlign: 'center', marginBottom: 16,
  },
  alertBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 12,
    padding: 12, marginBottom: 14, gap: 8,
  },
  alertText: { flex: 1, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 22,
    paddingHorizontal: 20, paddingVertical: 22,
  },
  label: { fontSize: 14, color: '#1E2433', marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#B8C0CF', borderRadius: 22,
    backgroundColor: '#FAF9F1', paddingHorizontal: 18, paddingVertical: 8,
    marginBottom: 12, color: '#1E2433', fontSize: 17, height: 48,
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  otpBox: {
    width: 40,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#B8C0CF',
    borderRadius: 10,
    backgroundColor: '#FAF9F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFocused: {
    borderColor: '#F4BA42',
    backgroundColor: '#FFFFFF',
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E2433',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#B8C0CF', borderRadius: 22,
    backgroundColor: '#FAF9F1', marginBottom: 12, paddingRight: 12, height: 48,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: 18, fontSize: 17, color: '#1E2433', height: '100%',
  },
  eyeIcon: { padding: 4 },
  primaryButton: {
    marginTop: 8, backgroundColor: '#F4BA42',
    borderRadius: 22, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  linkText: {
    marginTop: 14, color: '#0B2F6A',
    textAlign: 'center', fontWeight: '600', fontSize: 15,
  },
  otpHint: {
    color: '#1E2433', fontSize: 14, lineHeight: 20,
    marginBottom: 18, textAlign: 'center',
  },
  expireHint: {
    color: '#E67E22', fontSize: 12, marginBottom: 10, lineHeight: 16,
  },
  resendRow: { alignItems: 'center', marginBottom: 18 },
  timerText: { color: '#6E7483', fontSize: 14 },
  resendText: {
    color: '#F4BA42', fontSize: 14,
    fontWeight: '700', textDecorationLine: 'underline',
  },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  rtlRow: { flexDirection: 'row-reverse' },
});
