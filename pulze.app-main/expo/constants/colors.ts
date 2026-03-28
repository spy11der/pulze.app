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
  background: '#041318',
  surface: '#0B232C',
  surfaceAlt: '#11313D',
  card: '#0D2831',
  cardSoft: '#123844',
  border: 'rgba(123, 220, 219, 0.14)',
  borderStrong: 'rgba(123, 220, 219, 0.3)',
  text: '#F4FBFC',
  textMuted: '#86AEB7',
  textSoft: '#5F8893',
  aqua: '#35D4CF',
  aquaBright: '#67F2E5',
  lime: '#A5F05C',
  amber: '#FFBF47',
  coral: '#FF6D5E',
  pink: '#F56AC5',
  quiet: '#7EC8E3',
  overlay: 'rgba(4, 19, 24, 0.72)',
  shadow: 'rgba(0, 0, 0, 0.28)',
  tabInactive: '#5B8792',
  white: '#FFFFFF',
  danger: '#FF4D3A',
  dangerBg: 'rgba(255, 77, 58, 0.1)',
};

export const LightColors: AppColors = {
  background: '#F5F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3F6',
  card: '#E8EFF3',
  cardSoft: '#DDE7EC',
  border: 'rgba(11, 35, 44, 0.1)',
  borderStrong: 'rgba(11, 35, 44, 0.2)',
  text: '#0B1D24',
  textMuted: '#4A6E7A',
  textSoft: '#6E8E99',
  aqua: '#1AA8A3',
  aquaBright: '#17C5BE',
  lime: '#5CA830',
  amber: '#CC8E00',
  coral: '#E05545',
  pink: '#D14FA8',
  quiet: '#5A9CBF',
  overlay: 'rgba(245, 248, 250, 0.85)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  tabInactive: '#8EACB7',
  white: '#FFFFFF',
  danger: '#E0392B',
  dangerBg: 'rgba(224, 57, 43, 0.08)',
};

export const Colors = DarkColors;

export type AppColor = string;
