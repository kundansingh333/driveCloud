const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ResetToken = require('../models/ResetToken');
const sendEmail = require('../utils/sendEmail');

// @desc    Register new user
// @route   POST /api/auth/signup
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'signup',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Account created successfully.',
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token (keep max 5)
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    user.lastLogin = new Date();
    await user.save();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'login',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      ipAddress: req.ip,
    });

    res.json({
      message: 'Login successful.',
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await User.findByIdAndUpdate(req.userId, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const tokenExists = user.refreshTokens.some((t) => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({ message: 'Refresh token not recognized.' });
    }

    // Remove old token and generate new pair
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);

    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 200 anyway to prevent email enumeration
      return res.json({ message: 'If an account exists, a reset link has been generated.', simulatedToken: null });
    }

    // Delete any existing tokens for this user
    await ResetToken.deleteMany({ user: user._id });

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    await ResetToken.create({ user: user._id, token });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    
    // Send email (sendEmail utility will handle Ethereal fallback if custom SMTP fails)
    await sendEmail({
      email: user.email,
      subject: 'DriveCloud - Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the button below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    });
    
    res.json({ message: 'If an account exists, a reset link has been emailed.', simulatedToken: null });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const resetToken = await ResetToken.findOne({ token }).populate('user');
    if (!resetToken || !resetToken.user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update user password
    const user = resetToken.user;
    user.password = password;
    
    // Clear all existing sessions/refresh tokens for security
    user.refreshTokens = [];
    await user.save();

    // Delete token
    await ResetToken.findByIdAndDelete(resetToken._id);

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      ipAddress: req.ip,
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
