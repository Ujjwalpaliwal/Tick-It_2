const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');

const formatTask = (task) => {
  if (!task) return null;
  const t = task.toObject ? task.toObject() : task;
  t.id = t._id.toString();
  if (t.creatorId) t.creatorId = t.creatorId.toString();
  if (t.assigneeId) t.assigneeId = t.assigneeId.toString();
  if (t.startupOrgId) t.startupOrgId = t.startupOrgId.toString();
  if (t.subtasks) {
    t.subtasks = t.subtasks.map(s => {
      if (s._id) {
        s.id = s._id.toString();
      }
      return s;
    });
  }
  if (t.comments) {
    t.comments = t.comments.map(c => {
      if (c._id) {
        c.id = c._id.toString();
      }
      if (c.authorId) {
        c.authorId = c.authorId.toString();
      }
      return c;
    });
  }
  return t;
};

const checkTaskAccess = async (taskId, user) => {
  const task = await Task.findById(taskId);
  if (!task) {
    return { status: 404, error: 'Task not found.' };
  }
  if (task.workspace === 'personal' && task.creatorId.toString() !== user._id.toString()) {
    return { status: 403, error: 'Access denied to this personal task.' };
  }
  if (task.workspace === 'startup' && (!user.startupOrgId || task.startupOrgId.toString() !== user.startupOrgId.toString())) {
    return { status: 403, error: 'Access denied to this startup organization task.' };
  }
  return { task };
};

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  try {
    const { workspace } = req.query; // 'personal' or 'startup'
    const query = {};

    if (workspace === 'personal') {
      query.workspace = 'personal';
      query.creatorId = req.user._id;
    } else {
      // Default to startup workspace tasks, isolated by startupOrgId
      query.workspace = 'startup';
      if (!req.user.startupOrgId) {
        return res.json({ success: true, tasks: [] });
      }
      query.startupOrgId = req.user.startupOrgId;
    }

    const tasks = await Task.find(query);
    res.json({ success: true, tasks: tasks.map(formatTask) });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  try {
    const taskData = req.body;
    
    // Auto-populate relationship IDs based on context
    taskData.creatorId = req.user._id;
    
    if (taskData.workspace === 'startup') {
      if (!req.user.startupOrgId) {
        return res.status(400).json({ success: false, error: 'User is not associated with any organization.' });
      }
      taskData.startupOrgId = req.user.startupOrgId;
    } else {
      taskData.workspace = 'personal';
      taskData.startupOrgId = null;
    }

    // Assignee mapping if provided as email or string
    if (taskData.assigneeId && typeof taskData.assigneeId === 'string' && taskData.assigneeId.includes('@')) {
      const assigneeUser = await User.findOne({ email: taskData.assigneeId.toLowerCase() });
      if (assigneeUser) {
        taskData.assigneeId = assigneeUser._id;
      } else {
        taskData.assigneeId = null;
      }
    }

    // Clean client-provided id fields to prevent mongoose ObjectId casting failures
    if (taskData.id) delete taskData.id;
    if (taskData._id) delete taskData._id;

    const task = new Task(taskData);
    await task.save();

    res.status(201).json({ success: true, task: formatTask(task) });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error, task } = await checkTaskAccess(id, req.user);
    if (error) {
      return res.status(status).json({ success: false, error });
    }

    const updates = req.body;
    if (updates.id) delete updates.id;
    if (updates._id) delete updates._id;

    // Role-based task approval control
    if (updates.approvalStatus && (updates.approvalStatus === 'approved' || updates.approvalStatus === 'changes_requested')) {
      const allowedRoles = ['founder', 'co_founder', 'tech_lead'];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Only founder, co-founder, or tech lead can approve or request changes on tasks.' 
        });
      }
      
      if (updates.approvalStatus === 'approved' && task.assigneeId && task.assigneeId.toString() === req.user._id.toString()) {
        if (req.user.role === 'tech_lead') {
          return res.status(403).json({ 
            success: false, 
            error: 'You cannot approve a task assigned to yourself.' 
          });
        }
      }
    }

    // Handle assigneeId email mapping if updated
    if (updates.assigneeId && typeof updates.assigneeId === 'string' && updates.assigneeId.includes('@')) {
      const assigneeUser = await User.findOne({ email: updates.assigneeId.toLowerCase() });
      if (assigneeUser) {
        updates.assigneeId = assigneeUser._id;
      } else {
        updates.assigneeId = null;
      }
    }

    Object.assign(task, updates);
    await task.save();

    res.json({ success: true, task: formatTask(task) });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error } = await checkTaskAccess(id, req.user);
    if (error) {
      return res.status(status).json({ success: false, error });
    }

    await Task.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, authorName, authorRole } = req.body;

    const { status, error, task } = await checkTaskAccess(id, req.user);
    if (error) {
      return res.status(status).json({ success: false, error });
    }

    task.comments.push({
      authorId: req.user._id,
      authorName: authorName || req.user.name,
      authorRole: authorRole || req.user.role,
      text,
      createdAt: new Date()
    });

    await task.save();
    res.json({ success: true, task: formatTask(task) });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tasks/:id/subtasks
router.post('/:id/subtasks', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const { status, error, task } = await checkTaskAccess(id, req.user);
    if (error) {
      return res.status(status).json({ success: false, error });
    }

    task.subtasks.push({
      title,
      completed: false
    });

    // Recalculate progress
    const completedCount = task.subtasks.filter(s => s.completed).length;
    task.progress = task.subtasks.length > 0 ? Math.round((completedCount / task.subtasks.length) * 100) : 0;

    await task.save();
    res.json({ success: true, task: formatTask(task) });
  } catch (error) {
    console.error('Add subtask error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tasks/:id/subtasks/:subtaskId
router.put('/:id/subtasks/:subtaskId', auth, async (req, res) => {
  try {
    const { id, subtaskId } = req.params;

    const { status, error, task } = await checkTaskAccess(id, req.user);
    if (error) {
      return res.status(status).json({ success: false, error });
    }

    let subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({ success: false, error: 'Subtask not found.' });
    }

    subtask.completed = !subtask.completed;

    // Recalculate progress
    const completedCount = task.subtasks.filter(s => s.completed).length;
    task.progress = task.subtasks.length > 0 ? Math.round((completedCount / task.subtasks.length) * 100) : 0;

    await task.save();
    res.json({ success: true, task: formatTask(task) });
  } catch (error) {
    console.error('Toggle subtask error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tasks/:id/subtasks/:subtaskId
router.delete('/:id/subtasks/:subtaskId', auth, async (req, res) => {
  try {
    const { id, subtaskId } = req.params;

    const { status, error, task } = await checkTaskAccess(id, req.user);
    if (error) {
      return res.status(status).json({ success: false, error });
    }

    task.subtasks.pull(subtaskId);

    // Recalculate progress
    const completedCount = task.subtasks.filter(s => s.completed).length;
    task.progress = task.subtasks.length > 0 ? Math.round((completedCount / task.subtasks.length) * 100) : 0;

    await task.save();
    res.json({ success: true, task: formatTask(task) });
  } catch (error) {
    console.error('Delete subtask error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
