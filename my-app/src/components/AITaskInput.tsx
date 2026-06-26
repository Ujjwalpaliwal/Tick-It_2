import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Colors, Typography, Radius, Spacing, Semantic, QuadrantColors } from '@/constants/theme';
import { Quadrant, QuadrantMeta } from '@/store/types';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface AITaskInputProps {
  onTaskAdded?: () => void;
}

export default function AITaskInput({ onTaskAdded }: AITaskInputProps) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  
  const addTaskManual = useTaskStore(s => s.addTaskManual);
  const { profile } = useUserStore();
  
  const activeWS = profile.activeWorkspace;
  const teammates = profile.startupOrg?.members || [];
  const isFounder = profile.role === 'founder' || profile.role === 'co_founder';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>(Quadrant.DO_FIRST);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleAddTask = () => {
    if (!title.trim()) return;
    
    addTaskManual(
      title.trim(),
      selectedQuadrant,
      description.trim(),
      null, // deadline
      selectedAssigneeId
    );

    // Reset Form
    setTitle('');
    setDescription('');
    setSelectedQuadrant(Quadrant.DO_FIRST);
    setSelectedAssigneeId(null);
    setExpanded(false);
    onTaskAdded?.();
  };

  const getQuadrantColor = (q: Quadrant) => {
    switch (q) {
      case Quadrant.DO_FIRST: return QuadrantColors.doFirst;
      case Quadrant.SCHEDULE: return QuadrantColors.schedule;
      case Quadrant.DELEGATE: return QuadrantColors.delegate;
      case Quadrant.ELIMINATE: return QuadrantColors.eliminate;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Title Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Create new manual task..."
          placeholderTextColor={theme.textTertiary}
          value={title}
          onChangeText={(text) => {
            if (!profile.isLoggedIn) {
              Alert.alert(
                'Authentication Required',
                'You must log in or register to create tasks.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Login / Register', onPress: () => router.push('/login' as any) }
                ]
              );
              return;
            }
            setTitle(text);
            if (text.trim().length > 0 && !expanded) {
              setExpanded(true);
            }
          }}
          onFocus={() => {
            if (!profile.isLoggedIn) {
              Alert.alert(
                'Authentication Required',
                'You must log in or register to create tasks.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Login / Register', onPress: () => router.push('/login' as any) }
                ]
              );
            } else {
              setExpanded(true);
            }
          }}
        />
        {(!expanded && title.trim().length > 0) || (expanded && (
          <Pressable
            onPress={handleAddTask}
            disabled={!title.trim()}
            style={({ pressed }) => [
              styles.sendBtn, 
              {
                backgroundColor: title.trim() ? Semantic.accent : theme.backgroundSelected,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              }
            ]}
          >
            <Text style={styles.sendIcon}>✓</Text>
          </Pressable>
        ))}
      </View>

      {/* Expanded form controls */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Description field */}
          <TextInput
            style={[styles.descInput, { color: theme.textSecondary, borderColor: theme.border, backgroundColor: theme.background }]}
            placeholder="Add brief task description (optional)..."
            placeholderTextColor={theme.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />

          {/* Quadrant Selector */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Select Quadrant</Text>
          <View style={styles.quadrantGrid}>
            {([Quadrant.DO_FIRST, Quadrant.SCHEDULE, Quadrant.DELEGATE, Quadrant.ELIMINATE] as const).map((q) => {
              const meta = QuadrantMeta[q];
              const isSelected = selectedQuadrant === q;
              const color = getQuadrantColor(q);
              return (
                <Pressable
                  key={q}
                  onPress={() => setSelectedQuadrant(q)}
                  style={({ pressed }) => [
                    styles.quadrantCard,
                    {
                      backgroundColor: isSelected ? meta.bg : theme.backgroundSelected,
                      borderColor: isSelected ? color : theme.border,
                      opacity: pressed ? 0.95 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                  ]}
                >
                  <Ionicons
                    name={meta.icon as any}
                    size={14}
                    color={isSelected ? color : theme.textSecondary}
                  />
                  <Text style={[styles.quadrantLabel, { color: isSelected ? color : theme.text }]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Delegation / Teammate Assignment (Startup workspace & Founders only) */}
          {activeWS === 'startup' && isFounder && teammates.length > 0 && (
            <View style={styles.delegationSection}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Delegate Assignment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teammatesRow}>
                <Pressable
                  onPress={() => setSelectedAssigneeId(null)}
                  style={({ pressed }) => [
                    styles.teammateChip,
                    {
                      backgroundColor: selectedAssigneeId === null ? Semantic.accentBg : theme.backgroundSelected,
                      borderColor: selectedAssigneeId === null ? Semantic.accent : theme.border,
                      opacity: pressed ? 0.95 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: selectedAssigneeId === null ? Semantic.accent : theme.textSecondary }}>
                    👑 Founder (You)
                  </Text>
                </Pressable>
                {teammates.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedAssigneeId(m.id)}
                    style={({ pressed }) => [
                      styles.teammateChip,
                      {
                        backgroundColor: selectedAssigneeId === m.id ? Semantic.accentBg : theme.backgroundSelected,
                        borderColor: selectedAssigneeId === m.id ? Semantic.accent : theme.border,
                        opacity: pressed ? 0.95 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      }
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: selectedAssigneeId === m.id ? Semantic.accent : theme.textSecondary }}>
                      {m.avatar} {m.name} ({m.role.split(' ')[0]})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setExpanded(false)}
              style={({ pressed }) => [
                styles.cancelBtn,
                { 
                  borderColor: theme.border,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAddTask}
              disabled={!title.trim()}
              style={({ pressed }) => [
                styles.createBtn,
                { 
                  backgroundColor: title.trim() ? Semantic.accent : theme.backgroundSelected,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                }
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Create Task</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Spacing.two,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  expandedContent: {
    marginTop: Spacing.three,
  },
  descInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    ...Typography.captionSm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  quadrantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  quadrantCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  quadrantEmoji: {
    fontSize: 16,
  },
  quadrantLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  delegationSection: {
    marginBottom: Spacing.four,
  },
  teammatesRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: 2,
  },
  teammateChip: {
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  cancelBtn: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
