const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('jansankalp_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (identifier: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    }),

  register: (payload: any) =>
    request<any>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  sendOtp: (mobile: string) =>
    request<any>('/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    }),

  verifyOtp: (mobile: string, otp: string) =>
    request<any>('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp }),
    }),

  getMe: () => request<any>('/auth/me'),

  getDemoUsers: () => request<any>('/auth/demo-users'),

  updateProfile: (data: any) =>
    request<any>('/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Complaints
  getComplaints: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v));
      }
    });
    return request<any>(`/complaints?${qs.toString()}`);
  },

  getComplaintById: (id: string) => request<any>(`/complaints/${id}`),

  getMapMarkers: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v));
      }
    });
    return request<any>(`/complaints/map?${qs.toString()}`);
  },

  checkDuplicates: (lat: number, lng: number, categoryId?: string, radiusMeters: number = 200) => {
    let url = `/complaints/duplicate-check?lat=${lat}&lng=${lng}&radius_meters=${radiusMeters}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    return request<any>(url);
  },

  createComplaint: (formData: FormData) => {
    const headers = getAuthHeader();
    return fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Failed to submit complaint');
      return data;
    });
  },

  updateStatus: (id: string, status: string, remarks?: string) =>
    request<any>(`/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, remarks }),
    }),

  assignComplaint: (id: string, department_id: string, assigned_user_id?: string, remarks?: string) =>
    request<any>(`/complaints/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_id, assigned_user_id, remarks }),
    }),

  addComment: (id: string, message: string, is_internal: boolean = false) =>
    request<any>(`/complaints/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, is_internal }),
    }),

  supportComplaint: (id: string) =>
    request<any>(`/complaints/${id}/support`, {
      method: 'POST',
    }),

  reopenComplaint: (id: string, reason: string, additional_description?: string) =>
    request<any>(`/complaints/${id}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, additional_description }),
    }),

  submitFeedback: (id: string, rating: number, satisfaction: string, feedback_text?: string) =>
    request<any>(`/complaints/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, satisfaction, feedback_text }),
    }),

  uploadResolutionEvidence: (id: string, formData: FormData) => {
    const headers = getAuthHeader();
    return fetch(`${API_BASE}/complaints/${id}/media`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Failed to upload media');
      return data;
    });
  },

  // Categories & Departments & Constituencies
  getCategories: () => request<any>('/categories'),
  createCategory: (data: any) =>
    request<any>('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getDepartments: () => request<any>('/departments'),
  createDepartment: (data: any) =>
    request<any>('/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getConstituencies: () => request<any>('/constituencies'),
  getConstituencyById: (id: string) => request<any>(`/constituencies/${id}`),

  // Notifications
  getNotifications: () => request<any>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/notifications/mark-all-read', { method: 'POST' }),

  // Analytics & Reports
  getAnalytics: (constituencyId?: string) => {
    const url = constituencyId ? `/analytics?constituency_id=${constituencyId}` : '/analytics';
    return request<any>(url);
  },

  getReportSummary: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params);
    return request<any>(`/reports/summary?${qs.toString()}`);
  },

  exportComplaintsCsv: async (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params);
    const response = await fetch(`${API_BASE}/reports/export-csv?${qs.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return response.blob();
  },

  // Admin
  getUsers: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params);
    return request<any>(`/admin/users?${qs.toString()}`);
  },

  createUser: (userData: any) =>
    request<any>('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }),

  updateUserStatus: (id: string, status?: string, role?: string) =>
    request<any>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, role }),
    }),

  getAuditLogs: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params);
    return request<any>(`/admin/audit-logs?${qs.toString()}`);
  },

  getSlaSettings: () => request<any>('/admin/sla-settings'),
  updateSlaSettings: (settings: any[]) =>
    request<any>('/admin/sla-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }),

  // Public Transparency
  getPublicStats: (constituencyId?: string) => {
    const url = constituencyId ? `/public/transparency?constituency_id=${constituencyId}` : '/public/transparency';
    return request<any>(url);
  },
};
