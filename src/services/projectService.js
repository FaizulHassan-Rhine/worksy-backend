const Workspace = require('../models/Workspace');
const { getMemberRole, canAccessWorkspace, canManageWorkspace } = require('./workspaceService');

const loadWorkspaceForUser = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { workspace: null, error: 'Workspace not found' };
  }
  if (!canAccessWorkspace(workspace, userId)) {
    return { workspace: null, error: 'You do not have access to this workspace' };
  }
  return { workspace, error: null };
};

const canCreateProject = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role && role !== 'viewer';
};

const canEditProject = (workspace, project, userId) => {
  if (!canAccessWorkspace(workspace, userId)) return false;
  if (project.createdBy.toString() === userId.toString()) return true;
  return canManageWorkspace(workspace, userId);
};

const canDeleteProject = (workspace, project, userId) => {
  if (project.createdBy.toString() === userId.toString()) return true;
  return getMemberRole(workspace, userId) === 'owner';
};

module.exports = {
  loadWorkspaceForUser,
  canCreateProject,
  canEditProject,
  canDeleteProject,
};
