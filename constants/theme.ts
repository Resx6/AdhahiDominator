// Adhahi Dominator Pro — Design System
export const Colors = {
  // Base
  bg: '#060F0A',
  bgDeep: '#030806',
  bgCard: 'rgba(15, 106, 59, 0.10)',
  bgCardHover: 'rgba(15, 106, 59, 0.18)',
  bgGlass: 'rgba(10, 20, 14, 0.65)',
  bgGlassDark: 'rgba(6, 15, 10, 0.80)',

  // Brand
  primary: '#0F6A3B',
  primaryLight: '#1E8A57',
  primaryGlow: 'rgba(15, 106, 59, 0.45)',
  primaryBright: '#22C55E',
  neon: '#39FF8F',

  // Semantic
  warning: '#B91C1C',
  warningLight: '#EF4444',
  warningGlow: 'rgba(185, 28, 28, 0.40)',
  success: '#16A34A',
  successGlow: 'rgba(22, 163, 74, 0.40)',
  info: '#0EA5E9',

  // Text
  textPrimary: '#F0FFF4',
  textSecondary: '#A7F3D0',
  textMuted: '#4B7A63',
  textDisabled: '#2A4A38',

  // Borders
  borderGlow: 'rgba(57, 255, 143, 0.35)',
  borderSubtle: 'rgba(15, 106, 59, 0.25)',
  borderDim: 'rgba(15, 106, 59, 0.12)',

  // Status
  statusIdle: '#4B7A63',
  statusPolling: '#0F6A3B',
  statusCaptcha: '#B45309',
  statusOTP: '#B91C1C',
  statusSuccess: '#16A34A',
  statusError: '#DC2626',

  // Overlays
  overlay: 'rgba(3, 8, 6, 0.88)',
  overlayLight: 'rgba(3, 8, 6, 0.55)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  h2: 28,
  h1: 34,
  hero: 42,
};

export const Shadow = {
  glow: {
    shadowColor: '#39FF8F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 16,
  },
  glowWeak: {
    shadowColor: '#0F6A3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  glowRed: {
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
  },
};
