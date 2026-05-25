const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createFolder,
  getFolder,
  getFolderContents,
  updateFolder,
  deleteFolder,
  moveFolder,
  restoreFolder,
  getFolderTree,
  getStarredItems,
  getTrashedItems,
  getRecentFiles,
  downloadFolderZip,
} = require('../controllers/folderController');

// All routes require auth
router.use(auth);

// Special routes (must be before :id routes)
router.get('/tree', getFolderTree);
router.get('/starred', getStarredItems);
router.get('/trash', getTrashedItems);
router.get('/recent', getRecentFiles);

router.post('/', createFolder);
router.get('/:id', getFolder);
router.get('/:id/download-zip', downloadFolderZip);
router.get('/:id/contents', getFolderContents);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);
router.post('/:id/move', moveFolder);
router.post('/:id/restore', restoreFolder);

module.exports = router;
