import type * as N from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * The local-notification subset of expo-notifications, loaded lazily from its individual modules.
 *
 * Importing the package root on Android in Expo Go (SDK 53+) throws, because it eagerly sets up
 * remote push-token registration, which Expo Go no longer supports. Scheduling local reminders is
 * still supported, so we load only those modules. If anything is unavailable, reminders are
 * disabled instead of crashing the app.
 */
export type NotificationsApi = {
  getPermissionsAsync: typeof N.getPermissionsAsync;
  requestPermissionsAsync: typeof N.requestPermissionsAsync;
  scheduleNotificationAsync: typeof N.scheduleNotificationAsync;
  cancelAllScheduledNotificationsAsync: typeof N.cancelAllScheduledNotificationsAsync;
  setNotificationHandler: typeof N.setNotificationHandler;
  setNotificationChannelAsync: typeof N.setNotificationChannelAsync;
  SchedulableTriggerInputTypes: typeof N.SchedulableTriggerInputTypes;
  AndroidImportance: typeof N.AndroidImportance;
};

let api: NotificationsApi | null | undefined;

export function notificationsApi(): NotificationsApi | null {
  if (api !== undefined) return api;
  if (Platform.OS === 'web') return (api = null);
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    api = {
      ...require('expo-notifications/build/NotificationPermissions'),
      ...require('expo-notifications/build/scheduleNotificationAsync'),
      ...require('expo-notifications/build/cancelAllScheduledNotificationsAsync'),
      ...require('expo-notifications/build/NotificationsHandler'),
      ...require('expo-notifications/build/setNotificationChannelAsync'),
      ...require('expo-notifications/build/Notifications.types'),
      ...require('expo-notifications/build/NotificationChannelManager.types'),
    } as NotificationsApi;
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch (e) {
    console.warn('Reminders are unavailable on this build:', e);
    api = null;
  }
  return api;
}
