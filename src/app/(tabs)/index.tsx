import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { type GestureResponderEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HabitCard } from '@/components/habit-card';
import { Button, Card } from '@/components/ui';
import { dayKey, daysAgo, parseDay } from '@/lib/dates';
import { useFeedback } from '@/lib/feedback';
import { challengeDay, countOn, currentStreak, type Habit } from '@/lib/model';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function TodayScreen() {
  const c = useColors();
  const navigation = useNavigation();
  const { state, dispatch, index, count } = useStore();
  const { reward } = useFeedback();
  const { habits } = state;
  const today = dayKey();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Link href="/habit-form" asChild>
          <Pressable hitSlop={10} style={{ marginRight: 16 }} accessibilityLabel="New habit">
            <Ionicons name="add-circle" size={30} color={c.accent} />
          </Pressable>
        </Link>
      ),
    });
  }, [navigation, c.accent]);

  const doneCount = habits.filter((h) => count(h.id) >= h.target).length;
  const allDone = habits.length > 0 && doneCount === habits.length;
  const activeChallenges = state.challenges.filter((ch) => ch.status === 'active');

  const log = (habit: Habit, e: GestureResponderEvent) => {
    const from = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    const current = count(habit.id);

    // A finished check-off habit toggles back off.
    if (habit.kind === 'check' && current >= habit.target) {
      dispatch({ type: 'unlog', habitId: habit.id, day: today });
      reward('undo');
      return;
    }

    dispatch({ type: 'log', habitId: habit.id, day: today });
    if (current + 1 === habit.target) {
      const othersDone = habits.every((h) => h.id === habit.id || count(h.id) >= h.target);
      reward(othersDone && habits.length > 1 ? 'perfect' : 'complete', from);
    } else {
      reward('tap');
    }
  };

  const toggleDay = (habit: Habit, day: string) => {
    const met = count(habit.id, day) >= habit.target;
    dispatch({ type: 'setCount', habitId: habit.id, day, count: met ? 0 : habit.target });
    reward(met ? 'undo' : 'tap');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: c.bg }}>
      <Card style={allDone ? { backgroundColor: c.accentSoft } : undefined}>
        <Text style={{ color: c.muted, fontWeight: '600' }}>
          {parseDay(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={[styles.summaryTitle, { color: c.text }]}>
          {allDone ? '🌟 Perfect day!' : habits.length === 0 ? 'Let’s build a habit' : `${doneCount} of ${habits.length} done`}
        </Text>
        {habits.length > 0 && (
          <View style={[styles.track, { backgroundColor: c.border }]}>
            <View
              style={[styles.fill, { backgroundColor: c.accent, width: `${(doneCount / habits.length) * 100}%` }]}
            />
          </View>
        )}
        {allDone && <Text style={{ color: c.text, marginTop: 8 }}>Every habit done. See you tomorrow!</Text>}
      </Card>

      {activeChallenges.map((ch) => {
        const habit = habits.find((h) => h.id === ch.habitId);
        if (!habit) return null;
        return (
          <Pressable key={ch.id} onPress={() => router.navigate('/challenges')}>
            <Card style={[styles.challenge, { borderColor: c.gold }]}>
              <Text style={{ fontSize: 26 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.challengeTitle, { color: c.text }]}>
                  {ch.days}-day challenge · Day {challengeDay(ch)} of {ch.days}
                </Text>
                <Text style={{ color: c.muted }}>
                  {countOn(index, habit.id, today) >= habit.target
                    ? `${habit.emoji} ${habit.name} done today ✓`
                    : `Complete ${habit.emoji} ${habit.name} today to stay in it`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </Card>
          </Pressable>
        );
      })}

      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          count={count(habit.id)}
          streak={currentStreak(index, habit)}
          history={[6, 5, 4, 3, 2, 1, 0].map((n) => count(habit.id, daysAgo(n)) / habit.target)}
          onLog={(e) => log(habit, e)}
          onUndo={() => {
            dispatch({ type: 'unlog', habitId: habit.id, day: today });
            reward('undo');
          }}
          onToggleDay={(day) => toggleDay(habit, day)}
          onLongPress={() => router.push({ pathname: '/habit-form', params: { id: habit.id } })}
        />
      ))}

      {habits.length === 0 ? (
        <Button title="Add your first habit" onPress={() => router.push('/habit-form')} />
      ) : (
        <Text style={[styles.hint, { color: c.muted }]}>
          Tap a card to log · tap a day to fix history · long-press to edit
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  summaryTitle: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  track: { height: 10, borderRadius: 5, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  challenge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
  challengeTitle: { fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', fontSize: 13, marginTop: 4 },
});
