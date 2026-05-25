const Folder = require('../models/Folder');
const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const Share = require('../models/Share');
const archiver = require('archiver');
const { getFileStream } = require('../services/storageService');

// @desc    Create folder
// @route   POST /api/folders
exports.createFolder = async (req, res, next) => {
  try {
    const { name, parentFolder, color } = req.body;

    // Validate parent folder
    let parentPath = '/';
    if (parentFolder) {
      const parent = await Folder.findOne({ _id: parentFolder, owner: req.userId, isTrashed: false });
      if (!parent) {
        return res.status(404).json({ message: 'Parent folder not found.' });
      }
      parentPath = `${parent.path}${parent._id}/`;
    }

    // Check for duplicate folder name in same location
    const existing = await Folder.findOne({
      name,
      owner: req.userId,
      parentFolder: parentFolder || null,
      isTrashed: false,
    });
    if (existing) {
      return res.status(409).json({ message: 'A folder with this name already exists here.' });
    }

    const folder = await Folder.create({
      name,
      owner: req.userId,
      parentFolder: parentFolder || null,
      path: parentPath,
      color: color || '#3b82f6',
    });

    await ActivityLog.create({
      user: req.userId,
      action: 'create_folder',
      resourceType: 'folder',
      resourceId: folder._id,
      resourceName: folder.name,
    });

    if (req.io) {
      req.io.to(req.userId.toString()).emit('folder:created', folder);
    }

    res.status(201).json({ folder });
  } catch (error) {
    next(error);
  }
};

// @desc    Get folder with contents
// @route   GET /api/folders/:id
exports.getFolder = async (req, res, next) => {
  try {
    let folder = await Folder.findOne({ _id: req.params.id, owner: req.userId, isTrashed: false });
    
    // Check share access if not owner
    if (!folder) {
      const share = await Share.findOne({ itemType: 'folder', folderId: req.params.id, sharedWith: req.userId });
      if (share) {
        folder = await Folder.findById(req.params.id);
      }
    }

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Get breadcrumb path
    const breadcrumbs = await getBreadcrumbs(folder);

    res.json({ folder, breadcrumbs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get folder contents (files + subfolders)
// @route   GET /api/folders/:id/contents  OR  GET /api/folders/root/contents
exports.getFolderContents = async (req, res, next) => {
  try {
    const { sort = 'date_newest', type } = req.query;
    const isRoot = req.params.id === 'root';
    const parentFolder = isRoot ? null : req.params.id;

    let folderOwner = req.userId;

    // Validate folder exists (if not root)
    if (!isRoot) {
      let folder = await Folder.findOne({ _id: parentFolder, owner: req.userId, isTrashed: false });
      
      // Check share access if not owner
      if (!folder) {
        const share = await Share.findOne({ itemType: 'folder', folderId: parentFolder, sharedWith: req.userId });
        if (share) {
          folder = await Folder.findById(parentFolder);
        }
      }
      
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found.' });
      }
      folderOwner = folder.owner;
    }

    // Determine sort
    let sortOption = { updatedAt: -1 };
    switch (sort) {
      case 'name_asc': sortOption = { name: 1 }; break;
      case 'name_desc': sortOption = { name: -1 }; break;
      case 'date_newest': sortOption = { updatedAt: -1 }; break;
      case 'date_oldest': sortOption = { updatedAt: 1 }; break;
      case 'size_largest': sortOption = { size: -1 }; break;
      case 'size_smallest': sortOption = { size: 1 }; break;
    }

    // Get subfolders
    const folders = await Folder.find({
      owner: folderOwner,
      parentFolder,
      isTrashed: false,
    }).sort({ name: 1 });

    // Build file query
    const fileQuery = {
      owner: folderOwner,
      parentFolder,
      isTrashed: false,
    };

    // Filter by type
    if (type) {
      const constants = require('../config/constants');
      const typeKey = type.toUpperCase();
      if (constants.FILE_TYPES[typeKey]) {
        fileQuery.mimeType = { $in: constants.FILE_TYPES[typeKey] };
      }
    }

    const files = await File.find(fileQuery).sort(sortOption);

    // Get breadcrumbs
    let breadcrumbs = [{ id: null, name: 'My Drive' }];
    if (!isRoot) {
      const folder = await Folder.findById(parentFolder);
      if (folder) {
        breadcrumbs = await getBreadcrumbs(folder);
      }
    }

    res.json({
      folders,
      files,
      breadcrumbs,
      totalFolders: folders.length,
      totalFiles: files.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update folder
// @route   PUT /api/folders/:id
exports.updateFolder = async (req, res, next) => {
  try {
    const { name, color, icon, isStarred } = req.body;
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    if (name !== undefined) {
      // Check for duplicate
      const existing = await Folder.findOne({
        name,
        owner: req.userId,
        parentFolder: folder.parentFolder,
        _id: { $ne: folder._id },
        isTrashed: false,
      });
      if (existing) {
        return res.status(409).json({ message: 'A folder with this name already exists.' });
      }
      folder.name = name;

      await ActivityLog.create({
        user: req.userId,
        action: 'rename',
        resourceType: 'folder',
        resourceId: folder._id,
        resourceName: folder.name,
      });
    }
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (isStarred !== undefined) folder.isStarred = isStarred;

    await folder.save();

    if (req.io) {
      req.io.to(req.userId.toString()).emit('folder:updated', folder);
    }

    res.json({ folder });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete folder (trash or permanent)
// @route   DELETE /api/folders/:id
exports.deleteFolder = async (req, res, next) => {
  try {
    const { permanent } = req.query;
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    if (permanent === 'true') {
      // Recursively delete all contents permanently
      await permanentDeleteFolder(folder._id, req.userId);
    } else {
      // Move to trash (cascade to contents)
      await trashFolderRecursive(folder._id, req.userId);
    }

    await ActivityLog.create({
      user: req.userId,
      action: permanent === 'true' ? 'permanent_delete' : 'trash',
      resourceType: 'folder',
      resourceId: folder._id,
      resourceName: folder.name,
    });

    if (req.io) {
      req.io.to(req.userId.toString()).emit('folder:deleted', { id: folder._id });
    }

    res.json({ message: permanent === 'true' ? 'Folder permanently deleted.' : 'Folder moved to trash.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Move folder
// @route   POST /api/folders/:id/move
exports.moveFolder = async (req, res, next) => {
  try {
    const { parentFolder } = req.body;
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.userId, isTrashed: false });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Prevent moving to self or descendant
    if (parentFolder) {
      if (parentFolder === req.params.id) {
        return res.status(400).json({ message: 'Cannot move folder into itself.' });
      }
      const targetFolder = await Folder.findOne({ _id: parentFolder, owner: req.userId, isTrashed: false });
      if (!targetFolder) {
        return res.status(404).json({ message: 'Target folder not found.' });
      }
      // Check if target is a descendant
      if (targetFolder.path.includes(`${folder._id}/`)) {
        return res.status(400).json({ message: 'Cannot move folder into its own subfolder.' });
      }
      folder.path = `${targetFolder.path}${targetFolder._id}/`;
    } else {
      folder.path = '/';
    }

    folder.parentFolder = parentFolder || null;
    await folder.save();

    await ActivityLog.create({
      user: req.userId,
      action: 'move',
      resourceType: 'folder',
      resourceId: folder._id,
      resourceName: folder.name,
    });

    res.json({ folder });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore folder from trash
// @route   POST /api/folders/:id/restore
exports.restoreFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.userId, isTrashed: true });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found in trash.' });
    }

    // Restore folder and all contents
    await restoreFolderRecursive(folder._id, req.userId);

    res.json({ message: 'Folder restored.', folder });
  } catch (error) {
    next(error);
  }
};

// @desc    Get folder tree for sidebar
// @route   GET /api/folders/tree
exports.getFolderTree = async (req, res, next) => {
  try {
    const folders = await Folder.find({
      owner: req.userId,
      isTrashed: false,
    })
      .select('name parentFolder color icon isStarred')
      .sort({ name: 1 })
      .lean();

    // Build tree structure
    const tree = buildTree(folders);
    res.json({ tree });
  } catch (error) {
    next(error);
  }
};

// @desc    Get starred items
// @route   GET /api/folders/starred
exports.getStarredItems = async (req, res, next) => {
  try {
    const folders = await Folder.find({ owner: req.userId, isStarred: true, isTrashed: false });
    const files = await File.find({ owner: req.userId, isStarred: true, isTrashed: false });
    res.json({ folders, files });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trashed items
// @route   GET /api/folders/trash
exports.getTrashedItems = async (req, res, next) => {
  try {
    const folders = await Folder.find({ owner: req.userId, isTrashed: true });
    const files = await File.find({ owner: req.userId, isTrashed: true });
    res.json({ folders, files });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent files
// @route   GET /api/folders/recent
exports.getRecentFiles = async (req, res, next) => {
  try {
    const files = await File.find({ owner: req.userId, isTrashed: false })
      .sort({ accessedAt: -1 })
      .limit(30);
    res.json({ files });
  } catch (error) {
    next(error);
  }
};

// Helper: Build breadcrumb trail
async function getBreadcrumbs(folder) {
  const breadcrumbs = [{ id: null, name: 'My Drive' }];
  const pathIds = folder.path
    .split('/')
    .filter(Boolean);

  if (pathIds.length > 0) {
    const ancestors = await Folder.find({ _id: { $in: pathIds } }).select('name').lean();
    const ancestorMap = {};
    ancestors.forEach((a) => (ancestorMap[a._id.toString()] = a.name));

    pathIds.forEach((id) => {
      if (ancestorMap[id]) {
        breadcrumbs.push({ id, name: ancestorMap[id] });
      }
    });
  }

  breadcrumbs.push({ id: folder._id.toString(), name: folder.name });
  return breadcrumbs;
}

// Helper: Build tree from flat list
function buildTree(folders) {
  const map = {};
  const roots = [];

  folders.forEach((f) => {
    map[f._id.toString()] = { ...f, children: [] };
  });

  folders.forEach((f) => {
    if (f.parentFolder && map[f.parentFolder.toString()]) {
      map[f.parentFolder.toString()].children.push(map[f._id.toString()]);
    } else {
      roots.push(map[f._id.toString()]);
    }
  });

  return roots;
}

// Helper: Recursively trash folder and contents
async function trashFolderRecursive(folderId, userId) {
  const now = new Date();

  // Trash the folder
  await Folder.findByIdAndUpdate(folderId, { isTrashed: true, trashedAt: now });

  // Trash files in folder
  await File.updateMany(
    { parentFolder: folderId, owner: userId },
    { isTrashed: true, trashedAt: now }
  );

  // Recurse into subfolders
  const subfolders = await Folder.find({ parentFolder: folderId, owner: userId });
  for (const sub of subfolders) {
    await trashFolderRecursive(sub._id, userId);
  }
}

// Helper: Recursively restore folder
async function restoreFolderRecursive(folderId, userId) {
  await Folder.findByIdAndUpdate(folderId, { isTrashed: false, trashedAt: null });
  await File.updateMany(
    { parentFolder: folderId, owner: userId, isTrashed: true },
    { isTrashed: false, trashedAt: null }
  );
  const subfolders = await Folder.find({ parentFolder: folderId, owner: userId });
  for (const sub of subfolders) {
    await restoreFolderRecursive(sub._id, userId);
  }
}

// Helper: Recursively permanent-delete folder
async function permanentDeleteFolder(folderId, userId) {
  const fs = require('fs');
  const { deleteThumbnail } = require('../utils/thumbnailGenerator');
  const User = require('../models/User');

  // Delete files in folder
  const files = await File.find({ parentFolder: folderId, owner: userId });
  let freedSpace = 0;
  for (const file of files) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    deleteThumbnail(file.thumbnailPath);
    freedSpace += file.size;
  }
  await File.deleteMany({ parentFolder: folderId, owner: userId });

  // Recurse into subfolders
  const subfolders = await Folder.find({ parentFolder: folderId, owner: userId });
  for (const sub of subfolders) {
    const subFreed = await permanentDeleteFolder(sub._id, userId);
    freedSpace += subFreed;
  }

  // Delete the folder itself
  await Folder.findByIdAndDelete(folderId);

  // Update storage
  if (freedSpace > 0) {
    await User.findByIdAndUpdate(userId, { $inc: { storageUsed: -freedSpace } });
  }

  return freedSpace;
}

// @desc    Download folder as ZIP
// @route   GET /api/folders/:id/download-zip
exports.downloadFolderZip = async (req, res, next) => {
  try {
    const folderId = req.params.id;
    let folder = await Folder.findOne({ _id: folderId, owner: req.userId, isTrashed: false });
    
    // Check share access if not owner
    if (!folder) {
      const share = await Share.findOne({ itemType: 'folder', folderId, sharedWith: req.userId });
      if (share) folder = await Folder.findById(folderId);
    }
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    // Recursively find all nested folders and files
    const targetPathPrefix = `${folder.path}${folder._id}/`;
    
    // Get all files that belong to this folder OR any subfolder
    const allFiles = await File.find({
      owner: folder.owner,
      isTrashed: false,
      $or: [
        { parentFolder: folder._id },
        { path: { $regex: `^${targetPathPrefix}` } }
      ]
    }).populate('parentFolder', 'path');

    // Get all folders to compute correct relative paths
    const allFolders = await Folder.find({
      owner: folder.owner,
      isTrashed: false,
      $or: [
        { _id: folder._id },
        { path: { $regex: `^${targetPathPrefix}` } }
      ]
    });

    // Create a fast lookup map for folder paths by ID
    const folderPaths = {};
    for (const f of allFolders) {
      let currentFolder = f;
      let relPath = currentFolder.name;
      let safetyCounter = 0;
      
      while (currentFolder.parentFolder && currentFolder._id.toString() !== folder._id.toString() && safetyCounter < 50) {
        safetyCounter++;
        const p = allFolders.find(pf => pf._id.toString() === currentFolder.parentFolder.toString());
        if (p) {
          if (p._id.toString() === folder._id.toString()) break;
          relPath = `${p.name}/${relPath}`;
          currentFolder = p;
        } else break;
      }
      
      if (f._id.toString() === folder._id.toString()) relPath = ''; 
      else relPath = relPath + '/';

      folderPaths[f._id.toString()] = relPath;
    }

    for (const file of allFiles) {
      try {
        const stream = await getFileStream(file.storageProvider, file.path, file.storageKey);
        const folderPath = file.parentFolder ? folderPaths[file.parentFolder._id.toString()] || '' : '';
        archive.append(stream, { name: `${folderPath}${file.name}` });
      } catch (err) {
        // skip failed files
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
