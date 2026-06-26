import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, TextInput, Share, Platform } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { 
    profile, 
    gamification, 
    activeSimulatedMemberId, 
    setSimulatedMember, 
    createStartupOrg, 
    logoutUser,
    resetAll 
  } = useUserStore();

  const [orgInput, setOrgInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyCode = async () => {
    if (profile.startupOrg?.code) {
      await Clipboard.setStringAsync(profile.startupOrg.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleShareLink = async () => {
    if (profile.startupOrg) {
      const inviteUrl = `https://tickit.app/invite/${profile.startupOrg.code}`;
      await Clipboard.setStringAsync(inviteUrl);
      
      try {
        await Share.share({
          message: `Join my startup organization "${profile.startupOrg.name}" on Tick-It Workspace! Use org code: ${profile.startupOrg.code} or click: ${inviteUrl}`,
          url: inviteUrl,
          title: 'Invite to Tick-It',
        });
      } catch (error) {
        // Share sheet failure fallback
      }
      
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const roleLabels: Record<string, string> = {
    founder: '🚀 Founder',
    co_founder: '🤝 Co-Founder',
    tech_lead: '💻 Tech Lead',
    ui_ux_designer: '🎨 UI/UX Designer',
    backend_developer: '💾 Backend Developer',
    ai_engineer: '🧠 AI Engineer',
    marketing_lead: '📢 Marketing Lead',
    team_member: '🧑 Team Member',
  };

  const handleCreateOrg = async () => {
    if (orgInput.trim()) {
      await createStartupOrg(orgInput.trim());
      setOrgInput('');
      const updatedCode = useUserStore.getState().profile.startupOrg?.code;
      Alert.alert('Startup Created!', `Generated ID: ${updatedCode}`);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all tasks, XP, badges, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetAll(),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>Settings & Simulation</Text>

        {!profile.isLoggedIn ? (
          <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, alignItems: 'center' }]}>
            <Text style={{ fontSize: 36, marginBottom: Spacing.three }}>👤</Text>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center', marginBottom: Spacing.two }]}>
              Guest Profile
            </Text>
            <Text style={[styles.descriptionText, { color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.five }]}>
              You are currently browsing in Guest Mode. Log in or create an account to start syncing tasks, creating startup organizations, and collaborating in real-time.
            </Text>
            <Pressable
              onPress={() => router.push('/login' as any)}
              style={[styles.primaryBtn, { backgroundColor: Semantic.accent, width: '100%' }]}
            >
              <Text style={styles.btnText}>Sign In / Register</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Teammate Simulator Panel */}
            {profile.role === 'founder' && (
              <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: Semantic.accent }]}>
                <Text style={[styles.sectionTitle, { color: Semantic.accent }]}>👥 Teammates Simulator Control</Text>
                <Text style={[styles.descriptionText, { color: theme.textSecondary, marginBottom: Spacing.three }]}>
                  Change who you are acting as to test the task assignment loop (In Progress → Request Approval → Founder Review).
                </Text>

                <View style={styles.simulatorOptions}>
                  <Pressable
                    onPress={() => setSimulatedMember(null)}
                    style={[
                      styles.simulatorBtn,
                      activeSimulatedMemberId === null
                        ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                        : { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: activeSimulatedMemberId === null ? '#FFFFFF' : theme.text }}>
                      👑 Act as Founder (You)
                    </Text>
                  </Pressable>

                  {profile.startupOrg?.members.map(m => (
                    <Pressable
                      key={m.id}
                      onPress={() => setSimulatedMember(m.id)}
                      style={[
                        styles.simulatorBtn,
                        activeSimulatedMemberId === m.id
                          ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                          : { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: activeSimulatedMemberId === m.id ? '#FFFFFF' : theme.text }}>
                        {m.avatar} Act as {m.name} ({m.role.split(' ')[0]})
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={[styles.guideBox, { backgroundColor: theme.background }]}>
                  <Text style={[styles.guideTitle, { color: theme.text }]}>How to test assignment loop:</Text>
                  <Text style={[styles.guideText, { color: theme.textSecondary }]}>
                    1. As Founder, assign a task to Rahul (via Task detail sheet).{"\n"}
                    2. Switch role here to Rahul. Start task, complete some subtasks, and hit 'Request Completion'.{"\n"}
                    3. Switch back to Founder. Go to Dashboard and review/approve his request!
                  </Text>
                </View>
              </View>
            )}

            {/* Profile Section */}
            <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three }}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Profile</Text>
                <Pressable 
                  onPress={() => logoutUser()} 
                  style={[styles.logoutBtn, { borderColor: Semantic.danger }]}
                >
                  <Text style={{ color: Semantic.danger, fontSize: 12, fontWeight: '700' }}>Log Out</Text>
                </Pressable>
              </View>

              <View style={styles.profileRow}>
                <View style={[styles.avatar, { backgroundColor: Semantic.accentBg }]}>
                  <Text style={styles.avatarEmoji}>
                    {profile.role ? roleLabels[profile.role]?.split(' ').pop()?.charAt(0) ?? '👤' : '👤'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: theme.text }]}>
                    {profile.name || 'Ujjwal Founder'}
                  </Text>
                  <Text style={[styles.profileRole, { color: theme.textSecondary }]}>
                    {profile.role ? roleLabels[profile.role] : '🚀 Founder'}
                  </Text>
                  {profile.email && (
                    <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 2 }}>
                      {profile.email}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Startup Org Management */}
            <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🏢 Startup Organization</Text>

              {profile.startupOrg ? (
                <View style={{ gap: Spacing.two }}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Org Name</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{profile.startupOrg.name}</Text>
                  </View>

                  <View style={[styles.inviteCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two }}>
                      <Ionicons name="people-outline" size={18} color={Semantic.accent} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Invite Teammates</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: Spacing.three }}>
                      Share this organization code or invite link with your co-founders and developers to sync tasks.
                    </Text>

                    <View style={styles.codeShareRow}>
                      <View style={[styles.codeDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.codeText, { color: theme.text }]}>{profile.startupOrg.code}</Text>
                      </View>
                      <Pressable 
                        onPress={handleCopyCode} 
                        style={[styles.actionBtnIcon, { backgroundColor: Semantic.accentBg }]}
                      >
                        <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={14} color={Semantic.accent} />
                        <Text style={{ color: Semantic.accent, fontSize: 12, fontWeight: '700' }}>
                          {codeCopied ? "Copied" : "Copy Code"}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={[styles.codeShareRow, { marginTop: Spacing.two }]}>
                      <View style={[styles.linkDisplay, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
                        <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 11 }}>
                          https://tickit.app/invite/{profile.startupOrg.code}
                        </Text>
                      </View>
                      <Pressable 
                        onPress={handleShareLink} 
                        style={[styles.actionBtnIcon, { backgroundColor: Semantic.accent }]}
                      >
                        <Ionicons name={linkCopied ? "checkmark" : "share-social-outline"} size={14} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                          {linkCopied ? "Copied" : "Share Link"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                profile.role === 'founder' ? (
                  <View style={{ gap: Spacing.two }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: Spacing.one }}>
                      You do not belong to a Startup Org. Create one below to load team workloads.
                    </Text>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                      placeholder="e.g. Ujjwalit Technologies"
                      placeholderTextColor={theme.textTertiary}
                      value={orgInput}
                      onChangeText={setOrgInput}
                    />
                    <Pressable onPress={handleCreateOrg} style={[styles.primaryBtn, { backgroundColor: Semantic.accent }]}>
                      <Text style={styles.btnText}>Generate Startup ID</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: Spacing.two }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                      You do not belong to a Startup Org. Please ask your Startup Founder to share the organization invitation code.
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* Danger Zone */}
            {profile.role === 'founder' && (
              <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: Semantic.danger }]}>
                <Text style={[styles.sectionTitle, { color: Semantic.danger }]}>Danger Zone</Text>
                <Pressable onPress={handleReset} style={[styles.dangerBtn, { backgroundColor: Semantic.dangerBg }]}>
                  <Text style={[styles.dangerBtnText, { color: Semantic.danger }]}>🗑 Reset All Workspace Data</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About Tick-It OS</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Platform</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>Tick-It Workspace</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>1.2.0 (Team edition)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>AI Simulation</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>Local intent parser</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <Pressable onPress={() => router.push('/legal' as any)} style={styles.legalRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Legal</Text>
            <Text style={[styles.legalRowRight, { color: Semantic.accent }]}>
              Privacy & Terms →
            </Text>
          </Pressable>
        </View>

        {/* Danger Zone */}
        {profile.role === 'founder' && (
          <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: Semantic.danger }]}>
            <Text style={[styles.sectionTitle, { color: Semantic.danger }]}>Danger Zone</Text>
            <Pressable onPress={handleReset} style={[styles.dangerBtn, { backgroundColor: Semantic.dangerBg }]}>
              <Text style={[styles.dangerBtnText, { color: Semantic.danger }]}>🗑 Reset All Workspace Data</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.three,
  },
  section: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.three,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.three,
  },
  descriptionText: {
    ...Typography.caption,
    lineHeight: 16,
  },
  simulatorOptions: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  simulatorBtn: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  guideBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  guideTitle: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 10,
    lineHeight: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  profileRole: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
  },
  primaryBtn: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  infoLabel: {
    ...Typography.bodySm,
  },
  infoValue: {
    ...Typography.bodySmMedium,
  },
  dangerBtn: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  dangerBtnText: {
    ...Typography.bodySmMedium,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  legalRowRight: {
    fontSize: 13,
    fontWeight: '700',
  },
  inviteCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.two,
  },
  codeShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  codeDisplay: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  codeText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    letterSpacing: 1,
  },
  linkDisplay: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  actionBtnIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    minWidth: 110,
  },
});

