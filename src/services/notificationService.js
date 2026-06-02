const Notification = require('../models/Notification');
const User = require('../models/User');
const { getDayBounds } = require('../utils/dateUtils');

const getTaskNotificationRecipient = (task) => {
  return task.assignee || task.createdBy;
};

const createNotifications = async ({
  workspaceId,
  userIds,
  actorId = null,
  type,
  title,
  message,
  entityType = 'system',
  entityId = null,
  metadata = {},
}) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean).map((id) => id.toString()))];

  if (!workspaceId || uniqueUserIds.length === 0) {
    return [];
  }

  const docs = uniqueUserIds.map((userId) => ({
    workspaceId,
    userId,
    actorId,
    type,
    title,
    message,
    entityType,
    entityId,
    metadata,
  }));

  return Notification.insertMany(docs);
};

const notifyTaskAssigned = async ({ task, actorId, assigneeId, previousAssigneeId = null }) => {
  if (!task || !assigneeId) return;

  const assigneeStr = assigneeId.toString();
  if (actorId && actorId.toString() === assigneeStr) return;
  if (previousAssigneeId && previousAssigneeId.toString() === assigneeStr) return;

  await createNotifications({
    workspaceId: task.workspaceId,
    userIds: [assigneeStr],
    actorId,
    type: 'task_assigned',
    title: 'New task assignment',
    message: `You were assigned "${task.title}"`,
    entityType: 'task',
    entityId: task._id,
    metadata: {
      taskId: task._id.toString(),
      projectId: task.projectId ? task.projectId.toString() : null,
    },
  });
};

const notifyTaskDueSignals = async ({ task, actorId, dueDateChanged = false }) => {
  if (!task?.dueDate || task.status === 'done') return;
  if (!dueDateChanged) return;

  const recipientId = getTaskNotificationRecipient(task);
  if (!recipientId) return;

  const now = new Date();
  const { end } = getDayBounds(now);
  const dueAt = new Date(task.dueDate);

  if (Number.isNaN(dueAt.getTime())) return;

  if (dueAt < now) {
    await createNotifications({
      workspaceId: task.workspaceId,
      userIds: [recipientId],
      actorId,
      type: 'task_overdue',
      title: 'Task overdue',
      message: `"${task.title}" is now overdue`,
      entityType: 'task',
      entityId: task._id,
      metadata: {
        taskId: task._id.toString(),
        projectId: task.projectId ? task.projectId.toString() : null,
        dueDate: task.dueDate,
      },
    });
    return;
  }

  if (dueAt <= end) {
    await createNotifications({
      workspaceId: task.workspaceId,
      userIds: [recipientId],
      actorId,
      type: 'task_due_today',
      title: 'Task due today',
      message: `"${task.title}" is due today`,
      entityType: 'task',
      entityId: task._id,
      metadata: {
        taskId: task._id.toString(),
        projectId: task.projectId ? task.projectId.toString() : null,
        dueDate: task.dueDate,
      },
    });
  }
};

const fetchActorMap = async (notifications) => {
  const actorIds = [
    ...new Set(
      notifications
        .filter((item) => item.actorId)
        .map((item) => item.actorId.toString())
    ),
  ];

  if (actorIds.length === 0) {
    return new Map();
  }

  const actors = await User.find({ _id: { $in: actorIds } });
  return new Map(actors.map((actor) => [actor._id.toString(), actor]));
};

module.exports = {
  createNotifications,
  notifyTaskAssigned,
  notifyTaskDueSignals,
  fetchActorMap,
};
