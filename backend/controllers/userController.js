const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get user profile
// @route   GET /api/user/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user preferences
// @route   PUT /api/user/preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const { theme, viewMode, sortBy } = req.body;
    const updates = {};
    if (theme) updates['preferences.theme'] = theme;
    if (viewMode) updates['preferences.viewMode'] = viewMode;
    if (sortBy) updates['preferences.sortBy'] = sortBy;

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user activity log
// @route   GET /api/user/activity
exports.getActivity = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await ActivityLog.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ActivityLog.countDocuments({ user: req.userId });

    res.json({
      activities,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/user/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
