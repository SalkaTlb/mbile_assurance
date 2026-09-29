import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { CustomAlert as Alert } from '@/components/CustomAlert';
import { getClaimDetail, getClaimReceipt, ClaimDetail } from '@/lib/api';
import { toFrenchDate } from '@/lib/dateUtils';
import { generateClaimReceiptHtml } from '@/lib/claimReceiptTemplate';
import { getLanguage, isArabic, translations } from '@/lib/i18n';
import { uploadToS3 } from '@/lib/s3Upload';

const STATE_COLORS: Record<string, string> = {
  draft:       '#6E7483',
  in_progress: '#1890FF',
  rejected:    '#FF4D4F',
  litigation:  '#FA8C16',
  settled:     '#52C41A',
};

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon as any} size={18} color="#F4BA42" />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

type PdfAction = 'view' | 'share';

export default function ClaimDetailScreen() {
  const router = useRouter();
  const { id, lang } = useLocalSearchParams<{ id: string; lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].claims;

  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptAction, setReceiptAction] = useState<PdfAction | null>(null);
  const [viewDoc, setViewDoc] = useState<{ url: string; name: string } | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ urls: string[]; index: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getClaimDetail(Number(id));
        setClaim(result);
      } catch (err: any) {
        setError(err.message ?? 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ─── Build Receipt PDF, return uri + optional S3 url ─── */
  const buildReceiptPdfUri = async (): Promise<{ uri: string; s3Url?: string }> => {
    if (!claim) throw new Error('Sinistre non chargé.');

    const result = await getClaimReceipt(claim.claim_id);
    if (!result.success || !result.receipt) {
      throw new Error(result.msg ?? 'Impossible de récupérer les données du reçu.');
    }

    const html = generateClaimReceiptHtml(result.receipt);
    const filename = `Recu_depot_${claim.claim_number || claim.name}.pdf`.replace(/\//g, '_');

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 595,
      height: 842,
      margins: { left: 20, right: 20, top: 20, bottom: 20 },
    });

    const destUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + filename;
    await FileSystem.copyAsync({ from: uri, to: destUri });

    // Upload to S3 (non-blocking, best-effort)
    let s3Url: string | undefined;
    try {
      const base64Data = await FileSystem.readAsStringAsync(destUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const s3Result = await uploadToS3(base64Data, filename, 'sinistre');
      if (s3Result.success) s3Url = s3Result.url;
    } catch (err) {
      console.warn('[S3] Upload reçu non-bloquant:', err);
    }

    return { uri: destUri, s3Url };
  };

  /* ─── Voir : open in browser (iOS SFSafariViewController via S3) ─── */
  const handleReceiptView = async () => {
    if (!claim || receiptAction) return;
    try {
      setReceiptAction('view');

      if (Platform.OS === 'web') {
        const result = await getClaimReceipt(claim.claim_id);
        if (!result.success || !result.receipt) throw new Error('Données introuvables.');
        const html = generateClaimReceiptHtml(result.receipt);
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        return;
      }

      const { uri, s3Url } = await buildReceiptPdfUri();

      if (s3Url) {
        setViewDoc({ url: s3Url, name: `Reçu de Dépôt - N° ${claim.claim_number || claim.name}` });
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        }
      }
    } catch (error: any) {
      Alert.alert(
        t.errorTitle,
        error?.message ?? t.errorView
      );
    } finally {
      setReceiptAction(null);
    }
  };

  /* ─── Partager : iOS share sheet ─── */
  const handleReceiptShare = async () => {
    if (!claim || receiptAction) return;
    try {
      setReceiptAction('share');

      const { uri } = await buildReceiptPdfUri();

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          t.attentionTitle,
          t.shareUnavailable
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Reçu ${claim.claim_number || claim.name}`,
      });
    } catch (error: any) {
      Alert.alert(
        t.errorTitle,
        error?.message ?? t.errorShare
      );
    } finally {
      setReceiptAction(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace({ pathname: '/claims', params: { lang: language } })}
        >
          <MaterialCommunityIcons name={isRtl ? 'arrow-right' : 'arrow-left'} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {claim ? (claim.claim_number || claim.name) : t.detailTitle}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#F4BA42" />
          <Text style={styles.helperText}>{t.loading}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#FF4D4F" />
          <Text style={[styles.helperText, { color: '#FF4D4F' }]}>{error}</Text>
        </View>
      ) : claim ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* State badge */}
          <View style={[styles.stateBadge, { backgroundColor: STATE_COLORS[claim.state] ?? '#6E7483' }]}>
            <Text style={styles.stateBadgeText}>
              {claim.state === 'draft'       ? t.statusDraft :
               claim.state === 'in_progress' ? t.statusInProgress :
               claim.state === 'rejected'    ? t.statusRejected :
               claim.state === 'litigation'  ? t.statusLitigation :
               claim.state === 'settled'     ? t.statusSettled : claim.state_label}
            </Text>
          </View>

          {/* ── General Info ── */}
          <SectionHeader icon="information-outline" label={t.sectionGeneral} />
          <View style={styles.card}>
            <InfoRow label={t.claimNumber} value={claim.claim_number} />

            {/* Matricule — pill doré sans encadrement */}
            {claim.license_plate ? (
              <View style={[styles.infoRow, { paddingVertical: 10 }]}>
                <View style={styles.matriculeIconWrap}>
                  <MaterialCommunityIcons name="car" size={14} color="#F4BA42" />
                </View>
                <Text style={[styles.infoLabel, { marginLeft: 8 }]}>{t.licensePlate}</Text>
                <View style={styles.matriculePill}>
                  <Text style={styles.matriculePillText}>{claim.license_plate}</Text>
                </View>
              </View>
            ) : null}
            <InfoRow label={t.claimDate}   value={toFrenchDate(claim.claim_date)} />
            <InfoRow
              label={t.claimType}
              value={claim.claim_type === 'material' ? t.claimTypeMaterial :
                     claim.claim_type === 'bodily'   ? t.claimTypeBodily :
                     claim.claim_type === 'mixed'    ? t.claimTypeMixed : claim.claim_type}
            />
            <InfoRow label={t.claimLocation}  value={claim.claim_location} />
            <InfoRow label={t.vehicleBrand}   value={claim.vehicle_brand} />
            <InfoRow label={t.vehicleType}    value={claim.vehicle_type} />
            <InfoRow label={t.infraction}     value={claim.infraction} />
            <InfoRow label={t.appointmentDate} value={toFrenchDate(claim.appointment_date)} />
            {claim.rejection_reason ? (
              <InfoRow label={t.rejectionReason} value={claim.rejection_reason} />
            ) : null}
            {claim.court_decision ? (
              <InfoRow label={t.courtDecision} value={claim.court_decision} />
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.insuredByUs}</Text>
              <View style={[styles.insBadge, { backgroundColor: claim.insured_by_us ? '#52C41A22' : '#FF4D4F22', borderColor: claim.insured_by_us ? '#52C41A' : '#FF4D4F' }]}>
                <MaterialCommunityIcons name={claim.insured_by_us ? 'shield-check' : 'shield-off'} size={13} color={claim.insured_by_us ? '#52C41A' : '#FF4D4F'} />
                <Text style={[styles.insBadgeText, { color: claim.insured_by_us ? '#52C41A' : '#FF4D4F' }]}>{claim.insured_by_us ? t.yes : t.no}</Text>
              </View>
            </View>
          </View>

          {/* ── Photos ── */}
          {claim.photos && claim.photos.length > 0 && (
            <>
              <SectionHeader icon="image-multiple-outline" label={isRtl ? 'صور الحادث' : 'Photos de l\'accident'} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                {claim.photos.map((url, idx) => (
                  <Pressable key={idx} onPress={() => setPhotoViewer({ urls: claim.photos!, index: idx })} style={styles.photoThumb}>
                    <Image source={{ uri: url }} style={styles.photoThumbImg} resizeMode="cover" />
                    <View style={styles.photoThumbOverlay}>
                      <MaterialCommunityIcons name="magnify-plus-outline" size={22} color="#FFFFFF" />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {/* ── Reçu de Dépôt — shown only when in_progress ── */}
          {claim.state === 'in_progress' && (
            <>
              <SectionHeader icon="file-document-outline" label={t.receiptTitle} />
              <View style={styles.receiptCard}>
                <View style={[styles.receiptHeader, isRtl && styles.rtlRow]}>
                  <MaterialCommunityIcons name="file-pdf-box" size={26} color="#F4BA42" />
                  <Text style={[styles.receiptTitle, isRtl && styles.rtlText]}>
                    {t.receiptTitle}
                  </Text>
                </View>
                <Text style={[styles.receiptHint, isRtl && styles.rtlText]}>
                  {t.receiptHint}
                </Text>

                <View style={styles.pdfBtnsRow}>
                  {/* Voir */}
                  <Pressable
                    style={[
                      styles.pdfBtn,
                      styles.pdfBtnView,
                      receiptAction === 'view' && styles.pdfBtnDisabled,
                    ]}
                    onPress={handleReceiptView}
                    disabled={receiptAction !== null}
                  >
                    {receiptAction === 'view' ? (
                      <ActivityIndicator color="#001026" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="eye-outline" size={20} color="#001026" />
                    )}
                    <Text style={styles.pdfBtnTextDark}>
                      {receiptAction === 'view'
                        ? (isRtl ? 'جار الفتح...' : t.receiptOpening)
                        : (isRtl ? t.receiptView : t.receiptView)}
                    </Text>
                  </Pressable>

                  {/* Partager */}
                  <Pressable
                    style={[
                      styles.pdfBtn,
                      styles.pdfBtnShare,
                      receiptAction === 'share' && styles.pdfBtnDisabled,
                    ]}
                    onPress={handleReceiptShare}
                    disabled={receiptAction !== null}
                  >
                    {receiptAction === 'share' ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="share-variant-outline" size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.pdfBtnTextLight}>
                      {receiptAction === 'share'
                        ? (isRtl ? 'جار المشاركة...' : t.receiptSharing)
                        : t.receiptShare}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* ── Victims ── */}
          <SectionHeader icon="account-injury-outline" label={t.sectionVictims} />
          {claim.victims.length === 0 ? (
            <Text style={styles.emptySection}>{t.noVictims}</Text>
          ) : (
            claim.victims.map((v, i) => (
              <View key={i} style={styles.subCard}>
                <Text style={styles.subCardTitle}>{v.name}</Text>
                <InfoRow label={t.healthStatus}  value={v.health_status} />
                <InfoRow label={t.requisition}   value={v.requisition_number} />
                <InfoRow label={t.deathCert}     value={v.death_cert_number} />
                <InfoRow label={t.claimDate}     value={toFrenchDate(v.date)} />
              </View>
            ))
          )}

          {/* ── Other items ── */}
          <SectionHeader icon="car-multiple" label={t.sectionOtherItems} />
          {claim.other_items.length === 0 ? (
            <Text style={styles.emptySection}>{t.noOtherItems}</Text>
          ) : (
            claim.other_items.map((o, i) => (
              <View key={i} style={styles.subCard}>
                <Text style={styles.subCardTitle}>{o.name}</Text>
                <InfoRow label={t.ownerName}         value={o.owner_name} />
                <InfoRow label={t.licensePlateLabel} value={o.license_plate} />
                <InfoRow label={t.damageDescription} value={o.damage_description} />
              </View>
            ))
          )}

          {/* ── Indemnities ── */}
          <SectionHeader icon="currency-usd" label={t.sectionIndemnities} />
          {claim.indemnities.length === 0 ? (
            <Text style={styles.emptySection}>{t.noIndemnities}</Text>
          ) : (
            claim.indemnities.map((ind) => (
              <View key={ind.indemnity_id} style={styles.subCard}>
                <View style={styles.indemnityHeader}>
                  <Text style={styles.subCardTitle}>{ind.name}</Text>
                  <View style={[styles.badge, { backgroundColor: ind.state === 'settled' ? '#52C41A' : '#1890FF' }]}>
                    <Text style={styles.badgeText}>
                      {ind.state === 'settled' ? t.statusSettled : t.statusInProgress}
                    </Text>
                  </View>
                </View>
                <InfoRow label={t.beneficiary}    value={ind.beneficiary_name} />
                <InfoRow label={t.protocolDate}   value={toFrenchDate(ind.protocol_date)} />
                <InfoRow label={t.protocolAmount} value={`${ind.protocol_amount.toLocaleString('fr-FR')} MRU`} />

                {ind.installments.length > 0 && (
                  <>
                    <Text style={styles.installmentTitle}>{t.installments}</Text>
                    {ind.installments.map((inst) => (
                      <View key={inst.installment_id} style={styles.installmentRow}>
                        <Text style={styles.installmentDate}>{toFrenchDate(inst.date)}</Text>
                        <Text style={styles.installmentAmount}>
                          {inst.paid_amount.toLocaleString('fr-FR')} MRU
                        </Text>
                        <View style={[styles.badge, { backgroundColor: inst.is_closed ? '#52C41A' : '#FA8C16' }]}>
                          <Text style={styles.badgeText}>
                            {inst.is_closed ? t.paid : t.pending}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}

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

      {/* ── Photo Fullscreen Viewer ── */}
      <Modal
        visible={!!photoViewer}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPhotoViewer(null)}
      >
        <View style={styles.photoViewerBg}>
          <Pressable style={styles.photoViewerClose} onPress={() => setPhotoViewer(null)}>
            <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          {photoViewer && (
            <View style={styles.photoViewerContainer}>
              <Image
                source={{ uri: photoViewer.urls[photoViewer.index] }}
                style={styles.photoViewerImg}
                resizeMode="contain"
              />
              <Text style={styles.photoViewerCount}>
                {photoViewer.index + 1} / {photoViewer.urls.length}
              </Text>
              <View style={styles.photoViewerNav}>
                <Pressable
                  style={[styles.photoNavBtn, photoViewer.index === 0 && { opacity: 0.3 }]}
                  onPress={() => photoViewer.index > 0 && setPhotoViewer({ ...photoViewer, index: photoViewer.index - 1 })}
                >
                  <MaterialCommunityIcons name="chevron-left" size={30} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={[styles.photoNavBtn, photoViewer.index === photoViewer.urls.length - 1 && { opacity: 0.3 }]}
                  onPress={() => photoViewer.index < photoViewer.urls.length - 1 && setPhotoViewer({ ...photoViewer, index: photoViewer.index + 1 })}
                >
                  <MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

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
    backgroundColor: '#071F3D',
  },
  backBtn: {
    backgroundColor: '#0B2F57',
    borderColor: '#1A4A80',
    borderWidth: 1,
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },

  centerBox: { alignItems: 'center', marginTop: 80, gap: 12 },
  helperText: { color: '#A0AEC0', fontSize: 16, textAlign: 'center' },

  content: { paddingHorizontal: 14, paddingTop: 14, gap: 12, paddingBottom: 20 },

  stateBadge: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 30,
    marginBottom: 4,
  },
  stateBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 2,
  },
  sectionTitle: { color: '#F4BA42', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },

  card: {
    backgroundColor: '#071F3D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#123A66',
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 0,
  },

  /* ── Reçu de dépôt card ── */
  receiptCard: {
    backgroundColor: '#071F3D',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A3D66',
    gap: 12,
  },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiptTitle: { color: '#F4BA42', fontSize: 16, fontWeight: '800', flex: 1 },
  receiptHint: { color: '#7A8EA8', fontSize: 13, lineHeight: 19 },
  pdfBtnsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  pdfBtnView:      { backgroundColor: '#F4BA42' },
  pdfBtnShare:     { backgroundColor: '#0B3F7A', borderWidth: 1, borderColor: '#1A5FAF' },
  pdfBtnDisabled:  { opacity: 0.6 },
  pdfBtnTextDark:  { color: '#001026', fontWeight: '800', fontSize: 15 },
  pdfBtnTextLight: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  subCard: {
    backgroundColor: '#0B2F57',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1A4A80',
    padding: 12,
    gap: 5,
    marginBottom: 8,
  },
  subCardTitle: { color: '#F4BA42', fontSize: 14, fontWeight: '700', marginBottom: 4 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#0D2B4A',
  },
  infoLabel: { color: '#7A91AD', fontSize: 13, flex: 1.1 },
  infoValue: { color: '#E2EAF4', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },

  insBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  insBadgeText: { fontSize: 12, fontWeight: '700' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  /* ── Matricule pill ── */
  matriculeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#0B2F57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matriculePill: {
    backgroundColor: '#0B2745',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#1A4A80',
  },
  matriculePillText: {
    color: '#F4BA42',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* ── Photo strip ── */
  photoStrip: { paddingHorizontal: 2, paddingVertical: 4, gap: 10 },
  photoThumb: {
    width: 110,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1A4A80',
  },
  photoThumbImg: { width: '100%', height: '100%' },
  photoThumbOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,16,38,0.45)',
    alignItems: 'center',
    paddingVertical: 5,
  },

  /* ── Photo fullscreen viewer ── */
  photoViewerBg: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 52, right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 6,
  },
  photoViewerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImg: {
    width: '95%',
    height: '75%',
  },
  photoViewerCount: {
    position: 'absolute',
    top: 58, left: 20,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoViewerNav: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    gap: 24,
  },
  photoNavBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 30,
    padding: 10,
  },

  emptySection: { color: '#6E7483', fontSize: 13, paddingLeft: 8, marginBottom: 8 },

  indemnityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  installmentTitle: { color: '#A0AEC0', fontSize: 12, marginTop: 8, fontWeight: '600' },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1A4A80',
  },
  installmentDate:   { color: '#CBD5E0', fontSize: 12, flex: 1 },
  installmentAmount: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow:  { flexDirection: 'row-reverse' },

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
  viewerRtlRow: { flexDirection: 'row-reverse' },
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
  viewerWebview: { flex: 1, backgroundColor: '#FFFFFF' },
  viewerLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001026',
  },
});
