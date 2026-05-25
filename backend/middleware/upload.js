const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const multerS3 = require('multer-s3');
const { s3Client, bucketName } = require('../services/storageService');

// Ensure local directories exist
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const thumbnailDir = path.join(__dirname, '..', process.env.THUMBNAIL_DIR || 'thumbnails');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });

// Disk storage
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadDir, req.userId.toString());
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// S3 Storage
let s3Storage = null;
if (process.env.STORAGE_PROVIDER === 's3' && s3Client) {
  s3Storage = multerS3({
    s3: s3Client,
    bucket: bucketName,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname, owner: req.userId.toString() });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${req.userId}/${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });
}

// Select storage provider
const storage = process.env.STORAGE_PROVIDER === 's3' ? s3Storage : localStorage;

// File filter
const fileFilter = (req, file, cb) => {
  const blocked = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.dll'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (blocked.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB
    files: 20,
  },
});

module.exports = { upload, uploadDir, thumbnailDir };
