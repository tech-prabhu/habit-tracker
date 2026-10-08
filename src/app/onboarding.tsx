import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Row, TimeStepper } from '@/components/ui';
import { dayKey } from '@/lib/dates';
import { useFeedback } from '@/lib/feedback';
import { type Habit, HABIT_COLORS, newId, PRESET_HABITS } from '@/lib/model';
import { requestPermission } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

const STEPS = 4;

export default function OnboardingScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const { reward } = useFeedback();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Habit[]>([]);
  const [custom, setCustom] = useState('');
  const [challengeHabit, setChallengeHabit] = useState<string | null>(null);
  const [morning, setMorning] = useState(state.settings.morningMinutes);
  const [evening, setEvening] = useState(state.settings.eveningMinutes);

  const allHabits = [...state.habits, ...picked];
  const challengeId = challengeHabit ?? allHabits[0]?.id ?? null;

  const makeHabit = (h: Omit<Habit, 'id' | 'color' | 'createdDay' | 'reminder'>, i: number): Habit => ({
    ...h,
    id: newId(),
    color: HABIT_COLORS[(state.habits.length + i) % HABIT_COLORS.length],
    reminder: null,
    createdDay: dayKey(),
  });

  const togglePreset = (preset: (typeof PRESET_HABITS)[number]) => {
    reward('undo');
    setPicked((prev) =>
      prev.some((h) => h.name === preset.name)
        ? prev.filter((h) => h.name !== preset.name)
        : [...prev, makeHabit(preset, prev.length)],
    );
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    setPicked((prev) => [...prev, makeHabit({ name, emoji: '✅', kind: 'check', target: 1, unit: '' }, prev.length)]);
    setCustom('');
    reward('tap');
  };

  const next = () => {
    reward('tap');
    setStep((s) => s + 1);
  };

  const finish = async (withReminders: boolean) => {
    const granted = withReminders ? await requestPermission() : false;
    if (picked.length) dispatch({ type: 'addHabits', habits: picked });
    dispatch({
      type: 'updateSettings',
      settings: { notifications: granted, morningMinutes: morning, eveningMinutes: evening },
    });
    if (challengeId) dispatch({ type: 'startChallenge', habitId: challengeId, days: 3 });
    dispatch({ type: 'completeOnboarding' });
    reward('complete');
    router.replace('/');
  };

  const challengeHabitObj = allHabits.find((h) => h.id === challengeId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.dots, { paddingTop: insets.top + 12 }]}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? c.accent : c.border }]} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(150)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <View style={[styles.hero, { backgroundColor: c.accentSoft }]}>
                <Text style={{ fontSize: 64 }}>🌱</Text>
              </View>
              <Text style={[styles.title, { color: c.text }]}>Small habits.{'\n'}Big wins.</Text>
              <Text style={[styles.subtitle, { color: c.muted }]}>
                Build habits that stick, one tap at a time.
              </Text>
              <Card style={{ gap: 14, marginTop: 8 }}>
                <Bullet icon="👆" title="Tap to log" body="Every check-in gets a little celebration." />
                <Bullet icon="🏆" title="Take on challenges" body="Start with 3 days. Earn trophies as you go." />
                <Bullet icon="🔔" title="Friendly nudges" body="We’ll remind you, but never about what’s already done." />
              </Card>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={[styles.title, { color: c.text }]}>Pick your habits</Text>
              <Text style={[styles.subtitle, { color: c.muted }]}>
                Start small. One or two is perfect. You can add more any time.
              </Text>
              {state.habits.length > 0 && (
                <Text style={{ color: c.muted }}>
                  Keeping your existing habits: {state.habits.map((h) => h.emoji).join(' ')}
                </Text>
              )}
              <View style={{ gap: 8 }}>
                {PRESET_HABITS.map((p) => {
                  const on = picked.some((h) => h.name === p.name);
                  return (
                    <Pressable
                      key={p.name}
                      onPress={() => togglePreset(p)}
                      style={[styles.preset, { backgroundColor: c.card, borderColor: on ? c.accent : 'transparent' }]}>
                      <Text style={{ fontSize: 26 }}>{p.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{p.name}</Text>
                        <Text style={{ color: c.muted, fontSize: 13 }}>
                          {p.kind === 'count' ? `${p.target} ${p.unit} a day` : 'Once a day'}
                        </Text>
                      </View>
                      <View style={[styles.radio, { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent' }]}>
                        {on && <Text style={{ color: c.onAccent, fontWeight: '800' }}>✓</Text>}
                      </View>
                    </Pressable>
                  );
                })}
                {picked
                  .filter((h) => !PRESET_HABITS.some((p) => p.name === h.name))
                  .map((h) => (
                    <View key={h.id} style={[styles.preset, { backgroundColor: c.card, borderColor: c.accent }]}>
                      <Text style={{ fontSize: 26 }}>{h.emoji}</Text>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', flex: 1 }}>{h.name}</Text>
                      <Pressable onPress={() => setPicked((prev) => prev.filter((x) => x.id !== h.id))} hitSlop={8}>
                        <Text style={{ color: c.muted, fontSize: 18 }}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                <View style={styles.customRow}>
                  <TextInput
                    value={custom}
                    onChangeText={setCustom}
                    onSubmitEditing={addCustom}
                    placeholder="Or type your own…"
                    placeholderTextColor={c.muted}
                    returnKeyType="done"
                    style={[styles.input, { color: c.text, backgroundColor: c.card }]}
                  />
                  <Button title="Add" variant="secondary" onPress={addCustom} disabled={!custom.trim()} />
                </View>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ fontSize: 64, textAlign: 'center' }}>🥉</Text>
              <Text style={[styles.title, { color: c.text }]}>Your first challenge</Text>
              <Text style={[styles.subtitle, { color: c.muted }]}>
                Do one habit 3 days in a row and earn your first trophy. Which one?
              </Text>
              <View style={{ gap: 8 }}>
                {allHabits.map((h) => (
                  <Pressable
                    key={h.id}
                    onPress={() => setChallengeHabit(h.id)}
                    style={[
                      styles.preset,
                      { backgroundColor: c.card, borderColor: challengeId === h.id ? c.gold : 'transparent' },
                    ]}>
                    <Text style={{ fontSize: 26 }}>{h.emoji}</Text>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', flex: 1 }}>{h.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.days}>
                {[1, 2, 3].map((d) => (
                  <View key={d} style={styles.dayCol}>
                    <View style={[styles.dayCircle, { borderColor: challengeHabitObj?.color ?? c.accent }]}>
                      <Text style={{ fontSize: 22 }}>{challengeHabitObj?.emoji}</Text>
                    </View>
                    <Text style={{ color: c.muted, fontWeight: '600' }}>Day {d}</Text>
                  </View>
                ))}
                <Text style={{ fontSize: 22, color: c.muted }}>→</Text>
                <Text style={{ fontSize: 40 }}>🏆</Text>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <View style={[styles.hero, { backgroundColor: c.accentSoft }]}>
                <Text style={{ fontSize: 64 }}>🔔</Text>
              </View>
              <Text style={[styles.title, { color: c.text }]}>Let us keep you on track</Text>
              <Text style={[styles.subtitle, { color: c.muted }]}>
                A morning nudge to set your intention, and an evening check-in only if something’s left.
              </Text>
              <Card>
                <Row label="☀️ Morning">
                  <TimeStepper value={morning} onChange={setMorning} />
                </Row>
                <Row label="🌙 Evening">
                  <TimeStepper value={evening} onChange={setEvening} />
                </Row>
              </Card>
            </>
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {step === 0 && <Button title="Get started" onPress={next} />}
        {step === 1 && <Button title="Continue" onPress={next} disabled={allHabits.length === 0} />}
        {step === 2 && <Button title="Accept the challenge" onPress={next} />}
        {step === 3 && (
          <>
            <Button title="Turn on reminders" onPress={() => finish(true)} />
            <Button title="Not now" variant="ghost" onPress={() => finish(false)} />
          </>
        )}
        {step > 0 && step < 3 && <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />}
      </View>
    </KeyboardAvoidingView>
  );
}

function Bullet({ icon, title, body }: { icon: string; title: string; body: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 26 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
        <Text style={{ color: c.muted }}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  dot: { width: 28, height: 5, borderRadius: 3 },
  page: { padding: 24, gap: 14 },
  hero: { width: 120, height: 120, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 2 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  customRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 52, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
  days: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
  dayCol: { alignItems: 'center', gap: 6 },
  dayCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 24, gap: 4 },
});
