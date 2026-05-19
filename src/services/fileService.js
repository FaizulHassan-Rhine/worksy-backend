const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');
const { loadWorkspaceForUser } = require('./projectService');
const { getMemberRole, canManageWorkspace } = require('./workspaceService');
const { validateProjectInWorkspace } = require('./taskService');
const { UPLOAD_DIR } = require('../config/upload');

const canCreateFile = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role && role !== 'viewer';
};

const canDeleteFile = (workspace, file, userId) => {
  const role = getMemberRole(workspace, userId);
  if (!role || role === 'viewer') return false;
  if (file.uploadedBy.toString() === userId.toString()) return true;
  return canManageWorkspace(workspace, userId);
};

const validateTaskInWorkspace = async (taskId, workspaceId) => {
  if (!taskId) {
    return { task: null, error: null };
  }

  const task = await Task.findById(taskId);
  if (!task) {
    return { task: null, error: 'Task not found' };
  }
  if (task.workspaceId.toString() !== workspaceId.toString()) {
    return { task: null, error: 'Task does not belong to this workspace' };
  }

  return { task, error: null };
};

const validateFileRelations = async (workspaceId, projectId, taskId) => {
  if (projectId) {
    const { error } = await validateProjectInWorkspace(projectId, workspaceId);
    if (error) return { error };
  }

  if (taskId) {
    const { task, error } = await validateTaskInWorkspace(taskId, workspaceId);
    if (error) return { error };
    if (projectId && task?.projectId && task.projectId.toString() !== projectId.toString()) {
      return { error: 'Task does not belong to the selected project' };
    }
  }

  return { error: null };
};

const deleteFileFromDisk = (storageKey) => {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  loadWorkspaceForUser,
  canCreateFile,
  canDeleteFile,
  validateFileRelations,
  deleteFileFromDisk,
};
