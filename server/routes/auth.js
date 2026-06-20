const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StartupOrg = require('../models/StartupOrg');
const Gamification = require('../models/Gamification');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

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

// Formats a user document into the UserProfile shape expected by the frontend
const buildUserProfile = (user, org) => {
  let startupOrg = null;
  if (org) {
    startupOrg = {
      name: org.name,
      code: org.code,
      members: org.members.map(m => ({
        id: m.userId.toString(),
        name: m.name,
        role: m.role,
        status: m.status || 'offline',
        avatar: m.avatar || getAvatarForRole(m.role)
      }))
    };
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    workMode: user.workMode || 'team',
    tourComplete: user.tourComplete || false,
    onboardingComplete: user.onboardingComplete || false,
    activeWorkspace: user.activeWorkspace || 'startup',
    startupOrg,
    isLoggedIn: true
  };
};

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'tickit_secret_key';
  return jwt.sign({ userId: userId.toString() }, secret, { expiresIn: '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, orgName, orgCode } = req.body;

    if (!name || !email || !password || !role || !orgName || !orgCode) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    // Find or create the organization
    const upperCode = orgCode.toUpperCase().trim();
    let org = await StartupOrg.findOne({ code: upperCode });

    if (!org) {
      if (role !== 'founder') {
        return res.status(400).json({ 
          success: false, 
          error: 'The startup organization code provided does not exist. Please contact your founder for the correct code.' 
        });
      }
      org = new StartupOrg({
        name: orgName.trim(),
        code: upperCode,
        members: []
      });
      await org.save();
    }

    // Create the user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Pre-save mongoose hook will hash this password automatically!
      role,
      workMode: 'team',
      tourComplete: false,
      onboardingComplete: false,
      activeWorkspace: 'startup',
      startupOrgId: org._id
    });
    await user.save();

    // Add user to organization members
    org.members.push({
      userId: user._id,
      name: user.name,
      role: getRoleDisplay(user.role),
      status: 'online',
      avatar: getAvatarForRole(user.role)
    });
    await org.save();

    // Initialize Gamification
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

    const gamification = new Gamification({
      userId: user._id,
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      badges: DEFAULT_BADGES.map(b => ({
        badgeId: b.id,
        name: b.name,
        emoji: b.emoji,
        description: b.description,
        condition: b.condition,
        unlockedAt: null
      })),
      completionHistory: {},
      founderScore: 75,
      consistencyScore: 80,
      hackathonScore: 65
    });
    await gamification.save();

    const token = generateToken(user._id);
    const updatedOrg = await StartupOrg.findById(org._id);
    const profile = buildUserProfile(user, updatedOrg);

    res.status(201).json({ success: true, token, profile });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, error: 'User does not exist.' });
    }

    // Secure password verification
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect password.' });
    }

    // Update status to online in their organization
    let org = null;
    if (user.startupOrgId) {
      org = await StartupOrg.findById(user.startupOrgId);
      if (org) {
        let memberUpdated = false;
        org.members = org.members.map(m => {
          if (m.userId.toString() === user._id.toString()) {
            m.status = 'online';
            memberUpdated = true;
          }
          return m;
        });

        if (!memberUpdated) {
          org.members.push({
            userId: user._id,
            name: user.name,
            role: getRoleDisplay(user.role),
            status: 'online',
            avatar: getAvatarForRole(user.role)
          });
        }
        await org.save();
      }
    }

    const token = generateToken(user._id);
    const profile = buildUserProfile(user, org);
    res.status(200).json({ success: true, token, profile });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  try {
    const user = req.user;
    if (user.startupOrgId) {
      const org = await StartupOrg.findById(user.startupOrgId);
      if (org) {
        org.members = org.members.map(m => {
          if (m.userId.toString() === user._id.toString()) {
            m.status = 'offline';
          }
          return m;
        });
        await org.save();
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    let org = null;
    if (user.startupOrgId) {
      org = await StartupOrg.findById(user.startupOrgId);
    }

    const profile = buildUserProfile(user, org);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    const { name, role, workMode, tourComplete, onboardingComplete, activeWorkspace } = req.body;

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (workMode !== undefined) user.workMode = workMode;
    if (tourComplete !== undefined) user.tourComplete = tourComplete;
    if (onboardingComplete !== undefined) user.onboardingComplete = onboardingComplete;
    if (activeWorkspace !== undefined) user.activeWorkspace = activeWorkspace;

    await user.save();

    // Update inside Org Members as well if name or role changed
    let org = null;
    if (user.startupOrgId) {
      org = await StartupOrg.findById(user.startupOrgId);
      if (org && (name !== undefined || role !== undefined)) {
        org.members = org.members.map(m => {
          if (m.userId.toString() === user._id.toString()) {
            if (name !== undefined) m.name = name;
            if (role !== undefined) m.role = getRoleDisplay(role);
          }
          return m;
        });
        await org.save();
      }
    }

    const profile = buildUserProfile(user, org);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/orgs
router.post('/orgs', auth, async (req, res) => {
  try {
    const user = req.user;
    const { name } = req.body;

    if (user.role !== 'founder') {
      return res.status(403).json({ success: false, error: 'Only founders are allowed to create startup organizations.' });
    }

    // Generate org code
    const code = name.slice(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    const org = new StartupOrg({
      name,
      code,
      members: [{
        userId: user._id,
        name: user.name,
        role: getRoleDisplay(user.role),
        status: 'online',
        avatar: getAvatarForRole(user.role)
      }]
    });
    await org.save();

    user.startupOrgId = org._id;
    await user.save();

    const profile = buildUserProfile(user, org);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/members
router.get('/members', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.startupOrgId) {
      return res.json({ success: true, members: [] });
    }

    const org = await StartupOrg.findById(user.startupOrgId);
    if (!org) {
      return res.json({ success: true, members: [] });
    }

    const formattedMembers = org.members.map(m => ({
      id: m.userId.toString(),
      name: m.name,
      role: m.role,
      status: m.status || 'offline',
      avatar: m.avatar || getAvatarForRole(m.role)
    }));

    res.json({ success: true, members: formattedMembers });
  } catch (error) {
    console.error('Members fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
