const { z } = require('zod');
const Notification = require('../models/Notification');
const { ok, fail } = require('../utils/apiResponse');
const { loadWorkspaceForUser } = require('../services/projectService');
const { fetchActorMap } = require('../services/notificationService');

const querySchema = z.object({
  workspaceId: z.string().optional(),
  cursor: z.string().optional(),
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

const readAllSchema = z.object({
  workspaceId: z.string().optional(),
});

const getNotifications = async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);

    let workspace = null;
    if (query.workspaceId) {
      const loaded = await loadWorkspaceForUser(query.workspaceId, req.user._id);
      if (loaded.error) {
        return fail(res, loaded.workspace ? 403 : 404, loaded.error);
      }
      workspace = loaded.workspace;
    }

    const filter = {
      userId: req.user._id,
    };

    if (workspace) {
      filter.workspaceId = workspace._id;
    }

    if (query.unreadOnly) {
      filter.isRead = false;
    }

    if (query.cursor) {
      const cursorDate = new Date(query.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        filter.createdAt = { $lt: cursorDate };
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit + 1);

    const hasMore = notifications.length > query.limit;
    const slice = hasMore ? notifications.slice(0, query.limit) : notifications;

    const actorMap = await fetchActorMap(slice);
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      ...(workspace ? { workspaceId: workspace._id } : {}),
      isRead: false,
    });

    const items = slice.map((item) => {
      const actor = item.actorId ? actorMap.get(item.actorId.toString()) : null;
      return item.toSafeObject(actor);
    });

    return ok(
      res,
      {
        notifications: items,
        unreadCount,
        nextCursor: hasMore ? slice[slice.length - 1].createdAt.toISOString() : null,
      },
      'Notifications fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;
    let workspace = null;

    if (workspaceId) {
      const loaded = await loadWorkspaceForUser(workspaceId, req.user._id);
      if (loaded.error) {
        return fail(res, loaded.workspace ? 403 : 404, loaded.error);
      }
      workspace = loaded.workspace;
    }

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      ...(workspace ? { workspaceId: workspace._id } : {}),
      isRead: false,
    });

    return ok(res, { unreadCount }, 'Unread count fetched');
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return fail(res, 404, 'Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return ok(res, { notification: notification.toSafeObject() }, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    const body = readAllSchema.parse(req.body || {});
    let workspace = null;

    if (body.workspaceId) {
      const loaded = await loadWorkspaceForUser(body.workspaceId, req.user._id);
      if (loaded.error) {
        return fail(res, loaded.workspace ? 403 : 404, loaded.error);
      }
      workspace = loaded.workspace;
    }

    const filter = {
      userId: req.user._id,
      isRead: false,
      ...(workspace ? { workspaceId: workspace._id } : {}),
    };

    const result = await Notification.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    return ok(res, { updated: result.modifiedCount }, 'Notifications marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
