const Note = require('../models/Note');
const { fail } = require('../utils/apiResponse');
const { loadWorkspaceForUser, canViewNote } = require('../services/noteService');

const loadNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return fail(res, 404, 'Note not found');
    }

    const { workspace, error } = await loadWorkspaceForUser(note.workspaceId, req.user._id);
    if (error) {
      return fail(res, workspace ? 403 : 404, error);
    }

    if (!canViewNote(note, req.user._id)) {
      return fail(res, 403, 'You do not have access to this note');
    }

    req.note = note;
    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { loadNote };
