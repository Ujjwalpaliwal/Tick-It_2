import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge, GamificationState, UserProfile, UserRole, WorkMode, StartupOrg, TeamMember } from './types';
import { ALL_BADGES, calculateTaskXP, checkBadgeUnlocks, getLevel } from '@/utils/xp';
import { getDateKey } from '@/utils/dateHelpers';
import type { Task } from './types';
import { fetchApi, setApiToken } from '@/utils/api';

const STORAGE_KEY = 'tickit_user';

interface UserState {
  profile: UserProfile;
  gamification: GamificationState;
  focusSessions: number;
  activeSimulatedMemberId: string | null;
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  setName: (name: string) => void;
  setRole: (role: UserRole) => void;
  setWorkMode: (mode: WorkMode) => void;
  completeTour: () => void;
  completeOnboarding: () => void;
  awardXPForTask: (task: Task) => number;
  recordFocusSession: () => void;
  updateStreak: () => void;
  resetAll: () => Promise<void>;

  // Tick-It Extensions
  setActiveWorkspace: (workspace: 'personal' | 'startup') => void;
  setSimulatedMember: (id: string | null) => void;
  createStartupOrg: (name: string) => Promise<void>;
  updateGamificationScores: (tasks: Task[]) => void;

  // Auth Actions
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (name: string, email: string, password: string, role: UserRole, orgName: string, orgCode: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => Promise<void>;
}

const getAvatarForRole = (role: string): string => {
  switch (role) {
    case 'founder': return '👑';
    case 'co_founder': return '🤝';
    case 'tech_lead': return '💻';
    case 'ui_ux_designer': return '🎨';
    case 'backend_developer': return '💾';
    case 'ai_engineer': return '🤖';
    case 'marketing_lead': return '📢';
    default: return '🧑';
  }
};

const defaultProfile: UserProfile = {
  name: '',
  email: null,
  role: null,
  workMode: 'team',
  tourComplete: false,
  onboardingComplete: false,
  activeWorkspace: 'startup',
  startupOrg: null,
  isLoggedIn: false,
};

const defaultGamification: GamificationState = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: null,
  badges: [...ALL_BADGES],
  completionHistory: {},
  founderScore: 75,
  consistencyScore: 80,
  hackathonScore: 65,
};

function persistUser(
  profile: UserProfile,
  gamification: GamificationState,
  focusSessions: number,
  activeSimulatedMemberId: string | null
) {
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ profile, gamification, focusSessions, activeSimulatedMemberId })
  ).catch(console.error);

  if (profile.email) {
    const key = `tickit_user_${profile.email.toLowerCase()}`;
    AsyncStorage.setItem(
      key,
      JSON.stringify({ profile, gamification, focusSessions, activeSimulatedMemberId })
    ).catch(console.error);
  }
}

const updateProfileOnBackend = async (updates: Partial<UserProfile>) => {
  try {
    await fetchApi('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (e) {
    console.error('Failed to sync profile change with backend:', e);
  }
};

const syncGamificationToBackend = async (gamification: GamificationState) => {
  try {
    await fetchApi('/gamification/sync', {
      method: 'POST',
      body: JSON.stringify(gamification)
    });
  } catch (e) {
    console.error('Failed to sync gamification with backend:', e);
  }
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: { ...defaultProfile },
  gamification: { ...defaultGamification },
  focusSessions: 0,
  activeSimulatedMemberId: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const storedToken = await AsyncStorage.getItem('tickit_jwt_token');
      if (storedToken) {
        setApiToken(storedToken);
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        let profile = { ...defaultProfile, ...data.profile };
        let gamification = { ...defaultGamification, ...data.gamification };
        let focusSessions = data.focusSessions ?? 0;
        let activeSimulatedMemberId = data.activeSimulatedMemberId ?? null;

        if (profile.isLoggedIn && storedToken) {
          try {
            // Retrieve latest state from backend
            const pRes = await fetchApi('/auth/profile');
            if (pRes.success && pRes.profile) {
              profile = pRes.profile;
            }
            
            const mRes = await fetchApi('/auth/members');
            if (mRes.success && mRes.members && profile.startupOrg) {
              profile.startupOrg.members = mRes.members;
            }
            
            const gRes = await fetchApi('/gamification');
            if (gRes.success && gRes.gamification) {
              gamification = gRes.gamification;
            }
          } catch (e) {
            console.warn('API sync failed during user hydration, using cache:', e);
          }
        }

        set({
          profile,
          gamification,
          focusSessions,
          activeSimulatedMemberId,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  setName: (name) => {
    const profile = { ...get().profile, name };
    set({ profile });
    persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    updateProfileOnBackend({ name });
  },

  setRole: (role) => {
    const profile = { ...get().profile, role };
    set({ profile });
    persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    updateProfileOnBackend({ role });
  },

  setWorkMode: (mode) => {
    const profile = { ...get().profile, workMode: mode };
    set({ profile });
    persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    updateProfileOnBackend({ workMode: mode });
  },

  completeTour: () => {
    const profile = { ...get().profile, tourComplete: true };
    set({ profile });
    persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    updateProfileOnBackend({ tourComplete: true });
  },

  completeOnboarding: () => {
    const profile = { ...get().profile, onboardingComplete: true, tourComplete: true };
    set({ profile });
    persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    updateProfileOnBackend({ onboardingComplete: true, tourComplete: true });
  },

  awardXPForTask: (task) => {
    const g = get().gamification;
    const xp = calculateTaskXP(task, g.streak);
    const newXP = g.xp + xp;
    const newLevel = getLevel(newXP);
    const todayKey = getDateKey();
    const history = { ...g.completionHistory };
    history[todayKey] = (history[todayKey] ?? 0) + 1;

    const totalCompleted = Object.values(history).reduce((a, b) => a + b, 0);
    const newBadges = checkBadgeUnlocks(totalCompleted, g.streak, get().focusSessions, newLevel, g.badges);

    const gamification: GamificationState = {
      ...g,
      xp: newXP,
      level: newLevel,
      badges: newBadges,
      completionHistory: history,
      lastActiveDate: todayKey,
    };
    set({ gamification });
    persistUser(get().profile, gamification, get().focusSessions, get().activeSimulatedMemberId);
    syncGamificationToBackend(gamification);
    return xp;
  },

  recordFocusSession: () => {
    const focusSessions = get().focusSessions + 1;
    const g = get().gamification;
    const newBadges = checkBadgeUnlocks(
      Object.values(g.completionHistory).reduce((a, b) => a + b, 0),
      g.streak,
      focusSessions,
      g.level,
      g.badges
    );
    const gamification = { ...g, badges: newBadges };
    set({ focusSessions, gamification });
    persistUser(get().profile, gamification, focusSessions, get().activeSimulatedMemberId);
    syncGamificationToBackend(gamification);
  },

  updateStreak: () => {
    const g = get().gamification;
    const todayKey = getDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday);

    let newStreak = g.streak;
    if (g.lastActiveDate === todayKey) {
      // Already active today, no change
    } else if (g.lastActiveDate === yesterdayKey) {
      newStreak += 1;
    } else if (g.lastActiveDate !== todayKey) {
      newStreak = 1; // Reset streak
    }

    const gamification = { ...g, streak: newStreak, lastActiveDate: todayKey };
    set({ gamification });
    persistUser(get().profile, gamification, get().focusSessions, get().activeSimulatedMemberId);
    syncGamificationToBackend(gamification);
  },

  resetAll: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem('tickit_tasks');
    set({
      profile: { ...defaultProfile },
      gamification: { ...defaultGamification },
      focusSessions: 0,
      activeSimulatedMemberId: null,
    });
    setApiToken(null);
  },

  // Tick-It Extensions
  setActiveWorkspace: (workspace) => {
    const profile = { ...get().profile, activeWorkspace: workspace };
    set({ profile });
    persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    updateProfileOnBackend({ activeWorkspace: workspace });
  },

  setSimulatedMember: (id) => {
    set({ activeSimulatedMemberId: id });
    persistUser(get().profile, get().gamification, get().focusSessions, id);
  },

  createStartupOrg: async (name) => {
    try {
      const res = await fetchApi('/auth/orgs', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      if (res.success && res.profile) {
        set({ profile: res.profile });
        persistUser(res.profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
      }
    } catch (e) {
      console.error('Failed to create startup org on server:', e);
      // Client-side fallback
      const code = name.slice(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      const startupOrg: StartupOrg = {
        name,
        code,
        members: [{
          id: get().profile.email || 'founder@tickit.app',
          name: get().profile.name || 'Founder',
          role: 'Founder',
          status: 'online',
          avatar: '👑'
        }],
      };
      const profile = { ...get().profile, startupOrg };
      set({ profile });
      persistUser(profile, get().gamification, get().focusSessions, get().activeSimulatedMemberId);
    }
  },

  updateGamificationScores: (tasks) => {
    const startupTasks = tasks.filter(t => t.workspace === 'startup');
    const completedTasks = startupTasks.filter(t => t.completedAt !== null);

    const completionRate = startupTasks.length > 0 ? (completedTasks.length / startupTasks.length) * 100 : 75;
    const delayedTasksCount = startupTasks.filter(
      t => !t.completedAt && t.deadline && new Date(t.deadline).getTime() < Date.now()
    ).length;
    const delayPenalty = Math.max(0, delayedTasksCount * 5);
    const newFounderScore = Math.round(Math.min(100, Math.max(0, completionRate - delayPenalty)));

    const streakBonus = Math.min(20, get().gamification.streak * 2);
    const newConsistencyScore = Math.round(Math.min(100, 60 + streakBonus + completedTasks.length * 2));

    const criticalTasks = startupTasks.filter(t => t.priority === 'high' || t.priority === 'critical');
    const criticalCompleted = criticalTasks.filter(t => t.completedAt !== null);
    const critRate = criticalTasks.length > 0 ? (criticalCompleted.length / criticalTasks.length) * 100 : 50;
    const newHackathonScore = Math.round(
      Math.min(100, Math.max(0, critRate * 0.7 + (completedTasks.length > 0 ? 30 : 0)))
    );

    set((state) => {
      const gamification = {
        ...state.gamification,
        founderScore: newFounderScore,
        consistencyScore: newConsistencyScore,
        hackathonScore: newHackathonScore,
      };
      persistUser(state.profile, gamification, state.focusSessions, state.activeSimulatedMemberId);
      // Run async sync in background
      syncGamificationToBackend(gamification);
      return { gamification };
    });
  },

  loginUser: async (email, password) => {
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (!res.success || !res.profile || !res.token) {
        return { success: false, error: res.error || 'Login failed.' };
      }

      setApiToken(res.token);

      // Load gamification from backend
      let gamification = { ...defaultGamification };
      try {
        const gRes = await fetchApi('/gamification');
        if (gRes.success && gRes.gamification) {
          gamification = gRes.gamification;
        }
      } catch (gErr) {
        console.warn('Failed to load gamification on login:', gErr);
      }

      set({
        profile: res.profile,
        gamification,
        focusSessions: 0,
        activeSimulatedMemberId: null,
      });

      persistUser(res.profile, gamification, 0, null);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed.' };
    }
  },

  registerUser: async (name, email, password, role, orgName, orgCode) => {
    try {
      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role, orgName, orgCode })
      });

      if (!res.success || !res.profile || !res.token) {
        return { success: false, error: res.error || 'Registration failed.' };
      }

      setApiToken(res.token);

      const gamification = { ...defaultGamification };
      set({
        profile: res.profile,
        gamification,
        focusSessions: 0,
        activeSimulatedMemberId: null,
      });

      persistUser(res.profile, gamification, 0, null);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration failed.' };
    }
  },

  logoutUser: async () => {
    try {
      await fetchApi('/auth/logout', {
        method: 'POST'
      });
    } catch (e) {
      console.warn('Logout notification error:', e);
    }

    setApiToken(null);
    const updatedProfile: UserProfile = {
      ...defaultProfile,
      isLoggedIn: false,
    };
    set({
      profile: updatedProfile,
      gamification: { ...defaultGamification },
      focusSessions: 0,
      activeSimulatedMemberId: null,
    });
    persistUser(updatedProfile, defaultGamification, 0, null);
  },
}));


