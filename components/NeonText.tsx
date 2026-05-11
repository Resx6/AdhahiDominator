import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../constants/theme';

interface NeonTextProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
  weight?: TextStyle['fontWeight'];
}

export const NeonText: React.FC<NeonTextProps> = ({
  children,
  size = FontSize.xl,
  color = Colors.neon,
  style,
  weight = '900',
}) => {
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          color,
          fontWeight: weight,
          textShadowColor: color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    letterSpacing: 1,
    includeFontPadding: false,
  },
});
