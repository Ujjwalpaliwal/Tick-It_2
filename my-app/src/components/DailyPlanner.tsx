import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { QuadrantMeta, Task, DailyPlanItem } from '@/store/types';
import { useTaskStore } from '@/store/taskStore';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskDetailSheet from './TaskDetailSheet';

export default function DailyPlanner() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { getActiveTasks, getTodayCompleted } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const dailyPlan: DailyPlanItem[] = useMemo(() => {
    const tasks = getActiveTasks();
    // Sort by priority score descending, take top tasks
    const sorted = [...tasks].sort((a, b) => b.priorityScore - a.priorityScore);
    return sorted.slice(0, 8).map((task, i) => ({
      task,
      rank: i + 1,
      estimatedMinutes: Math.round(15 + (task.subtasks.length * 10) + (task.priorityScore * 0.3)),
      reason: getReasonForRank(task, i),
    }));
  }, [regenerateKey, getActiveTasks]);

  const totalMinutes = dailyPlan.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMin = totalMinutes % 60;
  const todayDone = getTodayCompleted();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>Your day ahead</Text>
        <Text style={[styles.date, { color: theme.text }]}>{dateString}</Text>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: Semantic.accentBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name="list" size={10} color={Semantic.accent} />
            <Text style={[styles.summaryText, { color: Semantic.accent }]}>
              {dailyPlan.length} tasks
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: Semantic.infoBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name="time" size={10} color={Semantic.info} />
            <Text style={[styles.summaryText, { color: Semantic.info }]}>
              {totalHours}h {remainingMin}m est.
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: Semantic.successBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name="checkmark-done" size={10} color={Semantic.success} />
            <Text style={[styles.summaryText, { color: Semantic.success }]}>
              {todayDone} done
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Top 3 Focus */}
        {dailyPlan.length > 0 && (
          <View style={styles.focusSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Ionicons name="sparkles-outline" size={16} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Top Focus</Text>
            </View>
            {dailyPlan.slice(0, 3).map((item, idx) => {
              const qMeta = QuadrantMeta[item.task.quadrant];
              return (
                <Pressable
                  key={item.task.id}
                  onPress={() => setSelectedTask(item.task)}
                  style={[styles.focusCard, {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    borderLeftColor: qMeta.color,
                  }]}
                >
                  <View style={styles.focusRank}>
                    <Text style={[styles.rankNumber, { color: qMeta.color }]}>#{item.rank}</Text>
                  </View>
                  <View style={styles.focusContent}>
                    <Text style={[styles.focusTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.task.title}
                    </Text>
                    <Text style={[styles.focusReason, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.reason}
                    </Text>
                    <View style={styles.focusMeta}>
                      <View style={[styles.qBadge, { backgroundColor: qMeta.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Ionicons name={qMeta.icon as any} size={10} color={qMeta.color} />
                        <Text style={[styles.qBadgeText, { color: qMeta.color }]}>
                          {qMeta.label}
                        </Text>
                      </View>
                      <Text style={[styles.estTime, { color: theme.textTertiary }]}>
                        ~{item.estimatedMinutes}min
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.priorityCircle, { borderColor: qMeta.color }]}>
                    <Text style={[styles.priorityText, { color: qMeta.color }]}>
                      {item.task.priorityScore}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Remaining tasks */}
        {dailyPlan.length > 3 && (
          <View style={styles.remainingSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Ionicons name="list-outline" size={16} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Up Next</Text>
            </View>
            {dailyPlan.slice(3).map((item) => {
              const qMeta = QuadrantMeta[item.task.quadrant];
              return (
                <Pressable
                  key={item.task.id}
                  onPress={() => setSelectedTask(item.task)}
                  style={[styles.upNextRow, { borderColor: theme.borderLight }]}
                >
                  <Text style={[styles.upNextRank, { color: theme.textTertiary }]}>#{item.rank}</Text>
                  <Ionicons name={qMeta.icon as any} size={14} color={qMeta.color} />
                  <Text style={[styles.upNextTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.task.title}
                  </Text>
                  <Text style={[styles.upNextTime, { color: theme.textTertiary }]}>~{item.estimatedMinutes}m</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {dailyPlan.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>All clear!</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              No tasks for today. Add some from the Board tab.
            </Text>
          </View>
        )}

        {/* Regenerate button */}
        <Pressable
          onPress={() => setRegenerateKey(k => k + 1)}
          style={[styles.regenerateBtn, { borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }]}
        >
          <Ionicons name="refresh" size={14} color={theme.textSecondary} />
          <Text style={[styles.regenerateText, { color: theme.textSecondary }]}>Regenerate Plan</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </View>
  );
}

function getReasonForRank(task: Task, index: number): string {
  if (index === 0) return 'Highest priority — tackle this first';
  if (task.priorityScore > 70) return 'High priority score — urgent attention needed';
  if (task.deadline) return 'Has a deadline approaching';
  if (task.subtasks.length > 0) return `${task.subtasks.length} subtasks to work through`;
  return 'AI ranked based on urgency + importance';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  greeting: {
    ...Typography.bodySm,
  },
  date: {
    ...Typography.h1,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
    flexWrap: 'wrap',
  },
  summaryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  summaryText: {
    ...Typography.captionSm,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  focusSection: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.five,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.three,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  focusRank: {
    width: 30,
    alignItems: 'center',
  },
  rankNumber: {
    ...Typography.h3,
    fontWeight: '800',
  },
  focusContent: {
    flex: 1,
  },
  focusTitle: {
    ...Typography.bodySmMedium,
  },
  focusReason: {
    ...Typography.captionSm,
    marginTop: 2,
    fontStyle: 'italic',
  },
  focusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  qBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  qBadgeText: {
    ...Typography.captionSm,
    fontWeight: '600',
  },
  estTime: {
    ...Typography.captionSm,
  },
  priorityCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  // Up Next
  remainingSection: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.five,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: 0.5,
  },
  upNextRank: {
    ...Typography.caption,
    width: 24,
  },
  upNextEmoji: {
    fontSize: 16,
  },
  upNextTitle: {
    ...Typography.bodySm,
    flex: 1,
  },
  upNextTime: {
    ...Typography.captionSm,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.ten,
    paddingHorizontal: Spacing.seven,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    ...Typography.h2,
    marginBottom: Spacing.two,
  },
  emptySubtitle: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
  // Regenerate
  regenerateBtn: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: Spacing.four,
  },
  regenerateText: {
    ...Typography.bodySmMedium,
  },
});
