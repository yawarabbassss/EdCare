const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("leo_auth_token");
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("leo_auth_token", token);
  }
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("leo_auth_token");
    localStorage.removeItem("leo_user_role");
    localStorage.removeItem("leo_user_name");
  }
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: any) => fetchApi("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data: any) => fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => fetchApi("/auth/me"),

  // Elderly Profiles & Summary
  getElderlyList: () => fetchApi("/elderly/list"),
  getMyElderlyProfile: () => fetchApi("/elderly/profile"),
  getDashboardSummary: (profileId: string) => fetchApi(`/elderly/summary/${profileId}`),

  // Caregivers
  getMyPatients: () => fetchApi("/caregivers/my-patients"),

  // Cameras & Zones
  getCameras: (elderlyId?: string) => fetchApi(`/cameras${elderlyId ? `?elderly_id=${elderlyId}` : ""}`),
  createCamera: (data: any) => fetchApi("/cameras", { method: "POST", body: JSON.stringify(data) }),
  triggerCameraSim: (cameraId: string, action: string) => fetchApi(`/cameras/${cameraId}/simulate?action=${action}`, { method: "POST" }),
  getZones: (cameraId: string) => fetchApi(`/zones/camera/${cameraId}`),
  createZone: (cameraId: string, data: any) => fetchApi(`/zones/camera/${cameraId}`, { method: "POST", body: JSON.stringify(data) }),
  deleteZone: (zoneId: string) => fetchApi(`/zones/${zoneId}`, { method: "DELETE" }),

  // Alerts
  getAlerts: (elderlyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (elderlyId) params.append("elderly_id", elderlyId);
    if (status) params.append("status_filter", status);
    return fetchApi(`/alerts?${params.toString()}`);
  },
  updateAlertStatus: (alertId: string, status: string, notes?: string) =>
    fetchApi(`/alerts/${alertId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    }),
  triggerSos: (elderlyId?: string, location: string = "Home") =>
    fetchApi("/alerts/trigger-sos", {
      method: "POST",
      body: JSON.stringify({ elderly_id: elderlyId, location }),
    }),

  // Medications
  getMedications: (elderlyId?: string) => fetchApi(`/medications${elderlyId ? `?elderly_id=${elderlyId}` : ""}`),
  createMedication: (data: any) => fetchApi("/medications", { method: "POST", body: JSON.stringify(data) }),
  deleteMedication: (id: string) => fetchApi(`/medications/${id}`, { method: "DELETE" }),
  getMedicationLogs: (elderlyId?: string, dayOffset: number = 0) =>
    fetchApi(`/medications/logs?${elderlyId ? `elderly_id=${elderlyId}&` : ""}day_offset=${dayOffset}`),
  updateMedicationLogStatus: (logId: string, status: string, notes?: string) =>
    fetchApi(`/medications/logs/${logId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    }),
  getAdherenceRate: (elderlyId: string) => fetchApi(`/medications/adherence/${elderlyId}`),

  // Health Vitals & Thresholds
  getHealthRecords: (elderlyId?: string, metricType?: string, days: number = 30) => {
    const params = new URLSearchParams({ days: days.toString() });
    if (elderlyId) params.append("elderly_id", elderlyId);
    if (metricType) params.append("metric_type", metricType);
    return fetchApi(`/health/records?${params.toString()}`);
  },
  addHealthRecord: (data: any) => fetchApi("/health/records", { method: "POST", body: JSON.stringify(data) }),
  getHealthThresholds: (elderlyId?: string) => fetchApi(`/health/thresholds${elderlyId ? `?elderly_id=${elderlyId}` : ""}`),
  setHealthThreshold: (data: any) => fetchApi("/health/thresholds", { method: "POST", body: JSON.stringify(data) }),

  // Timeline Events
  getEvents: (elderlyId?: string) => fetchApi(`/events${elderlyId ? `?elderly_id=${elderlyId}` : ""}`),

  // Notifications
  getNotifications: () => fetchApi("/notifications"),
  markNotificationRead: (id: string) => fetchApi(`/notifications/${id}/read`, { method: "PUT" }),

  // Emergency Contacts
  getContacts: (elderlyId?: string) => fetchApi(`/contacts${elderlyId ? `?elderly_id=${elderlyId}` : ""}`),
  addContact: (data: any) => fetchApi("/contacts", { method: "POST", body: JSON.stringify(data) }),
  deleteContact: (id: string) => fetchApi(`/contacts/${id}`, { method: "DELETE" }),

  // AI Assistant
  sendChatMessage: (userId: string, message: string, conversationId?: string) =>
    fetchApi("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, message, conversation_id: conversationId }),
    }),

  // Audit Logs
  getAuditLogs: () => fetchApi("/audit/logs"),

  // Demo Simulation Triggers
  simulateFall: (elderlyId?: string, location: string = "Living Room") =>
    fetchApi(`/demo/simulate-fall?location=${encodeURIComponent(location)}${elderlyId ? `&elderly_id=${elderlyId}` : ""}`, {
      method: "POST",
    }),
  simulateMedicationDue: (elderlyId?: string) =>
    fetchApi(`/demo/simulate-medication-due${elderlyId ? `?elderly_id=${elderlyId}` : ""}`, { method: "POST" }),
  simulateVitalsAnomaly: (elderlyId?: string, metricType: string = "heart_rate", value: number = 126, unit: string = "bpm") =>
    fetchApi(`/demo/simulate-vitals-anomaly?metric_type=${metricType}&value=${value}&unit=${encodeURIComponent(unit)}${elderlyId ? `&elderly_id=${elderlyId}` : ""}`, {
      method: "POST",
    }),
};
