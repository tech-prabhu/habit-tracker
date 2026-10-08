# Habit Tracker

A habit tracker built with Expo and React Native. It runs fully offline and keeps every bit of data on the device.

## Features

- **Today**: log habits that are done once a day (check) or several times a day (count, e.g. 8 glasses of water). Logging is rewarded with haptics, sounds and confetti.
- **Progress**: streaks, best streaks, a completion heatmap and a history for each habit.
- **Challenges**: 3, 7, 14 and 30-day streak challenges that earn trophies.
- **Reminders**: a morning intention prompt, a reminder for each habit, and an evening check-in that lists only the habits still open.
- **Onboarding**: choose from preset habits and start a first challenge.
- Light and dark mode. Data is stored on the device with AsyncStorage.

## Tech stack

Expo SDK 57 · React Native 0.86 · React 19 (React Compiler) · Expo Router (typed routes) · TypeScript · expo-notifications · expo-audio · expo-haptics · Reanimated

## Getting started

```bash
npm install
npx expo start
```

Then open the app in Expo Go, an emulator or simulator, or a web browser.

> Local reminders work in Expo Go. Push notifications are not used.

## Scripts

```bash
npx expo start        # dev server
npx expo lint         # lint
npx tsc --noEmit      # typecheck
node scripts/generate-sounds.js   # regenerate assets/sounds/*.wav
```

## Project structure

```
src/
  app/          Expo Router screens: (tabs)/ for Today, Progress, Challenges and Settings, plus onboarding and habit-form
  components/   UI pieces: habit card, progress ring, confetti, celebration
  lib/          state store, data model, dates, reminders, feedback, theme
scripts/        sound synthesis
```

## License

MIT
