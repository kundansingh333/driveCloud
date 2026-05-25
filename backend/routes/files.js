const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  uploadFiles,
  getFile,
  downloadFile,
  downloadZip,
  updateFile,
  deleteFile,
  copyFile,
  moveFile,
  restoreFile,
  getThumbnail,
  getFileContent,
  serveFile,
  emptyTrash,
} = require('../controllers/fileController');

// All routes require auth
router.use(auth);

router.post('/upload', uploadLimiter, upload.array('files', 20), uploadFiles);
router.post('/download-zip', downloadZip);
router.delete('/trash/empty', emptyTrash);

router.get('/:id', getFile);
router.get('/:id/download', downloadFile);
router.get('/:id/thumbnail', getThumbnail);
router.get('/:id/content', getFileContent);
router.get('/:id/serve', serveFile);
router.put('/:id', updateFile);
router.delete('/:id', deleteFile);
router.post('/:id/copy', copyFile);
router.post('/:id/move', moveFile);
router.post('/:id/restore', restoreFile);

module.exports = router;
