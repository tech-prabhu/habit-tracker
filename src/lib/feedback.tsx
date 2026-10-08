import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { type Burst, ConfettiLayer } from '@/components/confetti';
import { useStore } from './store';

/**
 * Reward intensity for the core loop:
 * - `tap`: one count logged toward a goal
 * - `undo`: a log removed
 * - `complete`: a habit's daily goal reached
 * - `perfect`: every habit done for the day
 * - `challenge`: a challenge finished
 */
export type RewardLevel = 'tap' | 'undo' | 'complete' | 'perfect' | 'challenge';

type Point = { x: number; y: number };
type Feedback = { reward: (level: RewardLevel, from?: Point) => void };

const FeedbackContext = createContext<Feedback>({ reward: () => {} });

function play(player: AudioPlayer) {
  player.seekTo(0).catch(() => {});
  player.play();
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const { sound, haptics } = state.settings;
  const { width, height } = useWindowDimensions();
  const tick = useAudioPlayer(require('../../assets/sounds/tick.wav'));
  const chime = useAudioPlayer(require('../../assets/sounds/chime.wav'));
  const fanfare = useAudioPlayer(require('../../assets/sounds/fanfare.wav'));
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    // Mix with the user's music instead of pausing it.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  const addBurst = useCallback((mode: Burst['mode'], at: Point) => {
    const id = nextId.current++;
    setBursts((b) => [...b, { id, mode, ...at }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), mode === 'pop' ? 1400 : 3200);
  }, []);

  const reward = useCallback(
    (level: RewardLevel, from?: Point) => {
      const hapticsOn = haptics && Platform.OS !== 'web';
      const origin = from ?? { x: width / 2, y: height / 2 };
      switch (level) {
        case 'undo':
          if (hapticsOn) Haptics.selectionAsync();
          break;
        case 'tap':
          if (hapticsOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (sound) play(tick);
          break;
        case 'complete':
          if (hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (sound) play(chime);
          addBurst('pop', origin);
          break;
        case 'perfect':
        case 'challenge':
          if (hapticsOn) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 250);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 450);
          }
          if (sound) play(fanfare);
          if (level === 'perfect') addBurst('pop', origin);
          addBurst('rain', { x: width / 2, y: -20 });
          break;
      }
    },
    [haptics, sound, tick, chime, fanfare, addBurst, width, height],
  );

  const value = useMemo(() => ({ reward }), [reward]);

  return (
    <FeedbackContext value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <ConfettiLayer bursts={bursts} />
      </View>
    </FeedbackContext>
  );
}

export function useFeedback(): Feedback {
  return use(FeedbackContext);
}
