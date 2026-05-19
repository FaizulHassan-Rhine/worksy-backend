const { z } = require('zod');
const Note = require('../models/Note');
const { NOTE_TYPES } = require('../models/Note');
const { ok, fail } = require('../utils/apiResponse');
const {
  loadWorkspaceForUser,
  validateProjectInWorkspace,
  canCreateNote,
  canViewNote,
  canEditNote,
  canDeleteNote,
  validateNoteTypeFields,
  buildVisibilityFilter,
} = require('../services/noteService');

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().max(50000).optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  type: z.enum(NOTE_TYPES),
  projectId: z.string().optional().nullable(),
  isPrivate: z.boolean().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(50000).optional(),
  isPrivate: z.boolean().optional(),
});

const createNote = async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const { workspace, error } = await loadWorkspaceForUser(body.workspaceId, req.user._id);

    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    if (!canCreateNote(workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to create notes');
    }

    const typeError = validateNoteTypeFields(body.type, body.projectId);
    if (typeError) {
      return fail(res, 400, typeError);
    }

    let project = null;
    if (body.type === 'project') {
      const result = await validateProjectInWorkspace(body.projectId, workspace._id);
      if (result.error) {
        return fail(res, 400, result.error);
      }
      project = result.project;
    }

    const isPrivate =
      body.isPrivate !== undefined
        ? body.isPrivate
        : body.type === 'personal';

    const note = await Note.create({
      title: body.title,
      content: body.content || '',
      type: body.type,
      workspaceId: workspace._id,
      projectId: project?._id || null,
      createdBy: req.user._id,
      isPrivate,
    });

    return ok(res, { note: note.toSafeObject() }, 'Note created', 201);
  } catch (error) {
    next(error);
  }
};

const getNotes = async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
      return fail(res, 400, 'workspaceId query parameter is required');
    }

    const { workspace, error } = await loadWorkspaceForUser(workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    const filter = {
      workspaceId: workspace._id,
      ...buildVisibilityFilter(req.user._id),
    };

    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }
    if (req.query.type && NOTE_TYPES.includes(req.query.type)) {
      filter.type = req.query.type;
    }

    const notes = await Note.find(filter).sort({ updatedAt: -1 });

    return ok(
      res,
      { notes: notes.map((n) => n.toSafeObject()) },
      'Notes fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getNote = async (req, res) => {
  return ok(res, { note: req.note.toSafeObject() }, 'Note fetched');
};

const updateNote = async (req, res, next) => {
  try {
    if (!canEditNote(req.workspace, req.note, req.user._id)) {
      return fail(res, 403, 'You do not have permission to edit this note');
    }

    const body = updateSchema.parse(req.body);

    if (body.title !== undefined) req.note.title = body.title;
    if (body.content !== undefined) req.note.content = body.content;
    if (body.isPrivate !== undefined) req.note.isPrivate = body.isPrivate;

    await req.note.save();

    return ok(res, { note: req.note.toSafeObject() }, 'Note updated');
  } catch (error) {
    next(error);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    if (!canDeleteNote(req.workspace, req.note, req.user._id)) {
      return fail(res, 403, 'You do not have permission to delete this note');
    }

    await req.note.deleteOne();

    return ok(res, null, 'Note deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};
