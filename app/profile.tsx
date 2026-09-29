import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getUserProfile, logoutUser, ProfileData } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const [currentLang, setCurrentLang] = useState(getLanguage(lang));
  const isRtl = isArabic(currentLang);
  const t = translations[currentLang].profile;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getUserProfile();
        setProfile(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const onLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignore network errors on logout
    }
    await AsyncStorage.clear();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace({ pathname: '/dashboard', params: { lang: currentLang } })}>
          <MaterialCommunityIcons name={isRtl ? 'arrow-right' : 'arrow-left'} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#F4BA42" style={{ marginTop: 40 }} />
        ) : profile ? (
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="account" size={60} color="#001026" />
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={[styles.infoRow, isRtl && styles.rtlRow]}>
                <MaterialCommunityIcons name="account-outline" size={24} color="#F4BA42" />
                <View style={[styles.infoTextContainer, isRtl && styles.rtlTextContainer]}>
                  <Text style={[styles.infoLabel, isRtl && styles.rtlText]}>{t.nameLabel}</Text>
                  <Text style={[styles.infoValue, isRtl && styles.rtlText]}>{profile.name}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, isRtl && styles.rtlRow]}>
                <MaterialCommunityIcons name="phone-outline" size={24} color="#F4BA42" />
                <View style={[styles.infoTextContainer, isRtl && styles.rtlTextContainer]}>
                  <Text style={[styles.infoLabel, isRtl && styles.rtlText]}>{t.phoneLabel}</Text>
                  <Text style={[styles.infoValue, isRtl && styles.rtlText]}>{profile.phone}</Text>
                </View>
              </View>
            </View>

            {/* Clickable Change Password Button */}
            <Pressable
              style={[styles.settingsRow, isRtl && styles.rtlRow]}
              onPress={() => router.push({ pathname: '/change-password', params: { lang: currentLang } })}
            >
              <View style={[styles.settingsRowLeft, isRtl && styles.rtlRow]}>
                <MaterialCommunityIcons name="lock-outline" size={24} color="#F4BA42" />
                <Text style={[styles.settingsRowText, isRtl && styles.rtlText]}>{t.changePasswordTitle}</Text>
              </View>
              <MaterialCommunityIcons
                name={isRtl ? 'chevron-left' : 'chevron-right'}
                size={24}
                color="#F4BA42"
              />
            </Pressable>

            {/* ── Language Buttons ── */}
            <View style={styles.langButtonsWrapper}>
              <Pressable
                style={[styles.langBtn, currentLang === 'fr' && styles.langBtnActive]}
                onPress={() => setCurrentLang('fr')}
              >
                {currentLang === 'fr' && (
                  <MaterialCommunityIcons name="check" size={16} color="#001026" style={{ marginRight: 6 }} />
                )}
                <Text style={[styles.langBtnText, currentLang === 'fr' && styles.langBtnTextActive]}>
                  Français
                </Text>
              </Pressable>

              <Pressable
                style={[styles.langBtn, currentLang === 'ar' && styles.langBtnActive]}
                onPress={() => setCurrentLang('ar')}
              >
                {currentLang === 'ar' && (
                  <MaterialCommunityIcons name="check" size={16} color="#001026" style={{ marginLeft: 6 }} />
                )}
                <Text style={[styles.langBtnText, currentLang === 'ar' && styles.langBtnTextActive]}>
                  العربية
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>{t.logoutBtn}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={54} color="#FF4D4F" />
            <Text style={styles.errorText}>{t.error}</Text>
            <Pressable style={styles.retryBtn} onPress={onLogout}>
              <MaterialCommunityIcons name="login" size={20} color="#001026" />
              <Text style={styles.retryBtnText}>{translations[currentLang].profile.reconnect}</Text>
            </Pressable>
          </View>
        )}
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: '#071F3D',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F4BA42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#0A2E5A',
  },
  infoSection: {
    width: '100%',
    marginBottom: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#001026',
    padding: 15,
    borderRadius: 12,
  },
  infoTextContainer: {
    marginLeft: 15,
  },
  infoLabel: {
    color: '#8A93A3',
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4D4F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF4D4F',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: '#071F3D',
    borderRadius: 20,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4BA42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
  },
  retryBtnText: {
    color: '#001026',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  /* ── Settings rows ── */
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#001026',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginBottom: 14,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  settingsRowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  /* ── Language buttons ── */
  langButtonsWrapper: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#123A66',
    backgroundColor: '#001026',
  },
  langBtnActive: {
    backgroundColor: '#F4BA42',
    borderColor: '#F4BA42',
  },
  langBtnText: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#001026',
  },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlTextContainer: { marginLeft: 0, marginRight: 15 },
});
