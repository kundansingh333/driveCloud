import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shareAPI } from '../api';
import useUIStore from '../store/uiStore';
import FileGrid from '../components/files/FileGrid';
import FileList from '../components/files/FileList';
import { Users, Loader2 } from 'lucide-react';

export default function SharedPage() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { viewMode } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSharedItems();
  }, []);

  const fetchSharedItems = async () => {
    setLoading(true);
    try {
      const { data } = await shareAPI.getSharedWithMe();
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Failed to fetch shared items', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={24} style={{ color: 'var(--accent-blue)' }} /> Shared with me
        </h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        </div>
      ) : files.length === 0 && folders.length === 0 ? (
        <div className="empty-state">
          <Users size={80} strokeWidth={1} />
          <h3>No shared items</h3>
          <p>Files and folders shared with you will appear here</p>
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Folders
              </h2>
              {viewMode === 'grid' ? (
                <FileGrid files={[]} folders={folders} onFolderClick={(id) => navigate(`/folder/${id}`)} />
              ) : (
                <FileList files={[]} folders={folders} onFolderClick={(id) => navigate(`/folder/${id}`)} />
              )}
            </div>
          )}

          {files.length > 0 && (
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Files
              </h2>
              {viewMode === 'grid' ? (
                <FileGrid files={files} folders={[]} />
              ) : (
                <FileList files={files} folders={[]} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
