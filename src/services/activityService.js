const Activity = require('../models/Activity');
const User = require('../models/User');

const logActivity = async ({
  workspaceId,
  actorId,
  action,
  entityType,
  entityId,
  title,
  details = '',
  metadata = {},
}) => {
  if (!workspaceId || !actorId || !action || !entityType || !entityId || !title) {
    return null;
  }

  return Activity.create({
    workspaceId,
    actorId,
    action,
    entityType,
    entityId,
    title,
    details,
    metadata,
  });
};

const fetchActorMap = async (activities) => {
  const actorIds = [
    ...new Set(
      activities
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

const getRecentActivities = async ({ workspaceId, limit = 10 }) => {
  const activities = await Activity.find({ workspaceId }).sort({ createdAt: -1 }).limit(limit);
  const actorMap = await fetchActorMap(activities);

  return activities.map((item) => {
    const actor = actorMap.get(item.actorId.toString()) || null;
    return item.toSafeObject(actor);
  });
};

module.exports = {
  logActivity,
  getRecentActivities,
};
