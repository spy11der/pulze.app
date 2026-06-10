export interface AppColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  cardSoft: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSoft: string;
  aqua: string;
  aquaBright: string;
  lime: string;
  amber: string;
  coral: string;
  pink: string;
  quiet: string;
  overlay: string;
  shadow: string;
  tabInactive: string;
  white: string;
  danger: string;
  dangerBg: string;
}

export const DarkColors: AppColors = {
  background: '#060C10',
  surface: '#0B1A22',
  surfaceAlt: '#0F2430',
  card: '#0C1D28',
  cardSoft: '#122C3A',
  border: 'rgba(100, 180, 180, 0.08)',
  borderStrong: 'rgba(100, 180, 180, 0.18)',
  text: '#ECF4F6',
  textMuted: '#7BA3AD',
  textSoft: '#567880',
  aqua: '#1E9E9A',
  aquaBright: '#2BBFBA',
  lime: '#1E9E9A',
  amber: '#E8A840',
  coral: '#E05E54',
  pink: '#C470A0',
  quiet: '#6B8E7B',
  overlay: 'rgba(6, 12, 16, 0.85)',
  shadow: 'rgba(0, 0, 0, 0.40)',
  tabInactive: '#3D5C66',
  white: '#FFFFFF',
  danger: '#E8443A',
  dangerBg: 'rgba(232, 68, 58, 0.08)',
};

export const LightColors: AppColors = {
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F5',
  card: '#E8EEF2',
  cardSoft: '#DEE6EB',
  border: 'rgba(11, 35, 44, 0.06)',
  borderStrong: 'rgba(11, 35, 44, 0.12)',
  text: '#0C1A20',
  textMuted: '#4A6872',
  textSoft: '#6A8892',
  aqua: '#1E9E9A',
  aquaBright: '#2BBFBA',
  lime: '#1E9E9A',
  amber: '#D49A30',
  coral: '#CC463C',
  pink: '#A85E88',
  quiet: '#5C8A6E',
  overlay: 'rgba(246, 248, 250, 0.88)',
  shadow: 'rgba(0, 0, 0, 0.06)',
  tabInactive: '#8EAAB4',
  white: '#FFFFFF',
  danger: '#CC3428',
  dangerBg: 'rgba(204, 52, 40, 0.06)',
};

export const Colors = DarkColors;
export type AppColor = string;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const FontSize = {
  caption: 11,
  small: 12,
  body: 14,
  bodyLarge: 15,
  subtitle: 16,
  title: 18,
  heading: 22,
  display: 28,
} as const;

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};
