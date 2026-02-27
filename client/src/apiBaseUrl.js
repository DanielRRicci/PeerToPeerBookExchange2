// Resolves API base URL for both local and deployed environments.
// Priority:
// 1) VITE_API_BASE_URL when explicitly set
// 2) localhost backend during local frontend dev
// 3) same-origin in production when frontend and backend share a domain

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;

  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000';
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:5000';
}
