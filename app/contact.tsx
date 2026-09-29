import { CustomAlert as Alert } from '@/components/CustomAlert';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getLanguage, isArabic, translations } from '@/lib/i18n';

// ─── Contact data ────────────────────────────────────────────────────────────
const PHONE    = '+222 34 66 00 66';
const WHATSAPP = '+222 34 66 00 66';
const EMAIL   = 'contact@medina-assurances.com';
 
export default function ContactScreen() {
  const router  = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl    = isArabic(lang);
  const t        = translations[language].contact;

  /* ── Handlers ── */
  const handleCall = () => {
    Linking.openURL(`tel:${PHONE}`).catch(() =>
      Alert.alert(translations[language].login.errorTitle, t.errorPhone)
    );
  };

  const handleWhatsApp = () => {
    const number = WHATSAPP.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${number}`).catch(() =>
      Alert.alert(translations[language].login.errorTitle, t.errorWhatsapp)
    );
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${EMAIL}?subject=Demande d'assistance`).catch(() =>
      Alert.alert(translations[language].login.errorTitle, t.errorEmail)
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name={isRtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="headset" size={48} color="#F4BA42" />
          </View>
          <Text style={[styles.heroTitle, isRtl && styles.rtlText]}>{t.heroTitle}</Text>
          <Text style={[styles.heroSub, isRtl && styles.rtlText]}>{t.heroSub}</Text>
        </View>

        {/* ── Card: Téléphone ── */}
        <View style={[styles.card, isRtl && styles.rtlRow]}>
          <View style={[styles.cardLeft, isRtl && styles.rtlRow]}>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
              <MaterialCommunityIcons name="phone" size={26} color="#34C759" />
            </View>
            <View>
              <Text style={[styles.cardLabel, isRtl && styles.rtlText]}>{t.callLabel}</Text>
              <Text style={[styles.cardValue, isRtl && styles.rtlText]}>{PHONE}</Text>
            </View>
          </View>
          <Pressable style={[styles.actionBtn, { backgroundColor: 'rgba(52,199,89,0.18)' }]} onPress={handleCall}>
            <MaterialCommunityIcons name="phone-outgoing" size={18} color="#34C759" />
            <Text style={[styles.actionBtnText, { color: '#34C759' }]}>{t.callBtn}</Text>
          </Pressable>
        </View>

        <View style={styles.separator} />

        {/* ── Card: WhatsApp ── */}
        <View style={[styles.card, isRtl && styles.rtlRow]}>
          <View style={[styles.cardLeft, isRtl && styles.rtlRow]}>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(37,211,102,0.15)' }]}>
              <MaterialCommunityIcons name="whatsapp" size={26} color="#25D366" />
            </View>
            <View>
              <Text style={[styles.cardLabel, isRtl && styles.rtlText]}>{t.whatsappLabel}</Text>
              <Text style={[styles.cardValue, isRtl && styles.rtlText]}>{WHATSAPP}</Text>
            </View>
          </View>
          <Pressable style={[styles.actionBtn, { backgroundColor: 'rgba(37,211,102,0.18)' }]} onPress={handleWhatsApp}>
            <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            <Text style={[styles.actionBtnText, { color: '#25D366' }]}>{t.whatsappBtn}</Text>
          </Pressable>
        </View>

        <View style={styles.separator} />

        {/* ── Card: Email ── */}
        <View style={[styles.card, isRtl && styles.rtlRow]}>
          <View style={[styles.cardLeft, isRtl && styles.rtlRow]}>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(244,186,66,0.15)' }]}>
              <MaterialCommunityIcons name="email-outline" size={26} color="#F4BA42" />
            </View>
            <View>
              <Text style={[styles.cardLabel, isRtl && styles.rtlText]}>{t.emailLabel}</Text>
              <Text style={[styles.cardValue, isRtl && styles.rtlText]}>{EMAIL}</Text>
            </View>
          </View>
          <Pressable style={[styles.actionBtn, { backgroundColor: 'rgba(244,186,66,0.18)' }]} onPress={handleEmail}>
            <MaterialCommunityIcons name="send-outline" size={18} color="#F4BA42" />
            <Text style={[styles.actionBtnText, { color: '#F4BA42' }]}>{t.emailBtn}</Text>
          </Pressable>
        </View>

        <View style={styles.separator} />
        <Text style={styles.footerNote}> </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001026' },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#071F3D',
    borderBottomWidth: 1,
    borderBottomColor: '#123A66',
  },
  backBtn: {
    backgroundColor: '#0B2F57',
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  /* ── Scroll ── */
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  /* ── Hero ── */
  hero: { alignItems: 'center', paddingVertical: 28 },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244,186,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,186,66,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  heroSub:   { color: '#8A9BBF', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  /* ── Contact card ── */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    gap: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  cardIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { color: '#8A9BBF', fontSize: 13, marginBottom: 4 },
  cardValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  /* ── Action button ── */
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  /* ── Separator ── */
  separator: { height: 1, backgroundColor: '#0B2F57', marginVertical: 2 },

  /* ── Footer ── */
  footerNote: {
    color: '#4A6A8A',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 20,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
});
