import { useEffect, useRef } from 'react';
import { Download, Edit3, Trash2, Star, StarOff, Copy, Move, FolderOpen, Info, Link } from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useFileStore from '../../store/fileStore';
import { filesAPI, foldersAPI } from '../../api';
import toast from 'react-hot-toast';
import { triggerDownload } from '../../utils/helpers';

export default function ContextMenu() {
  const { contextMenu, hideContextMenu, openModal } = useUIStore();
  const { removeFileFromList, removeFolderFromList, updateFileInList, updateFolderInList } = useFileStore();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) hideContextMenu();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('contextmenu', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('contextmenu', handler);
    };
  }, [hideContextMenu]);

  if (!contextMenu) return null;

  const { x, y, item, type } = contextMenu;
  const isFile = type === 'file';

  const handleDownload = async () => {
    hideContextMenu();
    try {
      if (isFile) {
        const { data } = await filesAPI.download(item._id);
        triggerDownload(data, item.originalName || item.name);
      } else {
        const { data } = await foldersAPI.downloadZip(item._id);
        triggerDownload(data, `${item.name}.zip`);
      }
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleStar = async () => {
    hideContextMenu();
    try {
      const newStarred = !item.isStarred;
      if (isFile) {
        await filesAPI.update(item._id, { isStarred: newStarred });
        updateFileInList(item._id, { isStarred: newStarred });
      } else {
        await foldersAPI.update(item._id, { isStarred: newStarred });
        updateFolderInList(item._id, { isStarred: newStarred });
      }
      toast.success(newStarred ? 'Starred' : 'Unstarred');
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleTrash = () => {
    hideContextMenu();
    openModal('confirm', {
      title: `Move to Trash`,
      message: `Are you sure you want to move "${item.name}" to trash?`,
      confirmLabel: 'Move to Trash',
      onConfirm: async () => {
        try {
          if (isFile) {
            await filesAPI.delete(item._id);
            removeFileFromList(item._id);
          } else {
            await foldersAPI.delete(item._id);
            removeFolderFromList(item._id);
          }
          toast.success('Moved to trash');
        } catch {
          toast.error('Failed to delete');
        }
      },
    });
  };

  const handleRename = () => {
    hideContextMenu();
    openModal('rename', { item, type });
  };

  const handleMove = () => {
    hideContextMenu();
    openModal('move', { item, type });
  };

  const handleCopy = async () => {
    hideContextMenu();
    if (!isFile) return;
    try {
      const { data } = await filesAPI.copy(item._id, {});
      toast.success('File copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handlePreview = () => {
    hideContextMenu();
    if (isFile) openModal('preview', item);
  };

  const handleShare = () => {
    hideContextMenu();
    if (isFile) openModal('share', { item, type });
  };

  // Adjust position to stay within viewport
  const menuStyle = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 350),
  };

  return (
    <div className="context-menu" style={menuStyle} ref={ref}>
      {isFile && (
        <button className="context-menu-item" onClick={handlePreview}>
          <Info size={16} /> Preview
        </button>
      )}
      <button className="context-menu-item" onClick={handleDownload}>
        <Download size={16} /> Download {!isFile && 'ZIP'}
      </button>
      {isFile && (
        <button className="context-menu-item" onClick={handleShare}>
          <Link size={16} /> Share Link
        </button>
      )}
      <button className="context-menu-item" onClick={handleRename}>
        <Edit3 size={16} /> Rename
      </button>
      <button className="context-menu-item" onClick={handleMove}>
        <Move size={16} /> Move to
      </button>
      {isFile && (
        <button className="context-menu-item" onClick={handleCopy}>
          <Copy size={16} /> Make a copy
        </button>
      )}
      <button className="context-menu-item" onClick={handleStar}>
        {item.isStarred ? <StarOff size={16} /> : <Star size={16} />}
        {item.isStarred ? 'Remove star' : 'Add star'}
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" onClick={handleTrash}>
        <Trash2 size={16} /> Move to trash
      </button>
    </div>
  );
}
