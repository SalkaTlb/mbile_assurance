import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';

import { changePassword } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].profile;
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const onChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert(t.errorTitle, t.emptyFields);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.errorTitle, t.passwordMismatch);
      return;
    }

    setChanging(true);
    try {
      const res = await changePassword({ old_password: oldPassword, new_password: newPassword });
      if (res.success) {
        Alert.alert(translations[language].login.successTitle, t.successMessage, [
          { text: 'OK', onPress: () => router.back() }
        ]);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert(t.errorTitle, res.msg || t.errorTitle);
      }
    } catch (e: any) {
      Alert.alert(t.errorTitle, e.message || t.errorTitle);
    } finally {
      setChanging(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name={isRtl ? 'arrow-right' : 'arrow-left'} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{t.changePasswordTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.lockContainer}>
            <View style={styles.lockCircle}>
              <MaterialCommunityIcons name="lock-reset" size={60} color="#001026" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, isRtl && styles.rtlRow]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#8A93A3" style={isRtl ? styles.inputIconRtl : styles.inputIcon} />
              <TextInput
                style={[styles.input, isRtl && styles.rtlInput]}
                placeholder={t.oldPasswordLabel}
                placeholderTextColor="#8A93A3"
                secureTextEntry
                keyboardType="number-pad"
                value={oldPassword}
                onChangeText={(text) => setOldPassword(text.replace(/[^0-9]/g, ''))}
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.inputContainer, isRtl && styles.rtlRow]}>
              <MaterialCommunityIcons name="lock-plus-outline" size={20} color="#8A93A3" style={isRtl ? styles.inputIconRtl : styles.inputIcon} />
              <TextInput
                style={[styles.input, isRtl && styles.rtlInput]}
                placeholder={t.newPasswordLabel}
                placeholderTextColor="#8A93A3"
                secureTextEntry
                keyboardType="number-pad"
                value={newPassword}
                onChangeText={(text) => setNewPassword(text.replace(/[^0-9]/g, ''))}
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.inputContainer, isRtl && styles.rtlRow]}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color="#8A93A3" style={isRtl ? styles.inputIconRtl : styles.inputIcon} />
              <TextInput
                style={[styles.input, isRtl && styles.rtlInput]}
                placeholder={t.confirmPasswordLabel}
                placeholderTextColor="#8A93A3"
                secureTextEntry
                keyboardType="number-pad"
                value={confirmPassword}
                onChangeText={(text) => setConfirmPassword(text.replace(/[^0-9]/g, ''))}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Pressable 
            style={[styles.submitBtn, changing && styles.disabledBtn]} 
            onPress={onChangePassword}
            disabled={changing}
          >
            {changing ? (
              <ActivityIndicator size="small" color="#001026" />
            ) : (
              <>
                <MaterialCommunityIcons name="key-change" size={20} color="#001026" />
                <Text style={styles.submitBtnText}>{t.changePasswordBtn}</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001026',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0B2F57',
    borderColor: '#123A66',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#071F3D',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  lockContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F4BA42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#0A2E5A',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#001026',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'left',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4BA42',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    height: 48,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#001026',
    fontSize: 16,
    fontWeight: '700',
  },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  inputIconRtl: { marginLeft: 10, marginRight: 0 },
});
