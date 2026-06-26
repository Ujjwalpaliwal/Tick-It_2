import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, SafeAreaView,
} from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'privacy' | 'terms';

const PRIVACY_SECTIONS = [
  {
    icon: 'document-text-outline',
    title: 'Information We Collect',
    body:
      'We collect information you provide directly to us when you create an account, such as your name, email address, and role within your startup. We also collect task data, project information, and usage analytics to improve the service. We do not sell, rent, or trade your personal information to third parties.',
  },
  {
    icon: 'lock-open-outline',
    title: 'How We Use Your Information',
    body:
      'Your information is used exclusively to provide and improve the Tick-It Workspace experience. This includes personalizing your task dashboard, generating AI-driven priority insights, syncing startup organization data across team members, and sending optional productivity reminders. We use aggregated, anonymized analytics to understand usage patterns.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Data Security',
    body:
      'We implement industry-standard security measures, including encrypted data transmission (TLS), secure password hashing (bcrypt), and access control per workspace. Your data is stored on servers with restricted access. While we strive to protect your personal information, no method of transmission over the Internet is 100% secure.',
  },
  {
    icon: 'people-outline',
    title: 'Data Sharing & Team Workspaces',
    body:
      'Within a Startup Organization, task data, mentions, and assignments are visible to all members of that organization. You control which workspace (Personal or Startup) your tasks are created in. Personal workspace tasks are never shared with your startup team. You may manage your sharing preferences in the Settings screen.',
  },
  {
    icon: 'settings-outline',
    title: 'Cookies & Local Storage',
    body:
      'Tick-It uses device-local storage and secure session tokens to maintain your login state and cache workspace data for offline access. We do not use third-party tracking cookies or advertising cookies. You may clear app data via your device settings at any time.',
  },
  {
    icon: 'checkbox-outline',
    title: 'Your Rights',
    body:
      'You have the right to access, correct, or delete your personal information at any time. You may export your data or request permanent deletion by contacting us. Upon account deletion, all your personal data will be removed from our systems within 30 days, except where we are legally required to retain it.',
  },
  {
    icon: 'notifications-outline',
    title: 'Changes to This Policy',
    body:
      'We may update this Privacy Policy from time to time. We will notify you of significant changes via in-app notifications or email. Your continued use of Tick-It after updates constitutes your acceptance of the revised policy. We recommend reviewing this page periodically.',
  },
  {
    icon: 'mail-outline',
    title: 'Contact Us',
    body:
      'If you have questions about this Privacy Policy or how your data is handled, please contact our privacy team at privacy@tickit.app. We aim to respond to all inquiries within 48 hours on business days.',
  },
];

const TERMS_SECTIONS = [
  {
    icon: 'checkmark-circle-outline',
    title: 'Acceptance of Terms',
    body:
      'By accessing or using Tick-It Workspace, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any part of these terms, you may not use our application. These terms apply to all users, including individuals, startup teams, and hackathon participants.',
  },
  {
    icon: 'bulb-outline',
    title: 'Use of the Service',
    body:
      'Tick-It Workspace is an AI-powered productivity and startup execution platform. You agree to use the service only for lawful purposes and in a manner that does not infringe the rights of others. You must not use the application to distribute harmful content, attempt unauthorized access, or interfere with the operation of our servers.',
  },
  {
    icon: 'person-outline',
    title: 'Account Responsibilities',
    body:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account. We are not liable for any loss resulting from unauthorized use of your account before you have notified us.',
  },
  {
    icon: 'business-outline',
    title: 'Startup Organizations',
    body:
      'The Founder who creates a Startup Organization is responsible for their team\'s compliance with these Terms. Founders grant team members access to shared workspaces and task boards. Misuse of team features, including unauthorized data access or workspace manipulation, may result in termination of the organization\'s account.',
  },
  {
    icon: 'hardware-chip-outline',
    title: 'AI Features & Accuracy',
    body:
      'Tick-It offers AI-assisted task prioritization and insights. These features are provided "as-is" for informational purposes. AI-generated suggestions are not guaranteed to be accurate or suitable for your specific needs. You are solely responsible for the decisions you make based on AI insights. We are not liable for any losses resulting from reliance on AI-generated content.',
  },
  {
    icon: 'ribbon-outline',
    title: 'Intellectual Property',
    body:
      'All content, features, and functionality of Tick-It Workspace — including the interface design, algorithms, Tick-It system, and branding — are the intellectual property of Tick-It and are protected by applicable copyright and trademark laws. You may not copy, modify, or distribute any part of our application without prior written consent.',
  },
  {
    icon: 'alert-circle-outline',
    title: 'Limitation of Liability',
    body:
      'Tick-It is provided on an "as-is" and "as-available" basis without warranties of any kind. We do not guarantee uninterrupted, error-free service. To the fullest extent permitted by law, Tick-It shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the service, including data loss, missed deadlines, or business losses.',
  },
  {
    icon: 'exit-outline',
    title: 'Termination',
    body:
      'We reserve the right to suspend or terminate your account at our discretion if we determine that you have violated these Terms. Upon termination, your right to use the service will immediately cease. You may also terminate your account at any time through the Settings screen. Data deletion following termination will be handled in accordance with our Privacy Policy.',
  },
  {
    icon: 'globe-outline',
    title: 'Governing Law',
    body:
      'These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions. Any disputes arising under these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction. Both parties consent to such jurisdiction.',
  },
  {
    icon: 'mail-outline',
    title: 'Contact & Notices',
    body:
      'For legal inquiries, notices, or questions regarding these Terms and Conditions, please contact our legal team at legal@tickit.app. Official notices must be submitted in writing and will be acknowledged within 5 business days.',
  },
];

export default function LegalScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('privacy');

  const sections = activeTab === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: Semantic.accent }]}>← Back</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Legal</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Hero Banner */}
      <View style={[styles.heroBanner, { backgroundColor: Semantic.accentBg, borderBottomColor: theme.border }]}>
        <Ionicons name="shield-half-outline" size={40} color={Semantic.accent} style={{ marginBottom: Spacing.two }} />
        <Text style={[styles.heroTitle, { color: theme.text }]}>Tick-It Legal</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          Last updated: June 2026 · Effective immediately
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabRow, { backgroundColor: theme.surfaceElevated, borderBottomColor: theme.border }]}>
        {(['privacy', 'terms'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              activeTab === tab && { borderBottomColor: Semantic.accent, borderBottomWidth: 2 },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={tab === 'privacy' ? 'lock-closed-outline' : 'document-text-outline'}
                size={14}
                color={activeTab === tab ? Semantic.accent : theme.textSecondary}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? Semantic.accent : theme.textSecondary },
              ]}>
                {tab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <View style={[styles.introCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          {activeTab === 'privacy' ? (
            <>
              <Text style={[styles.introTitle, { color: theme.text }]}>Your Privacy Matters</Text>
              <Text style={[styles.introText, { color: theme.textSecondary }]}>
                At Tick-It, we are committed to protecting your personal data and being transparent
                about how we collect and use it. This Privacy Policy explains our practices in plain language.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.introTitle, { color: theme.text }]}>Terms of Use</Text>
              <Text style={[styles.introText, { color: theme.textSecondary }]}>
                These Terms and Conditions govern your use of Tick-It Workspace. By using our
                application, you agree to these terms. Please read them carefully before proceeding.
              </Text>
            </>
          )}
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <View
            key={index}
            style={[styles.sectionCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: Semantic.accentBg }]}>
                <Ionicons name={section.icon as any} size={18} color={Semantic.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionBody, { color: theme.textSecondary }]}>{section.body}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={[styles.footerCard, { backgroundColor: Semantic.accentBg, borderColor: Semantic.accent }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.two }}>
            <Ionicons name="hardware-chip-outline" size={18} color={Semantic.accent} />
            <Text style={[styles.footerTitle, { color: Semantic.accent, marginBottom: 0 }]}>Tick-It Workspace</Text>
          </View>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Built for founders, hackers, and doers.{'\n'}
            Questions? Reach us at hello@tickit.app
          </Text>
          <Text style={[styles.footerVersion, { color: theme.textTertiary }]}>
            Version 1.2.0 · Tick-It OS
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
  },
  heroBanner: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
    borderBottomWidth: 1,
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: Spacing.two,
  },
  heroTitle: {
    ...Typography.h2,
    fontWeight: '800',
    marginBottom: Spacing.one,
  },
  heroSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.five,
    gap: Spacing.three,
  },
  introCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
  },
  introTitle: {
    ...Typography.h3,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  introText: {
    ...Typography.body,
    lineHeight: 22,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  sectionBody: {
    ...Typography.bodySm,
    lineHeight: 20,
  },
  footerCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  footerTitle: {
    ...Typography.h3,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  footerText: {
    ...Typography.bodySm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  footerVersion: {
    ...Typography.captionSm,
  },
});
