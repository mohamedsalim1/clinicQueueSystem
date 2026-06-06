import axios from 'axios';
import { getApiBaseURL } from '../config/network';

// تحديد الـ Base URL بشكل ديناميكي
const apiClient = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✨ Request Interceptor: إرفاق الـ Token بكل طلب قبل إرساله
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✨ Response Interceptor: اعتراض أخطاء 401 عالمياً
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // تجنب الحلقة اللانهائية: لا تقم بتسجيل الخروج إذا كان الطلب نفسه هو لتسجيل الدخول
      if (error.config.url !== '/auth/login' && error.config.url !== '/auth/me') {
        // مسح البيانات وإعادة التوجيه لتسجيل الدخول
        localStorage.removeItem('token');
        // استخدام window.location لتجاوز React Router إذا لزم الأمر
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
