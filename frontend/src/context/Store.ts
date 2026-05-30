import { create } from "zustand";
import { api } from "../lib/api";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  level: string;
  is_read: boolean;
  created_at: string;
}

interface Analytics {
  total_processed: number;
  processing_success_rate: number;
  avg_ocr_confidence: number;
  active_anomalies_count: number;
  processing_volume_trend: any[];
  confidence_distribution: any[];
  document_type_split: any[];
  recent_activity: any[];
}

interface GlobalState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  notifications: Notification[];
  analytics: Analytics | null;
  isSidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSidebarOpen: (isOpen: boolean) => void;
  setError: (err: string | null) => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  dismissNotification: (id: number) => Promise<void>;
  dismissAllNotifications: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

export const useStore = create<GlobalState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  notifications: [],
  analytics: null,
  isSidebarOpen: true,
  isLoading: false,
  error: null,

  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setError: (err) => set({ error: err }),

  initializeAuth: async () => {
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch (e) {
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(email, password);
      // Construct user representation from token response
      const user: User = {
        id: 0, // Profile endpoint can fill in detail
        email: data.email,
        full_name: data.full_name || "Auditor Account",
        role: data.role,
        is_active: true,
      };
      set({ user, isAuthenticated: true, isLoading: false });
      
      // Seed details after login
      get().fetchNotifications();
      get().fetchAnalytics();
    } catch (e: any) {
      set({ error: e.message || "Failed to log in.", isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore logout connection issues
    }
    set({ user: null, isAuthenticated: false, notifications: [], analytics: null });
  },

  fetchNotifications: async () => {
    try {
      const notifications = await api.getNotifications();
      set({ notifications });
    } catch (e) {
      // Silently catch alerts connection errors
    }
  },

  dismissNotification: async (id) => {
    try {
      await api.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      }));
    } catch (e) {
      // Ignored
    }
  },

  dismissAllNotifications: async () => {
    try {
      await api.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      }));
    } catch (e) {
      // Ignored
    }
  },

  fetchAnalytics: async () => {
    try {
      const analytics = await api.getAnalytics();
      set({ analytics });
    } catch (e) {
      // Silently catch analytics connection errors
    }
  },
}));
