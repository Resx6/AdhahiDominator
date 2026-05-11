import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Radius, Spacing } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  glowing?: boolean;
  glowColor?: string;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 18,
  glowing = false,
  glowColor = Colors.primary,
  padding = Spacing.md,
}) => {
  return (
    <View
      style={[
        styles.wrapper,
        glowing && {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 20,
          elevation: 14,
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={[styles.blur, { padding }]}>
        {children}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderGlow,
  },
  blur: {
    borderRadius: Radius.lg,
  },
});
