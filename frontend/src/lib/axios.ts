import axios from 'axios';
import { toast } from '@/stores/use-toast-store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    // 处理 HTTP 200 但业务错误的情况（code 非 200）
    if (data && typeof data.code === 'number' && data.code !== 200) {
      const msg = data.message || '请求失败';
      toast(msg);
      return Promise.reject({ response, message: msg, code: data.code });
    }
    return data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      const msg = error.response?.data?.message || error.message || '网络请求失败';
      toast(msg);
    }
    return Promise.reject(error);
  }
);

export default api;
