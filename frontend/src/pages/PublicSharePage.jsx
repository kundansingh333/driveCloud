import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { shareAPI } from '../api';
import { File as FileIcon, FileText, Image as ImageIcon, FileAudio, FileVideo, FileArchive, Download, Lock, Loader } from 'lucide-react';
import { formatFileSize } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function PublicSharePage() {
  const { linkId } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data } = await shareAPI.getInfo(linkId);
        setFileInfo(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Link is invalid or has expired');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [linkId]);

  const getIcon = (mimeType) => {
    if (!mimeType) return <FileIcon size={64} color="var(--accent-blue)" />;
    if (mimeType.startsWith('image/')) return <ImageIcon size={64} color="var(--accent-indigo)" />;
    if (mimeType.startsWith('video/')) return <FileVideo size={64} color="var(--accent-rose)" />;
    if (mimeType.startsWith('audio/')) return <FileAudio size={64} color="var(--accent-amber)" />;
    if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText size={64} color="var(--accent-blue)" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileArchive size={64} color="var(--text-secondary)" />;
    return <FileIcon size={64} color="var(--accent-blue)" />;
  };

  const handleDownload = async (e) => {
    e?.preventDefault();
    if (fileInfo?.isPasswordProtected && !password) {
      toast.error('Please enter the password to download');
      return;
    }
    
    setDownloading(true);
    try {
      const response = await shareAPI.download(linkId, { password });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileInfo.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (err) {
      if (err.response && err.response.data instanceof Blob) {
        // Parse blob error message
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || 'Download failed');
        } catch {
          toast.error('Download failed');
        }
      } else {
        toast.error('Download failed');
      }
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader size={40} className="spin" color="var(--accent-blue)" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
        <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: 40, borderRadius: 'var(--radius-lg)', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FileIcon size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 10 }}>Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ background: 'var(--bg-secondary)', padding: '40px 30px', borderRadius: 'var(--radius-xl)', maxWidth: 440, width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        
        <div style={{ display: 'inline-block', padding: 20, background: 'var(--bg-tertiary)', borderRadius: '20px', marginBottom: 24 }}>
          {getIcon(fileInfo.mimeType)}
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8, wordBreak: 'break-all' }}>{fileInfo.name}</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 30 }}>
          {formatFileSize(fileInfo.size)} • Shared via CloudDrive
        </div>

        <form onSubmit={handleDownload}>
          {fileInfo.isPasswordProtected && (
            <div style={{ marginBottom: 20, textAlign: 'left' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Lock size={14} /> Password Required
              </label>
              <input
                type="password"
                className="input"
                placeholder="Enter file password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: 8 }}
            disabled={downloading}
          >
            {downloading ? <Loader size={20} className="spin" /> : <Download size={20} />}
            {downloading ? 'Downloading...' : 'Download File'}
          </button>
        </form>
      </div>
    </div>
  );
}
