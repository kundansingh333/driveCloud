import { formatFileSize, formatDate, getFileIcon, getFolderIcon } from '../../utils/helpers';
import useUIStore from '../../store/uiStore';
import { MoreVertical } from 'lucide-react';
import { filesAPI } from '../../api';

export default function FileGrid({ files, folders, onFolderClick }) {
  const { openModal, showContextMenu, selectedItems, selectItem } = useUIStore();

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const handleFileClick = (file) => {
    openModal('preview', file);
  };

  return (
    <div className="file-grid">
      {folders.map((folder) => (
        <div
          key={folder._id}
          className={`file-card folder-card ${selectedItems.some((i) => i.id === folder._id) ? 'selected' : ''}`}
          onClick={() => onFolderClick(folder._id)}
          onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
        >
          <div className="file-card-icon folder-icon-large">
            {getFolderIcon(folder.color, 48)}
          </div>
          <div className="file-card-info">
            <div className="file-card-name" title={folder.name}>{folder.name}</div>
            <div className="file-card-meta">{formatDate(folder.updatedAt)}</div>
            <button className="context-menu-trigger" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, folder, 'folder'); }}>
              <MoreVertical size={16} />
            </button>
          </div>
          {folder.isStarred && <span className="star-badge">★</span>}
        </div>
      ))}

      {files.map((file) => (
        <div
          key={file._id}
          className={`file-card ${selectedItems.some((i) => i.id === file._id) ? 'selected' : ''}`}
          onClick={() => handleFileClick(file)}
          onContextMenu={(e) => handleContextMenu(e, file, 'file')}
        >
          <div className="file-card-preview">
            {file.mimeType?.startsWith('image/') ? (
              <img
                src={`${filesAPI.getThumbnail(file._id)}?token=${localStorage.getItem('accessToken')}`}
                alt={file.name}
                className="file-card-thumbnail"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="file-card-icon-wrapper" style={{ display: file.mimeType?.startsWith('image/') ? 'none' : 'flex' }}>
              {getFileIcon(file.mimeType, 40)}
            </div>
          </div>
          <div className="file-card-info">
            <div className="file-card-name" title={file.name}>{file.name}</div>
            <div className="file-card-meta">
              {formatFileSize(file.size)} · {formatDate(file.updatedAt)}
            </div>
            <button className="context-menu-trigger" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, file, 'file'); }}>
              <MoreVertical size={16} />
            </button>
          </div>
          {file.isStarred && <span className="star-badge">★</span>}
        </div>
      ))}

      <style>{`
        .file-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          animation: fadeIn var(--transition-normal) ease-out;
        }
        .file-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
          overflow: hidden;
          position: relative;
        }
        .file-card:hover {
          border-color: var(--border-secondary);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .file-card.selected {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
        }
        .file-card-preview {
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          position: relative;
          overflow: hidden;
        }
        .file-card-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .file-card-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .folder-card .file-card-icon {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .folder-icon-large {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .file-card-info {
          padding: 12px;
          position: relative;
        }
        .context-menu-trigger {
          position: absolute;
          right: 4px;
          bottom: 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .context-menu-trigger:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .file-card-name {
          font-size: 0.8125rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
          padding-right: 20px;
        }
        .file-card-meta {
          font-size: 0.6875rem;
          color: var(--text-muted);
          padding-right: 20px;
        }
        .star-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          color: var(--accent-amber);
          font-size: 0.875rem;
        }
        @media (max-width: 640px) {
          .file-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
          .file-card-preview { height: 100px; }
        }
      `}</style>
    </div>
  );
}
