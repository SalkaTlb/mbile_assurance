import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { getLanguage, isArabic, translations } from "@/lib/i18n";

type DashboardItem = {
  key:
    | "assurances"
    | "claims"
    | "documents"
    | "contact"
    | "support"
    | "settings";
  icon:
    | ComponentProps<typeof FontAwesome6>["name"]
    | ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconFamily: "fa" | "mc";
};

const items: DashboardItem[] = [
  { key: "assurances", icon: "id-card", iconFamily: "fa" },
  { key: "claims", icon: "alert-circle-outline", iconFamily: "mc" },
  { key: "documents", icon: "file-document-outline", iconFamily: "mc" },
  { key: "contact", icon: "message-text-outline", iconFamily: "mc" },
  { key: "support", icon: "account", iconFamily: "mc" },
  { key: "settings", icon: "cog", iconFamily: "mc" },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const language = getLanguage(lang);
  const isRtl = isArabic(lang);
  const t = translations[language].dashboard;
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable
          style={styles.profileRow}
          onPress={() =>
            router.push({ pathname: "/profile", params: { lang: language } })
          }
        >
          <View style={styles.profileIconCircle}>
            <MaterialCommunityIcons name="account" size={32} color="#052A63" />
          </View>
        </Pressable>

        <View style={styles.header}>
          <Image
            source={require("@/assets/images/medina_logo_horizontal.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.slogan, isRtl && styles.rtlText]}>
            {t.slogan}
          </Text>
        </View>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={styles.card}
              onPress={() => {
                if (item.key === "assurances") {
                  router.push({
                    pathname: "/insurances",
                    params: { lang: language },
                  });
                }
                if (item.key === "documents") {
                  router.push({
                    pathname: "/documents",
                    params: { lang: language },
                  });
                }
                if (item.key === "claims") {
                  setShowComingSoon(true);
                }
                if (item.key === "contact" || item.key === "support") {
                  router.push({
                    pathname: "/contact",
                    params: { lang: language },
                  });
                }
                if (item.key === "settings") {
                  router.push({
                    pathname: "/profile",
                    params: { lang: language },
                  });
                }
              }}
            >
              {item.iconFamily === "fa" ? (
                <FontAwesome6
                  name={
                    item.icon as ComponentProps<typeof FontAwesome6>["name"]
                  }
                  size={40}
                  color="#F4BA42"
                />
              ) : (
                <MaterialCommunityIcons
                  name={
                    item.icon as ComponentProps<
                      typeof MaterialCommunityIcons
                    >["name"]
                  }
                  size={44}
                  color="#F4BA42"
                />
              )}
              <Text style={[styles.cardLabel, isRtl && styles.rtlText]}>
                {t[item.key]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComingSoon(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowComingSoon(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={36}
                color="#F4BA42"
              />
            </View>
            <Text style={[styles.modalTitle, isRtl && styles.rtlText]}>
              {t.comingSoonTitle}
            </Text>
            <Text style={[styles.modalMessage, isRtl && styles.rtlText]}>
              {t.comingSoonMessage}
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setShowComingSoon(false)}
            >
              <Text style={styles.modalButtonText}>{t.ok}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 10, // Pushed up
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 280,
    height: 104,
  },
  slogan: {
    marginTop: 8,
    color: "#052A63",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15,
  },
  card: {
    width: "46%",
    height: 150,
    backgroundColor: "#052A63",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    // iOS Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Android Shadow
    elevation: 4,
  },
  cardLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
    marginTop: 12,
  },
  rtlText: {
    writingDirection: "rtl",
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // Pushed to the right
    marginBottom: 20,
    gap: 15,
  },
  welcomeText: {
    color: "#F4BA42",
    fontSize: 27, // Slightly reduced to fit better on the right
    fontWeight: "700",
    textAlign: "right",
  },
  profileIconCircle: {
    width: 60, // Enlarged
    height: 60, // Enlarged
    borderRadius: 30,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#052A63",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#052A63",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#052A63",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMessage: {
    color: "#052A63",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#F4BA42",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  modalButtonText: {
    color: "#052A63",
    fontSize: 16,
    fontWeight: "700",
  },
});
