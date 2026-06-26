// ─── Quadrant Definitions ───────────────────────────────────────
export enum Quadrant {
  DO_FIRST = 1,    // Urgent + Important
  SCHEDULE = 2,    // Not Urgent + Important
  DELEGATE = 3,    // Urgent + Not Important
  ELIMINATE = 4,   // Not Urgent + Not Important
}

export const QuadrantMeta: Record<Quadrant, { label: string; emoji: string; icon: string; color: string; bg: string; description: string }> = {
  [Quadrant.DO_FIRST]: {
    label: 'Do First',
    emoji: '🔥',
    icon: 'flame',
    color: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.08)',
    description: 'Urgent & Important — handle immediately',
  },
  [Quadrant.SCHEDULE]: {
    label: 'Schedule',
    emoji: '📅',
    icon: 'calendar',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.08)',
    description: 'Important but not urgent — plan ahead',
  },
  [Quadrant.DELEGATE]: {
    label: 'Delegate',
    emoji: '🤝',
    icon: 'people',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.08)',
    description: 'Urgent but not important — hand off',
  },
  [Quadrant.ELIMINATE]: {
    label: 'Eliminate',
    emoji: '🗑️',
    icon: 'trash',
    color: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.08)',
    description: 'Neither urgent nor important — drop or defer',
  },
};

// ─── Subtask ────────────────────────────────────────────────────
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// ─── Comment ────────────────────────────────────────────────────
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

// ─── Task ───────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  description: string;
  quadrant: Quadrant;
  urgency: number;       // 0–100
  importance: number;    // 0–100
  priorityScore: number; // computed: urgency*0.4 + importance*0.4 + deadlineProximity*0.2
  deadline: string | null; // ISO date string
  subtasks: Subtask[];
  progress: number;      // 0–100
  xpAwarded: number;
  createdAt: string;     // ISO date string
  completedAt: string | null;
  isArchived: boolean;
  aiReasoning: string;   // AI classification reasoning text

  // Tick-It Extension
  workspace: 'personal' | 'startup';
  creatorId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeRole: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencyTaskId: string | null;
  approvalStatus: 'none' | 'pending_approval' | 'approved' | 'changes_requested';
  dailyNotes: string;
  blockers: string;
  estimatedMinutes: number;
  comments: Comment[];
}

// ─── Badge ──────────────────────────────────────────────────────
export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string;     // human-readable condition
  unlockedAt: string | null;
}

// ─── Team Member ────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'typing';
  avatar: string;
}

// ─── Startup Org ────────────────────────────────────────────────
export interface StartupOrg {
  name: string;
  code: string;
  members: TeamMember[];
}

// ─── User Profile ───────────────────────────────────────────────
export type UserRole =
  | 'founder'
  | 'co_founder'
  | 'tech_lead'
  | 'ui_ux_designer'
  | 'backend_developer'
  | 'ai_engineer'
  | 'marketing_lead'
  | 'team_member';

export type WorkMode = 'solo' | 'team';

export interface UserProfile {
  id?: string;
  name: string;
  email: string | null;
  role: UserRole | null;
  workMode: WorkMode;
  tourComplete: boolean;
  onboardingComplete: boolean;
  activeWorkspace: 'personal' | 'startup';
  startupOrg: StartupOrg | null;
  isLoggedIn: boolean;
}

// ─── Gamification ───────────────────────────────────────────────
export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null; // ISO date
  badges: Badge[];
  completionHistory: Record<string, number>; // date string → count
  founderScore: number;
  consistencyScore: number;
  hackathonScore: number;
}

// ─── Classification Result ──────────────────────────────────────
export interface ClassificationResult {
  urgency: number;
  importance: number;
  quadrant: Quadrant;
  priorityScore: number;
  reasoning: string;
}

// ─── Daily Plan ─────────────────────────────────────────────────
export interface DailyPlanItem {
  task: Task;
  rank: number;
  estimatedMinutes: number;
  reason: string;
}

