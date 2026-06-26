import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Quadrant, Subtask, Comment } from './types';
import { classifyTask } from '@/utils/classifier';
import { generateId, getDateKey } from '@/utils/dateHelpers';
import { useUserStore } from './userStore';
import { fetchApi } from '@/utils/api';

const STORAGE_KEY = 'tickit_tasks';

interface TaskState {
  tasks: Task[];
  allTasks: Task[];
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  addTask: (title: string, description?: string, deadline?: string | null) => Promise<Task>;
  addTaskManual: (title: string, quadrant: Quadrant, description?: string, deadline?: string | null, assigneeId?: string | null) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  reclassifyTask: (id: string) => Promise<void>;
  moveToQuadrant: (id: string, quadrant: Quadrant) => Promise<void>;

  // Tick-It extensions
  assignTask: (taskId: string, assigneeId: string | null, assigneeName: string | null, assigneeRole: string | null) => Promise<void>;
  addComment: (taskId: string, authorId: string, authorName: string, authorRole: string, text: string) => Promise<void>;
  startTask: (id: string) => Promise<void>;
  requestApproval: (id: string, notes: string) => Promise<void>;
  approveTask: (id: string) => Promise<void>;
  requestChanges: (id: string, feedback: string) => Promise<void>;

  // Selectors
  getTasksByQuadrant: (quadrant: Quadrant) => Task[];
  getActiveTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getTodayCompleted: () => number;
  getOverdueTasks: () => Task[];
}

function persist(tasks: Task[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(console.error);
}

const getCurrentUserId = () => {
  const userStore = useUserStore.getState();
  return userStore.activeSimulatedMemberId || userStore.profile.id || userStore.profile.email || 'founder@tickit.app';
};

const isCurrentUserFounder = () => {
  const userStore = useUserStore.getState();
  return userStore.activeSimulatedMemberId === null && userStore.profile.role === 'founder';
};

function getMentionHandles(user: { email: string; name: string; role: string }): string[] {
  const handles: string[] = [];
  
  if (user.email) {
    handles.push(`@${user.email}`);
    const prefix = user.email.split('@')[0];
    if (prefix) {
      handles.push(`@${prefix}`);
    }
  }
  
  if (user.name) {
    handles.push(`@${user.name}`);
    const firstWord = user.name.split(' ')[0];
    if (firstWord) {
      handles.push(`@${firstWord}`);
    }
  }
  
  if (user.role) {
    handles.push(`@${user.role}`);
    handles.push(`@${user.role.replace('_', ' ')}`);
    handles.push(`@${user.role.replace(' ', '_')}`);
  }
  
  return Array.from(new Set(handles)).filter(h => h.length > 1);
}

function checkMentionsUser(task: Task, targetUserId: string): boolean {
  const text = `${task.title} ${task.description}`.toLowerCase();
  const profile = useUserStore.getState().profile;
  const teammates = profile.startupOrg?.members || [];
  
  let targetUser: { email: string; name: string; role: string } | null = null;
  
  const founderId = profile.id || profile.email || 'founder@tickit.app';
  if (targetUserId.toLowerCase() === founderId.toLowerCase() || targetUserId.toLowerCase() === (profile.email || 'founder@tickit.app').toLowerCase()) {
    targetUser = {
      email: profile.email || 'founder@tickit.app',
      name: profile.name || 'Ujjwal Founder',
      role: profile.role || 'founder'
    };
  } else {
    const match = teammates.find(m => m.id.toLowerCase() === targetUserId.toLowerCase());
    if (match) {
      targetUser = {
        email: match.id,
        name: match.name,
        role: match.role
      };
    }
  }
  
  if (!targetUser) return false;
  
  const mentionStrings = getMentionHandles(targetUser);
  return mentionStrings.some(handle => text.includes(handle.toLowerCase()));
}

function checkMentionsOther(task: Task, currentUserId: string): boolean {
  const text = `${task.title} ${task.description}`.toLowerCase();
  if (!text.includes('@')) {
    return false;
  }
  
  const profile = useUserStore.getState().profile;
  const teammates = profile.startupOrg?.members || [];
  const otherUsers: { email: string; name: string; role: string }[] = [];
  
  const founderId = profile.id || profile.email || 'founder@tickit.app';
  if (founderId.toLowerCase() !== currentUserId.toLowerCase() && (profile.email || 'founder@tickit.app').toLowerCase() !== currentUserId.toLowerCase()) {
    otherUsers.push({
      email: profile.email || 'founder@tickit.app',
      name: profile.name || 'Ujjwal Founder',
      role: profile.role || 'founder'
    });
  }
  
  teammates.forEach(m => {
    if (m.id.toLowerCase() !== currentUserId.toLowerCase()) {
      otherUsers.push({
        email: m.id,
        name: m.name,
        role: m.role
      });
    }
  });
  
  for (const user of otherUsers) {
    const handles = getMentionHandles(user);
    if (handles.some(handle => text.includes(handle.toLowerCase()))) {
      return true;
    }
  }
  
  return false;
}

export function filterVisibleTasks(allTasks: Task[], currentUserId: string, isFounder: boolean): Task[] {
  return allTasks.filter(t => {
    if (t.workspace === 'personal') {
      return t.creatorId === currentUserId;
    }

    if (t.workspace === 'startup') {
      if (isFounder) {
        return true;
      }
      
      const isAssignedToMe = t.assigneeId === currentUserId;
      const mentionsMe = checkMentionsUser(t, currentUserId);
      const isAssignedToOther = t.assigneeId !== null && t.assigneeId !== '' && t.assigneeId !== currentUserId;
      const mentionsOther = checkMentionsOther(t, currentUserId);

      if (isAssignedToOther || mentionsOther) {
        return isAssignedToMe || mentionsMe;
      }

      return true;
    }

    return false;
  });
}

const setAndFilterTasks = (allTasks: Task[], set: any) => {
  persist(allTasks);
  const currentUserId = getCurrentUserId();
  const isFounder = isCurrentUserFounder();
  const visibleTasks = filterVisibleTasks(allTasks, currentUserId, isFounder);
  set({ allTasks, tasks: visibleTasks });
  useUserStore.getState().updateGamificationScores(allTasks);
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  allTasks: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let loadedTasks: Task[] = [];
      if (stored) {
        loadedTasks = JSON.parse(stored);
      }

      const currentUserId = getCurrentUserId();
      const isFounder = isCurrentUserFounder();
      const visibleTasks = filterVisibleTasks(loadedTasks, currentUserId, isFounder);

      set({ 
        allTasks: loadedTasks,
        tasks: visibleTasks, 
      });

      // Sync from backend
      const userState = useUserStore.getState();
      if (userState.profile.isLoggedIn) {
        const activeWS = userState.profile.activeWorkspace;
        const res = await fetchApi('/tasks', {
          params: { workspace: activeWS }
        });
        if (res.success && res.tasks) {
          const freshVisible = filterVisibleTasks(res.tasks, currentUserId, isFounder);
          set({ allTasks: res.tasks, tasks: freshVisible });
          persist(res.tasks);
        }
      }
      set({ isHydrated: true });
    } catch (e) {
      console.warn('Failed to hydrate tasks from backend, using local:', e);
      set({ isHydrated: true });
    }
  },

  addTask: async (title, description = '', deadline = null) => {
    const result = classifyTask(title, description, deadline);
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    const currentUserId = getCurrentUserId();
    
    const taskPayload = {
      title,
      description,
      quadrant: result.quadrant,
      urgency: result.urgency,
      importance: result.importance,
      priorityScore: result.priorityScore,
      deadline,
      subtasks: [],
      progress: 0,
      xpAwarded: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isArchived: false,
      aiReasoning: result.reasoning,
      workspace: activeWS,
      creatorId: currentUserId,
      assigneeId: null,
      assigneeName: null,
      assigneeRole: null,
      priority: 'medium' as const,
      dependencyTaskId: null,
      approvalStatus: 'none' as const,
      dailyNotes: '',
      blockers: '',
      estimatedMinutes: 30,
      comments: [],
    };

    try {
      const res = await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskPayload)
      });
      if (res.success && res.task) {
        const allTasks = [...get().allTasks, res.task];
        setAndFilterTasks(allTasks, set);
        return res.task;
      }
    } catch (e) {
      console.error('Failed to save task to backend, adding locally:', e);
    }

    // Client fallback
    const fallbackTask: Task = { ...taskPayload, id: generateId() };
    const allTasks = [...get().allTasks, fallbackTask];
    setAndFilterTasks(allTasks, set);
    return fallbackTask;
  },

  addTaskManual: async (title, quadrant, description = '', deadline = null, assigneeId = null) => {
    const urgency = quadrant === Quadrant.DO_FIRST || quadrant === Quadrant.DELEGATE ? 70 : 30;
    const importance = quadrant === Quadrant.DO_FIRST || quadrant === Quadrant.SCHEDULE ? 70 : 30;
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    const currentUserId = getCurrentUserId();
    
    let assigneeName = null;
    let assigneeRole = null;
    
    if (assigneeId) {
      const teammates = useUserStore.getState().profile.startupOrg?.members || [];
      const match = teammates.find(m => m.id === assigneeId);
      if (match) {
        assigneeName = match.name;
        assigneeRole = match.role;
      }
    }

    const taskPayload = {
      title,
      description,
      quadrant,
      urgency,
      importance,
      priorityScore: Math.round(urgency * 0.4 + importance * 0.4 + 10),
      deadline,
      subtasks: [],
      progress: 0,
      xpAwarded: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isArchived: false,
      aiReasoning: 'Manually classified by user.',
      workspace: activeWS,
      creatorId: currentUserId,
      assigneeId,
      assigneeName,
      assigneeRole,
      priority: 'medium' as const,
      dependencyTaskId: null,
      approvalStatus: 'none' as const,
      dailyNotes: '',
      blockers: '',
      estimatedMinutes: 30,
      comments: [],
    };

    try {
      const res = await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskPayload)
      });
      if (res.success && res.task) {
        const allTasks = [...get().allTasks, res.task];
        setAndFilterTasks(allTasks, set);
        return res.task;
      }
    } catch (e) {
      console.error('Failed to save manual task to backend:', e);
    }

    const fallbackTask: Task = { ...taskPayload, id: generateId() };
    const allTasks = [...get().allTasks, fallbackTask];
    setAndFilterTasks(allTasks, set);
    return fallbackTask;
  },

  updateTask: async (id, updates) => {
    // Optimistic local update
    const previousTasks = get().allTasks;
    const updatedTasks = previousTasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    setAndFilterTasks(updatedTasks, set);

    try {
      const res = await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (res.success && res.task) {
        const freshTasks = get().allTasks.map(t =>
          t.id === id ? res.task : t
        );
        setAndFilterTasks(freshTasks, set);
      }
    } catch (e) {
      console.error('Failed to update task on backend:', e);
    }
  },

  deleteTask: async (id) => {
    const updatedTasks = get().allTasks.filter(t => t.id !== id);
    setAndFilterTasks(updatedTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete task on backend:', e);
    }
  },

  completeTask: async (id) => {
    const task = get().allTasks.find(t => t.id === id);
    if (!task) return;
    const xpEarned = useUserStore.getState().awardXPForTask(task);

    const updates = {
      completedAt: new Date().toISOString(),
      progress: 100,
      xpAwarded: xpEarned
    };

    // Update locally
    const updatedTasks = get().allTasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    setAndFilterTasks(updatedTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to complete task on backend:', e);
    }
  },

  archiveTask: async (id) => {
    const updates = { isArchived: true };
    const updatedTasks = get().allTasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    
    persist(updatedTasks);
    const currentUserId = getCurrentUserId();
    const isFounder = isCurrentUserFounder();
    const visibleTasks = filterVisibleTasks(updatedTasks, currentUserId, isFounder);
    set({ allTasks: updatedTasks, tasks: visibleTasks });

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to archive task on backend:', e);
    }
  },

  addSubtask: async (taskId, title) => {
    try {
      const res = await fetchApi(`/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      if (res.success && res.task) {
        const allTasks = get().allTasks.map(t =>
          t.id === taskId ? res.task : t
        );
        setAndFilterTasks(allTasks, set);
      }
    } catch (e) {
      console.error('Failed to add subtask on backend:', e);
      // Fallback
      const subtask: Subtask = { id: generateId(), title, completed: false };
      const allTasks = get().allTasks.map(t => {
        if (t.id !== taskId) return t;
        const subtasks = [...t.subtasks, subtask];
        const completedCount = subtasks.filter(s => s.completed).length;
        const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;
        return { ...t, subtasks, progress };
      });
      setAndFilterTasks(allTasks, set);
    }
  },

  toggleSubtask: async (taskId, subtaskId) => {
    try {
      const res = await fetchApi(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PUT'
      });
      if (res.success && res.task) {
        const allTasks = get().allTasks.map(t =>
          t.id === taskId ? res.task : t
        );
        setAndFilterTasks(allTasks, set);
      }
    } catch (e) {
      console.error('Failed to toggle subtask on backend:', e);
      // Fallback
      const allTasks = get().allTasks.map(t => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks.map(s =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        const completedCount = subtasks.filter(s => s.completed).length;
        const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;
        return { ...t, subtasks, progress };
      });
      setAndFilterTasks(allTasks, set);
    }
  },

  removeSubtask: async (taskId, subtaskId) => {
    try {
      const res = await fetchApi(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE'
      });
      if (res.success && res.task) {
        const allTasks = get().allTasks.map(t =>
          t.id === taskId ? res.task : t
        );
        setAndFilterTasks(allTasks, set);
      }
    } catch (e) {
      console.error('Failed to delete subtask on backend:', e);
      // Fallback
      const allTasks = get().allTasks.map(t => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks.filter(s => s.id !== subtaskId);
        const completedCount = subtasks.filter(s => s.completed).length;
        const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;
        return { ...t, subtasks, progress };
      });
      setAndFilterTasks(allTasks, set);
    }
  },

  reclassifyTask: async (id) => {
    const task = get().allTasks.find(t => t.id === id);
    if (!task) return;
    const result = classifyTask(task.title, task.description, task.deadline);
    const updates = {
      quadrant: result.quadrant,
      urgency: result.urgency,
      importance: result.importance,
      priorityScore: result.priorityScore,
      aiReasoning: result.reasoning,
    };

    const updatedTasks = get().allTasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    setAndFilterTasks(updatedTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to reclassify task on backend:', e);
    }
  },

  moveToQuadrant: async (id, quadrant) => {
    const updates = { quadrant };
    const updatedTasks = get().allTasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    setAndFilterTasks(updatedTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to move quadrant on backend:', e);
    }
  },

  // Tick-It Extensions
  assignTask: async (taskId, assigneeId, assigneeName, assigneeRole) => {
    const updates = {
      assigneeId,
      assigneeName,
      assigneeRole,
      approvalStatus: 'none' as const,
    };

    const updatedTasks = get().allTasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    setAndFilterTasks(updatedTasks, set);

    try {
      await fetchApi(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to assign task on backend:', e);
    }
  },

  addComment: async (taskId, authorId, authorName, authorRole, text) => {
    try {
      const res = await fetchApi(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ authorId, authorName, authorRole, text })
      });
      if (res.success && res.task) {
        const allTasks = get().allTasks.map(t =>
          t.id === taskId ? res.task : t
        );
        setAndFilterTasks(allTasks, set);
      }
    } catch (e) {
      console.error('Failed to add comment on backend:', e);
      // Fallback
      const comment: Comment = {
        id: generateId(),
        authorId,
        authorName,
        authorRole,
        text,
        createdAt: new Date().toISOString(),
      };
      const allTasks = get().allTasks.map(t => {
        if (t.id !== taskId) return t;
        return { ...t, comments: [...(t.comments || []), comment] };
      });
      setAndFilterTasks(allTasks, set);
    }
  },

  startTask: async (id) => {
    const updates = { progress: 15, dailyNotes: 'Started working on this task.' };
    const updatedTasks = get().allTasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    setAndFilterTasks(updatedTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to start task on backend:', e);
    }
  },

  requestApproval: async (id, notes) => {
    const task = get().allTasks.find(t => t.id === id);
    if (!task) return;
    const authorName = task.assigneeName || 'Teammate';
    const authorRole = task.assigneeRole || 'Developer';

    // Optimistic update locally
    const comment: Comment = {
      id: generateId(),
      authorId: task.assigneeId || 'unknown',
      authorName,
      authorRole,
      text: `Requested completion approval. Notes: "${notes}"`,
      createdAt: new Date().toISOString(),
    };

    const updates = {
      progress: 100,
      approvalStatus: 'pending_approval' as const,
      dailyNotes: notes,
    };

    const allTasks = get().allTasks.map(t =>
      t.id === id
        ? {
            ...t,
            ...updates,
            comments: [...(t.comments || []), comment],
          }
        : t
    );
    setAndFilterTasks(allTasks, set);

    try {
      // Create request and also post comment
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await fetchApi(`/tasks/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          authorId: task.assigneeId || 'unknown',
          authorName,
          authorRole,
          text: `Requested completion approval. Notes: "${notes}"`
        })
      });
    } catch (e) {
      console.error('Failed to request approval on backend:', e);
    }
  },

  approveTask: async (id) => {
    const task = get().allTasks.find(t => t.id === id);
    if (!task) return;
    const xpEarned = useUserStore.getState().awardXPForTask(task);

    const comment: Comment = {
      id: generateId(),
      authorId: 'founder',
      authorName: useUserStore.getState().profile.name || 'Founder',
      authorRole: 'Founder',
      text: `Approved task completion. Excellent work! Awarded +${xpEarned} XP.`,
      createdAt: new Date().toISOString(),
    };

    const updates = {
      completedAt: new Date().toISOString(),
      progress: 100,
      approvalStatus: 'approved' as const,
      xpAwarded: xpEarned,
    };

    const allTasks = get().allTasks.map(t =>
      t.id === id
        ? {
            ...t,
            ...updates,
            comments: [...(t.comments || []), comment],
          }
        : t
    );
    setAndFilterTasks(allTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await fetchApi(`/tasks/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          authorId: 'founder',
          authorName: useUserStore.getState().profile.name || 'Founder',
          authorRole: 'Founder',
          text: `Approved task completion. Excellent work! Awarded +${xpEarned} XP.`
        })
      });
    } catch (e) {
      console.error('Failed to approve task on backend:', e);
    }
  },

  requestChanges: async (id, feedback) => {
    const task = get().allTasks.find(t => t.id === id);
    if (!task) return;

    const comment: Comment = {
      id: generateId(),
      authorId: 'founder',
      authorName: useUserStore.getState().profile.name || 'Founder',
      authorRole: 'Founder',
      text: `Requested changes: "${feedback}"`,
      createdAt: new Date().toISOString(),
    };

    const updates = {
      progress: 70,
      approvalStatus: 'changes_requested' as const,
    };

    const allTasks = get().allTasks.map(t =>
      t.id === id
        ? {
            ...t,
            ...updates,
            comments: [...(t.comments || []), comment],
          }
        : t
    );
    setAndFilterTasks(allTasks, set);

    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await fetchApi(`/tasks/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          authorId: 'founder',
          authorName: useUserStore.getState().profile.name || 'Founder',
          authorRole: 'Founder',
          text: `Requested changes: "${feedback}"`
        })
      });
    } catch (e) {
      console.error('Failed to request changes on backend:', e);
    }
  },

  // Selectors
  getTasksByQuadrant: (quadrant) => {
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    return get().tasks.filter(t => t.quadrant === quadrant && t.workspace === activeWS && !t.completedAt && !t.isArchived)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  },

  getActiveTasks: () => {
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    return get().tasks.filter(t => t.workspace === activeWS && !t.completedAt && !t.isArchived)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  },

  getCompletedTasks: () => {
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    return get().tasks.filter(t => t.workspace === activeWS && t.completedAt != null)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  },

  getTodayCompleted: () => {
    const todayKey = getDateKey();
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    return get().tasks.filter(t =>
      t.workspace === activeWS && t.completedAt && getDateKey(new Date(t.completedAt)) === todayKey
    ).length;
  },

  getOverdueTasks: () => {
    const activeWS = useUserStore.getState().profile.activeWorkspace;
    return get().tasks.filter(t =>
      t.workspace === activeWS && !t.completedAt && !t.isArchived && t.deadline && new Date(t.deadline).getTime() < Date.now()
    );
  },
}));

// Subscribe to user store to re-fetch/re-filter tasks whenever the user, active workspace, or simulation role changes
useUserStore.subscribe(async (userState, previousState) => {
  const taskStore = useTaskStore.getState();
  if (taskStore.isHydrated) {
    if (!userState.profile.isLoggedIn) {
      useTaskStore.setState({ tasks: [], allTasks: [] });
      return;
    }
    
    // Check if workspace changed or user logged in or simulated member changed
    const workspaceChanged = previousState ? userState.profile.activeWorkspace !== previousState.profile.activeWorkspace : true;
    const loginChanged = previousState ? userState.profile.isLoggedIn !== previousState.profile.isLoggedIn : true;
    const simulatedChanged = previousState ? userState.activeSimulatedMemberId !== previousState.activeSimulatedMemberId : true;

    if (workspaceChanged || loginChanged || simulatedChanged) {
      try {
        const activeWS = userState.profile.activeWorkspace;
        const res = await fetchApi('/tasks', {
          params: { workspace: activeWS }
        });
        if (res.success && res.tasks) {
          const currentUserId = userState.activeSimulatedMemberId || userState.profile.email || 'founder@tickit.app';
          const isFounder = userState.activeSimulatedMemberId === null && userState.profile.role === 'founder';
          const visibleTasks = filterVisibleTasks(res.tasks, currentUserId, isFounder);
          useTaskStore.setState({ allTasks: res.tasks, tasks: visibleTasks });
        }
      } catch (e) {
        console.warn('Failed to sync tasks on state change:', e);
      }
    }
  }
});


