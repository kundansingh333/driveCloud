import { formatFileSize, formatDate, getFileIcon, getFolderIcon } from '../../utils/helpers';
import useUIStore from '../../store/uiStore';
import { MoreVertical } from 'lucide-react';

export default function FileList({ files, folders, onFolderClick }) {
  const { openModal, showContextMenu, selectedItems } = useUIStore();

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  return (
    <div className="file-list animate-fade-in">
      <div className="file-list-header">
        <div className="fl-col fl-name">Name</div>
        <div className="fl-col fl-size">Size</div>
        <div className="fl-col fl-modified">Modified</div>
        <div className="fl-col fl-action"></div>
      </div>

      {folders.map((folder) => (
        <div
          key={folder._id}
          className={`file-list-row ${selectedItems.some((i) => i.id === folder._id) ? 'selected' : ''}`}
          onClick={() => onFolderClick(folder._id)}
          onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
        >
          <div className="fl-col fl-name">
            <span className="fl-icon">{getFolderIcon(folder.color, 20)}</span>
            <span className="fl-label">{folder.name}</span>
            {folder.isStarred && <span className="star-badge-sm">★</span>}
          </div>
          <div className="fl-col fl-size">—</div>
          <div className="fl-col fl-modified">{formatDate(folder.updatedAt)}</div>
          <div className="fl-col fl-action">
            <button className="list-menu-trigger" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, folder, 'folder'); }}>
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      ))}

      {files.map((file) => (
        <div
          key={file._id}
          className={`file-list-row ${selectedItems.some((i) => i.id === file._id) ? 'selected' : ''}`}
          onClick={() => openModal('preview', file)}
          onContextMenu={(e) => handleContextMenu(e, file, 'file')}
        >
          <div className="fl-col fl-name">
            <span className="fl-icon">{getFileIcon(file.mimeType, 20)}</span>
            <span className="fl-label">{file.name}</span>
            {file.isStarred && <span className="star-badge-sm">★</span>}
          </div>
          <div className="fl-col fl-size">{formatFileSize(file.size)}</div>
          <div className="fl-col fl-modified">{formatDate(file.updatedAt)}</div>
          <div className="fl-col fl-action">
            <button className="list-menu-trigger" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, file, 'file'); }}>
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      ))}

      <style>{`
        .file-list { border: 1px solid var(--border-primary); border-radius: var(--radius-lg); overflow: hidden; }
        .file-list-header {
          display: grid;
          grid-template-columns: 1fr 100px 140px 40px;
          padding: 10px 16px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-primary);
        }
        .file-list-row {
          display: grid;
          grid-template-columns: 1fr 100px 140px 40px;
          padding: 10px 16px;
          align-items: center;
          cursor: pointer;
          transition: background var(--transition-fast);
          border-bottom: 1px solid var(--border-primary);
        }
        .file-list-row:last-child { border-bottom: none; }
        .file-list-row:hover { background: var(--bg-hover); }
        .file-list-row.selected { background: var(--bg-active); }
        .fl-col { font-size: 0.8125rem; }
        .fl-name { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .fl-icon { flex-shrink: 0; display: flex; }
        .fl-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fl-size, .fl-modified { color: var(--text-secondary); }
        .star-badge-sm { color: var(--accent-amber); font-size: 0.75rem; flex-shrink: 0; }
        .fl-action { display: flex; justify-content: flex-end; }
        .list-menu-trigger {
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
        .list-menu-trigger:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        @media (max-width: 640px) {
          .file-list-header, .file-list-row { grid-template-columns: 1fr 80px 40px; }
          .fl-modified { display: none; }
        }
      `}</style>
    </div>
  );
}
