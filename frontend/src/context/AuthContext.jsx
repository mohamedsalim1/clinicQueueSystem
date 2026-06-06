import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // بداية true لمنع الـ Flashing

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          // ✨ إذا فشل الطلب، فقط امسح التوكن ولا ترمي خطأ يكسر التطبيق
          console.warn('Session expired or invalid, logging out.');
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false); // انتهاء التحقق سواء نجح أو فشل
    };

    checkAuth();
  }, []);

  const login = async (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);