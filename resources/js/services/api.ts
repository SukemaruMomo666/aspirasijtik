import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Aspirasi API
export const aspirasiAPI = {
  submit: (data: FormData) => apiClient.post('/aspirasi/submit', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStatus: (ticketCode: string) => apiClient.get(`/aspirasi/status/${ticketCode}`),
  getPublic: (page?: number) => apiClient.get('/aspirasi/public', { params: { page } }),
};

// Admin API
export const adminAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/admin/login', { email, password }),
  logout: () => apiClient.post('/admin/logout'),
  getAspirasi: (filters?: Record<string, any>) =>
    apiClient.get('/admin/aspirasi', { params: filters }),
  getAspirasiById: (id: number) => apiClient.get(`/admin/aspirasi/${id}`),
  downloadAttachment: (id: number, index: number) =>
    apiClient.get(`/admin/aspirasi/${id}/lampiran/${index}`, { responseType: 'blob' }),
  downloadReplyAttachment: (aspirasiId: number, replyId: number, index: number) =>
    apiClient.get(`/admin/aspirasi/${aspirasiId}/balasan/${replyId}/lampiran/${index}`, { responseType: 'blob' }),
  updateStatus: (id: number, status: string) =>
    apiClient.patch(`/admin/aspirasi/${id}/status`, { status }),
  togglePublic: (id: number, isPublic: boolean) =>
    apiClient.patch(`/admin/aspirasi/${id}/publik`, { is_publik: isPublic }),
  togglePrivate: (id: number, isPrivate: boolean) =>
    apiClient.patch(`/admin/aspirasi/${id}/privat`, { is_privat: isPrivate }),
  exportAspirasi: (filters?: Record<string, any>) =>
    apiClient.get('/admin/aspirasi-export', { params: filters, responseType: 'blob' }),
  reply: (id: number, data: FormData) =>
    apiClient.post(`/admin/aspirasi/${id}/balas`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStatistik: () => apiClient.get('/admin/statistik'),
  getProfile: () => apiClient.get('/admin/profile'),

  // User Management
  getUsers: (filters?: { search?: string; is_active?: string }) =>
    apiClient.get('/admin/users', { params: filters }),
  getUserById: (id: number) => apiClient.get(`/admin/users/${id}`),
  createUser: (data: { nama: string; email: string; password: string; is_active?: boolean }) =>
    apiClient.post('/admin/users', data),
  updateUser: (id: number, data: { nama: string; email: string; is_active: boolean }) =>
    apiClient.put(`/admin/users/${id}`, data),
  updateUserPassword: (id: number, password: string) =>
    apiClient.patch(`/admin/users/${id}/password`, { password }),
  toggleUserStatus: (id: number) =>
    apiClient.patch(`/admin/users/${id}/toggle-status`),
  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`),
};

// Kategori API
export const kategoriAPI = {
  getAll: () => apiClient.get('/kategori'),
};

// Captcha API
export const captchaAPI = {
  verify: (token: string) => apiClient.post('/auth/captcha-verify', { token }),
};
