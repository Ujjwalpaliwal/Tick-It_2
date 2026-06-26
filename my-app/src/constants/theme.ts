/**
 * Tick-It Design System — expanded theme with quadrant colors,
 * semantic tokens, and typography scale.
 */

import '@/global.css';
import { Platform } from 'react-native';

// ─── Quadrant Colors ────────────────────────────────────────────
export const QuadrantColors = {
  doFirst: '#F43F5E', // Cyber Pink-Crimson (Urgent & Important)
  doFirstBg: 'rgba(244, 63, 94, 0.08)',
  schedule: '#06B6D4', // Neon Cyan (Not Urgent & Important)
  scheduleBg: 'rgba(6, 182, 212, 0.08)',
  delegate: '#A855F7', // Royal Amethyst (Urgent & Not Important)
  delegateBg: 'rgba(168, 85, 247, 0.08)',
  eliminate: '#6B7280', // Tech Gray (Not Urgent & Not Important)
  eliminateBg: 'rgba(107, 114, 128, 0.08)',
} as const;

// ─── Semantic Colors ────────────────────────────────────────────
export const Semantic = {
  success: '#10B981', // Emerald
  successBg: 'rgba(16, 185, 129, 0.08)',
  warning: '#F59E0B', // Amber
  warningBg: 'rgba(245, 158, 11, 0.08)',
  danger: '#EF4444', // Red
  dangerBg: 'rgba(239, 68, 68, 0.08)',
  info: '#2563EB', // Royal Blue
  infoBg: 'rgba(37, 99, 235, 0.08)',
  accent: '#7C3AED', // Royal Violet
  accentBg: 'rgba(124, 58, 237, 0.08)',
  xp: '#EC4899', // Cyber Magenta
} as const;

// ─── Core Theme Colors ──────────────────────────────────────────
export const Colors = {
  light: {
    text: '#1E003B', // Deep Imperial Purple
    textSecondary: '#5B21B6', // Royal Violet
    textTertiary: '#8B5CF6', // Bright Violet
    background: '#F8F6FF', // Soft Lavender White
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EDE9FE', // Light Violet Accent
    surface: '#FFFFFF',
    surfaceElevated: '#FCFAFF', // Subtle Lavender Surface
    border: '#D8B4FE', // Soft Neon Violet border
    borderLight: '#F3E8FF',
    tabBar: 'rgba(255, 255, 255, 0.92)',
    tabBarBorder: '#E9D5FF',
    cardShadow: 'rgba(124, 58, 237, 0.04)',
    overlay: 'rgba(30, 0, 59, 0.4)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#C084FC',
    textTertiary: '#8B5CF6',
    background: '#0D081F', // Deep Royal Space
    backgroundElement: '#140E2E',
    backgroundSelected: '#211747',
    surface: '#120C28',
    surfaceElevated: '#1A123A',
    border: '#312E81',
    borderLight: '#1E1B4B',
    tabBar: 'rgba(13, 8, 31, 0.92)',
    tabBarBorder: '#211747',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ─── Typography ─────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'System, sans-serif',
    mono: 'Courier New, monospace',
  },
});

export const Typography = {
  hero: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  bodySmMedium: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
  captionSm: { fontSize: 10, fontWeight: '500' as const, lineHeight: 12 },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.5 },
  number: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38, fontFamily: Fonts?.mono },
  numberSm: { fontSize: 22, fontWeight: '700' as const, lineHeight: 26, fontFamily: Fonts?.mono },
} as const;

// ─── Spacing ────────────────────────────────────────────────────
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

// ─── Radius ─────────────────────────────────────────────────────
export const Radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

// ─── Layout ─────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
