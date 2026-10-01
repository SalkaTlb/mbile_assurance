import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Language, translations } from '@/lib/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('fr');
  const isArabic = language === 'ar';
  const labels = translations[language].home;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Image source={require('@/assets/images/medina_logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandName}>MEDINA ASSURANCES SA</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.languageRow}>
          <Pressable style={styles.langBtn} onPress={() => setLanguage('fr')}>
            <Text style={styles.langText}>{labels.languageFr}</Text>
            {language === 'fr' && <View style={styles.activeLine} />}
          </Pressable>

          <Pressable style={styles.langBtn} onPress={() => setLanguage('ar')}>
            <Text style={styles.langText}>{labels.languageAr}</Text>
            {language === 'ar' && <View style={styles.activeLine} />}
          </Pressable>
        </View>

        <Text style={[styles.title, isArabic ? styles.rtlText : styles.centerText]}>{labels.loginTitle}</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push({ pathname: '/login', params: { lang: language } })}>
          <Text style={[styles.primaryButtonText, isArabic ? styles.rtlText : styles.centerText]}>{labels.loginButton}</Text>
        </Pressable>

        <Pressable onPress={() => router.push({ pathname: '/register', params: { lang: language } })}>
          <Text style={[styles.secondaryLink, isArabic ? styles.rtlText : styles.centerText]}>{labels.createAccount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    flex: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 190,
    height: 190,
  },
  brandName: {
    marginTop: 4,
    color: '#052A63',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    flex: 0.55,
    backgroundColor: '#052A63',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 26,
  },
  langBtn: {
    alignItems: 'center',
    minWidth: 90,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  activeLine: {
    marginTop: 8,
    height: 2,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: '#F4BA42',
    borderRadius: 22,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  }, 
  secondaryLink: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  centerText: {
    textAlign: 'center',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
