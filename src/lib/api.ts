import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register:       (data: any)      => api.post('/auth/register', data),
  login:          (data: any)      => api.post('/auth/login', data),
  getMe:          ()               => api.get('/auth/me'),
  forgotPassword: (email: string)  => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data: any)      => api.post('/auth/reset-password', data),
  verifyEmail:    (token: string)  => api.get(`/auth/verify-email?token=${token}`),

  get2FAStatus:          ()                                 => api.get('/auth/2fa/status'),
  setup2FA:              ()                                 => api.get('/auth/2fa/setup'),
  confirm2FA:            (otp: string)                      => api.post('/auth/2fa/confirm', { otp }),
  verify2FALogin:        (otp: string, backupCode?: string) => api.post('/auth/2fa/verify-login', { otp, backupCode }),
  disable2FA:            (otp: string, password: string)    => api.post('/auth/2fa/disable', { otp, password }),
  regenerateBackupCodes: (otp: string)                      => api.post('/auth/2fa/regenerate-backup', { otp }),
};

export const accountApi = {
  getOverview:       ()                                                        => api.get('/account/overview'),
  updateProfile:     (data: { firstName: string; lastName: string })           => api.patch('/account/profile', data),
  updateEmail:       (data: { newEmail: string; password: string })            => api.patch('/account/email', data),
  changePassword:    (data: { currentPassword: string; newPassword: string })  => api.patch('/account/password', data),
  uploadAvatar:      (formData: FormData)                                      => api.post('/account/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteAvatar:      ()                                        => api.delete('/account/avatar'),
  getSessions:       ()                                        => api.get('/account/sessions'),
  revokeSession:     (sessionId: string)                       => api.delete(`/account/sessions/${sessionId}`),
  revokeAllSessions: ()                                        => api.delete('/account/sessions'),
  deleteAccount:     (data: { password: string; confirmation: string }) => api.delete('/account/delete', { data }),
};

// ── Recycle Bin ───────────────────────────────────────────────────────────────
export const trashApi = {
  getTrash:        ()             => api.get('/trash'),
  getCount:        ()             => api.get('/trash/count'),
  restoreFile:     (id: string)   => api.post(`/trash/${id}/restore`),
  restoreAll:      ()             => api.post('/trash/restore-all'),
  permanentDelete: (id: string)   => api.delete(`/trash/${id}`),
  emptyTrash:      ()             => api.delete('/trash/empty'),
};

export const packagesApi = {
  getAll:  ()                         => api.get('/packages'),
  getById: (id: string)               => api.get(`/packages/${id}`),
  create:  (data: any)                => api.post('/packages', data),
  update:  (id: string, data: any)    => api.put(`/packages/${id}`, data),
  delete:  (id: string)               => api.delete(`/packages/${id}`),
};

export const subscriptionApi = {
  getHistory:      ()                  => api.get('/users/subscriptions'),
  getActive:       ()                  => api.get('/users/subscriptions/active'),
  selectPackage:   (packageId: string) => api.post('/users/subscriptions/select', { packageId }),
  getStorageStats: ()                  => api.get('/users/storage-stats'),
};

export const folderApi = {
  getAll:        (parentId?: string)                         => api.get('/folders', { params: { parentId } }),
  getAllFlat:     ()                                          => api.get('/folders/all'),
  getById:       (id: string)                                => api.get(`/folders/${id}`),
  getBreadcrumb: (id: string)                                => api.get(`/folders/${id}/breadcrumb`),
  create:        (data: { name: string; parentId?: string }) => api.post('/folders', data),
  rename:        (id: string, name: string)                  => api.patch(`/folders/${id}/rename`, { name }),
  delete:        (id: string)                                => api.delete(`/folders/${id}`),
  toggleStar:    (id: string)                                => api.patch(`/folders/${id}/star`),
  getStarred:    ()                                          => api.get('/folders/starred'),
};

export const fileApi = {
  getAll:      (params?: { fileType?: string; search?: string }) => api.get('/files', { params }),
  getInFolder: (folderId: string)                               => api.get(`/files/folder/${folderId}`),
  getById:     (id: string)                                     => api.get(`/files/${id}`),
  upload:      (formData: FormData)                             => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  rename:      (id: string, name: string)                       => api.patch(`/files/${id}/rename`, { name }),
  delete:      (id: string)                                     => api.delete(`/files/${id}`),
  move:        (id: string, targetFolderId: string)             => api.patch(`/files/${id}/move`, { targetFolderId }),
  bulkDelete:  (fileIds: string[])                              => api.post('/files/bulk-delete', { fileIds }),
  bulkMove:    (fileIds: string[], targetFolderId: string)      => api.post('/files/bulk-move', { fileIds, targetFolderId }),
  toggleStar:  (id: string)                                     => api.patch(`/files/${id}/star`),
  getStarred:  ()                                               => api.get('/files/starred'),

  getVersions:    (fileId: string)             => api.get(`/files/${fileId}/versions`),
  uploadVersion:  (fileId: string, fd: FormData) => api.post(`/files/${fileId}/versions`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  restoreVersion: (fileId: string, versionId: string) => api.post(`/files/${fileId}/versions/${versionId}/restore`),
  deleteVersion:  (fileId: string, versionId: string) => api.delete(`/files/${fileId}/versions/${versionId}`),

  getDownloadUrl: (id: string) => `${API_URL}/files/${id}/download`,
  getPreviewUrl:  (id: string) => `${API_URL}/files/${id}/preview`,
};

export const adminApi = {
  getDashboard:       ()                                          => api.get('/admin/dashboard'),
  getSystemAnalytics: ()                                          => api.get('/admin/analytics'),
  getUsers:           (params?: any)                             => api.get('/admin/users', { params }),
  getUserDetails:     (id: string)                               => api.get(`/admin/users/${id}`),
  getStorageDetails:  (userId: string)                           => api.get(`/admin/users/${userId}/storage`),
  changeUserPlan:     (userId: string, packageId: string)        => api.patch(`/admin/users/${userId}/plan`, { packageId }),
  toggleSuspend:      (userId: string, reason?: string)          => api.patch(`/admin/users/${userId}/suspend`, { reason }),
  resetPassword:      (userId: string, newPassword: string)      => api.post(`/admin/users/${userId}/reset-password`, { newPassword }),
  getUserPayments:    (userId: string)                           => api.get(`/admin/users/${userId}/payments`),
  getRevenueOverview: ()                                         => api.get('/admin/revenue/overview'),
  getPaymentHistory:  (params?: any)                             => api.get('/admin/revenue/payments', { params }),
  getFailedPayments:  (params?: any)                             => api.get('/admin/revenue/failed', { params }),
  getUserActivity: (userId: string, params?: any) => api.get(`/activity/admin/${userId}`, { params }),
exportUserCSV:   (userId: string, params?: any) => api.get(`/activity/admin/${userId}/export`, { params, responseType: 'blob' }),
};

export const paymentApi = {
  createSession:        (packageId: string) => api.post('/payments/create-session', { packageId }),
  verifyPayment:        (sessionId: string) => api.get(`/payments/verify?sessionId=${sessionId}`),
  activateSubscription: (sessionId: string) => api.post('/payments/activate', { sessionId }),
};

export const shareApi = {
  create:       (data: { fileId: string; expiryHours: string; password?: string }) =>
    api.post('/shares/create', data),
  getFileShare: (fileId: string)  => api.get(`/shares/file/${fileId}`),
  revoke:       (fileId: string)  => api.delete(`/shares/file/${fileId}`),
  getPublicInfo:(token: string)   => axios.get(`${API_URL}/shares/public/${token}`),
  accessFile:   (token: string, password?: string, action?: string) => {
    const params = new URLSearchParams();
    if (password) params.append('password', password);
    if (action)   params.append('action', action);
    return `${API_URL}/shares/public/${token}/access?${params.toString()}`;
  },
};

// ── Activity Log ──────────────────────────────────────────────────────────────
export const activityApi = {
  getMyActivity:   (params?: { page?: number; action?: string; entityType?: string; from?: string; to?: string; search?: string }) =>
    api.get('/activity', { params }),
  exportMyCSV:     (params?: any) =>
    api.get('/activity/export', { params, responseType: 'blob' }),
  // Admin
  getUserActivity: (userId: string, params?: any) =>
    api.get(`/activity/admin/${userId}`, { params }),
  exportUserCSV:   (userId: string, params?: any) =>
    api.get(`/activity/admin/${userId}/export`, { params, responseType: 'blob' }),
};

// ── Comments & Notes ──────────────────────────────────────────────────────────
