import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { type Habit, dayKey, daysAgo, streak, useHabits } from '@/lib/habits';

const EMOJIS = ['✅', '💧', '📚', '🏃', '🧘', '🥗', '😴', '✍️'];
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const palette = {
  light: { bg: '#F2F2F7', card: '#FFFFFF', text: '#111111', muted: '#6B7280', border: '#E5E7EB', accent: '#16A34A' },
  dark: { bg: '#000000', card: '#1C1C1E', text: '#F5F5F5', muted: '#9CA3AF', border: '#2C2C2E', accent: '#22C55E' },
};
type Colors = typeof palette.light;

export default function HabitsScreen() {
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { habits, loaded, addHabit, toggleDay, removeHabit } = useHabits();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const today = dayKey();
  const doneToday = habits.filter((h) => h.done.includes(today)).length;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addHabit(trimmed, emoji);
    setName('');
  };

  const confirmDelete = (habit: Habit) =>
    Alert.alert('Delete habit?', `"${habit.name}" and its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeHabit(habit.id) },
    ]);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.summary, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {doneToday}/{habits.length}
            </Text>
            <Text style={{ color: colors.muted }}>habits done today</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${habits.length ? (doneToday / habits.length) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.muted }]}>No habits yet. Add one below.</Text>
        }
        renderItem={({ item }) => (
          <HabitRow
            habit={item}
            colors={colors}
            onToggle={(key) => toggleDay(item.id, key)}
            onLongPress={() => confirmDelete(item)}
          />
        )}
      />

      <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emojiChip, e === emoji && { backgroundColor: colors.border }]}>
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="New habit, e.g. Stretch 5 min"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.addButton, { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function HabitRow({
  habit,
  colors,
  onToggle,
  onLongPress,
}: {
  habit: Habit;
  colors: Colors;
  onToggle: (key?: string) => void;
  onLongPress: () => void;
}) {
  const doneToday = habit.done.includes(dayKey());
  const current = streak(habit);
  const week = [6, 5, 4, 3, 2, 1, 0].map(daysAgo);

  return (
    <Pressable
      onPress={() => onToggle()}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardEmoji}>{habit.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{habit.name}</Text>
          <Text style={{ color: colors.muted }}>
            {current > 0 ? `🔥 ${current} day streak` : 'Start a streak today'}
          </Text>
        </View>
        <View
          style={[
            styles.check,
            { borderColor: colors.accent },
            doneToday && { backgroundColor: colors.accent },
          ]}>
          {doneToday && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </View>

      <View style={styles.week}>
        {week.map((d) => {
          const key = dayKey(d);
          const done = habit.done.includes(key);
          return (
            <Pressable key={key} onPress={() => onToggle(key)} hitSlop={4} style={styles.day}>
              <Text style={[styles.dayLabel, { color: colors.muted }]}>{WEEKDAY[d.getDay()]}</Text>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: done ? colors.accent : colors.border },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  summary: { borderRadius: 16, padding: 16, gap: 4 },
  summaryValue: { fontSize: 32, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 32 },
  card: { borderRadius: 16, padding: 16, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 18, fontWeight: '700' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  dayLabel: { fontSize: 12 },
  dot: { width: 22, height: 22, borderRadius: 11 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, paddingBottom: 28, gap: 8 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiChip: { padding: 6, borderRadius: 8 },
  emojiText: { fontSize: 20 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 16 },
  addButton: { borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
