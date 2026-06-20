const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: [
      'founder',
      'co_founder',
      'tech_lead',
      'ui_ux_designer',
      'backend_developer',
      'ai_engineer',
      'marketing_lead',
      'team_member'
    ]
  },
  workMode: {
    type: String,
    enum: ['solo', 'team'],
    default: 'team'
  },
  tourComplete: {
    type: Boolean,
    default: false
  },
  onboardingComplete: {
    type: Boolean,
    default: false
  },
  activeWorkspace: {
    type: String,
    enum: ['personal', 'startup'],
    default: 'startup'
  },
  startupOrgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StartupOrg',
    default: null
  }
}, {
  timestamps: true
});

const bcrypt = require('bcryptjs');

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
