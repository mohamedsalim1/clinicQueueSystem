export const DEFAULT_HOST = cleanHost(
  import.meta.env.VITE_DEFAULT_HOST
  || import.meta.env.VITE_HOST_IP
  || import.meta.env.VITE_API_URL
  || '192.168.1.120'
);

export function cleanHost(value = '') {
  return String(value)
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export function getBrowserHostCandidate() {
  if (typeof window === 'undefined') return '';

  const { hostname, protocol } = window.location;
  const isLocalHost = ['localhost', '127.0.0.1', ''].includes(hostname);

  if (!protocol.startsWith('http') || isLocalHost) return '';
  return hostname;
}

export function getLocalHttpOrigin() {
  if (typeof window === 'undefined') return '';

  const { hostname, protocol } = window.location;
  const isLocalHost = ['localhost', '127.0.0.1', ''].includes(hostname);
  const appType = localStorage.getItem('app_type');
  const isTauri = Boolean(window.__TAURI__);

  if (!protocol.startsWith('http') || !isLocalHost) return '';
  if (isTauri && appType !== 'host') return '';

  return `${protocol}//${hostname}:3000`;
}

export function getConfiguredHost() {
  const savedHost = typeof window !== 'undefined' ? cleanHost(localStorage.getItem('host_ip') || '') : '';
  return savedHost || getBrowserHostCandidate() || DEFAULT_HOST;
}

export function getApiBaseURL() {
  if (typeof window !== 'undefined') {
    const appType = localStorage.getItem('app_type');
    const isTauri = !!window.__TAURI__;
    if (isTauri && appType === 'host') {
      return 'http://localhost:3000/api';
    }

    const browserHost = getBrowserHostCandidate();
    if (browserHost) return `${window.location.protocol}//${browserHost}:3000/api`;

    const localOrigin = getLocalHttpOrigin();
    if (localOrigin) return `${localOrigin}/api`;
  }

  const configuredHost = getConfiguredHost();
  if (configuredHost) return `http://${configuredHost}:3000/api`;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  return 'http://localhost:3000/api';
}

export function getSocketBaseURL() {
  if (typeof window !== 'undefined') {
    const appType = localStorage.getItem('app_type');
    const isTauri = !!window.__TAURI__;
    if (isTauri && appType === 'host') {
      return 'http://localhost:3000';
    }

    const browserHost = getBrowserHostCandidate();
    if (browserHost) return `${window.location.protocol}//${browserHost}:3000`;

    const localOrigin = getLocalHttpOrigin();
    if (localOrigin) return localOrigin;
  }

  const configuredHost = getConfiguredHost();
  if (configuredHost) return `http://${configuredHost}:3000`;
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');

  return 'http://localhost:3000';
}
