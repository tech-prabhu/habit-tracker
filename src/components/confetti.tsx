import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#FACC15'];

export type Burst = {
  id: number;
  /** `pop`: a small burst from a point. `rain`: full-screen confetti from the top. */
  mode: 'pop' | 'rain';
  x: number;
  y: number;
};

type ParticleSpec = { vx: number; vy: number; spin: number; size: number; color: string; delay: number; round: boolean };

function makeParticles(mode: Burst['mode'], width: number): ParticleSpec[] {
  const n = mode === 'pop' ? 28 : 90;
  return Array.from({ length: n }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 220;
    return {
      vx: mode === 'pop' ? Math.cos(angle) * speed : (Math.random() - 0.5) * width * 1.1,
      vy: mode === 'pop' ? Math.sin(angle) * speed - 260 : -Math.random() * 200,
      spin: (Math.random() - 0.5) * 1080,
      size: 6 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
      delay: mode === 'pop' ? 0 : Math.random() * 400,
      round: Math.random() < 0.3,
    };
  });
}

function Particle({ spec, burst, duration, gravity }: { spec: ParticleSpec; burst: Burst; duration: number; gravity: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration, easing: Easing.linear }));
  }, [t, spec.delay, duration]);

  const style = useAnimatedStyle(() => {
    const s = (t.value * duration) / 1000;
    return {
      opacity: t.value === 0 ? 0 : 1 - Math.max(0, (t.value - 0.7) / 0.3),
      transform: [
        { translateX: burst.x + spec.vx * s },
        { translateY: burst.y + spec.vy * s + 0.5 * gravity * s * s },
        { rotate: `${spec.spin * s}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: spec.size,
          height: spec.round ? spec.size : spec.size * 0.45,
          borderRadius: spec.round ? spec.size / 2 : 1,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

function BurstView({ burst }: { burst: Burst }) {
  const { width } = useWindowDimensions();
  // Random particles are generated once per burst.
  const [particles] = useState(() => makeParticles(burst.mode, width));
  const duration = burst.mode === 'pop' ? 1100 : 2600;
  const gravity = burst.mode === 'pop' ? 900 : 500;
  return (
    <>
      {particles.map((p, i) => (
        <Particle key={i} spec={p} burst={burst} duration={duration} gravity={gravity} />
      ))}
    </>
  );
}

export function ConfettiLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((b) => (
        <BurstView key={b.id} burst={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', left: 0, top: 0 },
});
