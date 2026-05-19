const Task = require('../models/Task');
const Project = require('../models/Project');
const Note = require('../models/Note');
const FileModel = require('../models/File');
const { ok, fail } = require('../utils/apiResponse');
const { getDayBounds } = require('../utils/dateUtils');
const { loadWorkspaceForUser } = require('../services/projectService');
const { buildVisibilityFilter } = require('../services/noteService');

const getDashboardStats = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
      return fail(res, 400, 'workspaceId query parameter is required');
    }

    const { workspace, error } = await loadWorkspaceForUser(workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const { start, end } = getDayBounds();
    const noteFilter = {
      workspaceId: workspace._id,
      ...buildVisibilityFilter(req.user._id),
    };

    const [tasks, projects, notes, files] = await Promise.all([
      Task.find({ workspaceId: workspace._id }),
      Project.find({ workspaceId: workspace._id }),
      Note.find(noteFilter).sort({ updatedAt: -1 }).limit(5),
      FileModel.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(5),
    ]);

    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const pendingTasks = tasks.filter((t) => t.status !== 'done').length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'done' && t.dueDate && t.dueDate < start
    ).length;
    const todayTasks = tasks.filter(
      (t) =>
        t.status !== 'done' &&
        t.dueDate &&
        t.dueDate >= start &&
        t.dueDate <= end
    ).length;
    const activeProjects = projects.filter(
      (p) => p.status === 'active' || p.status === 'planning'
    ).length;

    return ok(
      res,
      {
        stats: {
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          overdueTasks,
          todayTasks,
          activeProjects,
          totalProjects: projects.length,
          totalNotes: await Note.countDocuments(noteFilter),
          totalFiles: await FileModel.countDocuments({ workspaceId: workspace._id }),
        },
        recentNotes: notes.map((n) => n.toSafeObject()),
        recentFiles: files.map((f) => f.toSafeObject()),
      },
      'Dashboard stats fetched'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
