import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useUserStore } from '@/store/userStore';
import GamificationHub from '@/components/GamificationHub';
import AuthRequired from '@/components/AuthRequired';

export default function StatsScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { profile } = useUserStore();

  if (!profile.isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <AuthRequired
          emoji="🏆"
          title="Simulated Team Stats"
          description="Sign in to view workspace gamification levels, activity badges, and founder consistency."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <GamificationHub />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
