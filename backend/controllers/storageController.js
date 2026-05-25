const File = require('../models/File');
const User = require('../models/User');
const constants = require('../config/constants');

// @desc    Get storage usage summary
// @route   GET /api/storage
exports.getStorageUsage = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    // Calculate actual storage from files
    const actualUsage = await File.aggregate([
      { $match: { owner: user._id, isTrashed: false } },
      { $group: { _id: null, totalSize: { $sum: '$size' }, totalFiles: { $sum: 1 } } },
    ]);

    const totalUsed = actualUsage[0]?.totalSize || 0;
    const totalFiles = actualUsage[0]?.totalFiles || 0;

    // Trash size
    const trashUsage = await File.aggregate([
      { $match: { owner: user._id, isTrashed: true } },
      { $group: { _id: null, totalSize: { $sum: '$size' }, totalFiles: { $sum: 1 } } },
    ]);

    const trashSize = trashUsage[0]?.totalSize || 0;
    const trashFiles = trashUsage[0]?.totalFiles || 0;

    res.json({
      used: totalUsed,
      limit: user.storageLimit,
      percentage: Math.round((totalUsed / user.storageLimit) * 100),
      totalFiles,
      trash: {
        size: trashSize,
        files: trashFiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get storage breakdown by file type
// @route   GET /api/storage/breakdown
exports.getStorageBreakdown = async (req, res, next) => {
  try {
    const files = await File.find({ owner: req.userId, isTrashed: false })
      .select('mimeType size')
      .lean();

    const breakdown = {
      images: { size: 0, count: 0 },
      videos: { size: 0, count: 0 },
      audio: { size: 0, count: 0 },
      documents: { size: 0, count: 0 },
      code: { size: 0, count: 0 },
      archives: { size: 0, count: 0 },
      other: { size: 0, count: 0 },
    };

    files.forEach((file) => {
      const category = constants.getFileCategory(file.mimeType);
      if (breakdown[category]) {
        breakdown[category].size += file.size;
        breakdown[category].count += 1;
      }
    });

    res.json({ breakdown });
  } catch (error) {
    next(error);
  }
};
