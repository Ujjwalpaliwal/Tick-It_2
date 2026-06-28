import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, Dimensions
} from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import type { UserRole } from '@/store/types';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ROLES: { role: UserRole; emoji: string; label: string; desc: string }[] = [
  { role: 'founder', emoji: '👑', label: 'Founder', desc: 'Lead and review team tasks' },
  { role: 'co_founder', emoji: '🤝', label: 'Co-Founder', desc: 'Co-lead and align strategies' },
  { role: 'tech_lead', emoji: '💻', label: 'Tech Lead', desc: 'Manage development priorities' },
  { role: 'ui_ux_designer', emoji: '🎨', label: 'Designer', desc: 'Craft user interfaces' },
  { role: 'backend_developer', emoji: '💾', label: 'Backend Dev', desc: 'Build APIs and data models' },
  { role: 'ai_engineer', emoji: '🧠', label: 'AI Engineer', desc: 'Model and agent calibrations' },
  { role: 'marketing_lead', emoji: '📢', label: 'Marketing Lead', desc: 'Outreach and user acquisition' },
  { role: 'team_member', emoji: '🧑', label: 'Team Member', desc: 'Standard workspace execution' },
];

export default function RegisterScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { registerUser } = useUserStore();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-generate code for founders when they type org name
  useEffect(() => {
    if ((selectedRole === 'founder' || selectedRole === 'co_founder') && orgName.trim() && step === 3) {
      if (!orgCode) {
        const cleanName = orgName.replace(/[^a-zA-Z]/g, '');
        const prefix = cleanName.slice(0, 3).toUpperCase() || 'ORG';
        const num = Math.floor(1000 + Math.random() * 9000);
        setOrgCode(`${prefix}-${num}`);
      }
    }
  }, [orgName, selectedRole, step]);

  const animateTransition = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      setError(null);
      setStep(nextStep);
    }, 150);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      animateTransition(2);
    } else if (step === 2) {
      if (!selectedRole) {
        setError('Please select a role');
        return;
      }
      // If switching role, reset org code so it regenerates
      if (selectedRole === 'founder' || selectedRole === 'co_founder') {
        setOrgCode('');
      } else {
        setOrgCode('');
      }
      animateTransition(3);
    }
  };

  const handleRegister = async () => {
    if (!orgName.trim() || !orgCode.trim()) {
      setError('Please fill in all organization details');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await registerUser(
        name.trim(),
        email.trim(),
        password,
        selectedRole!,
        orgName.trim(),
        orgCode.trim().toUpperCase()
      );

      if (!res.success) {
        setError(res.error || 'Registration failed');
      } else {
        router.replace('/onboarding' as any);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isLeadership = selectedRole === 'founder' || selectedRole === 'co_founder';

  const glowColor1 = scheme === 'dark' ? '#8B5CF6' : '#A78BFA';
  const glowColor2 = scheme === 'dark' ? '#3498DB' : '#60A5FA';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow1" cx="20%" cy="25%" rx="55%" ry="55%">
            <Stop offset="0%" stopColor={glowColor1} stopOpacity={scheme === 'dark' ? 0.15 : 0.1} />
            <Stop offset="100%" stopColor={glowColor1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow2" cx="80%" cy="75%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor={glowColor2} stopOpacity={scheme === 'dark' ? 0.12 : 0.08} />
            <Stop offset="100%" stopColor={glowColor2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow1)" />
        <Rect width="100%" height="100%" fill="url(#glow2)" />
      </Svg>

      <Pressable
        onPress={() => router.replace('/(tabs)' as any)}
        style={[styles.closeButton, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
      >
        <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕ Close</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top > 0 ? insets.top + Spacing.four : Spacing.nine }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator dots */}
        <View style={styles.dotsRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.dot, {
                backgroundColor: s <= step ? Semantic.accent : theme.border,
                width: s === step ? 20 : 6,
              }]}
            />
          ))}
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {error && (
            <View style={[styles.errorBox, { backgroundColor: Semantic.dangerBg, borderColor: Semantic.danger }]}>
              <Text style={[styles.errorText, { color: Semantic.danger }]}>⚠️ {error}</Text>
            </View>
          )}

          <View style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {step === 1 && (
              <View style={styles.stepContainer}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Create your account</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                  Join Tick-It to align priorities and collaborate.
                </Text>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Alex Johnson"
                  placeholderTextColor={theme.textTertiary}
                />

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing.three }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="alex@startup.com"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing.three }]}>Password</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            {step === 2 && (
              <View style={styles.stepContainer}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>What is your role?</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                  Choose your primary role. This governs permissions and AI priorities.
                </Text>

                <View style={styles.roleGrid}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r.role}
                      onPress={() => {
                        setSelectedRole(r.role);
                        setError(null);
                      }}
                      style={({ pressed }) => [
                        styles.roleCard,
                        {
                          backgroundColor: selectedRole === r.role ? Semantic.accentBg : theme.backgroundSelected,
                          borderColor: selectedRole === r.role ? Semantic.accent : theme.border,
                          opacity: pressed ? 0.95 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        }
                      ]}
                    >
                      <Text style={styles.roleEmoji}>{r.emoji}</Text>
                      <Text style={[styles.roleLabel, {
                        color: selectedRole === r.role ? Semantic.accent : theme.text,
                      }]}>
                        {r.label}
                      </Text>
                      <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>{r.desc}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.stepContainer}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>
                  {isLeadership ? 'Set up your Startup' : 'Align with your Team'}
                </Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                  {isLeadership
                    ? 'Define your organization. We will generate an invite code for your teammates.'
                    : 'Enter the organization details and Startup ID Code shared by your founder.'}
                </Text>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Organization Name</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="e.g. Ujjwalit Technologies"
                  placeholderTextColor={theme.textTertiary}
                />

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing.three }]}>Startup ID Code</Text>
                {isLeadership ? (
                  <View style={[styles.codeDisplayBox, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                    <Text style={[styles.codeText, { color: Semantic.accent }]}>
                      {orgCode || 'Auto-generated code'}
                    </Text>
                    <Text style={[styles.codeSub, { color: theme.textSecondary }]}>
                      Give this code to teammates so they can join your workspace.
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSelected, fontWeight: '700' }]}
                    value={orgCode}
                    onChangeText={setOrgCode}
                    placeholder="e.g. UJT-4938"
                    placeholderTextColor={theme.textTertiary}
                    autoCapitalize="characters"
                  />
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {step > 1 ? (
            <Pressable
              onPress={() => animateTransition(step - 1)}
              style={({ pressed }) => [
                styles.backBtn, 
                { 
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>← Back</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/login' as any)}
              style={({ pressed }) => [
                styles.backBtn, 
                { 
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>Sign In</Text>
            </Pressable>
          )}

          {step < 3 ? (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextBtn, 
                { 
                  backgroundColor: Semantic.accent,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={styles.nextBtnText}>Continue →</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [
                styles.nextBtn, 
                { 
                  backgroundColor: Semantic.accent,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.nextBtnText}>
                  {isLeadership ? 'Create Team' : 'Join Team'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.eight,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.five,
    marginBottom: Spacing.five,
  },
  dot: {
    height: 6,
    borderRadius: Radius.full,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  stepContainer: {
    width: '100%',
  },
  stepTitle: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  stepSubtitle: {
    ...Typography.bodySm,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.five,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    fontSize: 14,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
    width: '100%',
  },
  roleCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  roleEmoji: {
    fontSize: 24,
    marginBottom: Spacing.one,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
  codeDisplayBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: Spacing.one,
  },
  codeSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginTop: Spacing.six,
    gap: Spacing.four,
  },
  backBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  nextBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  errorBox: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  errorText: {
    ...Typography.bodySmMedium,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    zIndex: 100,
  },
  closeButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
