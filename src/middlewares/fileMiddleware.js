const FileModel = require('../models/File');
const { fail } = require('../utils/apiResponse');
const { loadWorkspaceForUser } = require('../services/fileService');

const loadFile = async (req, res, next) => {
  try {
    const fileRecord = await FileModel.findById(req.params.id);

    if (!fileRecord) {
      return fail(res, 404, 'File not found');
    }

    const { workspace, error } = await loadWorkspaceForUser(
      fileRecord.workspaceId,
      req.user._id
    );
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    req.fileRecord = fileRecord;
    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { loadFile };
