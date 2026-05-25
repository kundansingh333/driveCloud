import { create } from 'zustand';

const useUIStore = create((set) => ({
  // View mode
  viewMode: localStorage.getItem('viewMode') || 'grid',
  setViewMode: (mode) => {
    localStorage.setItem('viewMode', mode);
    set({ viewMode: mode });
  },

  // Theme
  theme: localStorage.getItem('theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Sort
  sortBy: localStorage.getItem('sortBy') || 'date_newest',
  setSortBy: (sort) => {
    localStorage.setItem('sortBy', sort);
    set({ sortBy: sort });
  },

  // Selection
  selectedItems: [],
  selectItem: (item) => set((s) => ({
    selectedItems: s.selectedItems.some((i) => i.id === item.id)
      ? s.selectedItems.filter((i) => i.id !== item.id)
      : [...s.selectedItems, item],
  })),
  selectAll: (items) => set({ selectedItems: items }),
  clearSelection: () => set({ selectedItems: [] }),

  // Context menu
  contextMenu: null,
  showContextMenu: (menu) => set({ contextMenu: menu }),
  hideContextMenu: () => set({ contextMenu: null }),

  // Modals
  activeModal: null,
  modalData: null,
  openModal: (modal, data = null) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Upload drawer
  uploadDrawerOpen: false,
  toggleUploadDrawer: () => set((s) => ({ uploadDrawerOpen: !s.uploadDrawerOpen })),
  openUploadDrawer: () => set({ uploadDrawerOpen: true }),
  closeUploadDrawer: () => set({ uploadDrawerOpen: false }),

  // Drag overlay
  isDragging: false,
  setDragging: (val) => set({ isDragging: val }),
}));

export default useUIStore;
