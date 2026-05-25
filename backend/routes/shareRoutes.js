const express = require('express');
const { createLink, revokeLink, getPublicFileInfo, downloadPublicFile, shareInternal, revokeInternal, getItemShares, getSharedWithMe } = require('../controllers/shareController');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for public routes to prevent brute forcing passwords
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Authenticated routes for managing links
router.post('/link/:fileId', auth, createLink);
router.delete('/link/:fileId', auth, revokeLink);

// Internal sharing routes
router.get('/shared-with-me', auth, getSharedWithMe);
router.post('/internal', auth, shareInternal);
router.delete('/internal/:shareId', auth, revokeInternal);
router.get('/internal/:itemType/:itemId', auth, getItemShares);

// Public unauthenticated routes
router.get('/:linkId', publicRateLimiter, getPublicFileInfo);
router.post('/:linkId/download', publicRateLimiter, downloadPublicFile);

module.exports = router;
