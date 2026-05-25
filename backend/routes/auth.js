const express = require('express');
const router = express.Router();
const { signup, login, logout, refreshToken, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', auth, logout);
router.post('/refresh-token', refreshToken);
router.get('/me', auth, getMe);

// Account recovery
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

module.exports = router;
