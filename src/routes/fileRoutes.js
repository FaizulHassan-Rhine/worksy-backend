const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { handleUpload } = require('../middlewares/uploadMiddleware');
const { loadFile } = require('../middlewares/fileMiddleware');
const { canDeleteFile } = require('../services/fileService');
const { fail } = require('../utils/apiResponse');
const {
  uploadFile,
  getFiles,
  getFile,
  deleteFile,
} = require('../controllers/fileController');

const router = express.Router();

const requireFileDelete = (req, res, next) => {
  if (!canDeleteFile(req.workspace, req.fileRecord, req.user._id)) {
    return fail(res, 403, 'You do not have permission to delete this file');
  }
  next();
};

router.use(protect);

router.post('/upload', handleUpload, uploadFile);
router.get('/', getFiles);
router.get('/:id', loadFile, getFile);
router.delete('/:id', loadFile, requireFileDelete, deleteFile);

module.exports = router;
