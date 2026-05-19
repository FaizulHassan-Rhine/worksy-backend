const Task = require('../models/Task');
const { fail } = require('../utils/apiResponse');
const { loadWorkspaceForUser, canEditTask } = require('../services/taskService');

const loadTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return fail(res, 404, 'Task not found');
    }

    const { workspace, error } = await loadWorkspaceForUser(task.workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    req.task = task;
    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};

const requireTaskEdit = (req, res, next) => {
  if (!canEditTask(req.workspace, req.user._id)) {
    return fail(res, 403, 'You do not have permission to edit this task');
  }
  next();
};

module.exports = { loadTask, requireTaskEdit };
