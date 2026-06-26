import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface AuthRequiredProps {
  title: string;
  description: string;
  emoji?: string;
  iconName?: string;
}

export default function AuthRequired({ title, description, emoji, iconName }: AuthRequiredProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  // Subtle bounce animation for the card
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(bounceAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const glowColor1 = isDark ? '#8B5CF6' : '#A78BFA';
  const glowColor2 = isDark ? '#3498DB' : '#60A5FA';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background Glowing Orbs */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow1" cx="25%" cy="30%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={glowColor1} stopOpacity={isDark ? 0.18 : 0.12} />
            <Stop offset="100%" stopColor={glowColor1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow2" cx="75%" cy="70%" rx="55%" ry="55%">
            <Stop offset="0%" stopColor={glowColor2} stopOpacity={isDark ? 0.15 : 0.08} />
            <Stop offset="100%" stopColor={glowColor2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow1)" />
        <Rect width="100%" height="100%" fill="url(#glow2)" />
      </Svg>

      {/* Glassmorphic Animated Container */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(30, 30, 54, 0.45)' : 'rgba(255, 255, 255, 0.75)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.15)',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: bounceAnim }],
          },
        ]}
      >
        <View style={[styles.emojiContainer, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)' }]}>
          {iconName ? (
            <Ionicons name={iconName as any} size={36} color={Semantic.accent} />
          ) : (
            <Text style={styles.emoji}>{emoji || '🔒'}</Text>
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
        
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => router.push('/login' as any)}
          style={[styles.button, { backgroundColor: Semantic.accent }]}
        >
          <Text style={styles.buttonText}>Sign In / Register</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: Spacing.six,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    ...Typography.h2,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.three,
    letterSpacing: -0.2,
  },
  description: {
    ...Typography.bodySm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.seven,
  },
  button: {
    width: '100%',
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Semantic.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
