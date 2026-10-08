import { useColorScheme } from 'react-native';

const light = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardAlt: '#F7F7FA',
  text: '#111111',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#16A34A',
  accentSoft: '#DCFCE7',
  danger: '#DC2626',
  gold: '#F59E0B',
  onAccent: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  text: '#F5F5F5',
  muted: '#9CA3AF',
  border: '#2C2C2E',
  accent: '#22C55E',
  accentSoft: '#14361F',
  danger: '#F87171',
  gold: '#FBBF24',
  onAccent: '#FFFFFF',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
