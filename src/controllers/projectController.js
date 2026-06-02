const { z } = require('zod');
const Project = require('../models/Project');
const { PROJECT_STATUSES, PROJECT_COLORS } = require('../models/Project');
const { ok, fail } = require('../utils/apiResponse');
const {
  loadWorkspaceForUser,
  canCreateProject,
  canEditProject,
  canDeleteProject,
} = require('../services/projectService');
const { logActivity } = require('../services/activityService');

const runActivityJob = async (job) => {
  try {
    await job();
  } catch (error) {
    console.error('Activity job failed:', error.message);
  }
};

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  description: z.string().trim().max(2000).optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  status: z.enum(PROJECT_STATUSES).optional(),
  color: z.enum(PROJECT_COLORS).optional(),
  icon: z.string().trim().max(50).optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  color: z.enum(PROJECT_COLORS).optional(),
  icon: z.string().trim().max(50).optional(),
});

const createProject = async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const { workspace, error } = await loadWorkspaceForUser(body.workspaceId, req.user._id);

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    if (!canCreateProject(workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to create projects');
    }

    const project = await Project.create({
      title: body.title,
      description: body.description || '',
      workspaceId: workspace._id,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
      status: body.status || 'planning',
      color: body.color || 'blue',
      icon: body.icon || 'folder-kanban',
    });

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: workspace._id,
        actorId: req.user._id,
        action: 'project_created',
        entityType: 'project',
        entityId: project._id,
        title: 'Project created',
        details: project.title,
        metadata: {
          status: project.status,
        },
      });
    });

    return ok(res, { project: project.toSafeObject() }, 'Project created', 201);
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
      return fail(res, 400, 'workspaceId query parameter is required');
    }

    const { workspace, error } = await loadWorkspaceForUser(workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const projects = await Project.find({ workspaceId: workspace._id }).sort({ createdAt: -1 });

    return ok(
      res,
      { projects: projects.map((p) => p.toSafeObject()) },
      'Projects fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getProject = async (req, res) => {
  return ok(res, { project: req.project.toSafeObject() }, 'Project fetched');
};

const updateProject = async (req, res, next) => {
  try {
    if (!canEditProject(req.workspace, req.project, req.user._id)) {
      return fail(res, 403, 'You do not have permission to edit this project');
    }

    const body = updateSchema.parse(req.body);

    if (body.title !== undefined) req.project.title = body.title;
    if (body.description !== undefined) req.project.description = body.description;
    if (body.status !== undefined) req.project.status = body.status;
    if (body.color !== undefined) req.project.color = body.color;
    if (body.icon !== undefined) req.project.icon = body.icon;

    await req.project.save();

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'project_updated',
        entityType: 'project',
        entityId: req.project._id,
        title: 'Project updated',
        details: req.project.title,
        metadata: {
          status: req.project.status,
        },
      });
    });

    return ok(res, { project: req.project.toSafeObject() }, 'Project updated');
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    if (!canDeleteProject(req.workspace, req.project, req.user._id)) {
      return fail(res, 403, 'You do not have permission to delete this project');
    }

    const projectTitle = req.project.title;
    const projectId = req.project._id;
    await req.project.deleteOne();

    await runActivityJob(async () => {
      await logActivity({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'project_deleted',
        entityType: 'project',
        entityId: projectId,
        title: 'Project deleted',
        details: projectTitle,
      });
    });

    return ok(res, null, 'Project deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
