const Workspace = require('../models/Workspace');
const { fail } = require('../utils/apiResponse');
const { canAccessWorkspace, canManageWorkspace } = require('../services/workspaceService');

const loadWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return fail(res, 404, 'Workspace not found');
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};

const requireWorkspaceAccess = (req, res, next) => {
  if (!canAccessWorkspace(req.workspace, req.user._id)) {
    return fail(res, 403, 'You do not have access to this workspace');
  }
  next();
};

const requireWorkspaceManage = (req, res, next) => {
  if (!canManageWorkspace(req.workspace, req.user._id)) {
    return fail(res, 403, 'You do not have permission to manage this workspace');
  }
  next();
};

module.exports = {
  loadWorkspace,
  requireWorkspaceAccess,
  requireWorkspaceManage,
};
