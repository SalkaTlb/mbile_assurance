import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import MapView, { Marker, Region } from 'react-native-maps';

import { declareClaim, DeclareClaimPayload, uploadImageToS3, ensureImagePickerDirectory } from '@/lib/api';
import { getLanguage, isArabic, translations } from '@/lib/i18n';

type ClaimType = 'material' | 'bodily' | 'mixed';

const LAST_LOCATION_KEY = 'last_claim_location';

// ─── Reverse geocoding (no API key needed, uses Nominatim OSM) ────────────────
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=fr`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MedinaAssuranceMobile/1.0' },
    });
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export default function NewClaimScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].claims;

  // ── Form fields ───────────────────────────────────────────────────────────
  const [licensePlate,    setLicensePlate]    = useState('');
  const [claimDate,       setClaimDate]       = useState('');
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [dateObj,         setDateObj]         = useState(new Date());
  const [claimType,       setClaimType]       = useState<ClaimType>('material');
  const [location,        setLocation]        = useState('');
  const [infraction,      setInfraction]      = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [photos,          setPhotos]          = useState<string[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);

  // ── Location state ────────────────────────────────────────────────────────
  const [gpsLoading,      setGpsLoading]      = useState(false);
  const [showMap,         setShowMap]         = useState(false);
  const [mapRegion,       setMapRegion]       = useState<Region | null>(null);
  const [markerCoords,    setMarkerCoords]    = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // ── Restore last saved location on mount ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LAST_LOCATION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as {
            label: string;
            latitude: number;
            longitude: number;
          };
          setLocation(parsed.label);
          setMarkerCoords({ latitude: parsed.latitude, longitude: parsed.longitude });
          setMapRegion({
            latitude:      parsed.latitude,
            longitude:     parsed.longitude,
            latitudeDelta:  0.01,
            longitudeDelta: 0.01,
          });
          setShowMap(true);
        }
      } catch { /* silently ignore */ }
    })();
  }, []);

  // ── Request GPS and get current position ─────────────────────────────────
  const handleGetLocation = async () => {
    setGpsLoading(true);
    try {
      // 1. Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          isRtl ? '⚠️ إذن مرفوض' : '⚠️ Permission refusée',
          isRtl
            ? 'يجب السماح بالوصول إلى الموقع لاستخدام هذه الميزة.'
            : 'Veuillez autoriser l\'accès à la localisation dans les paramètres de votre appareil.',
          [
            { text: isRtl ? 'موافق' : 'OK' },
          ]
        );
        return;
      }

      // 2. Get current position
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = pos.coords;

      // 3. Reverse geocode to human-readable address
      const label = await reverseGeocode(latitude, longitude);
      setLocation(label);

      // 4. Update map
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta:  0.01,
        longitudeDelta: 0.01,
      };
      setMarkerCoords({ latitude, longitude });
      setMapRegion(region);
      setShowMap(true);
      setTimeout(() => mapRef.current?.animateToRegion(region, 500), 100);

      // 5. Save to AsyncStorage for next session
      await AsyncStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify({ label, latitude, longitude })
      );

    } catch (err: any) {
      Alert.alert(
        isRtl ? '❌ خطأ' : '❌ Erreur',
        err?.message ?? (isRtl
          ? 'تعذر تحديد موقعك الحالي.'
          : 'Impossible de récupérer votre position GPS.')
      );
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Clear GPS location ────────────────────────────────────────────────────
  const handleClearLocation = async () => {
    setLocation('');
    setMarkerCoords(null);
    setMapRegion(null);
    setShowMap(false);
    await AsyncStorage.removeItem(LAST_LOCATION_KEY);
  };

  // ── Photo helpers ──────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        isRtl ? '⚠️ إذن مرفوض' : '⚠️ Permission refusée',
        isRtl
          ? 'يجب السماح بالوصول إلى معرض الصور.'
          : 'Veuillez autoriser l\'accès à la galerie dans les paramètres.'
      );
      return;
    }

    await ensureImagePickerDirectory();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      const selectedUris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...selectedUris].slice(0, 5)); // max 5 photos
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        isRtl ? '⚠️ إذن مرفوض' : '⚠️ Permission refusée',
        isRtl
          ? 'يجب السماح بالوصول إلى الكاميرا.'
          : 'Veuillez autoriser l\'accès à la caméra dans les paramètres.'
      );
      return;
    }

    await ensureImagePickerDirectory();

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      exif: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPhotos(prev => [...prev, uri].slice(0, 5));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ── Date helpers ──────────────────────────────────────────────────────────
  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false); // dismiss dialog on Android
    }
    if (selected) {
      setDateObj(selected);
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      setClaimDate(`${y}-${m}-${d}`);
      // On iOS inline mode we close after a date is confirmed by tapping
    }
  };

  const displayDate = () => {
    if (!claimDate) return 'JJ/MM/AAAA';
    const [y, m, d] = claimDate.split('-');
    return `${d}/${m}/${y}`;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!licensePlate.trim() || !claimDate.trim()) {
      setErrorMsg(t.errorFields);
      return;
    }

    try {
      setLoading(true);

      // Upload photos if any
      const uploadedUrls: string[] = [];
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const uri = photos[i];
          const filename = `claim_${Date.now()}_photo_${i}.jpg`;
          try {
            const url = await uploadImageToS3(uri, filename);
            uploadedUrls.push(url);
          } catch (uploadErr) {
            console.error("Image upload failed:", uploadErr);
            throw new Error(isRtl ? 'فشل رفع إحدى الصور.' : 'Échec du téléchargement d\'une image.');
          }
        }
      }

      const payload: DeclareClaimPayload = {
        license_plate:    licensePlate.trim(),
        claim_date:       claimDate.trim(),
        claim_type:       claimType,
        claim_location:   location.trim() || undefined,
        infraction:       infraction.trim() || undefined,
        beneficiary_name: beneficiaryName.trim() || undefined,
        photos:           uploadedUrls.length > 0 ? uploadedUrls : undefined,
      };

      const res = await declareClaim(payload);
      if (res.success) {
        Alert.alert('✅ ' + t.declarationSentTitle, t.submitSuccess, [
          {
            text: 'OK',
            onPress: () =>
              router.replace({ pathname: '/claims', params: { lang: language } }),
          },
        ]);
      } else {
        setErrorMsg(res.msg || t.errorSubmit);
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? t.errorSubmit);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions: { label: string; value: ClaimType }[] = [
    { label: t.claimTypeMaterial, value: 'material' },
    { label: t.claimTypeBodily,   value: 'bodily'   },
    { label: t.claimTypeMixed,    value: 'mixed'     },
  ];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, isRtl && styles.rtlRow]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace({ pathname: '/claims', params: { lang: language } })}
        >
          <MaterialCommunityIcons
            name={isRtl ? 'arrow-right' : 'arrow-left'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t.declareTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── White card ── */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>{t.declareTitle}</Text>
            <Text style={[styles.cardSubtitle, isRtl && styles.rtlText]}>
              {t.fillClaimInfo}
            </Text>

            {/* Error banner */}
            {errorMsg && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4D4F" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Licence plate */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.licensePlate} *</Text>
            <TextInput
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholder={t.licensePlatePlaceholder}
              placeholderTextColor="#6D7890"
              style={[styles.input, isRtl && styles.rtlInput]}
              autoCapitalize="characters"
            />

            {/* Claim date */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.claimDate} *</Text>
            <Pressable
              style={[styles.inputWithIcon, claimDate ? styles.inputWithIconFilled : null]}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color={claimDate ? '#12335E' : '#6D7890'}
                style={{ marginRight: 8 }}
              />
              <Text style={[
                styles.selectText,
                !claimDate && styles.placeholder,
                isRtl && styles.rtlText,
              ]}>
                {displayDate()}
              </Text>
              {claimDate && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setClaimDate('');
                    setDateObj(new Date());
                  }}
                  style={styles.clearDate}
                >
                  <MaterialCommunityIcons name="close-circle" size={18} color="#6D7890" />
                </Pressable>
              )}
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
                          const y = dateObj.getFullYear();
                          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                          const d = String(dateObj.getDate()).padStart(2, '0');
                          setClaimDate(`${y}-${m}-${d}`);
                          setShowDatePicker(false);
                        }}
                        style={styles.iosModalHeaderBtn}
                      >
                        <Text style={styles.iosModalConfirmText}>Confirmer</Text>
                      </Pressable>
                    </View>
                    <View style={styles.iosCalendarContainer}>
                      <DateTimePicker
                        value={dateObj}
                        mode="date"
                        display="inline"
                        locale="fr_FR"
                        themeVariant="light"
                        accentColor="#12335E"
                        onChange={(e, selected) => {
                          if (selected) {
                            setDateObj(selected);
                          }
                        }}
                        maximumDate={new Date()}
                      />
                    </View>
                  </View>
                </Pressable>
              </Modal>
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="spinner"
                  locale="fr_FR"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )
            )}

            {/* Claim type */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.claimType} *</Text>
            <View style={styles.typeRow}>
              {typeOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.typeBtn, claimType === opt.value && styles.typeBtnActive]}
                  onPress={() => setClaimType(opt.value)}
                >
                  <Text style={[styles.typeBtnText, claimType === opt.value && styles.typeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Location with GPS ── */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.claimLocation}</Text>

            {/* Row: text input + GPS button */}
            <View style={styles.locationRow}>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder={t.locationPlaceholder}
                placeholderTextColor="#6D7890"
                style={[styles.locationInput, isRtl && styles.rtlInput]}
                multiline
                numberOfLines={2}
              />
              <Pressable
                style={[styles.gpsBtn, gpsLoading && { opacity: 0.6 }]}
                onPress={handleGetLocation}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            {/* GPS status badge */}
            {markerCoords && (
              <View style={styles.gpsBadge}>
                <MaterialCommunityIcons name="map-marker-check" size={16} color="#12335E" />
                <Text style={styles.gpsBadgeText}>
                  {isRtl ? 'تم تحديد الموقع GPS ✓' : 'Position GPS capturée ✓'}
                </Text>
                <Pressable onPress={handleClearLocation} style={styles.clearGpsBtn}>
                  <MaterialCommunityIcons name="close" size={14} color="#6D7890" />
                </Pressable>
              </View>
            )}

            {/* ── Map preview ── */}
            {showMap && mapRegion && markerCoords && (
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  region={mapRegion}
                  onRegionChangeComplete={(r) => setMapRegion(r)}
                  showsUserLocation
                  showsMyLocationButton={false}
                >
                  <Marker
                    coordinate={markerCoords}
                    title={isRtl ? 'موقع الحادث' : 'Lieu du sinistre'}
                    description={location}
                    pinColor="#12335E"
                  />
                </MapView>
                {/* Coordinates overlay */}
                <View style={styles.coordsOverlay}>
                  <Text style={styles.coordsText}>
                    {markerCoords.latitude.toFixed(5)}, {markerCoords.longitude.toFixed(5)}
                  </Text>
                </View>
              </View>
            )}

            {/* Infraction */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.infraction}</Text>
            <TextInput
              value={infraction}
              onChangeText={setInfraction}
              placeholder={t.infractionPlaceholder}
              placeholderTextColor="#6D7890"
              style={[styles.input, styles.multiline, isRtl && styles.rtlInput]}
              multiline
              numberOfLines={3}
            />

            {/* Beneficiary */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.beneficiaryName}</Text>
            <TextInput
              value={beneficiaryName}
              onChangeText={setBeneficiaryName}
              placeholder={t.beneficiaryPlaceholder}
              placeholderTextColor="#6D7890"
              style={[styles.input, isRtl && styles.rtlInput]}
            />
            {/* Photos selection */}
            <Text style={[styles.label, isRtl && styles.rtlText]}>{t.photosLabel}</Text>
            <View style={[styles.photosRow, isRtl && styles.rtlRow]}>
              <Pressable style={styles.photoActionBtn} onPress={handleTakePhoto}>
                <MaterialCommunityIcons name="camera" size={20} color="#12335E" />
                <Text style={styles.photoActionText}>{t.takePhoto}</Text>
              </Pressable>
              <Pressable style={styles.photoActionBtn} onPress={handlePickImage}>
                <MaterialCommunityIcons name="image-multiple" size={20} color="#12335E" />
                <Text style={styles.photoActionText}>{t.chooseLibrary}</Text>
              </Pressable>
            </View>

            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.thumbnailsContainer, isRtl && styles.rtlRow]}
                style={{ marginBottom: 12 }}
              >
                {photos.map((uri, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <Pressable
                      style={styles.removePhotoBadge}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            {/* Submit */}
            <Pressable
              style={[styles.button, loading && { opacity: 0.7 }, isRtl && styles.rtlRow]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1E2433" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={22} color="#1E2433" />
                  <Text style={styles.buttonText}>{t.declareBtn}</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Shell ── */
  container: { flex: 1, backgroundColor: '#001f3f' },

  /* ── Header ── */
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
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },

  /* ── Scroll ── */
  content: { paddingHorizontal: 10, paddingVertical: 12 },

  /* ── Card ── */
  card: {
    backgroundColor: '#F2F5FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  cardTitle:    { color: '#12335E', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { color: '#8A93A3', fontSize: 15, marginBottom: 16 },

  /* ── Error ── */
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF2F0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFCCC7',
  },
  errorText: { color: '#FF4D4F', fontSize: 14, flex: 1, fontWeight: '500' },

  /* ── Labels ── */
  label: { color: '#16375E', fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 4 },

  /* ── Inputs ── */
  input: {
    borderWidth: 1,
    borderColor: '#B8C0CF',
    borderRadius: 18,
    backgroundColor: '#FAF9F1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10,
    color: '#1E2433',
    fontSize: 15,
    height: 40,
  },
  multiline: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  inputWithIcon: {
    borderWidth: 1,
    borderColor: '#B8C0CF',
    borderRadius: 18,
    backgroundColor: '#FAF9F1',
    paddingHorizontal: 14,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputWithIconFilled: {
    borderColor: '#12335E',
    backgroundColor: '#EEF3FF',
  },
  selectText: { flex: 1, color: '#1E2433', fontSize: 15 },
  placeholder: { color: '#6D7890' },
  clearDate: { padding: 4 },

  /* ── Claim type ── */
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#B8C0CF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FAF9F1',
  },
  typeBtnActive:     { borderColor: '#12335E', backgroundColor: '#12335E' },
  typeBtnText:       { color: '#6D7890', fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: '#FFFFFF' },

  /* ── Location row ── */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  locationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#B8C0CF',
    borderRadius: 18,
    backgroundColor: '#FAF9F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#1E2433',
    fontSize: 14,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  gpsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#12335E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#12335E',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  /* ── GPS Badge ── */
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#B8D8F0',
  },
  gpsBadgeText: { flex: 1, color: '#12335E', fontSize: 13, fontWeight: '500' },
  clearGpsBtn:  { padding: 2 },

  /* ── Map ── */
  mapContainer: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#B8C0CF',
  },
  map: { ...StyleSheet.absoluteFillObject },
  coordsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(18, 51, 94, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coordsText: { color: '#FFFFFF', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  /* ── Submit ── */
  button: {
    marginTop: 8,
    borderRadius: 18,
    height: 44,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: { color: '#1E2433', fontWeight: '800', fontSize: 17 },

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

  /* ── RTL ── */
  rtlText:  { writingDirection: 'rtl', textAlign: 'right' },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  rtlRow:   { flexDirection: 'row-reverse' },

  /* ── Photos Upload UI ── */
  photosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F1',
    borderWidth: 1,
    borderColor: '#B8C0CF',
    borderRadius: 14,
    height: 44,
    gap: 6,
  },
  photoActionText: {
    color: '#12335E',
    fontSize: 13,
    fontWeight: '600',
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'visible',
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(255, 77, 79, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
