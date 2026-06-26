import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Circle, Text as SvgText, Path, Defs, Marker, Pattern, Rect } from 'react-native-svg';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { Colors, Typography, Radius, Spacing, Semantic } from '@/constants/theme';
import { Task, QuadrantMeta, Quadrant } from '@/store/types';
import { Ionicons } from '@expo/vector-icons';
import TaskDetailSheet from '@/components/TaskDetailSheet';
import AuthRequired from '@/components/AuthRequired';

export default function TimelineScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const { tasks } = useTaskStore();
  const { profile } = useUserStore();
  const activeWS = profile.activeWorkspace;

  const [activeSubTab, setActiveSubTab] = useState<'sprint' | 'dependencies'>('sprint');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filter tasks for active workspace
  const workspaceTasks = tasks.filter(t => t.workspace === activeWS && !t.isArchived);

  // --- SPRINT ROADMAP CALCS ---
  // Group workspace tasks dynamically by Eisenhower urgency/importance
  // Sprint 1 (Active/Urgent): Quadrant 1 (DO_FIRST) & Quadrant 3 (DELEGATE)
  const sprint1Tasks = workspaceTasks.filter(
    t => t.quadrant === Quadrant.DO_FIRST || t.quadrant === Quadrant.DELEGATE
  );
  
  // Sprint 2 (Planned/Next): Quadrant 2 (SCHEDULE)
  const sprint2Tasks = workspaceTasks.filter(t => t.quadrant === Quadrant.SCHEDULE);
  
  // Product Backlog: Quadrant 4 (ELIMINATE)
  const backlogTasks = workspaceTasks.filter(t => t.quadrant === Quadrant.ELIMINATE);

  // Active Sprint Stats calculations
  const totalSprint1Minutes = sprint1Tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
  const totalSprint1Hours = (totalSprint1Minutes / 60).toFixed(1);
  const completedSprint1Count = sprint1Tasks.filter(t => t.completedAt !== null).length;
  const totalSprint1Count = sprint1Tasks.length;
  const sprint1Progress = totalSprint1Count > 0 ? Math.round((completedSprint1Count / totalSprint1Count) * 100) : 0;
  const blockedSprint1Count = sprint1Tasks.filter(t => t.blockers || t.dependencyTaskId).length;

  // --- SVG DEPENDENCY GRAPH DATA AND LAYOUT ---
  // 1. Calculate dynamic topological levels for all workspace tasks
  const levelMap: Record<string, number> = {};
  workspaceTasks.forEach(t => {
    levelMap[t.id] = 0;
  });

  // Calculate dependency depths (up to 3 iterations for deep chains)
  for (let pass = 0; pass < 3; pass++) {
    workspaceTasks.forEach(t => {
      if (t.dependencyTaskId && levelMap[t.dependencyTaskId] !== undefined) {
        levelMap[t.id] = Math.max(levelMap[t.id], levelMap[t.dependencyTaskId] + 1);
      }
    });
  }

  // 2. Count nodes at each level to center them vertically
  const levelCounts: Record<number, number> = {};
  const levelIndices: Record<number, number> = {};
  workspaceTasks.forEach(t => {
    const lvl = levelMap[t.id] || 0;
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    levelIndices[lvl] = 0; // tracking layout index per level column
  });

  // Dimensions configuration
  const CARD_WIDTH = 135;
  const CARD_HEIGHT = 50;
  const LEVEL_SPACING = 210;
  const VERTICAL_SPACING = 85;

  const nodes = workspaceTasks.map(t => {
    const lvl = levelMap[t.id] || 0;
    const totalInLevel = levelCounts[lvl] || 1;
    const idxInLevel = levelIndices[lvl]++;

    const x = 30 + lvl * LEVEL_SPACING;
    // Align columns by vertical offsets to center them relatively
    const y = 45 + idxInLevel * VERTICAL_SPACING + (5 - totalInLevel) * 20;

    return {
      id: t.id,
      label: t.title.length > 20 ? t.title.substring(0, 18) + '...' : t.title,
      task: t,
      x,
      y,
      level: lvl,
    };
  });

  // Calculate links
  const links: { source: typeof nodes[0]; target: typeof nodes[0] }[] = [];
  nodes.forEach(n => {
    if (n.task.dependencyTaskId) {
      const parentNode = nodes.find(parent => parent.id === n.task.dependencyTaskId);
      if (parentNode) {
        links.push({ source: parentNode, target: n });
      }
    }
  });

  const maxLevel = Math.max(...nodes.map(n => n.level), 0);
  const maxIdx = Math.max(...Object.values(levelCounts), 0);
  const svgWidth = Math.max(450, (maxLevel + 1) * LEVEL_SPACING + 60);
  const svgHeight = Math.max(340, (maxIdx + 1) * VERTICAL_SPACING + 40);

  if (!profile.isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <AuthRequired
          iconName="calendar-outline"
          title="Workspace Timeline"
          description="Sign in to view your sprint roadmap and teammate dependency graph."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Screen Header with Company/Org Name in the other half */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Ionicons name="git-network" size={20} color={theme.text} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Workspace Timeline</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Sprints & dependencies</Text>
          </View>
        </View>
        {activeWS === 'startup' && profile.startupOrg?.name && (
          <View style={[styles.companyBadge, { backgroundColor: Semantic.accentBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name="business" size={12} color={Semantic.accent} />
            <Text style={[styles.companyText, { color: Semantic.accent }]}>
              {profile.startupOrg.name}
            </Text>
          </View>
        )}
      </View>

      {/* Premium Segmented Switcher */}
      <View style={[styles.subTabContainer, { backgroundColor: theme.backgroundSelected }]}>
        <Pressable
          onPress={() => setActiveSubTab('sprint')}
          style={[
            styles.subTabBtn,
            activeSubTab === 'sprint' && {
              backgroundColor: theme.surfaceElevated,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="rocket-outline" size={14} color={activeSubTab === 'sprint' ? Semantic.accent : theme.textSecondary} />
            <Text style={[styles.subTabBtnText, { color: activeSubTab === 'sprint' ? Semantic.accent : theme.textSecondary }]}>
              Sprint Roadmap
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setActiveSubTab('dependencies')}
          style={[
            styles.subTabBtn,
            activeSubTab === 'dependencies' && {
              backgroundColor: theme.surfaceElevated,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="git-network-outline" size={14} color={activeSubTab === 'dependencies' ? Semantic.accent : theme.textSecondary} />
            <Text style={[styles.subTabBtnText, { color: activeSubTab === 'dependencies' ? Semantic.accent : theme.textSecondary }]}>
              Dependency Map
            </Text>
          </View>
        </Pressable>
      </View>

      {activeSubTab === 'sprint' ? (
        // ============================================
        // SPRINT ROADMAP VIEW
        // ============================================
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Metrics capacity stats header */}
          <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.statsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flash" size={16} color={theme.text} />
                <Text style={[styles.statsTitle, { color: theme.text, marginBottom: 0 }]}>Active Sprint (Sprint 1)</Text>
              </View>
              <View style={[styles.statsBadge, { backgroundColor: Semantic.accentBg }]}>
                <Text style={{ color: Semantic.accent, fontSize: 10, fontWeight: '700' }}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statsCol}>
                <Text style={[styles.statsNum, { color: theme.text }]}>{sprint1Progress}%</Text>
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Progress</Text>
              </View>
              <View style={[styles.statsCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.borderLight }]}>
                <Text style={[styles.statsNum, { color: theme.text }]}>{totalSprint1Hours}h</Text>
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Capacity</Text>
              </View>
              <View style={styles.statsCol}>
                <Text style={[styles.statsNum, { color: blockedSprint1Count > 0 ? Semantic.danger : theme.text }]}>
                  {blockedSprint1Count}
                </Text>
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Blocked</Text>
              </View>
            </View>

            <View style={[styles.statsProgressTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.statsProgressBar, { width: `${sprint1Progress}%`, backgroundColor: Semantic.accent }]} />
            </View>
          </View>

          {/* SPRINT 1: ACTIVE EXECUTION */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Sprint 1: Active Execution</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary, marginBottom: Spacing.four }]}>
              Current Sprint · Resolving high-urgency tasks in parallel
            </Text>

            {sprint1Tasks.length === 0 ? (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.textTertiary, fontSize: 13, textAlign: 'center' }}>
                  No urgent tasks scheduled in Sprint 1. Add urgent items to your quadrant list.
                </Text>
              </View>
            ) : (
              sprint1Tasks.map((t, idx) => {
                const isCompleted = t.completedAt !== null;
                const isBlocked = !!t.blockers;
                const isStarted = t.progress > 0 && !isCompleted;
                return (
                  <View key={t.id} style={styles.timelineRow}>
                    {/* Left vertical timeline track */}
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{
                        position: 'absolute',
                        top: idx === 0 ? 20 : 0,
                        bottom: idx === sprint1Tasks.length - 1 ? '50%' : 0,
                        width: 2,
                        backgroundColor: theme.border,
                      }} />
                      <View style={[
                        styles.timelineDot,
                        {
                          borderColor: isCompleted ? Semantic.success : isBlocked ? Semantic.danger : isStarted ? Semantic.info : theme.textTertiary,
                          backgroundColor: isCompleted ? Semantic.successBg : isStarted ? Semantic.infoBg : theme.surfaceElevated,
                        }
                      ]}>
                        {isCompleted ? (
                          <Text style={{ fontSize: 9, color: Semantic.success, fontWeight: '700' }}>✓</Text>
                        ) : isBlocked ? (
                          <Text style={{ fontSize: 9, color: Semantic.danger, fontWeight: '700' }}>⚠️</Text>
                        ) : (
                          <View style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isStarted ? Semantic.info : theme.textTertiary,
                          }} />
                        )}
                      </View>
                    </View>

                    {/* Right Timeline Card */}
                    <View style={{ flex: 1, marginLeft: Spacing.three }}>
                      <Pressable
                        onPress={() => setSelectedTask(t)}
                        style={[
                          styles.timelineCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            borderLeftColor: QuadrantMeta[t.quadrant].color,
                          }
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name={QuadrantMeta[t.quadrant].icon as any} size={10} color={QuadrantMeta[t.quadrant].color} />
                            <Text style={[styles.quadrantTag, { color: QuadrantMeta[t.quadrant].color }]}>
                              {QuadrantMeta[t.quadrant].label}
                            </Text>
                          </View>
                          <View style={[
                            styles.priorityBadge,
                            {
                              backgroundColor: t.priority === 'critical' ? Semantic.dangerBg : t.priority === 'high' ? Semantic.warningBg : t.priority === 'medium' ? Semantic.infoBg : theme.backgroundSelected
                            }
                          ]}>
                            <Text style={[
                              styles.priorityText,
                              {
                                color: t.priority === 'critical' ? Semantic.danger : t.priority === 'high' ? Semantic.warning : t.priority === 'medium' ? Semantic.info : theme.textSecondary
                              }
                            ]}>
                              {t.priority}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {t.title}
                        </Text>
                        {t.description ? (
                          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                            {t.description}
                          </Text>
                        ) : null}

                        {t.progress > 0 && !isCompleted && (
                          <View style={styles.cardProgressContainer}>
                            <View style={[styles.cardProgressBarTrack, { backgroundColor: theme.backgroundSelected }]}>
                              <View style={[styles.cardProgressBarInner, { width: `${t.progress}%`, backgroundColor: Semantic.info }]} />
                            </View>
                            <Text style={[styles.cardProgressText, { color: theme.textSecondary }]}>
                              {t.progress}%
                            </Text>
                          </View>
                        )}

                        <View style={styles.cardFooter}>
                          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                              <Ionicons name="time-outline" size={10} color={theme.textSecondary} />
                              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                                {(t.estimatedMinutes / 60).toFixed(1)}h
                              </Text>
                            </View>
                            {t.subtasks && t.subtasks.length > 0 ? (
                              <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                                <Ionicons name="checkbox-outline" size={10} color={theme.textSecondary} />
                                <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                                  {t.subtasks.filter(s => s.completed).length}/{t.subtasks.length}
                                </Text>
                              </View>
                            ) : null}
                          </View>
 
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                            {t.assigneeName ? (
                              <View style={[styles.assigneeAvatar, { backgroundColor: theme.backgroundSelected }]}>
                                <Text style={[styles.assigneeText, { color: theme.text }]}>
                                  {t.assigneeName.substring(0, 2).toUpperCase()}
                                </Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="person-outline" size={10} color={theme.textSecondary} />
                                <Text style={[styles.footerText, { color: theme.textSecondary }]}>Solo</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {t.blockers ? (
                          <View style={[styles.cardBlockerAlert, { backgroundColor: Semantic.dangerBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <Ionicons name="ban" size={10} color={Semantic.danger} />
                            <Text style={[styles.cardBlockerText, { color: Semantic.danger }]} numberOfLines={1}>
                              Blocker: {t.blockers}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* SPRINT 2: PLANNED WORK */}
          <View style={[styles.section, { marginTop: Spacing.five }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="calendar-outline" size={16} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Sprint 2: Scheduled Backlog</Text>
            </View>
            <Text style={[styles.sectionSub, { color: theme.textSecondary, marginBottom: Spacing.four }]}>
              Upcoming Sprint · Medium-urgency items planned for release
            </Text>

            {sprint2Tasks.length === 0 ? (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.textTertiary, fontSize: 13, textAlign: 'center' }}>
                  No planned tasks in Sprint 2. Populate Quadrant 2 to schedule future items.
                </Text>
              </View>
            ) : (
              sprint2Tasks.map((t, idx) => {
                const isCompleted = t.completedAt !== null;
                const isBlocked = !!t.blockers;
                const isStarted = t.progress > 0 && !isCompleted;
                return (
                  <View key={t.id} style={styles.timelineRow}>
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{
                        position: 'absolute',
                        top: idx === 0 ? 20 : 0,
                        bottom: idx === sprint2Tasks.length - 1 ? '50%' : 0,
                        width: 2,
                        backgroundColor: theme.border,
                      }} />
                      <View style={[
                        styles.timelineDot,
                        {
                          borderColor: theme.textTertiary,
                          backgroundColor: theme.surfaceElevated,
                        }
                      ]}>
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: theme.textTertiary,
                        }} />
                      </View>
                    </View>

                    <View style={{ flex: 1, marginLeft: Spacing.three }}>
                      <Pressable
                        onPress={() => setSelectedTask(t)}
                        style={[
                          styles.timelineCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            borderLeftColor: QuadrantMeta[t.quadrant].color,
                            opacity: 0.85,
                          }
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name={QuadrantMeta[t.quadrant].icon as any} size={10} color={QuadrantMeta[t.quadrant].color} />
                            <Text style={[styles.quadrantTag, { color: QuadrantMeta[t.quadrant].color }]}>
                              {QuadrantMeta[t.quadrant].label}
                            </Text>
                          </View>
                          <View style={[
                            styles.priorityBadge,
                            {
                              backgroundColor: t.priority === 'critical' ? Semantic.dangerBg : t.priority === 'high' ? Semantic.warningBg : t.priority === 'medium' ? Semantic.infoBg : theme.backgroundSelected
                            }
                          ]}>
                            <Text style={[
                              styles.priorityText,
                              {
                                color: t.priority === 'critical' ? Semantic.danger : t.priority === 'high' ? Semantic.warning : t.priority === 'medium' ? Semantic.info : theme.textSecondary
                              }
                            ]}>
                              {t.priority}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {t.title}
                        </Text>
                        {t.description ? (
                          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                            {t.description}
                          </Text>
                        ) : null}

                        <View style={styles.cardFooter}>
                          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                              <Ionicons name="time-outline" size={10} color={theme.textSecondary} />
                              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                                {(t.estimatedMinutes / 60).toFixed(1)}h
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                            {t.assigneeName ? (
                              <View style={[styles.assigneeAvatar, { backgroundColor: theme.backgroundSelected }]}>
                                <Text style={[styles.assigneeText, { color: theme.text }]}>
                                  {t.assigneeName.substring(0, 2).toUpperCase()}
                                </Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="person-outline" size={10} color={theme.textSecondary} />
                                <Text style={[styles.footerText, { color: theme.textSecondary }]}>Solo</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* BACKLOG & ICEBOX */}
          <View style={[styles.section, { marginTop: Spacing.five }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="archive-outline" size={16} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Backlog & Parking Lot</Text>
            </View>
            <Text style={[styles.sectionSub, { color: theme.textSecondary, marginBottom: Spacing.four }]}>
              Non-urgent/Non-important backlog items deferred for roadmap reviews
            </Text>

            {backlogTasks.length === 0 ? (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.textTertiary, fontSize: 13, textAlign: 'center' }}>
                  No backlog tasks. Quadrant 4 tasks appear here.
                </Text>
              </View>
            ) : (
              backlogTasks.map((t, idx) => {
                return (
                  <View key={t.id} style={styles.timelineRow}>
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{
                        position: 'absolute',
                        top: idx === 0 ? 20 : 0,
                        bottom: idx === backlogTasks.length - 1 ? '50%' : 0,
                        width: 2,
                        backgroundColor: theme.border,
                      }} />
                      <View style={[
                        styles.timelineDot,
                        {
                          borderColor: theme.textTertiary,
                          backgroundColor: theme.surfaceElevated,
                        }
                      ]}>
                        <View style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.textTertiary,
                        }} />
                      </View>
                    </View>

                    <View style={{ flex: 1, marginLeft: Spacing.three }}>
                      <Pressable
                        onPress={() => setSelectedTask(t)}
                        style={[
                          styles.timelineCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            borderLeftColor: QuadrantMeta[t.quadrant].color,
                            opacity: 0.6,
                          }
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name={QuadrantMeta[t.quadrant].icon as any} size={10} color={QuadrantMeta[t.quadrant].color} />
                            <Text style={[styles.quadrantTag, { color: QuadrantMeta[t.quadrant].color }]}>
                              {QuadrantMeta[t.quadrant].label}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {t.title}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      ) : (
        // ============================================
        // DEPENDENCY MAP VIEW
        // ============================================
        <View style={styles.graphContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="git-network-outline" size={18} color={theme.text} />
            <Text style={[styles.graphHeader, { color: theme.text, marginBottom: 0 }]}>Team Dependency Graph</Text>
          </View>
          <Text style={[styles.graphSub, { color: theme.textSecondary }]}>
            Visualizes task blocking relationships. Tap on any card node to review and unblock.
          </Text>

          <ScrollView style={styles.svgScroll} horizontal showsHorizontalScrollIndicator={false}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.svgContainer, { width: svgWidth + 20, minHeight: svgHeight + 20 }]}>
                {workspaceTasks.length === 0 ? (
                  <Text style={{ color: theme.textTertiary, alignSelf: 'center', marginTop: 100 }}>
                    No active tasks to map dependencies.
                  </Text>
                ) : (
                  <Svg width={svgWidth} height={svgHeight}>
                    <Defs>
                      {/* Miro/Figma style dot matrix background grid */}
                      <Pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <Circle cx="2" cy="2" r="1.2" fill={theme.border} opacity={0.65} />
                      </Pattern>
                      <Marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <Path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={Semantic.danger} />
                      </Marker>
                    </Defs>

                    {/* Canvas background grid */}
                    <Rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Draw Links (Bezier Curved Paths) */}
                    {links.map((link, idx) => {
                      const startX = link.source.x + CARD_WIDTH;
                      const startY = link.source.y + CARD_HEIGHT / 2;
                      const endX = link.target.x;
                      const endY = link.target.y + CARD_HEIGHT / 2;

                      // Control points for clean horizontal S-curve
                      const cp1X = startX + 60;
                      const cp1Y = startY;
                      const cp2X = endX - 60;
                      const cp2Y = endY;

                      const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
                      return (
                        <Path
                          key={idx}
                          d={pathD}
                          fill="none"
                          stroke={Semantic.danger}
                          strokeWidth="2.2"
                          strokeDasharray="4,4"
                          markerEnd="url(#arrow)"
                        />
                      );
                    })}

                    {/* Draw Nodes (Tasks Card widgets) */}
                    {nodes.map(node => {
                      const qColor = QuadrantMeta[node.task.quadrant].color;
                      const hasBlocker = node.task.dependencyTaskId !== null;
                      const isCompleted = node.task.completedAt !== null;

                      return (
                        <G key={node.id} onPress={() => setSelectedTask(node.task)}>
                          {/* Card background shadow */}
                          <Rect
                            x={node.x + 2}
                            y={node.y + 2}
                            width={CARD_WIDTH}
                            height={CARD_HEIGHT}
                            rx={6}
                            ry={6}
                            fill="rgba(0, 0, 0, 0.04)"
                          />
                          {/* Main node card background */}
                          <Rect
                            x={node.x}
                            y={node.y}
                            width={CARD_WIDTH}
                            height={CARD_HEIGHT}
                            rx={6}
                            ry={6}
                            fill={theme.surfaceElevated}
                            stroke={hasBlocker ? Semantic.danger : isCompleted ? Semantic.success : theme.border}
                            strokeWidth={isCompleted || hasBlocker ? 1.5 : 1}
                          />
                          {/* Left indicator stripe */}
                          <Rect
                            x={node.x}
                            y={node.y}
                            width={5}
                            height={CARD_HEIGHT}
                            rx={0}
                            fill={qColor}
                          />
                          
                          {/* Task Title text */}
                          <SvgText
                            x={node.x + 12}
                            y={node.y + 18}
                            fontSize="8.5"
                            fontWeight="bold"
                            fill={theme.text}
                          >
                            {node.label}
                          </SvgText>

                          {/* Assignee initials bubble */}
                          <Circle
                            cx={node.x + 18}
                            cy={node.y + 36}
                            r="7"
                            fill={theme.backgroundSelected}
                          />
                          <SvgText
                            x={node.x + 18}
                            y={node.y + 38.5}
                            fontSize="7"
                            fontWeight="bold"
                            fill={theme.textSecondary}
                            textAnchor="middle"
                          >
                            {node.task.assigneeName ? node.task.assigneeName.charAt(0).toUpperCase() : 'U'}
                          </SvgText>

                          {/* Priority tag */}
                          <SvgText
                            x={node.x + 32}
                            y={node.y + 38.5}
                            fontSize="7"
                            fontWeight="700"
                            fill={node.task.priority === 'critical' ? Semantic.danger : node.task.priority === 'high' ? Semantic.warning : theme.textSecondary}
                          >
                            {node.task.priority || 'medium'}
                          </SvgText>

                          {/* Completion / progress tag */}
                          <SvgText
                            x={node.x + CARD_WIDTH - 15}
                            y={node.y + 38.5}
                            fontSize="8"
                            fontWeight="bold"
                            fill={isCompleted ? Semantic.success : theme.textTertiary}
                            textAnchor="middle"
                          >
                            {isCompleted ? '✓' : `${node.task.progress}%`}
                          </SvgText>

                          {/* Blocker alert badge */}
                          {hasBlocker && (
                            <Circle
                              cx={node.x + CARD_WIDTH - 6}
                              cy={node.y + 6}
                              r="4"
                              fill={Semantic.danger}
                            />
                          )}
                        </G>
                      );
                    })}
                  </Svg>
                )}
              </View>
            </ScrollView>
          </ScrollView>
          
          {/* Graph Legend */}
          <View style={[styles.graphLegend, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Semantic.danger }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Blocked Task (Requires Action)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Semantic.success }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Unblocked / Completed Task</Text>
            </View>
          </View>
        </View>
      )}

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
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBtnText: {
    ...Typography.bodySmMedium,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.nine,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '700',
  },
  sectionSub: {
    ...Typography.caption,
    marginTop: 2,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    marginBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  statsTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  statsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statsBadge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  statsCol: {
    alignItems: 'center',
    flex: 1,
  },
  statsNum: {
    fontSize: 22,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statsProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statsProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // Center with card header
  },
  timelineCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  quadrantTag: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    ...Typography.caption,
    marginBottom: Spacing.three,
    lineHeight: 16,
  },
  cardProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  cardProgressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cardProgressBarInner: {
    height: '100%',
    borderRadius: 3,
  },
  cardProgressText: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
  },
  assigneeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
  },
  assigneeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  cardBlockerAlert: {
    marginTop: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
  },
  cardBlockerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
  },
  graphContainer: {
    flex: 1,
    padding: Spacing.four,
  },
  graphHeader: {
    ...Typography.h3,
    fontWeight: '700',
  },
  graphSub: {
    ...Typography.caption,
    marginBottom: Spacing.four,
  },
  svgScroll: {
    flex: 1,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  graphLegend: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...Typography.captionSm,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    marginBottom: Spacing.one,
  },
  headerTitle: {
    ...Typography.h2,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  companyBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  companyText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
