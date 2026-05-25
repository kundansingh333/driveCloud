const fs = require('fs');
const path = require('path');
const { S3Client, DeleteObjectCommand, CopyObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 Client initialization
let s3Client = null;
if (process.env.STORAGE_PROVIDER === 's3') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const bucketName = process.env.AWS_S3_BUCKET;

const deleteFile = async (storageProvider, filePath, storageKey) => {
  if (storageProvider === 's3') {
    if (!s3Client || !bucketName) throw new Error('S3 not configured properly');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    }));
  } else {
    // Local
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

const copyFile = async (storageProvider, sourceKey, newKey, sourcePath, newPath) => {
  if (storageProvider === 's3') {
    if (!s3Client || !bucketName) throw new Error('S3 not configured properly');
    await s3Client.send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: newKey,
    }));
  } else {
    // Local
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, newPath);
    }
  }
};

const getFileStream = async (storageProvider, filePath, storageKey) => {
  if (storageProvider === 's3') {
    if (!s3Client || !bucketName) throw new Error('S3 not configured properly');
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    }));
    return response.Body; // This is a readable stream
  } else {
    // Local
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on local disk');
    }
    return fs.createReadStream(filePath);
  }
};

module.exports = {
  s3Client,
  bucketName,
  deleteFile,
  copyFile,
  getFileStream,
};
