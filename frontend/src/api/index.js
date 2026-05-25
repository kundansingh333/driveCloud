import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh-token', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: (data) => api.post('/auth/logout', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
};

// Files API
export const filesAPI = {
  upload: (formData, onProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  get: (id) => api.get(`/files/${id}`),
  download: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  downloadZip: (fileIds) => api.post('/files/download-zip', { fileIds }, { responseType: 'blob' }),
  update: (id, data) => api.put(`/files/${id}`, data),
  delete: (id, permanent = false) => api.delete(`/files/${id}?permanent=${permanent}`),
  copy: (id, data) => api.post(`/files/${id}/copy`, data),
  move: (id, data) => api.post(`/files/${id}/move`, data),
  restore: (id) => api.post(`/files/${id}/restore`),
  getThumbnail: (id) => `/api/files/${id}/thumbnail`,
  getContent: (id) => api.get(`/files/${id}/content`),
  serve: (id) => `/api/files/${id}/serve`,
  emptyTrash: () => api.delete('/files/trash/empty'),
};

// Folders API
export const foldersAPI = {
  create: (data) => api.post('/folders', data),
  get: (id) => api.get(`/folders/${id}`),
  getContents: (id, params) => api.get(`/folders/${id}/contents`, { params }),
  update: (id, data) => api.put(`/folders/${id}`, data),
  delete: (id, permanent = false) => api.delete(`/folders/${id}?permanent=${permanent}`),
  move: (id, data) => api.post(`/folders/${id}/move`, data),
  restore: (id) => api.post(`/folders/${id}/restore`),
  getTree: () => api.get('/folders/tree'),
  getStarred: () => api.get('/folders/starred'),
  getTrashed: () => api.get('/folders/trash'),
  getRecent: () => api.get('/folders/recent'),
  downloadZip: (id) => api.get(`/folders/${id}/download-zip`, { responseType: 'blob' }),
};

// Search API
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  suggestions: (q) => api.get('/search/suggestions', { params: { q } }),
};

// Storage API
export const storageAPI = {
  getUsage: () => api.get('/storage'),
  getBreakdown: () => api.get('/storage/breakdown'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  updatePreferences: (data) => api.put('/user/preferences', data),
  getActivity: (params) => api.get('/user/activity', { params }),
  changePassword: (data) => api.put('/user/password', data),
};

// Share API
export const shareAPI = {
  createLink: (fileId, data) => api.post(`/share/link/${fileId}`, data),
  revokeLink: (fileId) => api.delete(`/share/link/${fileId}`),
  getInfo: (linkId) => api.get(`/share/${linkId}`),
  download: (linkId, data) => api.post(`/share/${linkId}/download`, data, { responseType: 'blob' }),
  
  // Internal Sharing
  shareInternal: (data) => api.post('/share/internal', data),
  revokeInternal: (shareId) => api.delete(`/share/internal/${shareId}`),
  getItemShares: (itemType, itemId) => api.get(`/share/internal/${itemType}/${itemId}`),
  getSharedWithMe: () => api.get('/share/shared-with-me'),
};

export default api;
