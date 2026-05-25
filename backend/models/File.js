const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: 500,
    },
    originalName: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      default: '',
    },
    path: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3'],
      default: 'local',
    },
    checksum: {
      type: String,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    trashedAt: {
      type: Date,
      default: null,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    thumbnailPath: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    publicPassword: {
      type: String,
      default: null,
    },
    publicExpiresAt: {
      type: Date,
      default: null,
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      pages: Number,
    },
    versions: [
      {
        versionNumber: Number,
        storageKey: String,
        size: Number,
        checksum: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    accessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
fileSchema.index({ owner: 1, parentFolder: 1, isTrashed: 1 });
fileSchema.index({ owner: 1, isTrashed: 1, updatedAt: -1 });
fileSchema.index({ owner: 1, isStarred: 1 });
fileSchema.index({ name: 'text', originalName: 'text', tags: 'text' });

// Virtual for file category
fileSchema.virtual('category').get(function () {
  const constants = require('../config/constants');
  return constants.getFileCategory(this.mimeType);
});

fileSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('File', fileSchema);
