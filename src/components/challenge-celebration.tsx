import { useEffect } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring } from 'react-native-reanimated';

import { ConfettiLayer } from '@/components/confetti';
import { Button } from '@/components/ui';
import { useFeedback } from '@/lib/feedback';
import { type Challenge, CHALLENGE_TIERS, type Habit, tierFor } from '@/lib/model';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

/** Full-screen reward shown once when a challenge is finished. */
export function ChallengeCelebration() {
  const { state } = useStore();
  const challenge = state.challenges.find((ch) => ch.status === 'completed' && !ch.celebrated);
  const habit = state.habits.find((h) => h.id === challenge?.habitId);
  if (!challenge || !habit) return null;
  // Keyed so each finished challenge mounts fresh and plays its own celebration.
  return <Celebration key={challenge.id} challenge={challenge} habit={habit} />;
}

function Celebration({ challenge, habit }: { challenge: Challenge; habit: Habit }) {
  const { dispatch } = useStore();
  const { reward } = useFeedback();
  const c = useColors();
  const { width } = useWindowDimensions();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(150, withSequence(withSpring(1.2, { damping: 5 }), withSpring(1)));
    reward('challenge');
  }, [scale, reward]);

  const trophyStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const tier = tierFor(challenge.days);
  const next = CHALLENGE_TIERS.find((t) => t.days > challenge.days);
  const close = () => dispatch({ type: 'markCelebrated', id: challenge.id });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: c.bg + 'F2' }]}>
        <Animated.Text style={[styles.trophy, trophyStyle]}>{tier.badge}</Animated.Text>
        <Text style={[styles.kicker, { color: c.gold }]}>CHALLENGE COMPLETE</Text>
        <Text style={[styles.title, { color: c.text }]}>
          {challenge.days} days of {habit.emoji} {habit.name}
        </Text>
        <Text style={[styles.body, { color: c.muted }]}>
          You showed up every single day. That’s how habits are built. You earned the {tier.title} badge.
        </Text>
        <View style={styles.actions}>
          {next && (
            <Button
              title={`Take on the ${next.days}-day challenge`}
              onPress={() => {
                dispatch({ type: 'startChallenge', habitId: habit.id, days: next.days });
                close();
              }}
            />
          )}
          <Button title="Done" variant="ghost" onPress={close} />
        </View>
        <ConfettiLayer bursts={[{ id: 0, mode: 'rain', x: width / 2, y: -20 }]} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  trophy: { fontSize: 110, marginBottom: 12 },
  kicker: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  body: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 32 },
});
