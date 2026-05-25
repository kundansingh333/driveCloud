const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { thumbnailDir } = require('../middleware/upload');

const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;

/**
 * Generate thumbnail for an image file
 */
const generateThumbnail = async (filePath, storageKey) => {
  try {
    const thumbFilename = `thumb_${storageKey}`;
    const thumbPath = path.join(thumbnailDir, thumbFilename);

    // Ensure thumbnail directory exists
    const thumbDir = path.dirname(thumbPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    await sharp(filePath)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    return thumbFilename;
  } catch (error) {
    console.error('Thumbnail generation failed:', error.message);
    return null;
  }
};

/**
 * Get image metadata (dimensions)
 */
const getImageMetadata = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Delete thumbnail file
 */
const deleteThumbnail = (thumbnailFilename) => {
  if (!thumbnailFilename) return;
  const thumbPath = path.join(thumbnailDir, thumbnailFilename);
  if (fs.existsSync(thumbPath)) {
    fs.unlinkSync(thumbPath);
  }
};

module.exports = {
  generateThumbnail,
  getImageMetadata,
  deleteThumbnail,
};
