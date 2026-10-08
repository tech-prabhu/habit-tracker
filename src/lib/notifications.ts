import { Platform } from 'react-native';

import { addDays, dayKey, parseDay } from './dates';
import { type AppState, buildCountIndex, challengeDay, countOn, currentStreak, type Habit, metOn } from './model';
import { notificationsApi } from './notifications-api';

const CHANNEL_ID = 'reminders';
/** How many days ahead to schedule. iOS keeps at most 64 pending notifications. */
const DAYS_AHEAD = 7;
const HABIT_REMINDER_DAYS = 3;

let handlerSet = false;

/** Loads the notifications API and does one-time setup. Null when unavailable. */
async function ready() {
  const N = notificationsApi();
  if (!N) return null;
  if (!handlerSet) {
    handlerSet = true;
    // Show reminders even while the app is open.
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Habit reminders',
        importance: N.AndroidImportance.HIGH,
      });
    }
  }
  return N;
}

/** Asks for permission if needed. Returns whether notifications can be shown. */
export async function requestPermission(): Promise<boolean> {
  try {
    const N = await ready();
    if (!N) return false;
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await N.requestPermissionsAsync()).granted;
  } catch (e) {
    console.warn('Could not request notification permission:', e);
    return false;
  }
}

function at(day: string, minutes: number): Date {
  const d = parseDay(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function listNames(habits: Habit[]): string {
  const names = habits.map((h) => `${h.emoji} ${h.name}`);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

type Planned = { date: Date; title: string; body: string };

/**
 * Builds the coming week of nudges from the current state: a morning intention prompt,
 * per-habit reminders, and an evening "don't forget" check-in that only mentions what's left.
 */
export function planReminders(state: AppState, now = new Date()): Planned[] {
  const { habits, settings, challenges } = state;
  if (habits.length === 0) return [];
  const index = buildCountIndex(state.entries);
  const today = dayKey(now);
  const activeChallenge = challenges.find((c) => c.status === 'active');
  const challengeHabit = habits.find((h) => h.id === activeChallenge?.habitId);
  const plan: Planned[] = [];

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(today, d);
    const pending = d === 0 ? habits.filter((h) => !metOn(index, h, day)) : habits;
    if (pending.length === 0) continue;

    // Morning: set the intention for the day.
    let morningBody = `Today: ${listNames(pending)}. Which one are you starting with?`;
    if (activeChallenge && challengeHabit) {
      const n = challengeDay(activeChallenge) + d;
      if (n <= activeChallenge.days) {
        morningBody = `Day ${n} of your ${activeChallenge.days}-day challenge 🏆 ${challengeHabit.emoji} ${challengeHabit.name} keeps it alive.`;
      }
    }
    plan.push({ date: at(day, settings.morningMinutes), title: 'Good morning ☀️', body: morningBody });

    // Per-habit reminders at the time the user chose.
    if (d < HABIT_REMINDER_DAYS) {
      for (const h of pending) {
        if (h.reminder == null) continue;
        const done = countOn(index, h.id, day);
        const body =
          h.kind === 'count' && d === 0 && done > 0
            ? `You're at ${done}/${h.target} ${h.unit}. Keep it going!`
            : 'You set the intention to do this today. Ready when you are.';
        plan.push({ date: at(day, h.reminder), title: `${h.emoji} Time for ${h.name}`, body });
      }
    }

    // Evening: only nag about what's still open.
    const streaks = pending.map((h) => currentStreak(index, h)).filter((s) => s > 0);
    const best = Math.max(0, ...streaks);
    plan.push({
      date: at(day, settings.eveningMinutes),
      title: d === 0 ? `Don't forget ${pending[0].emoji} ${pending[0].name}` : 'Evening check-in 🌙',
      body:
        best > 1
          ? `${listNames(pending)} still open. Your 🔥 ${best}-day streak is on the line!`
          : `${listNames(pending)} still open. A few minutes now is a win.`,
    });
  }

  return plan.filter((p) => p.date.getTime() > now.getTime() + 60_000);
}

export async function rescheduleReminders(state: AppState) {
  const N = await ready();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
  if (!state.settings.notifications) return;
  if (!(await N.getPermissionsAsync()).granted) return;
  for (const p of planReminders(state)) {
    await N.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, sound: true },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL_ID },
    });
  }
}

/** Fires a sample nudge in a few seconds so the reminder flow can be demoed. */
export async function sendTestReminder(state: AppState): Promise<boolean> {
  const N = await ready();
  if (!N || !(await requestPermission())) return false;
  const index = buildCountIndex(state.entries);
  const pending = state.habits.filter((h) => !metOn(index, h, dayKey()));
  const h = pending[0] ?? state.habits[0];
  await N.scheduleNotificationAsync({
    content: {
      title: h ? `${h.emoji} Don't forget ${h.name}` : 'Habit check-in',
      body: h ? 'You set the intention earlier today. Tap to log it.' : 'Add a habit to get started.',
      sound: true,
    },
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
  return true;
}
