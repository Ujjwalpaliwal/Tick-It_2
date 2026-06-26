import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Radius, Spacing, Semantic } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <Ionicons
        name={focused ? (icon as any) : (`${icon}-outline` as any)}
        size={16}
        color={focused ? Semantic.accent : theme.textTertiary}
        style={{ marginBottom: 2 }}
      />
      <Text style={[styles.tabLabel, {
        color: focused ? Semantic.accent : theme.textTertiary,
        fontWeight: focused ? '700' : '500',
      }]}>
        {label}
      </Text>
      {focused && <View style={[styles.tabDot, { backgroundColor: Semantic.accent }]} />}
    </View>
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="grid" label="Board" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="rocket" label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="git-network" label="Timeline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="intelligence"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="hardware-chip" label="AI Hub" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="aperture" label="Focus" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="trophy" label="Stats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="settings" label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    minWidth: 42,
  },
  tabItemFocused: {},
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 0.1,
  },
  tabDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
  },
});

