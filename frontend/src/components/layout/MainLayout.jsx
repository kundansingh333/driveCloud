import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import UploadDropzone from '../upload/UploadDropzone';
import UploadQueue from '../upload/UploadQueue';
import ContextMenu from '../shared/ContextMenu';
import FilePreviewModal from '../modals/FilePreviewModal';
import ConfirmModal from '../modals/ConfirmModal';
import RenameModal from '../modals/RenameModal';
import NewFolderModal from '../modals/NewFolderModal';
import MoveModal from '../modals/MoveModal';
import ShareModal from '../modals/ShareModal';
import useUIStore from '../../store/uiStore';

export default function MainLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const activeModal = useUIStore((s) => s.activeModal);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main" style={{ marginLeft: sidebarOpen ? 'var(--sidebar-width)' : '0' }}>
        <Navbar />
        <main className="app-content">
          <UploadDropzone>
            <Outlet />
          </UploadDropzone>
        </main>
      </div>
      <UploadQueue />
      <ContextMenu />
      {activeModal === 'preview' && <FilePreviewModal />}
      {activeModal === 'confirm' && <ConfirmModal />}
      {activeModal === 'rename' && <RenameModal />}
      {activeModal === 'newFolder' && <NewFolderModal />}
      {activeModal === 'move' && <MoveModal />}
      {activeModal === 'share' && <ShareModal />}

      <style>{`
        .app-layout { display: flex; min-height: 100vh; }
        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          transition: margin-left var(--transition-normal);
          min-width: 0;
        }
        .app-content {
          flex: 1;
          padding: 24px;
          padding-top: calc(var(--navbar-height) + 24px);
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .app-main { margin-left: 0 !important; }
          .app-content { padding: 16px; padding-top: calc(var(--navbar-height) + 16px); }
        }
      `}</style>
    </div>
  );
}
