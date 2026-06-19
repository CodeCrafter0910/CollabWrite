const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Something went wrong' }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth endpoints
export const auth = {
  login: (username) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username }) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/auth/me'),
};

// Document CRUD
export const documents = {
  list: () => apiFetch('/documents'),
  get: (id) => apiFetch(`/documents/${id}`),
  create: (data) =>
    apiFetch('/documents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiFetch(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/documents/${id}`, { method: 'DELETE' }),
};

// Sharing — manage who has access to a doc
export const sharing = {
  list: (docId) => apiFetch(`/documents/${docId}/shares`),
  share: (docId, username, permission) =>
    apiFetch(`/documents/${docId}/share`, {
      method: 'POST',
      body: JSON.stringify({ username, permission }),
    }),
  revoke: (docId, userId) =>
    apiFetch(`/documents/${docId}/share/${userId}`, { method: 'DELETE' }),
};

// Version history
export const versions = {
  list: (docId) => apiFetch(`/documents/${docId}/versions`),
  restore: (docId, versionId) =>
    apiFetch(`/documents/${docId}/restore/${versionId}`, { method: 'POST' }),
};

// File upload needs special handling — no JSON content-type header
export const upload = {
  file: (formData) =>
    fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message);
      }
      return res.json();
    }),
};
