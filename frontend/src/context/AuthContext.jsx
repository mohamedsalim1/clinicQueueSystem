import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // لمنع وميض صفحة اللوجين عند عمل Refresh

  useEffect(() => {
    // التحقق مما إذا كان المستخدم مسجلاً الدخول عند فتح التطبيق
    const storedUser = localStorage.getItem('clinic_user');
    const storedToken = localStorage.getItem('clinic_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('clinic_token', token);
    localStorage.setItem('clinic_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user');
    setUser(null);
  };

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};