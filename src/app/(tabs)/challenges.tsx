import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import { addDays, dayKey } from '@/lib/dates';
import { useFeedback } from '@/lib/feedback';
import { type Challenge, CHALLENGE_TIERS, challengeDay, type CountIndex, type Habit, metOn, tierFor } from '@/lib/model';
import { useStore } from '@/lib/store';
import { type Colors, useColors } from '@/lib/theme';

export default function ChallengesScreen() {
  const c = useColors();
  const { state, dispatch, index } = useStore();
  const { reward } = useFeedback();
  const [openTier, setOpenTier] = useState<number | null>(null);
  const [pick, setPick] = useState<string | null>(null);

  const habitOf = (ch: Challenge) => state.habits.find((h) => h.id === ch.habitId);
  const active = state.challenges.filter((ch) => ch.status === 'active');
  const failed = state.challenges.filter((ch) => ch.status === 'failed');
  const completed = state.challenges.filter((ch) => ch.status === 'completed');
  const busy = new Set(active.map((ch) => ch.habitId));

  // Each tier unlocks once the previous one has been completed at least once.
  const unlocked = (days: number) => {
    const i = CHALLENGE_TIERS.findIndex((t) => t.days === days);
    return i === 0 || completed.some((ch) => ch.days === CHALLENGE_TIERS[i - 1].days);
  };

  const start = (habitId: string, days: number) => {
    dispatch({ type: 'startChallenge', habitId, days });
    reward('tap');
    setOpenTier(null);
    setPick(null);
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      {active.length > 0 && <SectionTitle>In progress</SectionTitle>}
      {active.map((ch) => {
        const habit = habitOf(ch);
        if (!habit) return null;
        return (
          <Card key={ch.id} style={{ gap: 12 }}>
            <View style={styles.headerRow}>
              <Text style={{ fontSize: 30 }}>{tierFor(ch.days).badge}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.text }]}>
                  {habit.emoji} {habit.name}
                </Text>
                <Text style={{ color: c.muted }}>
                  {ch.days}-day challenge · Day {challengeDay(ch)} of {ch.days}
                </Text>
              </View>
            </View>
            <Segments challenge={ch} habit={habit} index={index} c={c} />
          </Card>
        );
      })}

      {failed.map((ch) => {
        const habit = habitOf(ch);
        if (!habit) return null;
        return (
          <Card key={ch.id} style={{ gap: 10 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>
              Missed a day on {habit.emoji} {habit.name}
            </Text>
            <Text style={{ color: c.muted }}>
              Your {ch.days}-day challenge ended early. Everyone slips. What matters is starting again.
            </Text>
            <Segments challenge={ch} habit={habit} index={index} c={c} />
            <View style={styles.buttons}>
              <Button title="Try again" onPress={() => start(habit.id, ch.days)} style={{ flex: 1 }} />
              <Button
                title="Dismiss"
                variant="secondary"
                onPress={() => dispatch({ type: 'dismissChallenge', id: ch.id })}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        );
      })}

      <SectionTitle>Start a challenge</SectionTitle>
      {CHALLENGE_TIERS.map((tier) => {
        const isUnlocked = unlocked(tier.days);
        const isOpen = openTier === tier.days;
        const available = state.habits.filter((h) => !busy.has(h.id));
        return (
          <Card key={tier.days} style={{ opacity: isUnlocked ? 1 : 0.55, gap: 12 }}>
            <Pressable
              disabled={!isUnlocked}
              onPress={() => {
                setOpenTier(isOpen ? null : tier.days);
                setPick(available[0]?.id ?? null);
              }}
              style={styles.headerRow}>
              <Text style={{ fontSize: 30 }}>{isUnlocked ? tier.badge : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.text }]}>
                  {tier.days} days · {tier.title}
                </Text>
                <Text style={{ color: c.muted }}>
                  {isUnlocked ? tier.blurb : `Finish a ${CHALLENGE_TIERS[CHALLENGE_TIERS.indexOf(tier) - 1].days}-day challenge to unlock`}
                </Text>
              </View>
            </Pressable>
            {isOpen && (
              <>
                {available.length === 0 ? (
                  <Text style={{ color: c.muted }}>All your habits already have a challenge running.</Text>
                ) : (
                  <View style={styles.chips}>
                    {available.map((h) => (
                      <Chip
                        key={h.id}
                        label={`${h.emoji} ${h.name}`}
                        color={h.color}
                        selected={pick === h.id}
                        onPress={() => setPick(h.id)}
                      />
                    ))}
                  </View>
                )}
                <Button
                  title={`Start ${tier.days}-day challenge`}
                  disabled={!pick}
                  onPress={() => pick && start(pick, tier.days)}
                />
              </>
            )}
          </Card>
        );
      })}

      <SectionTitle>Trophy case</SectionTitle>
      <Card>
        {completed.length === 0 ? (
          <Text style={{ color: c.muted }}>Finish a challenge to earn your first trophy.</Text>
        ) : (
          <View style={styles.trophies}>
            {completed.map((ch) => {
              const habit = habitOf(ch);
              return (
                <View key={ch.id} style={styles.trophy}>
                  <Text style={{ fontSize: 36 }}>{tierFor(ch.days).badge}</Text>
                  <Text style={{ color: c.text, fontWeight: '600', fontSize: 12 }}>{ch.days} days</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>
                    {habit ? `${habit.emoji} ${habit.name}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function Segments({ challenge, habit, index, c }: { challenge: Challenge; habit: Habit; index: CountIndex; c: Colors }) {
  const today = dayKey();
  return (
    <View style={styles.segments}>
      {Array.from({ length: challenge.days }, (_, i) => {
        const day = addDays(challenge.startDay, i);
        const met = metOn(index, habit, day);
        const missed = !met && day < today;
        return (
          <View
            key={day}
            style={[
              styles.segment,
              {
                backgroundColor: met ? habit.color : missed ? c.danger + '66' : c.cardAlt,
                borderColor: day === today && !met ? habit.color : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 12, borderRadius: 6, borderWidth: 2 },
  trophies: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  trophy: { alignItems: 'center', width: 76 },
});
