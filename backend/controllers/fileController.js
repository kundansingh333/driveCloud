const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { calculateChecksum, getFileExtension, isImage, sanitizeFileName, isTextFile, generateUniqueName, generateAutoTags } = require('../utils/fileHelpers');
const { generateThumbnail, getImageMetadata, deleteThumbnail } = require('../utils/thumbnailGenerator');
const { uploadDir, thumbnailDir } = require('../middleware/upload');
const { deleteFile, copyFile, getFileStream } = require('../services/storageService');
const Share = require('../models/Share');

// @desc    Upload files
// @route   POST /api/files/upload
exports.uploadFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }

    const { parentFolder } = req.body;

    // Validate parent folder if provided
    if (parentFolder) {
      const folder = await Folder.findOne({ _id: parentFolder, owner: req.userId, isTrashed: false });
      if (!folder) {
        return res.status(404).json({ message: 'Parent folder not found.' });
      }
    }

    // Check storage quota
    const totalUploadSize = req.files.reduce((sum, f) => sum + f.size, 0);
    const user = await User.findById(req.userId);
    if (user.storageUsed + totalUploadSize > user.storageLimit) {
      // Clean up uploaded files
      req.files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(413).json({
        message: 'Storage quota exceeded.',
        code: 'QUOTA_EXCEEDED',
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
      });
    }

    const storageProvider = process.env.STORAGE_PROVIDER === 's3' ? 's3' : 'local';
    const uploadedFiles = [];

    for (const file of req.files) {
      const ext = getFileExtension(file.originalname);
      const storageKey = file.key || file.filename;
      const filePath = file.location || file.path;

      let checksum = null;
      let thumbnailPath = null;
      let metadata = {};

      let autoTags = generateAutoTags(file);

      if (storageProvider === 'local') {
        checksum = await calculateChecksum(filePath);
      } else {
        // S3 Provider
        checksum = file.etag ? file.etag.replace(/"/g, '') : null;
      }

      // Check for duplicate in the user's entire storage
      let finalStorageKey = storageKey;
      let finalFilePath = filePath;
      let finalThumbnailPath = null;
      let finalMetadata = {};

      if (checksum) {
        const existingDuplicate = await File.findOne({ owner: req.userId, checksum });
        if (existingDuplicate) {
          // De-duplication: reuse the existing physical file
          finalStorageKey = existingDuplicate.storageKey;
          finalFilePath = existingDuplicate.path;
          finalThumbnailPath = existingDuplicate.thumbnailPath;
          finalMetadata = existingDuplicate.metadata;
          
          // If we uploaded a new physical file, delete it to save space
          if (storageProvider === 'local' && fs.existsSync(filePath) && filePath !== finalFilePath) {
             fs.unlinkSync(filePath);
          } else if (storageProvider === 's3' && storageKey !== finalStorageKey) {
             // To fully save space, we should ideally delete the newly uploaded S3 object here
             // For now, we just link it and orphan the new S3 object.
          }
        } else {
          // No duplicate found, process newly uploaded file
          if (storageProvider === 'local' && isImage(file.mimetype)) {
            finalThumbnailPath = await generateThumbnail(filePath, storageKey);
            const imgMeta = await getImageMetadata(filePath);
            if (imgMeta) finalMetadata = imgMeta;
          }
        }
      }

      // Handle duplicate names in the target folder
      const existingFilesInFolder = await File.find({ owner: req.userId, parentFolder: parentFolder || null }).select('name').lean();
      const existingNames = existingFilesInFolder.map(f => f.name);
      const safeName = sanitizeFileName(file.originalname);
      const finalName = generateUniqueName(safeName, existingNames);

      const newFile = await File.create({
        name: finalName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        extension: ext,
        path: finalFilePath,
        storageKey: finalStorageKey,
        storageProvider,
        checksum,
        owner: req.userId,
        parentFolder: parentFolder || null,
        thumbnailPath: finalThumbnailPath,
        metadata: finalMetadata,
        tags: autoTags,
      });

      uploadedFiles.push(newFile);

      // Log activity
      await ActivityLog.create({
        user: req.userId,
        action: 'upload',
        resourceType: 'file',
        resourceId: newFile._id,
        resourceName: newFile.name,
        metadata: { size: file.size, mimeType: file.mimetype },
      });
    }

    // Update user storage
    await User.findByIdAndUpdate(req.userId, {
      $inc: { storageUsed: totalUploadSize },
    });

    // Emit socket event
    if (req.io) {
      req.io.to(req.userId.toString()).emit('files:uploaded', uploadedFiles);
    }

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      files: uploadedFiles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get file metadata
// @route   GET /api/files/:id
exports.getFile = async (req, res, next) => {
  try {
    let file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      // Check if it's shared with the user
      const share = await Share.findOne({ itemType: 'file', fileId: req.params.id, sharedWith: req.userId });
      if (share) {
        file = await File.findById(req.params.id);
      }
    }
    
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Update accessed time
    file.accessedAt = new Date();
    await file.save();

    res.json({ file });
  } catch (error) {
    next(error);
  }
};

// @desc    Download file
// @route   GET /api/files/:id/download
exports.downloadFile = async (req, res, next) => {
  try {
    let file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      const share = await Share.findOne({ itemType: 'file', fileId: req.params.id, sharedWith: req.userId });
      if (share) file = await File.findById(req.params.id);
    }
    
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.userId,
      action: 'download',
      resourceType: 'file',
      resourceId: file._id,
      resourceName: file.name,
    });

    const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Download multiple files as zip
// @route   POST /api/files/download-zip
exports.downloadZip = async (req, res, next) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds || !fileIds.length) {
      return res.status(400).json({ message: 'No files selected.' });
    }

    const files = await File.find({
      _id: { $in: fileIds },
      owner: req.userId,
      isTrashed: false,
    });

    if (!files.length) {
      return res.status(404).json({ message: 'No files found.' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=download.zip');

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (const file of files) {
      try {
        const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
        archive.append(stream, { name: file.originalName });
      } catch (err) {
        // Skip if not found
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

// @desc    Update file (rename, star, tags)
// @route   PUT /api/files/:id
exports.updateFile = async (req, res, next) => {
  try {
    const { name, isStarred, tags } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    if (name !== undefined) {
      file.name = sanitizeFileName(name);
      await ActivityLog.create({
        user: req.userId,
        action: 'rename',
        resourceType: 'file',
        resourceId: file._id,
        resourceName: file.name,
      });
    }
    if (isStarred !== undefined) {
      file.isStarred = isStarred;
      await ActivityLog.create({
        user: req.userId,
        action: isStarred ? 'star' : 'unstar',
        resourceType: 'file',
        resourceId: file._id,
        resourceName: file.name,
      });
    }
    if (tags !== undefined) file.tags = tags;

    await file.save();

    if (req.io) {
      req.io.to(req.userId.toString()).emit('file:updated', file);
    }

    res.json({ file });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file (move to trash or permanent delete)
// @route   DELETE /api/files/:id
exports.deleteFile = async (req, res, next) => {
  try {
    const { permanent } = req.query;
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    if (permanent === 'true') {
      // Permanent delete: remove file from storage and DB
      await deleteFile(file.storageProvider, file.path, file.storageKey);
      deleteThumbnail(file.thumbnailPath);

      await User.findByIdAndUpdate(req.userId, {
        $inc: { storageUsed: -file.size },
      });

      await File.findByIdAndDelete(file._id);

      await ActivityLog.create({
        user: req.userId,
        action: 'permanent_delete',
        resourceType: 'file',
        resourceId: file._id,
        resourceName: file.name,
      });
    } else {
      // Move to trash
      file.isTrashed = true;
      file.trashedAt = new Date();
      await file.save();

      await ActivityLog.create({
        user: req.userId,
        action: 'trash',
        resourceType: 'file',
        resourceId: file._id,
        resourceName: file.name,
      });
    }

    if (req.io) {
      req.io.to(req.userId.toString()).emit('file:deleted', { id: file._id, permanent: permanent === 'true' });
    }

    res.json({ message: permanent === 'true' ? 'File permanently deleted.' : 'File moved to trash.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Copy file
// @route   POST /api/files/:id/copy
exports.copyFile = async (req, res, next) => {
  try {
    const { parentFolder } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Check storage quota
    const user = await User.findById(req.userId);
    if (user.storageUsed + file.size > user.storageLimit) {
      return res.status(413).json({ message: 'Storage quota exceeded.' });
    }

    // Copy physical file
    const ext = path.extname(file.storageKey);
    const newStorageKey = `${require('uuid').v4()}${ext}`;
    const newPath = file.storageProvider === 'local' ? path.join(path.dirname(file.path), newStorageKey) : '';
    await copyFile(file.storageProvider, file.storageKey, newStorageKey, file.path, newPath);

    // Copy thumbnail
    let newThumbnailPath = null;
    if (file.thumbnailPath) {
      const thumbSrc = path.join(thumbnailDir, file.thumbnailPath);
      if (fs.existsSync(thumbSrc)) {
        newThumbnailPath = `thumb_${newStorageKey}`;
        fs.copyFileSync(thumbSrc, path.join(thumbnailDir, newThumbnailPath));
      }
    }

    const copiedFile = await File.create({
      name: `Copy of ${file.name}`,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      extension: file.extension,
      path: newPath,
      storageKey: newStorageKey,
      checksum: file.checksum,
      owner: req.userId,
      parentFolder: parentFolder || file.parentFolder,
      thumbnailPath: newThumbnailPath,
      metadata: file.metadata,
    });

    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: file.size } });

    await ActivityLog.create({
      user: req.userId,
      action: 'copy',
      resourceType: 'file',
      resourceId: copiedFile._id,
      resourceName: copiedFile.name,
    });

    res.status(201).json({ file: copiedFile });
  } catch (error) {
    next(error);
  }
};

// @desc    Move file
// @route   POST /api/files/:id/move
exports.moveFile = async (req, res, next) => {
  try {
    const { parentFolder } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Validate target folder
    if (parentFolder) {
      const folder = await Folder.findOne({ _id: parentFolder, owner: req.userId, isTrashed: false });
      if (!folder) {
        return res.status(404).json({ message: 'Target folder not found.' });
      }
    }

    file.parentFolder = parentFolder || null;
    await file.save();

    await ActivityLog.create({
      user: req.userId,
      action: 'move',
      resourceType: 'file',
      resourceId: file._id,
      resourceName: file.name,
    });

    if (req.io) {
      req.io.to(req.userId.toString()).emit('file:moved', file);
    }

    res.json({ file });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore file from trash
// @route   POST /api/files/:id/restore
exports.restoreFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isTrashed: true });
    if (!file) {
      return res.status(404).json({ message: 'File not found in trash.' });
    }

    file.isTrashed = false;
    file.trashedAt = null;
    await file.save();

    await ActivityLog.create({
      user: req.userId,
      action: 'restore',
      resourceType: 'file',
      resourceId: file._id,
      resourceName: file.name,
    });

    res.json({ message: 'File restored.', file });
  } catch (error) {
    next(error);
  }
};

// @desc    Get file preview/thumbnail
// @route   GET /api/files/:id/thumbnail
exports.getThumbnail = async (req, res, next) => {
  try {
    let file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      const share = await Share.findOne({ itemType: 'file', fileId: req.params.id, sharedWith: req.userId });
      if (share) file = await File.findById(req.params.id);
    }
    
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    if (file.thumbnailPath) {
      const thumbPath = path.join(thumbnailDir, file.thumbnailPath);
      if (fs.existsSync(thumbPath)) {
        return res.sendFile(thumbPath);
      }
    }

    // If no thumbnail, serve original for images
    if (isImage(file.mimeType) && fs.existsSync(file.path)) {
      return res.sendFile(path.resolve(file.path));
    }

    res.status(404).json({ message: 'No thumbnail available.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get file content (for text preview)
// @route   GET /api/files/:id/content
exports.getFileContent = async (req, res, next) => {
  try {
    let file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      const share = await Share.findOne({ itemType: 'file', fileId: req.params.id, sharedWith: req.userId });
      if (share) file = await File.findById(req.params.id);
    }
    
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'File not found on disk.' });
    }

    // Only allow text-based files
    if (!isTextFile(file.mimeType, file.extension) && file.mimeType !== 'application/pdf') {
      return res.status(400).json({ message: 'File type does not support content preview.' });
    }

    // For PDFs, stream the file
    if (file.mimeType === 'application/pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
      return stream.pipe(res);
    }

    // For text files, return content as text (limit to 1MB)
    if (file.size > 1024 * 1024) {
      return res.status(413).json({ message: 'File too large for preview. Max 1MB.' });
    }

    const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
    let content = '';
    stream.on('data', (chunk) => content += chunk);
    stream.on('end', () => res.json({ content, mimeType: file.mimeType, extension: file.extension }));
    stream.on('error', (err) => next(err));
  } catch (error) {
    next(error);
  }
};

// @desc    Serve file directly (for image/media preview)
// @route   GET /api/files/:id/serve
exports.serveFile = async (req, res, next) => {
  try {
    let file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) {
      const share = await Share.findOne({ itemType: 'file', fileId: req.params.id, sharedWith: req.userId });
      if (share) file = await File.findById(req.params.id);
    }
    
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Empty trash
// @route   DELETE /api/files/trash/empty
exports.emptyTrash = async (req, res, next) => {
  try {
    const trashedFiles = await File.find({ owner: req.userId, isTrashed: true });

    let freedSpace = 0;
    for (const file of trashedFiles) {
      await deleteFile(file.storageProvider, file.path, file.storageKey);
      deleteThumbnail(file.thumbnailPath);
      freedSpace += file.size;
    }

    await File.deleteMany({ owner: req.userId, isTrashed: true });

    // Also delete trashed folders
    await Folder.deleteMany({ owner: req.userId, isTrashed: true });

    await User.findByIdAndUpdate(req.userId, {
      $inc: { storageUsed: -freedSpace },
    });

    res.json({ message: 'Trash emptied.', freedSpace });
  } catch (error) {
    next(error);
  }
};
