import { useEffect, useState } from 'react';
import { foldersAPI, filesAPI } from '../api';
import useUIStore from '../store/uiStore';
import { formatFileSize, formatDate, getFileIcon, getFolderIcon, triggerDownload } from '../utils/helpers';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TrashPage() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openModal } = useUIStore();

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const { data } = await foldersAPI.getTrashed();
      setFiles(data.files);
      setFolders(data.folders);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleRestore = async (item, type) => {
    try {
      if (type === 'file') {
        await filesAPI.restore(item._id);
        setFiles((prev) => prev.filter((f) => f._id !== item._id));
      } else {
        await foldersAPI.restore(item._id);
        setFolders((prev) => prev.filter((f) => f._id !== item._id));
      }
      toast.success('Restored');
    } catch {
      toast.error('Restore failed');
    }
  };

  const handlePermanentDelete = (item, type) => {
    openModal('confirm', {
      title: 'Permanently delete?',
      message: `"${item.name}" will be deleted forever. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      onConfirm: async () => {
        try {
          if (type === 'file') {
            await filesAPI.delete(item._id, true);
            setFiles((prev) => prev.filter((f) => f._id !== item._id));
          } else {
            await foldersAPI.delete(item._id, true);
            setFolders((prev) => prev.filter((f) => f._id !== item._id));
          }
          toast.success('Permanently deleted');
        } catch {
          toast.error('Delete failed');
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    openModal('confirm', {
      title: 'Empty trash?',
      message: 'All items in trash will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Empty trash',
      onConfirm: async () => {
        try {
          await filesAPI.emptyTrash();
          setFiles([]);
          setFolders([]);
          toast.success('Trash emptied');
        } catch {
          toast.error('Failed to empty trash');
        }
      },
    });
  };

  const isEmpty = files.length === 0 && folders.length === 0;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trash2 size={22} /> Trash
        </h2>
        {!isEmpty && (
          <button className="btn btn-danger btn-sm" onClick={handleEmptyTrash}>Empty trash</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 50 }} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="empty-state">
          <Trash2 size={80} strokeWidth={1} />
          <h3>Trash is empty</h3>
          <p>Items you delete will appear here for 30 days before being permanently removed</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {folders.map((folder) => (
            <div key={folder._id} className="trash-item">
              <div className="trash-item-info">
                {getFolderIcon(folder.color, 20)}
                <span>{folder.name}</span>
                <span className="trash-date">Deleted {formatDate(folder.trashedAt)}</span>
              </div>
              <div className="trash-item-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(folder, 'folder')} title="Restore">
                  <RotateCcw size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handlePermanentDelete(folder, 'folder')} title="Delete forever" style={{ color: 'var(--accent-rose)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {files.map((file) => (
            <div key={file._id} className="trash-item">
              <div className="trash-item-info">
                {getFileIcon(file.mimeType, 20)}
                <span>{file.name}</span>
                <span className="trash-meta">{formatFileSize(file.size)}</span>
                <span className="trash-date">Deleted {formatDate(file.trashedAt)}</span>
              </div>
              <div className="trash-item-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(file, 'file')} title="Restore">
                  <RotateCcw size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handlePermanentDelete(file, 'file')} title="Delete forever" style={{ color: 'var(--accent-rose)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .trash-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }
        .trash-item:hover { background: var(--bg-hover); }
        .trash-item-info { display: flex; align-items: center; gap: 10px; font-size: 0.8125rem; min-width: 0; flex: 1; }
        .trash-item-info span:first-of-type { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .trash-meta { color: var(--text-muted); font-size: 0.75rem; flex-shrink: 0; }
        .trash-date { color: var(--text-muted); font-size: 0.75rem; flex-shrink: 0; }
        .trash-item-actions { display: flex; gap: 4px; flex-shrink: 0; opacity: 0; transition: opacity var(--transition-fast); }
        .trash-item:hover .trash-item-actions { opacity: 1; }
      `}</style>
    </div>
  );
}
