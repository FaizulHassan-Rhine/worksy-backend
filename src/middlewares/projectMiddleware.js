const Project = require('../models/Project');
const { fail } = require('../utils/apiResponse');
const { loadWorkspaceForUser, canEditProject } = require('../services/projectService');

const loadProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return fail(res, 404, 'Project not found');
    }

    const { workspace, error } = await loadWorkspaceForUser(project.workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    req.project = project;
    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};

const requireProjectEdit = (req, res, next) => {
  if (!canEditProject(req.workspace, req.project, req.user._id)) {
    return fail(res, 403, 'You do not have permission to edit this project');
  }
  next();
};

module.exports = { loadProject, requireProjectEdit };
