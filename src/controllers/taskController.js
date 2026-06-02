const { z } = require('zod');
const Task = require('../models/Task');
const User = require('../models/User');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../models/Task');
const { ok, fail } = require('../utils/apiResponse');
const { getDayBounds } = require('../utils/dateUtils');
const {
  loadWorkspaceForUser,
  canCreateTask,
  canEditTask,
  canDeleteTask,
  validateProjectInWorkspace,
  validateAssignee,
  fetchAssigneeMap,
  formatTasksWithAssignees,
} = require('../services/taskService');
const { notifyTaskAssigned, notifyTaskDueSignals } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');

const checklistItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  completed: z.boolean().optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  projectId: z.string().optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().optional().nullable(),
  assignee: z.string().optional().nullable(),
  labels: z.array(z.string().trim().max(50)).max(20).optional(),
  checklist: z.array(checklistItemSchema).max(50).optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().optional().nullable(),
  assignee: z.string().optional().nullable(),
  labels: z.array(z.string().trim().max(50)).max(20).optional(),
  checklist: z.array(checklistItemSchema).max(50).optional(),
  projectId: z.string().optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

const assignSchema = z.object({
  assignee: z.string().optional().nullable(),
});

const runNotificationJob = async (job) => {
  try {
    await job();
  } catch (error) {
    console.error('Notification job failed:', error.message);
  }
};

const runActivityJob = async (job) => {
  try {
    await job();
  } catch (error) {
    console.error('Activity job failed:', error.message);
  }
};

const buildTaskFilter = (query, workspaceId) => {
  const filter = { workspaceId };

  if (query.projectId) {
    filter.projectId = query.projectId;
  }
  if (query.status && TASK_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }
  if (query.priority && TASK_PRIORITIES.includes(query.priority)) {
    filter.priority = query.priority;
  }

  return filter;
};

const createTask = async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const { workspace, error } = await loadWorkspaceForUser(body.workspaceId, req.user._id);

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    if (!canCreateTask(workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to create tasks');
    }

    const { project, error: projectError } = await validateProjectInWorkspace(
      body.projectId,
      workspace._id
    );
    if (projectError) {
      return fail(res, 400, projectError);
    }

    const { user: assigneeUser, error: assigneeError } = await validateAssignee(
      workspace,
      body.assignee
    );
    if (assigneeError) {
      return fail(res, 400, assigneeError);
    }

    const task = await Task.create({
      title: body.title,
      description: body.description || '',
      workspaceId: workspace._id,
      projectId: project?._id || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignee: assigneeUser?._id || null,
      labels: body.labels || [],
      checklist: body.checklist || [],
      createdBy: req.user._id,
    });

    await runNotificationJob(async () => {
      if (assigneeUser?._id) {
        await notifyTaskAssigned({
          task,
          actorId: req.user._id,
          assigneeId: assigneeUser._id,
        });
      }
      await notifyTaskDueSignals({
        task,
        actorId: req.user._id,
        dueDateChanged: Boolean(body.dueDate),
      });
    });

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: workspace._id,
        actorId: req.user._id,
        action: 'task_created',
        entityType: 'task',
        entityId: task._id,
        title: 'Task created',
        details: task.title,
        metadata: {
          projectId: task.projectId ? task.projectId.toString() : null,
          status: task.status,
          priority: task.priority,
        },
      });
    });

    return ok(res, { task: task.toSafeObject(assigneeUser) }, 'Task created', 201);
  } catch (error) {
    next(error);
  }
};

const getTodayTasks = async (req, res, next) => {
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
    const baseFilter = {
      workspaceId: workspace._id,
      status: { $ne: 'done' },
    };

    if (req.query.priority && TASK_PRIORITIES.includes(req.query.priority)) {
      baseFilter.priority = req.query.priority;
    }

    const [overdueTasks, todayTasks, upcomingTasks] = await Promise.all([
      Task.find({
        ...baseFilter,
        dueDate: { $ne: null, $lt: start },
      }).sort({ dueDate: 1, priority: -1 }),
      Task.find({
        ...baseFilter,
        dueDate: { $gte: start, $lte: end },
      }).sort({ priority: -1, createdAt: -1 }),
      Task.find({
        ...baseFilter,
        dueDate: { $gt: end },
      }).sort({ dueDate: 1, priority: -1 }),
    ]);

    const allTasks = [...overdueTasks, ...todayTasks, ...upcomingTasks];
    const assigneeMap = await fetchAssigneeMap(allTasks);

    return ok(
      res,
      {
        overdue: formatTasksWithAssignees(overdueTasks, assigneeMap),
        today: formatTasksWithAssignees(todayTasks, assigneeMap),
        upcoming: formatTasksWithAssignees(upcomingTasks, assigneeMap),
      },
      'Daily tasks fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
      return fail(res, 400, 'workspaceId query parameter is required');
    }

    const { workspace, error } = await loadWorkspaceForUser(workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const filter = buildTaskFilter(req.query, workspace._id);
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    const assigneeMap = await fetchAssigneeMap(tasks);

    return ok(
      res,
      { tasks: formatTasksWithAssignees(tasks, assigneeMap) },
      'Tasks fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    let assigneeUser = null;
    if (req.task.assignee) {
      assigneeUser = await User.findById(req.task.assignee);
    }

    return ok(res, { task: req.task.toSafeObject(assigneeUser) }, 'Task fetched');
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    if (!canEditTask(req.workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to edit this task');
    }

    const body = updateSchema.parse(req.body);

    const previousAssigneeId = req.task.assignee;
    const previousDueDate = req.task.dueDate;

    if (body.projectId !== undefined) {
      const { error: projectError } = await validateProjectInWorkspace(
        body.projectId,
        req.workspace._id
      );
      if (projectError) {
        return fail(res, 400, projectError);
      }
      req.task.projectId = body.projectId || null;
    }

    if (body.assignee !== undefined) {
      const { user: assigneeUser, error: assigneeError } = await validateAssignee(
        req.workspace,
        body.assignee
      );
      if (assigneeError) {
        return fail(res, 400, assigneeError);
      }
      req.task.assignee = assigneeUser?._id || null;
    }

    if (body.title !== undefined) req.task.title = body.title;
    if (body.description !== undefined) req.task.description = body.description;
    if (body.status !== undefined) req.task.status = body.status;
    if (body.priority !== undefined) req.task.priority = body.priority;
    if (body.dueDate !== undefined) {
      req.task.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.labels !== undefined) req.task.labels = body.labels;
    if (body.checklist !== undefined) {
      req.task.checklist = body.checklist.map((item) => ({
        text: item.text,
        completed: item.completed ?? false,
      }));
    }

    await req.task.save();

    await runNotificationJob(async () => {
      const assigneeChanged = body.assignee !== undefined;
      if (assigneeChanged && req.task.assignee) {
        await notifyTaskAssigned({
          task: req.task,
          actorId: req.user._id,
          assigneeId: req.task.assignee,
          previousAssigneeId,
        });
      }

      const dueDateChanged =
        body.dueDate !== undefined &&
        String(previousDueDate || '') !== String(req.task.dueDate || '');

      await notifyTaskDueSignals({
        task: req.task,
        actorId: req.user._id,
        dueDateChanged,
      });
    });

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'task_updated',
        entityType: 'task',
        entityId: req.task._id,
        title: 'Task updated',
        details: req.task.title,
        metadata: {
          status: req.task.status,
          priority: req.task.priority,
          projectId: req.task.projectId ? req.task.projectId.toString() : null,
        },
      });
    });

    let assigneeUser = null;
    if (req.task.assignee) {
      assigneeUser = await User.findById(req.task.assignee);
    }

    return ok(res, { task: req.task.toSafeObject(assigneeUser) }, 'Task updated');
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    if (!canEditTask(req.workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to edit this task');
    }

    const { status } = statusSchema.parse(req.body);
    const previousStatus = req.task.status;
    req.task.status = status;
    await req.task.save();

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'task_status_changed',
        entityType: 'task',
        entityId: req.task._id,
        title: 'Task status updated',
        details: `${req.task.title}: ${previousStatus} -> ${status}`,
        metadata: {
          previousStatus,
          status,
          projectId: req.task.projectId ? req.task.projectId.toString() : null,
        },
      });
    });

    let assigneeUser = null;
    if (req.task.assignee) {
      assigneeUser = await User.findById(req.task.assignee);
    }

    return ok(res, { task: req.task.toSafeObject(assigneeUser) }, 'Task status updated');
  } catch (error) {
    next(error);
  }
};

const assignTask = async (req, res, next) => {
  try {
    if (!canEditTask(req.workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to assign this task');
    }

    const { assignee } = assignSchema.parse(req.body);
    const { user: assigneeUser, error: assigneeError } = await validateAssignee(
      req.workspace,
      assignee
    );
    if (assigneeError) {
      return fail(res, 400, assigneeError);
    }

    const previousAssigneeId = req.task.assignee;
    req.task.assignee = assigneeUser?._id || null;
    await req.task.save();

    await runNotificationJob(async () => {
      if (req.task.assignee) {
        await notifyTaskAssigned({
          task: req.task,
          actorId: req.user._id,
          assigneeId: req.task.assignee,
          previousAssigneeId,
        });
      }
    });

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'task_assigned',
        entityType: 'task',
        entityId: req.task._id,
        title: 'Task assigned',
        details: req.task.title,
        metadata: {
          assigneeId: req.task.assignee ? req.task.assignee.toString() : null,
          projectId: req.task.projectId ? req.task.projectId.toString() : null,
        },
      });
    });

    return ok(res, { task: req.task.toSafeObject(assigneeUser) }, 'Task assigned');
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    if (!canDeleteTask(req.workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to delete this task');
    }

    const taskTitle = req.task.title;
    const taskId = req.task._id;
    const projectId = req.task.projectId;

    await req.task.deleteOne();

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'task_deleted',
        entityType: 'task',
        entityId: taskId,
        title: 'Task deleted',
        details: taskTitle,
        metadata: {
          projectId: projectId ? projectId.toString() : null,
        },
      });
    });

    return ok(res, null, 'Task deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTodayTasks,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
};
