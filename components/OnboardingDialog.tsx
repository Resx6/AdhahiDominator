import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

const FACEBOOK_URL = 'https://www.facebook.com/YASSERAGN';
const { width, height } = Dimensions.get('window');

interface OnboardingDialogProps {
  visible: boolean;
}

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ visible }) => {
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    // Pulse animation for CTA button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    pulse.start();
    glow.start();
    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [visible]);

  const handleFollow = async () => {
    // Mark done FIRST so a URL error cannot permanently lock the app
    setOnboardingDone(true);
    try {
      const supported = await Linking.canOpenURL(FACEBOOK_URL);
      await Linking.openURL(supported ? FACEBOOK_URL : 'https://facebook.com/YASSERAGN');
    } catch {
      // URL failed — app is already unlocked above
    }
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(15,106,59,0.40)', 'rgba(57,255,143,0.85)'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={80} tint="dark" style={styles.overlay}>
        <View style={styles.dialogWrapper}>
          <Animated.View style={[styles.dialogContainer, { borderColor }]}>
            <LinearGradient
              colors={['#0A1A0E', '#060F0A', '#030806']}
              style={styles.gradient}
            >
              {/* Hero Image */}
              <Image
                source={require('../assets/images/onboarding-hero.png')}
                style={styles.heroImage}
                contentFit="cover"
                transition={200}
              />

              {/* Glow overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(6,15,10,0.90)', '#060F0A']}
                style={styles.heroOverlay}
              />

              <View style={styles.content}>
                {/* Brand header */}
                <View style={styles.logoRow}>
                  <MaterialIcons name="flash-on" size={28} color={Colors.neon} />
                  <Text style={styles.logoText}>ADHAHI DOMINATOR PRO</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>
                  Join the{'\n'}
                  <Text style={styles.titleAccent}>YASSERAGN</Text>
                  {'\n'}Community
                </Text>

                {/* Description */}
                <Text style={styles.description}>
                  Get exclusive updates, new tools, automation scripts, and real-time alerts directly
                  from the developer.
                </Text>

                {/* Features */}
                {[
                  'Free tools & automation updates',
                  'Priority support & beta features',
                  'Adhahi.dz automation news',
                ].map((item, i) => (
                  <View key={i} style={styles.featureRow}>
                    <MaterialIcons name="check-circle" size={16} color={Colors.neon} />
                    <Text style={styles.featureText}>{item}</Text>
                  </View>
                ))}

                {/* CTA Button */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                  <TouchableOpacity style={styles.ctaButton} onPress={handleFollow} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[Colors.primaryLight, Colors.primary, '#0A4A2B']}
                      style={styles.ctaGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialIcons name="thumb-up" size={20} color="#fff" />
                      <Text style={styles.ctaText}>Follow YASSERAGN on Facebook</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <Text style={styles.disclaimer}>
                  You must follow to use this app. This dialog will not appear again.
                </Text>

                {/* Copyright */}
                <View style={styles.copyrightRow}>
                  <MaterialIcons name="code" size={12} color={Colors.textMuted} />
                  <Text style={styles.copyright}>Developed by Aguenana YASSER (YASSERAGN)</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
  },
  dialogWrapper: {
    width: width * 0.92,
    maxWidth: 420,
  },
  dialogContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  gradient: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  heroOverlay: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    height: 80,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.neon,
    letterSpacing: 2,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: '900',
    color: Colors.textPrimary,
    lineHeight: 38,
    marginBottom: Spacing.md,
  },
  titleAccent: {
    color: Colors.neon,
    textShadowColor: 'rgba(57,255,143,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  ctaButton: {
    marginTop: Spacing.lg,
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  copyrightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDim,
  },
  copyright: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
