const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  }
});

const CommentSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorRole: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  quadrant: {
    type: Number,
    required: true,
    enum: [1, 2, 3, 4],
    index: true
  },
  urgency: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  importance: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  priorityScore: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    default: null
  },
  subtasks: [SubtaskSchema],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  xpAwarded: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  aiReasoning: {
    type: String,
    default: ''
  },
  workspace: {
    type: String,
    enum: ['personal', 'startup'],
    default: 'startup',
    index: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  startupOrgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StartupOrg',
    default: null,
    index: true
  },
  assigneeName: {
    type: String,
    default: null
  },
  assigneeRole: {
    type: String,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  dependencyTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  approvalStatus: {
    type: String,
    enum: ['none', 'pending_approval', 'approved', 'changes_requested'],
    default: 'none',
    index: true
  },
  dailyNotes: {
    type: String,
    default: ''
  },
  blockers: {
    type: String,
    default: ''
  },
  estimatedMinutes: {
    type: Number,
    default: 0
  },
  comments: [CommentSchema]
}, {
  timestamps: true
});

TaskSchema.index({ assigneeId: 1, workspace: 1 });
TaskSchema.index({ creatorId: 1, workspace: 1 });
TaskSchema.index({ startupOrgId: 1, workspace: 1 });

module.exports = mongoose.model('Task', TaskSchema);
