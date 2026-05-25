const File = require('../models/File');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getFileStream } = require('../services/storageService');
const { isImage, isTextFile } = require('../utils/fileHelpers');
const path = require('path');
const fs = require('fs');
const Share = require('../models/Share');
const User = require('../models/User');
const Folder = require('../models/Folder');
const sendEmail = require('../utils/sendEmail');

// @desc    Create or update a public share link for a file
// @route   POST /api/share/link/:fileId
exports.createLink = async (req, res, next) => {
  try {
    const { password, expiresAt } = req.body;
    const file = await File.findOne({ _id: req.params.fileId, owner: req.userId });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.isPublic = true;
    if (!file.publicLink) {
      file.publicLink = uuidv4();
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      file.publicPassword = await bcrypt.hash(password, salt);
    } else if (password === '') {
      // Clear password if explicitly sent as empty string
      file.publicPassword = null;
    }

    if (expiresAt) {
      file.publicExpiresAt = new Date(expiresAt);
    } else if (expiresAt === null) {
      file.publicExpiresAt = null;
    }

    await file.save();

    res.json({
      message: 'Share link generated successfully',
      link: file.publicLink,
      isPasswordProtected: !!file.publicPassword,
      expiresAt: file.publicExpiresAt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke public share link
// @route   DELETE /api/share/link/:fileId
exports.revokeLink = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, owner: req.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.isPublic = false;
    file.publicLink = undefined;
    file.publicPassword = undefined;
    file.publicExpiresAt = undefined;
    await file.save();

    res.json({ message: 'Share link revoked successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public file info (unauthenticated)
// @route   GET /api/share/:linkId
exports.getPublicFileInfo = async (req, res, next) => {
  try {
    const file = await File.findOne({ publicLink: req.params.linkId, isPublic: true, isTrashed: false });
    if (!file) return res.status(404).json({ message: 'File not found or link revoked' });

    if (file.publicExpiresAt && new Date() > file.publicExpiresAt) {
      return res.status(403).json({ message: 'This share link has expired' });
    }

    res.json({
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      isPasswordProtected: !!file.publicPassword,
      expiresAt: file.publicExpiresAt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download/serve a public file (unauthenticated)
// @route   POST /api/share/:linkId/download
exports.downloadPublicFile = async (req, res, next) => {
  try {
    const { password } = req.body;
    const file = await File.findOne({ publicLink: req.params.linkId, isPublic: true, isTrashed: false });
    if (!file) return res.status(404).json({ message: 'File not found or link revoked' });

    if (file.publicExpiresAt && new Date() > file.publicExpiresAt) {
      return res.status(403).json({ message: 'This share link has expired' });
    }

    if (file.publicPassword) {
      if (!password) return res.status(401).json({ message: 'Password is required to access this file' });
      const isMatch = await bcrypt.compare(password, file.publicPassword);
      if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    
    const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// --- Internal Sharing ---

// @desc    Share item with another registered user
// @route   POST /api/share/internal
exports.shareInternal = async (req, res, next) => {
  try {
    const { itemType, itemId, email, permission } = req.body;
    
    if (!['file', 'folder'].includes(itemType)) return res.status(400).json({ message: 'Invalid item type' });
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser._id.toString() === req.userId.toString()) return res.status(400).json({ message: 'Cannot share with yourself' });

    // Verify ownership
    if (itemType === 'file') {
      const file = await File.findOne({ _id: itemId, owner: req.userId });
      if (!file) return res.status(404).json({ message: 'File not found' });
    } else {
      const folder = await Folder.findOne({ _id: itemId, owner: req.userId });
      if (!folder) return res.status(404).json({ message: 'Folder not found' });
    }

    const shareData = {
      itemType,
      fileId: itemType === 'file' ? itemId : null,
      folderId: itemType === 'folder' ? itemId : null,
      sharedBy: req.userId,
      sharedWith: targetUser._id,
    };

    const existingShare = await Share.findOne(shareData);
    if (existingShare) {
      existingShare.permission = permission || 'viewer';
      await existingShare.save();
      return res.json({ message: 'Share updated', share: existingShare });
    }

    shareData.permission = permission || 'viewer';
    const newShare = await Share.create(shareData);

    // Prepare email notification
    const senderUser = await User.findById(req.userId);
    const itemName = itemType === 'file' ? (await File.findById(itemId)).originalName : (await Folder.findById(itemId)).name;
    const sharedUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared`;

    await sendEmail({
      email: targetUser.email,
      subject: `DriveCloud - ${senderUser.name} shared a ${itemType} with you`,
      html: `
        <h2>New Shared Item</h2>
        <p>Hello ${targetUser.name},</p>
        <p><strong>${senderUser.name}</strong> (${senderUser.email}) has shared a ${itemType} with you on DriveCloud.</p>
        <p><strong>Name:</strong> ${itemName}</p>
        <p><strong>Permission:</strong> ${permission || 'Viewer'}</p>
        <br/>
        <a href="${sharedUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:5px;">View Shared Items</a>
      `
    });

    res.status(201).json({ message: 'Item shared successfully', share: newShare });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke internal share
// @route   DELETE /api/share/internal/:shareId
exports.revokeInternal = async (req, res, next) => {
  try {
    const share = await Share.findOne({ _id: req.params.shareId, sharedBy: req.userId });
    if (!share) return res.status(404).json({ message: 'Share record not found' });

    await Share.findByIdAndDelete(share._id);
    res.json({ message: 'Access revoked' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users an item is shared with
// @route   GET /api/share/internal/:itemType/:itemId
exports.getItemShares = async (req, res, next) => {
  try {
    const { itemType, itemId } = req.params;
    const shares = await Share.find({
      itemType,
      [itemType === 'file' ? 'fileId' : 'folderId']: itemId,
      sharedBy: req.userId
    }).populate('sharedWith', 'name email avatar');

    res.json({ shares });
  } catch (error) {
    next(error);
  }
};

// @desc    Get items shared with me
// @route   GET /api/share/shared-with-me
exports.getSharedWithMe = async (req, res, next) => {
  try {
    const shares = await Share.find({ sharedWith: req.userId })
      .populate('sharedBy', 'name email')
      .populate('fileId')
      .populate('folderId');

    const files = shares.filter(s => s.itemType === 'file' && s.fileId && !s.fileId.isTrashed).map(s => ({ ...s.fileId.toObject(), sharedBy: s.sharedBy, sharePermission: s.permission }));
    const folders = shares.filter(s => s.itemType === 'folder' && s.folderId && !s.folderId.isTrashed).map(s => ({ ...s.folderId.toObject(), sharedBy: s.sharedBy, sharePermission: s.permission }));

    res.json({ files, folders });
  } catch (error) {
    next(error);
  }
};
