import { Badge, Quadrant, Task } from '@/store/types';

// ─── Level Thresholds ───────────────────────────────────────────
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
  5200, 6600, 8200, 10000, 12500, 15500, 19000, 23000, 28000, 35000,
];

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(xp: number): { current: number; next: number; progress: number } {
  const level = getLevel(xp);
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? current + 1000;
  const progress = (xp - current) / (next - current);
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

// ─── XP Calculation ─────────────────────────────────────────────
export function calculateTaskXP(task: Task, streak: number): number {
  // Base XP by quadrant
  const baseXP: Record<Quadrant, number> = {
    [Quadrant.DO_FIRST]: 50,
    [Quadrant.SCHEDULE]: 40,
    [Quadrant.DELEGATE]: 25,
    [Quadrant.ELIMINATE]: 15,
  };

  let xp = baseXP[task.quadrant];

  // Priority bonus
  xp += Math.round(task.priorityScore * 0.3);

  // Streak multiplier (max 2x at 14-day streak)
  const streakMultiplier = 1 + Math.min(streak, 14) * 0.07;
  xp = Math.round(xp * streakMultiplier);

  // Subtask bonus
  if (task.subtasks.length > 0) {
    const completedSubs = task.subtasks.filter(s => s.completed).length;
    xp += completedSubs * 5;
  }

  // On-time bonus (completed before deadline)
  if (task.deadline && task.completedAt) {
    const deadlineDate = new Date(task.deadline);
    const completedDate = new Date(task.completedAt);
    if (completedDate <= deadlineDate) {
      xp += 20; // on-time bonus
    }
  }

  return xp;
}

// ─── Badge Definitions ──────────────────────────────────────────
export const ALL_BADGES: Badge[] = [
  {
    id: 'first_task',
    name: 'First Step',
    emoji: '🌱',
    description: 'Complete your first task',
    condition: 'Complete 1 task',
    unlockedAt: null,
  },
  {
    id: 'five_tasks',
    name: 'Getting Started',
    emoji: '⚡',
    description: 'Complete 5 tasks',
    condition: 'Complete 5 tasks',
    unlockedAt: null,
  },
  {
    id: 'twenty_five_tasks',
    name: 'Momentum',
    emoji: '🚀',
    description: 'Complete 25 tasks',
    condition: 'Complete 25 tasks',
    unlockedAt: null,
  },
  {
    id: 'hundred_tasks',
    name: 'Centurion',
    emoji: '💯',
    description: 'Complete 100 tasks',
    condition: 'Complete 100 tasks',
    unlockedAt: null,
  },
  {
    id: 'streak_3',
    name: 'Consistent',
    emoji: '🔥',
    description: '3-day completion streak',
    condition: 'Maintain a 3-day streak',
    unlockedAt: null,
  },
  {
    id: 'streak_7',
    name: 'On Fire',
    emoji: '🔥🔥',
    description: '7-day completion streak',
    condition: 'Maintain a 7-day streak',
    unlockedAt: null,
  },
  {
    id: 'streak_14',
    name: 'Unstoppable',
    emoji: '💪',
    description: '14-day completion streak',
    condition: 'Maintain a 14-day streak',
    unlockedAt: null,
  },
  {
    id: 'focus_session',
    name: 'Deep Work',
    emoji: '🎯',
    description: 'Complete a focus session',
    condition: 'Finish 1 focus session',
    unlockedAt: null,
  },
  {
    id: 'five_focus',
    name: 'Flow State',
    emoji: '🧘',
    description: 'Complete 5 focus sessions',
    condition: 'Finish 5 focus sessions',
    unlockedAt: null,
  },
  {
    id: 'do_first_clear',
    name: 'Fire Fighter',
    emoji: '🧯',
    description: 'Clear all Do First tasks in a day',
    condition: 'Complete all Q1 tasks in one day',
    unlockedAt: null,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    emoji: '🐦',
    description: 'Complete a task before 8 AM',
    condition: 'Complete a task before 8:00 AM',
    unlockedAt: null,
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    emoji: '⭐',
    description: 'Reach level 5',
    condition: 'Reach level 5',
    unlockedAt: null,
  },
  {
    id: 'level_10',
    name: 'Veteran',
    emoji: '🏆',
    description: 'Reach level 10',
    condition: 'Reach level 10',
    unlockedAt: null,
  },
];

export function checkBadgeUnlocks(
  totalCompleted: number,
  streak: number,
  focusSessions: number,
  level: number,
  currentBadges: Badge[],
): Badge[] {
  const now = new Date().toISOString();
  const updated = currentBadges.map(b => ({ ...b }));

  const unlock = (id: string) => {
    const badge = updated.find(b => b.id === id);
    if (badge && !badge.unlockedAt) {
      badge.unlockedAt = now;
    }
  };

  if (totalCompleted >= 1) unlock('first_task');
  if (totalCompleted >= 5) unlock('five_tasks');
  if (totalCompleted >= 25) unlock('twenty_five_tasks');
  if (totalCompleted >= 100) unlock('hundred_tasks');
  if (streak >= 3) unlock('streak_3');
  if (streak >= 7) unlock('streak_7');
  if (streak >= 14) unlock('streak_14');
  if (focusSessions >= 1) unlock('focus_session');
  if (focusSessions >= 5) unlock('five_focus');
  if (level >= 5) unlock('level_5');
  if (level >= 10) unlock('level_10');

  return updated;
}
