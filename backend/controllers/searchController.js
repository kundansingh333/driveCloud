const File = require('../models/File');
const Folder = require('../models/Folder');

// @desc    Search files and folders
// @route   GET /api/search
exports.search = async (req, res, next) => {
  try {
    const { q, type, sort = 'date_newest', dateFrom, dateTo, minSize, maxSize } = req.query;

    if (!q && !type && !req.query.tags) {
      return res.status(400).json({ message: 'Search query, type, or tags are required.' });
    }

    // Build file query
    const fileQuery = {
      owner: req.userId,
      isTrashed: false,
    };

    // Text search or regex
    if (q && q.trim().length > 0) {
      if (q.length >= 3) {
        fileQuery.$text = { $search: q };
      } else {
        fileQuery.name = { $regex: q, $options: 'i' };
      }
    }

    // Type filter
    if (type) {
      const constants = require('../config/constants');
      const typeKey = type.toUpperCase();
      if (constants.FILE_TYPES[typeKey]) {
        fileQuery.mimeType = { $in: constants.FILE_TYPES[typeKey] };
      }
    }

    // Tag filter
    if (req.query.tags) {
      const tagArray = req.query.tags.split(',').map((t) => t.trim().toLowerCase());
      fileQuery.tags = { $in: tagArray };
    }

    // Date filter
    if (dateFrom || dateTo) {
      fileQuery.updatedAt = {};
      if (dateFrom) fileQuery.updatedAt.$gte = new Date(dateFrom);
      if (dateTo) fileQuery.updatedAt.$lte = new Date(dateTo);
    }

    // Size filter
    if (minSize || maxSize) {
      fileQuery.size = {};
      if (minSize) fileQuery.size.$gte = parseInt(minSize);
      if (maxSize) fileQuery.size.$lte = parseInt(maxSize);
    }

    // Sort
    let sortOption = { updatedAt: -1 };
    switch (sort) {
      case 'name_asc': sortOption = { name: 1 }; break;
      case 'name_desc': sortOption = { name: -1 }; break;
      case 'date_newest': sortOption = { updatedAt: -1 }; break;
      case 'date_oldest': sortOption = { updatedAt: 1 }; break;
      case 'size_largest': sortOption = { size: -1 }; break;
      case 'size_smallest': sortOption = { size: 1 }; break;
    }

    const files = await File.find(fileQuery).sort(sortOption).limit(100);

    // Search folders too
    const folderQuery = {
      owner: req.userId,
      isTrashed: false,
    };
    if (q && q.trim().length > 0) {
      if (q.length >= 3) {
        folderQuery.$text = { $search: q };
      } else {
        folderQuery.name = { $regex: q, $options: 'i' };
      }
    }

    const folders = await Folder.find(folderQuery).sort({ name: 1 }).limit(50);

    res.json({
      query: q,
      files,
      folders,
      totalFiles: files.length,
      totalFolders: folders.length,
    });
  } catch (error) {
    // If text index search fails, fall back to regex
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        try {
          const q = req.query.q || '';
          const fallbackQuery = {
            owner: req.userId,
            isTrashed: false,
          };
          if (q.trim().length > 0) {
            fallbackQuery.name = { $regex: q, $options: 'i' };
          }
          if (req.query.type) {
             const constants = require('../config/constants');
             const typeKey = req.query.type.toUpperCase();
             if (constants.FILE_TYPES[typeKey]) fallbackQuery.mimeType = { $in: constants.FILE_TYPES[typeKey] };
          }
          if (req.query.tags) {
             fallbackQuery.tags = { $in: req.query.tags.split(',').map(t => t.trim().toLowerCase()) };
          }

          const files = await File.find(fallbackQuery).limit(100);

          let folders = [];
          if (q.trim().length > 0) {
            folders = await Folder.find({
              owner: req.userId,
              isTrashed: false,
              name: { $regex: q, $options: 'i' },
            }).limit(50);
          }

          return res.json({
            query: q,
            files,
            folders,
            totalFiles: files.length,
            totalFolders: folders.length,
          });
        } catch (fallbackError) {
          return next(fallbackError);
        }
      }
    next(error);
  }
};

// @desc    Search suggestions
// @route   GET /api/search/suggestions
exports.suggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const files = await File.find({
      owner: req.userId,
      isTrashed: false,
      name: { $regex: q, $options: 'i' },
    })
      .select('name mimeType extension')
      .limit(8)
      .lean();

    const folders = await Folder.find({
      owner: req.userId,
      isTrashed: false,
      name: { $regex: q, $options: 'i' },
    })
      .select('name')
      .limit(4)
      .lean();

    const suggestions = [
      ...folders.map((f) => ({ id: f._id, name: f.name, type: 'folder' })),
      ...files.map((f) => ({ id: f._id, name: f.name, type: 'file', mimeType: f.mimeType })),
    ];

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
};
