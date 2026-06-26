import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import SettingsScreen from '@/components/SettingsScreen';

export default function SettingsTab() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <SettingsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
