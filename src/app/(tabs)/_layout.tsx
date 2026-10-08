import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';

import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const { state } = useStore();
  const c = useColors();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  const activeChallenges = state.challenges.filter((ch) => ch.status === 'active').length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('checkmark-circle') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: icon('trophy'),
          tabBarBadge: activeChallenges || undefined,
          tabBarBadgeStyle: { backgroundColor: c.gold },
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-sharp') }} />
    </Tabs>
  );
}
