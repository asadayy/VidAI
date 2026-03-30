import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";
import ProtectedRoute from "../../components/ProtectedRoute";
import client from "../../api/client.js";

// ── constants ────────────────────────────────────────────────────────────────

const THEMES = [
  { id: "Modern Minimalist",  icon: "scan-outline",      name: "Modern Minimalist", desc: "Clean lines, simple elegance" },
  { id: "Traditional/Ornate", icon: "business-outline",  name: "Traditional",        desc: "Royal borders, classic fonts" },
  { id: "Floral/Bohemian",    icon: "flower-outline",    name: "Floral / Boho",      desc: "Natural motifs, soft textures" },
  { id: "Whimsical",          icon: "sparkles-outline",  name: "Whimsical",          desc: "Playful fonts, vibrant colors" },
];

const TONES = [
  { id: "Formal",        icon: "ribbon-outline",        name: "Formal",          desc: '"The honour of your presence is requested…"' },
  { id: "Casual/Modern", icon: "wine-outline",          name: "Casual / Modern", desc: '"We\'re getting married! Come celebrate!"' },
  { id: "Poetic",        icon: "document-text-outline", name: "Poetic",          desc: "Short verses and heartfelt emotional quotes" },
];

const STEPS = [
  { n: 1, label: "Essentials" },
  { n: 2, label: "Style" },
  { n: 3, label: "Tone" },
  { n: 4, label: "Result" },
];

const TIME_OPTIONS = [
  "8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM",
  "2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM",
  "5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM",
  "8:00 PM","8:30 PM","9:00 PM","9:30 PM","10:00 PM","10:30 PM",
  "11:00 PM","11:30 PM","12:00 AM",
];

const INIT_FORM = {
  essentials: { names: "", date: "", time: "", venueName: "", venueCity: "" },
  style: { theme: "Modern Minimalist", colorPalette: "Classic Black and White", imagery: "" },
  tone: "Formal",
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Invitation() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INIT_FORM);
  const [loading, setLoading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const fmtDisplayDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === "dismissed" || !selected) return;
    setPickerDate(selected);
    updEss("date", selected.toISOString().split("T")[0]);
  };

  const updEss = (field, value) =>
    setFormData((p) => ({ ...p, essentials: { ...p.essentials, [field]: value } }));
  const updStyle = (field, value) =>
    setFormData((p) => ({ ...p, style: { ...p.style, [field]: value } }));

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const step1Valid =
    formData.essentials.names.trim() &&
    formData.essentials.date.trim() &&
    formData.essentials.venueName.trim();

  // ── generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setLoading(true);
    setImageUri(null);
    try {
      const res = await client.post("/invitations/generate", formData);
      const invData = res.data.data;
      setStep(4);
      Toast.show({ type: "success", text1: "Invitation text generated!" });

      setImageGenerating(true);
      try {
        const imgRes = await client.post("/invitations/generate-image", {
          essentials: formData.essentials,
          style: formData.style,
          tone: formData.tone,
          generatedContent: invData.generatedContent,
        });
        const { imageBase64, mimeType } = imgRes.data.data;
        setImageUri(`data:${mimeType};base64,${imageBase64}`);
        Toast.show({ type: "success", text1: "Invitation image ready!" });
      } catch {
        Toast.show({ type: "error", text1: "Could not generate invitation image." });
      } finally {
        setImageGenerating(false);
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to generate invitation. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // ── save / share ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!imageUri) return;
    setSaving(true);
    try {
      const base64 = imageUri.split(",")[1];
      if (!base64) throw new Error("No image data found.");
      const ext = imageUri.includes("png") ? "png" : "jpg";
      const fileUri = FileSystem.cacheDirectory + `invitation-${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
      });
      // Try MediaLibrary first (works in dev builds); fall back to share sheet in Expo Go
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(fileUri);
          Toast.show({ type: "success", text1: "Saved to Gallery!" });
          return;
        }
      } catch {
        // MediaLibrary unavailable in Expo Go — fall through to share
      }
      // Share sheet: user can tap "Save Image" from here
      await Sharing.shareAsync(fileUri, { mimeType: `image/${ext}`, dialogTitle: "Save Invitation" });
    } catch (err) {
      console.error("Save error:", err);
      Toast.show({ type: "error", text1: "Could not save image.", text2: err?.message || "" });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!imageUri) return;
    try {
      const base64 = imageUri.split(",")[1];
      const ext = imageUri.includes("png") ? "png" : "jpg";
      const fileUri = FileSystem.cacheDirectory + `invitation-share-${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
      });
      await Sharing.shareAsync(fileUri);
    } catch {
      Toast.show({ type: "error", text1: "Could not share image." });
    }
  };

  const handleRestart = () => {
    setStep(1);
    setFormData(INIT_FORM);
    setImageUri(null);
    setImageGenerating(false);
  };

  // ── stepper ───────────────────────────────────────────────────────────────

  const renderStepper = () => (
    <View style={s.stepper}>
      <View style={s.stepperLine} />
      {STEPS.map((st) => {
        const done = step > st.n;
        const active = step === st.n;
        return (
          <View key={st.n} style={s.stepperItem}>
            <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
              {done ? (
                <Ionicons name="checkmark" size={13} color={theme.colors.primary} />
              ) : (
                <Text style={[s.stepDotText, active && s.stepDotTextActive]}>{st.n}</Text>
              )}
            </View>
            <Text style={[s.stepLabel, active && s.stepLabelActive]}>{st.label}</Text>
          </View>
        );
      })}
    </View>
  );

  // ── step 1: essentials ────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View>
      <View style={s.stepHead}>
        <View style={s.stepHeadIcon}>
          <Ionicons name="heart" size={18} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={s.stepTitle}>The Essentials</Text>
          <Text style={s.stepSub}>All the important details for your big day.</Text>
        </View>
      </View>

      <Text style={s.label}>Couple Names *</Text>
      <TextInput
        style={s.input}
        placeholder="e.g., Sarah & Ahmad"
        placeholderTextColor="#94a3b8"
        value={formData.essentials.names}
        onChangeText={(v) => updEss("names", v)}
      />

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Date *</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={formData.essentials.date ? theme.colors.text : "#94a3b8"} />
            <Text style={[s.pickerBtnText, !formData.essentials.date && s.pickerBtnPlaceholder]}>
              {formData.essentials.date ? fmtDisplayDate(formData.essentials.date) : "Pick a date"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Time</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={16} color={formData.essentials.time ? theme.colors.text : "#94a3b8"} />
            <Text style={[s.pickerBtnText, !formData.essentials.time && s.pickerBtnPlaceholder]}>
              {formData.essentials.time || "Pick a time"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.label}>Venue Name *</Text>
      <TextInput
        style={s.input}
        placeholder="e.g., Pearl Continental"
        placeholderTextColor="#94a3b8"
        value={formData.essentials.venueName}
        onChangeText={(v) => updEss("venueName", v)}
      />

      <Text style={s.label}>City</Text>
      <TextInput
        style={s.input}
        placeholder="e.g., Islamabad"
        placeholderTextColor="#94a3b8"
        value={formData.essentials.venueCity}
        onChangeText={(v) => updEss("venueCity", v)}
      />
    </View>
  );

  // ── step 2: style ─────────────────────────────────────────────────────────

  const renderStep2 = () => (
    <View>
      <View style={s.stepHead}>
        <View style={s.stepHeadIcon}>
          <Ionicons name="color-palette" size={18} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={s.stepTitle}>The Style</Text>
          <Text style={s.stepSub}>Define the visual vibe of your card.</Text>
        </View>
      </View>

      <Text style={s.label}>Theme</Text>
      <View style={s.themeGrid}>
        {THEMES.map((t) => {
          const sel = formData.style.theme === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[s.themeCard, sel && s.themeCardSel]}
              onPress={() => updStyle("theme", t.id)}
            >
              <Ionicons name={t.icon} size={20} color={sel ? theme.colors.primary : "#94a3b8"} />
              <Text style={[s.themeName, sel && s.themeNameSel]}>{t.name}</Text>
              <Text style={s.themeDesc}>{t.desc}</Text>
              {sel && (
                <View style={s.themeCheck}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.label}>Color Palette</Text>
      <TextInput
        style={s.input}
        placeholder="e.g., Gold & Navy, Rose Gold, Sage & Pink"
        placeholderTextColor="#94a3b8"
        value={formData.style.colorPalette}
        onChangeText={(v) => updStyle("colorPalette", v)}
      />

      <Text style={s.label}>
        Imagery / Motifs <Text style={s.optional}>(optional)</Text>
      </Text>
      <TextInput
        style={s.input}
        placeholder="e.g., Roses, Minimalist Line Art, Mandala"
        placeholderTextColor="#94a3b8"
        value={formData.style.imagery}
        onChangeText={(v) => updStyle("imagery", v)}
      />
    </View>
  );

  // ── step 3: tone ──────────────────────────────────────────────────────────

  const renderStep3 = () => (
    <View>
      <View style={s.stepHead}>
        <View style={s.stepHeadIcon}>
          <Ionicons name="document-text" size={18} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={s.stepTitle}>Tone of Voice</Text>
          <Text style={s.stepSub}>How should your invitation sound?</Text>
        </View>
      </View>

      {TONES.map((t) => {
        const sel = formData.tone === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={[s.toneCard, sel && s.toneCardSel]}
            onPress={() => setFormData((p) => ({ ...p, tone: t.id }))}
          >
            <View style={[s.toneIconWrap, sel && s.toneIconWrapSel]}>
              <Ionicons name={t.icon} size={18} color={sel ? "#fff" : "#94a3b8"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.toneName, sel && s.toneNameSel]}>{t.name}</Text>
              <Text style={s.toneDesc}>{t.desc}</Text>
            </View>
            <View style={[s.toneRadio, sel && s.toneRadioSel]}>
              {sel && <View style={s.toneRadioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[s.generateBtn, loading && s.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={loading}
      >
        <LinearGradient
          colors={loading ? ["#e2e8f0", "#e2e8f0"] : ["#D7385E", "#B82A4D"]}
          style={s.generateBtnGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator size={18} color="#94a3b8" />
          ) : (
            <Ionicons name="sparkles" size={18} color="#fff" />
          )}
          <Text style={[s.generateBtnText, loading && s.generateBtnTextDisabled]}>
            {loading ? "Crafting your invitation…" : "Generate My Invitation"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      <Text style={s.generateNote}>Powered by Gemini AI · Usually takes 15–30 seconds</Text>
    </View>
  );

  // ── step 4: result ────────────────────────────────────────────────────────

  const renderStep4 = () => (
    <View style={s.resultWrap}>
      <LinearGradient colors={["#D7385E", "#f472b6"]} style={s.resultBadge}>
        <Ionicons name="checkmark" size={26} color="#fff" />
      </LinearGradient>
      <Text style={s.resultTitle}>Your Invitation is Ready!</Text>
      <Text style={s.resultSub}>Crafted by Gemini AI</Text>

      {imageUri ? (
        <View style={s.imgWrap}>
          <Image source={{ uri: imageUri }} style={s.inviteImg} resizeMode="contain" />
          <View style={s.imgActions}>
            <TouchableOpacity
              style={[s.imgActionBtn, saving && s.imgActionBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={["#D7385E", "#B82A4D"]}
                style={s.imgActionBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator size={14} color="#fff" />
                ) : (
                  <Ionicons name="download" size={16} color="#fff" />
                )}
                <Text style={s.imgActionBtnText}>{saving ? "Saving..." : "Save to Gallery"}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.imgShareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
              <Text style={s.imgShareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : imageGenerating ? (
        <View style={s.imgPlaceholder}>
          <ActivityIndicator size={36} color={theme.colors.primary} />
          <Text style={s.imgPlaceholderTitle}>Generating image with Gemini AI…</Text>
          <Text style={s.imgPlaceholderSub}>This may take ~20 seconds</Text>
        </View>
      ) : (
        <View style={s.imgPlaceholder}>
          <Ionicons name="image-outline" size={40} color="#cbd5e1" />
          <Text style={s.imgPlaceholderTitle}>Image will appear here</Text>
        </View>
      )}

      {!imageGenerating && (
        <TouchableOpacity style={s.regenBtn} onPress={handleRestart}>
          <Ionicons name="refresh" size={15} color={theme.colors.primary} />
          <Text style={s.regenBtnText}>Edit & Regenerate</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── navigation ────────────────────────────────────────────────────────────

  const renderNav = () => {
    if (step === 4) return null;
    return (
      <View style={s.nav}>
        <TouchableOpacity
          style={[s.navBack, step === 1 && s.navBackDisabled]}
          onPress={back}
          disabled={step === 1}
        >
          <Ionicons name="chevron-back" size={16} color={step === 1 ? "#cbd5e1" : theme.colors.text} />
          <Text style={[s.navBackText, step === 1 && s.navBackTextDisabled]}>Back</Text>
        </TouchableOpacity>
        {step < 3 && (
          <TouchableOpacity
            style={[s.navNext, step === 1 && !step1Valid && s.navNextDisabled]}
            onPress={next}
            disabled={step === 1 && !step1Valid}
          >
            <LinearGradient
              colors={step === 1 && !step1Valid ? ["#e2e8f0", "#e2e8f0"] : ["#D7385E", "#B82A4D"]}
              style={s.navNextGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[s.navNextText, step === 1 && !step1Valid && s.navNextTextDisabled]}>
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={step === 1 && !step1Valid ? "#94a3b8" : "#fff"}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute roles="user">
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#f8fafc" }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 30}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.scroll}
        >
          {/* page header */}
          <LinearGradient
            colors={["#D7385E", "#B82A4D"]}
            style={s.pageHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={s.pageHeaderIcon}>
              <Ionicons name="mail" size={22} color="#fff" />
            </View>
            <View>
              <Text style={s.pageHeaderTitle}>Digital Invitation</Text>
              <Text style={s.pageHeaderSub}>AI-powered wedding invitation generator</Text>
            </View>
          </LinearGradient>

          {/* form card */}
          <View style={s.card}>
            {renderStepper()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {renderNav()}
          </View>
        </ScrollView>

        {/* ── Time Picker Modal ── */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <View style={s.timePickerSheet}>
              <View style={s.timePickerHeader}>
                <Text style={s.timePickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Ionicons name="close" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={TIME_OPTIONS}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const sel = formData.essentials.time === item;
                  return (
                    <TouchableOpacity
                      style={[s.timeOption, sel && s.timeOptionSel]}
                      onPress={() => { updEss("time", item); setShowTimePicker(false); }}
                    >
                      <Text style={[s.timeOptionText, sel && s.timeOptionTextSel]}>{item}</Text>
                      {sel && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </ProtectedRoute>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // date / time pickers
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  pickerBtnText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  pickerBtnPlaceholder: {
    color: "#94a3b8",
  },

  // time picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  timePickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 28,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  timeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  timeOptionSel: { backgroundColor: "#fff5f7" },
  timeOptionText: { fontSize: 15, color: theme.colors.text },
  timeOptionTextSel: { color: theme.colors.primary, fontWeight: "600" },

  // header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  pageHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  pageHeaderSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // card
  card: {
    backgroundColor: "#fff",
    margin: 14,
    borderRadius: 20,
    padding: 20,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.07)',
    elevation: 4,
  },

  // stepper
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
    position: "relative",
  },
  stepperLine: {
    position: "absolute",
    top: 16,
    left: "10%",
    right: "10%",
    height: 2,
    backgroundColor: "#f3e4e9",
  },
  stepperItem: { flex: 1, alignItems: "center", gap: 5, zIndex: 1 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3e4e9",
    borderWidth: 2,
    borderColor: "#f3e4e9",
  },
  stepDotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  stepDotDone: { backgroundColor: "#fff", borderColor: theme.colors.primary },
  stepDotText: { fontSize: 12, fontWeight: "700", color: "#c9a0ac" },
  stepDotTextActive: { color: "#fff" },
  stepLabel: { fontSize: 10, color: "#b0a0a5", fontWeight: "500", textAlign: "center" },
  stepLabelActive: { color: theme.colors.primary, fontWeight: "700" },

  // step head
  stepHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#faeaed",
  },
  stepHeadIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fce7f3",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  stepSub: { fontSize: 12, color: "#888", marginTop: 2 },

  // inputs
  label: { fontSize: 12, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 14 },
  optional: { fontSize: 11, fontWeight: "400", color: "#aaa" },
  input: {
    borderWidth: 1.5,
    borderColor: "#e8d5da",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    backgroundColor: "#fffbfc",
  },
  row2: { flexDirection: "row", gap: 10 },

  // theme grid
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  themeCard: {
    width: "47%",
    borderWidth: 2,
    borderColor: "#f0e6ea",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    position: "relative",
  },
  themeCardSel: { borderColor: theme.colors.primary, backgroundColor: "#fff5f7" },
  themeName: { fontSize: 13, fontWeight: "700", color: "#1a1a2e", marginTop: 6 },
  themeNameSel: { color: theme.colors.primary },
  themeDesc: { fontSize: 11, color: "#888", marginTop: 2, lineHeight: 15 },
  themeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // tone cards
  toneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: "#f0e6ea",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  toneCardSel: { borderColor: theme.colors.primary, backgroundColor: "#fff5f7" },
  toneIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3e4e9",
    alignItems: "center",
    justifyContent: "center",
  },
  toneIconWrapSel: { backgroundColor: theme.colors.primary },
  toneName: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  toneNameSel: { color: theme.colors.primary },
  toneDesc: { fontSize: 11, color: "#888", marginTop: 2, lineHeight: 16 },
  toneRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  toneRadioSel: { borderColor: theme.colors.primary },
  toneRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },

  // generate button
  generateBtn: { marginTop: 22, borderRadius: 12, overflow: "hidden" },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
  },
  generateBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  generateBtnTextDisabled: { color: "#94a3b8" },
  generateNote: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 },

  // navigation
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#faeaed",
  },
  navBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  navBackDisabled: { borderColor: "#f1f5f9" },
  navBackText: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  navBackTextDisabled: { color: "#cbd5e1" },
  navNext: { borderRadius: 10, overflow: "hidden" },
  navNextDisabled: {},
  navNextGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  navNextText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  navNextTextDisabled: { color: "#94a3b8" },

  // result
  resultWrap: { alignItems: "center", paddingVertical: 8 },
  resultBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  resultTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a2e", textAlign: "center" },
  resultSub: { fontSize: 13, color: "#94a3b8", marginTop: 4, marginBottom: 20 },

  imgWrap: { width: "100%", alignItems: "center" },
  inviteImg: {
    width: "100%",
    height: 420,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  imgActions: { flexDirection: "row", gap: 10, marginTop: 14, width: "100%" },
  imgActionBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  imgActionBtnDisabled: { opacity: 0.6 },
  imgActionBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
  },
  imgActionBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  imgShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  imgShareBtnText: { fontSize: 14, fontWeight: "600", color: theme.colors.primary },

  imgPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    width: "100%",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e2e8f0",
  },
  imgPlaceholderTitle: { fontSize: 14, fontWeight: "600", color: "#64748b", textAlign: "center" },
  imgPlaceholderSub: { fontSize: 12, color: "#94a3b8", textAlign: "center" },

  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    justifyContent: "center",
    marginTop: 18,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 10,
  },
  regenBtnText: { fontSize: 14, fontWeight: "600", color: theme.colors.primary },
});
