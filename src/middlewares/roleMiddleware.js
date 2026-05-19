const { fail } = require('../utils/apiResponse');
const { getMemberRole } = require('../services/workspaceService');

const requireWorkspaceRoles = (...roles) => {
  return (req, res, next) => {
    const role = getMemberRole(req.workspace, req.user._id);
    if (!role || !roles.includes(role)) {
      return fail(res, 403, 'You do not have permission to perform this action');
    }
    next();
  };
};

module.exports = { requireWorkspaceRoles };
