import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';

import { CustomAlert as Alert } from '@/components/CustomAlert';

import { renouvelerCodePaiement, verifierPaiement } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

export default function PendingInsuranceScreen() {
  const router = useRouter();
  const {
    lang,
    quote_id,
    matricule,
    marque,
    modele,
    duration,
    total,
    effective_date,
    payment_code: initialCode,
    code_expired: initialExpired,
  } = useLocalSearchParams<{
    lang?: string;
    quote_id: string;
    matricule: string;
    marque: string;
    modele: string;
    duration: string;
    total: string;
    effective_date: string;
    payment_code?: string;
    code_expired?: string;
  }>();

  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].pending;

  const [paymentCode, setPaymentCode] = useState<string | null>(initialCode || null);
  const [codeExpired, setCodeExpired] = useState(initialExpired === 'true' || !initialCode);
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const totalAmount = parseFloat(total || '0');

  const copyCode = async () => {
    if (!paymentCode) return;
    await Clipboard.setStringAsync(paymentCode);
    setCopied(true);
    if (Platform.OS === 'android') ToastAndroid.show(t.copied, ToastAndroid.SHORT);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRenouveler = async () => {
    if (!quote_id) return;
    try {
      setRenewing(true);
      const res = await renouvelerCodePaiement(quote_id);
      if (res.already_paid) {
        setShowSuccessModal(true);
        return;
      }
      if (res.success && res.paymentCode) {
        setPaymentCode(res.paymentCode);
        setCodeExpired(false);
        Alert.alert(t.renewSuccessTitle, t.renewSuccessMsg);
      } else {
        Alert.alert(
          translations[language].login.errorTitle,
          res.msg || (isRtl ? 'تعذر توليد رمز جديد. يرجى المحاولة لاحقاً.' : 'Impossible de générer un nouveau code. Réessayez plus tard.')
        );
      }
    } catch (e: any) {
      Alert.alert(
        translations[language].login.errorTitle,
        e.message || (isRtl ? 'خطأ في الشبكة' : 'Erreur réseau')
      );
    } finally {
      setRenewing(false);
    }
  };

  const handleVerifier = async () => {
    if (!quote_id) return;
    try {
      setVerifying(true);
      const res = await verifierPaiement(quote_id);
      if (res.paid) {
        setShowSuccessModal(true);
      } else if (!res.success) {
        // Erreur serveur (ex: RichatPay inaccessible → 503)
        Alert.alert(
          isRtl ? '⚠️ الخدمة غير متوفرة' : '⚠️ Service indisponible',
          res.msg || (isRtl ? 'بوابة الدفع غير متوفرة مؤقتاً. يرجى المحاولة بعد قليل.' : 'Le serveur de paiement est temporairement inaccessible. Réessayez dans quelques instants.'),
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          isRtl ? '⏳ الدفع قيد الانتظار' : '⏳ Paiement en attente',
          res.msg || (isRtl ? 'لم يتم التحقق من الدفع بعد. تأكد من إتمام عملية الدفع.' : 'Le paiement n\'est pas encore validé. Assurez-vous d\'avoir effectué le paiement.'),
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      Alert.alert(
        isRtl ? '❌ خطأ في الشبكة' : '❌ Erreur réseau',
        e.message || (isRtl ? 'حدث خطأ أثناء التحقق. يرجى التأكد من الاتصال بالإنترنت.' : 'Erreur lors de la vérification. Vérifiez votre connexion.')
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name={isRtl ? 'arrow-right' : 'arrow-left'} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.headerTitle, isRtl && styles.rtlText]}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <View style={[styles.pendingBanner, isRtl && styles.rtlRow]}>
          <MaterialCommunityIcons name="clock-alert-outline" size={28} color="#FA8C16" />
          <Text style={[styles.pendingBannerText, isRtl && styles.rtlText]}>{t.pendingBanner}</Text>
        </View>

        {/* Devis details card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>{t.cardTitle}</Text>

          <View style={[styles.detailRow, isRtl && styles.rtlRow]}>
            <MaterialCommunityIcons name="car-info" size={20} color="#F4BA42" />
            <View style={[styles.detailText, isRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.detailLabel, isRtl && styles.rtlText]}>{t.matricule}</Text>
              <Text style={[styles.detailValue, isRtl && styles.rtlText]}>{matricule}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, isRtl && styles.rtlRow]}>
            <MaterialCommunityIcons name="car" size={20} color="#F4BA42" />
            <View style={[styles.detailText, isRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.detailLabel, isRtl && styles.rtlText]}>{t.vehicle}</Text>
              <Text style={[styles.detailValue, isRtl && styles.rtlText]}>{marque} {modele}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, isRtl && styles.rtlRow]}>
            <MaterialCommunityIcons name="calendar-range" size={20} color="#F4BA42" />
            <View style={[styles.detailText, isRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.detailLabel, isRtl && styles.rtlText]}>{t.duration}</Text>
              <Text style={[styles.detailValue, isRtl && styles.rtlText]}>{duration}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, isRtl && styles.rtlRow]}>
            <MaterialCommunityIcons name="calendar-check" size={20} color="#F4BA42" />
            <View style={[styles.detailText, isRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.detailLabel, isRtl && styles.rtlText]}>{t.effectiveDate}</Text>
              <Text style={[styles.detailValue, isRtl && styles.rtlText]}>{effective_date}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }, isRtl && styles.rtlRow]}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color="#F4BA42" />
            <View style={[styles.detailText, isRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.detailLabel, isRtl && styles.rtlText]}>{t.totalAmount}</Text>
              <Text style={[styles.detailValue, styles.totalAmount, isRtl && styles.rtlText]}>{totalAmount.toLocaleString()} MRU</Text>
            </View>
          </View>
        </View>

        {/* Payment Code Block */}
        {codeExpired || !paymentCode ? (
          <View style={styles.expiredCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#FF4D4F" />
            <Text style={[styles.expiredTitle, isRtl && styles.rtlText]}>{t.expiredTitle}</Text>
            <Text style={[styles.expiredMsg, isRtl && styles.rtlText]}>
              {t.expiredMsg}
            </Text>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#FA8C16' }, renewing && { opacity: 0.7 }, isRtl && styles.rtlRow]}
              onPress={handleRenouveler}
              disabled={renewing}
            >
              {renewing
                ? <ActivityIndicator color="#FFF" />
                : <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />}
              <Text style={styles.actionBtnText}>{renewing ? t.generating : t.newCodeBtn}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.codeCard}>
            <Text style={[styles.codeLabel, isRtl && styles.rtlText]}>{t.codeLabel}</Text>
            <Text style={styles.codeValue}>{paymentCode}</Text>
            <Pressable
              style={[styles.copyBtn, copied && styles.copyBtnSuccess, isRtl && styles.rtlRow]}
              onPress={copyCode}
            >
              <MaterialCommunityIcons
                name={copied ? 'check-circle' : 'content-copy'}
                size={18}
                color={copied ? '#52C41A' : '#2F54EB'}
              />
              <Text style={[styles.copyBtnText, copied && { color: '#52C41A' }]}>
                {copied ? t.copied : t.copyCodeBtn}
              </Text>
            </Pressable>
            <Text style={[styles.codeInstruction, isRtl && styles.rtlText]}>
              {t.payInstruction}
            </Text>

            {/* Renew button even when code exists */}
            <Pressable
              style={[styles.renewSmallBtn, renewing && { opacity: 0.7 }, isRtl && styles.rtlRow]}
              onPress={handleRenouveler}
              disabled={renewing}
            >
              {renewing
                ? <ActivityIndicator color="#FA8C16" size="small" />
                : <MaterialCommunityIcons name="refresh" size={16} color="#FA8C16" />}
              <Text style={styles.renewSmallBtnText}>{renewing ? t.generating : t.regenerateBtn}</Text>
            </Pressable>
          </View>
        )}

        {/* Verify Button */}
        <Pressable
          style={[styles.actionBtn, { backgroundColor: '#0B2F57', marginTop: 16 }, verifying && { opacity: 0.7 }, isRtl && styles.rtlRow]}
          onPress={handleVerifier}
          disabled={verifying}
        >
          {verifying
            ? <ActivityIndicator color="#FFF" />
            : <MaterialCommunityIcons name="check-circle-outline" size={22} color="#FFF" />}
          <Text style={styles.actionBtnText}>{verifying ? t.verifying : t.verifyBtn}</Text>
        </Pressable>

        <Text style={[styles.helpText, isRtl && styles.rtlText]}>
          {t.helpText}
        </Text>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="check-decagram" size={56} color="#52C41A" />
            </View>
            <Text style={[styles.successModalTitle, isRtl && styles.rtlText]}>{t.successTitle}</Text>
            <Text style={[styles.successModalSubtitle, isRtl && styles.rtlText]}>
              {t.successSubtitle}
            </Text>
            <Pressable
              style={[styles.successModalBtn, isRtl && styles.rtlRow]}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace({ pathname: '/insurances', params: { lang: language, refresh: Date.now().toString() } });
              }}
            >
              <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
              <Text style={styles.successModalBtnText}>{t.successBtn}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001026' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#071F3D',
  },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
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
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 20, gap: 16 },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD591',
  },
  pendingBannerText: { color: '#D46B08', fontWeight: '700', fontSize: 15, flex: 1 },

  card: {
    backgroundColor: '#071F3D',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#123A66',
  },
  cardTitle: { color: '#F4BA42', fontSize: 17, fontWeight: '800', marginBottom: 16 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0B2F57',
  },
  detailText: { flex: 1 },
  detailLabel: { color: '#8B94A7', fontSize: 12, marginBottom: 2 },
  detailValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  totalAmount: { color: '#F4BA42', fontSize: 20, fontWeight: '900' },

  expiredCard: {
    backgroundColor: '#FFF2F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCCC7',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  expiredTitle: { color: '#CF1322', fontWeight: '800', fontSize: 16, textAlign: 'center' },
  expiredMsg: { color: '#5C0011', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  codeCard: {
    backgroundColor: '#EEF5FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ADC6FF',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  codeLabel: { color: '#2F54EB', fontWeight: '700', fontSize: 14 },
  codeValue: { fontSize: 44, color: '#1D39C4', fontWeight: '900', letterSpacing: 4 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ADC6FF',
  },
  copyBtnSuccess: { backgroundColor: '#F6FFED', borderColor: '#B7EB8F' },
  copyBtnText: { color: '#2F54EB', fontWeight: '700', fontSize: 14 },
  codeInstruction: { fontSize: 12, color: '#595959', textAlign: 'center', fontStyle: 'italic' },
  renewSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FA8C16',
    marginTop: 4,
  },
  renewSmallBtnText: { color: '#FA8C16', fontSize: 13, fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  actionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 17 },

  helpText: {
    color: '#8B94A7',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Success Modal
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    elevation: 20,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F6FFED',
    borderWidth: 2,
    borderColor: '#B7EB8F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successModalTitle: { fontSize: 24, fontWeight: '900', color: '#135200', marginBottom: 10, textAlign: 'center' },
  successModalSubtitle: { fontSize: 15, color: '#595959', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B2F57',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  successModalBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
