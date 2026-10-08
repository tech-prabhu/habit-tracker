import { type ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';

import { formatMinutes } from '@/lib/dates';
import { useColors } from '@/lib/theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = { primary: c.accent, secondary: c.cardAlt, danger: c.cardAlt, ghost: 'transparent' }[variant];
  const fg = { primary: c.onAccent, secondary: c.text, danger: c.danger, ghost: c.muted }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.section, { color: c.muted }]}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const c = useColors();
  const tint = color ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? tint : c.border, backgroundColor: selected ? tint + '22' : c.card },
      ]}>
      <Text style={{ color: c.text, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}

/** Steps a time of day (minutes since midnight) in 15/30-minute increments. */
export function TimeStepper({
  value,
  onChange,
  step = 30,
}: {
  value: number;
  onChange: (minutes: number) => void;
  step?: number;
}) {
  const c = useColors();
  const shift = (d: number) => onChange((value + d + 1440) % 1440);
  return (
    <View style={styles.stepper}>
      <StepButton label="−" onPress={() => shift(-step)} />
      <Text style={[styles.stepValue, { color: c.text }]}>{formatMinutes(value)}</Text>
      <StepButton label="+" onPress={() => shift(step)} />
    </View>
  );
}

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const c = useColors();
  return (
    <View style={styles.stepper}>
      <StepButton label="−" onPress={() => onChange(Math.max(min, value - 1))} />
      <Text style={[styles.stepValue, { color: c.text }]}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      <StepButton label="+" onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.stepButton, { backgroundColor: c.cardAlt, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.stepButtonText, { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
        {hint ? <Text style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useColors();
  return (
    <Row label={label} hint={hint}>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent }} />
    </Row>
  );
}

const styles = StyleSheet.create({
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  card: { borderRadius: 18, padding: 16 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginLeft: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepValue: { fontSize: 16, fontWeight: '600', minWidth: 76, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepButtonText: { fontSize: 20, fontWeight: '600', marginTop: -2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
});
