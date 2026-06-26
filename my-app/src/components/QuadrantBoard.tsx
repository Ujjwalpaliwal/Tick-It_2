import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { Quadrant, QuadrantMeta, Task } from '@/store/types';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TaskCard from './TaskCard';
import AITaskInput from './AITaskInput';
import TaskDetailSheet from './TaskDetailSheet';

const { width } = Dimensions.get('window');
const QUADRANT_GAP = 6;
const QUADRANT_WIDTH = (width - Spacing.four * 2 - QUADRANT_GAP) / 2;

const EMPTY_STATE_TEXTS: Record<Quadrant, string> = {
  [Quadrant.DO_FIRST]: 'Urgent and Important',
  [Quadrant.SCHEDULE]: 'Important and not urgent',
  [Quadrant.DELEGATE]: 'Urgent and not important',
  [Quadrant.ELIMINATE]: 'Not urgent and not important',
};

interface QuadrantBoardProps {
  onFocusMode?: (task: Task) => void;
}

export default function QuadrantBoard({ onFocusMode }: QuadrantBoardProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const { 
    tasks,
    getTasksByQuadrant, 
    completeTask, 
    getActiveTasks, 
    getTodayCompleted,
    updateTask,
    addComment,
    requestApproval
  } = useTaskStore();

  const { profile, setActiveWorkspace, activeSimulatedMemberId } = useUserStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const ensureLoggedIn = (actionDescription: string) => {
    if (!profile.isLoggedIn) {
      Alert.alert(
        'Authentication Required',
        `You must log in or register to ${actionDescription}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login / Register', onPress: () => router.push('/login' as any) }
        ]
      );
      return false;
    }
    return true;
  };

  const handleTeammateAction = () => {
    if (ensureLoggedIn('trigger simulation actions')) {
      triggerTeammateActivity();
    }
  };

  const quadrants = [Quadrant.DO_FIRST, Quadrant.SCHEDULE, Quadrant.DELEGATE, Quadrant.ELIMINATE];

  // Filters for tasks
  const activeWS = profile.activeWorkspace;
  const simulatedMember = profile.startupOrg?.members.find(m => m.id === activeSimulatedMemberId);

  // The store automatically filters visible tasks based on workspace, assignee, and mentions
  const activeTasks = getActiveTasks();
  
  const todayDone = getTodayCompleted();

  const handleComplete = (task: Task) => {
    completeTask(task.id);
    setRefreshKey(k => k + 1);
  };

  // --- REAL-TIME TEAM ACTIVITY SIMULATOR ---
  const triggerTeammateActivity = () => {
    // Pick a random teammate
    const teammates = profile.startupOrg?.members || [];
    if (teammates.length === 0) return;
    const randomTeammate = teammates[Math.floor(Math.random() * teammates.length)];

    // Find startup tasks assigned to this teammate that aren't completed
    const teammateTasks = tasks.filter(t => 
      t.workspace === 'startup' && 
      t.assigneeId === randomTeammate.id && 
      t.completedAt === null
    );

    if (teammateTasks.length === 0) {
      Alert.alert(
        'Teammate Idle',
        `No tasks are currently assigned to ${randomTeammate.name}. Assign a startup task to them first in Settings or Task details.`
      );
      return;
    }

    // Pick a random task of theirs
    const randomTask = teammateTasks[Math.floor(Math.random() * teammateTasks.length)];

    // Choose a random action
    const actions = ['progress', 'comment', 'request_approval', 'ai_quadrant_suggestion'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    if (randomAction === 'progress') {
      const nextProgress = Math.min(90, (randomTask.progress || 0) + 20);
      updateTask(randomTask.id, { progress: nextProgress });
      Alert.alert(
        '⚡ Progress Update',
        `${randomTeammate.name} has completed ${nextProgress}% of "${randomTask.title}".`
      );
    } else if (randomAction === 'comment') {
      const comments = [
        "Working on refining the codebase structure now.",
        "Ran into some minor build errors, fixing them.",
        "Drafting docs. Ready to integrate soon.",
        "Could use a hand checking the design guidelines."
      ];
      const commentText = comments[Math.floor(Math.random() * comments.length)];
      addComment(randomTask.id, randomTeammate.id, randomTeammate.name, randomTeammate.role, commentText);
      Alert.alert(
        '💬 New Team Comment',
        `${randomTeammate.name} commented on "${randomTask.title}": "${commentText}"`
      );
    } else if (randomAction === 'request_approval') {
      requestApproval(randomTask.id, "Simulated auto-delivery by teammate.");
      Alert.alert(
        '📥 Review Requested',
        `${randomTeammate.name} marked "${randomTask.title}" as complete. Review it on the Dashboard!`
      );
    } else {
      // AI Quadrant Suggestion Action
      const isUrgent = randomTask.quadrant !== Quadrant.DO_FIRST;
      if (isUrgent) {
        updateTask(randomTask.id, {
          aiReasoning: `AI ALERT: Deadline approaching within 6 hours. Recommend moving to Quadrant 1 (Do First).`,
        });
        Alert.alert(
          '🤖 Smart AI Suggestion',
          `AI detects approaching deadline for "${randomTask.title}". Re-routing suggestion updated in drawer.`
        );
      }
    }
    setRefreshKey(k => k + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Simulation Warning Bar */}
      {activeSimulatedMemberId !== null && (
        <View style={[styles.simWarningBar, { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="warning-outline" size={13} color="#000000" />
          <Text style={styles.simWarningText}>
            Simulating Teammate: Act as {simulatedMember?.name} ({simulatedMember?.role})
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appTitle, { color: theme.text }]}>Tick-It Board</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {activeTasks.length} active · {todayDone} done today
          </Text>
        </View>
        
        {!profile.isLoggedIn ? (
          <Pressable
            onPress={() => router.push('/login' as any)}
            style={[styles.loginHeaderBtn, { backgroundColor: Semantic.accent }]}
          >
            <Text style={styles.loginHeaderBtnText}>Sign In / Register</Text>
          </Pressable>
        ) : (
          activeWS === 'startup' && (
            <Pressable
              onPress={handleTeammateAction}
              style={[styles.statsChip, { backgroundColor: Semantic.accentBg }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                <Ionicons name="flash" size={12} color={Semantic.accent} />
                <Text style={[styles.statsChipText, { color: Semantic.accent }]}>
                  Sim Team Action
                </Text>
              </View>
            </Pressable>
          )
        )}
      </View>

      {/* Workspace Switcher */}
      <View style={styles.switcherContainer}>
        <Pressable
          onPress={() => {
            if (ensureLoggedIn('switch workspaces')) {
              setActiveWorkspace('personal');
            }
          }}
          style={[
            styles.switchBtn,
            activeWS === 'personal' ? {
              backgroundColor: Semantic.accentBg,
              borderColor: Semantic.accent,
            } : {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.switchContent}>
            <Ionicons
              name={activeWS === 'personal' ? "home" : "home-outline"}
              size={14}
              color={activeWS === 'personal' ? Semantic.accent : theme.textSecondary}
            />
            <Text style={[styles.switchText, activeWS === 'personal' ? { color: Semantic.accent, fontWeight: '700' } : { color: theme.textSecondary }]}>
              Personal
            </Text>
          </View>
        </Pressable>
        
        <Pressable
          onPress={() => {
            if (ensureLoggedIn('switch workspaces')) {
              setActiveWorkspace('startup');
            }
          }}
          style={[
            styles.switchBtn,
            activeWS === 'startup' ? {
              backgroundColor: Semantic.accentBg,
              borderColor: Semantic.accent,
            } : {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.switchContent}>
            <Ionicons
              name={activeWS === 'startup' ? "business" : "business-outline"}
              size={14}
              color={activeWS === 'startup' ? Semantic.accent : theme.textSecondary}
            />
            <Text style={[styles.switchText, activeWS === 'startup' ? { color: Semantic.accent, fontWeight: '700' } : { color: theme.textSecondary }]}>
              Startup Org
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Quadrant Grid */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {quadrants.map(q => {
            const meta = QuadrantMeta[q];
            // The store automatically filters visible tasks based on workspace, assignee, and mentions
            const quadrantTasks = getTasksByQuadrant(q);

            return (
              <View
                key={q}
                style={[styles.quadrant, {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                }]}
              >
                {/* Quadrant Header */}
                <View style={[styles.qHeader, { borderBottomColor: meta.color }]}>
                  <Ionicons name={meta.icon as any} size={15} color={meta.color} />
                  <Text style={[styles.qLabel, { color: meta.color }]}>{meta.label}</Text>
                  <View style={[styles.qCount, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.qCountText, { color: meta.color }]}>{quadrantTasks.length}</Text>
                  </View>
                </View>

                {/* Task List */}
                <ScrollView
                  style={styles.qScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {quadrantTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyText, { color: theme.textTertiary, textAlign: 'center', fontSize: 11, paddingHorizontal: 4 }]}>
                        {EMPTY_STATE_TEXTS[q]}
                      </Text>
                    </View>
                  ) : (
                    quadrantTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onPress={(t) => {
                          if (ensureLoggedIn('view task details')) {
                            setSelectedTask(t);
                          }
                        }}
                        onLongPress={(t) => {
                          if (ensureLoggedIn('start focus mode')) {
                            onFocusMode?.(t);
                          }
                        }}
                        onComplete={(t) => {
                          if (ensureLoggedIn('complete tasks')) {
                            handleComplete(t);
                          }
                        }}
                      />
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* AI Task Input */}
      <AITaskInput onTaskAdded={() => setRefreshKey(k => k + 1)} />

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onFocusMode={(task) => {
            setSelectedTask(null);
            onFocusMode?.(task);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  simWarningBar: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    alignItems: 'center',
  },
  simWarningText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  appTitle: {
    ...Typography.h2,
    fontWeight: '800',
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  statsChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.xl,
  },
  statsChipText: {
    ...Typography.captionSm,
    fontWeight: '700',
  },
  switcherContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  switchText: {
    ...Typography.bodySmMedium,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: QUADRANT_GAP,
  },
  quadrant: {
    width: QUADRANT_WIDTH,
    minHeight: 220,
    maxHeight: 360,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1.5,
  },
  qEmoji: {
    fontSize: 14,
  },
  qLabel: {
    ...Typography.captionSm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  qCount: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qCountText: {
    ...Typography.captionSm,
    fontWeight: '800',
  },
  qScroll: {
    flex: 1,
    padding: Spacing.two,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.eight,
  },
  emptyText: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  loginHeaderBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});

