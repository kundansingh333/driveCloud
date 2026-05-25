module.exports = {
  FILE_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    DOCUMENT: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    TEXT: ['text/plain', 'text/csv', 'text/markdown', 'text/html', 'text/css', 'text/xml'],
    CODE: [
      'application/javascript',
      'application/json',
      'application/xml',
      'text/javascript',
      'text/x-python',
      'text/x-java-source',
    ],
    ARCHIVE: [
      'application/zip',
      'application/x-rar-compressed',
      'application/gzip',
      'application/x-7z-compressed',
      'application/x-tar',
    ],
  },

  FILE_CATEGORIES: {
    images: 'Images',
    videos: 'Videos',
    audio: 'Audio',
    documents: 'Documents',
    code: 'Code',
    archives: 'Archives',
    other: 'Other',
  },

  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
  },

  ACTIONS: {
    UPLOAD: 'upload',
    DOWNLOAD: 'download',
    DELETE: 'delete',
    RENAME: 'rename',
    MOVE: 'move',
    COPY: 'copy',
    STAR: 'star',
    UNSTAR: 'unstar',
    TRASH: 'trash',
    RESTORE: 'restore',
    CREATE_FOLDER: 'create_folder',
    LOGIN: 'login',
    SIGNUP: 'signup',
  },

  SORT_OPTIONS: {
    NAME_ASC: { name: 1 },
    NAME_DESC: { name: -1 },
    DATE_NEWEST: { updatedAt: -1 },
    DATE_OLDEST: { updatedAt: 1 },
    SIZE_LARGEST: { size: -1 },
    SIZE_SMALLEST: { size: 1 },
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
  },

  TRASH_RETENTION_DAYS: 30,

  getFileCategory(mimeType) {
    if (!mimeType) return 'other';
    if (this.FILE_TYPES.IMAGE.includes(mimeType)) return 'images';
    if (this.FILE_TYPES.VIDEO.includes(mimeType)) return 'videos';
    if (this.FILE_TYPES.AUDIO.includes(mimeType)) return 'audio';
    if (this.FILE_TYPES.DOCUMENT.includes(mimeType)) return 'documents';
    if (this.FILE_TYPES.TEXT.includes(mimeType) || this.FILE_TYPES.CODE.includes(mimeType)) return 'code';
    if (this.FILE_TYPES.ARCHIVE.includes(mimeType)) return 'archives';
    return 'other';
  },
};
