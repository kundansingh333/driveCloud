const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  updatePreferences,
  getActivity,
  changePassword,
} = require('../controllers/userController');

router.use(auth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/preferences', updatePreferences);
router.get('/activity', getActivity);
router.put('/password', changePassword);

module.exports = router;
