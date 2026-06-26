import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic, Fonts } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';
import { useTaskStore } from '@/store/taskStore';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLevelProgress } from '@/utils/xp';
import { getDateKey, getDaysAgo } from '@/utils/dateHelpers';

export default function GamificationHub() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { gamification, focusSessions } = useUserStore();
  const { tasks } = useTaskStore();

  const { xp, level, streak, badges, completionHistory } = gamification;
  const levelProgress = getLevelProgress(xp);
  const totalCompleted = tasks.filter(t => t.completedAt).length;
  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);

  // Build heatmap data (last 35 days, 5x7 grid)
  const heatmapDays = 35;
  const heatmapData: { date: string; count: number }[] = [];
  for (let i = heatmapDays - 1; i >= 0; i--) {
    const d = getDaysAgo(i);
    const key = getDateKey(d);
    heatmapData.push({ date: key, count: completionHistory[key] ?? 0 });
  }
  const maxCount = Math.max(1, ...heatmapData.map(d => d.count));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Your Stats</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Track your productivity journey</Text>
        </View>

        {/* XP & Level Card */}
        <View style={[styles.levelCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={[styles.levelLabel, { color: theme.textTertiary }]}>CURRENT LEVEL</Text>
              <Text style={[styles.levelNumber, { color: Semantic.accent }]}>{level}</Text>
            </View>
            <View style={styles.xpColumn}>
              <Text style={[styles.xpValue, { color: Semantic.xp }]}>{xp} XP</Text>
              <Text style={[styles.xpNext, { color: theme.textSecondary }]}>
                {levelProgress.next - xp} to level {level + 1}
              </Text>
            </View>
          </View>
          {/* Level progress bar */}
          <View style={[styles.levelBarOuter, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.levelBarInner, {
              width: `${Math.round(levelProgress.progress * 100)}%`,
              backgroundColor: Semantic.accent,
            }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.statCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="flame" size={24} color={Semantic.danger} style={{ marginBottom: Spacing.two }} />
            <Text style={[styles.statNumber, { color: Semantic.danger }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
          </Pressable>
 
          <Pressable
            style={({ pressed }) => [
              styles.statCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="checkmark-done-circle" size={24} color={Semantic.success} style={{ marginBottom: Spacing.two }} />
            <Text style={[styles.statNumber, { color: Semantic.success }]}>{totalCompleted}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
          </Pressable>
 
          <Pressable
            style={({ pressed }) => [
              styles.statCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="timer" size={24} color={Semantic.info} style={{ marginBottom: Spacing.two }} />
            <Text style={[styles.statNumber, { color: Semantic.info }]}>{focusSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Focus Sessions</Text>
          </Pressable>
 
          <Pressable
            style={({ pressed }) => [
              styles.statCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="trophy" size={24} color={Semantic.xp} style={{ marginBottom: Spacing.two }} />
            <Text style={[styles.statNumber, { color: Semantic.xp }]}>{unlockedBadges.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Badges</Text>
          </Pressable>
        </View>

        {/* Activity Heatmap */}
        <View style={[styles.heatmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.four }}>
            <Ionicons name="bar-chart-outline" size={16} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Activity (Last 35 Days)</Text>
          </View>
          <View style={styles.heatmapGrid}>
            {heatmapData.map((day, i) => {
              const intensity = day.count / maxCount;
              const bgColor = day.count === 0
                ? theme.backgroundSelected
                : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`; // Using primary indigo brand color
              return (
                <View
                  key={i}
                  style={[styles.heatmapCell, { backgroundColor: bgColor }]}
                />
              );
            })}
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>Less</Text>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
              <View
                key={i}
                style={[styles.legendCell, {
                  backgroundColor: intensity === 0
                    ? theme.backgroundSelected
                    : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                }]}
              />
            ))}
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>More</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.four }}>
            <Ionicons name="ribbon-outline" size={18} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Achievements</Text>
          </View>

          {unlockedBadges.length > 0 && (
            <>
              <Text style={[styles.badgeGroupLabel, { color: Semantic.success }]}>Unlocked</Text>
              <View style={styles.badgeGrid}>
                {unlockedBadges.map(badge => (
                  <Pressable
                    key={badge.id}
                    style={({ pressed }) => [
                      styles.badgeCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: Semantic.success,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <View style={[styles.badgeEmojiWrapper, { backgroundColor: Semantic.successBg }]}>
                      <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    </View>
                    <Text style={[styles.badgeName, { color: theme.text }]}>{badge.name}</Text>
                    <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>{badge.description}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.badgeGroupLabel, { color: theme.textSecondary, marginTop: Spacing.four }]}>Locked</Text>
          <View style={styles.badgeGrid}>
            {lockedBadges.map(badge => (
              <Pressable
                key={badge.id}
                style={({ pressed }) => [
                  styles.badgeCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.5 : 0.6,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View style={[styles.badgeEmojiWrapper, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name="lock-closed" size={20} color={theme.textTertiary} />
                </View>
                <Text style={[styles.badgeName, { color: theme.textTertiary }]}>{badge.name}</Text>
                <Text style={[styles.badgeDesc, { color: theme.textTertiary }]}>{badge.condition}</Text>
              </Pressable>
            ))}
          </View>
        </View>

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
    paddingTop: Spacing.six,
    paddingBottom: Spacing.ten,
  },
  header: {
    marginBottom: Spacing.five,
  },
  title: {
    ...Typography.hero,
    letterSpacing: -1,
  },
  subtitle: {
    ...Typography.body,
    marginTop: 4,
  },
  // Level Card
  levelCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    marginBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  levelLabel: {
    ...Typography.label,
    letterSpacing: 1.5,
  },
  levelNumber: {
    fontSize: 54,
    fontWeight: '800',
    lineHeight: 58,
    fontFamily: Fonts?.mono,
    marginTop: 4,
  },
  xpColumn: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts?.mono,
  },
  xpNext: {
    ...Typography.caption,
    marginTop: 4,
  },
  levelBarOuter: {
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  levelBarInner: {
    height: '100%',
    borderRadius: Radius.full,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: Spacing.two,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Fonts?.mono,
    lineHeight: 32,
  },
  statLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 4,
  },
  // Heatmap
  heatmapCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    marginBottom: Spacing.six,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    ...Typography.h2,
    fontWeight: '700',
    marginBottom: Spacing.four,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatmapCell: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.four,
    justifyContent: 'flex-end',
  },
  legendCell: {
    width: 14,
    height: 14,
    borderRadius: Radius.sm,
  },
  legendText: {
    ...Typography.caption,
  },
  // Badges
  badgeSection: {
    marginBottom: Spacing.six,
  },
  badgeGroupLabel: {
    ...Typography.label,
    letterSpacing: 1,
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  badgeCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  badgeEmojiWrapper: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeName: {
    ...Typography.bodySmMedium,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
});
