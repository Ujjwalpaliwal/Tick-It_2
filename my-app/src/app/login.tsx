import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEMO_ACCOUNTS = [
  { label: 'Founder', emoji: '👑', email: 'founder@tickit.app', password: 'founder123', color: '#8B5CF6' },
  { label: 'Tech Lead', emoji: '💻', email: 'techlead@tickit.app', password: 'techlead123', color: '#4ECDC4' },
  { label: 'Designer', emoji: '🎨', email: 'designer@tickit.app', password: 'designer123', color: '#FFD93D' },
  { label: 'Backend Dev', emoji: '💾', email: 'backend@tickit.app', password: 'backend123', color: '#FF6B6B' },
  { label: 'AI Engineer', emoji: '🧠', email: 'ai@tickit.app', password: 'ai123', color: '#3498DB' },
  { label: 'Marketer', emoji: '📢', email: 'marketing@tickit.app', password: 'marketing123', color: '#2ECC71' },
];

export default function LoginScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { loginUser } = useUserStore();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (eEmail = email, ePassword = password) => {
    if (!eEmail.trim() || !ePassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(eEmail.trim(), ePassword.trim());
      if (!res.success) {
        setError(res.error || 'Authentication failed');
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    await handleLogin(account.email, account.password);
  };

  const glowColor1 = scheme === 'dark' ? '#1E1B4B' : '#FFE4E6';
  const glowColor2 = scheme === 'dark' ? '#0F172A' : '#E0F2FE';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow1" cx="20%" cy="25%" rx="55%" ry="55%">
            <Stop offset="0%" stopColor={glowColor1} stopOpacity={scheme === 'dark' ? 0.35 : 0.6} />
            <Stop offset="100%" stopColor={glowColor1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow2" cx="80%" cy="75%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor={glowColor2} stopOpacity={scheme === 'dark' ? 0.32 : 0.5} />
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
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🧠</Text>
          <Text style={[styles.title, { color: theme.text }]}>Tick-It OS</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            AI-Calibrated Eisenhower Matrix Task Space
          </Text>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: Semantic.dangerBg, borderColor: Semantic.danger }]}>
            <Text style={[styles.errorText, { color: Semantic.danger }]}>⚠️ {error}</Text>
          </View>
        )}

        <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
          <TextInput
            style={[styles.input, {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSelected,
            }]}
            value={email}
            onChangeText={setEmail}
            placeholder="name@startup.com"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.four }]}>Password</Text>
          <TextInput
            style={[styles.input, {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSelected,
            }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.textTertiary}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={({ pressed }) => [
              styles.loginBtn, 
              { 
                backgroundColor: Semantic.orangeRed,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In →</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/register' as any)} style={styles.registerLink}>
            <Text style={[styles.registerLinkText, { color: Semantic.orangeRed }]}>
              Don&apos;t have an account? Create one
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/legal' as any)} style={styles.legalLink}>
            <Text style={[styles.legalLinkText, { color: theme.textTertiary }]}>
              Privacy Policy & Terms of Use
            </Text>
          </Pressable>
        </View>

        {/* Demo Roles Grid */}
        <View style={[styles.demoSection, { borderColor: theme.border }]}>
          <Text style={[styles.demoTitle, { color: theme.text }]}>Quick Simulation Access</Text>
          <Text style={[styles.demoSubtitle, { color: theme.textSecondary }]}>
            Click any role to log in with seeded team workspace settings immediately:
          </Text>

          <View style={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((account) => (
              <Pressable
                key={account.email}
                onPress={() => handleDemoLogin(account)}
                style={({ pressed }) => [
                  styles.demoCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }
                ]}
              >
                <View style={[styles.demoEmojiBadge, { backgroundColor: account.color + '15' }]}>
                  <Text style={styles.demoEmoji}>{account.emoji}</Text>
                </View>
                <Text style={[styles.demoLabel, { color: theme.text }]}>{account.label}</Text>
                <Text style={[styles.demoEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                  {account.email}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.nine,
    paddingBottom: Spacing.eight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  title: {
    ...Typography.hero,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySm,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  inputLabel: {
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
    marginBottom: Spacing.two,
  },
  loginBtn: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  registerLinkText: {
    ...Typography.bodySmMedium,
    fontWeight: '600',
  },
  legalLink: {
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
  },
  legalLinkText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  errorBox: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  errorText: {
    ...Typography.bodySmMedium,
  },
  demoSection: {
    width: '100%',
    maxWidth: 400,
    marginTop: Spacing.six,
    paddingTop: Spacing.five,
    borderTopWidth: 1,
  },
  demoTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  demoSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.four,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  demoCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
  },
  demoEmojiBadge: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  demoEmoji: {
    fontSize: 20,
  },
  demoLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  demoEmail: {
    fontSize: 10,
    marginTop: 2,
    maxWidth: '100%',
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
