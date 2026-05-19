const Message = require('../models/Message');
const FileModel = require('../models/File');
const { loadWorkspaceForUser } = require('./projectService');
const { getMemberRole } = require('./workspaceService');
const { validateProjectInWorkspace } = require('./taskService');

const canReadMessages = (workspace, userId) => Boolean(getMemberRole(workspace, userId));

const canSendMessage = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role && role !== 'viewer';
};

const isMember = (workspace, userId) => Boolean(getMemberRole(workspace, userId));

const buildChannelFilter = (workspaceId, projectId) => ({
  workspaceId,
  projectId: projectId || null,
  recipientId: null,
});

const buildDmFilter = (workspaceId, projectId, userId, recipientId) => ({
  workspaceId,
  projectId: projectId || null,
  $or: [
    { sender: userId, recipientId },
    { sender: recipientId, recipientId: userId },
  ],
});

const getMessages = async ({
  workspaceId,
  projectId,
  recipientId,
  userId,
  since,
  limit = 100,
}) => {
  const { workspace, error } = await loadWorkspaceForUser(workspaceId, userId);
  if (error) {
    return { error, workspace: null, messages: [] };
  }

  if (!canReadMessages(workspace, userId)) {
    return { error: 'You do not have access to this chat', workspace: null, messages: [] };
  }

  const normalizedProjectId = projectId || null;

  if (normalizedProjectId) {
    const { error: projectError } = await validateProjectInWorkspace(
      normalizedProjectId,
      workspace._id
    );
    if (projectError) {
      return { error: projectError, workspace: null, messages: [] };
    }
  }

  let filter;

  if (recipientId) {
    if (!isMember(workspace, recipientId)) {
      return { error: 'Recipient is not in this workspace', workspace: null, messages: [] };
    }
    if (recipientId.toString() === userId.toString()) {
      return { error: 'Cannot message yourself', workspace: null, messages: [] };
    }
    filter = buildDmFilter(workspace._id, normalizedProjectId, userId, recipientId);
  } else {
    filter = buildChannelFilter(workspace._id, normalizedProjectId);
  }

  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      filter.createdAt = { $gt: sinceDate };
    }
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: 1 })
    .limit(Math.min(limit, 200))
    .populate('sender', 'name email avatar')
    .populate('fileId');

  return { workspace, error: null, messages };
};

const createMessage = async ({
  workspaceId,
  projectId,
  recipientId,
  userId,
  content,
  fileId,
}) => {
  const { workspace, error } = await loadWorkspaceForUser(workspaceId, userId);
  if (error) {
    return { error, message: null, workspace: null };
  }

  if (!canSendMessage(workspace, userId)) {
    return { error: 'You do not have permission to send messages', message: null, workspace };
  }

  const normalizedProjectId = projectId || null;
  const trimmedContent = (content || '').trim();

  if (!trimmedContent && !fileId) {
    return { error: 'Message or file is required', message: null, workspace };
  }

  if (normalizedProjectId) {
    const { error: projectError } = await validateProjectInWorkspace(
      normalizedProjectId,
      workspace._id
    );
    if (projectError) {
      return { error: projectError, message: null, workspace };
    }
  }

  if (recipientId) {
    if (!isMember(workspace, recipientId)) {
      return { error: 'Recipient is not in this workspace', message: null, workspace };
    }
    if (recipientId.toString() === userId.toString()) {
      return { error: 'Cannot message yourself', message: null, workspace };
    }
  }

  let fileDoc = null;
  if (fileId) {
    fileDoc = await FileModel.findById(fileId);
    if (!fileDoc || fileDoc.workspaceId.toString() !== workspace._id.toString()) {
      return { error: 'File not found', message: null, workspace };
    }
  }

  const message = await Message.create({
    workspaceId: workspace._id,
    projectId: normalizedProjectId,
    recipientId: recipientId || null,
    sender: userId,
    content: trimmedContent,
    fileId: fileId || null,
  });

  await message.populate('sender', 'name email avatar');
  if (fileDoc) {
    message.fileId = fileDoc;
  } else if (fileId) {
    await message.populate('fileId');
  }

  return { error: null, message, workspace };
};

module.exports = {
  canReadMessages,
  canSendMessage,
  getMessages,
  createMessage,
};
