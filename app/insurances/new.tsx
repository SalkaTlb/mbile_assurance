import { CustomAlert as Alert } from '@/components/CustomAlert';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native';

import { calculerMontantDevis, getCoverageDurations, getMyInsurances, SelectOption, verifierPaiement } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

type DropdownField = 'duration' | null;

// Date d'effet au plus tôt le lendemain (J+1), à minuit.
function tomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

const pad = (n: number) => n.toString().padStart(2, '0');
// Affichage utilisateur : JJ/MM/AAAA
const toDisplayDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
// Format attendu par l'API : MM/DD/YYYY
const toApiDate = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

// Fin de couverture : date d'effet + N mois - 1 jour.
function expiryFrom(effective: Date, months: number): Date {
  const d = new Date(effective);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d;
}

export default function NewInsuranceScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].newInsurance;

  const [activeDropdown, setActiveDropdown] = useState<DropdownField>(null);

  const [matricule, setMatricule] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(tomorrow);
  const minDate = tomorrow();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [calculating, setCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [richatpayDown, setRichatpayDown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [quoteResult, setQuoteResult] = useState<{ total_amount: number; quote_id: string; paymentCode?: string } | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string | null>(null);
  const [durationOptions, setDurationOptions] = useState<{ id: number; label: string; duration: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCoverageDurations();
        // Keep only month-based durations — exclude "3 jours" and any day-based entries.
        // The backend returns a `type` field ('month' | 'day').
        // Fallback: filter by label not containing 'jour' and duration in [1,2,3,6,12].
        const filtered = data.filter((d) => {
          const isMonth = d.type === 'month' || (
            !String(d.label).toLowerCase().includes('jour') &&
            [1, 2, 3, 6, 12].includes(d.duration)
          );
          return isMonth;
        });
        setDurationOptions(filtered);
      } catch (e) {
        console.error("Erreur chargement durées", e);
      }
    };
    load();
  }, []);

  const onSelect = (opt: SelectOption) => {
    if (activeDropdown === 'duration') setDuration(opt.id);
    setActiveDropdown(null);
  };

  const copyPaymentCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      if (Platform.OS === 'android') {
        ToastAndroid.show(t.codeCopied, ToastAndroid.SHORT);
      }
      setTimeout(() => setCopied(false), 2500);
      Alert.alert(t.paymentStepsTitle, t.paymentStepsMsg);
    } catch {
      // silently ignore
    }
  };

  const translateError = (msg: string | null | undefined): string => {
    if (!msg) return '';
    const lower = msg.toLowerCase();
    if (lower.includes('déjà') || lower.includes('deja') || lower.includes('active') || lower.includes('already')) {
      return t.errorAlreadyInsured;
    }
    if (lower.includes('aucun véhicule') || lower.includes('aucun vehicule') || lower.includes('not found') || lower.includes('non trouvé')) {
      return t.errorVehicleNotFound;
    }
    return msg;
  };

  const onValidate = async () => {
    if (!matricule || !duration || !phone) {
      setErrorMsg(t.errorFields);
      return;
    }

    try {
      setCalculating(true);
      setErrorMsg(null);
      
      const selectedDuration = durationOptions.find(d => d.id === duration);

      const res = await calculerMontantDevis({
        matricule,
        duration_list: [selectedDuration ? selectedDuration.duration : 0],
        client_phone: phone,
        effective_date: toApiDate(effectiveDate),
      });

      const qId = res.quote_id ?? res.quotes?.[0]?.quote_id ?? '';
      const qTotal = res.total_amount ?? res.quotes?.[0]?.total ?? 0;

      if (res && res.success && qId) {
        setQuoteResult({
          total_amount: qTotal,
          quote_id: qId,
          paymentCode: res.paymentCode,
        });
        // RichatPay injoignable : devis créé mais pas de code de paiement
        if (res.richatpay_unavailable || !res.paymentCode) {
          setRichatpayDown(true);
        } else {
          setRichatpayDown(false);
        }
        // La réponse du devis ne contient pas le véhicule : on le relit dans les devis en attente.
        getMyInsurances()
          .then(({ pendingQuotes }) => {
            const q = pendingQuotes.find((p) => p.quote_id === qId)
              ?? pendingQuotes.find((p) => p.matricule?.toUpperCase() === matricule.trim().toUpperCase());
            const label = [q?.marque, q?.modele].filter(Boolean).join(' ');
            if (label) setVehicleLabel(label);
          })
          .catch(() => {});
      } else {
        setErrorMsg(translateError(res?.msg || res?.message || res?.code || "Erreur lors de la génération du code de paiement"));
      }
    } catch (err: any) {
      setErrorMsg(translateError(err.message) || t.calcError);
    } finally {
      setCalculating(false);
    }
  };

  const selectField = (value: string, onPress: () => void) => (
    <Pressable style={styles.inputWithIcon} onPress={onPress}>
      <Text style={[styles.selectText, isRtl && styles.rtlText]}>{value}</Text>
      <MaterialCommunityIcons name="chevron-down" size={18} color="#8B94A7" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace({ pathname: '/insurances', params: { lang: language } })}>
          <MaterialCommunityIcons name={isRtl ? "arrow-right" : "arrow-left"} size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={[styles.title, isRtl && styles.rtlText]}>{t.title}</Text>
            <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{t.subtitle}</Text>

            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.regNo}</Text>
            <TextInput value={matricule} onChangeText={setMatricule} style={[styles.input, isRtl && styles.rtlText]} placeholder="1234AA00" placeholderTextColor="#6D7890" editable={!quoteResult} />

            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.duration}</Text>
            {quoteResult ? (
              <View style={[styles.input, { justifyContent: 'center' }]}><Text style={[isRtl && styles.rtlText, { fontSize: 18, color: '#1B2A42' }]}>{durationOptions.find(d => d.id === duration)?.label || ''}</Text></View>
            ) : (
              selectField(durationOptions.find(d => d.id === duration)?.label || t.select, () => setActiveDropdown('duration'))
            )}

            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.effectiveDateLabel}</Text>
            <Pressable style={[styles.inputWithIcon, isRtl && styles.rtlRow]} onPress={() => !quoteResult && setShowDatePicker(!showDatePicker)} disabled={!!quoteResult}>
              <Text style={[styles.selectText, isRtl && styles.rtlText]}>
                {toDisplayDate(effectiveDate)}
              </Text>
              <MaterialCommunityIcons name="calendar" size={18} color="#8B94A7" />
            </Pressable>

            {Platform.OS === 'ios' ? (
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <Pressable style={styles.iosModalBackdrop} onPress={() => setShowDatePicker(false)}>
                  <View style={styles.iosModalContainer}>
                    <View style={styles.iosModalHeader}>
                      <Pressable onPress={() => setShowDatePicker(false)} style={styles.iosModalHeaderBtn}>
                        <Text style={styles.iosModalCancelText}>Annuler</Text>
                      </Pressable>
                      <Text style={styles.iosModalTitle}>Choisir une date</Text>
                      <Pressable
                        onPress={() => {
                          setShowDatePicker(false);
                        }}
                        style={styles.iosModalHeaderBtn}
                      >
                        <Text style={styles.iosModalConfirmText}>Confirmer</Text>
                      </Pressable>
                    </View>
                    <View style={styles.iosCalendarContainer}>
                      <DateTimePicker
                        value={effectiveDate}
                        minimumDate={minDate}
                        mode="date"
                        display="inline"
                        locale="fr_FR"
                        themeVariant="light"
                        accentColor="#12335E"
                        onChange={(e, selected) => {
                          if (selected) {
                            setEffectiveDate(selected);
                          }
                        }}
                      />
                    </View>
                  </View>
                </Pressable>
              </Modal>
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={effectiveDate}
                  minimumDate={minDate}
                  mode="date"
                  display="spinner"
                  locale="fr_FR"
                  onChange={(e, selected) => {
                    setShowDatePicker(false);
                    if (selected) setEffectiveDate(selected);
                  }}
                />
              )
            )}

            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.phone}</Text>
            <TextInput
              value={phone}
              onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, '').slice(0, 8))}
              keyboardType="phone-pad"
              maxLength={8}
              style={[styles.input, isRtl && styles.rtlText]}
              placeholder="+222..."
              placeholderTextColor="#6D7890"
              editable={!quoteResult}
            /> 

            {errorMsg && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4D4F" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {quoteResult ? (
              <View style={styles.successArea}>
                <View style={styles.quoteCard}>
                  <Text style={[styles.quoteTitle, isRtl && styles.rtlText]}>{t.summary}</Text>
                  {vehicleLabel && (
                    <View style={[styles.quoteRow, styles.quoteDetailRow, isRtl && styles.rtlRow]}>
                      <Text style={[styles.quoteLabel, isRtl && styles.rtlText]}>{t.vehicle}</Text>
                      <Text style={styles.quoteValue}>{vehicleLabel}</Text>
                    </View>
                  )}
                  <View style={[styles.quoteRow, styles.quoteDetailRow, isRtl && styles.rtlRow]}>
                    <Text style={[styles.quoteLabel, isRtl && styles.rtlText]}>{t.expiryDate}</Text>
                    <Text style={styles.quoteValue}>
                      {toDisplayDate(expiryFrom(effectiveDate, durationOptions.find(d => d.id === duration)?.duration ?? 0))}
                    </Text>
                  </View>
                  <View style={[styles.quoteRow, isRtl && styles.rtlRow]}>
                    <Text style={[styles.quoteLabel, isRtl && styles.rtlText]}>{t.totalToPay}</Text>
                    <Text style={styles.totalValue}>{quoteResult.total_amount.toLocaleString()} MRU</Text>
                  </View>
                </View>

                {/* Bloc paiement : conditionnel selon disponibilité RichatPay */}
                {richatpayDown ? (
                  <View style={styles.richatpayDownContainer}>
                    <MaterialCommunityIcons name="wifi-off" size={32} color="#FA8C16" />
                    <Text style={[styles.richatpayDownTitle, isRtl && styles.rtlText]}>{t.richatpayDownTitle}</Text>
                    <Text style={[styles.richatpayDownMsg, isRtl && styles.rtlText]}>{t.richatpayDownMsg}</Text>
                    <Pressable
                      style={[styles.button, { backgroundColor: '#FA8C16', marginTop: 16 }, retrying && { opacity: 0.7 }]}
                      disabled={retrying}
                      onPress={async () => {
                        if (!quoteResult?.quote_id) return;
                        try {
                          setRetrying(true);
                          const res = await calculerMontantDevis({
                            matricule,
                            duration_list: [durationOptions.find(d => d.id === duration)?.duration ?? 0],
                            client_phone: phone,
                            effective_date: toApiDate(effectiveDate),
                          });
                          if (res?.success && res.paymentCode) {
                            setQuoteResult(prev => prev ? { ...prev, paymentCode: res.paymentCode! } : prev);
                            setRichatpayDown(false);
                          } else {
                            Alert.alert('⏳ ' + t.stillUnavailable, t.stillUnavailableMsg);
                          }
                        } catch {
                          Alert.alert(translations[language].login.errorTitle, t.errorServer);
                        } finally {
                          setRetrying(false);
                        }
                      }}
                    >
                      {retrying ? <ActivityIndicator color="#FFF" /> : <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />}
                      <Text style={[styles.buttonText, { color: '#FFF' }]}>{retrying ? t.connecting : t.retry}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.codeContainer}>
                    <Text style={styles.payInstruction}>{t.paymentCodeTitle}</Text>
                    <Text style={styles.codeValue}>{quoteResult.paymentCode}</Text>
                    <Pressable
                      style={[styles.copyBtn, copied && styles.copyBtnSuccess, isRtl && styles.rtlRow]}
                      onPress={() => quoteResult.paymentCode && copyPaymentCode(quoteResult.paymentCode)}
                    >
                      <MaterialCommunityIcons
                        name={copied ? 'check-circle' : 'content-copy'}
                        size={18}
                        color={copied ? '#52C41A' : '#2F54EB'}
                      />
                      <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
                        {copied ? t.codeCopied : t.copyCode}
                      </Text>
                    </Pressable>
                    <Text style={styles.smallInstruction}>{t.paymentInstruction}</Text>
                  </View>
                )}

                {/* Bouton pour forcer la vérification manuelle du paiement */}
                <Pressable
                  style={[styles.button, { backgroundColor: '#0B2F57', marginTop: 20 }, verifying && { opacity: 0.7 }]}
                  disabled={verifying}
                  onPress={async () => {
                    if (!quoteResult?.quote_id) {
                      router.replace({ pathname: '/insurances', params: { lang: language } });
                      return;
                    }
                    try {
                      setVerifying(true);
                      const res = await verifierPaiement(quoteResult.quote_id);
                      if (res.paid) {
                        // Afficher le modal de succès avant de rediriger
                        setShowSuccessModal(true);
                      } else {
                        Alert.alert(
                          '⏳ ' + t.paymentPending,
                          res.msg || t.paymentPendingMsg,
                          [
                            { text: t.retry, style: 'cancel' },
                            { text: t.viewInsurances, onPress: () => router.replace({ pathname: '/insurances', params: { lang: language } }) },
                          ]
                        );
                      }
                    } catch (e: any) {
                      Alert.alert(translations[language].login.errorTitle, e.message || t.errorVerify);
                    } finally {
                      setVerifying(false);
                    }
                  }}
                >
                  {verifying
                    ? <ActivityIndicator color="#FFF" />
                    : <MaterialCommunityIcons name="check-circle-outline" size={22} color="#FFF" />}
                  <Text style={[styles.buttonText, { color: '#FFF' }]}>
                    {verifying ? t.verifying : t.verifyPayment}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={[styles.button, { backgroundColor: '#FFD700', marginTop: 20 }, isRtl && styles.rtlRow]} onPress={onValidate} disabled={calculating}>
                {calculating ? <ActivityIndicator color="#1E2433" /> : <MaterialCommunityIcons name="calculator" size={22} color="#1E2433" />}
                <Text style={styles.buttonText}>{calculating ? t.calculating : t.calculateBtn}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal de confirmation de paiement réussi ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="check-decagram" size={56} color="#52C41A" />
            </View>
            <Text style={styles.successModalTitle}>{t.paymentConfirmed}</Text>
            <Text style={styles.successModalSubtitle}>
              {t.paymentConfirmedMsg}
            </Text>
            <Pressable
              style={styles.successModalBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace({ pathname: '/insurances', params: { lang: language } });
              }}
            >
              <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
              <Text style={styles.successModalBtnText}>{t.viewInsurances}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeDropdown} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveDropdown(null)}>
          <View style={styles.modalCard}>
            <ScrollView style={styles.modalList}>
              {(activeDropdown === 'duration' ? durationOptions.map(d => ({ id: d.id, name: d.label })) : []).map((opt) => (
                <Pressable key={opt.id} style={styles.modalItem} onPress={() => onSelect(opt)}>
                  <Text style={styles.modalItemText}>{opt.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001f3f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { backgroundColor: '#0B2F57', borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 10, paddingVertical: 12 },
  card: { backgroundColor: '#F2F5FA', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  title: { color: '#12335E', fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 4, marginBottom: 14, color: '#8A93A3', fontSize: 16 },
  label: { color: '#16375E', fontSize: 16, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#EEF2F7', borderRadius: 22, borderColor: '#C2CBDA', borderWidth: 1, paddingHorizontal: 16, color: '#1B2A42', fontSize: 17, marginBottom: 8, height: 48, justifyContent: 'center' },
  inputWithIcon: { backgroundColor: '#EEF2F7', borderRadius: 22, borderColor: '#C2CBDA', borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8, height: 48 },
  selectText: { flex: 1, color: '#1B2A42', fontSize: 17, paddingHorizontal: 4 },
  button: { marginTop: 8, borderRadius: 22, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  buttonText: { color: '#1E2433', fontWeight: '800', fontSize: 20 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow: { flexDirection: 'row-reverse' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 12, maxHeight: '60%' },
  modalList: { paddingVertical: 8 },
  modalItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E8EF' },
  modalItemText: { color: '#1B2A42', fontSize: 16 },
  successArea: { marginTop: 10 },
  quoteCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 5, borderLeftColor: '#FFD700', elevation: 3 },
  quoteTitle: { color: '#12335E', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteLabel: { color: '#6D7890', fontSize: 16 },
  quoteDetailRow: { marginBottom: 8 },
  quoteValue: { color: '#12335E', fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  totalValue: { color: '#12335E', fontSize: 22, fontWeight: '900' },
  codeContainer: { padding: 20, backgroundColor: '#F0F5FF', borderRadius: 12, borderWidth: 1, borderColor: '#ADC6FF', alignItems: 'center' },
  payInstruction: { fontSize: 14, color: '#2F54EB', fontWeight: '700', marginBottom: 10 },
  codeValue: { fontSize: 42, color: '#1D39C4', fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ADC6FF',
    marginBottom: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#F6FFED',
    borderColor: '#B7EB8F',
  },
  copyBtnText: { color: '#2F54EB', fontSize: 14, fontWeight: '700' },
  copyBtnTextSuccess: { color: '#52C41A' },
  smallInstruction: { marginTop: 4, fontSize: 13, color: '#595959', textAlign: 'center', fontStyle: 'italic' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF2F0', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#FFCCC7' },
  errorText: { color: '#FF4D4F', fontSize: 14, flex: 1, fontWeight: '500' },
  richatpayDownContainer: { padding: 20, backgroundColor: '#FFF7E6', borderRadius: 12, borderWidth: 1, borderColor: '#FFD591', alignItems: 'center', gap: 10 },
  richatpayDownTitle: { fontSize: 16, fontWeight: '800', color: '#D46B08', textAlign: 'center' },
  richatpayDownMsg: { fontSize: 13, color: '#614700', textAlign: 'center', lineHeight: 20 },
  // ── Modal succès paiement
  successModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  successModalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center', width: '100%', elevation: 20 },
  successIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F6FFED', borderWidth: 2, borderColor: '#B7EB8F', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successModalTitle: { fontSize: 24, fontWeight: '900', color: '#135200', marginBottom: 12, textAlign: 'center' },
  successModalSubtitle: { fontSize: 15, color: '#595959', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successModalBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0B2F57', borderRadius: 22, paddingHorizontal: 28, paddingVertical: 14 },
  successModalBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  /* ── iOS inline calendar ── */
  iosCalendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 10,
  },
  /* ── iOS Modal Styles ── */
  iosModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  iosModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    width: '100%',
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  iosModalHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  iosModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  iosModalCancelText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  iosModalConfirmText: {
    fontSize: 16,
    color: '#12335E',
    fontWeight: '700',
  },
});