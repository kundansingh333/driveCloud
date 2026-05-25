const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getStorageUsage, getStorageBreakdown } = require('../controllers/storageController');

router.use(auth);

router.get('/', getStorageUsage);
router.get('/breakdown', getStorageBreakdown);

module.exports = router;
