// src/utils/api.js
import axios from 'axios';
import { logNetworkError, getDeviceInfo } from './debugUtils.js';

// ===== Base URLs =====
const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').trim();
const RAW_AUTH = (import.meta.env.VITE_API_URL_FOR_AUTH ?? RAW_BASE).trim();
const API_BASE_URL  = RAW_BASE.replace(/\/+$/, '');
const AUTH_BASE_URL = RAW_AUTH.replace(/\/+$/, '');

// ===== Axios instances =====
const formApi = axios.create({
  baseURL: API_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const api = axios.create({
  baseURL: AUTH_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ===== Interceptors =====
const addAuthInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );
};

const addResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    (r) => r,
    (error) => {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data,
        deviceInfo: getDeviceInfo(),
      });
      if (!error.response) logNetworkError(error);
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(api);
addResponseInterceptor(api);
addResponseInterceptor(formApi);

// ===== Helpers =====
const withSlash = (p) => (p.endsWith('/') ? p : `${p}/`);
const toStr  = (v) => (v == null ? '' : String(v));
const toBool = (v) => !!v;

// تحويل textarea multi-line إلى Array<string>
const linesToList = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  return String(v)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
};

// عكسها: Array<string> إلى نص لعرضه في textarea
const listToLines = (arr) => {
  if (!Array.isArray(arr)) return toStr(arr);
  return arr.map(x => String(x).trim()).filter(Boolean).join('\n');
};

// لو عندك select قديم يرجّع snake_case، خلّينا نطبّع
const normalizeEmployment = (v) => ({
  'full_time': 'full_time',
  'part_time': 'part_time',
  'contract': 'contract',
  'internship': 'internship',
  'temporary': 'temporary',
  'freelance': 'freelance',
  'other': 'other',
  'full-time': 'full_time',
  'part-time': 'part_time',
}[v] || 'full_time');

const normalizeWorkplace = (v) => ({
  'onsite': 'onsite',
  'remote': 'remote',
  'hybrid': 'hybrid',
}[v] || 'onsite');

// ===== Payload mappers (مهم) =====
const toJobCreatePayload = (form) => {
  return {
    title: toStr(form?.title).trim(),
    company: toStr(form?.company).trim() || null,
    location: toStr(form?.location).trim() || null,

    // هذه الحقول يتوقعها الباك كـ Literal
    employment_type: normalizeEmployment(form?.employment_type),
    workplace_type: normalizeWorkplace(form?.workplace_type),

    description: toStr(form?.description),

    // أهم نقطة: لازم تكون Array<string>
    responsibilities: linesToList(form?.responsibilities),
    requirements:     linesToList(form?.requirements),
    benefits:         linesToList(form?.benefits),

    application_url: toStr(form?.application_url).trim() || null,
    max_applicants: Number.isFinite(+form?.max_applicants) ? +form.max_applicants : 0,

    is_active: toBool(form?.is_active),
  };
};

const toJobUpdatePayload = (form) => {
  // PATCH: ابعث فقط القيم المعبّأة
  const out = {};
  if (form?.title != null) out.title = toStr(form.title).trim();
  if (form?.company != null) out.company = toStr(form.company).trim() || null;
  if (form?.location != null) out.location = toStr(form.location).trim() || null;

  if (form?.employment_type != null) out.employment_type = normalizeEmployment(form.employment_type);
  if (form?.workplace_type != null)  out.workplace_type  = normalizeWorkplace(form.workplace_type);

  if (form?.description != null) out.description = toStr(form.description);

  if (form?.responsibilities != null) out.responsibilities = linesToList(form.responsibilities);
  if (form?.requirements != null)     out.requirements     = linesToList(form.requirements);
  if (form?.benefits != null)         out.benefits         = linesToList(form.benefits);

  if (form?.application_url != null) out.application_url = toStr(form.application_url).trim() || null;
  if (form?.max_applicants != null)  out.max_applicants  = Number.isFinite(+form.max_applicants) ? +form.max_applicants : 0;

  if (form?.is_active != null) out.is_active = toBool(form.is_active);

  return out;
};

// توحيد ناتج السيرفر كي نعرضه بسهولة في الواجهة (textarea)
const normalizeJob = (j) => {
  if (!j) return null;
  return {
    id: j.id ?? j._id ?? null,
    title: j.title || '',
    company: j.company || '',
    location: j.location || '',

    employment_type: j.employment_type || 'full_time',
    workplace_type:  j.workplace_type  || 'onsite',

    description: j.description || '',

    responsibilities: listToLines(j.responsibilities || []),
    requirements:     listToLines(j.requirements     || []),
    benefits:         listToLines(j.benefits         || []),

    application_url: j.application_url || '',
    max_applicants: typeof j.max_applicants === 'number' ? j.max_applicants : 0,

    is_active: j.is_active ?? true,
    created_at: j.created_at ?? j.createdAt ?? null,
    owner_id: j.owner_id ?? '',
  };
};

// ===== Auth =====
export const authAPI = {
  login: async (credentials) =>
    (await api.post('/api/auth/login-json', credentials)).data,
  register: async (userData) =>
    (await api.post('/api/auth/register', userData)).data,
  getCurrentUser: async () =>
    (await api.get('/api/auth/me')).data,
  updateProfile: async (userData) =>
    (await api.put('/api/auth/me', userData)).data,
  changePassword: async (passwordData) =>
    (await api.put('/api/auth/change-password', passwordData)).data,
};

// ===== Users (Admin) =====
export const userAPI = {
  createUser: async (userData) =>
    (await api.post('/api/auth/admin/users', userData)).data,
  getAllUsers: async (skip = 0, limit = 100) =>
    (await api.get(`/api/auth/users?skip=${skip}&limit=${limit}`)).data,
  getUserById: async (userId) =>
    (await api.get(`/api/auth/users/${userId}`)).data,
  updateUser: async (userId, userData) =>
    (await api.put(`/api/auth/users/${userId}`, userData)).data,
  deleteUser: async (userId) =>
    (await api.delete(`/api/auth/users/${userId}`)).data,
  verifyUser: async (userId) =>
    (await api.put(`/api/auth/users/${userId}/verify`)).data,
  deactivateUser: async (userId) =>
    (await api.put(`/api/auth/users/${userId}/deactivate`)).data,
};

// ===== Jobs =====
export const jobsAPI = {
  list: async (params = {}) => {
    const res = await api.get(withSlash('/api/jobs'), { params });
    const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
    return data.map(normalizeJob);
  },

  get: async (id) => {
    const res = await api.get(withSlash(`/api/jobs/${id}`));
    return normalizeJob(res.data);
  },

  create: async (formLike) => {
    const payload = toJobCreatePayload(formLike);
    const res = await api.post(withSlash('/api/jobs'), payload);
    return normalizeJob(res.data);
  },

  update: async (id, formLike) => {
    const payload = toJobUpdatePayload(formLike);
    const res = await api.patch(withSlash(`/api/jobs/${id}`), payload);
    return normalizeJob(res.data);
  },

  remove: async (id) =>
    (await api.delete(withSlash(`/api/jobs/${id}`))).data,
};

export { formApi };
export default api;
