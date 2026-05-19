const path = require('path');
const fs = require('fs');
const os = require('os');

// Vercel serverless: use /tmp (ephemeral). Local: use project uploads folder.
const UPLOAD_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'worksy-uploads')
  : path.join(__dirname, '../../uploads');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv'
  ) {
    return 'document';
  }
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'other';
};

const ensureUploadDir = () => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn(`Upload directory unavailable: ${error.message}`);
  }
};

module.exports = {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  getFileCategory,
  ensureUploadDir,
};
