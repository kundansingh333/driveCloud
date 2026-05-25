import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import useFileStore from '../../store/fileStore';
import useUIStore from '../../store/uiStore';
import { filesAPI } from '../../api';
import toast from 'react-hot-toast';

export default function UploadDropzone({ children }) {
  const { currentFolder, addUpload, updateUpload, addFileToList } = useFileStore();
  const { openUploadDrawer, isDragging, setDragging } = useUIStore();

  const processUpload = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    openUploadDrawer();

    const formData = new FormData();
    const uploadId = Date.now().toString();
    acceptedFiles.forEach((file) => formData.append('files', file));
    if (currentFolder) formData.append('parentFolder', currentFolder);

    addUpload({
      id: uploadId,
      files: acceptedFiles.map((f) => f.name),
      totalSize: acceptedFiles.reduce((s, f) => s + f.size, 0),
      progress: 0,
      status: 'uploading',
    });

    try {
      const { data } = await filesAPI.upload(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        updateUpload(uploadId, { progress });
      });

      updateUpload(uploadId, { status: 'completed', progress: 100 });
      data.files.forEach((f) => addFileToList(f));
      toast.success(`${data.files.length} file(s) uploaded!`);
    } catch (err) {
      updateUpload(uploadId, { status: 'error', error: err.response?.data?.message || 'Upload failed' });
      toast.error(err.response?.data?.message || 'Upload failed');
    }
  }, [currentFolder, addUpload, updateUpload, addFileToList, openUploadDrawer]);

  // Listen for programmatic upload trigger (from navbar button)
  useEffect(() => {
    const handler = (e) => processUpload(e.detail.files);
    window.addEventListener('triggerUpload', handler);
    return () => window.removeEventListener('triggerUpload', handler);
  }, [processUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processUpload,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setDragging(true),
    onDragLeave: () => setDragging(false),
    onDropAccepted: () => setDragging(false),
    onDropRejected: () => setDragging(false),
  });

  return (
    <div {...getRootProps()} className="upload-dropzone-wrapper">
      <input {...getInputProps()} />
      {children}
      {isDragActive && (
        <div className="upload-overlay animate-fade-in">
          <div className="upload-overlay-content">
            <Upload size={56} strokeWidth={1.5} />
            <h3>Drop files here to upload</h3>
            <p>Files will be uploaded to the current folder</p>
          </div>
        </div>
      )}

      <style>{`
        .upload-dropzone-wrapper { position: relative; min-height: 100%; }
        .upload-overlay {
          position: fixed;
          inset: 0;
          background: rgba(59, 130, 246, 0.1);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
          border: 3px dashed var(--accent-blue);
          margin: 8px;
          border-radius: var(--radius-xl);
        }
        .upload-overlay-content {
          text-align: center;
          color: var(--accent-blue);
        }
        .upload-overlay-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 16px;
          margin-bottom: 6px;
          color: var(--text-primary);
        }
        .upload-overlay-content p {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
