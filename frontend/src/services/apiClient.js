import axios from 'axios';

// Helper to determine backend URL
const getBackendUrl = () => {
  // If explicitly set
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  
  // If running in Tauri desktop app, backend is locally hosted
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return 'http://localhost:3000';
  }
  
  // Web Host Mode (LAN access)
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  
  return 'http://localhost:3000';
};

const API_BASE_URL = `${getBackendUrl()}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

//   Interceptor لإرفاق الـ Token بكل طلب
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clinic_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

//   Interceptor لطرد المستخدم إذا كان الـ Token غير صالح (401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
      // إعادة التوجيه لصفحة تسجيل الدخول إذا لم يكن فيها بالفعل
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    console.error('[API Error]:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;