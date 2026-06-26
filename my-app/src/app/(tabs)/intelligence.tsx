import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function IntelligenceScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const { tasks } = useTaskStore();
  const { profile, gamification } = useUserStore();
  const activeWS = profile.activeWorkspace;

  // Tabs: Command Center (briefing) vs Insights
  const [activeTab, setActiveTab] = useState<'briefing' | 'insights'>('briefing');

  // --- BRIEFING LOGIC ---
  const workspaceTasks = tasks.filter(t => t.workspace === activeWS && !t.isArchived);
  const activeTasks = workspaceTasks.filter(t => !t.completedAt);
  const completedTasks = workspaceTasks.filter(t => t.completedAt);

  // Generate morning briefing items
  const briefingItems: string[] = [];
  if (activeWS === 'startup') {
    const pitchTask = activeTasks.find(t => t.title.toLowerCase().includes('pitch'));
    if (pitchTask) {
      briefingItems.push(`🎯 Complete the "${pitchTask.title}" slide deck first because slide design is on the critical path.`);
    }
    const authTask = activeTasks.find(t => t.title.toLowerCase().includes('auth') || t.title.toLowerCase().includes('api'));
    if (authTask && authTask.approvalStatus === 'pending_approval') {
      briefingItems.push(`📥 Review Rahul's code submission for "${authTask.title}". It blocks frontend wireframe integration.`);
    } else if (authTask) {
      briefingItems.push(`⚠️ Rahul is working on "${authTask.title}". Keep an eye on blockers.`);
    }
    const overloadedDev = activeTasks.length > 5;
    if (overloadedDev) {
      briefingItems.push(`🧠 AI load warning: The backlog contains ${activeTasks.length} active items. Recommend delegating database optimizations.`);
    }
  } else {
    briefingItems.push(`💧 Keep up your Atomic Habits streak. Hydration and Reading remain open today.`);
    const studyTask = activeTasks.find(t => t.title.toLowerCase().includes('learn') || t.title.toLowerCase().includes('read'));
    if (studyTask) {
      briefingItems.push(`📚 Schedule 45 minutes to practice "${studyTask.title}" modules.`);
    }
  }

  if (briefingItems.length === 0) {
    briefingItems.push('💡 Work list looks clear today. Start adding tasks or routine goals using the main Board.');
  }

  // --- INSIGHTS LOGIC ---
  const focusStreak = gamification.streak;
  const burnoutRisk = activeWS === 'startup' && activeTasks.length > 4 ? 'High' : activeTasks.length > 2 ? 'Medium' : 'Low';
  const burnoutColor = burnoutRisk === 'High' ? Semantic.danger : burnoutRisk === 'Medium' ? Semantic.warning : Semantic.success;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top Tab Bar */}
      <View style={styles.tabHeader}>
        <Pressable
          onPress={() => setActiveTab('briefing')}
          style={[styles.tabBtn, activeTab === 'briefing' && { borderBottomColor: Semantic.accent }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bulb-outline" size={15} color={activeTab === 'briefing' ? Semantic.accent : theme.textSecondary} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'briefing' ? Semantic.accent : theme.textSecondary }]}>
              Command Brief
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('insights')}
          style={[styles.tabBtn, activeTab === 'insights' && { borderBottomColor: Semantic.accent }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bar-chart-outline" size={15} color={activeTab === 'insights' ? Semantic.accent : theme.textSecondary} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'insights' ? Semantic.accent : theme.textSecondary }]}>
              AI Insights
            </Text>
          </View>
        </Pressable>
      </View>

      {activeTab === 'briefing' && (
        // ============================================
        // MORNING COMMAND BRIEF
        // ============================================
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.briefCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.briefDate, { color: Semantic.accent }]}>MORNING EXECUTION MAP</Text>
            <Text style={[styles.briefHeader, { color: theme.text }]}>Today's Critical Path</Text>
            <View style={styles.briefDivider} />

            {briefingItems.map((item, idx) => (
              <View key={idx} style={styles.briefItemRow}>
                <Text style={[styles.briefItemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Quick Stats overview */}
          <View style={styles.quickOverviewCard}>
            <View style={[styles.miniStatBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="checkbox-outline" size={24} color={Semantic.accent} style={{ marginBottom: Spacing.one }} />
              <Text style={[styles.miniStatVal, { color: theme.text }]}>{activeTasks.length}</Text>
              <Text style={[styles.miniStatLabel, { color: theme.textSecondary }]}>Active Tasks</Text>
            </View>

            <View style={[styles.miniStatBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="flame-outline" size={24} color={Semantic.xp} style={{ marginBottom: Spacing.one }} />
              <Text style={[styles.miniStatVal, { color: theme.text }]}>{focusStreak}</Text>
              <Text style={[styles.miniStatLabel, { color: theme.textSecondary }]}>Day Streak</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {activeTab === 'insights' && (
        // ============================================
        // AI PRODUCTIVITY INSIGHTS
        // ============================================
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Burnout Risk Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Ionicons name="flame-outline" size={16} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Burnout Detection Model</Text>
            </View>
            <View style={styles.burnoutRow}>
              <View>
                <Text style={[styles.burnoutValue, { color: burnoutColor }]}>{burnoutRisk}</Text>
                <Text style={[styles.burnoutLabel, { color: theme.textSecondary }]}>Risk Level</Text>
              </View>
              <Text style={[styles.burnoutDesc, { color: theme.textSecondary }]}>
                {burnoutRisk === 'High' 
                  ? 'Teammates carry multiple high priority deadlines. We recommend moving at least one task to Eliminate quadrant.' 
                  : 'Workspace loading parameters are balanced. Team is shipping consistently.'
                }
              </Text>
            </View>
          </View>

          {/* Productivity metrics */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Ionicons name="trending-up-outline" size={16} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Discipline Tracking</Text>
            </View>
            
            <View style={styles.metricSliderRow}>
              <View style={styles.metricSliderHeader}>
                <Text style={[styles.metricSliderLabel, { color: theme.text }]}>Focus Consistency</Text>
                <Text style={[styles.metricSliderVal, { color: Semantic.success }]}>92%</Text>
              </View>
              <View style={[styles.sliderTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.sliderFill, { width: '92%', backgroundColor: Semantic.success }]} />
              </View>
            </View>

            <View style={styles.metricSliderRow}>
              <View style={styles.metricSliderHeader}>
                <Text style={[styles.metricSliderLabel, { color: theme.text }]}>Procrastination Velocity</Text>
                <Text style={[styles.metricSliderVal, { color: Semantic.xp }]}>84/100</Text>
              </View>
              <View style={[styles.sliderTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.sliderFill, { width: '84%', backgroundColor: Semantic.xp }]} />
              </View>
            </View>

            <View style={styles.metricSliderRow}>
              <View style={styles.metricSliderHeader}>
                <Text style={[styles.metricSliderLabel, { color: theme.text }]}>Collaboration Index</Text>
                <Text style={[styles.metricSliderVal, { color: Semantic.info }]}>75%</Text>
              </View>
              <View style={[styles.sliderTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.sliderFill, { width: '75%', backgroundColor: Semantic.info }]} />
              </View>
            </View>
          </View>

          {/* AI Advice Summary */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: Semantic.accent, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Ionicons name="construct-outline" size={16} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Workspace Optimizer Recommendations</Text>
            </View>
            <Text style={[styles.aiSummaryText, { color: theme.textSecondary }]}>
              "Startup consistency is high. Rahul has submitted Auth API, which blocks UI. Make reviewing Rahul's task your highest priority this afternoon. Shift the PPT presentation deadline if necessary."
            </Text>
          </View>
        </ScrollView>
      )}


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.nine,
    gap: Spacing.four,
  },
  briefCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.five,
  },
  briefDate: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  briefHeader: {
    ...Typography.h2,
    marginTop: Spacing.one,
  },
  briefDivider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginVertical: Spacing.four,
  },
  briefItemRow: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  briefItemText: {
    ...Typography.bodySm,
    lineHeight: 20,
    flex: 1,
  },
  quickOverviewCard: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  miniStatBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
  },
  miniStatEmoji: {
    fontSize: 24,
    marginBottom: Spacing.one,
  },
  miniStatVal: {
    fontSize: 22,
    fontWeight: '700',
  },
  miniStatLabel: {
    ...Typography.captionSm,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  burnoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  burnoutValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  burnoutLabel: {
    ...Typography.caption,
  },
  burnoutDesc: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 16,
  },
  metricSliderRow: {
    marginBottom: Spacing.three,
  },
  metricSliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  metricSliderLabel: {
    ...Typography.bodySmMedium,
  },
  metricSliderVal: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  aiSummaryText: {
    ...Typography.caption,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  chatWrapper: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  msgContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  userMsgAlign: {
    justifyContent: 'flex-end',
  },
  aiMsgAlign: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '80%',
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  msgText: {
    ...Typography.bodySm,
    lineHeight: 18,
  },
  suggestionArea: {
    paddingVertical: Spacing.two,
  },
  suggestionScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  suggestPill: {
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  chatInputBar: {
    borderTopWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.four,
    fontSize: 13,
  },
  sendBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    borderRadius: Radius.full,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
