import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { Task, QuadrantMeta, Subtask, Comment } from '@/store/types';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDeadlineLabel, isOverdue, formatDate, generateId } from '@/utils/dateHelpers';

interface TaskDetailSheetProps {
  task: Task;
  onClose: () => void;
  onFocusMode?: (task: Task) => void;
}

export default function TaskDetailSheet({ task, onClose, onFocusMode }: TaskDetailSheetProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const { 
    updateTask, 
    deleteTask, 
    completeTask, 
    addSubtask, 
    toggleSubtask, 
    removeSubtask,
    assignTask,
    addComment,
    startTask,
    requestApproval,
    approveTask,
    requestChanges,
    tasks
  } = useTaskStore();

  const { profile, activeSimulatedMemberId } = useUserStore();
  const activeWS = profile.activeWorkspace;
  const teammates = profile.startupOrg?.members || [];

  const qMeta = QuadrantMeta[task.quadrant];

  // Core Form
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [newSubtask, setNewSubtask] = useState('');
  const [urgency, setUrgency] = useState(task.urgency);
  const [importance, setImportance] = useState(task.importance);

  // Extended Tick-It Form
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [blockers, setBlockers] = useState(task.blockers || '');
  const [dependencyTaskId, setDependencyTaskId] = useState(task.dependencyTaskId);
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes?.toString() || '30');

  // Comments feed
  const [commentInput, setCommentInput] = useState('');
  const [commentsList, setCommentsList] = useState<Comment[]>(task.comments || []);

  const handleSave = () => {
    const selectedTeammate = teammates.find(m => m.id === assigneeId);
    
    updateTask(task.id, { 
      title, 
      description, 
      urgency, 
      importance,
      assigneeId,
      assigneeName: selectedTeammate ? selectedTeammate.name : null,
      assigneeRole: selectedTeammate ? selectedTeammate.role : null,
      priority: priority as any,
      dependencyTaskId,
      blockers: blockers.trim(),
      estimatedMinutes: parseInt(estimatedMinutes) || 30
    });
    onClose();
  };

  const handleComplete = () => {
    completeTask(task.id);
    onClose();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    addSubtask(task.id, newSubtask.trim());
    setNewSubtask('');
  };

  const handlePostComment = () => {
    if (!commentInput.trim()) return;
    const authorId = activeSimulatedMemberId || 'founder';
    const authorName = activeSimulatedMemberId 
      ? (teammates.find(m => m.id === activeSimulatedMemberId)?.name || 'Teammate')
      : (profile.name || 'Founder');
    const authorRole = activeSimulatedMemberId
      ? (teammates.find(m => m.id === activeSimulatedMemberId)?.role || 'Developer')
      : 'Founder';

    addComment(task.id, authorId, authorName, authorRole, commentInput.trim());
    
    setCommentsList(prev => [
      ...prev,
      {
        id: generateId(),
        authorId,
        authorName,
        authorRole,
        text: commentInput.trim(),
        createdAt: new Date().toISOString()
      }
    ]);
    setCommentInput('');
  };

  const progress = task.subtasks.length > 0
    ? Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)
    : task.progress;

  // Context-aware execution workflow
  const renderWorkflowButtons = () => {
    const isTeammateAssigned = task.assigneeId !== null;
    const isSimulatingAssignee = activeSimulatedMemberId === task.assigneeId;

    if (!isTeammateAssigned || activeWS === 'personal') {
      return (
        <Pressable
          onPress={handleComplete}
          style={[styles.actionBtn, { backgroundColor: Semantic.successBg }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="checkmark-outline" size={14} color={Semantic.success} />
            <Text style={[styles.actionBtnText, { color: Semantic.success }]}>Complete Task</Text>
          </View>
        </Pressable>
      );
    }

    if (isSimulatingAssignee) {
      const canStart = task.progress === 0 || task.approvalStatus === 'changes_requested';
      return (
        <View style={{ flexDirection: 'row', gap: Spacing.two, width: '100%' }}>
          {canStart && (
            <Pressable
              onPress={() => {
                startTask(task.id);
                onClose();
              }}
              style={[styles.actionBtn, { backgroundColor: Semantic.infoBg, flex: 1 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Ionicons name="flash-outline" size={14} color={Semantic.info} />
                <Text style={[styles.actionBtnText, { color: Semantic.info }]}>Start Work</Text>
              </View>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              requestApproval(task.id, "Ready for evaluation. Completed all subtasks.");
              onClose();
            }}
            style={[styles.actionBtn, { backgroundColor: Semantic.successBg, flex: 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Ionicons name="send-outline" size={14} color={Semantic.success} />
              <Text style={[styles.actionBtnText, { color: Semantic.success }]}>Request Approval</Text>
            </View>
          </Pressable>
        </View>
      );
    } else if (activeSimulatedMemberId === null) {
      if (task.approvalStatus === 'pending_approval') {
        return (
          <View style={{ flexDirection: 'row', gap: Spacing.two, width: '100%' }}>
            <Pressable
              onPress={() => {
                approveTask(task.id);
                onClose();
              }}
              style={[styles.actionBtn, { backgroundColor: Semantic.success, flex: 1 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Approve</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.prompt(
                  "Request Changes",
                  "Enter specific review feedback:",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Submit Feedback", 
                      onPress: (text?: string) => {
                        if (text) {
                          requestChanges(task.id, text);
                          onClose();
                        }
                      } 
                    }
                  ]
                );
              }}
              style={[styles.actionBtn, { backgroundColor: Semantic.danger, flex: 1 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Ionicons name="close-circle-outline" size={14} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Request Changes</Text>
              </View>
            </Pressable>
          </View>
        );
      } else {
        return (
          <View style={[styles.infoBanner, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
              Assignee: {task.assigneeName} ({task.assigneeRole}) is working. Status: {task.approvalStatus === 'changes_requested' ? 'Reworking' : 'In Progress'}.
            </Text>
          </View>
        );
      }
    } else {
      return (
        <View style={[styles.infoBanner, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
            Assigned to {task.assigneeName}. Switch to {task.assigneeName} in Settings simulation to complete this work.
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
 
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quadrant Badge */}
            <View style={[styles.quadrantBadge, { backgroundColor: qMeta.bg }]}>
              <Ionicons name={qMeta.icon as any} size={15} color={qMeta.color} />
              <Text style={[styles.quadrantLabel, { color: qMeta.color }]}>{qMeta.label}</Text>
              <View style={[styles.scoreCircle, { borderColor: qMeta.color }]}>
                <Text style={[styles.scoreText, { color: qMeta.color }]}>{task.priorityScore}</Text>
              </View>
            </View>
 
            {/* Title */}
            <TextInput
              style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.borderLight }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Task title..."
              placeholderTextColor={theme.textTertiary}
              multiline
            />
 
            {/* Description */}
            <TextInput
              style={[styles.descInput, { color: theme.textSecondary, borderColor: theme.borderLight, backgroundColor: theme.backgroundElement }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add description..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={2}
            />

            {/* Assignee Selection (Startup Only) */}
            {activeWS === 'startup' && (
              <View style={styles.pickerSection}>
                <Text style={[styles.pickerTitle, { color: theme.textSecondary }]}>Assignee Teammate</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Pressable
                    onPress={() => setAssigneeId(null)}
                    style={[
                      styles.chip,
                      assigneeId === null
                        ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                        : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: assigneeId === null ? '#FFFFFF' : theme.textSecondary }}>
                      👑 Founder (You)
                    </Text>
                  </Pressable>
                  {teammates.map(m => (
                    <Pressable
                      key={m.id}
                      onPress={() => setAssigneeId(m.id)}
                      style={[
                        styles.chip,
                        assigneeId === m.id
                          ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                          : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: assigneeId === m.id ? '#FFFFFF' : theme.textSecondary }}>
                        {m.avatar} {m.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Priority Selection */}
            <View style={styles.pickerSection}>
              <Text style={[styles.pickerTitle, { color: theme.textSecondary }]}>Priority Level</Text>
              <View style={styles.chipRow}>
                {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.chip,
                      priority === p
                        ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                        : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                    ]}
                  >
                    <Text style={{ fontSize: 11, textTransform: 'capitalize', fontWeight: '600', color: priority === p ? '#FFFFFF' : theme.textSecondary }}>
                      {p === 'critical' ? '🔥 ' : p === 'high' ? '⚡ ' : ''}{p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Dependency Selector */}
            <View style={styles.pickerSection}>
              <Text style={[styles.pickerTitle, { color: theme.textSecondary }]}>Depends On (Blocks This Task)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable
                  onPress={() => setDependencyTaskId(null)}
                  style={[
                    styles.chip,
                    dependencyTaskId === null
                      ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                      : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dependencyTaskId === null ? '#FFFFFF' : theme.textSecondary }}>
                    None
                  </Text>
                </Pressable>
                {tasks.filter(t => t.id !== task.id && t.workspace === activeWS && !t.completedAt).map(t => (
                  <Pressable
                    key={t.id}
                    onPress={() => setDependencyTaskId(t.id)}
                    style={[
                      styles.chip,
                      dependencyTaskId === t.id
                        ? { backgroundColor: Semantic.accent, borderColor: Semantic.accent }
                        : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: dependencyTaskId === t.id ? '#FFFFFF' : theme.textSecondary }}>
                      🔗 {t.title.substring(0, 15)}...
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Blockers & Duration Rows */}
            <View style={styles.gridFormRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerTitle, { color: theme.textSecondary }]}>Blockers Info</Text>
                <TextInput
                  style={[styles.smallInput, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundElement }]}
                  placeholder="e.g. Design assets"
                  placeholderTextColor={theme.textTertiary}
                  value={blockers}
                  onChangeText={setBlockers}
                />
              </View>
              <View style={{ width: 100 }}>
                <Text style={[styles.pickerTitle, { color: theme.textSecondary }]}>Est. Mins</Text>
                <TextInput
                  style={[styles.smallInput, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundElement, textAlign: 'center' }]}
                  placeholder="30"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={estimatedMinutes}
                  onChangeText={setEstimatedMinutes}
                />
              </View>
            </View>
 
            {/* Deadline */}
            {task.deadline && (
              <View style={[styles.infoRow, { borderColor: theme.borderLight }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                </View>
                <Text style={[styles.infoValue, {
                  color: isOverdue(task.deadline) ? Semantic.danger : theme.text,
                }]}>
                  {getDeadlineLabel(task.deadline)} · {formatDate(task.deadline)}
                </Text>
              </View>
            )}
 
            {/* Urgency Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Urgency</Text>
                </View>
                <Text style={[styles.sliderValue, { color: Semantic.danger }]}>{urgency}</Text>
              </View>
              <View style={[styles.sliderTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.sliderFill, { width: `${urgency}%`, backgroundColor: Semantic.danger }]} />
              </View>
              <View style={styles.sliderButtons}>
                {[0, 25, 50, 75, 100].map(v => (
                  <Pressable
                    key={v}
                    onPress={() => setUrgency(v)}
                    style={[styles.sliderBtn, {
                      backgroundColor: urgency === v ? Semantic.dangerBg : theme.backgroundSelected,
                      borderColor: urgency === v ? Semantic.danger : 'transparent',
                    }]}
                  >
                    <Text style={[styles.sliderBtnText, { color: urgency === v ? Semantic.danger : theme.textSecondary }]}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
 
            {/* Importance Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="star-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Importance</Text>
                </View>
                <Text style={[styles.sliderValue, { color: Semantic.info }]}>{importance}</Text>
              </View>
              <View style={[styles.sliderTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.sliderFill, { width: `${importance}%`, backgroundColor: Semantic.info }]} />
              </View>
              <View style={styles.sliderButtons}>
                {[0, 25, 50, 75, 100].map(v => (
                  <Pressable
                    key={v}
                    onPress={() => setImportance(v)}
                    style={[styles.sliderBtn, {
                      backgroundColor: importance === v ? Semantic.infoBg : theme.backgroundSelected,
                      borderColor: importance === v ? Semantic.info : 'transparent',
                    }]}
                  >
                    <Text style={[styles.sliderBtnText, { color: importance === v ? Semantic.info : theme.textSecondary }]}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
 
            {/* Progress */}
            {progress > 0 && (
              <View style={styles.progressSection}>
                <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progress</Text>
                <View style={[styles.progressBarOuter, { backgroundColor: theme.backgroundSelected }]}>
                  <View style={[styles.progressBarInner, {
                    width: `${progress}%`,
                    backgroundColor: progress === 100 ? Semantic.success : qMeta.color,
                  }]} />
                </View>
                <Text style={[styles.progressValue, { color: theme.textSecondary }]}>{progress}%</Text>
              </View>
            )}
 
            {/* Subtasks */}
            <View style={styles.subtaskSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Subtasks</Text>
              {task.subtasks.map((sub) => (
                <Pressable
                  key={sub.id}
                  onPress={() => toggleSubtask(task.id, sub.id)}
                  style={[styles.subtaskRow, { borderColor: theme.borderLight }]}
                >
                  <View style={[styles.subtaskCheck, {
                    backgroundColor: sub.completed ? Semantic.success : 'transparent',
                    borderColor: sub.completed ? Semantic.success : theme.border,
                  }]}>
                    {sub.completed && <Text style={styles.subtaskCheckmark}>✓</Text>}
                  </View>
                  <Text style={[styles.subtaskText, {
                    color: sub.completed ? theme.textTertiary : theme.text,
                    textDecorationLine: sub.completed ? 'line-through' : 'none',
                  }]}>
                    {sub.title}
                  </Text>
                  <Pressable onPress={() => removeSubtask(task.id, sub.id)} hitSlop={8}>
                    <Text style={{ color: theme.textTertiary, fontSize: 14 }}>✕</Text>
                  </Pressable>
                </Pressable>
              ))}
              {/* Add subtask input */}
              <View style={[styles.addSubtaskRow, { borderColor: theme.borderLight }]}>
                <Text style={{ color: theme.textTertiary, fontSize: 14 }}>+</Text>
                <TextInput
                  style={[styles.addSubtaskInput, { color: theme.text }]}
                  value={newSubtask}
                  onChangeText={setNewSubtask}
                  onSubmitEditing={handleAddSubtask}
                  placeholder="Add subtask..."
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="done"
                />
              </View>
            </View>



            {/* Comments Feed Section */}
            <View style={styles.commentsSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
                <Ionicons name="chatbubbles-outline" size={18} color={theme.text} />
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Team Chat & Notes ({commentsList.length})</Text>
              </View>
              <View style={styles.commentsList}>
                {commentsList.length === 0 ? (
                  <Text style={{ color: theme.textTertiary, fontStyle: 'italic', fontSize: 11, paddingVertical: Spacing.two }}>
                    No comments yet. Write a comment to coordinate.
                  </Text>
                ) : (
                  commentsList.map(c => (
                    <View key={c.id} style={[styles.commentBubble, { backgroundColor: theme.backgroundSelected }]}>
                      <View style={styles.commentHeader}>
                        <Text style={[styles.commentAuthor, { color: Semantic.accent }]}>{c.authorName}</Text>
                        <Text style={[styles.commentRole, { color: theme.textSecondary }]}>{c.authorRole}</Text>
                      </View>
                      <Text style={[styles.commentText, { color: theme.text }]}>{c.text}</Text>
                    </View>
                  ))
                )}
              </View>
              <View style={styles.commentInputRow}>
                <TextInput
                  style={[styles.commentInput, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundElement }]}
                  placeholder="Add a comment..."
                  placeholderTextColor={theme.textTertiary}
                  value={commentInput}
                  onChangeText={setCommentInput}
                />
                <Pressable onPress={handlePostComment} style={[styles.commentSendBtn, { backgroundColor: Semantic.accent }]}>
                  <Text style={styles.commentSendBtnText}>Post</Text>
                </Pressable>
              </View>
            </View>
 
            {/* Workflow Buttons */}
            <View style={styles.actionButtons}>
              {onFocusMode && !task.assigneeId && (
                <Pressable
                  onPress={() => onFocusMode(task)}
                  style={[styles.actionBtn, { backgroundColor: Semantic.accentBg }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <Ionicons name="play-outline" size={14} color={Semantic.accent} />
                    <Text style={[styles.actionBtnText, { color: Semantic.accent }]}>Focus Mode</Text>
                  </View>
                </Pressable>
              )}
              {renderWorkflowButtons()}
              <Pressable
                onPress={handleDelete}
                style={[styles.actionBtn, { backgroundColor: Semantic.dangerBg }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Ionicons name="trash-outline" size={14} color={Semantic.danger} />
                  <Text style={[styles.actionBtnText, { color: Semantic.danger }]}>Delete</Text>
                </View>
              </Pressable>
            </View>
 
            {/* Save button */}
            <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: Semantic.accent }]}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
 
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: Spacing.five,
  },
  quadrantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    marginBottom: Spacing.three,
  },
  quadrantEmoji: { fontSize: 18 },
  quadrantLabel: {
    ...Typography.label,
    flex: 1,
    textTransform: 'uppercase',
  },
  scoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  titleInput: {
    ...Typography.h2,
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.three,
  },
  descInput: {
    ...Typography.bodySm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  pickerSection: {
    marginBottom: Spacing.four,
  },
  pickerTitle: {
    ...Typography.captionSm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFormRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  smallInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  infoLabel: {
    ...Typography.bodySmMedium,
  },
  infoValue: {
    ...Typography.bodySmMedium,
  },
  // Sliders
  sliderSection: {
    marginBottom: Spacing.four,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sliderLabel: {
    ...Typography.bodySmMedium,
  },
  sliderValue: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: Spacing.two,
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  sliderBtnText: {
    ...Typography.captionSm,
    fontWeight: '600',
  },
  // Progress
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  progressLabel: {
    ...Typography.bodySmMedium,
  },
  progressBarOuter: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  progressBarInner: {
    height: 8,
    borderRadius: 4,
  },
  progressValue: {
    ...Typography.caption,
    fontWeight: '700',
  },
  // Subtasks
  subtaskSection: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.three,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 0.5,
  },
  subtaskCheck: {
    width: 20,
    height: 20,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  subtaskText: {
    ...Typography.bodySm,
    flex: 1,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 0.5,
  },
  addSubtaskInput: {
    ...Typography.bodySm,
    flex: 1,
    paddingVertical: Spacing.one,
  },
  // AI Reasoning
  aiReasoningCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  aiLabel: {
    ...Typography.label,
    marginBottom: Spacing.one,
  },
  aiText: {
    ...Typography.bodySm,
    fontStyle: 'italic',
  },
  // Comments
  commentsSection: {
    marginBottom: Spacing.five,
  },
  commentsList: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  commentBubble: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentRole: {
    fontSize: 9,
  },
  commentText: {
    ...Typography.bodySm,
    lineHeight: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
  },
  commentSendBtn: {
    paddingHorizontal: Spacing.four,
    height: 42,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  infoBanner: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Actions
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  saveBtn: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  saveBtnText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
