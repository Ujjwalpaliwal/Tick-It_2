import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Dimensions, ScrollView, Animated,
} from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import type { UserRole } from '@/store/types';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const STEPS = [
  { key: 'welcome', icon: 'sparkles-outline', title: 'Welcome to\nTick-It', subtitle: 'Your AI-powered Eisenhower matrix task tracker.\nPrioritize smarter, execute faster.' },
  { key: 'name', icon: 'person-outline', title: "What's your name?", subtitle: 'We\'ll personalize your experience.' },
  { key: 'role', icon: 'briefcase-outline', title: 'What\'s your role?', subtitle: 'This helps our AI calibrate priority scoring.' },
  { key: 'tour', icon: 'grid-outline', title: 'How it works', subtitle: 'The Eisenhower Matrix sorts tasks into 4 quadrants based on urgency and importance.' },
  { key: 'ready', icon: 'rocket-outline', title: 'You\'re all set!', subtitle: 'Start adding tasks and let AI classify them into the right quadrant.' },
];

const ROLES: { role: UserRole; icon: string; label: string; desc: string }[] = [
  { role: 'founder', icon: 'ribbon-outline', label: 'Founder', desc: 'Lead and review team tasks' },
  { role: 'tech_lead', icon: 'code-slash-outline', label: 'Tech Lead', desc: 'Manage development priorities' },
  { role: 'ui_ux_designer', icon: 'color-palette-outline', label: 'Designer', desc: 'Craft user interfaces' },
  { role: 'backend_developer', icon: 'server-outline', label: 'Backend Dev', desc: 'Build APIs and data models' },
];

const QUADRANT_INFO = [
  { icon: 'flame-outline', label: 'Do First', color: '#FF6B6B', desc: 'Urgent + Important' },
  { icon: 'calendar-outline', label: 'Schedule', color: '#4ECDC4', desc: 'Important, not urgent' },
  { icon: 'people-outline', label: 'Delegate', color: '#FFD93D', desc: 'Urgent, not important' },
  { icon: 'trash-outline', label: 'Eliminate', color: '#95A5A6', desc: 'Neither urgent nor important' },
];

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { setName, setRole, completeOnboarding } = useUserStore();

  const [step, setStep] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentStep = STEPS[step];

  const animateTransition = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(next), 150);
  };

  const handleNext = () => {
    if (step === 1 && nameInput.trim()) {
      setName(nameInput.trim());
    }
    if (step === 2 && selectedRole) {
      setRole(selectedRole);
    }
    if (step === STEPS.length - 1) {
      completeOnboarding();
      router.replace('/(tabs)');
      return;
    }
    animateTransition(step + 1);
  };

  const canProceed = () => {
    if (step === 1) return nameInput.trim().length > 0;
    if (step === 2) return selectedRole !== null;
    return true;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, {
              backgroundColor: i <= step ? Semantic.accent : theme.backgroundSelected,
              width: i === step ? 24 : 8,
            }]}
          />
        ))}
      </View>

      <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View style={{ marginBottom: Spacing.five }}>
          <Ionicons name={currentStep.icon as any} size={64} color={Semantic.accent} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>{currentStep.title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{currentStep.subtitle}</Text>

        {/* Step-specific content */}
        {step === 1 && (
          <View style={styles.inputSection}>
            <TextInput
              style={[styles.nameInput, {
                color: theme.text,
                borderColor: nameInput.trim() ? Semantic.accent : theme.border,
                backgroundColor: theme.surfaceElevated,
              }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.roleGrid}>
            {ROLES.map(r => (
              <Pressable
                key={r.role}
                onPress={() => setSelectedRole(r.role)}
                style={[styles.roleCard, {
                  backgroundColor: selectedRole === r.role ? Semantic.accentBg : theme.surfaceElevated,
                  borderColor: selectedRole === r.role ? Semantic.accent : theme.border,
                }]}
              >
                <Ionicons
                  name={r.icon as any}
                  size={32}
                  color={selectedRole === r.role ? Semantic.accent : theme.textSecondary}
                  style={{ marginBottom: Spacing.two }}
                />
                <Text style={[styles.roleLabel, {
                  color: selectedRole === r.role ? Semantic.accent : theme.text,
                }]}>
                  {r.label}
                </Text>
                <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>{r.desc}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.tourGrid}>
            {QUADRANT_INFO.map((q, i) => (
              <View
                key={i}
                style={[styles.tourCard, {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  borderLeftColor: q.color,
                }]}
              >
                <Ionicons name={q.icon as any} size={28} color={q.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tourLabel, { color: q.color }]}>{q.label}</Text>
                  <Text style={[styles.tourDesc, { color: theme.textSecondary }]}>{q.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {step > 0 && (
          <Pressable
            onPress={() => animateTransition(step - 1)}
            style={[styles.backBtn, { borderColor: theme.border }]}
          >
            <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>← Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          disabled={!canProceed()}
          style={[styles.nextBtn, {
            backgroundColor: canProceed() ? Semantic.accent : theme.backgroundSelected,
            flex: step === 0 ? 1 : undefined,
          }]}
        >
          <Text style={[styles.nextBtnText, {
            color: canProceed() ? '#FFFFFF' : theme.textTertiary,
          }]}>
            {step === STEPS.length - 1 ? 'Get Started →' : 'Continue →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.six,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.nine,
    marginBottom: Spacing.eight,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.five,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.seven,
  },
  // Name input
  inputSection: {
    width: '100%',
    marginTop: Spacing.four,
  },
  nameInput: {
    ...Typography.h3,
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  // Role selection
  roleGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  roleCard: {
    width: '46%',
    borderWidth: 2,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
  },
  roleEmoji: {
    fontSize: 32,
    marginBottom: Spacing.two,
  },
  roleLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  roleDesc: {
    ...Typography.captionSm,
    textAlign: 'center',
  },
  // Tour
  tourGrid: {
    width: '100%',
    gap: Spacing.three,
  },
  tourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  tourEmoji: {
    fontSize: 28,
  },
  tourLabel: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  tourDesc: {
    ...Typography.captionSm,
    marginTop: 2,
  },
  // Navigation
  bottomNav: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.nine,
    paddingTop: Spacing.four,
  },
  backBtn: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  backBtnText: {
    ...Typography.bodyMedium,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  nextBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
});
