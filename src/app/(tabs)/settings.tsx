import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Row, SectionTitle, TimeStepper, ToggleRow } from '@/components/ui';
import { formatMinutes } from '@/lib/dates';
import { requestPermission, sendTestReminder } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function SettingsScreen() {
  const c = useColors();
  const { state, dispatch } = useStore();
  const { settings } = state;
  const update = (s: Partial<typeof settings>) => dispatch({ type: 'updateSettings', settings: s });

  const toggleNotifications = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      Alert.alert('Notifications are off', 'Allow notifications for Expo Go in your phone settings to get reminders.');
      return;
    }
    update({ notifications: on });
  };

  const testReminder = async () => {
    const ok = await sendTestReminder(state);
    Alert.alert(
      ok ? 'Reminder on its way' : 'Notifications are off',
      ok ? 'Lock your phone or go to the home screen. It arrives in 5 seconds.' : 'Allow notifications in your phone settings first.',
    );
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <SectionTitle>Reminders</SectionTitle>
      <Card>
        <ToggleRow
          label="Daily check-ins"
          hint="A morning nudge to set your intention and an evening reminder for anything left."
          value={settings.notifications}
          onChange={toggleNotifications}
        />
        {settings.notifications && (
          <>
            <Row label="Morning">
              <TimeStepper value={settings.morningMinutes} onChange={(m) => update({ morningMinutes: m })} />
            </Row>
            <Row label="Evening">
              <TimeStepper value={settings.eveningMinutes} onChange={(m) => update({ eveningMinutes: m })} />
            </Row>
          </>
        )}
        <Button title="Send a test reminder" variant="secondary" onPress={testReminder} style={{ marginTop: 8 }} />
      </Card>

      <SectionTitle>Rewards</SectionTitle>
      <Card>
        <ToggleRow label="Sounds" value={settings.sound} onChange={(v) => update({ sound: v })} />
        <ToggleRow label="Haptics" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
      </Card>

      <SectionTitle>Habits</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {state.habits.map((h, i) => (
          <Pressable
            key={h.id}
            onPress={() => router.push({ pathname: '/habit-form', params: { id: h.id } })}
            style={[styles.habitRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
            <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 16 }}>{h.name}</Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                {h.kind === 'count' ? `${h.target} ${h.unit} a day` : 'Once a day'}
                {h.reminder != null ? ` · ⏰ ${formatMinutes(h.reminder)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/habit-form')} style={styles.habitRow}>
          <Ionicons name="add-circle" size={22} color={c.accent} />
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>New habit</Text>
        </Pressable>
      </Card>

      <SectionTitle>Demo</SectionTitle>
      <Card style={{ gap: 8 }}>
        <Text style={{ color: c.muted }}>Tools for showing the app off.</Text>
        <Button
          title="Fill 60 days of sample history"
          variant="secondary"
          onPress={() => dispatch({ type: 'loadSampleHistory' })}
        />
        <Button
          title="Replay onboarding"
          variant="secondary"
          onPress={() => Alert.alert('Replay onboarding?', 'This erases all habits, history and trophies.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Erase and restart', style: 'destructive', onPress: () => dispatch({ type: 'reset' }) },
          ])}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
