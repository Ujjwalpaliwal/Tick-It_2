import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import QuadrantBoard from '@/components/QuadrantBoard';

export default function BoardScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <QuadrantBoard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
