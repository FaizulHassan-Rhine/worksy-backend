const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { loadNote } = require('../middlewares/noteMiddleware');
const { canEditNote } = require('../services/noteService');
const { fail } = require('../utils/apiResponse');
const {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');

const router = express.Router();

const requireNoteEdit = (req, res, next) => {
  if (!canEditNote(req.workspace, req.note, req.user._id)) {
    return fail(res, 403, 'You do not have permission to edit this note');
  }
  next();
};

router.use(protect);

router.route('/').get(getNotes).post(createNote);

router
  .route('/:id')
  .get(loadNote, getNote)
  .patch(loadNote, requireNoteEdit, updateNote)
  .delete(loadNote, requireNoteEdit, deleteNote);

module.exports = router;
