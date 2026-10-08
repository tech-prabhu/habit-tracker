import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, use, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState as RNAppState } from 'react-native';

import { dayKey } from './dates';
import {
  type AppState,
  type Challenge,
  type Habit,
  type Settings,
  buildCountIndex,
  type CountIndex,
  countOn,
  evaluateChallenges,
  INITIAL_STATE,
  migrateV1,
  newId,
  sampleHistory,
} from './model';
import { rescheduleReminders } from './notifications';

const STORAGE_KEY = 'habits:v2';
const LEGACY_KEY = 'habits:v1';

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'refresh' }
  | { type: 'addHabits'; habits: Habit[] }
  | { type: 'updateHabit'; habit: Habit }
  | { type: 'deleteHabit'; id: string }
  | { type: 'log'; habitId: string; day: string }
  | { type: 'unlog'; habitId: string; day: string }
  | { type: 'setCount'; habitId: string; day: string; count: number }
  | { type: 'startChallenge'; habitId: string; days: number }
  | { type: 'dismissChallenge'; id: string }
  | { type: 'markCelebrated'; id: string }
  | { type: 'completeOnboarding' }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'loadSampleHistory' }
  | { type: 'reset' };

function logAt(day: string): number {
  // Entries for past days get a midday timestamp; today's get the real time.
  return day === dayKey() ? Date.now() : new Date(`${day}T12:00:00`).getTime();
}

function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return action.state;
    case 'refresh':
      // New object so persistence and reminder scheduling re-run (e.g. after midnight).
      return { ...state };
    case 'addHabits':
      return { ...state, habits: [...state.habits, ...action.habits] };
    case 'updateHabit':
      return { ...state, habits: state.habits.map((h) => (h.id === action.habit.id ? action.habit : h)) };
    case 'deleteHabit':
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        entries: state.entries.filter((e) => e.habitId !== action.id),
        challenges: state.challenges.filter((c) => c.habitId !== action.id),
      };
    case 'log':
      return {
        ...state,
        entries: [...state.entries, { id: newId(), habitId: action.habitId, day: action.day, at: logAt(action.day) }],
      };
    case 'unlog': {
      let idx = -1;
      state.entries.forEach((e, i) => {
        if (e.habitId === action.habitId && e.day === action.day) idx = i;
      });
      if (idx === -1) return state;
      return { ...state, entries: state.entries.filter((_, i) => i !== idx) };
    }
    case 'setCount': {
      const others = state.entries.filter((e) => !(e.habitId === action.habitId && e.day === action.day));
      const added = Array.from({ length: action.count }, () => ({
        id: newId(),
        habitId: action.habitId,
        day: action.day,
        at: logAt(action.day),
      }));
      return { ...state, entries: [...others, ...added] };
    }
    case 'startChallenge': {
      const challenge: Challenge = {
        id: newId(),
        habitId: action.habitId,
        days: action.days,
        startDay: dayKey(),
        status: 'active',
        celebrated: false,
      };
      // One active challenge per habit: a new one replaces the old.
      const rest = state.challenges.filter((c) => !(c.habitId === action.habitId && c.status !== 'completed'));
      return { ...state, challenges: [...rest, challenge] };
    }
    case 'dismissChallenge':
      return { ...state, challenges: state.challenges.filter((c) => c.id !== action.id) };
    case 'markCelebrated':
      return {
        ...state,
        challenges: state.challenges.map((c) => (c.id === action.id ? { ...c, celebrated: true } : c)),
      };
    case 'completeOnboarding':
      return { ...state, onboarded: true };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'loadSampleHistory': {
      const today = dayKey();
      const { habits, entries } = sampleHistory(state.habits);
      return { ...state, habits, entries: [...state.entries.filter((e) => e.day === today), ...entries] };
    }
    case 'reset':
      return INITIAL_STATE;
  }
}

function reducer(state: AppState, action: Action): AppState {
  return evaluateChallenges(reduce(state, action));
}

async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) return { ...INITIAL_STATE, ...JSON.parse(raw) };
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) return migrateV1(JSON.parse(legacy));
  return INITIAL_STATE;
}

type Store = {
  state: AppState;
  loaded: boolean;
  dispatch: (action: Action) => void;
  index: CountIndex;
  count: (habitId: string, day?: string) => number;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadState()
      .catch(() => INITIAL_STATE)
      .then((s) => dispatch({ type: 'load', state: evaluateChallenges(s) }))
      .finally(() => setLoaded(true));
  }, []);

  // Persist every change.
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  // Re-check challenges when the app returns to the foreground (the day may have changed).
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') dispatch({ type: 'refresh' });
    });
    return () => sub.remove();
  }, []);

  // Keep scheduled reminders in sync with what's left to do. Debounced so rapid taps batch up.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => rescheduleReminders(state).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [state, loaded]);

  const index = useMemo(() => buildCountIndex(state.entries), [state.entries]);

  const store = useMemo<Store>(
    () => ({
      state,
      loaded,
      dispatch,
      index,
      count: (habitId, day = dayKey()) => countOn(index, habitId, day),
    }),
    [state, loaded, index],
  );

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
