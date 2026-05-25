const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['file', 'folder'],
      required: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer',
    },
  },
  { timestamps: true }
);

// Ensure a user can only have one share record per item
shareSchema.index({ fileId: 1, sharedWith: 1 }, { unique: true, partialFilterExpression: { itemType: 'file' } });
shareSchema.index({ folderId: 1, sharedWith: 1 }, { unique: true, partialFilterExpression: { itemType: 'folder' } });

module.exports = mongoose.model('Share', shareSchema);
