import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomAlert as Alert } from '@/components/CustomAlert';
import {
  deleteVehicleDocument,
  ensureImagePickerDirectory,
  getVehicleDocuments,
  uploadVehicleDocument,
  VehicleDocType,
  VehicleDocument,
} from '@/lib/api';
import { translations } from '@/lib/i18n';

type Labels = typeof translations['fr']['documents'];

const DOC_TYPES: { type: VehicleDocType; labelKey: keyof Labels; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { type: 'carte_grise', labelKey: 'docCarteGrise', icon: 'card-account-details-outline' },
  { type: 'permis', labelKey: 'docPermis', icon: 'card-account-details-star-outline' },
  { type: 'vignette', labelKey: 'docVignette', icon: 'sticker-check-outline' },
  { type: 'taxe_communale', labelKey: 'docTaxeCommunale', icon: 'bank-outline' },
  { type: 'visite_technique', labelKey: 'docVisiteTechnique', icon: 'car-wrench' },
];

/** Rubrique « Autres documents » : les 5 documents du véhicule du client. */
export function VehicleDocuments({ t, isRtl }: { t: Labels; isRtl: boolean }) {
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<VehicleDocType | null>(null);
  const [preview, setPreview] = useState<VehicleDocument | null>(null);

  const load = useCallback(async () => {
    try {
      setDocs(await getVehicleDocuments());
    } catch (e: any) {
      console.warn('[VehicleDocuments] load:', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickAndUpload = async (type: VehicleDocType, source: 'camera' | 'library') => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('⚠️', t.permissionDenied);
      return;
    }
    await ensureImagePickerDirectory();
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    try {
      setBusyType(type);
      await uploadVehicleDocument(type, asset.uri, contentType, asset.fileName || `${type}.jpg`);
      await load();
      Alert.alert('✅', t.uploadSuccess);
    } catch (e: any) {
      Alert.alert('❌', e?.message || t.uploadError);
    } finally {
      setBusyType(null);
    }
  };

  const chooseSource = (type: VehicleDocType) => {
    Alert.alert(t[DOC_TYPES.find((d) => d.type === type)!.labelKey], undefined, [
      { text: t.takePhoto, onPress: () => pickAndUpload(type, 'camera') },
      { text: t.chooseFromLibrary, onPress: () => pickAndUpload(type, 'library') },
      { text: t.cancel, style: 'cancel' },
    ]);
  };

  const confirmDelete = (doc: VehicleDocument) => {
    Alert.alert(t.deleteDocConfirm, undefined, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.deleteDoc,
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyType(doc.doc_type);
            await deleteVehicleDocument(doc.id);
            await load();
          } catch (e: any) {
            Alert.alert('❌', e?.message || t.uploadError);
          } finally {
            setBusyType(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator color="#F4BA42" size="large" style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.list}>
      <Text style={[styles.hint, isRtl && styles.rtlText]}>{t.vehicleDocsHint}</Text>

      {DOC_TYPES.map(({ type, labelKey, icon }) => {
        const doc = docs.find((d) => d.doc_type === type);
        const busy = busyType === type;
        return (
          <View key={type} style={styles.card}>
            <View style={[styles.row, isRtl && styles.rowReverse]}>
              <Pressable
                style={[styles.thumb, doc && styles.thumbFilled]}
                onPress={() => doc && setPreview(doc)}
                disabled={!doc}
              >
                {doc && doc.content_type.startsWith('image/') ? (
                  <Image source={{ uri: doc.url }} style={styles.thumbImage} />
                ) : (
                  <MaterialCommunityIcons name={icon} size={28} color={doc ? '#52C41A' : '#4A6A8A'} />
                )}
              </Pressable>

              <View style={[styles.info, isRtl && { alignItems: 'flex-end' }]}>
                <Text style={[styles.name, isRtl && styles.rtlText]}>{t[labelKey]}</Text>
                <Text style={[styles.status, { color: doc ? '#52C41A' : '#8899AA' }, isRtl && styles.rtlText]}>
                  {doc ? `${t.uploadedOn} ${doc.uploaded_on}` : t.notUploaded}
                </Text>
              </View>
            </View>

            <View style={[styles.actions, isRtl && styles.rowReverse]}>
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color="#F4BA42" size="small" />
                  <Text style={styles.busyText}>{t.uploading}</Text>
                </View>
              ) : (
                <>
                  <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => chooseSource(type)}>
                    <MaterialCommunityIcons name={doc ? 'camera-retake-outline' : 'camera-plus-outline'} size={17} color="#001026" />
                    <Text style={styles.btnPrimaryText}>{doc ? t.replaceDoc : t.addDoc}</Text>
                  </Pressable>
                  {doc && (
                    <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => confirmDelete(doc)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={17} color="#FF4D4F" />
                      <Text style={styles.btnDangerText}>{t.deleteDoc}</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          {preview && <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" />}
          <MaterialCommunityIcons name="close-circle" size={36} color="#FFFFFF" style={styles.previewClose} />
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  hint: { color: '#8899AA', fontSize: 13, lineHeight: 18, marginBottom: 2 },
  card: {
    backgroundColor: '#071F3D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#123A66',
    padding: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowReverse: { flexDirection: 'row-reverse' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#12233E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbFilled: { borderWidth: 1, borderColor: '#52C41A' },
  thumbImage: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 3 },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnPrimary: { backgroundColor: '#F4BA42' },
  btnPrimaryText: { color: '#001026', fontSize: 13, fontWeight: '700' },
  btnDanger: { borderWidth: 1, borderColor: '#FF4D4F' },
  btnDangerText: { color: '#FF4D4F', fontSize: 13, fontWeight: '700' },
  busy: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 9 },
  busyText: { color: '#F4BA42', fontSize: 13, fontWeight: '600' },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '92%', height: '75%' },
  previewClose: { position: 'absolute', top: 60, right: 20 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
});
