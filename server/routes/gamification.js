const express = require('express');
const router = express.Router();
const Gamification = require('../models/Gamification');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

const formatGamification = (g) => {
  if (!g) return null;
  const obj = g.toObject ? g.toObject() : g;
  
  // Format completionHistory from Map to plain Object
  let completionHistoryObj = {};
  if (obj.completionHistory) {
    if (obj.completionHistory instanceof Map) {
      completionHistoryObj = Object.fromEntries(obj.completionHistory);
    } else {
      completionHistoryObj = obj.completionHistory;
    }
  }

  return {
    xp: obj.xp,
    level: obj.level,
    streak: obj.streak,
    lastActiveDate: obj.lastActiveDate,
    badges: (obj.badges || []).map(b => ({
      id: b.badgeId,
      name: b.name,
      emoji: b.emoji,
      description: b.description,
      condition: b.condition,
      unlockedAt: b.unlockedAt ? b.unlockedAt.toISOString() : null
    })),
    completionHistory: completionHistoryObj,
    founderScore: obj.founderScore,
    consistencyScore: obj.consistencyScore,
    hackathonScore: obj.hackathonScore
  };
};

// GET /api/gamification
router.get('/', auth, async (req, res) => {
  try {
    let gamification = await Gamification.findOne({ userId: req.user._id });
    
    if (!gamification) {
      gamification = new Gamification({
        userId: req.user._id,
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
    }

    res.json({ success: true, gamification: formatGamification(gamification) });
  } catch (error) {
    console.error('Fetch gamification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gamification/sync
router.post('/sync', auth, async (req, res) => {
  try {
    const {
      xp,
      level,
      streak,
      lastActiveDate,
      badges,
      completionHistory,
      founderScore,
      consistencyScore,
      hackathonScore
    } = req.body;

    let gamification = await Gamification.findOne({ userId: req.user._id });
    if (!gamification) {
      gamification = new Gamification({ userId: req.user._id });
    }

    if (xp !== undefined) gamification.xp = xp;
    if (level !== undefined) gamification.level = level;
    if (streak !== undefined) gamification.streak = streak;
    if (lastActiveDate !== undefined) gamification.lastActiveDate = lastActiveDate;
    if (founderScore !== undefined) gamification.founderScore = founderScore;
    if (consistencyScore !== undefined) gamification.consistencyScore = consistencyScore;
    if (hackathonScore !== undefined) gamification.hackathonScore = hackathonScore;
    
    if (badges !== undefined && Array.isArray(badges)) {
      gamification.badges = badges.map(b => ({
        badgeId: b.id,
        name: b.name,
        emoji: b.emoji,
        description: b.description,
        condition: b.condition,
        unlockedAt: b.unlockedAt ? new Date(b.unlockedAt) : null
      }));
    }

    if (completionHistory !== undefined) {
      gamification.completionHistory = completionHistory;
    }

    await gamification.save();
    res.json({ success: true, gamification: formatGamification(gamification) });
  } catch (error) {
    console.error('Sync gamification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
