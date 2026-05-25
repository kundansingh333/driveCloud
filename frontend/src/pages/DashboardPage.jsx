import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { foldersAPI } from '../api';
import useFileStore from '../store/fileStore';
import useUIStore from '../store/uiStore';
import FileGrid from '../components/files/FileGrid';
import FileList from '../components/files/FileList';
import Breadcrumb from '../components/files/Breadcrumb';
import { FolderOpen } from 'lucide-react';

export default function DashboardPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { files, folders, breadcrumbs, isLoading, setContents, setLoading, setCurrentFolder } = useFileStore();
  const { viewMode, sortBy } = useUIStore();

  useEffect(() => {
    const targetFolder = folderId || 'root';
    setCurrentFolder(folderId || null);
    loadContents(targetFolder);
  }, [folderId, sortBy]);

  const loadContents = async (id) => {
    setLoading(true);
    try {
      const { data } = await foldersAPI.getContents(id, { sort: sortBy });
      setContents({
        files: data.files,
        folders: data.folders,
        breadcrumbs: data.breadcrumbs,
      });
    } catch {
      setContents({ files: [], folders: [], breadcrumbs: [{ id: null, name: 'My Drive' }] });
    }
  };

  const handleFolderClick = (fid) => {
    navigate(`/folder/${fid}`);
  };

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ width: 200, height: 20, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = files.length === 0 && folders.length === 0;

  return (
    <div className="animate-fade-in">
      <Breadcrumb breadcrumbs={breadcrumbs} />

      {isEmpty ? (
        <div className="empty-state">
          <FolderOpen size={80} strokeWidth={1} />
          <h3>No files yet</h3>
          <p>Drag and drop files here or use the Upload button to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <FileGrid files={files} folders={folders} onFolderClick={handleFolderClick} />
      ) : (
        <FileList files={files} folders={folders} onFolderClick={handleFolderClick} />
      )}
    </div>
  );
}
