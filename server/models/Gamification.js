const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  badgeId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  condition: {
    type: String,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const GamificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  streak: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: String,
    default: null
  },
  badges: [BadgeSchema],
  completionHistory: {
    type: Map,
    of: Number,
    default: {}
  },
  founderScore: {
    type: Number,
    default: 75
  },
  consistencyScore: {
    type: Number,
    default: 80
  },
  hackathonScore: {
    type: Number,
    default: 65
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Gamification', GamificationSchema);
