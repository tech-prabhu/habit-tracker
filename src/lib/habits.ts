import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  /** Completed days as local YYYY-MM-DD keys. */
  done: string[];
};

const STORAGE_KEY = 'habits:v1';

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Consecutive completed days ending today, or yesterday if today isn't done yet. */
export function streak(habit: Habit): number {
  const done = new Set(habit.done);
  const start = done.has(dayKey()) ? 0 : 1;
  let count = 0;
  while (done.has(dayKey(daysAgo(start + count)))) count++;
  return count;
}

function seedHabits(): Habit[] {
  const history = (pattern: number[]) => pattern.map((n) => dayKey(daysAgo(n)));
  return [
    { id: '1', name: 'Drink 8 glasses of water', emoji: '💧', done: history([1, 2, 3, 4, 5, 6]) },
    { id: '2', name: 'Read for 20 minutes', emoji: '📚', done: history([0, 1, 2, 4, 5]) },
    { id: '3', name: 'Morning walk', emoji: '🚶', done: history([1, 3, 6]) },
  ];
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setHabits(raw ? JSON.parse(raw) : seedHabits()))
      .catch(() => setHabits(seedHabits()))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits)).catch(() => {});
  }, [habits, loaded]);

  const addHabit = useCallback((name: string, emoji: string) => {
    setHabits((prev) => [...prev, { id: String(Date.now()), name, emoji, done: [] }]);
  }, []);

  const toggleDay = useCallback((id: string, key: string = dayKey()) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id !== id
          ? h
          : { ...h, done: h.done.includes(key) ? h.done.filter((d) => d !== key) : [...h.done, key] },
      ),
    );
  }, []);

  const removeHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { habits, loaded, addHabit, toggleDay, removeHabit };
}
