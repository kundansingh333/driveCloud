const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Calculate MD5 checksum of a file
 */
const calculateChecksum = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Format file size to human-readable string
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().slice(1);
};

/**
 * Check if file is an image
 */
const isImage = (mimeType) => {
  return mimeType && mimeType.startsWith('image/');
};

/**
 * Check if file is text-based (previewable as text)
 */
const isTextFile = (mimeType, extension) => {
  const textMimes = [
    'text/', 'application/json', 'application/javascript',
    'application/xml', 'application/x-yaml',
  ];
  const textExtensions = [
    'txt', 'md', 'csv', 'json', 'js', 'jsx', 'ts', 'tsx',
    'html', 'css', 'scss', 'py', 'java', 'c', 'cpp', 'h',
    'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sql', 'sh',
    'bash', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg',
    'env', 'log', 'gitignore', 'dockerfile',
  ];
  return textMimes.some((m) => mimeType?.startsWith(m)) || textExtensions.includes(extension);
};

/**
 * Sanitize filename
 */
const sanitizeFileName = (name) => {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Generate unique filename if duplicate exists
 */
const generateUniqueName = (name, existingNames) => {
  if (!existingNames.includes(name)) return name;

  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let counter = 1;
  let newName = `${base} (${counter})${ext}`;
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${base} (${counter})${ext}`;
  }
  return newName;
};

/**
 * Generate automatic tags based on file properties
 */
const generateAutoTags = (file) => {
  const tags = new Set();

  // Basic type tags
  if (file.mimetype) {
    if (file.mimetype.startsWith('image/')) tags.add('image');
    if (file.mimetype.startsWith('video/')) tags.add('video');
    if (file.mimetype.startsWith('audio/')) tags.add('audio');
    if (file.mimetype === 'application/pdf') tags.add('pdf');
  }

  // Dimension-based tags (if metadata is passed or known later, but for now we'll do extension-based)
  const ext = getFileExtension(file.originalname);
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) tags.add('archive');
  if (['doc', 'docx', 'txt', 'rtf', 'pdf', 'md'].includes(ext)) tags.add('document');
  if (['xls', 'xlsx', 'csv'].includes(ext)) tags.add('spreadsheet');
  if (['ppt', 'pptx'].includes(ext)) tags.add('presentation');
  
  const textExtensions = ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'go'];
  if (textExtensions.includes(ext)) tags.add('code');

  return Array.from(tags);
};

module.exports = {
  calculateChecksum,
  formatFileSize,
  getFileExtension,
  isImage,
  isTextFile,
  sanitizeFileName,
  generateUniqueName,
  generateAutoTags,
};
