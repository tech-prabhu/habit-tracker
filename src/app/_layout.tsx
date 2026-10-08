import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ChallengeCelebration } from '@/components/challenge-celebration';
import { FeedbackProvider } from '@/lib/feedback';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <FeedbackProvider>
          <AppStack />
          <ChallengeCelebration />
        </FeedbackProvider>
      </StoreProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function AppStack() {
  const { loaded } = useStore();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="habit-form" options={{ presentation: 'modal', title: 'Habit' }} />
    </Stack>
  );
}
