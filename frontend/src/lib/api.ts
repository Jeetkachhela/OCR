const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Helper to make fetch requests with credentials (to send/receive HTTP-only cookies)
async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  
  // Ensure cookies are sent (credentials: "include" handles cookies across CORS)
  options.credentials = "include";
  options.headers = {
    ...options.headers,
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = "An error occurred while connecting to the operational backend.";
    try {
      const errData = await response.json();
      errorMessage = errData.detail || errorMessage;
    } catch (e) {
      // Body not JSON
    }
    throw new Error(errorMessage);
  }

  // Handle CSV/Streams separately if download request
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/csv")) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  // --- Authentication ---
  login: async (email: string, password: string) => {
    return request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return request("/auth/logout", { method: "POST" });
  },

  getMe: async () => {
    return request("/auth/me");
  },

  register: async (email: string, password: string, full_name: string, role: string) => {
    return request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, role }),
    });
  },

  // --- Document Ingestion & Audits ---
  getDocuments: async (status?: string, search?: string) => {
    let query = "";
    if (status || search) {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      query = `?${params.toString()}`;
    }
    return request(`/documents${query}`);
  },

  getDocument: async (id: number) => {
    return request(`/documents/${id}`);
  },

  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/documents/upload", {
      method: "POST",
      body: formData, // Fetch automatically configures multipart headers
    });
  },

  correctFields: async (documentId: number, corrections: { field_id: number; corrected_value: string }[]) => {
    return request(`/documents/${documentId}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corrections),
    });
  },

  // --- Semantic Search ---
  semanticSearch: async (query: string, limit = 5) => {
    return request("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });
  },

  // --- Operational Analytics ---
  getAnalytics: async () => {
    return request("/analytics");
  },

  // --- Alerts & Notifications ---
  getNotifications: async () => {
    return request("/notifications");
  },

  markAsRead: async (id: number) => {
    return request(`/notifications/${id}/read`, { method: "PUT" });
  },

  markAllAsRead: async () => {
    return request("/notifications/read-all", { method: "PUT" });
  },

  // --- Reporting & Downloads ---
  downloadCSV: async () => {
    const blob = await request("/reports/shipments/csv");
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "shipment_compliance_report.csv");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  getReportSummary: async () => {
    return request("/reports/summary");
  },

  getAdminSettings: async () => {
    return request("/admin/settings");
  },

  updateAdminSettings: async (settings: { rate_limiting_enabled: boolean; cdn_optimization_enabled: boolean; qdrant_sync_enabled: boolean; log_level: string }) => {
    return request("/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  }
};
