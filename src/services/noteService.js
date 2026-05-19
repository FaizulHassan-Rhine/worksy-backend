const { loadWorkspaceForUser } = require('./projectService');
const { getMemberRole, canManageWorkspace } = require('./workspaceService');
const { validateProjectInWorkspace } = require('./taskService');

const canCreateNote = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role && role !== 'viewer';
};

const canViewNote = (note, userId) => {
  if (!note.isPrivate) return true;
  return note.createdBy.toString() === userId.toString();
};

const canEditNote = (workspace, note, userId) => {
  const role = getMemberRole(workspace, userId);
  if (!role || role === 'viewer') return false;
  if (note.createdBy.toString() === userId.toString()) return true;
  return canManageWorkspace(workspace, userId);
};

const canDeleteNote = (workspace, note, userId) => canEditNote(workspace, note, userId);

const validateNoteTypeFields = (type, projectId) => {
  if (type === 'project' && !projectId) {
    return 'Project notes require a projectId';
  }
  if (type !== 'project' && projectId) {
    return 'Only project notes can have a projectId';
  }
  return null;
};

const buildVisibilityFilter = (userId) => ({
  $or: [{ isPrivate: false }, { createdBy: userId }],
});

module.exports = {
  loadWorkspaceForUser,
  validateProjectInWorkspace,
  canCreateNote,
  canViewNote,
  canEditNote,
  canDeleteNote,
  validateNoteTypeFields,
  buildVisibilityFilter,
};
