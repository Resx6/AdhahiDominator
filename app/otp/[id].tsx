import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useStore } from '../../store/useStore';
import { verifyOtp, resendOtp, generateCaptcha } from '../../services/api';
import { solveCaptcha } from '../../services/captcha';
import { generateAndSharePDF } from '../../services/pdfGenerator';
import { fireSuccessNotification } from '../../services/notifications';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

const OTP_TIMEOUT_SECONDS = 600; // 10 minutes

export default function OTPScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const session = useStore((s) => s.getSession(id!));
  const updateRuntime = useStore((s) => s.updateRuntime);

  const [otpCode, setOtpCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImageUri, setCaptchaImageUri] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_TIMEOUT_SECONDS);
  const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmRef = useRef<Audio.Sound | null>(null);

  const cfg = session?.config;
  const runtime = session?.runtime;

  // ── Alarm on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    playAlarm();
    return () => {
      stopAlarm();
    };
  }, []);

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!runtime?.otpStartedAt) return;
    const elapsed = Math.floor((Date.now() - runtime.otpStartedAt) / 1000);
    const remaining = Math.max(0, OTP_TIMEOUT_SECONDS - elapsed);
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runtime?.otpStartedAt]);

  // ── Load Captcha on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (id) loadCaptcha();
  }, [id]);

  const playAlarm = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      alarmRef.current = sound;
      setSoundObject(sound);
      setAlarmActive(true);
    } catch {
      // Audio not critical — continue without it
    }
  };

  const stopAlarm = async () => {
    try {
      if (alarmRef.current) {
        await alarmRef.current.stopAsync();
        await alarmRef.current.unloadAsync();
        alarmRef.current = null;
      }
      setAlarmActive(false);
    } catch {
      // ignore
    }
  };

  const loadCaptcha = useCallback(async () => {
    if (!id) return;
    setLoadingCaptcha(true);
    setCaptchaAnswer('');
    try {
      const captcha = await generateCaptcha(id);
      const imageUri = captcha.imageBase64
        ? `data:image/png;base64,${captcha.imageBase64}`
        : captcha.imageUrl ?? '';
      setCaptchaId(captcha.captchaId);
      setCaptchaImageUri(imageUri);

      // Auto-solve
      const solved = await solveCaptcha(captcha.imageBase64 ?? '', captcha.imageUrl);
      if (solved.answer) {
        setCaptchaAnswer(solved.answer);
      }
    } catch {
      setError('Failed to load captcha. Please retry.');
    } finally {
      setLoadingCaptcha(false);
    }
  }, [id]);

  const handleResend = useCallback(async () => {
    if (!cfg || !runtime) return;
    setError('');
    try {
      await resendOtp(id!, runtime.registrationToken, cfg.phone);
      updateRuntime(id!, { otpStartedAt: Date.now() });
      setTimeLeft(OTP_TIMEOUT_SECONDS);
      await loadCaptcha();
    } catch {
      setError('Failed to resend OTP. Please try again.');
    }
  }, [cfg, runtime, id]);

  const handleSubmit = useCallback(async () => {
    if (!cfg || !runtime) return;
    setError('');

    if (otpCode.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }
    if (!captchaAnswer || captchaAnswer.length < 4) {
      setError('Please enter or wait for captcha to be solved');
      return;
    }

    setSubmitting(true);
    updateRuntime(id!, { status: 'otp_verifying', statusMessage: 'Verifying OTP...' });

    try {
      const result = await verifyOtp(id!, {
        token: runtime.registrationToken,
        otpCode,
        captchaId,
        captchaAnswer,
        phone: cfg.phone,
      });

      if (result.success) {
        await stopAlarm();
        updateRuntime(id!, {
          status: 'success',
          statusMessage: 'Registration complete!',
          isRunning: false,
        });
        await fireSuccessNotification(cfg.name);
        setSuccess(true);
      } else {
        setError(result.message ?? 'Verification failed. Check your OTP and captcha.');
        updateRuntime(id!, { status: 'otp_required', statusMessage: 'OTP verification failed' });
        // Reload captcha
        await loadCaptcha();
      }
    } catch (err: any) {
      setError(`Error: ${err?.message ?? 'Unknown error'}`);
      updateRuntime(id!, { status: 'otp_required', statusMessage: 'OTP error' });
      await loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  }, [otpCode, captchaAnswer, captchaId, cfg, runtime, id]);

  const handleExportPDF = useCallback(async () => {
    if (!cfg) return;
    try {
      await generateAndSharePDF(cfg, new Date().toLocaleString('fr-DZ'));
    } catch (e: any) {
      setError(`PDF error: ${e?.message}`);
    }
  }, [cfg]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isExpired = timeLeft === 0;

  if (!cfg || !runtime) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textPrimary }}>Session not found.</Text>
      </View>
    );
  }

  // ── SUCCESS STATE ────────────────────────────────────────────────────────────
  if (success || runtime.status === 'success') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0A1A0E', '#060F0A', '#030806']} style={StyleSheet.absoluteFill} />
        <View style={[styles.center, { gap: Spacing.lg }]}>
          <LinearGradient
            colors={['rgba(22,163,74,0.25)', 'rgba(6,15,10,0.90)']}
            style={styles.successIcon}
          >
            <MaterialIcons name="check-circle" size={80} color={Colors.neon} />
          </LinearGradient>
          <Text style={styles.successTitle}>REGISTERED!</Text>
          <Text style={styles.successSub}>
            Session "{cfg.name}" has been successfully registered on adhahi.dz
          </Text>
          <View style={styles.successDetails}>
            <SuccessRow label="Phone" value={cfg.phone} />
            <SuccessRow label="Wilaya" value={cfg.wilayaName} />
            <SuccessRow label="Commune" value={cfg.communeName} />
          </View>
          <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPDF}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              style={styles.pdfBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="picture-as-pdf" size={18} color="#fff" />
              <Text style={styles.pdfBtnText}>Export PDF Certificate</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/')}>
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── OTP INPUT STATE ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A1A0E', '#060F0A', '#030806']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.alarmBadge}>
              <MaterialIcons name="notifications-active" size={18} color={Colors.warning} />
              <Text style={styles.alarmText}>OTP REQUIRED</Text>
              {alarmActive && (
                <TouchableOpacity onPress={stopAlarm} style={styles.muteBtn}>
                  <MaterialIcons name="volume-off" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sessionName}>{cfg.name}</Text>
            <Text style={styles.phoneSub}>SMS sent to: {cfg.phone}</Text>
          </View>

          {/* Timer */}
          <View style={[styles.timerCard, isExpired && styles.timerExpired]}>
            <MaterialIcons
              name={isExpired ? 'timer-off' : 'timer'}
              size={22}
              color={isExpired ? Colors.warning : timeLeft < 60 ? Colors.warningLight : Colors.neon}
            />
            <Text style={[styles.timerText, isExpired && { color: Colors.warning }, timeLeft < 60 && !isExpired && { color: Colors.warningLight }]}>
              {isExpired ? 'EXPIRED' : formatTime(timeLeft)}
            </Text>
            <Text style={styles.timerSub}>{isExpired ? 'Resend required' : 'remaining'}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>6-DIGIT SMS CODE</Text>
            <View style={styles.otpInputWrapper}>
              <MaterialIcons name="sms" size={18} color={Colors.primary} />
              <TextInput
                style={styles.otpInput}
                value={otpCode}
                onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="_ _ _ _ _ _"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
                autoFocus
              />
              <Text style={styles.otpCount}>{otpCode.length}/6</Text>
            </View>
          </View>

          {/* Captcha */}
          <View style={styles.section}>
            <View style={styles.captchaHeader}>
              <Text style={styles.sectionLabel}>CAPTCHA VERIFICATION</Text>
              <TouchableOpacity onPress={loadCaptcha} style={styles.refreshBtn} disabled={loadingCaptcha}>
                <MaterialIcons
                  name="refresh"
                  size={16}
                  color={loadingCaptcha ? Colors.textDisabled : Colors.neon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.captchaImageContainer}>
              {loadingCaptcha ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : captchaImageUri ? (
                <Image
                  source={{ uri: captchaImageUri }}
                  style={styles.captchaImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.captchaPlaceholder}>
                  <MaterialIcons name="image" size={40} color={Colors.borderSubtle} />
                  <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 6 }}>
                    Tap refresh to load captcha
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <MaterialIcons name="text-fields" size={16} color={Colors.primary} />
              <TextInput
                style={styles.captchaInput}
                value={captchaAnswer}
                onChangeText={setCaptchaAnswer}
                placeholder="Enter captcha text"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="none"
              />
              {captchaAnswer ? (
                <MaterialIcons name="check-circle" size={16} color={Colors.success} />
              ) : null}
            </View>

            {captchaAnswer ? (
              <Text style={styles.autoSolvedText}>
                <MaterialIcons name="auto-fix-high" size={11} color={Colors.primary} /> Auto-solved: "{captchaAnswer}"
              </Text>
            ) : null}
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error" size={16} color={Colors.warningLight} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting || isExpired}
          >
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary, '#0A4A2B']}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialIcons name="verified" size={18} color="#fff" />
              )}
              <Text style={styles.submitBtnText}>
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} onPress={handleResend}>
            <MaterialIcons name="refresh" size={16} color={Colors.textMuted} />
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to Dashboard</Text>
          </TouchableOpacity>

          {/* Copyright */}
          <Text style={styles.copyright}>Adhahi Dominator Pro — Aguenana YASSERAGN</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const SuccessRow = ({ label, value }: { label: string; value: string }) => (
  <View style={successStyles.row}>
    <Text style={successStyles.label}>{label}</Text>
    <Text style={successStyles.value}>{value}</Text>
  </View>
);

const successStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  label: { fontSize: FontSize.sm, color: Colors.textMuted },
  value: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  content: { paddingHorizontal: Spacing.md },
  header: { marginBottom: Spacing.lg, alignItems: 'center', gap: 6 },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(185,28,28,0.15)',
    borderWidth: 1,
    borderColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
  },
  alarmText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.warning, letterSpacing: 2 },
  muteBtn: { padding: 2, borderRadius: 4 },
  sessionName: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  phoneSub: { fontSize: FontSize.sm, color: Colors.textMuted },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGlow,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  timerExpired: {
    borderColor: Colors.warning,
    shadowColor: Colors.warning,
    shadowOpacity: 0.5,
  },
  timerText: {
    fontSize: FontSize.hero,
    fontWeight: '900',
    color: Colors.neon,
    includeFontPadding: false,
    textShadowColor: Colors.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    letterSpacing: 2,
  },
  timerSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderGlow,
    paddingHorizontal: Spacing.md,
    height: 64,
    gap: 10,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  otpInput: {
    flex: 1,
    fontSize: FontSize.h2,
    fontWeight: '900',
    color: Colors.neon,
    letterSpacing: 12,
    includeFontPadding: false,
    textShadowColor: Colors.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  otpCount: { fontSize: FontSize.xs, color: Colors.textDisabled },
  captchaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  refreshBtn: { padding: 4 },
  captchaImageContainer: {
    height: 100,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  captchaImage: { width: '100%', height: '100%' },
  captchaPlaceholder: { alignItems: 'center' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    height: 48,
    gap: 8,
  },
  captchaInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  autoSolvedText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(185,28,28,0.12)',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { flex: 1, fontSize: FontSize.xs, color: Colors.warningLight },
  submitBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 18,
    elevation: 14,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: Spacing.sm,
  },
  resendText: { fontSize: FontSize.sm, color: Colors.textMuted },
  backLink: { alignItems: 'center', paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  backLinkText: { fontSize: FontSize.sm, color: Colors.primary },
  copyright: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    marginTop: Spacing.md,
  },
  // Success state
  successIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 20,
  },
  successTitle: {
    fontSize: FontSize.hero,
    fontWeight: '900',
    color: Colors.neon,
    textShadowColor: Colors.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 4,
    includeFontPadding: false,
  },
  successSub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successDetails: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: 0,
  },
  pdfBtn: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  pdfBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  pdfBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  backBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
