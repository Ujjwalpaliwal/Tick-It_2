import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Task, QuadrantMeta } from '@/store/types';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDeadlineLabel, isOverdue, formatRelative } from '@/utils/dateHelpers';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  onComplete?: (task: Task) => void;
}

export default function TaskCard({ task, onPress, onLongPress, onComplete }: TaskCardProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const qMeta = QuadrantMeta[task.quadrant];
  const overdue = isOverdue(task.deadline);
  const deadlineText = getDeadlineLabel(task.deadline);
  const progress = task.progress;

  return (
    <Pressable
      onPress={() => onPress(task)}
      onLongPress={() => onLongPress?.(task)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderLeftColor: qMeta.color,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          overflow: 'hidden',
        },
      ]}
    >
      {/* Background Gradient Tint */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`cardGrad-${task.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={qMeta.color} stopOpacity={scheme === 'dark' ? 0.15 : 0.08} />
            <Stop offset="100%" stopColor={qMeta.color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#cardGrad-${task.id})`} />
      </Svg>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {task.title}
          </Text>
          
          {/* Assignee Badge */}
          {task.assigneeName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Ionicons name="person-outline" size={10} color={theme.textSecondary} />
              <Text style={[styles.assigneeText, { color: theme.textSecondary }]}>
                {task.assigneeName} ({task.assigneeRole?.split(' ')[0]})
              </Text>
            </View>
          )}
        </View>

        {onComplete && !task.assigneeId && (
          <Pressable
            onPress={() => onComplete(task)}
            style={[styles.checkBtn, { borderColor: qMeta.color }]}
            hitSlop={8}
          >
            <Text style={{ color: qMeta.color, fontSize: 12 }}>✓</Text>
          </Pressable>
        )}
      </View>

      {/* Description preview */}
      {task.description ? (
        <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={1}>
          {task.description}
        </Text>
      ) : null}

      {/* Blocker or Status row */}
      <View style={styles.statusRow}>
        {task.blockers ? (
          <View style={[styles.blockerChip, { backgroundColor: Semantic.dangerBg, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
            <Ionicons name="alert-circle" size={10} color={Semantic.danger} />
            <Text style={[styles.blockerText, { color: Semantic.danger }]}>Blocked</Text>
          </View>
        ) : null}

        {task.workspace === 'startup' && task.approvalStatus !== 'none' && (
          <View style={[
            styles.statusBadge,
            {
              backgroundColor:
                task.approvalStatus === 'pending_approval'
                  ? Semantic.warningBg
                  : task.approvalStatus === 'approved'
                  ? Semantic.successBg
                  : Semantic.dangerBg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            },
          ]}>
            <Ionicons
              name={
                task.approvalStatus === 'pending_approval'
                  ? "time-outline"
                  : task.approvalStatus === 'approved'
                  ? "checkmark-circle-outline"
                  : "alert-circle-outline"
              }
              size={10}
              color={
                task.approvalStatus === 'pending_approval'
                  ? Semantic.warning
                  : task.approvalStatus === 'approved'
                  ? Semantic.success
                  : Semantic.danger
              }
            />
            <Text style={[
              styles.statusText,
              {
                color:
                  task.approvalStatus === 'pending_approval'
                    ? Semantic.warning
                    : task.approvalStatus === 'approved'
                    ? Semantic.success
                    : Semantic.danger,
              },
            ]}>
              {task.approvalStatus === 'pending_approval' ? 'Pending' : task.approvalStatus === 'approved' ? 'Approved' : 'Re-work'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        {/* Priority Score Badge */}
        <View style={[styles.scoreBadge, { backgroundColor: qMeta.bg }]}>
          <Text style={[styles.scoreText, { color: qMeta.color }]}>
            {task.priorityScore}
          </Text>
        </View>

        {/* Deadline chip */}
        {task.deadline && (
          <View style={[styles.deadlineChip, {
            backgroundColor: overdue ? Semantic.dangerBg : theme.backgroundSelected,
          }]}>
            <Text style={[styles.deadlineText, {
              color: overdue ? Semantic.danger : theme.textSecondary,
            }]}>
              {deadlineText}
            </Text>
          </View>
        )}

        {/* Subtask count */}
        {task.subtasks.length > 0 && (
          <View style={[styles.subtaskChip, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.subtaskText, { color: theme.textSecondary }]}>
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
            </Text>
          </View>
        )}

        {/* Progress mini-bar */}
        {progress > 0 && progress < 100 && (
          <View style={[styles.progressBarOuter, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.progressBarInner, {
              width: `${progress}%`,
              backgroundColor: qMeta.color,
            }]} />
          </View>
        )}
      </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    ...Typography.bodySmMedium,
    flex: 1,
  },
  checkBtn: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    ...Typography.caption,
    marginTop: 2,
  },
  assigneeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 4,
  },
  blockerChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  blockerText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    flexWrap: 'wrap',
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  scoreText: {
    ...Typography.captionSm,
    fontWeight: '700',
  },
  deadlineChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  deadlineText: {
    ...Typography.captionSm,
  },
  subtaskChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  subtaskText: {
    ...Typography.captionSm,
  },
  progressBarOuter: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    minWidth: 30,
  },
  progressBarInner: {
    height: 4,
    borderRadius: 2,
  },
});
