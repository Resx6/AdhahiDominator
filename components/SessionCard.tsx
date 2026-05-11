import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import SliderCompat from './SliderCompat';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Session, useStore } from '../store/useStore';
import { startEngine, stopEngine, isEngineRunning } from '../services/automationEngine';
import { Colors, FontSize, Radius, Spacing, Shadow } from '../constants/theme';

interface SessionCardProps {
  session: Session;
}

const STATUS_CONFIG = {
  idle: { label: 'IDLE', color: Colors.statusIdle, icon: 'pause-circle-outline' as const },
  polling: { label: 'POLLING', color: Colors.statusPolling, icon: 'radar' as const },
  captcha_solving: { label: 'SOLVING CAPTCHA', color: Colors.statusCaptcha, icon: 'psychology' as const },
  submitting: { label: 'SUBMITTING', color: Colors.primaryBright, icon: 'send' as const },
  otp_required: { label: 'OTP REQUIRED', color: Colors.statusOTP, icon: 'sms' as const },
  otp_verifying: { label: 'VERIFYING OTP', color: Colors.statusOTP, icon: 'verified' as const },
  success: { label: 'SUCCESS ✓', color: Colors.statusSuccess, icon: 'check-circle' as const },
  error: { label: 'ERROR', color: Colors.statusError, icon: 'error' as const },
};

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const router = useRouter();
  const updateConfig = useStore((s) => s.updateConfig);
  const removeSession = useStore((s) => s.removeSession);
  const { config, runtime } = session;
  const statusConfig = STATUS_CONFIG[runtime.status] ?? STATUS_CONFIG.idle;
  const isRunning = isEngineRunning(config.id);

  const handleToggle = useCallback(() => {
    if (isRunning || runtime.status === 'polling') {
      stopEngine(config.id);
    } else if (runtime.status !== 'otp_required' && runtime.status !== 'success') {
      if (!config.wilayaId || !config.communeId || config.nin.length !== 18 || config.cnibe.length !== 9) {
        router.push(`/session/${config.id}`);
        return;
      }
      startEngine(config.id);
    }
  }, [config.id, isRunning, runtime.status, config]);

  const handleOTP = useCallback(() => {
    router.push(`/otp/${config.id}`);
  }, [config.id]);

  const handleEdit = useCallback(() => {
    router.push(`/session/${config.id}`);
  }, [config.id]);

  const handleDelete = useCallback(() => {
    stopEngine(config.id);
    removeSession(config.id);
  }, [config.id]);

  const isActive = isRunning || runtime.status === 'polling' || runtime.status === 'captcha_solving' || runtime.status === 'submitting';
  const isOTP = runtime.status === 'otp_required';
  const isSuccess = runtime.status === 'success';
  const showCaptchaPreview =
    (runtime.status === 'captcha_solving' || runtime.status === 'submitting') &&
    !!runtime.captchaImageUri;

  // Pulse animation for captcha scan line
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!showCaptchaPreview) {
      scanAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [showCaptchaPreview]);

  return (
    <View style={[styles.container, isActive && styles.containerActive, isOTP && styles.containerOTP]}>
      <LinearGradient
        colors={
          isOTP
            ? ['rgba(185,28,28,0.18)', 'rgba(6,15,10,0.90)']
            : isSuccess
            ? ['rgba(22,163,74,0.18)', 'rgba(6,15,10,0.90)']
            : isActive
            ? ['rgba(15,106,59,0.20)', 'rgba(6,15,10,0.90)']
            : ['rgba(10,20,14,0.60)', 'rgba(6,15,10,0.90)']
        }
        style={styles.gradient}
      >
        {/* Header Row */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialIcons
              name={statusConfig.icon}
              size={18}
              color={statusConfig.color}
            />
            <Text style={styles.sessionName} numberOfLines={1}>
              {config.name}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            {!isActive && !isOTP && !isSuccess && (
              <TouchableOpacity onPress={handleEdit} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="edit" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="delete-outline" size={16} color={Colors.warning} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={13} color={Colors.textMuted} />
          <Text style={styles.locationText}>
            {config.wilayaName || 'No Wilaya'} › {config.communeName || 'No Commune'}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}22`, borderColor: `${statusConfig.color}55` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
          {runtime.retryCount > 0 && (
            <Text style={styles.retryText}> (retry #{runtime.retryCount})</Text>
          )}
        </View>

        {/* Status Message */}
        {!!runtime.statusMessage && (
          <Text style={styles.statusMessage} numberOfLines={2}>
            {runtime.statusMessage}
          </Text>
        )}

        {/* ── Captcha Preview ─────────────────────────────────────────── */}
        {showCaptchaPreview && (
          <View style={styles.captchaPreviewContainer}>
            {/* Label row */}
            <View style={styles.captchaLabelRow}>
              <MaterialIcons name="image-search" size={13} color={Colors.statusCaptcha} />
              <Text style={styles.captchaLabel}>CAPTCHA DETECTED</Text>
              {runtime.status === 'submitting' && (
                <View style={styles.submittingBadge}>
                  <Text style={styles.submittingBadgeText}>SUBMITTING</Text>
                </View>
              )}
            </View>

            <View style={styles.captchaRow}>
              {/* Image thumbnail */}
              <View style={styles.captchaImageWrapper}>
                <Image
                  source={{ uri: runtime.captchaImageUri }}
                  style={styles.captchaImage}
                  contentFit="contain"
                  transition={150}
                />
                {/* Animated neon scan line */}
                <Animated.View
                  style={[
                    styles.captchaScanLine,
                    {
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 64],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                {/* Corner brackets */}
                <View style={[styles.cornerBracket, styles.cornerTL]} />
                <View style={[styles.cornerBracket, styles.cornerTR]} />
                <View style={[styles.cornerBracket, styles.cornerBL]} />
                <View style={[styles.cornerBracket, styles.cornerBR]} />
              </View>

              {/* Solved answer panel */}
              <View style={styles.captchaAnswerPanel}>
                <Text style={styles.captchaAnswerLabel}>OCR RESULT</Text>
                {runtime.captchaAnswer ? (
                  <>
                    <Text style={styles.captchaAnswerText}>{runtime.captchaAnswer}</Text>
                    <View style={styles.captchaConfRow}>
                      <MaterialIcons name="check-circle" size={11} color={Colors.neon} />
                      <Text style={styles.captchaConfText}>Auto-solved</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.captchaAnswerEmpty}>Solving…</Text>
                    <View style={styles.captchaConfRow}>
                      <MaterialIcons name="hourglass-top" size={11} color={Colors.statusCaptcha} />
                      <Text style={[styles.captchaConfText, { color: Colors.statusCaptcha }]}>
                        Processing
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Polling Interval Slider */}
        {!isActive && !isOTP && !isSuccess && (
          <View style={styles.sliderSection}>
            <View style={styles.sliderLabelRow}>
              <MaterialIcons name="timer" size={13} color={Colors.textMuted} />
              <Text style={styles.sliderLabel}>Interval: {config.pollingInterval}s</Text>
            </View>
            <SliderCompat
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={config.pollingInterval}
              onValueChange={(v) => updateConfig(config.id, { pollingInterval: v })}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.borderDim}
              thumbTintColor={Colors.neon}
            />
            <View style={styles.sliderRangeRow}>
              <Text style={styles.sliderRange}>1s</Text>
              <Text style={styles.sliderRange}>10s</Text>
            </View>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.footerRow}>
          {isOTP ? (
            <TouchableOpacity style={[styles.actionBtn, styles.otpBtn]} onPress={handleOTP}>
              <MaterialIcons name="sms" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Enter OTP Now</Text>
            </TouchableOpacity>
          ) : isSuccess ? (
            <View style={[styles.actionBtn, styles.successBtn]}>
              <MaterialIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Registered!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, isActive ? styles.stopBtn : styles.startBtn]}
              onPress={handleToggle}
            >
              <MaterialIcons name={isActive ? 'stop' : 'play-arrow'} size={18} color="#fff" />
              <Text style={styles.actionBtnText}>{isActive ? 'Stop' : 'Start Engine'}</Text>
            </TouchableOpacity>
          )}

          {runtime.lastPolledAt ? (
            <Text style={styles.lastPolled}>
              Last: {new Date(runtime.lastPolledAt).toLocaleTimeString()}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
    ...Shadow.glowWeak,
  },
  containerActive: {
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 14,
  },
  containerOTP: {
    borderColor: Colors.warning,
    shadowColor: Colors.warning,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  gradient: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sessionName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  locationText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
    marginBottom: Spacing.xs,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  retryText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusMessage: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  sliderSection: {
    marginBottom: Spacing.sm,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  sliderLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  slider: {
    height: 32,
    marginHorizontal: -4,
  },
  sliderRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderRange: {
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  stopBtn: {
    backgroundColor: Colors.warning,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  otpBtn: {
    backgroundColor: Colors.warning,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 14,
  },
  successBtn: {
    backgroundColor: Colors.success,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  lastPolled: {
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
  },

  // ── Captcha Preview ────────────────────────────────────────────────────────
  captchaPreviewContainer: {
    backgroundColor: 'rgba(57,255,143,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,143,0.20)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  captchaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  captchaLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.statusCaptcha,
    letterSpacing: 1.5,
    flex: 1,
  },
  submittingBadge: {
    backgroundColor: 'rgba(99,232,176,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.neon,
  },
  submittingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.neon,
    letterSpacing: 1,
  },
  captchaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  captchaImageWrapper: {
    width: 100,
    height: 66,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(57,255,143,0.30)',
    position: 'relative',
  },
  captchaImage: {
    width: '100%',
    height: '100%',
  },
  captchaScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.neon,
    opacity: 0.65,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  cornerBracket: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderColor: Colors.neon,
  },
  cornerTL: { top: 2, left: 2, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 2, right: 2, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 2, left: 2, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 2, right: 2, borderBottomWidth: 2, borderRightWidth: 2 },
  captchaAnswerPanel: {
    flex: 1,
    paddingLeft: 4,
  },
  captchaAnswerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textDisabled,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  captchaAnswerText: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.neon,
    letterSpacing: 4,
    textShadowColor: 'rgba(57,255,143,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    includeFontPadding: false,
  },
  captchaAnswerEmpty: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.statusCaptcha,
    letterSpacing: 2,
    includeFontPadding: false,
  },
  captchaConfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  captchaConfText: {
    fontSize: 10,
    color: Colors.neon,
    fontWeight: '600',
  },
});
