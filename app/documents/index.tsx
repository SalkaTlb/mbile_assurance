import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  Alert as RNAlert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { CustomAlert as Alert } from "@/components/CustomAlert";

import {
  addPersonalDocument,
  deletePersonalDocument,
  ensureImagePickerDirectory,
  getClaimReceipt,
  getGedDataPdf,
  getMyClaims,
  getMyInsurances,
  getPersonalDocuments,
  PersonalDocument,
  uploadPersonalFileToS3,
} from "@/lib/api";
import { generateAttestationHtml } from "@/lib/attestationTemplate";
import { generateClaimReceiptHtml } from "@/lib/claimReceiptTemplate";
import { getLanguage, isArabic, translations } from "@/lib/i18n";
import { uploadToS3 } from "@/lib/s3Upload";

// ─── Types ────────────────────────────────────────────────────────────────────
type DocCategory = "all" | "attestation" | "sinistre" | "personal";
type DocStatus = "valid" | "expired";

interface InsuranceDocument {
  id: string; // e.g. ins_12, claim_3 or perso_1710000000000
  name: string;
  category: DocCategory;
  issuedOn: string;
  status: DocStatus;
  insuranceId?: number;
  insuranceNumber?: string;
  matricule?: string;
  claimId?: number;
  claimNumber?: string;
  // Documents personnels (importés depuis l'appareil)
  personalId?: number; // id de l'enregistrement côté Odoo
  url?: string; // URL S3 du fichier
  mimeType?: string;
}

// ─── Documents personnels : stockés sur S3 ────────────────────────────────────
const personalToDoc = (p: PersonalDocument): InsuranceDocument => ({
  id: `perso_${p.id}`,
  name: p.name,
  category: "personal",
  issuedOn: p.created_on || "",
  status: "valid",
  personalId: p.id,
  url: p.url,
  mimeType: p.mime_type,
});

const isImageMime = (m?: string) => !!m && m.startsWith("image/");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

// ─── Document Card (Voir + Partager + Supprimer pour les docs perso) ──────────
function DocumentCard({
  doc,
  t,
  isRtl,
  onView,
  onShare,
  onDelete,
  isGenerating,
}: {
  doc: InsuranceDocument;
  t: (typeof translations)["fr"]["documents"];
  isRtl: boolean;
  onView: () => void;
  onShare: () => void;
  onDelete: () => void;
  isGenerating: boolean;
}) {
  const isExpired = doc.status === "expired";
  const isClaim = doc.category === "sinistre";
  const isPersonal = doc.category === "personal";
  const isImg = isImageMime(doc.mimeType);

  const iconName = isPersonal
    ? isImg
      ? "file-image"
      : "file-document-outline"
    : isClaim
      ? "car-emergency"
      : "file-pdf-box";
  const iconColor = isPersonal ? "#7C5CFF" : isClaim ? "#FA8C16" : "#E8533A";
  const iconBg = isPersonal ? "#1E1A3A" : isClaim ? "#1A2E1A" : "#12233E";

  const pill = isPersonal
    ? { label: isRtl ? "شخصي" : "Personnel", color: "#7C5CFF" }
    : isClaim
      ? { label: isRtl ? "حادث" : "Sinistre", color: "#FA8C16" }
      : { label: isRtl ? "وثيقة" : "Attestation", color: "#F4BA42" };

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={[styles.cardHeader, isRtl && styles.rowReverse]}>
        <View style={[styles.pdfIconWrap, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={36}
            color={iconColor}
          />
        </View>

        <View style={[styles.cardInfo, isRtl && styles.alignEnd]}>
          <Text
            style={[styles.docName, isRtl && styles.rtlText]}
            numberOfLines={2}
          >
            {doc.name}
          </Text>
          <Text style={[styles.docDate, isRtl && styles.rtlText]}>
            {isPersonal ? (isRtl ? "أضيف في" : "Ajouté le") : t.issuedOn} :{" "}
            {formatDate(doc.issuedOn)}
          </Text>
          {/* Category pill */}
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: pill.color + "22" },
            ]}
          >
            <Text style={[styles.categoryPillText, { color: pill.color }]}>
              {pill.label}
            </Text>
          </View>
        </View>

        {/* Pas de badge de statut pour les documents personnels */}
        {!isPersonal && (
          <View
            style={[
              styles.badge,
              isExpired ? styles.badgeExpired : styles.badgeValid,
            ]}
          >
            <Text style={styles.badgeText}>
              {isExpired ? t.statusExpired : t.statusValid}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Action buttons */}
      <View style={[styles.actionsRow, isRtl && styles.rowReverse]}>
        {isGenerating ? (
          <View style={{ flex: 1, paddingVertical: 10, alignItems: "center" }}>
            <ActivityIndicator color="#F4BA42" size="small" />
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.actionBtn, styles.actionView]}
              onPress={onView}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={17}
                color="#001f3f"
              />
              <Text style={styles.actionViewText}>
                {isRtl ? "عرض" : "Voir"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionShare]}
              onPress={onShare}
            >
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.actionShareText}>
                {isRtl ? "مشاركة" : "Partager"}
              </Text>
            </Pressable>

            {isPersonal && (
              <Pressable
                style={[styles.actionBtn, styles.actionDelete]}
                onPress={onDelete}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={17}
                  color="#FF4D4F"
                />
              </Pressable>
            )}
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

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<DocCategory>("all");
  const [documents, setDocuments] = useState<InsuranceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [addSheet, setAddSheet] = useState(false);
  const [imageDoc, setImageDoc] = useState<{
    uri: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch documents (Insurances + Claims + Personal)
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [insurancesResult, claimsList, personal] = await Promise.all([
        getMyInsurances().catch((err) => {
          console.error("Error fetching insurances:", err);
          return { insurances: [], pendingQuotes: [] };
        }),
        getMyClaims().catch((err) => {
          console.error("Error fetching claims:", err);
          return [];
        }),
        getPersonalDocuments().catch((err) => {
          console.error("Error fetching personal documents:", err);
          return [] as PersonalDocument[];
        }),
      ]);

      // getMyInsurances retourne { insurances, pendingQuotes }
      // Dédoublonnage : le backend peut renvoyer plusieurs fois le même contrat.
      const seen = new Set<string>();
      const insurancesList = (
        (insurancesResult as any)?.insurances ?? []
      ).filter((ins: any) => {
        const key = ins.insurance_number || String(ins.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const formattedInsurances: InsuranceDocument[] = insurancesList.map(
        (ins: any) => ({
          id: `ins_${ins.id}`,
          name: ins.matricule || `N° ${ins.insurance_number}`,
          category: "attestation",
          issuedOn: ins.date_effet,
          status: ins.etat === "expired" ? "expired" : "valid",
          insuranceId: ins.id,
          insuranceNumber: ins.insurance_number,
          matricule: ins.matricule,
        }),
      );

      const formattedClaims: InsuranceDocument[] = claimsList
        .filter((claim) => claim.state === "in_progress")
        .map((claim) => ({
          id: `claim_${claim.claim_id}`,
          name: `Reçu de Dépôt - N° ${claim.claim_number}`,
          category: "sinistre",
          issuedOn: claim.claim_date || "",
          status: "valid",
          claimId: claim.claim_id,
          claimNumber: claim.claim_number,
        }));

      setDocuments([
        ...personal.map(personalToDoc),
        ...formattedInsurances,
        ...formattedClaims,
      ]);
    } catch (error) {
      console.error("Error loading documents list:", error);
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
        activeCategory === "all" || doc.category === activeCategory;
      const query = search.trim().toLowerCase();
      const matchSearch =
        query === "" ||
        doc.name.toLowerCase().includes(query) ||
        (doc.insuranceNumber &&
          doc.insuranceNumber.toLowerCase().includes(query)) ||
        (doc.claimNumber && doc.claimNumber.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [documents, search, activeCategory]);

  // Generate HTML based on document type
  const fetchHtmlForDoc = async (doc: InsuranceDocument): Promise<string> => {
    if (doc.category === "attestation") {
      const res = await getGedDataPdf(doc.insuranceId!);
      if (!res.success || !res.data) {
        throw new Error(
          "Impossible de récupérer les données de l'attestation.",
        );
      }
      return generateAttestationHtml(res.data);
    } else {
      const res = await getClaimReceipt(doc.claimId!);
      if (!res.success || !res.receipt) {
        throw new Error(
          res.msg || "Impossible de récupérer les données du sinistre.",
        );
      }
      return generateClaimReceiptHtml(res.receipt);
    }
  };

  // ── Documents personnels : import / suppression ──────────────────────────────

  const savePersonalFile = async (
    srcUri: string,
    displayName: string,
    mimeType?: string,
  ) => {
    setUploading(true);
    try {
      const safe = displayName.replace(/[^A-Za-z0-9._-]/g, "_");
      const mime = mimeType || "application/octet-stream";
      const info = await FileSystem.getInfoAsync(srcUri);

      // 1. Envoi du fichier vers S3 (URL pré-signée fournie par Odoo)
      const { url, key } = await uploadPersonalFileToS3(
        srcUri,
        `${Date.now()}_${safe}`,
        mime,
      );

      // 2. Enregistrement du lien côté Odoo, rattaché à l'utilisateur
      const saved = await addPersonalDocument({
        name: displayName,
        url,
        s3_key: key,
        mime_type: mime,
        file_size: info.exists && "size" in info ? info.size : 0,
      });
      if (!saved.success || !saved.document) {
        throw new Error(saved.msg || "Impossible d'enregistrer le document.");
      }

      setDocuments((prev) => [personalToDoc(saved.document!), ...prev]);
      setActiveCategory("personal");
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    setAddSheet(false);
    try {
      await ensureImagePickerDirectory();
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "❌",
          isRtl
            ? "يجب السماح بالوصول إلى الكاميرا"
            : "L'accès à la caméra est requis.",
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (res.canceled) return;
      const a = res.assets[0];
      await savePersonalFile(
        a.uri,
        a.fileName || `Photo_${Date.now()}.jpg`,
        a.mimeType || "image/jpeg",
      );
    } catch (e: any) {
      Alert.alert("❌", e?.message || "Erreur lors de la prise de photo.");
    }
  };

  const handlePickGallery = async () => {
    setAddSheet(false);
    try {
      await ensureImagePickerDirectory();
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (res.canceled) return;
      for (const a of res.assets) {
        await savePersonalFile(
          a.uri,
          a.fileName || `Image_${Date.now()}.jpg`,
          a.mimeType || "image/jpeg",
        );
      }
    } catch (e: any) {
      Alert.alert("❌", e?.message || "Erreur lors de l'import.");
    }
  };

  const handlePickFile = async () => {
    setAddSheet(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (res.canceled) return;
      for (const a of res.assets) {
        await savePersonalFile(a.uri, a.name, a.mimeType);
      }
    } catch (e: any) {
      Alert.alert("❌", e?.message || "Erreur lors de l'import.");
    }
  };

  const handleDeletePersonal = (doc: InsuranceDocument) => {
    RNAlert.alert(
      isRtl ? "حذف" : "Supprimer",
      isRtl ? "هل تريد حذف هذه الوثيقة؟" : "Supprimer ce document ?",
      [
        { text: isRtl ? "إلغاء" : "Annuler", style: "cancel" },
        {
          text: isRtl ? "حذف" : "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deletePersonalDocument(doc.personalId!);
              if (!res.success)
                throw new Error(res.msg || "Erreur de suppression.");
              setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            } catch (e: any) {
              Alert.alert("❌", e?.message || "Erreur de suppression.");
            }
          },
        },
      ],
    );
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleView = async (doc: InsuranceDocument) => {
    try {
      setGeneratingId(doc.id);

      // Document personnel : image → visionneuse interne, sinon feuille système
      if (doc.category === "personal") {
        if (isImageMime(doc.mimeType)) {
          setImageDoc({ uri: doc.url!, name: doc.name });
        } else {
          // PDF / DOCX : affichés dans le même lecteur que les attestations
          setViewDoc({ url: doc.url!, name: doc.name });
        }
        return;
      }

      if (Platform.OS === "web") {
        const html = await fetchHtmlForDoc(doc);
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
        }
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
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
        }
      }
    } catch (error: any) {
      console.error("Error viewing document:", error);
      Alert.alert("❌", error?.message || t.errorView);
    } finally {
      setGeneratingId(null);
    }
  };

  const generatePdfFile = async (
    doc: InsuranceDocument,
  ): Promise<{ uri: string; filename: string; s3Url?: string }> => {
    const html = await fetchHtmlForDoc(doc);
    const sanitizedName =
      doc.category === "attestation"
        ? doc.insuranceNumber?.replace(/\//g, "_") || doc.id
        : doc.claimNumber?.replace(/\//g, "_") || doc.id;

    // L'attestation partagée porte le matricule du véhicule ; sur S3 on garde le
    // n° de police dans le nom pour ne pas écraser l'attestation d'un ancien contrat.
    const plate = doc.matricule?.replace(/[^A-Za-z0-9_-]/g, "");
    const filename =
      doc.category === "attestation"
        ? `${plate || `Attestation_${sanitizedName}`}.pdf`
        : `Recu_Sinistre_${sanitizedName}.pdf`;
    const s3Filename =
      doc.category === "attestation" && plate
        ? `${plate}_${sanitizedName}.pdf`
        : filename;

    const { uri } = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
    });

    const destUri =
      (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "") +
      filename;
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
        doc.category as "attestation" | "sinistre",
      );
      if (s3Result.success) {
        s3Url = s3Result.url;
        console.log("[S3] Uploaded:", s3Url);
      } else {
        console.warn("[S3] Upload failed:", s3Result.error);
      }
    } catch (s3Err) {
      console.warn("[S3] Upload exception (non-blocking):", s3Err);
    }

    return { uri: destUri, filename, s3Url };
  };

  const handleShare = async (doc: InsuranceDocument) => {
    try {
      setGeneratingId(doc.id);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("❌", t.shareError);
        return;
      }

      // Document personnel : on partage directement le fichier stocké
      if (doc.category === "personal") {
        // On télécharge d'abord le fichier depuis S3, puis on ouvre la feuille de partage
        const localName = doc.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const dl = await FileSystem.downloadAsync(
          doc.url!,
          (FileSystem.cacheDirectory ?? "") + localName,
        );
        await Sharing.shareAsync(dl.uri, {
          mimeType: doc.mimeType,
          dialogTitle: doc.name,
        });
        return;
      }

      const { uri } = await generatePdfFile(doc);
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: doc.name,
        UTI: "com.adobe.pdf",
      });
    } catch (error: any) {
      console.error("Error sharing document:", error);
      Alert.alert("❌", error?.message || t.shareError);
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
            router.replace({
              pathname: "/dashboard",
              params: { lang: language },
            })
          }
        >
          <MaterialCommunityIcons
            name={isRtl ? "arrow-right" : "arrow-left"}
            size={24}
            color="#FFFFFF"
          />
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
          textAlign={isRtl ? "right" : "left"}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color="#8899AA"
            />
          </Pressable>
        )}
      </View>

      {/* ── Category Tabs ───────────────────────────────────────────────────── */}
      {(() => {
        const allDocs = documents;
        const tabs: {
          key: DocCategory;
          label: string;
          color: string;
          count: number;
        }[] = [
          {
            key: "all",
            label: t.categoryAll,
            color: "#F4BA42",
            count: allDocs.length,
          },
          {
            key: "attestation",
            label: t.categoryAttestations,
            color: "#52C41A",
            count: allDocs.filter((d) => d.category === "attestation").length,
          },
          {
            key: "sinistre",
            label: t.categorySinistres,
            color: "#FA8C16",
            count: allDocs.filter((d) => d.category === "sinistre").length,
          },
          {
            key: "personal",
            label: isRtl ? "وثائقي" : "Mes docs",
            color: "#7C5CFF",
            count: allDocs.filter((d) => d.category === "personal").length,
          },
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
                    active && {
                      backgroundColor: tab.color + "18",
                      borderColor: tab.color,
                    },
                  ]}
                  onPress={() => setActiveCategory(tab.key)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      active && { color: tab.color },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      styles.categoryTabBadge,
                      { backgroundColor: active ? tab.color : "#1E3A5F" },
                    ]}
                  >
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
                onDelete={() => handleDeletePersonal(doc)}
                isGenerating={generatingId === doc.id}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Envoi en cours vers S3 ── */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator color="#F4BA42" size="large" />
          <Text style={styles.uploadingText}>
            {isRtl ? "جارٍ الرفع..." : "Envoi en cours..."}
          </Text>
        </View>
      )}

      {/* ── Bouton flottant "Ajouter" ── */}
      <Pressable style={styles.fab} onPress={() => setAddSheet(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="#001026" />
      </Pressable>

      {/* ── Feuille d'ajout (photo / galerie / fichier) ── */}
      <Modal
        visible={addSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setAddSheet(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setAddSheet(false)}
        >
          <View style={styles.sheet}>
            <Text style={[styles.sheetTitle, isRtl && styles.rtlText]}>
              {isRtl ? "إضافة وثيقة" : "Ajouter un document"}
            </Text>
            {[
              {
                icon: "camera-outline",
                label: isRtl ? "التقاط صورة" : "Prendre une photo",
                onPress: handleTakePhoto,
              },
              {
                icon: "image-multiple-outline",
                label: isRtl ? "من المعرض" : "Choisir dans la galerie",
                onPress: handlePickGallery,
              },
              {
                icon: "file-upload-outline",
                label: isRtl
                  ? "ملف (PDF, DOCX)"
                  : "Importer un fichier (PDF, DOCX)",
                onPress: handlePickFile,
              },
            ].map((o) => (
              <Pressable
                key={o.icon}
                style={[styles.sheetRow, isRtl && styles.rowReverse]}
                onPress={o.onPress}
              >
                <MaterialCommunityIcons
                  name={o.icon as any}
                  size={24}
                  color="#F4BA42"
                />
                <Text style={styles.sheetRowText}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Visionneuse d'image (documents personnels) ── */}
      <Modal
        visible={!!imageDoc}
        animationType="slide"
        onRequestClose={() => setImageDoc(null)}
      >
        <View style={styles.viewerContainer}>
          <View style={[styles.viewerHeader, isRtl && styles.viewerRtlRow]}>
            <Pressable
              style={styles.viewerCloseBtn}
              onPress={() => setImageDoc(null)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {imageDoc?.name}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          {imageDoc && (
            <Image
              source={{ uri: imageDoc.uri }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ── PDF Viewer Modal ── */}
      <Modal
        visible={!!viewDoc}
        animationType="slide"
        onRequestClose={() => setViewDoc(null)}
      >
        <View style={styles.viewerContainer}>
          <View style={[styles.viewerHeader, isRtl && styles.viewerRtlRow]}>
            <Pressable
              style={styles.viewerCloseBtn}
              onPress={() => setViewDoc(null)}
            >
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
                uri:
                  Platform.OS === "android"
                    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(viewDoc.url)}`
                    : viewDoc.url,
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
    backgroundColor: "#001026",
  },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#071F3D",
  },
  backBtn: {
    backgroundColor: "#0B2F57",
    borderColor: "#123A66",
    borderWidth: 1,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  // ── Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#071F3D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#123A66",
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
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 0,
  },
  rtlInput: {
    textAlign: "right",
  },

  // ── Category Tabs
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#1E3A5F",
    backgroundColor: "#071A2F",
    paddingHorizontal: 4,
  },
  categoryTabText: {
    color: "#6E7A8A",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  categoryTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  categoryTabBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },

  // ── Document List
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 16,
  },
  emptyText: {
    color: "#4A6A8A",
    fontSize: 16,
    fontWeight: "500",
  },

  // ── Card
  card: {
    backgroundColor: "#071F3D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#123A66",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  pdfIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#12233E",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  docName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  docDate: {
    color: "#8899AA",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Status badge
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeValid: {
    backgroundColor: "rgba(82, 196, 26, 0.18)",
    borderWidth: 1,
    borderColor: "#52C41A",
  },
  badgeExpired: {
    backgroundColor: "rgba(255, 77, 79, 0.18)",
    borderWidth: 1,
    borderColor: "#FF4D4F",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Divider
  divider: {
    height: 1,
    backgroundColor: "#123A66",
    marginHorizontal: 14,
  },

  // ── Category pill
  categoryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Action buttons row
  actionsRow: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionView: {
    backgroundColor: "#F4BA42",
  },
  actionViewText: {
    color: "#001026",
    fontSize: 13,
    fontWeight: "700",
  },
  actionDownload: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#F4BA42",
  },
  actionDownloadText: {
    color: "#F4BA42",
    fontSize: 13,
    fontWeight: "700",
  },
  actionShare: {
    backgroundColor: "#0B3F7A",
    borderWidth: 1,
    borderColor: "#1A5FAF",
  },
  actionShareText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  actionDelete: {
    flex: 0,
    width: 44,
    borderWidth: 1,
    borderColor: "#FF4D4F",
    backgroundColor: "transparent",
  },

  // ── Bouton flottant + feuille d'ajout
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,16,38,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  uploadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F4BA42",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#071F3D",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 32,
    gap: 6,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#123A66",
  },
  sheetRowText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  // ── RTL
  rtlText: {
    writingDirection: "rtl",
    textAlign: "right",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },

  // ── PDF Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: "#001026",
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#071F3D",
    borderBottomWidth: 1,
    borderBottomColor: "#123A66",
  },
  viewerRtlRow: {
    flexDirection: "row-reverse",
  },
  viewerCloseBtn: {
    backgroundColor: "#0B2F57",
    borderColor: "#123A66",
    borderWidth: 1,
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  viewerWebview: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  viewerLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#001026",
  },
});
