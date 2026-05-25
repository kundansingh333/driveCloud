import { create } from 'zustand';

const useFileStore = create((set, get) => ({
  // Current folder
  currentFolder: null,
  breadcrumbs: [{ id: null, name: 'My Drive' }],
  
  // Contents
  files: [],
  folders: [],
  
  // Loading
  isLoading: false,
  
  // Upload queue
  uploads: [],
  
  setCurrentFolder: (folderId) => set({ currentFolder: folderId }),
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
  setContents: ({ files, folders, breadcrumbs }) => set({ files, folders, breadcrumbs, isLoading: false }),
  setLoading: (val) => set({ isLoading: val }),
  
  // Upload management
  addUpload: (upload) => set((s) => ({ uploads: [...s.uploads, upload] })),
  updateUpload: (id, updates) => set((s) => ({
    uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...updates } : u)),
  })),
  removeUpload: (id) => set((s) => ({
    uploads: s.uploads.filter((u) => u.id !== id),
  })),
  clearCompletedUploads: () => set((s) => ({
    uploads: s.uploads.filter((u) => u.status !== 'completed' && u.status !== 'error'),
  })),
  
  // File operations
  removeFileFromList: (fileId) => set((s) => ({
    files: s.files.filter((f) => f._id !== fileId),
  })),
  removeFolderFromList: (folderId) => set((s) => ({
    folders: s.folders.filter((f) => f._id !== folderId),
  })),
  addFileToList: (file) => set((s) => ({
    files: [file, ...s.files],
  })),
  addFolderToList: (folder) => set((s) => ({
    folders: [folder, ...s.folders],
  })),
  updateFileInList: (fileId, updates) => set((s) => ({
    files: s.files.map((f) => (f._id === fileId ? { ...f, ...updates } : f)),
  })),
  updateFolderInList: (folderId, updates) => set((s) => ({
    folders: s.folders.map((f) => (f._id === folderId ? { ...f, ...updates } : f)),
  })),
}));

export default useFileStore;
