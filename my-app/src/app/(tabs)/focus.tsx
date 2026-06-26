import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import FocusMode from '@/components/FocusMode';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { Task } from '@/store/types';
import AuthRequired from '@/components/AuthRequired';

export default function FocusScreen() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { profile } = useUserStore();
  const { getActiveTasks } = useTaskStore();

  // Local task selection state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Track if user explicitly cleared the task to pick a new one
  const [isPickingTask, setIsPickingTask] = useState(false);

  if (!profile.isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <AuthRequired
          iconName="alarm-outline"
          title="Focus Mode Timer"
          description="Sign in to use the Pomodoro timer, log work notes, and assign sprint milestones."
        />
      </SafeAreaView>
    );
  }

  // Get active tasks and default to top task
  const activeTasks = getActiveTasks();
  const topTask = activeTasks.length > 0 ? activeTasks[0] : null;

  // If user is explicitly in picking mode, show selection. Otherwise default to selectedTask or topTask.
  const currentFocusTask = isPickingTask ? null : (selectedTask || topTask);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <FocusMode
        task={currentFocusTask}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setIsPickingTask(false);
        }}
        onExit={() => {
          setSelectedTask(null);
          setIsPickingTask(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
