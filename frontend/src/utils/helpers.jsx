import {
  File, Image, Video, Music, FileText, Code, Archive, FolderClosed,
  FileSpreadsheet, Presentation, FileType,
} from 'lucide-react';

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

export const getFileCategory = (mimeType) => {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('msword')) return 'documents';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheets';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentations';
  if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return 'code';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('7z')) return 'archives';
  return 'other';
};

export const getFileIcon = (mimeType, size = 20) => {
  const category = getFileCategory(mimeType);
  const props = { size, strokeWidth: 1.5 };
  switch (category) {
    case 'images': return <Image {...props} className="file-icon-image" />;
    case 'videos': return <Video {...props} className="file-icon-video" />;
    case 'audio': return <Music {...props} className="file-icon-audio" />;
    case 'documents': return <FileText {...props} className="file-icon-document" />;
    case 'spreadsheets': return <FileSpreadsheet {...props} className="file-icon-document" />;
    case 'presentations': return <Presentation {...props} className="file-icon-document" />;
    case 'code': return <Code {...props} className="file-icon-code" />;
    case 'archives': return <Archive {...props} className="file-icon-archive" />;
    default: return <File {...props} className="file-icon-other" />;
  }
};

export const getFolderIcon = (color, size = 20) => {
  return <FolderClosed size={size} strokeWidth={1.5} style={{ color: color || '#3b82f6' }} />;
};

export const getExtensionFromName = (name) => {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

export const isPreviewable = (mimeType) => {
  if (!mimeType) return false;
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
};

export const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
