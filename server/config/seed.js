const mongoose = require('mongoose');
const User = require('../models/User');
const StartupOrg = require('../models/StartupOrg');
const Task = require('../models/Task');
const Gamification = require('../models/Gamification');

const DEFAULT_USERS = [
  { email: 'founder@tickit.app', password: 'founder123', name: 'Ujjwal Founder', role: 'founder' },
  { email: 'techlead@tickit.app', password: 'techlead123', name: 'Rahul TechLead', role: 'tech_lead' },
  { email: 'designer@tickit.app', password: 'designer123', name: 'Sanya Designer', role: 'ui_ux_designer' },
  { email: 'backend@tickit.app', password: 'backend123', name: 'Amit Backend', role: 'backend_developer' },
  { email: 'ai@tickit.app', password: 'ai123', name: 'Priya AI Engineer', role: 'ai_engineer' },
  { email: 'marketing@tickit.app', password: 'marketing123', name: 'Karan Marketer', role: 'marketing_lead' },
];

const DEFAULT_BADGES = [
  { id: 'first_task', name: 'First Step', emoji: '🌱', description: 'Complete your first task', condition: 'Complete 1 task', unlockedAt: null },
  { id: 'five_tasks', name: 'Getting Started', emoji: '⚡', description: 'Complete 5 tasks', condition: 'Complete 5 tasks', unlockedAt: null },
  { id: 'twenty_five_tasks', name: 'Momentum', emoji: '🚀', description: 'Complete 25 tasks', condition: 'Complete 25 tasks', unlockedAt: null },
  { id: 'hundred_tasks', name: 'Centurion', emoji: '💯', description: 'Complete 100 tasks', condition: 'Complete 100 tasks', unlockedAt: null },
  { id: 'streak_3', name: 'Consistent', emoji: '🔥', description: '3-day completion streak', condition: 'Maintain a 3-day streak', unlockedAt: null },
  { id: 'streak_7', name: 'On Fire', emoji: '🔥🔥', description: '7-day completion streak', condition: 'Maintain a 7-day streak', unlockedAt: null },
  { id: 'streak_14', name: 'Unstoppable', emoji: '💪', description: '14-day completion streak', condition: 'Maintain a 14-day streak', unlockedAt: null },
  { id: 'focus_session', name: 'Deep Work', emoji: '🎯', description: 'Complete a focus session', condition: 'Finish 1 focus session', unlockedAt: null },
  { id: 'five_focus', name: 'Flow State', emoji: '🧘', description: 'Complete 5 focus sessions', condition: 'Finish 5 focus sessions', unlockedAt: null },
  { id: 'do_first_clear', name: 'Fire Fighter', emoji: '🧯', description: 'Clear all Do First tasks in a day', condition: 'Complete all Q1 tasks in one day', unlockedAt: null },
  { id: 'early_bird', name: 'Early Bird', emoji: '🐦', description: 'Complete a task before 8 AM', condition: 'Complete a task before 8:00 AM', unlockedAt: null },
  { id: 'level_5', name: 'Rising Star', emoji: '⭐', description: 'Reach level 5', condition: 'Reach level 5', unlockedAt: null },
  { id: 'level_10', name: 'Veteran', emoji: '🏆', description: 'Reach level 10', condition: 'Reach level 10', unlockedAt: null },
];

const getAvatarForRole = (role) => {
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

const getRoleDisplay = (role) => {
  switch (role) {
    case 'founder': return 'Founder';
    case 'co_founder': return 'Co-Founder';
    case 'tech_lead': return 'Tech Lead';
    case 'ui_ux_designer': return 'UI/UX Designer';
    case 'backend_developer': return 'Backend Developer';
    case 'ai_engineer': return 'AI Engineer';
    case 'marketing_lead': return 'Marketing Lead';
    default: return 'Team Member';
  }
};

const seedDB = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has users. Skipping automatic seeding.');
      return;
    }

    console.log('Seeding Database...');

    // 1. Create Startup Organization
    const org = new StartupOrg({
      name: 'Ujjwalit Technologies',
      code: 'UJT-4938',
      members: []
    });
    await org.save();
    console.log(`Seeded StartupOrg: ${org.name} (${org.code})`);

    // 2. Create Users & Gamification Records
    const seededUsers = [];
    const userEmailMap = {};

    for (const u of DEFAULT_USERS) {
      const user = new User({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        workMode: 'team',
        tourComplete: true,
        onboardingComplete: true,
        activeWorkspace: 'startup',
        startupOrgId: org._id
      });
      await user.save();
      seededUsers.push(user);
      userEmailMap[u.email.toLowerCase()] = user._id;

      // Seed Gamification
      const gamification = new Gamification({
        userId: user._id,
        xp: u.role === 'founder' ? 300 : 0, // Founder starts with some base XP
        level: 1,
        streak: u.role === 'founder' ? 3 : 0,
        lastActiveDate: null,
        badges: DEFAULT_BADGES.map(b => ({
          badgeId: b.id,
          name: b.name,
          emoji: b.emoji,
          description: b.description,
          condition: b.condition,
          unlockedAt: null
        })),
        completionHistory: new Map(),
        founderScore: 75,
        consistencyScore: 80,
        hackathonScore: 65
      });
      await gamification.save();
      console.log(`Seeded User & Gamification: ${user.name}`);
    }

    // 3. Update Org Members with ObjectIds
    org.members = seededUsers.map(user => ({
      userId: user._id,
      name: user.name,
      role: getRoleDisplay(user.role),
      status: 'offline',
      avatar: getAvatarForRole(user.role)
    }));
    await org.save();
    console.log(`Associated ${org.members.length} members with StartupOrg`);

    // 4. Seed Tasks
    const founderId = userEmailMap['founder@tickit.app'];
    const techleadId = userEmailMap['techlead@tickit.app'];
    const designerId = userEmailMap['designer@tickit.app'];

    const mockTasks = [
      {
        title: 'Investor Pitch Deck Draft',
        description: 'Structure slides for Seed A funding and detail financial forecasts.',
        quadrant: 1,
        urgency: 85,
        importance: 90,
        priorityScore: 88,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Outline core slides', completed: true },
          { title: 'Draft financial model sheets', completed: false },
          { title: 'Get feedback from advisors', completed: false },
        ],
        progress: 33,
        xpAwarded: 0,
        completedAt: null,
        isArchived: false,
        aiReasoning: 'Critical milestone for funding. High urgency and high importance.',
        workspace: 'startup',
        creatorId: founderId,
        assigneeId: null,
        assigneeName: null,
        assigneeRole: null,
        priority: 'high',
        dependencyTaskId: null,
        approvalStatus: 'none',
        dailyNotes: 'Drafted slide outline. Designing graphics.',
        blockers: '',
        estimatedMinutes: 120,
        comments: [],
        startupOrgId: org._id
      },
      {
        title: 'Build JWT Authentication API',
        description: 'Create login, signup, token validation and refresh token endpoints.',
        quadrant: 2,
        urgency: 45,
        importance: 85,
        priorityScore: 70,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Setup passport JWT strategy', completed: true },
          { title: 'Write unit tests for endpoints', completed: true },
          { title: 'Integrate database schema', completed: true },
        ],
        progress: 100,
        xpAwarded: 0,
        completedAt: null,
        isArchived: false,
        aiReasoning: 'Foundation for UI auth. Important but deadline allows scheduled development.',
        workspace: 'startup',
        creatorId: founderId,
        assigneeId: techleadId,
        assigneeName: 'Rahul TechLead',
        assigneeRole: 'Tech Lead',
        priority: 'critical',
        dependencyTaskId: null,
        approvalStatus: 'pending_approval',
        dailyNotes: 'Authentication API completed 80%. Need frontend integration.',
        blockers: 'Awaiting front-end routing template.',
        estimatedMinutes: 180,
        comments: [
          {
            authorId: techleadId,
            authorName: 'Rahul TechLead',
            authorRole: 'Tech Lead',
            text: 'Finished backend testing, JWT signing works perfectly. Ready for review.',
            createdAt: new Date()
          }
        ],
        startupOrgId: org._id
      },
      {
        title: 'Wireframe Dashboard Analytics',
        description: 'Design mockups for startup telemetry, burnout widgets, and quadrants.',
        quadrant: 3,
        urgency: 75,
        importance: 30,
        priorityScore: 55,
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Figma wireframes', completed: true },
          { title: 'Design system compliance check', completed: true },
        ],
        progress: 100,
        xpAwarded: 150,
        completedAt: new Date(),
        isArchived: false,
        aiReasoning: 'UI feedback needed quickly. Urgent to unblock AI team, delegated to Sanya.',
        workspace: 'startup',
        creatorId: founderId,
        assigneeId: designerId,
        assigneeName: 'Sanya Designer',
        assigneeRole: 'UI/UX Designer',
        priority: 'medium',
        dependencyTaskId: null,
        approvalStatus: 'approved',
        dailyNotes: 'Completed wireframes and exported assets.',
        blockers: '',
        estimatedMinutes: 90,
        comments: [
          {
            authorId: designerId,
            authorName: 'Sanya Designer',
            authorRole: 'UI/UX Designer',
            text: 'Sent link to Figma board.',
            createdAt: new Date()
          }
        ],
        startupOrgId: org._id
      },
      {
        title: 'Learn Node.js Streams & Buffers',
        description: 'Understand readable, writable, duplex and transform streams.',
        quadrant: 2,
        urgency: 25,
        importance: 75,
        priorityScore: 50,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        subtasks: [],
        progress: 0,
        xpAwarded: 0,
        completedAt: null,
        isArchived: false,
        aiReasoning: 'Important technical skill, not immediately urgent.',
        workspace: 'personal',
        creatorId: founderId,
        assigneeId: null,
        assigneeName: null,
        assigneeRole: null,
        priority: 'medium',
        dependencyTaskId: null,
        approvalStatus: 'none',
        dailyNotes: '',
        blockers: '',
        estimatedMinutes: 60,
        comments: [],
        startupOrgId: null
      },
      {
        title: 'Hit Gym: Leg Day Session',
        description: 'Squats, Romanian deadlifts, leg press, and calf raises.',
        quadrant: 1,
        urgency: 90,
        importance: 80,
        priorityScore: 84,
        deadline: new Date(),
        subtasks: [],
        progress: 0,
        xpAwarded: 0,
        completedAt: null,
        isArchived: false,
        aiReasoning: 'Health routine target for today.',
        workspace: 'personal',
        creatorId: founderId,
        assigneeId: null,
        assigneeName: null,
        assigneeRole: null,
        priority: 'high',
        dependencyTaskId: null,
        approvalStatus: 'none',
        dailyNotes: '',
        blockers: '',
        estimatedMinutes: 75,
        comments: [],
        startupOrgId: null
      }
    ];

    for (const taskData of mockTasks) {
      const task = new Task(taskData);
      await task.save();
    }
    console.log(`Seeded ${mockTasks.length} Mock Tasks successfully!`);
    console.log('Seeding finished successfully.');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seedDB;
