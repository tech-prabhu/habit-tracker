import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, NumberStepper, Row, SectionTitle, TimeStepper, ToggleRow } from '@/components/ui';
import { dayKey } from '@/lib/dates';
import { type Habit, HABIT_COLORS, type HabitKind, newId } from '@/lib/model';
import { requestPermission } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

const EMOJIS = ['✅', '💧', '📚', '🏃', '🚶', '🧘', '💪', '🥗', '😴', '✍️', '🎸', '🧹', '💊', '🌱', '📵', '🙏'];

export default function HabitFormScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, dispatch } = useStore();
  const existing = state.habits.find((h) => h.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJIS[0]);
  const [color, setColor] = useState(existing?.color ?? HABIT_COLORS[state.habits.length % HABIT_COLORS.length]);
  const [kind, setKind] = useState<HabitKind>(existing?.kind ?? 'check');
  const [target, setTarget] = useState(existing?.kind === 'count' ? existing.target : 3);
  const [unit, setUnit] = useState(existing?.unit ?? 'times');
  const [reminder, setReminder] = useState<number | null>(existing?.reminder ?? null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const habit: Habit = {
      id: existing?.id ?? newId(),
      name: trimmed,
      emoji,
      color,
      kind,
      target: kind === 'count' ? target : 1,
      unit: kind === 'count' ? unit.trim() : '',
      reminder,
      createdDay: existing?.createdDay ?? dayKey(),
    };
    dispatch(existing ? { type: 'updateHabit', habit } : { type: 'addHabits', habits: [habit] });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete habit?', `"${existing?.name}" and all of its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'deleteHabit', id: existing!.id });
          router.back();
        },
      },
    ]);

  const toggleReminder = async (on: boolean) => {
    if (!on) return setReminder(null);
    setReminder(existing?.reminder ?? 18 * 60);
    // A per-habit reminder implies the user wants nudges.
    if (await requestPermission()) dispatch({ type: 'updateSettings', settings: { notifications: true } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Edit habit' : 'New habit' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.preview}>
          <View style={[styles.previewEmoji, { backgroundColor: color + '22' }]}>
            <Text style={{ fontSize: 40 }}>{emoji}</Text>
          </View>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Habit name, e.g. Stretch"
          placeholderTextColor={c.muted}
          autoFocus={!existing}
          style={[styles.input, { color: c.text, backgroundColor: c.card }]}
        />

        <SectionTitle>Icon</SectionTitle>
        <Card style={styles.grid}>
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emojiCell, e === emoji && { backgroundColor: color + '33' }]}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </Pressable>
          ))}
        </Card>

        <SectionTitle>Color</SectionTitle>
        <Card style={styles.colors}>
          {HABIT_COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => setColor(col)}
              accessibilityLabel={`Color ${col}`}
              style={[styles.swatch, { backgroundColor: col, borderColor: col === color ? c.text : 'transparent' }]}
            />
          ))}
        </Card>

        <SectionTitle>Goal</SectionTitle>
        <Card>
          <View style={[styles.segment, { backgroundColor: c.cardAlt }]}>
            {(
              [
                ['check', 'Once a day'],
                ['count', 'Several times a day'],
              ] as const
            ).map(([k, label]) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[styles.segmentItem, kind === k && { backgroundColor: c.card }]}>
                <Text style={{ color: kind === k ? c.text : c.muted, fontWeight: '600' }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {kind === 'count' && (
            <>
              <Row label="Daily target">
                <NumberStepper value={target} onChange={setTarget} min={2} max={30} />
              </Row>
              <Row label="Unit">
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="glasses"
                  placeholderTextColor={c.muted}
                  style={[styles.unitInput, { color: c.text, backgroundColor: c.cardAlt }]}
                />
              </Row>
            </>
          )}
          <Text style={{ color: c.muted, marginTop: 8 }}>
            {kind === 'check'
              ? 'One tap marks it done for the day.'
              : `Tap each time. Done after ${target} ${unit || 'times'}.`}
          </Text>
        </Card>

        <SectionTitle>Reminder</SectionTitle>
        <Card>
          <ToggleRow
            label="Remind me daily"
            hint="Skipped automatically once it's done."
            value={reminder != null}
            onChange={toggleReminder}
          />
          {reminder != null && (
            <Row label="Time">
              <TimeStepper value={reminder} onChange={setReminder} step={15} />
            </Row>
          )}
        </Card>

        <Button title={existing ? 'Save changes' : 'Create habit'} onPress={save} disabled={!name.trim()} style={{ marginTop: 8 }} />
        {existing && <Button title="Delete habit" variant="danger" onPress={remove} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  preview: { alignItems: 'center', marginVertical: 8 },
  previewEmoji: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  input: { height: 52, borderRadius: 14, paddingHorizontal: 16, fontSize: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 10 },
  emojiCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colors: { flexDirection: 'row', justifyContent: 'space-between' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 6 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  unitInput: { height: 38, borderRadius: 10, paddingHorizontal: 12, minWidth: 120, fontSize: 16 },
});
