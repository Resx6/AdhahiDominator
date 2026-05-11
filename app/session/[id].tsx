import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore, PaymentMethod, SessionConfig } from '../../store/useStore';
import { fetchWilayas, fetchCommunes } from '../../services/api';
import { WILAYAS_FALLBACK, Wilaya } from '../../constants/wilayas';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

interface Commune {
  id: number;
  name: string;
  nameAr?: string;
}

export default function SessionConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const session = useStore((s) => s.getSession(id!));
  const updateConfig = useStore((s) => s.updateConfig);

  const [wilayas, setWilayas] = useState<Wilaya[]>(WILAYAS_FALLBACK);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [loadingWilayas, setLoadingWilayas] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWilayaPicker, setShowWilayaPicker] = useState(false);
  const [showCommunePicker, setShowCommunePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cfg = session?.config;

  useEffect(() => {
    if (!id) return;
    loadWilayas();
  }, [id]);

  useEffect(() => {
    if (cfg?.wilayaId) {
      loadCommunes(cfg.wilayaId);
    }
  }, [cfg?.wilayaId]);

  const loadWilayas = async () => {
    setLoadingWilayas(true);
    try {
      const data = await fetchWilayas(id!);
      if (Array.isArray(data) && data.length > 0) setWilayas(data);
    } catch {
      // fall back to static list
    } finally {
      setLoadingWilayas(false);
    }
  };

  const loadCommunes = async (wilayaId: number) => {
    setLoadingCommunes(true);
    setCommunes([]);
    try {
      const data = await fetchCommunes(id!, wilayaId);
      if (Array.isArray(data)) setCommunes(data);
    } catch {
      setCommunes([]);
    } finally {
      setLoadingCommunes(false);
    }
  };

  const update = useCallback(
    (field: keyof SessionConfig, value: SessionConfig[keyof SessionConfig]) => {
      updateConfig(id!, { [field]: value } as Partial<SessionConfig>);
      setErrors((e) => {
        if (!e[field as string]) return e;
        const n = { ...e };
        delete n[field as string];
        return n;
      });
    },
    [id, updateConfig]
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!cfg?.nin || cfg.nin.length !== 18) e.nin = 'NIN must be exactly 18 digits';
    else if (!/^\d{18}$/.test(cfg.nin)) e.nin = 'NIN must contain only digits';
    if (!cfg?.cnibe || cfg.cnibe.length !== 9) e.cnibe = 'CNIBE must be exactly 9 digits';
    else if (!/^\d{9}$/.test(cfg.cnibe)) e.cnibe = 'CNIBE must contain only digits';
    if (!cfg?.phone) e.phone = 'Phone number is required';
    else if (!/^(05|06|07)\d{8}$/.test(cfg.phone)) e.phone = 'Invalid Algerian phone number';
    if (!cfg?.password || cfg.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!cfg?.wilayaId) e.wilaya = 'Please select a Wilaya';
    if (!cfg?.communeId) e.commune = 'Please select a Commune';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) router.back();
  };

  if (!cfg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: Colors.textPrimary }}>Session not found.</Text>
      </View>
    );
  }

  const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: any }[] = [
    { key: 'cash', label: 'Cash (Espèces)', icon: 'payments' },
    { key: 'pos', label: 'POS Terminal', icon: 'credit-card' },
    { key: 'online', label: 'Online Payment', icon: 'language' },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A1A0E', '#060F0A', '#030806']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* ─── Header ─────────────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={Colors.neon} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Configure Session</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{cfg.name}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Session Name ────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SESSION NAME</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="label" size={16} color={Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={cfg.name}
                onChangeText={(v) => update('name', v)}
                placeholder="e.g. My Main Session"
                placeholderTextColor={Colors.textDisabled}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* ─── Identity ───────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>IDENTITY</Text>
            <FieldInput
              icon="badge"
              label="NIN (18 digits)"
              value={cfg.nin}
              onChangeText={(v) => update('nin', v.replace(/\D/g, '').slice(0, 18))}
              keyboardType="numeric"
              maxLength={18}
              error={errors.nin}
              placeholder="Enter your 18-digit NIN"
            />
            <FieldInput
              icon="credit-card"
              label="CNIBE (9 digits)"
              value={cfg.cnibe}
              onChangeText={(v) => update('cnibe', v.replace(/\D/g, '').slice(0, 9))}
              keyboardType="numeric"
              maxLength={9}
              error={errors.cnibe}
              placeholder="Enter your 9-digit CNIBE"
              style={{ marginTop: 10 }}
            />
          </View>

          {/* ─── Contact ─────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONTACT</Text>
            <FieldInput
              icon="phone"
              label="Mobile Phone"
              value={cfg.phone}
              onChangeText={(v) => update('phone', v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.phone}
              placeholder="05XXXXXXXX"
            />
            <FieldInput
              icon="email"
              label="Email (Optional)"
              value={cfg.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              error={errors.email}
              placeholder="your@email.com"
              style={{ marginTop: 10 }}
            />
          </View>

          {/* ─── Security ────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SECURITY</Text>
            <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
              <MaterialIcons name="lock" size={16} color={Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={cfg.password}
                onChangeText={(v) => update('password', v)}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor={Colors.textDisabled}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={16}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* ─── Location ────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LOCATION</Text>

            {/* Wilaya picker trigger */}
            <TouchableOpacity
              style={[styles.pickerBtn, errors.wilaya ? styles.inputError : null]}
              onPress={() => setShowWilayaPicker((v) => !v)}
            >
              <MaterialIcons name="location-city" size={16} color={Colors.primary} />
              <Text style={[styles.pickerText, !cfg.wilayaId && { color: Colors.textDisabled }]}>
                {cfg.wilayaName || 'Select Wilaya'}
              </Text>
              {loadingWilayas ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialIcons
                  name={showWilayaPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              )}
            </TouchableOpacity>
            {errors.wilaya ? <Text style={styles.errorText}>{errors.wilaya}</Text> : null}

            {showWilayaPicker && (
              <ScrollView
                style={styles.pickerDropdown}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {wilayas.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.pickerOption,
                      cfg.wilayaId === w.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      update('wilayaId', w.id);
                      update('wilayaName', `${w.code} - ${w.name}`);
                      update('communeId', null);
                      update('communeName', '');
                      setShowWilayaPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionCode,
                        cfg.wilayaId === w.id && { color: Colors.neon },
                      ]}
                    >
                      {w.code}
                    </Text>
                    <Text
                      style={[
                        styles.pickerOptionText,
                        cfg.wilayaId === w.id && { color: Colors.textPrimary },
                      ]}
                    >
                      {w.name}
                    </Text>
                    {cfg.wilayaId === w.id && (
                      <MaterialIcons name="check" size={14} color={Colors.neon} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Commune picker (visible only after a wilaya is chosen) */}
            {cfg.wilayaId ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.pickerBtn,
                    { marginTop: 10 },
                    errors.commune ? styles.inputError : null,
                  ]}
                  onPress={() => setShowCommunePicker((v) => !v)}
                >
                  <MaterialIcons name="location-on" size={16} color={Colors.primary} />
                  <Text
                    style={[styles.pickerText, !cfg.communeId && { color: Colors.textDisabled }]}
                  >
                    {cfg.communeName || 'Select Commune'}
                  </Text>
                  {loadingCommunes ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <MaterialIcons
                      name={showCommunePicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
                {errors.commune ? <Text style={styles.errorText}>{errors.commune}</Text> : null}

                {showCommunePicker && (
                  <ScrollView
                    style={styles.pickerDropdown}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {communes.length === 0 ? (
                      <Text style={styles.pickerEmpty}>
                        No communes available — check connection
                      </Text>
                    ) : (
                      communes.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.pickerOption,
                            cfg.communeId === c.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            update('communeId', c.id);
                            update('communeName', c.name);
                            setShowCommunePicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              cfg.communeId === c.id && { color: Colors.textPrimary },
                            ]}
                          >
                            {c.name}
                          </Text>
                          {cfg.communeId === c.id && (
                            <MaterialIcons name="check" size={14} color={Colors.neon} />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}
              </>
            ) : null}
          </View>

          {/* ─── Payment Method ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.paymentOption,
                    cfg.paymentMethod === opt.key && styles.paymentOptionSelected,
                  ]}
                  onPress={() => update('paymentMethod', opt.key)}
                >
                  <MaterialIcons
                    name={opt.icon}
                    size={20}
                    color={cfg.paymentMethod === opt.key ? Colors.neon : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.paymentText,
                      cfg.paymentMethod === opt.key && { color: Colors.neon },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── Legal Checkbox ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => update('acceptedRules', !cfg.acceptedRules)}
          >
            <View style={[styles.checkbox, cfg.acceptedRules && styles.checkboxChecked]}>
              {cfg.acceptedRules ? <MaterialIcons name="check" size={12} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxText}>
              I accept the rules related to Law no. 18-07 on the protection of natural persons in
              the processing of personal data.
            </Text>
          </TouchableOpacity>

          {/* ─── Save ────────────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.saveFullBtn} onPress={handleSave}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary, '#0A4A2B']}
              style={styles.saveFullBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="save" size={18} color="#fff" />
              <Text style={styles.saveFullBtnText}>Save Session</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Reusable field input ─────────────────────────────────────────────────────
interface FieldInputProps {
  icon: any;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  maxLength?: number;
  error?: string;
  placeholder?: string;
  style?: any;
}

const FieldInput: React.FC<FieldInputProps> = ({
  icon,
  value,
  onChangeText,
  keyboardType = 'default',
  maxLength,
  error,
  placeholder,
  style,
}) => (
  <View style={style}>
    <View style={[fieldStyles.inputWrapper, error ? fieldStyles.inputError : null]}>
      <MaterialIcons name={icon} size={16} color={Colors.primary} style={fieldStyles.inputIcon} />
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        keyboardType={keyboardType}
        maxLength={maxLength}
        returnKeyType="next"
        autoCapitalize="none"
      />
      {maxLength ? (
        <Text style={fieldStyles.charCount}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
    {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
  </View>
);

const fieldStyles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  inputError: { borderColor: Colors.warning },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    minWidth: 30,
    textAlign: 'right',
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.warningLight,
    marginTop: 4,
    marginLeft: 4,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
    gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  headerSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  saveBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  inputError: { borderColor: Colors.warning },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  errorText: { fontSize: FontSize.xs, color: Colors.warningLight, marginTop: 4, marginLeft: 4 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  pickerText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  pickerDropdown: {
    backgroundColor: Colors.bgGlass,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    maxHeight: 220,
    marginTop: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  pickerOptionSelected: { backgroundColor: 'rgba(15,106,59,0.20)' },
  pickerOptionCode: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 24,
  },
  pickerOptionText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  pickerEmpty: {
    textAlign: 'center',
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  paymentRow: { gap: Spacing.sm },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.bgCard,
  },
  paymentOptionSelected: {
    borderColor: Colors.neon,
    backgroundColor: 'rgba(57,255,143,0.08)',
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  paymentText: { flex: 1, fontSize: FontSize.base, color: Colors.textSecondary },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.bgCard,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.borderGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  saveFullBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  saveFullBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveFullBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
});
