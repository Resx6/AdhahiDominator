import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore, Session } from '../../store/useStore';
import { OnboardingDialog } from '../../components/OnboardingDialog';
import { SessionCard } from '../../components/SessionCard';
import { NeonText } from '../../components/NeonText';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { generateUUID } from '../../utils/uuid';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const onboardingDone = useStore((s) => s.onboardingDone);
  const sessions = useStore((s) => s.getAllSessions());
  const addSession = useStore((s) => s.addSession);

  // Only show onboarding after store has hydrated (avoid flash blocking UI)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Give Zustand persist a tick to hydrate from AsyncStorage
    const t = setTimeout(() => setHydrated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const showOnboarding = hydrated && !onboardingDone;

  // FAB pulse — MUST use useRef to avoid recreating Animated.Value every render
  const fabPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [fabPulse]);

  const handleAddSession = useCallback(() => {
    const id = generateUUID();
    const sessionNumber = sessions.length + 1;
    addSession({
      id,
      name: `Session #${sessionNumber}`,
      nin: '',
      cnibe: '',
      phone: '',
      email: '',
      password: '',
      wilayaId: null,
      wilayaName: '',
      communeId: null,
      communeName: '',
      paymentMethod: 'cash',
      acceptedRules: true,
      pollingInterval: 3,
    });
    router.push(`/session/${id}`);
  }, [sessions.length, addSession, router]);

  const renderItem = useCallback(
    ({ item }: { item: Session }) => <SessionCard session={item} />,
    []
  );

  const keyExtractor = useCallback((item: Session) => item.config.id, []);

  const activeCount = sessions.filter(
    (s) =>
      s.runtime.status === 'polling' ||
      s.runtime.status === 'captcha_solving' ||
      s.runtime.status === 'submitting'
  ).length;
  const otpCount = sessions.filter((s) => s.runtime.status === 'otp_required').length;
  const successCount = sessions.filter((s) => s.runtime.status === 'success').length;

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A1A0E', '#060F0A', '#030806']}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <NeonText size={FontSize.xs} style={{ letterSpacing: 3, marginBottom: 2 }}>
            ADHAHI DOMINATOR PRO
          </NeonText>
          <Text style={styles.headerTitle}>Sessions</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="flash-on" size={16} color={Colors.neon} />
          <Text style={styles.headerBadgeText}>
            {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { borderColor: `${Colors.primary}55` }]}>
            <MaterialIcons name="radar" size={13} color={Colors.statusPolling} />
            <Text style={[styles.statText, { color: Colors.statusPolling }]}>
              {activeCount} Active
            </Text>
          </View>
          {otpCount > 0 && (
            <View style={[styles.statChip, { borderColor: `${Colors.warning}55` }]}>
              <MaterialIcons name="sms" size={13} color={Colors.warning} />
              <Text style={[styles.statText, { color: Colors.warning }]}>
                {otpCount} OTP Pending
              </Text>
            </View>
          )}
          {successCount > 0 && (
            <View style={[styles.statChip, { borderColor: `${Colors.success}55` }]}>
              <MaterialIcons name="check-circle" size={13} color={Colors.success} />
              <Text style={[styles.statText, { color: Colors.success }]}>
                {successCount} Done
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Sessions List ──────────────────────────────────────────────────── */}
      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="add-circle-outline" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Sessions Yet</Text>
            <Text style={styles.emptyDesc}>
              Tap the{' '}
              <Text style={{ color: Colors.neon, fontWeight: '700' }}>+</Text>
              {' '}button below to create your first automation session
            </Text>
            {/* Inline shortcut button */}
            <TouchableOpacity style={styles.emptyActionBtn} onPress={handleAddSession}>
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                style={styles.emptyActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyActionText}>Add First Session</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── FAB ────────────────────────────────────────────────────────────── */}
      {/*
        NOTE: The FAB is a simple TouchableOpacity with Animated scale wrapper.
        We do NOT nest overflow:hidden inside Animated.View — that blocks touches
        and clips icon glyphs on Android. Shadow lives on the outer Animated.View,
        the gradient lives inside the TouchableOpacity without overflow:hidden.
      */}
      <Animated.View
        style={[
          styles.fabContainer,
          { bottom: insets.bottom + 76 },
          { transform: [{ scale: fabPulse }] },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddSession}
          activeOpacity={0.82}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Onboarding Dialog (only after store hydrates) ─────────────────── */}
      {hydrated && <OnboardingDialog visible={showOnboarding} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDim,
  },
  headerTitle: {
    fontSize: FontSize.h2,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  headerBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.bgCard,
  },
  statText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  // ── Empty State ──────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'rgba(15,106,59,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBtn: {
    marginTop: Spacing.sm,
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyActionText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  // ── FAB ─────────────────────────────────────────────────────────────────
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    // Shadow on the container (not on overflow:hidden child)
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.70,
    shadowRadius: 24,
    elevation: 20,
  },
  fab: {
    borderRadius: Radius.full,
    // No overflow:hidden here — it clips icon glyphs on Android
  },
  fabGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
