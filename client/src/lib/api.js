const BASE = '/api';

function getToken() {
  return localStorage.getItem('tab_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (body) => request('POST', '/auth/register', body),
  me: () => request('GET', '/auth/me'),
  updateMe: (body) => request('PUT', '/auth/me', body),

  // Push
  getVapidKey: () => request('GET', '/push/vapid-public-key'),
  subscribePush: (sub) => request('POST', '/push/subscribe', { subscription: sub }),
  unsubscribePush: () => request('DELETE', '/push/subscribe'),

  // Groups
  getGroups: () => request('GET', '/groups'),
  createGroup: (body) => request('POST', '/groups', body),
  joinGroup: (invite_code) => request('POST', '/groups/join', { invite_code }),
  getGroup: (id) => request('GET', `/groups/${id}`),
  updateGroup: (id, body) => request('PUT', `/groups/${id}`, body),
  kickMember: (groupId, userId) => request('DELETE', `/groups/${groupId}/members/${userId}`),
  createSession: (groupId) => request('POST', `/groups/${groupId}/sessions`),

  // Sessions
  getSession: (id) => request('GET', `/sessions/${id}`),
  getSummary: (id) => request('GET', `/sessions/${id}/summary`),
  addItem: (sessionId, body) => request('POST', `/sessions/${sessionId}/items`, body),
  updateItem: (sessionId, itemId, body) => request('PUT', `/sessions/${sessionId}/items/${itemId}`, body),
  deleteItem: (sessionId, itemId) => request('DELETE', `/sessions/${sessionId}/items/${itemId}`),
  startSession: (id, body) => request('POST', `/sessions/${id}/start`, body),
  respond: (id, body) => request('POST', `/sessions/${id}/respond`, body),
  closeSession: (id) => request('POST', `/sessions/${id}/close`),
};
