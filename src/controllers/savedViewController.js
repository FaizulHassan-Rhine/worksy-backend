const { z } = require('zod');
const SavedView = require('../models/SavedView');
const { SAVED_VIEW_MODULES } = require('../models/SavedView');
const { ok, fail } = require('../utils/apiResponse');
const { loadWorkspaceForUser } = require('../services/projectService');

const listQuerySchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId query parameter is required'),
  module: z.enum(SAVED_VIEW_MODULES).default('tasks'),
});

const createSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  module: z.enum(SAVED_VIEW_MODULES).default('tasks'),
  name: z.string().trim().min(1, 'Name is required').max(80),
  filters: z.record(z.any()).optional(),
  display: z.record(z.any()).optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  filters: z.record(z.any()).optional(),
  display: z.record(z.any()).optional(),
});

const getSavedViews = async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { workspace, error } = await loadWorkspaceForUser(query.workspaceId, req.user._id);

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const views = await SavedView.find({
      userId: req.user._id,
      workspaceId: workspace._id,
      module: query.module,
    }).sort({ createdAt: -1 });

    return ok(
      res,
      {
        views: views.map((view) => view.toSafeObject()),
      },
      'Saved views fetched'
    );
  } catch (error) {
    next(error);
  }
};

const createSavedView = async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const { workspace, error } = await loadWorkspaceForUser(body.workspaceId, req.user._id);

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const view = await SavedView.create({
      userId: req.user._id,
      workspaceId: workspace._id,
      module: body.module,
      name: body.name,
      filters: body.filters || {},
      display: body.display || {},
    });

    return ok(res, { view: view.toSafeObject() }, 'Saved view created', 201);
  } catch (error) {
    next(error);
  }
};

const updateSavedView = async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const view = await SavedView.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!view) {
      return fail(res, 404, 'Saved view not found');
    }

    const { workspace, error } = await loadWorkspaceForUser(view.workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    if (body.name !== undefined) view.name = body.name;
    if (body.filters !== undefined) view.filters = body.filters;
    if (body.display !== undefined) view.display = body.display;

    await view.save();

    return ok(res, { view: view.toSafeObject() }, 'Saved view updated');
  } catch (error) {
    next(error);
  }
};

const deleteSavedView = async (req, res, next) => {
  try {
    const view = await SavedView.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!view) {
      return fail(res, 404, 'Saved view not found');
    }

    const { workspace, error } = await loadWorkspaceForUser(view.workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    await view.deleteOne();

    return ok(res, null, 'Saved view deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
};
