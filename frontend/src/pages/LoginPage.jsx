import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { username, password });
      await login(res.data.token, res.data.user);
      
      // توجيه المستخدم بناءً على دوره (Role)
      if (res.data.user.role === 'DOCTOR') {
        navigate('/doctor');
      } else {
        navigate('/reception');
      }
    } catch (err) {
      setError(
        err.response?.data?.message
        || err.response?.data?.error?.message
        || err.message
        || 'فشل تسجيل الدخول'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container} dir="rtl">
      <div style={styles.card}>
        <h2 style={styles.title}>تسجيل الدخول</h2>
        <p style={styles.subtitle}>نظام إدارة المستوصف</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Styles بسيطة
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8' },
  card: { backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
  title: { textAlign: 'center', color: '#0f766e', marginBottom: '0.5rem', fontSize: '1.8rem' },
  subtitle: { textAlign: 'center', color: '#64748b', marginBottom: '1.5rem' },
  inputGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: '600' },
  input: { width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' },
  button: { width: '100%', padding: '0.75rem', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginTop: '0.5rem' },
  error: { backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }
};

export default LoginPage;
