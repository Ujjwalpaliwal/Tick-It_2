import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { Task } from '@/store/types';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import AuthRequired from '@/components/AuthRequired';

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const { tasks, approveTask, requestChanges, getActiveTasks, getCompletedTasks } = useTaskStore();
  const { profile, gamification, activeSimulatedMemberId } = useUserStore();
  const activeWS = profile.activeWorkspace;
  const currentUserId = activeSimulatedMemberId || profile.email || 'founder@tickit.app';
  const isFounder = activeSimulatedMemberId === null && profile.role === 'founder';
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Local state for rejection feedback modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedTaskToReject, setSelectedTaskToReject] = useState<Task | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  // Local habits state for Personal Mode
  const [habits, setHabits] = useState([
    { id: 'h1', title: 'LeetCode Daily Challenge', completed: false, streak: 5, emoji: '💻' },
    { id: 'h2', title: 'Morning Fitness (Gym/Run)', completed: true, streak: 12, emoji: '🏋️‍♂️' },
    { id: 'h3', title: 'Read Technical Docs / Books', completed: false, streak: 3, emoji: '📚' },
    { id: 'h4', title: 'Water Intake 3L', completed: true, streak: 18, emoji: '💧' },
  ]);

  const toggleHabit = (id: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === id) {
          const newCompleted = !h.completed;
          return {
            ...h,
            completed: newCompleted,
            streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
          };
        }
        return h;
      })
    );
  };

  // --- STARTUP DASHBOARD CALCS ---
  const startupTasks = tasks.filter(t => t.workspace === 'startup' && !t.isArchived);
  const completedStartupTasks = startupTasks.filter(t => t.completedAt !== null);
  const activeStartupTasks = startupTasks.filter(t => t.completedAt === null);
  const completionRate = startupTasks.length > 0 
    ? Math.round((completedStartupTasks.length / startupTasks.length) * 100) 
    : 0;

  const pendingApprovals = activeStartupTasks.filter(t => t.approvalStatus === 'pending_approval');
  const delayedTasks = activeStartupTasks.filter(
    t => t.deadline && new Date(t.deadline).getTime() < Date.now()
  );

  const teamMembers = profile.startupOrg?.members || [];
  const workloads = teamMembers.map(m => {
    const memberTasks = activeStartupTasks.filter(t => t.assigneeId === m.id);
    const overload = memberTasks.length >= 3;
    return {
      ...m,
      taskCount: memberTasks.length,
      overload,
    };
  });

  // --- TEAMMATE DASHBOARD CALCS ---
  const myStartupTasks = startupTasks.filter(t => t.assigneeId === currentUserId);
  const completedMyStartupTasks = myStartupTasks.filter(t => t.completedAt !== null);
  const activeMyStartupTasks = myStartupTasks.filter(t => t.completedAt === null);
  const myCompletionRate = myStartupTasks.length > 0 
    ? Math.round((completedMyStartupTasks.length / myStartupTasks.length) * 100) 
    : 0;

  const myReworkTasks = activeMyStartupTasks.filter(t => t.approvalStatus === 'changes_requested');
  const myPendingTasks = activeMyStartupTasks.filter(t => t.approvalStatus === 'pending_approval');
  const myBacklogTasks = activeMyStartupTasks.filter(t => t.approvalStatus === 'none' || t.approvalStatus === 'approved');
  const myDelayedTasks = delayedTasks.filter(t => t.assigneeId === currentUserId);

  const handleApprove = (id: string) => {
    approveTask(id);
  };

  const openRejectModal = (task: Task) => {
    setSelectedTaskToReject(task);
    setRejectionFeedback('');
    setRejectModalVisible(true);
  };

  const handleReject = () => {
    if (selectedTaskToReject && rejectionFeedback.trim()) {
      requestChanges(selectedTaskToReject.id, rejectionFeedback.trim());
      setRejectModalVisible(false);
      setSelectedTaskToReject(null);
    }
  };

  const simulatedMemberName = activeSimulatedMemberId 
    ? (profile.startupOrg?.members.find(m => m.id === activeSimulatedMemberId)?.name || 'Teammate')
    : null;

  if (!profile.isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <AuthRequired
          emoji="🚀"
          title="Team & Personal Dashboard"
          description="Sign in to view your startup team sprint metrics, teammate workloads, and daily habits."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Workspace Indicator Header */}
        <View style={styles.header}>
          <Text style={[styles.workspaceTitle, { color: theme.text }]}>
            {activeWS === 'startup' 
              ? (isFounder ? `💼 Startup Operations` : `👥 Teammate Dashboard`)
              : `🏡 Personal Dashboard`
            }
          </Text>
          <Text style={[styles.workspaceSub, { color: theme.textSecondary }]}>
            {activeWS === 'startup' 
              ? (activeSimulatedMemberId 
                  ? `🚀 Simulating: ${simulatedMemberName} (${profile.startupOrg?.name})` 
                  : `${profile.startupOrg?.name || 'Ujjwalit Technologies'} · Role: ${profile.role === 'founder' ? 'Founder' : 'Teammate'}`)
              : `Focus goals and personal routines`
            }
          </Text>
        </View>

        {activeWS === 'startup' ? (
          isFounder ? (
            // ============================================
            // FOUNDER STARTUP MODE DASHBOARD
            // ============================================
            <View style={styles.sectionContainer}>
              {/* Quick Metrics */}
              <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Startup Progress</Text>
                  <Text style={[styles.metricValue, { color: Semantic.accent }]}>{completionRate}%</Text>
                  <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                    <View style={[styles.progressBar, { width: `${completionRate}%`, backgroundColor: Semantic.accent }]} />
                  </View>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Founder Score</Text>
                  <Text style={[styles.metricValue, { color: Semantic.xp }]}>{gamification.founderScore}</Text>
                  <Text style={[styles.metricSubtext, { color: theme.textTertiary }]}>Consistency: {gamification.consistencyScore}%</Text>
                </View>
              </View>

              {/* Delay & Blocker Warnings */}
              {delayedTasks.length > 0 && (
                <View style={[styles.alertBanner, { backgroundColor: Semantic.dangerBg, borderColor: Semantic.danger }]}>
                  <Text style={[styles.alertTitle, { color: Semantic.danger }]}>⚠️ {delayedTasks.length} Delayed Startup Tasks</Text>
                  <Text style={[styles.alertSub, { color: theme.text }]} numberOfLines={1}>
                    "{delayedTasks[0].title}" has missed its deadline.
                  </Text>
                </View>
              )}

              {/* Approval Reviews Queue */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>📥 Pending Approvals ({pendingApprovals.length})</Text>
                {pendingApprovals.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={{ color: theme.textTertiary, textAlign: 'center' }}>All team submissions reviewed. No pending tasks.</Text>
                  </View>
                ) : (
                  pendingApprovals.map(t => (
                    <View key={t.id} style={[styles.taskReviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.reviewHeader}>
                        <Text style={[styles.reviewTaskTitle, { color: theme.text }]}>{t.title}</Text>
                        <Text style={[styles.reviewAssignee, { color: Semantic.info }]}>By {t.assigneeName} ({t.assigneeRole})</Text>
                      </View>
                      <Text style={[styles.reviewNotes, { color: theme.textSecondary }]}>
                        📝 Note: "{t.dailyNotes || 'No notes provided'}"
                      </Text>
                      <View style={styles.actionBtnRow}>
                        <Pressable
                          onPress={() => handleApprove(t.id)}
                          style={[styles.actionBtn, { backgroundColor: Semantic.success }]}
                        >
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => openRejectModal(t)}
                          style={[styles.actionBtn, { backgroundColor: Semantic.danger }]}
                        >
                          <Text style={styles.actionBtnText}>Request Changes</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Team Member Workloads */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>👥 Teammates Workload Map</Text>
                <View style={[styles.loadListCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {workloads.map(w => (
                    <View key={w.id} style={styles.loadItemRow}>
                      <View style={styles.memberAvatarContainer}>
                        <Text style={styles.memberAvatar}>{w.avatar}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.two }}>
                        <View style={styles.memberHeaderLine}>
                          <Text style={[styles.memberNameText, { color: theme.text }]}>{w.name}</Text>
                          <Text style={[styles.memberRoleText, { color: theme.textSecondary }]}>{w.role}</Text>
                        </View>
                        <View style={[styles.loadBarTrack, { backgroundColor: theme.backgroundSelected }]}>
                          <View
                            style={[
                              styles.loadBarInner,
                              {
                                width: `${Math.min(100, (w.taskCount / 4) * 100)}%`,
                                backgroundColor: w.overload ? Semantic.danger : Semantic.info,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.loadCountBadge}>
                        <Text style={[styles.loadCountText, { color: w.overload ? Semantic.danger : theme.text }]}>
                          {w.taskCount} tasks
                        </Text>
                        {w.overload && <Text style={styles.overloadLabel}>OVERLOAD</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Simulated Startup Completion Heatmap */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>🔥 Execution Activity Heatmap</Text>
                <View style={[styles.heatmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.heatmapSubtitle, { color: theme.textSecondary, marginBottom: Spacing.two }]}>
                    Startup task completions over the last 24 hours
                  </Text>
                  <View style={styles.heatmapGrid}>
                    {[1, 2, 0, 3, 1, 0, 4, 2, 3, 1, 0, 2].map((val, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.heatmapCell,
                          {
                            backgroundColor:
                              val === 0
                                ? theme.backgroundSelected
                                : val === 1
                                ? 'rgba(139, 92, 246, 0.3)'
                                : val === 2
                                ? 'rgba(139, 92, 246, 0.5)'
                                : val === 3
                                ? 'rgba(139, 92, 246, 0.7)'
                                : 'rgba(139, 92, 246, 1.0)',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.heatmapLegend}>
                    <Text style={{ color: theme.textTertiary, fontSize: 10 }}>Less active</Text>
                    <View style={styles.legendColorRow}>
                      <View style={[styles.legendCell, { backgroundColor: theme.backgroundSelected }]} />
                      <View style={[styles.legendCell, { backgroundColor: 'rgba(139, 92, 246, 0.3)' }]} />
                      <View style={[styles.legendCell, { backgroundColor: 'rgba(139, 92, 246, 0.7)' }]} />
                      <View style={[styles.legendCell, { backgroundColor: 'rgba(139, 92, 246, 1)' }]} />
                    </View>
                    <Text style={{ color: theme.textTertiary, fontSize: 10 }}>Highly active</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // ============================================
            // TEAMMATE STARTUP MODE DASHBOARD
            // ============================================
            <View style={styles.sectionContainer}>
              {/* Quick Metrics */}
              <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>My Task Progress</Text>
                  <Text style={[styles.metricValue, { color: Semantic.accent }]}>{myCompletionRate}%</Text>
                  <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                    <View style={[styles.progressBar, { width: `${myCompletionRate}%`, backgroundColor: Semantic.accent }]} />
                  </View>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>My Consistency Score</Text>
                  <Text style={[styles.metricValue, { color: Semantic.xp }]}>{gamification.consistencyScore}%</Text>
                  <Text style={[styles.metricSubtext, { color: theme.textTertiary }]}>XP: {gamification.xp} (Lvl {gamification.level})</Text>
                </View>
              </View>

              {/* Delayed Tasks Alerts */}
              {myDelayedTasks.length > 0 && (
                <View style={[styles.alertBanner, { backgroundColor: Semantic.dangerBg, borderColor: Semantic.danger }]}>
                  <Text style={[styles.alertTitle, { color: Semantic.danger }]}>⚠️ {myDelayedTasks.length} Overdue Tasks Assigned to Me</Text>
                  <Text style={[styles.alertSub, { color: theme.text }]} numberOfLines={1}>
                    "{myDelayedTasks[0].title}" deadline has passed.
                  </Text>
                </View>
              )}

              {/* Rework Required (Changes Requested) */}
              {myReworkTasks.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: Semantic.danger }]}>⚠️ Rework Required ({myReworkTasks.length})</Text>
                  {myReworkTasks.map(t => {
                    const latestFounderComment = t.comments?.filter(c => c.authorRole === 'Founder').pop()?.text;
                    return (
                      <Pressable 
                        key={t.id} 
                        onPress={() => setSelectedTask(t)}
                        style={[styles.taskReviewCard, { backgroundColor: theme.surface, borderColor: Semantic.danger }]}
                      >
                        <View style={styles.reviewHeader}>
                          <Text style={[styles.reviewTaskTitle, { color: theme.text }]}>{t.title}</Text>
                          <Text style={[styles.reviewAssignee, { color: Semantic.danger, fontWeight: '700' }]}>REWORK</Text>
                        </View>
                        {latestFounderComment && (
                          <Text style={[styles.reviewNotes, { color: theme.textSecondary }]}>
                            💬 Feedback: "{latestFounderComment}"
                          </Text>
                        )}
                        <Text style={{ color: theme.textTertiary, fontSize: 10, marginTop: 4 }}>
                          Tap to open task and resubmit for approval.
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* My Submissions Pending Review */}
              {myPendingTasks.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>📥 My Submissions (Pending Review) ({myPendingTasks.length})</Text>
                  {myPendingTasks.map(t => (
                    <Pressable 
                      key={t.id}
                      onPress={() => setSelectedTask(t)}
                      style={[styles.taskReviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <View style={styles.reviewHeader}>
                        <Text style={[styles.reviewTaskTitle, { color: theme.text }]}>{t.title}</Text>
                        <Text style={[styles.reviewAssignee, { color: Semantic.info }]}>Pending Approval</Text>
                      </View>
                      <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                        Submitted notes: "{t.dailyNotes || 'No notes provided'}"
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Active Tasks list */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 My Startup Sprints ({activeMyStartupTasks.filter(t => t.approvalStatus === 'none').length})</Text>
                {activeMyStartupTasks.filter(t => t.approvalStatus === 'none').length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={{ color: theme.textTertiary, textAlign: 'center' }}>No active startup tasks. Great job!</Text>
                  </View>
                ) : (
                  activeMyStartupTasks.filter(t => t.approvalStatus === 'none').map(t => (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedTask(t)}
                      style={[styles.taskReviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.reviewTaskTitle, { color: theme.text }]}>{t.title}</Text>
                          {t.blockers ? (
                            <Text style={{ color: Semantic.warning, fontSize: 11, marginTop: 4 }}>⚠️ Blocked: {t.blockers}</Text>
                          ) : null}
                        </View>
                        <View style={[styles.summaryChip, { backgroundColor: t.priority === 'critical' ? Semantic.dangerBg : t.priority === 'high' ? Semantic.warningBg : theme.backgroundSelected }]}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: t.priority === 'critical' ? Semantic.danger : t.priority === 'high' ? Semantic.warning : theme.textSecondary, textTransform: 'uppercase' }}>
                            {t.priority}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          )
        ) : (
          // ============================================
          // PERSONAL MODE DASHBOARD
          // ============================================
          <View style={styles.sectionContainer}>
            {/* Habits Checklist */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🌱 Daily Habits Streaks</Text>
              <View style={[styles.habitsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {habits.map(h => (
                  <Pressable
                    key={h.id}
                    onPress={() => toggleHabit(h.id)}
                    style={styles.habitRow}
                  >
                    <View
                      style={[
                        styles.habitCheckbox,
                        {
                          borderColor: h.completed ? Semantic.success : theme.border,
                          backgroundColor: h.completed ? Semantic.successBg : 'transparent',
                        },
                      ]}
                    >
                      {h.completed && <Text style={{ color: Semantic.success, fontSize: 10 }}>✓</Text>}
                    </View>
                    <Text style={styles.habitEmoji}>{h.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.habitTitle,
                          {
                            color: theme.text,
                            textDecorationLine: h.completed ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {h.title}
                      </Text>
                      <Text style={[styles.habitStreakText, { color: Semantic.xp }]}>
                        🔥 {h.streak} day streak
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Personal Life Targets */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Focus Targets Today</Text>
              <View style={[styles.targetsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetBadge}>🔥</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.two }}>
                    <Text style={[styles.targetLabel, { color: theme.text }]}>Complete High Priority Personal Gym target</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Eisenhower Quadrant 1</Text>
                  </View>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetBadge}>📚</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.two }}>
                    <Text style={[styles.targetLabel, { color: theme.text }]}>Learn streams and buffer modules</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Recommended schedule 45 mins</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Personal Score Index */}
            <View style={[styles.personalScoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.personalScoreTitle, { color: theme.text }]}>📈 Life Management Score</Text>
              <Text style={[styles.personalScoreValue, { color: Semantic.success }]}>
                {Math.round(80 + (habits.filter(h => h.completed).length * 5))}
              </Text>
              <Text style={[styles.personalScoreDesc, { color: theme.textSecondary }]}>
                Calculated based on habit consistency, checklist progress and focus timers. Keep it up!
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* REJECTION FEEDBACK DIALOG MODAL */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Request Changes</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Provide specific feedback to {selectedTaskToReject?.assigneeName} on what needs to be fixed.
            </Text>
            <TextInput
              style={[styles.feedbackInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="e.g. Please integrate the OAuth flow before shipping this JWT API."
              placeholderTextColor={theme.textTertiary}
              multiline
              value={rejectionFeedback}
              onChangeText={setRejectionFeedback}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setRejectModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: theme.backgroundSelected }]}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReject}
                style={[styles.modalBtn, { backgroundColor: Semantic.danger }]}
              >
                <Text style={styles.actionBtnText}>Send Feedback</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.nine,
  },
  header: {
    marginBottom: Spacing.five,
  },
  workspaceTitle: {
    ...Typography.h1,
  },
  workspaceSub: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  sectionContainer: {
    gap: Spacing.four,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  metricLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: Spacing.one,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  metricSubtext: {
    ...Typography.captionSm,
  },
  alertBanner: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  alertTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  alertSub: {
    ...Typography.caption,
    marginTop: 2,
  },
  section: {
    marginTop: Spacing.two,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.three,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskReviewCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: Spacing.two,
    gap: 4,
  },
  reviewTaskTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  reviewAssignee: {
    ...Typography.caption,
  },
  reviewNotes: {
    ...Typography.bodySm,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loadListCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.three,
  },
  loadItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  memberAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatar: {
    fontSize: 16,
  },
  memberHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberNameText: {
    ...Typography.bodySmMedium,
  },
  memberRoleText: {
    fontSize: 10,
  },
  loadBarTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  loadBarInner: {
    height: '100%',
    borderRadius: 3,
  },
  loadCountBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.three,
    minWidth: 70,
  },
  loadCountText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  overloadLabel: {
    color: Semantic.danger,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  heatmapCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
  },
  heatmapSubtitle: {
    ...Typography.caption,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
  },
  heatmapCell: {
    width: 24,
    height: 24,
    borderRadius: Radius.md,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  legendColorRow: {
    flexDirection: 'row',
    gap: 4,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  habitsCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.three,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  habitCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  habitEmoji: {
    fontSize: 22,
    marginRight: Spacing.three,
  },
  habitTitle: {
    ...Typography.bodySmMedium,
  },
  habitStreakText: {
    fontSize: 10,
    marginTop: 2,
  },
  targetsCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetBadge: {
    fontSize: 22,
  },
  targetLabel: {
    ...Typography.bodySmMedium,
  },
  personalScoreCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
  },
  personalScoreTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  personalScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginVertical: Spacing.two,
  },
  personalScoreDesc: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
  },
  modalTitle: {
    ...Typography.h2,
    marginBottom: Spacing.one,
  },
  modalSub: {
    ...Typography.bodySm,
    marginBottom: Spacing.four,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: Spacing.four,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  summaryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.xl,
  },
});
