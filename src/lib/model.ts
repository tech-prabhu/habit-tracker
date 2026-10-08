import { addDays, dayKey, daysAgo, daysBetween } from './dates';

export type HabitKind = 'check' | 'count';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** `check`: done once per day. `count`: done `target` times per day. */
  kind: HabitKind;
  target: number;
  unit: string;
  /** Daily reminder as minutes since midnight, or null for none. */
  reminder: number | null;
  createdDay: string;
};

/** One logged repetition of a habit. */
export type Entry = { id: string; habitId: string; day: string; at: number };

export type ChallengeStatus = 'active' | 'completed' | 'failed';

export type Challenge = {
  id: string;
  habitId: string;
  days: number;
  startDay: string;
  status: ChallengeStatus;
  /** The completion celebration has been shown. */
  celebrated: boolean;
};

export type Settings = {
  notifications: boolean;
  morningMinutes: number;
  eveningMinutes: number;
  sound: boolean;
  haptics: boolean;
};

export type AppState = {
  version: 2;
  onboarded: boolean;
  habits: Habit[];
  entries: Entry[];
  challenges: Challenge[];
  settings: Settings;
};

export const HABIT_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#EF4444'];

export const CHALLENGE_TIERS = [
  { days: 3, title: 'Starter', badge: '🥉', blurb: 'Prove it to yourself.' },
  { days: 7, title: 'One Week', badge: '🥈', blurb: 'A full week, no breaks.' },
  { days: 14, title: 'Fortnight', badge: '🥇', blurb: 'Now it’s becoming automatic.' },
  { days: 30, title: 'Habit Master', badge: '🏆', blurb: 'Thirty days. A new you.' },
] as const;

export function tierFor(days: number) {
  return CHALLENGE_TIERS.find((t) => t.days === days) ?? CHALLENGE_TIERS[0];
}

export const DEFAULT_SETTINGS: Settings = {
  notifications: false,
  morningMinutes: 8 * 60,
  eveningMinutes: 20 * 60,
  sound: true,
  haptics: true,
};

export const INITIAL_STATE: AppState = {
  version: 2,
  onboarded: false,
  habits: [],
  entries: [],
  challenges: [],
  settings: DEFAULT_SETTINGS,
};

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Fast lookup of how many times each habit was logged on each day. */
export type CountIndex = Map<string, number>;

export function buildCountIndex(entries: Entry[]): CountIndex {
  const index: CountIndex = new Map();
  for (const e of entries) {
    const k = `${e.habitId}|${e.day}`;
    index.set(k, (index.get(k) ?? 0) + 1);
  }
  return index;
}

export function countOn(index: CountIndex, habitId: string, day: string): number {
  return index.get(`${habitId}|${day}`) ?? 0;
}

export function metOn(index: CountIndex, habit: Habit, day: string): boolean {
  return countOn(index, habit.id, day) >= habit.target;
}

/** Consecutive met days ending today, or ending yesterday if today isn't met yet. */
export function currentStreak(index: CountIndex, habit: Habit): number {
  let day = metOn(index, habit, dayKey()) ? dayKey() : daysAgo(1);
  let n = 0;
  while (metOn(index, habit, day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(index: CountIndex, habit: Habit): number {
  const span = daysBetween(habit.createdDay, dayKey());
  let best = 0;
  let run = 0;
  for (let i = 0; i <= span; i++) {
    if (metOn(index, habit, addDays(habit.createdDay, i))) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Fraction of habits (that existed that day) whose goal was met. Null if none existed. */
export function completionOn(index: CountIndex, habits: Habit[], day: string): number | null {
  const relevant = habits.filter((h) => h.createdDay <= day);
  if (relevant.length === 0) return null;
  return relevant.filter((h) => metOn(index, h, day)).length / relevant.length;
}

export function challengeDay(c: Challenge): number {
  return Math.min(c.days, daysBetween(c.startDay, dayKey()) + 1);
}

/** Moves active challenges to completed/failed based on the log. Pure. */
export function evaluateChallenges(state: AppState): AppState {
  const index = buildCountIndex(state.entries);
  const today = dayKey();
  let changed = false;
  const challenges = state.challenges.map((c) => {
    if (c.status !== 'active') return c;
    const habit = state.habits.find((h) => h.id === c.habitId);
    if (!habit) return c;
    let metDays = 0;
    for (let i = 0; i < c.days; i++) {
      const day = addDays(c.startDay, i);
      if (day > today) break;
      if (metOn(index, habit, day)) metDays++;
      else if (day < today) {
        changed = true;
        return { ...c, status: 'failed' as const };
      }
    }
    if (metDays === c.days) {
      changed = true;
      return { ...c, status: 'completed' as const, celebrated: false };
    }
    return c;
  });
  return changed ? { ...state, challenges } : state;
}

export const PRESET_HABITS: Omit<Habit, 'id' | 'color' | 'createdDay' | 'reminder'>[] = [
  { name: 'Drink water', emoji: '💧', kind: 'count', target: 8, unit: 'glasses' },
  { name: 'Read 20 minutes', emoji: '📚', kind: 'check', target: 1, unit: '' },
  { name: 'Go for a walk', emoji: '🚶', kind: 'check', target: 1, unit: '' },
  { name: 'Meditate', emoji: '🧘', kind: 'check', target: 1, unit: '' },
  { name: 'Push-ups', emoji: '💪', kind: 'count', target: 3, unit: 'sets' },
  { name: 'Eat veggies', emoji: '🥗', kind: 'count', target: 3, unit: 'servings' },
  { name: 'Journal', emoji: '✍️', kind: 'check', target: 1, unit: '' },
  { name: 'In bed by 11', emoji: '😴', kind: 'check', target: 1, unit: '' },
];

/** Converts the v1 format ({ name, emoji, done: day[] }) from the first demo. */
export function migrateV1(raw: { id: string; name: string; emoji: string; done: string[] }[]): AppState {
  const habits: Habit[] = raw.map((h, i) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    color: HABIT_COLORS[i % HABIT_COLORS.length],
    kind: 'check',
    target: 1,
    unit: '',
    reminder: null,
    createdDay: [...h.done].sort()[0] ?? dayKey(),
  }));
  const entries: Entry[] = raw.flatMap((h) =>
    h.done.map((day) => ({ id: newId(), habitId: h.id, day, at: new Date(`${day}T12:00:00`).getTime() })),
  );
  return { ...INITIAL_STATE, habits, entries };
}

/** Fills the last ~60 days with plausible history so charts have something to show. */
export function sampleHistory(habits: Habit[]): { habits: Habit[]; entries: Entry[] } {
  const start = daysAgo(60);
  const entries: Entry[] = [];
  habits.forEach((h, hi) => {
    const reliability = 0.55 + 0.1 * (hi % 4);
    for (let i = 60; i >= 1; i--) {
      const day = daysAgo(i);
      // Recent days are more reliable, so the trend line climbs.
      const p = reliability + (60 - i) * 0.004;
      const reps = Math.random() < p ? h.target : Math.floor(Math.random() * h.target);
      for (let r = 0; r < reps; r++) {
        const at = new Date(`${day}T${String(8 + r).padStart(2, '0')}:${String((hi * 13) % 60).padStart(2, '0')}:00`);
        entries.push({ id: newId(), habitId: h.id, day, at: at.getTime() });
      }
    }
  });
  return { habits: habits.map((h) => ({ ...h, createdDay: start })), entries };
}
