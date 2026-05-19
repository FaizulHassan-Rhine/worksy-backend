const { z } = require('zod');
const { ok, fail } = require('../utils/apiResponse');
const { getMessages, createMessage } = require('../services/messageService');

const createSchema = z
  .object({
    workspaceId: z.string().min(1, 'Workspace ID is required'),
    projectId: z.string().optional().nullable(),
    recipientId: z.string().optional().nullable(),
    content: z.string().trim().max(4000).optional().default(''),
    fileId: z.string().optional().nullable(),
  })
  .refine((data) => data.content?.length > 0 || data.fileId, {
    message: 'Message or file is required',
  });

const getMessagesHandler = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;
    const projectId = req.query.projectId || null;
    const recipientId = req.query.recipientId || null;
    const since = req.query.since || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;

    if (!workspaceId) {
      return fail(res, 400, 'workspaceId query parameter is required');
    }

    const { messages, error, workspace } = await getMessages({
      workspaceId,
      projectId: projectId || null,
      recipientId: recipientId || null,
      userId: req.user._id,
      since,
      limit,
    });

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    return ok(
      res,
      {
        messages: messages.map((m) => m.toSafeObject(m.sender, m.fileId)),
      },
      'Messages fetched'
    );
  } catch (error) {
    next(error);
  }
};

const createMessageHandler = async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    const { message, error, workspace } = await createMessage({
      workspaceId: body.workspaceId,
      projectId: body.projectId || null,
      recipientId: body.recipientId || null,
      userId: req.user._id,
      content: body.content || '',
      fileId: body.fileId || null,
    });

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    return ok(
      res,
      { message: message.toSafeObject(message.sender, message.fileId) },
      'Message sent',
      201
    );
  } catch (error) {
    if (error.name === 'ZodError') {
      return fail(res, 400, error.errors[0]?.message || 'Validation failed');
    }
    next(error);
  }
};

module.exports = {
  getMessages: getMessagesHandler,
  createMessage: createMessageHandler,
};
