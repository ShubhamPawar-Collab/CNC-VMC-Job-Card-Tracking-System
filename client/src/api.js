const API_BASE = '/api';

export function getAuthHeader() {
  const token = localStorage.getItem('te_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) => apiRequest('/auth/login', {
    method: 'POST',
    body: { username, password }
  }),
  getMe: () => apiRequest('/auth/me'),

  // Clients, Machines, Operators
  getClients: () => apiRequest('/clients'),
  createClient: (clientData) => apiRequest('/clients', { method: 'POST', body: clientData }),
  getMachines: () => apiRequest('/machines'),
  getAvailableMachines: () => apiRequest('/machines/available'),
  updateMachineStatus: (machineId, status) => apiRequest(`/machines/${machineId}/status`, {
    method: 'PATCH',
    body: { status }
  }),
  getOperators: () => apiRequest('/operators'),

  // Jobs (FR-1)
  getJobs: () => apiRequest('/jobs'),
  getJobDetails: (jobId) => apiRequest(`/jobs/${jobId}`),
  registerJob: (jobData) => apiRequest('/jobs', { method: 'POST', body: jobData }),
  deleteJob: (jobId) => apiRequest(`/jobs/${jobId}`, { method: 'DELETE' }),

  // Assignment (FR-2)
  assignJob: (assignmentData) => apiRequest('/assignments', { method: 'POST', body: assignmentData }),
  getJobAssignment: (jobId) => apiRequest(`/assignments/${jobId}`),

  // Tracking & Status (FR-3, FR-4)
  updateJobStatus: (jobId, newStatus, remarks) => apiRequest('/tracking/status', {
    method: 'POST',
    body: { jobId, newStatus, remarks }
  }),
  reportBreakdown: (machineId, jobId, reason) => apiRequest('/tracking/breakdown', {
    method: 'POST',
    body: { machineId, jobId, reason }
  }),
  searchJobs: (q) => apiRequest(`/search?q=${encodeURIComponent(q)}`),

  // Dispatch (FR-5)
  dispatchJob: (dispatchData) => apiRequest('/dispatch', { method: 'POST', body: dispatchData }),
  completeJob: (jobId, remarks) => apiRequest('/dispatch/complete', { method: 'POST', body: { jobId, remarks } }),
  getDispatchNote: (jobId) => apiRequest(`/dispatch/note/${jobId}`),

  // Dashboard & History
  getDashboardMetrics: () => apiRequest('/dashboard/metrics'),
  getJobHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/history?${qs}`);
  },

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),

  // File Upload
  uploadDrawing: async (file) => {
    const formData = new FormData();
    formData.append('drawing', file);
    return apiRequest('/upload', {
      method: 'POST',
      body: formData
    });
  }
};
