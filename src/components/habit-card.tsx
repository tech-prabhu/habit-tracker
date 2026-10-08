import { useEffect, useRef } from 'react';
import { type GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { ProgressRing } from '@/components/progress-ring';
import { daysAgo, parseDay, WEEKDAY_LETTERS } from '@/lib/dates';
import { type Habit } from '@/lib/model';
import { useColors } from '@/lib/theme';

export function HabitCard({
  habit,
  count,
  streak,
  history,
  onLog,
  onUndo,
  onToggleDay,
  onLongPress,
}: {
  habit: Habit;
  count: number;
  streak: number;
  /** Progress (0..1) for each of the last 7 days, oldest first; last entry is today. */
  history: number[];
  onLog: (e: GestureResponderEvent) => void;
  onUndo: () => void;
  onToggleDay: (day: string) => void;
  onLongPress: () => void;
}) {
  const c = useColors();
  const met = count >= habit.target;
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const wasMet = useRef(met);

  // Bounce and glow when the goal is reached.
  useEffect(() => {
    if (met && !wasMet.current) {
      scale.value = withSequence(withSpring(1.06, { damping: 6, stiffness: 300 }), withSpring(1));
      glow.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 900 }));
    }
    wasMet.current = met;
  }, [met, scale, glow]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.18 }));

  const subtitle =
    habit.kind === 'count'
      ? `${count} / ${habit.target} ${habit.unit}`.trim()
      : met
        ? 'Done for today'
        : 'Tap to check off';

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={onLog}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, ${subtitle}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.card, borderColor: met ? habit.color : 'transparent', opacity: pressed ? 0.9 : 1 },
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.glow, { backgroundColor: habit.color }, glowStyle]}
        />
        <View style={styles.top}>
          <View style={[styles.emojiWrap, { backgroundColor: habit.color + '22' }]}>
            <Text style={styles.emoji}>{habit.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={{ color: c.muted, marginTop: 2 }}>
              {subtitle}
              {streak > 0 ? `  ·  🔥 ${streak}` : ''}
            </Text>
          </View>
          {habit.kind === 'count' && count > 0 && (
            <Pressable
              onPress={onUndo}
              hitSlop={10}
              accessibilityLabel="Undo one"
              style={[styles.undo, { backgroundColor: c.cardAlt }]}>
              <Text style={{ color: c.muted, fontSize: 18, fontWeight: '600' }}>−</Text>
            </Pressable>
          )}
          <ProgressRing progress={count / habit.target} color={habit.color} track={c.border} size={50}>
            {met ? (
              <Text style={[styles.check, { color: habit.color }]}>✓</Text>
            ) : habit.kind === 'count' ? (
              <Text style={[styles.ringText, { color: c.text }]}>{count}</Text>
            ) : (
              <Text style={[styles.ringText, { color: c.muted }]}>+</Text>
            )}
          </ProgressRing>
        </View>

        <View style={styles.week}>
          {history.map((p, i) => {
            const day = daysAgo(6 - i);
            const isToday = i === 6;
            return (
              <Pressable key={day} onPress={() => onToggleDay(day)} hitSlop={4} style={styles.day}>
                <Text style={[styles.dayLabel, { color: isToday ? c.text : c.muted }]}>
                  {WEEKDAY_LETTERS[parseDay(day).getDay()]}
                </Text>
                <View style={[styles.dot, { backgroundColor: c.border }]}>
                  <View
                    style={[
                      styles.dotFill,
                      { backgroundColor: habit.color, opacity: p >= 1 ? 1 : p > 0 ? 0.35 : 0 },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, gap: 14, borderWidth: 2, overflow: 'hidden' },
  glow: { borderRadius: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  title: { fontSize: 17, fontWeight: '600' },
  undo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 22, fontWeight: '800' },
  ringText: { fontSize: 16, fontWeight: '700' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  dayLabel: { fontSize: 12, fontWeight: '500' },
  dot: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden' },
  dotFill: { flex: 1 },
});
