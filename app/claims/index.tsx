import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getMyClaims, Claim } from '@/lib/api';
import { toFrenchDate } from '@/lib/dateUtils';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

const STATE_COLORS: Record<string, string> = {
  draft:       '#6E7483',
  in_progress: '#1890FF',
  rejected:    '#FF4D4F',
  litigation:  '#FA8C16',
  settled:     '#52C41A',
};

type FilterStatus = 'all' | 'draft' | 'in_progress' | 'rejected' | 'litigation' | 'settled';

export default function ClaimsScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].claims;

  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');

  const filterTabs: { key: FilterStatus; label: string; color: string; count: number }[] = [
    { key: 'all',         label: t.filterAll,          color: '#F4BA42', count: claims.length },
    { key: 'draft',       label: t.statusDraft,        color: STATE_COLORS.draft,        count: claims.filter(c => c.state === 'draft').length },
    { key: 'in_progress', label: t.statusInProgress,   color: STATE_COLORS.in_progress,  count: claims.filter(c => c.state === 'in_progress').length },
    { key: 'rejected',    label: t.statusRejected,     color: STATE_COLORS.rejected,     count: claims.filter(c => c.state === 'rejected').length },
    { key: 'litigation',  label: t.statusLitigation,   color: STATE_COLORS.litigation,   count: claims.filter(c => c.state === 'litigation').length },
    { key: 'settled',     label: t.statusSettled,      color: STATE_COLORS.settled,      count: claims.filter(c => c.state === 'settled').length },
  ];

  const filteredClaims = claims.filter((claim) => {
    // 1) status tab filter
    if (selectedFilter !== 'all' && claim.state !== selectedFilter) return false;
    // 2) text search
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (claim.claim_number  && claim.claim_number.toLowerCase().includes(query))  ||
      (claim.name          && claim.name.toLowerCase().includes(query))           ||
      (claim.claim_type    && claim.claim_type.toLowerCase().includes(query))     ||
      (claim.claim_location && claim.claim_location.toLowerCase().includes(query))||
      (claim.state_label   && claim.state_label.toLowerCase().includes(query))    ||
      (claim.license_plate && claim.license_plate.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getMyClaims();
        setClaims(result);
      } catch (err: any) {
        setError(err.message ?? 'Erreur');
        setClaims([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stateColor = (state: string) => STATE_COLORS[state] ?? '#6E7483';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace({ pathname: '/dashboard', params: { lang: language } })}
        >
          <MaterialCommunityIcons name={isRtl ? 'arrow-right' : 'arrow-left'} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.title, isRtl && styles.rtlText]}>{t.title}</Text>
        <Pressable
          style={[styles.newBtn, isRtl && styles.rtlRow]}
          onPress={() => router.push({ pathname: '/claims/new', params: { lang: language } })}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#001026" />
          <Text style={styles.newBtnText}>{t.newBtn}</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
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

      {/* ── Status Filter Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {filterTabs.map((tab) => {
          const active = selectedFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedFilter(tab.key)}
              style={[
                styles.filterTab,
                active && { backgroundColor: tab.color + '18', borderColor: tab.color },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  active && { color: tab.color },
                ]}
              >
                {tab.label}
              </Text>
              <View style={[styles.filterTabBadge, { backgroundColor: active ? tab.color : '#1E3A5F' }]}>
                <Text style={styles.filterTabBadgeText}>{tab.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="loading" size={40} color="#F4BA42" />
            <Text style={styles.helperText}>{t.loading}</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#FF4D4F" />
            <Text style={[styles.helperText, { color: '#FF4D4F' }]}>{error}</Text>
          </View>
        ) : filteredClaims.length === 0 ? (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="car-emergency" size={56} color="#0B2F57" />
            <Text style={[styles.helperText, isRtl && styles.rtlText]}>
              {searchQuery || selectedFilter !== 'all' ? t.noResults : t.noClaims}
            </Text>
          </View>
        ) : (
          filteredClaims.map((claim) => (
            <Pressable
              key={claim.claim_id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/claims/[id]',
                  params: { id: claim.claim_id.toString(), lang: language },
                })
              }
            >
              {/* Top row */}
              <View style={styles.cardTopRow}>
                <Text style={styles.cardNumber}>{claim.claim_number || claim.name}</Text>
                <View style={[styles.badge, { backgroundColor: stateColor(claim.state) }]}>
                  <Text style={styles.badgeText}>
                    {claim.state === 'draft'       ? t.statusDraft :
                     claim.state === 'in_progress' ? t.statusInProgress :
                     claim.state === 'rejected'    ? t.statusRejected :
                     claim.state === 'litigation'  ? t.statusLitigation :
                     claim.state === 'settled'     ? t.statusSettled : claim.state_label}
                  </Text>
                </View>
              </View>

              {/* Matricule */}
              {claim.license_plate ? (
                <View style={styles.cardRow}>
                  <MaterialCommunityIcons name="car" size={14} color="#F4BA42" />
                  <Text style={[styles.cardLine, { color: '#F4BA42', fontWeight: '700' }]}>
                    {claim.license_plate}
                  </Text>
                </View>
              ) : null}

              {/* Details */}
              <View style={styles.cardRow}>
                <MaterialCommunityIcons name="calendar" size={14} color="#A0AEC0" />
                <Text style={styles.cardLine}>
                  {t.claimDate}: {toFrenchDate(claim.claim_date)}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <MaterialCommunityIcons name="alert-decagram-outline" size={14} color="#A0AEC0" />
                <Text style={styles.cardLine}>
                  {t.claimType}: {claim.claim_type === 'material' ? t.claimTypeMaterial :
                                  claim.claim_type === 'bodily'   ? t.claimTypeBodily :
                                  claim.claim_type === 'mixed'    ? t.claimTypeMixed : claim.claim_type}
                </Text>
              </View>
              {claim.claim_location ? (
                <View style={styles.cardRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color="#A0AEC0" />
                  <Text style={styles.cardLine}>{claim.claim_location}</Text>
                </View>
              ) : null}

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.indemnityLabel}>{t.indemnityAmount}:</Text>
                <Text style={styles.indemnityValue}>
                  {claim.total_indemnity_amount.toLocaleString('fr-FR')} MRU
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#F4BA42" />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001026' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0B2F57',
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
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4BA42',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  newBtnText: { color: '#001026', fontWeight: '700', fontSize: 14 },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#071F3D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#123A66',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
  },
  rtlSearchContainer: { flexDirection: 'row-reverse' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, height: '100%', textAlign: 'left' },
  rtlSearchInput: { textAlign: 'right' },
  clearBtn: { padding: 4 },

  /* Filter tabs */
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 54,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  /* List */
  listScroll: { flex: 1 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    backgroundColor: '#071A2F',
    marginRight: 8,
  },
  filterTabText: { color: '#6E7A8A', fontSize: 13, fontWeight: '700' },
  filterTabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterTabBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  filterTabTextActive: { color: '#FFFFFF' },

  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 12, paddingBottom: 24 },
  centerBox: { alignItems: 'center', marginTop: 60, gap: 12 },
  helperText: { color: '#A0AEC0', fontSize: 16, textAlign: 'center' },

  card: {
    backgroundColor: '#071F3D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#123A66',
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardNumber: { color: '#F4BA42', fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLine: { color: '#CBD5E0', fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#123A66',
    gap: 6,
  },
  indemnityLabel: { color: '#A0AEC0', fontSize: 13, flex: 1 },
  indemnityValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow: { flexDirection: 'row-reverse' },
});
