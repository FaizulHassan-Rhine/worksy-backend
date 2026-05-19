const { z } = require('zod');
const FileModel = require('../models/File');
const { ok, fail } = require('../utils/apiResponse');
const { getFileCategory } = require('../config/upload');
const {
  loadWorkspaceForUser,
  canCreateFile,
  canDeleteFile,
  validateFileRelations,
  deleteFileFromDisk,
} = require('../services/fileService');

const uploadMetaSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  projectId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
});

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'No file uploaded');
    }

    const body = uploadMetaSchema.parse(req.body);
    const { workspace, error } = await loadWorkspaceForUser(body.workspaceId, req.user._id);

    if (error) {
      deleteFileFromDisk(req.file.filename);
      return fail(res, workspace ? 403 : 404, error);
    }

    if (!canCreateFile(workspace, req.user._id)) {
      deleteFileFromDisk(req.file.filename);
      return fail(res, 403, 'You do not have permission to upload files');
    }

    const relationError = await validateFileRelations(
      workspace._id,
      body.projectId,
      body.taskId
    );
    if (relationError.error) {
      deleteFileFromDisk(req.file.filename);
      return fail(res, 400, relationError.error);
    }

    const file = await FileModel.create({
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileCategory: getFileCategory(req.file.mimetype),
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      workspaceId: workspace._id,
      projectId: body.projectId || null,
      taskId: body.taskId || null,
      storageKey: req.file.filename,
    });

    return ok(res, { file: file.toSafeObject() }, 'File uploaded', 201);
  } catch (error) {
    if (req.file?.filename) {
      deleteFileFromDisk(req.file.filename);
    }
    next(error);
  }
};

const getFiles = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
      return fail(res, 400, 'workspaceId query parameter is required');
    }

    const { workspace, error } = await loadWorkspaceForUser(workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const filter = { workspaceId: workspace._id };

    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }
    if (req.query.taskId) {
      filter.taskId = req.query.taskId;
    }

    const files = await FileModel.find(filter).sort({ createdAt: -1 });

    return ok(
      res,
      { files: files.map((f) => f.toSafeObject()) },
      'Files fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getFile = async (req, res) => {
  return ok(res, { file: req.fileRecord.toSafeObject() }, 'File fetched');
};

const deleteFile = async (req, res, next) => {
  try {
    if (!canDeleteFile(req.workspace, req.fileRecord, req.user._id)) {
      return fail(res, 403, 'You do not have permission to delete this file');
    }

    deleteFileFromDisk(req.fileRecord.storageKey);
    await req.fileRecord.deleteOne();

    return ok(res, null, 'File deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  getFile,
  deleteFile,
};
