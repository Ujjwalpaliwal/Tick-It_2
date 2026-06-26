import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { Colors, Semantic } from '@/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const hydrateTask = useTaskStore(s => s.hydrate);
  const isTaskHydrated = useTaskStore(s => s.isHydrated);
  const hydrateUser = useUserStore(s => s.hydrate);
  const isUserHydrated = useUserStore(s => s.isHydrated);
  const isLoggedIn = useUserStore(s => s.profile.isLoggedIn);
  const onboardingComplete = useUserStore(s => s.profile.onboardingComplete);

  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    Promise.all([hydrateTask(), hydrateUser()]).then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !isTaskHydrated || !isUserHydrated) return;

    const firstSegment = segments[0] as string;
    const inAuthGroup = firstSegment === 'login' || firstSegment === 'register';

    if (!isLoggedIn) {
      if (firstSegment === 'onboarding') {
        router.replace('/login' as any);
      }
    } else if (!onboardingComplete) {
      if (firstSegment !== 'onboarding') {
        router.replace('/onboarding' as any);
      }
    } else {
      if (inAuthGroup || firstSegment === 'onboarding') {
        router.replace('/(tabs)' as any);
      }
    }
  }, [ready, isTaskHydrated, isUserHydrated, isLoggedIn, onboardingComplete, segments]);

  if (!ready || !isTaskHydrated || !isUserHydrated) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Semantic.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="legal" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
