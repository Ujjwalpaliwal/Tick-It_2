import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, TextInput } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Typography, Radius, Spacing, Semantic, Fonts } from '@/constants/theme';
import { Task, QuadrantMeta } from '@/store/types';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTimer } from '@/utils/dateHelpers';

interface FocusModeProps {
  task: Task | null;
  onSelectTask: (task: Task) => void;
  onExit: () => void;
}

type TimerState = 'idle' | 'running' | 'paused' | 'break';

const BREAK_DURATION = 5 * 60; // 5 minutes

const PRESETS = [
  { label: '🚀 15 min', duration: 15 * 60, title: '15m Sprint' },
  { label: '🎯 30 min', duration: 30 * 60, title: '30m Focus' },
  { label: '⚙️ Custom', duration: 0, title: 'Custom' },
];

const AMBIENTS = [
  { label: '🔇 Silence', id: 'silence', icon: '🔇' },
  { label: '🌧️ Rain', id: 'rain', icon: '🌧️' },
  { label: '🌲 Forest', id: 'forest', icon: '🌲' },
  { label: '☕ Cafe', id: 'cafe', icon: '☕' },
];

export default function FocusMode({ task, onSelectTask, onExit }: FocusModeProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { toggleSubtask, completeTask, tasks } = useTaskStore();
  const { recordFocusSession, focusSessions, profile } = useUserStore();
  const activeWS = profile.activeWorkspace;

  // Selected preset state (default to 30m Focus)
  const [presetIdx, setPresetIdx] = useState(1);
  const [customDuration, setCustomDuration] = useState(45 * 60); // 45m default for custom

  const activeDuration = PRESETS[presetIdx].duration || customDuration;

  // Timer states
  const [timeLeft, setTimeLeft] = useState(activeDuration);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [sessionTime, setSessionTime] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation state
  const [pulse, setPulse] = useState(false);

  // Custom Time Inputs
  const [customH, setCustomH] = useState('0');
  const [customM, setCustomM] = useState('45');
  const [customS, setCustomS] = useState('0');

  // Ambient sound state
  const [activeAmbient, setActiveAmbient] = useState('silence');
  const [barHeights, setBarHeights] = useState([12, 24, 8, 18, 14]);

  const currentTask = task ? useTaskStore.getState().tasks.find(t => t.id === task.id) ?? task : null;

  // Synchronize timer duration if preset or custom duration changes while idle
  useEffect(() => {
    if (timerState === 'idle') {
      setTimeLeft(activeDuration);
    }
  }, [presetIdx, customDuration, activeDuration, timerState]);

  // Breathing pulse effect
  useEffect(() => {
    if (timerState !== 'running') {
      setPulse(false);
      return;
    }
    const id = setInterval(() => {
      setPulse(p => !p);
    }, 1000);
    return () => clearInterval(id);
  }, [timerState]);

  // Soundwave visualizer effect
  useEffect(() => {
    if (activeAmbient === 'silence') return;
    const interval = setInterval(() => {
      setBarHeights([
        Math.floor(Math.random() * 22) + 6,
        Math.floor(Math.random() * 22) + 6,
        Math.floor(Math.random() * 22) + 6,
        Math.floor(Math.random() * 22) + 6,
        Math.floor(Math.random() * 22) + 6,
      ]);
    }, 180);
    return () => clearInterval(interval);
  }, [activeAmbient]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Timer tick logic
  useEffect(() => {
    if (timerState === 'running' || timerState === 'break') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerState === 'running') {
              setTimerState('break');
              setTimeLeft(BREAK_DURATION);
              recordFocusSession();
            } else {
              setTimerState('idle');
              setTimeLeft(activeDuration);
            }
            return 0;
          }
          return prev - 1;
        });
        if (timerState === 'running') {
          setSessionTime(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, activeDuration]);

  const startTimer = () => {
    setTimerState('running');
  };

  const pauseTimer = () => setTimerState('paused');
  const resumeTimer = () => setTimerState('running');

  const endSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setTimeLeft(activeDuration);
  };

  const applyCustomTime = () => {
    const h = parseInt(customH, 10) || 0;
    const m = parseInt(customM, 10) || 0;
    const s = parseInt(customS, 10) || 0;
    const totalSecs = h * 3600 + m * 60 + s;
    if (totalSecs > 0) {
      setCustomDuration(totalSecs);
      setTimeLeft(totalSecs);
    }
  };

  const handleComplete = () => {
    if (currentTask) {
      completeTask(currentTask.id);
      // Retrieve newly computed task details to find the awarded XP
      const updatedTask = useTaskStore.getState().tasks.find(t => t.id === currentTask.id);
      if (updatedTask && updatedTask.xpAwarded) {
        setXpEarned(updatedTask.xpAwarded);
      }
    }
    onExit();
  };

  // Filter pending active tasks in current workspace for picker
  const activeWorkspaceTasks = tasks.filter(
    t => t.workspace === activeWS && !t.completedAt && !t.isArchived
  );

  // Focus Task Picker View (Empty State)
  if (!currentTask) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topBar}>
          <Pressable onPress={onExit} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={16} color={theme.textSecondary} />
            <Text style={[styles.backText, { color: theme.textSecondary }]}>Exit</Text>
          </Pressable>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Focus Engine</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerEmoji}>🎯</Text>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Choose Focus Target</Text>
            <Text style={[styles.pickerSubtitle, { color: theme.textSecondary }]}>
              Select an active task to launch the circular Pomodoro timer and start earning double XP.
            </Text>
          </View>

          <View style={styles.taskList}>
            {activeWorkspaceTasks.length === 0 ? (
              <View style={[styles.emptyPickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.textTertiary, textAlign: 'center', fontSize: 13 }}>
                  No active tasks found. Go to the Tasks board to create items first!
                </Text>
              </View>
            ) : (
              activeWorkspaceTasks.map(t => {
                const qColor = QuadrantMeta[t.quadrant].color;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => onSelectTask(t)}
                    style={[styles.taskPickerRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={[styles.taskPickerLeft, { borderLeftColor: qColor, borderLeftWidth: 4 }]}>
                      <Text style={[styles.taskPickerTitle, { color: theme.text }]} numberOfLines={1}>
                        {t.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name={QuadrantMeta[t.quadrant].icon as any} size={10} color={qColor} />
                        <Text style={[styles.taskPickerSub, { color: theme.textSecondary }]}>
                          {QuadrantMeta[t.quadrant].label} • ⏳ {(t.estimatedMinutes / 60).toFixed(1)}h
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.pickerActionBtn, { backgroundColor: Semantic.accentBg }]}>
                      <Text style={{ color: Semantic.accent, fontSize: 11, fontWeight: '700' }}>FOCUS</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const qMeta = QuadrantMeta[currentTask.quadrant];

  // SVG parameters
  const radius = 80;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const currentTotal = timerState === 'break' ? BREAK_DURATION : activeDuration;
  const progressRatio = timeLeft / currentTotal;
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Streak indicator tomatoes
  const tomatoTarget = 4;
  const completedTomatoes = focusSessions;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={[styles.backBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
          <Ionicons name="swap-horizontal" size={14} color={theme.textSecondary} />
          <Text style={[styles.backText, { color: theme.textSecondary }]}>Change Task</Text>
        </Pressable>
        {xpEarned > 0 ? (
          <View style={[styles.xpBadge, { backgroundColor: Semantic.warningBg }]}>
            <Text style={[styles.xpText, { color: Semantic.xp }]}>+{xpEarned} XP Earned</Text>
          </View>
        ) : (
          <View style={[styles.xpBadge, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.xpText, { color: theme.textSecondary }]}>+10 XP / Session</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Task Title header card */}
        <View style={[styles.activeTaskCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: qMeta.color }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={qMeta.icon as any} size={12} color={qMeta.color} />
              <Text style={[styles.activeQuadrantTag, { color: qMeta.color }]}>
                {qMeta.label}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: currentTask.priority === 'critical' ? Semantic.dangerBg : currentTask.priority === 'high' ? Semantic.warningBg : theme.backgroundSelected }]}>
              <Text style={{ color: currentTask.priority === 'critical' ? Semantic.danger : currentTask.priority === 'high' ? Semantic.warning : theme.textSecondary, fontSize: 9, fontWeight: '700' }}>
                {currentTask.priority || 'medium'}
              </Text>
            </View>
          </View>
          <Text style={[styles.activeTaskTitle, { color: theme.text }]} numberOfLines={2}>
            {currentTask.title}
          </Text>
        </View>

        {/* Pomodoro Presets Selector */}
        <View style={[styles.presetContainer, { backgroundColor: theme.backgroundSelected }]}>
          {PRESETS.map((p, idx) => {
            const isSelected = presetIdx === idx;
            const isDisabled = timerState !== 'idle';
            return (
              <Pressable
                key={idx}
                disabled={isDisabled}
                onPress={() => setPresetIdx(idx)}
                style={[
                  styles.presetBtn,
                  isSelected && { backgroundColor: theme.surfaceElevated },
                  isDisabled && { opacity: 0.5 },
                ]}
              >
                <Text style={[styles.presetBtnText, { color: isSelected ? Semantic.accent : theme.textSecondary }]}>
                  {p.label}
                </Text>
                <Text style={[styles.presetSubText, { color: isSelected ? theme.text : theme.textTertiary }]}>
                  {p.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom time configuration panel */}
        {presetIdx === 2 && timerState === 'idle' && (
          <View style={[styles.customTimeContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.customTimeLabel, { color: theme.text }]}>Set Custom duration:</Text>
            <View style={styles.customTimeInputsRow}>
              <View style={styles.customInputCol}>
                <TextInput
                  style={[styles.customTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={customH}
                  onChangeText={setCustomH}
                  placeholder="HH"
                  placeholderTextColor={theme.textTertiary}
                />
                <Text style={[styles.customInputSubLabel, { color: theme.textSecondary }]}>Hours</Text>
              </View>
              <Text style={[styles.customColon, { color: theme.text }]}>:</Text>
              <View style={styles.customInputCol}>
                <TextInput
                  style={[styles.customTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={customM}
                  onChangeText={setCustomM}
                  placeholder="MM"
                  placeholderTextColor={theme.textTertiary}
                />
                <Text style={[styles.customInputSubLabel, { color: theme.textSecondary }]}>Mins</Text>
              </View>
              <Text style={[styles.customColon, { color: theme.text }]}>:</Text>
              <View style={styles.customInputCol}>
                <TextInput
                  style={[styles.customTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={customS}
                  onChangeText={setCustomS}
                  placeholder="SS"
                  placeholderTextColor={theme.textTertiary}
                />
                <Text style={[styles.customInputSubLabel, { color: theme.textSecondary }]}>Secs</Text>
              </View>
              
              <Pressable
                onPress={applyCustomTime}
                style={[styles.customTimeApplyBtn, { backgroundColor: Semantic.accent }]}
              >
                <Text style={styles.customTimeApplyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* SVG Circular countdown timer */}
        <View style={styles.timerSection}>
          <View style={styles.svgWrapper}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
              <Defs>
                <LinearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={timerState === 'break' ? Semantic.success : qMeta.color} />
                  <Stop offset="100%" stopColor={Semantic.accent} />
                </LinearGradient>
              </Defs>
              {/* Outer circle track */}
              <Circle
                cx="100"
                cy="100"
                r={radius}
                stroke={theme.border}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Active progress ring */}
              <Circle
                cx="100"
                cy="100"
                r={radius}
                stroke="url(#timerGrad)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
                opacity={pulse ? 0.85 : 1}
              />
            </Svg>
            
            {/* Countdown text display overlay */}
            <View style={styles.timerLabelOverlay}>
              <Text style={[styles.timerStateLabel, { color: timerState === 'break' ? Semantic.success : Semantic.accent }]}>
                {timerState === 'break' ? '☕ BREAK' : timerState === 'running' ? '🔥 FOCUSING' : timerState === 'paused' ? '⏸ PAUSED' : '🎯 READY'}
              </Text>
              <Text style={[styles.timerCountdownText, { color: theme.text }]}>
                {formatTimer(timeLeft)}
              </Text>
              <Text style={[styles.timerPercentageText, { color: theme.textTertiary }]}>
                {Math.round(progressRatio * 100)}% remaining
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Tomato Streak Tracker */}
        <View style={[styles.tomatoStreakCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.tomatoHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="flame" size={16} color={Semantic.danger} />
              <Text style={[styles.tomatoTitle, { color: theme.text }]}>Daily Tomato Streak</Text>
            </View>
            <Text style={[styles.tomatoSubText, { color: theme.textSecondary }]}>
              Goal: {tomatoTarget} pomodoros ({completedTomatoes} complete)
            </Text>
          </View>
          <View style={styles.tomatoRow}>
            {Array.from({ length: tomatoTarget }).map((_, index) => {
              const isDone = index < completedTomatoes;
              return (
                <View
                  key={index}
                  style={[
                    styles.tomatoSlot,
                    { backgroundColor: theme.backgroundSelected, borderColor: theme.border }
                  ]}
                >
                  <Text style={{ fontSize: 24, opacity: isDone ? 1 : 0.15 }}>🍅</Text>
                </View>
              );
            })}
            {completedTomatoes >= tomatoTarget && (
              <View style={[styles.targetClearedBadge, { backgroundColor: Semantic.successBg }]}>
                <Text style={{ color: Semantic.success, fontSize: 9, fontWeight: '700' }}>🏆 TARGET MET</Text>
              </View>
            )}
          </View>
        </View>

        {/* Ambient Noise Selector with animated Soundwave */}
        <View style={[styles.ambientCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="headset-outline" size={16} color={theme.text} />
                <Text style={[styles.ambientTitle, { color: theme.text }]}>Ambient Soundtrack</Text>
              </View>
              <Text style={[styles.ambientSubtitle, { color: theme.textSecondary }]}>Calm focus audio loop</Text>
            </View>
            
            {/* Simulated soundwave visualizer */}
            {activeAmbient !== 'silence' && (
              <View style={styles.soundwave}>
                {barHeights.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.soundwaveBar,
                      {
                        height: h,
                        backgroundColor: Semantic.accent,
                      }
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.ambientButtonsRow}>
            {AMBIENTS.map(amb => {
              const isCurrent = activeAmbient === amb.id;
              return (
                <Pressable
                  key={amb.id}
                  onPress={() => setActiveAmbient(amb.id)}
                  style={[
                    styles.ambientBtn,
                    { backgroundColor: theme.backgroundSelected },
                    isCurrent && { borderColor: Semantic.accent, borderWidth: 1.5 },
                  ]}
                >
                  <Text style={[styles.ambientBtnText, { color: isCurrent ? Semantic.accent : theme.text }]}>
                    {amb.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Timer Control Row */}
        <View style={styles.controlsRow}>
          {timerState === 'idle' && (
            <Pressable onPress={startTimer} style={[styles.actionBtn, { backgroundColor: qMeta.color }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Ionicons name="play" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Start Session</Text>
              </View>
            </Pressable>
          )}
          {timerState === 'running' && (
            <View style={{ flexDirection: 'row', gap: Spacing.three, width: '100%' }}>
              <Pressable onPress={pauseTimer} style={[styles.controlBtn, { flex: 1, backgroundColor: theme.backgroundSelected, borderWidth: 1, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Ionicons name="pause" size={14} color={theme.text} />
                  <Text style={[styles.controlBtnText, { color: theme.text }]}>Pause</Text>
                </View>
              </Pressable>
              <Pressable onPress={endSession} style={[styles.controlBtn, { flex: 1, backgroundColor: Semantic.danger }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Ionicons name="square" size={14} color="#FFFFFF" />
                  <Text style={[styles.controlBtnText, { color: '#FFFFFF' }]}>Reset</Text>
                </View>
              </Pressable>
            </View>
          )}
          {timerState === 'paused' && (
            <View style={{ flexDirection: 'row', gap: Spacing.three, width: '100%' }}>
              <Pressable onPress={resumeTimer} style={[styles.actionBtn, { flex: 1, backgroundColor: Semantic.success }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Ionicons name="play" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Resume</Text>
                </View>
              </Pressable>
              <Pressable onPress={endSession} style={[styles.controlBtn, { flex: 1, backgroundColor: Semantic.danger }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Ionicons name="square" size={14} color="#FFFFFF" />
                  <Text style={[styles.controlBtnText, { color: '#FFFFFF' }]}>Reset</Text>
                </View>
              </Pressable>
            </View>
          )}
          {timerState === 'break' && (
            <Pressable onPress={startTimer} style={[styles.actionBtn, { backgroundColor: Semantic.success }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Ionicons name="play" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Next Pomodoro</Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Session Stats card */}
        <View style={[styles.statsRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatTimer(sessionTime)}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Focus Time</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {currentTask.subtasks ? currentTask.subtasks.filter(s => s.completed).length : 0}/
              {currentTask.subtasks ? currentTask.subtasks.length : 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Subtasks Done</Text>
          </View>
        </View>

        {/* Subtask Section Checklist */}
        {currentTask.subtasks && currentTask.subtasks.length > 0 && (
          <View style={styles.subtaskSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
              <Ionicons name="checkbox-outline" size={16} color={theme.text} />
              <Text style={[styles.subtaskSectionTitle, { color: theme.text, marginBottom: 0 }]}>Session Subtasks</Text>
            </View>
            {currentTask.subtasks.map(sub => (
              <Pressable
                key={sub.id}
                onPress={() => toggleSubtask(currentTask.id, sub.id)}
                style={[styles.subtaskRow, { borderColor: theme.borderLight }]}
              >
                <View style={[styles.subtaskCheck, {
                  backgroundColor: sub.completed ? Semantic.success : 'transparent',
                  borderColor: sub.completed ? Semantic.success : theme.border,
                }]}>
                  {sub.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.subtaskText, {
                  color: sub.completed ? theme.textTertiary : theme.text,
                  textDecorationLine: sub.completed ? 'line-through' : 'none',
                }]}>
                  {sub.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Complete Task Button */}
        <Pressable onPress={handleComplete} style={[styles.completeTaskBtn, { backgroundColor: Semantic.success }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
            <Text style={styles.completeTaskBtnText}>Mark Task Complete</Text>
          </View>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
  },
  backText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  screenTitle: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  xpBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.xl,
  },
  xpText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.five,
  },
  // Task Selector Empty State
  pickerContent: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.eight,
  },
  pickerHeader: {
    alignItems: 'center',
    marginVertical: Spacing.six,
  },
  pickerEmoji: {
    fontSize: 52,
    marginBottom: Spacing.three,
  },
  pickerTitle: {
    ...Typography.h2,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  pickerSubtitle: {
    ...Typography.bodySm,
    textAlign: 'center',
    lineHeight: 18,
  },
  taskList: {
    gap: Spacing.three,
  },
  emptyPickerCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
  },
  taskPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  taskPickerLeft: {
    flex: 1,
    paddingLeft: Spacing.three,
  },
  taskPickerTitle: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  taskPickerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  pickerActionBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  // Active Task Card
  activeTaskCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  activeQuadrantTag: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  activeTaskTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  // Preset selector
  presetContainer: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    padding: 4,
    gap: 4,
    marginBottom: Spacing.five,
  },
  presetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetSubText: {
    fontSize: 9,
    marginTop: 1,
  },
  // Svg countdown timer overlay layout
  timerSection: {
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  svgWrapper: {
    position: 'relative',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabelOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStateLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.one,
  },
  timerCountdownText: {
    fontSize: 36,
    fontWeight: '300',
    fontFamily: Fonts?.mono,
    letterSpacing: 1,
  },
  timerPercentageText: {
    fontSize: 9,
    marginTop: Spacing.one,
  },
  // Daily tomatoes target card
  tomatoStreakCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  tomatoHeader: {
    marginBottom: Spacing.three,
  },
  tomatoTitle: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  tomatoSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  tomatoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  tomatoSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetClearedBadge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.md,
    marginLeft: 'auto',
  },
  // Ambient Sound Toggles
  ambientCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  ambientTitle: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  ambientSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  soundwave: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    gap: 3,
    paddingHorizontal: Spacing.two,
  },
  soundwaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  ambientButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ambientBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Control actions row
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  controlBtn: {
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginHorizontal: Spacing.three,
  },
  // Subtasks section
  subtaskSection: {
    marginBottom: Spacing.five,
  },
  subtaskSectionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 0.5,
  },
  subtaskCheck: {
    width: 24,
    height: 24,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtaskText: {
    ...Typography.bodySm,
    flex: 1,
  },
  // Mark completed button
  completeTaskBtn: {
    paddingVertical: Spacing.four,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  completeTaskBtnText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Custom timer configurations
  customTimeContainer: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  customTimeLabel: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  customTimeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  customInputCol: {
    flex: 1,
    alignItems: 'center',
  },
  customTextInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  customInputSubLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  customColon: {
    fontSize: 16,
    fontWeight: '700',
    paddingBottom: 12,
  },
  customTimeApplyBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  customTimeApplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
