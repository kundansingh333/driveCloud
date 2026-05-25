import { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Maximize2, Minimize2, Link } from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useFileStore from '../../store/fileStore';
import { filesAPI } from '../../api';
import { formatFileSize, formatDate, getFileIcon, isPreviewable, triggerDownload } from '../../utils/helpers';

export default function FilePreviewModal() {
  const { closeModal, modalData: file } = useUIStore();
  const { files } = useFileStore();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!file) return;
    loadContent();
  }, [file]);

  const loadContent = async () => {
    setLoading(true);
    try {
      if (file.mimeType?.startsWith('text/') || file.mimeType?.includes('json') || file.mimeType?.includes('javascript') || file.mimeType?.includes('xml')) {
        const { data } = await filesAPI.getContent(file._id);
        setContent({ type: 'text', data: data.content, extension: data.extension });
      } else {
        setContent({ type: file.mimeType?.split('/')[0] || 'other' });
      }
    } catch {
      setContent({ type: 'error' });
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    try {
      const { data } = await filesAPI.download(file._id);
      triggerDownload(data, file.originalName || file.name);
    } catch { /* ignore */ }
  };

  // Navigate between files
  const currentIndex = files.findIndex((f) => f._id === file?._id);
  const prevFile = currentIndex > 0 ? files[currentIndex - 1] : null;
  const nextFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  const navigateFile = (targetFile) => {
    if (targetFile) {
      useUIStore.getState().openModal('preview', targetFile);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft' && prevFile) navigateFile(prevFile);
      if (e.key === 'ArrowRight' && nextFile) navigateFile(nextFile);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, prevFile, nextFile]);

  if (!file) return null;

  const renderPreview = () => {
    if (loading) return <div className="preview-loading"><div className="skeleton" style={{ width: 200, height: 200 }} /></div>;
    if (content?.type === 'error') return <div className="preview-error"><p>Preview not available</p></div>;

    if (file.mimeType?.startsWith('image/')) {
      return <img src={`/api/files/${file._id}/serve?token=${localStorage.getItem('accessToken')}`} alt={file.name} className="preview-image" />;
    }

    if (file.mimeType?.startsWith('video/')) {
      return <video src={`/api/files/${file._id}/serve?token=${localStorage.getItem('accessToken')}`} controls className="preview-video" />;
    }

    if (file.mimeType?.startsWith('audio/')) {
      return (
        <div className="preview-audio">
          {getFileIcon(file.mimeType, 80)}
          <h3>{file.name}</h3>
          <audio src={`/api/files/${file._id}/serve?token=${localStorage.getItem('accessToken')}`} controls style={{ width: '100%', maxWidth: 400, marginTop: 20 }} />
        </div>
      );
    }

    if (file.mimeType === 'application/pdf') {
      return <iframe src={`/api/files/${file._id}/serve?token=${localStorage.getItem('accessToken')}`} className="preview-pdf" title={file.name} />;
    }

    if (content?.type === 'text') {
      return (
        <div className="preview-code">
          <pre><code>{content.data}</code></pre>
        </div>
      );
    }

    return (
      <div className="preview-unsupported">
        {getFileIcon(file.mimeType, 80)}
        <h3>{file.name}</h3>
        <p>Preview not available for this file type</p>
        <button className="btn btn-primary" onClick={handleDownload}>
          <Download size={16} /> Download
        </button>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className={`preview-modal ${fullscreen ? 'fullscreen' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-title">
            {getFileIcon(file.mimeType, 20)}
            <span>{file.name}</span>
          </div>
          <div className="preview-actions">
            <span className="preview-meta">{formatFileSize(file.size)} · {formatDate(file.updatedAt)}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleDownload} data-tooltip="Download">
              <Download size={18} />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { closeModal(); useUIStore.getState().openModal('share', { item: file, type: 'file' }); }} data-tooltip="Share">
              <Link size={18} />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="preview-body">
          {prevFile && (
            <button className="preview-nav preview-nav-prev" onClick={() => navigateFile(prevFile)}>
              <ChevronLeft size={24} />
            </button>
          )}
          {renderPreview()}
          {nextFile && (
            <button className="preview-nav preview-nav-next" onClick={() => navigateFile(nextFile)}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .preview-modal {
          width: 90vw;
          max-width: 1100px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          animation: scaleIn var(--transition-normal) ease-out;
          overflow: hidden;
        }
        .preview-modal.fullscreen { width: 100vw; max-width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-primary);
          gap: 12px;
        }
        .preview-title { display: flex; align-items: center; gap: 10px; font-size: 0.875rem; font-weight: 500; min-width: 0; }
        .preview-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preview-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .preview-meta { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
        .preview-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: auto;
          background: var(--bg-primary);
          min-height: 400px;
        }
        .preview-image { max-width: 100%; max-height: 100%; object-fit: contain; }
        .preview-video { max-width: 100%; max-height: 100%; }
        .preview-pdf { width: 100%; height: 100%; border: none; min-height: 600px; }
        .preview-code {
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 20px;
          background: var(--bg-primary);
        }
        .preview-code pre {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.8125rem;
          line-height: 1.6;
          color: var(--text-primary);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .preview-audio, .preview-unsupported {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          gap: 12px;
          color: var(--text-secondary);
        }
        .preview-loading { display: flex; align-items: center; justify-content: center; padding: 60px; }
        .preview-error { padding: 60px; text-align: center; color: var(--text-muted); }
        .preview-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-primary);
          z-index: 10;
          transition: all var(--transition-fast);
        }
        .preview-nav:hover { background: var(--bg-hover); }
        .preview-nav-prev { left: 16px; }
        .preview-nav-next { right: 16px; }
      `}</style>
    </div>
  );
}
