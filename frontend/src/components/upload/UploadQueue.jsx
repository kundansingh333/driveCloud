import { ChevronDown, ChevronUp, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import useFileStore from '../../store/fileStore';
import useUIStore from '../../store/uiStore';
import { formatFileSize } from '../../utils/helpers';
import { useState } from 'react';

export default function UploadQueue() {
  const { uploads, removeUpload, clearCompletedUploads } = useFileStore();
  const { uploadDrawerOpen, toggleUploadDrawer, closeUploadDrawer } = useUIStore();
  const [minimized, setMinimized] = useState(false);

  if (uploads.length === 0) return null;

  const activeCount = uploads.filter((u) => u.status === 'uploading').length;
  const completedCount = uploads.filter((u) => u.status === 'completed').length;

  return (
    <div className={`upload-queue ${minimized ? 'minimized' : ''}`}>
      <div className="uq-header" onClick={() => setMinimized(!minimized)}>
        <div className="uq-header-info">
          {activeCount > 0 ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading {activeCount} file(s)...</>
          ) : (
            <><Check size={16} style={{ color: 'var(--accent-emerald)' }} /> {completedCount} upload(s) complete</>
          )}
        </div>
        <div className="uq-header-actions">
          {completedCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); clearCompletedUploads(); }}>Clear</button>
          )}
          <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}>
            {minimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="uq-list">
          {uploads.map((upload) => (
            <div key={upload.id} className="uq-item">
              <div className="uq-item-info">
                <div className="uq-item-name">{upload.files?.join(', ') || 'Files'}</div>
                <div className="uq-item-meta">
                  {upload.status === 'uploading' && `${upload.progress}% · ${formatFileSize(upload.totalSize)}`}
                  {upload.status === 'completed' && 'Completed'}
                  {upload.status === 'error' && (upload.error || 'Failed')}
                </div>
              </div>
              <div className="uq-item-status">
                {upload.status === 'uploading' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />}
                {upload.status === 'completed' && <Check size={16} style={{ color: 'var(--accent-emerald)' }} />}
                {upload.status === 'error' && <AlertCircle size={16} style={{ color: 'var(--accent-rose)' }} />}
              </div>
              {upload.status === 'uploading' && (
                <div className="progress-bar" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 0 }}>
                  <div className="progress-bar-fill" style={{ width: `${upload.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .upload-queue {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 380px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 400;
          animation: slideUp var(--transition-slow) ease-out;
          overflow: hidden;
        }
        .upload-queue.minimized { width: 320px; }
        .uq-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-primary);
        }
        .uq-header-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .uq-header-actions { display: flex; align-items: center; gap: 4px; }
        .uq-list { max-height: 300px; overflow-y: auto; }
        .uq-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-primary);
          position: relative;
        }
        .uq-item:last-child { border-bottom: none; }
        .uq-item-info { flex: 1; min-width: 0; }
        .uq-item-name { font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .uq-item-meta { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; }
        @media (max-width: 640px) { .upload-queue { left: 10px; right: 10px; width: auto; bottom: 10px; } }
      `}</style>
    </div>
  );
}
