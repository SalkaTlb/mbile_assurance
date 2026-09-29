import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLanguage, isArabic, translations } from '@/lib/i18n';

type DashboardItem = {
  key: 'assurances' | 'claims' | 'documents' | 'contact' | 'support' | 'settings';
  icon: ComponentProps<typeof FontAwesome6>['name'] | ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconFamily: 'fa' | 'mc';
};

const items: DashboardItem[] = [
  { key: 'assurances', icon: 'id-card', iconFamily: 'fa' },
  { key: 'claims', icon: 'alert-circle-outline', iconFamily: 'mc' },
  { key: 'documents', icon: 'file-document-outline', iconFamily: 'mc' },
  { key: 'contact', icon: 'message-text-outline', iconFamily: 'mc' },
  { key: 'support', icon: 'account', iconFamily: 'mc' },
  { key: 'settings', icon: 'cog', iconFamily: 'mc' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].dashboard;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable 
          style={styles.profileRow} 
          onPress={() => router.push({ pathname: '/profile', params: { lang: language } })}
        >
          <View style={styles.profileIconCircle}>
            <MaterialCommunityIcons name="account" size={32} color="#F4BA42" />
          </View>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.brandMain}>MEDINA</Text>
          <Text style={styles.brandSub}>ASSURANCES SA</Text>
          <Text style={[styles.slogan, isRtl && styles.rtlText]}>{t.slogan}</Text>
        </View>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={styles.card}
              onPress={() => {
                if (item.key === 'assurances') {
                  router.push({ pathname: '/insurances', params: { lang: language } });
                }
                if (item.key === 'documents') {
                  router.push({ pathname: '/documents', params: { lang: language } });
                }
                if (item.key === 'claims') {
                  router.push({ pathname: '/claims', params: { lang: language } });
                }
                if (item.key === 'contact' || item.key === 'support') {
                  router.push({ pathname: '/contact', params: { lang: language } });
                }
                if (item.key === 'settings') {
                  router.push({ pathname: '/profile', params: { lang: language } });
                }
              }}>

              {item.iconFamily === 'fa' ? (
                <FontAwesome6 name={item.icon as ComponentProps<typeof FontAwesome6>['name']} size={40} color="#F4BA42" />
              ) : (
                <MaterialCommunityIcons
                  name={item.icon as ComponentProps<typeof MaterialCommunityIcons>['name']}
                  size={44}
                  color="#F4BA42"
                />
              )}
              <Text style={[styles.cardLabel, isRtl && styles.rtlText]}>{t[item.key]}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001026', // Deeper dark blue
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10, // Pushed up
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  brandMain: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 60,
  },
  brandSub: {
    color: '#F4BA42', // Match login gold
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: -5,
  },
  slogan: {
    marginTop: 15,
    color: '#F4BA42',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  card: {
    width: '46%',
    height: 150,
    backgroundColor: '#071F3D', // Slightly lighter but still very dark blue
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Android Shadow
    elevation: 4,
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 12,
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Pushed to the right
    marginBottom: 20,
    gap: 15,
  },
  welcomeText: {
    color: '#F4BA42',
    fontSize: 27, // Slightly reduced to fit better on the right
    fontWeight: '700',
    textAlign: 'right',
  },
  profileIconCircle: {
    width: 60, // Enlarged
    height: 60, // Enlarged
    borderRadius: 30,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F4BA42',
  },
});
