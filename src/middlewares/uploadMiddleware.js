const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { fail } = require('../utils/apiResponse');
const {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ensureUploadDir,
} = require('../config/upload');

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 400, 'File size exceeds 10MB limit');
    }
    if (err.message === 'File type not allowed') {
      return fail(res, 400, err.message);
    }
    return fail(res, 400, err.message || 'File upload failed');
  });
};

module.exports = { handleUpload };
