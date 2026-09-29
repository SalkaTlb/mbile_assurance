import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getMyInsurances, InsuranceItem, PendingQuote } from '@/lib/api';
import { toFrenchDate } from '@/lib/dateUtils';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

type FilterTab = 'all' | 'pending' | 'active';

export default function InsurancesScreen() {
  const router = useRouter();
  const { lang, refresh } = useLocalSearchParams<{ lang?: string; refresh?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].insurances;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InsuranceItem[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await getMyInsurances();
        setItems(result.insurances || []);
        setPendingQuotes(result.pendingQuotes || []);
      } catch {
        setItems([]);
        setPendingQuotes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refresh]);

  /* ── Filtered by search ── */
  const query = searchQuery.toLowerCase().trim();

  const matchesInsurance = (item: InsuranceItem) =>
    !query ||
    item.matricule?.toLowerCase().includes(query) ||
    item.insurance_number?.toLowerCase().includes(query) ||
    item.marque?.toLowerCase().includes(query) ||
    item.modele?.toLowerCase().includes(query) ||
    item.etat_label?.toLowerCase().includes(query);

  const matchesPending = (item: PendingQuote) =>
    !query ||
    item.matricule?.toLowerCase().includes(query) ||
    item.marque?.toLowerCase().includes(query) ||
    item.modele?.toLowerCase().includes(query) ||
    item.etat_label?.toLowerCase().includes(query);

  const allInsurances = items.filter(matchesInsurance);
  const allPending    = pendingQuotes.filter(matchesPending);

  /* ── Visible by tab ── */
  const visibleInsurances = activeTab === 'pending' ? [] : allInsurances;
  const visiblePending    = activeTab === 'active'  ? [] : allPending;
  const isEmpty = visibleInsurances.length === 0 && visiblePending.length === 0;

  /* ── Tab definitions ── */
  const tabs: { id: FilterTab; labelFr: string; labelAr: string; count: number; color: string }[] = [
    { id: 'all',     labelFr: 'Tous',       labelAr: 'الكل',       count: allInsurances.length + allPending.length, color: '#F4BA42' },
    { id: 'pending', labelFr: 'En attente', labelAr: 'في الانتظار', count: allPending.length,    color: '#FA8C16' },
    { id: 'active',  labelFr: 'Actif',      labelAr: 'نشط',        count: allInsurances.length, color: '#52C41A' },
  ];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace({ pathname: '/dashboard', params: { lang: language } })}>
          <MaterialCommunityIcons name={isRtl ? 'arrow-right' : 'arrow-left'} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.title, isRtl && styles.rtlText]}>{t.title}</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push({ pathname: '/insurances/new', params: { lang: language } })}>
          <Text style={styles.newBtnText}>{t.newBtn}</Text>
        </Pressable>
      </View>

      {/* ── Search Bar ── */}
      <View style={[styles.searchContainer, isRtl && styles.rtlSearchContainer]}>
        <MaterialCommunityIcons name="magnify" size={20} color="#6E7483" style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t.searchPlaceholder}
          placeholderTextColor="#6E7483"
          style={[styles.searchInput, isRtl && styles.rtlSearchInput]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#6E7483" />
          </Pressable>
        )}
      </View>

      {/* ── Filter Tabs ── */}
      <View style={[styles.tabRow, isRtl && styles.rtlRow]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && { borderColor: tab.color, backgroundColor: tab.color + '18' }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabLabel, isActive && { color: tab.color }]}>
                {isRtl ? tab.labelAr : tab.labelFr}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: isActive ? tab.color : '#1E3A5F' }]}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.helperText}>{t.loading}</Text>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name={activeTab === 'pending' ? 'clock-alert-outline' : activeTab === 'active' ? 'shield-check-outline' : 'shield-off-outline'}
              size={56}
              color="#2A4A6B"
            />
            <Text style={[styles.helperText, isRtl && styles.rtlText, { marginTop: 12 }]}>
              {searchQuery ? t.noResults : t.noInsurances}
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Quotes */}
            {visiblePending.length > 0 && (
              <View style={styles.sectionContainer}>
                {activeTab === 'all' && (
                  <View style={[styles.sectionHeader, isRtl && styles.rtlRow]}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#FA8C16" />
                    <Text style={[styles.sectionTitle, { color: '#FA8C16' }, isRtl && styles.rtlText]}>
                      {isRtl ? 'بانتظار الدفع' : 'En attente de paiement'} ({visiblePending.length})
                    </Text>
                  </View>
                )}
                {visiblePending.map((item) => (
                  <Pressable
                    key={item.quote_id}
                    style={[styles.card, styles.pendingCard]}
                    onPress={() => router.push({
                      pathname: '/insurances/pending',
                      params: {
                        lang: language,
                        quote_id: item.quote_id,
                        matricule: item.matricule,
                        marque: item.marque,
                        modele: item.modele,
                        duration: item.duration,
                        total: item.total.toString(),
                        effective_date: item.effective_date,
                        payment_code: item.payment_code || '',
                        code_expired: item.code_expired ? 'true' : 'false',
                      },
                    })}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.cardTitle}>{item.matricule}</Text>
                      <Text style={[styles.cardLine, { color: '#FA8C16', fontWeight: '700', fontSize: 15 }]}>
                        {item.total.toLocaleString()} MRU
                      </Text>
                    </View>
                    <Text style={styles.cardLine}>{item.marque} {item.modele}</Text>
                    <View style={styles.cardInfo}>
                      <View style={[styles.badge, { backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#FFD591' }]}>
                        <MaterialCommunityIcons name="clock-outline" size={11} color="#FA8C16" style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: '#FA8C16' }]}>
                          {isRtl ? 'لم يتم تأكيده' : 'Non confirmé'}
                        </Text>
                      </View>
                      <Text style={[styles.cardLine, { fontSize: 13, opacity: 0.8 }]}>{item.duration}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Active / Expired Insurances */}
            {visibleInsurances.length > 0 && (
              <View style={styles.sectionContainer}>
                {activeTab === 'all' && (
                  <View style={[styles.sectionHeader, isRtl && styles.rtlRow]}>
                    <MaterialCommunityIcons name="shield-check-outline" size={16} color="#52C41A" />
                    <Text style={[styles.sectionTitle, { color: '#52C41A' }, isRtl && styles.rtlText]}>
                      {isRtl ? 'تأميناتي' : 'Mes Assurances'} ({visibleInsurances.length})
                    </Text>
                  </View>
                )}
                {visibleInsurances.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.card, item.etat === 'expired' && styles.expiredCard]}
                    onPress={() => router.push({
                      pathname: '/insurances/[id]',
                      params: { id: item.id.toString(), lang: language },
                    })}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.cardTitle}>{item.matricule}</Text>
                      <Text style={[styles.cardLine, { color: '#F4BA42', fontWeight: '600', fontSize: 13 }]}>
                        {item.insurance_number}
                      </Text>
                    </View>
                    <Text style={styles.cardLine}>{item.marque} {item.modele}</Text>
                    <View style={styles.cardInfo}>
                      <View style={[
                        styles.badge,
                        { backgroundColor: item.etat === 'expired' ? '#FF4D4F22' : '#52C41A22',
                          borderWidth: 1,
                          borderColor: item.etat === 'expired' ? '#FF4D4F' : '#52C41A' },
                      ]}>
                        <MaterialCommunityIcons
                          name={item.etat === 'expired' ? 'shield-off-outline' : 'shield-check-outline'}
                          size={11}
                          color={item.etat === 'expired' ? '#FF4D4F' : '#52C41A'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.badgeText, { color: item.etat === 'expired' ? '#FF4D4F' : '#52C41A' }]}>
                          {item.etat === 'expired'
                            ? translations[language].insuranceDetail.statusExpired
                            : translations[language].insuranceDetail.statusActive}
                        </Text>
                      </View>
                      <Text style={[styles.cardLine, { fontSize: 13, opacity: 0.8 }]}>{toFrenchDate(item.date_expiration)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001f3f' },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    backgroundColor: '#0B2F57',
    borderColor: '#123A66',
    borderWidth: 1,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  newBtn: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { color: '#001f3f', fontWeight: '700', fontSize: 16 },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B2F57',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#123A66',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  rtlSearchContainer: { flexDirection: 'row-reverse' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, height: '100%', textAlign: 'left' },
  rtlSearchInput: { textAlign: 'right' },
  clearBtn: { padding: 4 },

  /* Filter Tabs */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    backgroundColor: '#071A2F',
  },
  tabLabel: { color: '#6E7A8A', fontSize: 13, fontWeight: '700' },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  /* Content */
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  helperText: { color: '#FFFFFF', fontSize: 16, marginTop: 20, textAlign: 'center' },
  emptyState: { alignItems: 'center', marginTop: 40, gap: 4 },

  /* Section */
  sectionContainer: { gap: 10, width: '100%' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', opacity: 0.9 },

  /* Cards */
  card: {
    backgroundColor: '#0B2F57',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#123A66',
    padding: 14,
    gap: 4,
    width: '100%',
  },
  pendingCard: { borderColor: '#FA8C16', borderWidth: 1.5 },
  expiredCard: { borderColor: '#FF4D4F55', opacity: 0.85 },
  cardTitle: { color: '#FFD700', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  cardLine: { color: '#FFFFFF', fontSize: 14 },
  cardInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },

  /* Badge */
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  /* RTL */
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow: { flexDirection: 'row-reverse' },
});
