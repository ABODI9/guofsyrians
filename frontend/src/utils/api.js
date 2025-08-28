// src/utils/api.js
import axios from 'axios';
import { logNetworkError, getDeviceInfo } from './debugUtils.js';

/**
 * أثناء التطوير:
 * - لو بتستخدم Vite proxy: خلّي VITE_API_URL و VITE_API_URL_FOR_AUTH فاضية في .env
 * - لو تبغى ضرب مباشر: حط http://localhost:8000 أو :8222 حسب منفذ الباك
 */

const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').trim();
const RAW_AUTH = (import.meta.env.VITE_API_URL_FOR_AUTH ?? RAW_BASE).trim();

const API_BASE_URL  = RAW_BASE.replace(/\/+$/, '');
const AUTH_BASE_URL = RAW_AUTH.replace(/\/+$/, '');

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

const linesToList = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
};
const listToLines = (arr) => (Array.isArray(arr) ? arr.join('\n') : toStr(arr));

// موحِّد الاستجابة من السيرفر
// utils/api.js (أو أينما يوجد normalizeJob)
const normalizeJob = (j = {}) => {
  const id =
    j.id ??
    j._id ??
    (j._id && j._id.$oid) ??
    null;

  const toArray = (v) => Array.isArray(v) ? v.filter(Boolean) : [];

  return {
    id,
    title: j.title || '',
    company: j.company || '',
    location: j.location || '',
    employment_type: j.employment_type || j.type || 'full_time',
    workplace_type: j.workplace_type || j.workplace || 'onsite',
    description: j.description || '',
    responsibilities: toArray(j.responsibilities),
    requirements: toArray(j.requirements),
    benefits: toArray(j.benefits),
    application_url: j.application_url || '',
    max_applicants: Number.isFinite(j.max_applicants) ? j.max_applicants : 0,
    is_active: j.is_active ?? true,
    created_at: j.created_at ?? j.createdAt ?? null,
    owner_id: j.owner_id ?? '',
    // مفيد للتوافق:
    applicants_count: j.applicants_count ?? j.applications_count ?? j.applied_count ?? 0,
  };
};


// حوّل نموذج الواجهة (strings) إلى ما يتوقعه الباك (lists + أسماء الحقول الصحيحة)
const toJobCreatePayload = (form) => {
  const unlimited = form?.unlimited_applicants === true;
  const parsedMax = form?.max_applicants === '' || form?.max_applicants == null
    ? 0
    : Math.max(0, Number(form.max_applicants) || 0);

  return {
    title: toStr(form?.title).trim(),
    company: toStr(form?.company).trim() || null,
    location: toStr(form?.location).trim() || null,

    employment_type: form?.employment_type || 'full_time',
    workplace_type: form?.workplace_type || 'onsite',

    description: toStr(form?.description),

    responsibilities: linesToList(form?.responsibilities),
    requirements: linesToList(form?.requirements),
    benefits: linesToList(form?.benefits),

    application_url: toStr(form?.application_url).trim() || null,
    // “غير محدود” نمثّله بـ 0 (أسهل مع نوع int في الباك)
    max_applicants: unlimited ? 0 : parsedMax,

    is_active: toBool(form?.is_active),
  };
};

const toJobUpdatePayload = (form) => {
  const payload = {};
  if ('title' in form) payload.title = toStr(form.title).trim();
  if ('company' in form) payload.company = toStr(form.company).trim() || null;
  if ('location' in form) payload.location = toStr(form.location).trim() || null;

  if ('employment_type' in form) payload.employment_type = form.employment_type;
  if ('workplace_type' in form) payload.workplace_type = form.workplace_type;

  if ('description' in form) payload.description = toStr(form.description);

  if ('responsibilities' in form) payload.responsibilities = linesToList(form.responsibilities);
  if ('requirements' in form) payload.requirements = linesToList(form.requirements);
  if ('benefits' in form) payload.benefits = linesToList(form.benefits);

  if ('application_url' in form) payload.application_url = toStr(form.application_url).trim() || null;

  if ('unlimited_applicants' in form || 'max_applicants' in form) {
    const unlimited = form?.unlimited_applicants === true;
    const parsedMax = form?.max_applicants === '' || form?.max_applicants == null
      ? 0
      : Math.max(0, Number(form.max_applicants) || 0);
    // نخزن 0 لغير محدود لتوافق نوع int في الموديل
    payload.max_applicants = unlimited ? 0 : parsedMax;
  }

  if ('is_active' in form) payload.is_active = toBool(form.is_active);

  return payload;
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
    // يتطلب توكن أدمن (get_admin_user)
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
