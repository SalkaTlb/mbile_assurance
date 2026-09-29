import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { forgotPassword, resetPassword, verifyOtp } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].forgotPassword;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Resend OTP countdown (60s)
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<any>(null);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  const startResendTimer = () => {
    setResendTimer(300);
  };

  const handleSendOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      setErrorMsg(translations[language].login.fillFields);
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword(trimmedPhone);
      setSuccessMsg(t.otpSent);
      startResendTimer();
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedCode = code.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedCode) {
      setErrorMsg(translations[language].login.fillFields);
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(trimmedPhone, trimmedCode);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedCode = code.trim();
    const trimmedPhone = phone.trim();

    if (!newPassword || !confirmPassword) {
      setErrorMsg(translations[language].profile.emptyFields);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(translations[language].profile.passwordMismatch);
      return;
    }

    try {
      setLoading(true);
      await resetPassword(trimmedPhone, trimmedCode, newPassword);
      setSuccessMsg(t.successReset);
      setTimeout(() => {
        router.replace({ pathname: '/login', params: { lang: language } });
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password');
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Back button */}
          <Pressable
            style={[styles.backBtn, isRtl && styles.rtlBackBtn]}
            onPress={() => {
              if (step > 1) {
                setStep((prev) => (prev - 1) as 1 | 2 | 3);
                setErrorMsg(null);
                setSuccessMsg(null);
              } else {
                router.back();
              }
            }}
          >
            <MaterialCommunityIcons
              name={isRtl ? 'arrow-right' : 'arrow-left'}
              size={28}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.formWrap}>
            <Text style={[styles.title, isRtl && styles.rtlText]}>{t.title}</Text>
            <Text style={[styles.subtitle, isRtl && styles.rtlText]}>
              {t.step} {step} / 3
            </Text>

            {/* Error & Success Messages */}
            {errorMsg && (
              <View style={styles.alertContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF4D4D" />
                <Text style={[styles.errorText, isRtl && styles.rtlText]}>{errorMsg}</Text>
              </View>
            )}

            {successMsg && (
              <View style={styles.alertContainer}>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#4CD964" />
                <Text style={[styles.successText, isRtl && styles.rtlText]}>{successMsg}</Text>
              </View>
            )}

            {/* Step 1: Phone input */}
            {step === 1 && (
              <View>
                <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t.phoneLabel}</Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor="#6E7483"
                  style={[styles.input, isRtl && styles.rtlInput]}
                  maxLength={8}
                />
                <Pressable onPress={handleSendOtp} disabled={loading} style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{loading ? t.backBtn + '...' : t.sendOtp}</Text>
                </Pressable>
              </View>
            )}

            {/* Step 2: OTP verification */}
            {step === 2 && (
              <View>
                <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t.otpLabel}</Text>
                <Pressable
                  style={[styles.otpBoxesContainer, isRtl && styles.rtlRow]}
                  onPress={() => otpInputRef.current?.focus()}
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const char = code[index] || '';
                    const isFocused = code.length === index;
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
                  value={code}
                  onChangeText={(val) => setCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.hiddenInput}
                  caretHidden
                />

                <Text style={[styles.expiryText, isRtl && styles.rtlText]}>
                  ⚠️ {t.otpExpiredMsg}
                </Text>

                <View style={styles.timerWrap}>
                  {resendTimer > 0 ? (
                    <Text style={[styles.timerText, isRtl && styles.rtlText]}>
                      {t.resendIn}: {resendTimer}s
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendOtp} disabled={loading}>
                      <Text style={[styles.resendBtnText, isRtl && styles.rtlText]}>
                        🔄 {t.resendOtp}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Pressable onPress={handleVerifyOtp} disabled={loading} style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{loading ? t.backBtn + '...' : t.verifyOtp}</Text>
                </Pressable>
              </View>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <View>
                <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>{t.newPasswordLabel}</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={newPassword}
                    onChangeText={(text) => setNewPassword(text.replace(/[^0-9]/g, ''))}
                    secureTextEntry={!showPassword}
                    keyboardType="number-pad"
                    placeholder={t.newPasswordPlaceholder}
                    placeholderTextColor="#6E7483"
                    style={[styles.passwordInput, isRtl && styles.rtlInput]}
                  />
                  <Pressable style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color="#6E7483"
                    />
                  </Pressable>
                </View>

                <Text style={[styles.inputLabel, isRtl && styles.rtlText]}>
                  {t.confirmPasswordLabel}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => setConfirmPassword(text.replace(/[^0-9]/g, ''))}
                    secureTextEntry={!showConfirmPassword}
                    keyboardType="number-pad"
                    placeholder={t.confirmPasswordPlaceholder}
                    placeholderTextColor="#6E7483"
                    style={[styles.passwordInput, isRtl && styles.rtlInput]}
                  />
                  <Pressable
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color="#6E7483"
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>{loading ? t.backBtn + '...' : t.resetBtn}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  rtlBackBtn: {
    left: undefined,
    right: 20,
  },
  formWrap: {
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FAF9F1',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  successText: {
    color: '#4CD964',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
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
  expiryText: {
    color: '#F4BA42',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  timerWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    color: '#C7CFD9',
    fontSize: 14,
  },
  resendBtnText: {
    color: '#F4BA42',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  primaryButton: {
    backgroundColor: '#F4BA42',
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    marginTop: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rtlInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
    borderColor: '#C7CFD9',
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
    color: '#132240',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  rtlRow: { flexDirection: 'row-reverse' },
});
