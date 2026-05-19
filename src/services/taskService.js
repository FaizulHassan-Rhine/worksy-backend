const Project = require('../models/Project');
const User = require('../models/User');
const { loadWorkspaceForUser } = require('./projectService');
const { getMemberRole, canAccessWorkspace } = require('./workspaceService');

const canCreateTask = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role && role !== 'viewer';
};

const canEditTask = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role && role !== 'viewer';
};

const canDeleteTask = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role === 'owner' || role === 'admin' || role === 'member';
};

const isWorkspaceMember = (workspace, userId) => {
  return canAccessWorkspace(workspace, userId);
};

const validateProjectInWorkspace = async (projectId, workspaceId) => {
  if (!projectId) {
    return { project: null, error: null };
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return { project: null, error: 'Project not found' };
  }
  if (project.workspaceId.toString() !== workspaceId.toString()) {
    return { project: null, error: 'Project does not belong to this workspace' };
  }

  return { project, error: null };
};

const validateAssignee = async (workspace, assigneeId) => {
  if (!assigneeId) {
    return { user: null, error: null };
  }

  const user = await User.findById(assigneeId);
  if (!user) {
    return { user: null, error: 'Assignee not found' };
  }

  if (!isWorkspaceMember(workspace, assigneeId)) {
    return { user: null, error: 'Assignee must be a workspace member' };
  }

  return { user, error: null };
};

const getWorkspaceMemberIds = (workspace) => {
  const ids = new Set([workspace.owner.toString()]);
  workspace.members.forEach((m) => ids.add(m.user.toString()));
  return Array.from(ids);
};

const fetchAssigneeMap = async (tasks) => {
  const assigneeIds = [
    ...new Set(
      tasks
        .filter((t) => t.assignee)
        .map((t) => t.assignee.toString())
    ),
  ];

  if (assigneeIds.length === 0) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: assigneeIds } });
  return new Map(users.map((u) => [u._id.toString(), u]));
};

const formatTasksWithAssignees = (tasks, assigneeMap) => {
  return tasks.map((task) => {
    const assignee = task.assignee ? assigneeMap.get(task.assignee.toString()) : null;
    return task.toSafeObject(assignee);
  });
};

module.exports = {
  loadWorkspaceForUser,
  canCreateTask,
  canEditTask,
  canDeleteTask,
  validateProjectInWorkspace,
  validateAssignee,
  getWorkspaceMemberIds,
  fetchAssigneeMap,
  formatTasksWithAssignees,
};
