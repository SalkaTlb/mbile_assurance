import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { CustomAlert as Alert } from '@/components/CustomAlert';

import {
  getClaimReceipt,
  getGedDataPdf,
  getMyClaims,
  getMyInsurances,
} from '@/lib/api';
import { generateAttestationHtml } from '@/lib/attestationTemplate';
import { generateClaimReceiptHtml } from '@/lib/claimReceiptTemplate';
import { getLanguage, isArabic, translations } from '@/lib/i18n';
import { uploadToS3 } from '@/lib/s3Upload';

// ─── Types ────────────────────────────────────────────────────────────────────
type DocCategory = 'all' | 'attestation' | 'sinistre';
type DocStatus = 'valid' | 'expired';

interface InsuranceDocument {
  id: string; // e.g. ins_12 or claim_3
  name: string;
  category: DocCategory;
  issuedOn: string;
  status: DocStatus;
  insuranceId?: number;
  insuranceNumber?: string;
  matricule?: string;
  claimId?: number;
  claimNumber?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

// ─── Document Card (2 boutons : Voir + Partager) ──────────────────────────────
function DocumentCard({
  doc,
  t,
  isRtl,
  onView,
  onShare,
  isGenerating,
}: {
  doc: InsuranceDocument;
  t: typeof translations['fr']['documents'];
  isRtl: boolean;
  onView: () => void;
  onShare: () => void;
  isGenerating: boolean;
}) {
  const isExpired = doc.status === 'expired';
  const isClaim = doc.category === 'sinistre';

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={[styles.cardHeader, isRtl && styles.rowReverse]}>
        <View style={[styles.pdfIconWrap, { backgroundColor: isClaim ? '#1A2E1A' : '#12233E' }]}>
          <MaterialCommunityIcons
            name={isClaim ? 'car-emergency' : 'file-pdf-box'}
            size={36}
            color={isClaim ? '#FA8C16' : '#E8533A'}
          />
        </View>

        <View style={[styles.cardInfo, isRtl && styles.alignEnd]}>
          <Text style={[styles.docName, isRtl && styles.rtlText]} numberOfLines={2}>
            {doc.name}
          </Text>
          <Text style={[styles.docDate, isRtl && styles.rtlText]}>
            {t.issuedOn} : {formatDate(doc.issuedOn)}
          </Text>
          {/* Category pill */}
          <View style={[styles.categoryPill, { backgroundColor: isClaim ? '#FA8C1622' : '#F4BA4222' }]}>
            <Text style={[styles.categoryPillText, { color: isClaim ? '#FA8C16' : '#F4BA42' }]}>
              {isClaim ? (isRtl ? 'حادث' : 'Sinistre') : (isRtl ? 'وثيقة' : 'Attestation')}
            </Text>
          </View>
        </View>

        <View style={[styles.badge, isExpired ? styles.badgeExpired : styles.badgeValid]}>
          <Text style={styles.badgeText}>
            {isExpired ? t.statusExpired : t.statusValid}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 2 action buttons */}
      <View style={[styles.actionsRow, isRtl && styles.rowReverse]}>
        {isGenerating ? (
          <View style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
            <ActivityIndicator color="#F4BA42" size="small" />
          </View>
        ) : (
          <>
            <Pressable style={[styles.actionBtn, styles.actionView]} onPress={onView}>
              <MaterialCommunityIcons name="eye-outline" size={17} color="#001f3f" />
              <Text style={styles.actionViewText}>{isRtl ? 'عرض' : 'Voir'}</Text>
            </Pressable>

            <Pressable style={[styles.actionBtn, styles.actionShare]} onPress={onShare}>
              <MaterialCommunityIcons name="share-variant-outline" size={17} color="#FFFFFF" />
              <Text style={styles.actionShareText}>{isRtl ? 'مشاركة' : 'Partager'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}


// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].documents;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocCategory>('all');
  const [documents, setDocuments] = useState<InsuranceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<{ url: string; name: string } | null>(null);

  // Fetch documents (Insurances + Claims)
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [insurancesResult, claimsList] = await Promise.all([
        getMyInsurances().catch((err) => {
          console.error('Error fetching insurances:', err);
          return { insurances: [], pendingQuotes: [] };
        }),
        getMyClaims().catch((err) => {
          console.error('Error fetching claims:', err);
          return [];
        }),
      ]);

      // getMyInsurances retourne { insurances, pendingQuotes }
      // Dédoublonnage : le backend peut renvoyer plusieurs fois le même contrat.
      const seen = new Set<string>();
      const insurancesList = ((insurancesResult as any)?.insurances ?? []).filter((ins: any) => {
        const key = ins.insurance_number || String(ins.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const formattedInsurances: InsuranceDocument[] = insurancesList.map((ins: any) => ({
        id: `ins_${ins.id}`,
        name: ins.matricule || `N° ${ins.insurance_number}`,
        category: 'attestation',
        issuedOn: ins.date_effet,
        status: ins.etat === 'expired' ? 'expired' : 'valid',
        insuranceId: ins.id,
        insuranceNumber: ins.insurance_number,
        matricule: ins.matricule,
      }));

      const formattedClaims: InsuranceDocument[] = claimsList
        .filter((claim) => claim.state === 'in_progress')
        .map((claim) => ({
          id: `claim_${claim.claim_id}`,
          name: `Reçu de Dépôt - N° ${claim.claim_number}`,
          category: 'sinistre',
          issuedOn: claim.claim_date || '',
          status: 'valid',
          claimId: claim.claim_id,
          claimNumber: claim.claim_number,
        }));

      setDocuments([...formattedInsurances, ...formattedClaims]);
    } catch (error) {
      console.error('Error loading documents list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchCat =
        activeCategory === 'all' || doc.category === activeCategory;
      const query = search.trim().toLowerCase();
      const matchSearch =
        query === '' ||
        doc.name.toLowerCase().includes(query) ||
        (doc.insuranceNumber && doc.insuranceNumber.toLowerCase().includes(query)) ||
        (doc.claimNumber && doc.claimNumber.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [documents, search, activeCategory]);

  // Generate HTML based on document type
  const fetchHtmlForDoc = async (doc: InsuranceDocument): Promise<string> => {
    if (doc.category === 'attestation') {
      const res = await getGedDataPdf(doc.insuranceId!);
      if (!res.success || !res.data) {
        throw new Error("Impossible de récupérer les données de l'attestation.");
      }
      return generateAttestationHtml(res.data);
    } else {
      const res = await getClaimReceipt(doc.claimId!);
      if (!res.success || !res.receipt) {
        throw new Error(res.msg || "Impossible de récupérer les données du sinistre.");
      }
      return generateClaimReceiptHtml(res.receipt);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleView = async (doc: InsuranceDocument) => {
    try {
      setGeneratingId(doc.id);

      if (Platform.OS === 'web') {
        const html = await fetchHtmlForDoc(doc);
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        return;
      }

      // Générer le PDF et l'uploader sur S3 (rapide et sécurisé)
      const { uri, s3Url } = await generatePdfFile(doc);

      if (s3Url) {
        setViewDoc({ url: s3Url, name: doc.name });
      } else {
        // Fallback local uniquement si S3 a échoué (mode hors-ligne)
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        }
      }
    } catch (error: any) {
      console.error('Error viewing document:', error);
      Alert.alert('❌', error?.message || t.errorView);
    } finally {
      setGeneratingId(null);
    }
  };

  const generatePdfFile = async (
    doc: InsuranceDocument
  ): Promise<{ uri: string; filename: string; s3Url?: string }> => {
    const html = await fetchHtmlForDoc(doc);
    const sanitizedName = doc.category === 'attestation'
      ? (doc.insuranceNumber?.replace(/\//g, '_') || doc.id)
      : (doc.claimNumber?.replace(/\//g, '_') || doc.id);

    // L'attestation partagée porte le matricule du véhicule ; sur S3 on garde le
    // n° de police dans le nom pour ne pas écraser l'attestation d'un ancien contrat.
    const plate = doc.matricule?.replace(/[^A-Za-z0-9_-]/g, '');
    const filename = doc.category === 'attestation'
      ? `${plate || `Attestation_${sanitizedName}`}.pdf`
      : `Recu_Sinistre_${sanitizedName}.pdf`;
    const s3Filename = doc.category === 'attestation' && plate
      ? `${plate}_${sanitizedName}.pdf`
      : filename;

    const { uri } = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
    });

    const destUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + filename;
    await FileSystem.copyAsync({ from: uri, to: destUri });

    // ── Upload vers S3 (non-bloquant) ────────────────────────────────────────
    let s3Url: string | undefined;
    try {
      const base64Data = await FileSystem.readAsStringAsync(destUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const s3Result = await uploadToS3(
        base64Data,
        s3Filename,
        doc.category as 'attestation' | 'sinistre',
      );
      if (s3Result.success) {
        s3Url = s3Result.url;
        console.log('[S3] Uploaded:', s3Url);
      } else {
        console.warn('[S3] Upload failed:', s3Result.error);
      }
    } catch (s3Err) {
      console.warn('[S3] Upload exception (non-blocking):', s3Err);
    }

    return { uri: destUri, filename, s3Url };
  };


  const handleShare = async (doc: InsuranceDocument) => {
    try {
      setGeneratingId(doc.id);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('❌', t.shareError);
        return;
      }

      const { uri } = await generatePdfFile(doc);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: doc.name,
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      console.error('Error sharing document:', error);
      Alert.alert('❌', error?.message || t.shareError);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable
          style={styles.backBtn}
          onPress={() =>
            router.replace({ pathname: '/dashboard', params: { lang: language } })
          }
        >
          <MaterialCommunityIcons name={isRtl ? "arrow-right" : "arrow-left"} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>{t.title}</Text>
        {/* spacer to balance flex layout */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color="#8899AA"
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, isRtl && styles.rtlInput]}
          placeholder={t.searchPlaceholder}
          placeholderTextColor="#8899AA"
          value={search}
          onChangeText={setSearch}
          textAlign={isRtl ? 'right' : 'left'}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#8899AA" />
          </Pressable>
        )}
      </View>

      {/* ── Category Tabs ───────────────────────────────────────────────────── */}
      {(() => {
        const allDocs = documents;
        const tabs: { key: DocCategory; label: string; color: string; count: number }[] = [
          { key: 'all',         label: t.categoryAll,          color: '#F4BA42', count: allDocs.length },
          { key: 'attestation', label: t.categoryAttestations, color: '#52C41A', count: allDocs.filter(d => d.category === 'attestation').length },
          { key: 'sinistre',    label: t.categorySinistres,    color: '#FA8C16', count: allDocs.filter(d => d.category === 'sinistre').length },
        ];
        return (
          <View style={styles.categoryRow}>
            {tabs.map((tab) => {
              const active = activeCategory === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.categoryTab,
                    active && { backgroundColor: tab.color + '18', borderColor: tab.color },
                  ]}
                  onPress={() => setActiveCategory(tab.key)}
                >
                  <Text style={[styles.categoryTabText, active && { color: tab.color }]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.categoryTabBadge, { backgroundColor: active ? tab.color : '#1E3A5F' }]}>
                    <Text style={styles.categoryTabBadgeText}>{tab.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })()}

      {/* ── Document List ───────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#F4BA42" size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={64}
                color="#1A3A5C"
              />
              <Text style={[styles.emptyText, isRtl && styles.rtlText]}>
                {t.noDocuments}
              </Text>
            </View>
          ) : (
            filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                t={t}
                isRtl={isRtl}
                onView={() => handleView(doc)}
                onShare={() => handleShare(doc)}
                isGenerating={generatingId === doc.id}
              />
            ))
          )}
        </ScrollView>
      )}
      {/* ── PDF Viewer Modal ── */}
      <Modal
        visible={!!viewDoc}
        animationType="slide"
        onRequestClose={() => setViewDoc(null)}
      >
        <View style={styles.viewerContainer}>
          <View style={[styles.viewerHeader, isRtl && styles.viewerRtlRow]}>
            <Pressable style={styles.viewerCloseBtn} onPress={() => setViewDoc(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {viewDoc?.name}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          {viewDoc && (
            <WebView
              source={{
                uri: Platform.OS === 'android'
                  ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(viewDoc.url)}`
                  : viewDoc.url
              }}
              style={styles.viewerWebview}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.viewerLoading}>
                  <ActivityIndicator color="#F4BA42" size="large" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001026',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#071F3D',
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
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  // ── Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#071F3D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#123A66',
    marginHorizontal: 16,
    marginVertical: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 0,
  },
  rtlInput: {
    textAlign: 'right',
  },

  // ── Category Tabs
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  categoryTab: {
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
  categoryTabText: { color: '#6E7A8A', fontSize: 13, fontWeight: '700' },
  categoryTabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  categoryTabBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  // ── Document List
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyText: {
    color: '#4A6A8A',
    fontSize: 16,
    fontWeight: '500',
  },

  // ── Card
  card: {
    backgroundColor: '#071F3D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#123A66',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  pdfIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#12233E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  docName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  docDate: {
    color: '#8899AA',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Status badge
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeValid: {
    backgroundColor: 'rgba(82, 196, 26, 0.18)',
    borderWidth: 1,
    borderColor: '#52C41A',
  },
  badgeExpired: {
    backgroundColor: 'rgba(255, 77, 79, 0.18)',
    borderWidth: 1,
    borderColor: '#FF4D4F',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Divider
  divider: {
    height: 1,
    backgroundColor: '#123A66',
    marginHorizontal: 14,
  },

  // ── Category pill
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Action buttons row (2 boutons)
  actionsRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionView: {
    backgroundColor: '#F4BA42',
  },
  actionViewText: {
    color: '#001026',
    fontSize: 13,
    fontWeight: '700',
  },
  actionDownload: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F4BA42',
  },
  actionDownloadText: {
    color: '#F4BA42',
    fontSize: 13,
    fontWeight: '700',
  },
  actionShare: {
    backgroundColor: '#0B3F7A',
    borderWidth: 1,
    borderColor: '#1A5FAF',
  },
  actionShareText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── RTL
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },

  // ── PDF Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#001026',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#071F3D',
    borderBottomWidth: 1,
    borderBottomColor: '#123A66',
  },
  viewerRtlRow: {
    flexDirection: 'row-reverse',
  },
  viewerCloseBtn: {
    backgroundColor: '#0B2F57',
    borderColor: '#123A66',
    borderWidth: 1,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  viewerWebview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  viewerLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001026',
  },
});
