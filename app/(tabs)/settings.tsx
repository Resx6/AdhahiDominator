import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useStore } from '../../store/useStore';
import { NeonText } from '../../components/NeonText';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { unregisterBackgroundTask, registerBackgroundTask } from '../../services/backgroundTask';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const sessions = useStore((s) => s.getAllSessions());
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Sessions',
      'This will permanently delete all sessions and their data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            sessions.forEach((s) => useStore.getState().removeSession(s.config.id));
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    setOnboardingDone(false);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A1A0E', '#060F0A', '#030806']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <NeonText size={FontSize.xs} style={{ letterSpacing: 3, marginBottom: 4 }}>
          ADHAHI DOMINATOR PRO
        </NeonText>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Developer Card */}
        <View style={styles.devCardOuter}>
          <LinearGradient
            colors={['#0F6A3B', '#0A4A2B', '#060F0A']}
            style={styles.devCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BlurView intensity={10} tint="dark" style={styles.devCardInner}>
              {/* Glow top line */}
              <View style={styles.devCardGlowLine} />

              <View style={styles.devAvatarRow}>
                <LinearGradient
                  colors={['#39FF8F', '#0F6A3B']}
                  style={styles.devAvatar}
                >
                  <Text style={styles.devAvatarText}>Y</Text>
                </LinearGradient>
                <View style={styles.devInfo}>
                  <Text style={styles.devName}>Aguenana YASSER</Text>
                  <Text style={styles.devHandle}>@YASSERAGN</Text>
                </View>
                <View style={styles.devBadge}>
                  <MaterialIcons name="verified" size={14} color={Colors.neon} />
                  <Text style={styles.devBadgeText}>DEV</Text>
                </View>
              </View>

              <View style={styles.devDivider} />

              <Text style={styles.devTagline}>
                "Automating the future, one byte at a time."
              </Text>

              <View style={styles.devStats}>
                <View style={styles.devStat}>
                  <Text style={styles.devStatValue}>v2.0</Text>
                  <Text style={styles.devStatLabel}>Version</Text>
                </View>
                <View style={styles.devStatDivider} />
                <View style={styles.devStat}>
                  <Text style={styles.devStatValue}>{sessions.length}</Text>
                  <Text style={styles.devStatLabel}>Sessions</Text>
                </View>
                <View style={styles.devStatDivider} />
                <View style={styles.devStat}>
                  <Text style={styles.devStatValue}>DZ</Text>
                  <Text style={styles.devStatLabel}>Algeria</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.fbButton}
                onPress={() => Linking.openURL('https://www.facebook.com/YASSERAGN')}
                activeOpacity={0.85}
              >
                <MaterialIcons name="thumb-up" size={15} color="#fff" />
                <Text style={styles.fbButtonText}>Follow on Facebook</Text>
              </TouchableOpacity>

              <Text style={styles.devCopyright}>
                © 2024 Aguenana YASSER (YASSERAGN). All rights reserved.{'\n'}
                Developed for the Algerian community.
              </Text>
            </BlurView>
          </LinearGradient>
        </View>

        {/* App Info */}
        <Text style={styles.sectionTitle}>App Information</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'App Name', value: 'Adhahi Dominator Pro', icon: 'flash-on' as const },
            { label: 'Version', value: '2.0.0', icon: 'info' as const },
            { label: 'Platform', value: 'iOS / Android', icon: 'devices' as const },
            { label: 'Target', value: 'adhahi.dz', icon: 'language' as const },
            { label: 'Max Sessions', value: 'Unlimited', icon: 'layers' as const },
          ].map((item, i) => (
            <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
              <MaterialIcons name={item.icon} size={16} color={Colors.primary} />
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={async () => {
            await unregisterBackgroundTask();
            await registerBackgroundTask();
            Alert.alert('Background Task', 'Background polling task re-registered successfully.');
          }}>
            <MaterialIcons name="loop" size={18} color={Colors.info} />
            <Text style={styles.actionText}>Re-register Background Task</Text>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.actionRowBorder]} onPress={handleResetOnboarding}>
            <MaterialIcons name="refresh" size={18} color={Colors.textMuted} />
            <Text style={styles.actionText}>Reset Onboarding Dialog</Text>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.actionRowBorder]} onPress={handleClearAll}>
            <MaterialIcons name="delete-sweep" size={18} color={Colors.warning} />
            <Text style={[styles.actionText, { color: Colors.warning }]}>Clear All Sessions</Text>
            <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Adhahi Dominator Pro is an independent tool not affiliated with or endorsed by the official adhahi.dz platform.
          </Text>
          <Text style={styles.footerCopyright}>
            Made with ❤️ by Aguenana YASSER (YASSERAGN)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.md },
  pageTitle: {
    fontSize: FontSize.h2,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    includeFontPadding: false,
  },
  devCardOuter: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.borderGlow,
    marginBottom: Spacing.xl,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  devCardGradient: { borderRadius: Radius.xl },
  devCardInner: { padding: Spacing.lg, borderRadius: Radius.xl },
  devCardGlowLine: {
    height: 2,
    backgroundColor: Colors.neon,
    borderRadius: 1,
    marginBottom: Spacing.md,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  devAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  devAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAvatarText: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: '#060F0A',
  },
  devInfo: { flex: 1 },
  devName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  devHandle: {
    fontSize: FontSize.sm,
    color: Colors.neon,
    fontWeight: '600',
    textShadowColor: 'rgba(57,255,143,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(57,255,143,0.12)',
    borderWidth: 1,
    borderColor: Colors.neon,
  },
  devBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.neon,
    letterSpacing: 1,
  },
  devDivider: {
    height: 1,
    backgroundColor: Colors.borderDim,
    marginVertical: Spacing.md,
  },
  devTagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  devStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  devStat: { alignItems: 'center' },
  devStatValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.neon,
    textShadowColor: 'rgba(57,255,143,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    includeFontPadding: false,
  },
  devStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  devStatDivider: { width: 1, backgroundColor: Colors.borderDim },
  fbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 8,
  },
  fbButtonText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  devCopyright: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  infoCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.bgCard,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderDim },
  infoLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  actionsCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.bgCard,
    marginBottom: Spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  actionRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderDim },
  actionText: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary },
  footer: {
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDim,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 17,
  },
  footerCopyright: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
});
