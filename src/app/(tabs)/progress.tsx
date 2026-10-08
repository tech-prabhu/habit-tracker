import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import { addDays, dayKey, daysAgo, formatClock, friendlyDay, parseDay, WEEKDAY_LETTERS } from '@/lib/dates';
import { bestStreak, completionOn, countOn, currentStreak, type Entry } from '@/lib/model';
import { useStore } from '@/lib/store';
import { type Colors, useColors } from '@/lib/theme';

const HEATMAP_WEEKS = 15;

export default function ProgressScreen() {
  const c = useColors();
  const { state, index } = useStore();
  const [filter, setFilter] = useState<string | null>(null);
  const [logDays, setLogDays] = useState(14);

  const habits = filter ? state.habits.filter((h) => h.id === filter) : state.habits;
  const today = dayKey();

  const stats = useMemo(() => {
    const ratios = Array.from({ length: 30 }, (_, i) => completionOn(index, habits, daysAgo(i))).filter(
      (r): r is number => r !== null,
    );
    const ids = new Set(habits.map((h) => h.id));
    return {
      current: Math.max(0, ...habits.map((h) => currentStreak(index, h))),
      best: Math.max(0, ...habits.map((h) => bestStreak(index, h))),
      consistency: ratios.length ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) : 0,
      total: state.entries.filter((e) => ids.has(e.habitId)).length,
    };
  }, [habits, index, state.entries]);

  const byDay = useMemo(() => {
    const ids = new Set(habits.map((h) => h.id));
    const map = new Map<string, Entry[]>();
    for (const e of state.entries) {
      if (!ids.has(e.habitId)) continue;
      map.set(e.day, [...(map.get(e.day) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [habits, state.entries]);

  if (state.habits.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 48 }}>📈</Text>
        <Text style={{ color: c.muted, textAlign: 'center' }}>Add a habit and start logging to see your progress.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All habits" selected={filter === null} onPress={() => setFilter(null)} />
        {state.habits.map((h) => (
          <Chip
            key={h.id}
            label={`${h.emoji} ${h.name}`}
            color={h.color}
            selected={filter === h.id}
            onPress={() => setFilter(h.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.tiles}>
        <Stat label="Current streak" value={`🔥 ${stats.current}`} c={c} />
        <Stat label="Best streak" value={`⭐ ${stats.best}`} c={c} />
        <Stat label="30-day consistency" value={`${stats.consistency}%`} c={c} />
        <Stat label="Total check-ins" value={String(stats.total)} c={c} />
      </View>

      <SectionTitle>Last 14 days</SectionTitle>
      <Card>
        <View style={styles.bars}>
          {Array.from({ length: 14 }, (_, i) => daysAgo(13 - i)).map((day) => {
            const ratio = completionOn(index, habits, day) ?? 0;
            return (
              <View key={day} style={styles.barCol}>
                <View style={[styles.barTrack, { backgroundColor: c.cardAlt }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(ratio * 100, ratio > 0 ? 6 : 0)}%`,
                        backgroundColor: ratio >= 1 ? c.accent : c.accent + '88',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: day === today ? c.text : c.muted }]}>
                  {WEEKDAY_LETTERS[parseDay(day).getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={{ color: c.muted, fontSize: 13, marginTop: 10 }}>
          Share of {filter ? 'the goal' : 'habits'} completed each day. Full green = 100%.
        </Text>
      </Card>

      <SectionTitle>Consistency map</SectionTitle>
      <Card>
        <Heatmap habitsRatio={(day) => completionOn(index, habits, day)} c={c} />
        <View style={styles.legend}>
          <Text style={{ color: c.muted, fontSize: 12 }}>Less</Text>
          {[0, 0.34, 0.67, 1].map((r) => (
            <View key={r} style={[styles.cell, { backgroundColor: heatColor(r, c) }]} />
          ))}
          <Text style={{ color: c.muted, fontSize: 12 }}>More</Text>
        </View>
      </Card>

      <SectionTitle>Log</SectionTitle>
      {byDay.length === 0 && <Text style={{ color: c.muted, marginLeft: 4 }}>Nothing logged yet.</Text>}
      {byDay.slice(0, logDays).map(([day, entries]) => (
        <Card key={day} style={{ gap: 8 }}>
          <Text style={[styles.logDay, { color: c.text }]}>{friendlyDay(day)}</Text>
          {state.habits
            .filter((h) => entries.some((e) => e.habitId === h.id))
            .map((h) => {
              const n = countOn(index, h.id, day);
              const last = Math.max(...entries.filter((e) => e.habitId === h.id).map((e) => e.at));
              return (
                <View key={h.id} style={styles.logRow}>
                  <Text style={{ fontSize: 18 }}>{h.emoji}</Text>
                  <Text style={{ color: c.text, flex: 1 }} numberOfLines={1}>
                    {h.name}
                    {h.kind === 'count' ? `  ${n}/${h.target}` : ''}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 13 }}>{formatClock(last)}</Text>
                  <Text style={{ color: n >= h.target ? c.accent : c.muted, fontWeight: '700', width: 18 }}>
                    {n >= h.target ? '✓' : '…'}
                  </Text>
                </View>
              );
            })}
        </Card>
      ))}
      {byDay.length > logDays && (
        <Button title="Show more" variant="secondary" onPress={() => setLogDays((n) => n + 14)} />
      )}
    </ScrollView>
  );
}

function Stat({ label, value, c }: { label: string; value: string; c: Colors }) {
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileValue, { color: c.text }]}>{value}</Text>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
    </Card>
  );
}

function heatColor(ratio: number | null, c: Colors): string {
  if (ratio === null || ratio === 0) return c.cardAlt;
  if (ratio < 0.34) return c.accent + '44';
  if (ratio < 0.67) return c.accent + '88';
  if (ratio < 1) return c.accent + 'BB';
  return c.accent;
}

/** GitHub-style grid: one column per week, one row per weekday. */
function Heatmap({ habitsRatio, c }: { habitsRatio: (day: string) => number | null; c: Colors }) {
  const today = dayKey();
  const lastSunday = addDays(today, -parseDay(today).getDay());
  const firstSunday = addDays(lastSunday, -7 * (HEATMAP_WEEKS - 1));
  return (
    <View style={styles.heatmap}>
      {Array.from({ length: HEATMAP_WEEKS }, (_, w) => (
        <View key={w} style={styles.heatCol}>
          {Array.from({ length: 7 }, (_, d) => {
            const day = addDays(firstSunday, w * 7 + d);
            return (
              <View
                key={d}
                style={[
                  styles.cell,
                  {
                    backgroundColor: day > today ? 'transparent' : heatColor(habitsRatio(day), c),
                    borderWidth: day === today ? 1.5 : 0,
                    borderColor: c.text,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  chips: { gap: 8, paddingBottom: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  tileValue: { fontSize: 26, fontWeight: '800' },
  bars: { flexDirection: 'row', height: 120, gap: 5 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, fontWeight: '600' },
  heatmap: { flexDirection: 'row', justifyContent: 'space-between' },
  heatCol: { gap: 4 },
  cell: { width: 16, height: 16, borderRadius: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 12 },
  logDay: { fontWeight: '700', fontSize: 15 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
