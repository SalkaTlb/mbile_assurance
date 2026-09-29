import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { getGedDataPdf, getMyInsurances, InsuranceItem } from '@/lib/api';
import { generateAttestationHtml } from '@/lib/attestationTemplate';
import { toFrenchDate } from '@/lib/dateUtils';
import { getLanguage, isArabic, translations } from '@/lib/i18n';
import { uploadToS3 } from '@/lib/s3Upload';

type PdfAction = 'view' | 'share';

export default function InsuranceDetailScreen() {
  const router = useRouter();
  const { id, lang } = useLocalSearchParams<{ id: string; lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].insuranceDetail;

  const [viewDoc, setViewDoc] = useState<{ url: string; name: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [pdfAction, setPdfAction] = useState<PdfAction | null>(null); // which button is active
  const [insurance, setInsurance] = useState<InsuranceItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ─── Load insurance from list ─── */
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const result = await getMyInsurances();
      // getMyInsurances now returns { insurances, pendingQuotes }
      const item = result.insurances.find((ins) => ins.id.toString() === id);
      setInsurance(item ?? null);
    } catch (error: any) {
      setErrorMsg(error?.message ?? "Impossible de charger les détails de l'assurance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  /* ─── Build PDF file, return its uri and s3Url ─── */
  const buildPdfUri = async (): Promise<{ uri: string; s3Url?: string }> => {
    if (!insurance) throw new Error('Aucune assurance chargée.');

    const result = await getGedDataPdf(insurance.id);
    if (!result.success || !result.data) {
      throw new Error("Impossible de récupérer les données de l'attestation.");
    }

    const html = generateAttestationHtml(result.data);
    const sanitized = insurance.insurance_number.replace(/\//g, '_');
    const filename = `Attestation_${sanitized}.pdf`;

    // Generate PDF (A4)
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 595,
      height: 842,
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
    });

    // Copy to a stable path
    const destUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + filename;
    await FileSystem.copyAsync({ from: uri, to: destUri });

    // Upload vers S3 pour la visualisation directe sans bouton d'impression
    let s3Url: string | undefined;
    try {
      const base64Data = await FileSystem.readAsStringAsync(destUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const s3Result = await uploadToS3(base64Data, filename, 'attestation');
      if (s3Result.success) {
        s3Url = s3Result.url;
      }
    } catch (err) {
      console.warn('[S3] Exception lors de l\'upload d\'attestation (non-bloquant):', err);
    }

    return { uri: destUri, s3Url };
  };

  /* ─── Voir : ouvre le PDF directement dans le viewer iOS (sans share sheet) ─── */
  const handleView = async () => {
    if (!insurance || pdfAction) return;
    try {
      setPdfAction('view');

      if (Platform.OS === 'web') {
        const result = await getGedDataPdf(insurance.id);
        if (!result.success || !result.data) throw new Error("Données introuvables.");
        const html = generateAttestationHtml(result.data);
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        return;
      }

      const { uri, s3Url } = await buildPdfUri();

      if (s3Url) {
        setViewDoc({ url: s3Url, name: `Attestation - N° ${insurance.insurance_number}` });
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
      Alert.alert(
        t.errorTitle,
        error?.message ?? t.errorView
      );
    } finally {
      setPdfAction(null);
    }
  };

  /* ─── Partager : iOS share sheet ─── */
  const handleShare = async () => {
    if (!insurance || pdfAction) return;
    try {
      setPdfAction('share');

      const { uri } = await buildPdfUri();

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
        UTI: 'com.adobe.pdf',           // iOS UTI
        dialogTitle: `Attestation ${insurance.insurance_number}`,
      });

    } catch (error: any) {
      Alert.alert(
        t.errorTitle,
        error?.message ?? t.errorShare
      );
    } finally {
      setPdfAction(null);
    }
  };

  /* ─── States ─── */
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#F4BA42" />
        <Text style={[styles.helperLabel, { marginTop: 14 }]}>
          {isRtl ? 'جارٍ التحميل...' : 'Chargement...'}
        </Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="wifi-off" size={52} color="#F4BA42" style={{ marginBottom: 16 }} />
        <Text style={[styles.errorText, { textAlign: 'center', paddingHorizontal: 30, marginBottom: 24 }]}>
          {errorMsg}
        </Text>
        <Pressable style={styles.retryBtn} onPress={loadData}>
          <MaterialCommunityIcons name="refresh" size={18} color="#001026" />
          <Text style={styles.retryBtnText}>🔄 {isRtl ? 'إعادة المحاولة' : 'Réessayer'}</Text>
        </Pressable>
        <Pressable style={[styles.retryBtn, { backgroundColor: '#123A66', marginTop: 12 }]} onPress={() => router.back()}>
          <Text style={[styles.retryBtnText, { color: '#FFFFFF' }]}>{t.back}</Text>
        </Pressable>
      </View>
    );
  }

  if (!insurance) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="shield-off-outline" size={52} color="#F4BA42" style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>{t.notFound}</Text>
        <Pressable style={[styles.retryBtn, { marginTop: 20 }]} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>{t.back}</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = insurance.etat !== 'expired';

  const DetailRow = ({
    label, value, icon,
  }: { label: string; value: string | number; icon: string }) => (
    <View style={[styles.detailRow, isRtl && styles.rtlRow]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#F4BA42" />
      </View>
      <View style={[styles.textContainer, isRtl && styles.rtlTextContainer]}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable style={styles.backBtnHeader} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name={isRtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Status banner ── */}
        <View style={[styles.statusBanner, { borderColor: isActive ? '#52C41A' : '#FF4D4F' }]}>
          <MaterialCommunityIcons
            name={isActive ? 'shield-check' : 'shield-off'}
            size={20}
            color={isActive ? '#52C41A' : '#FF4D4F'}
          />
          <Text style={[styles.statusText, { color: isActive ? '#52C41A' : '#FF4D4F' }]}>
            {isActive ? t.statusActive : t.statusExpired}
          </Text>
        </View>

        {/* ── Details card ── */}
        <View style={styles.mainCard}>
          <DetailRow icon="file-document-outline" label={t.policyNumber}  value={insurance.insurance_number} />
          <DetailRow icon="card-account-details-outline" label={t.matricule}    value={insurance.matricule} />
          <DetailRow icon="car"                   label={t.vehicle}      value={`${insurance.marque} ${insurance.modele}`} />
          <DetailRow icon="calendar-check"        label={t.effectiveDate} value={toFrenchDate(insurance.date_effet)} />
          <DetailRow icon="calendar-remove"       label={t.expiryDate}   value={toFrenchDate(insurance.date_expiration)} />
          <DetailRow icon="cash-multiple"         label={t.totalAmount}  value={`${insurance.total.toLocaleString()} MRU`} />
        </View>

        {/* ── Attestation section ── */}
        <View style={styles.attestationCard}>
          <View style={[styles.attestationHeader, isRtl && styles.rtlRow]}>
            <MaterialCommunityIcons name="file-pdf-box" size={26} color="#F4BA42" />
            <Text style={[styles.attestationTitle, isRtl && styles.rtlText]}>
              {isRtl ? 'وثيقة التأمين' : "Attestation d'assurance"}
            </Text>
          </View>
          <Text style={[styles.attestationHint, isRtl && styles.rtlText]}>
            {isRtl
              ? 'يمكنك عرض الوثيقة أو مشاركتها مع الآخرين'
              : 'Visualisez votre attestation ou partagez-la facilement.'}
          </Text>

          {/* Two action buttons */}
          <View style={styles.pdfBtnsRow}>
            {/* ── Voir ── */}
            <Pressable
              style={[
                styles.pdfBtn,
                styles.pdfBtnView,
                pdfAction === 'view' && styles.pdfBtnDisabled,
              ]}
              onPress={handleView}
              disabled={pdfAction !== null}
            >
              {pdfAction === 'view' ? (
                <ActivityIndicator color="#001026" size="small" />
              ) : (
                <MaterialCommunityIcons name="eye-outline" size={20} color="#001026" />
              )}
              <Text style={styles.pdfBtnTextDark}>
                {pdfAction === 'view'
                  ? (isRtl ? 'جارٍ الفتح...' : 'Ouverture...')
                  : (isRtl ? 'عرض' : 'Voir')}
              </Text>
            </Pressable>

            {/* ── Partager ── */}
            <Pressable
              style={[
                styles.pdfBtn,
                styles.pdfBtnShare,
                pdfAction === 'share' && styles.pdfBtnDisabled,
              ]}
              onPress={handleShare}
              disabled={pdfAction !== null}
            >
              {pdfAction === 'share' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialCommunityIcons name="share-variant-outline" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.pdfBtnTextLight}>
                {pdfAction === 'share'
                  ? (isRtl ? 'جارٍ المشاركة...' : 'Partage...')
                  : (isRtl ? 'مشاركة' : 'Partager')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001026' },
  center:    { justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#071F3D',
  },
  backBtnHeader: {
    backgroundColor: '#0B2F57',
    borderColor: '#123A66',
    borderWidth: 1,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  /* Scroll */
  scrollContent: { padding: 20, gap: 14 },

  /* Status banner */
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#071F3D',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusText: { fontWeight: '700', fontSize: 15 },

  /* Details card */
  mainCard: {
    backgroundColor: '#071F3D',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#123A66',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0D2E52',
  },
  rtlRow: { flexDirection: 'row-reverse' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0B2F57',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer:    { marginLeft: 14, flex: 1 },
  rtlTextContainer: { marginLeft: 0, marginRight: 14, alignItems: 'flex-end' },
  detailLabel:  { color: '#8A97AD', fontSize: 12, marginBottom: 3 },
  detailValue:  { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  /* Attestation card */
  attestationCard: {
    backgroundColor: '#071F3D',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A3D66',
    gap: 12,
  },
  attestationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attestationTitle: { color: '#F4BA42', fontSize: 16, fontWeight: '800', flex: 1 },
  attestationHint:  { color: '#7A8EA8', fontSize: 13, lineHeight: 19 },

  /* PDF Buttons */
  pdfBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  pdfBtnView:    { backgroundColor: '#F4BA42' },
  pdfBtnShare:   { backgroundColor: '#0B3F7A', borderWidth: 1, borderColor: '#1A5FAF' },
  pdfBtnDisabled:{ opacity: 0.6 },
  pdfBtnTextDark:  { color: '#001026', fontWeight: '800', fontSize: 15 },
  pdfBtnTextLight: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  /* Error / retry */
  errorText: { color: '#FFFFFF', fontSize: 17, marginBottom: 20, textAlign: 'center' },
  helperLabel:{ color: '#8A97AD', fontSize: 14 },
  retryBtn: {
    backgroundColor: '#F4BA42',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: '#001026', fontWeight: '700', fontSize: 15 },

  /* RTL */
  rtlText: { textAlign: 'right' },

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
