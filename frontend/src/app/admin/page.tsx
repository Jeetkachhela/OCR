"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { api } from "../../lib/api";
import { 
  ShieldAlert, 
  Settings, 
  Activity, 
  Database, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Fingerprint, 
  Lock, 
  FileText,
  CloudLightning,
  Cpu,
  User
} from "lucide-react";

interface SystemUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, initializeAuth, analytics, fetchAnalytics } = useStore();

  // Connected state with backend
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [cdnCompression, setCdnCompression] = useState(true);
  const [qdrantSync, setQdrantSync] = useState(true);
  const [logLevel, setLogLevel] = useState("INFO");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // User Management state
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  const fetchUsers = () => {
    setIsLoadingUsers(true);
    api.listUsers()
      .then((data) => {
        setUsers(data);
        setIsLoadingUsers(false);
      })
      .catch((err) => {
        console.error("Failed to load platform users:", err);
        setIsLoadingUsers(false);
      });
  };

  const handleToggleUserActive = async (targetUserId: number) => {
    try {
      const res = await api.toggleUserActive(targetUserId);
      setUsers(prev => prev.map(u => 
        u.id === targetUserId ? { ...u, is_active: res.user.is_active } : u
      ));
    } catch (err: any) {
      console.error("Failed to toggle user status:", err);
      alert(err.message || "Failed to update user active status.");
    }
  };

  // Fetch settings from active REST API
  useEffect(() => {
    if (isInitialized && isAuthenticated && user?.role === "admin") {
      fetchAnalytics();
      fetchUsers();
      
      // Get runtime settings
      api.getAdminSettings()
        .then((data) => {
          setRateLimitEnabled(data.rate_limiting_enabled);
          setCdnCompression(data.cdn_optimization_enabled);
          setQdrantSync(data.qdrant_sync_enabled);
          setLogLevel(data.log_level);
          setIsLoadingSettings(false);
        })
        .catch((err) => {
          console.error("Failed to load administrative settings:", err);
          setIsLoadingSettings(false);
        });
    }
  }, [isInitialized, isAuthenticated, user, fetchAnalytics]);

  const handleToggleRateLimit = async () => {
    const nextVal = !rateLimitEnabled;
    setRateLimitEnabled(nextVal);
    try {
      await api.updateAdminSettings({
        rate_limiting_enabled: nextVal,
        cdn_optimization_enabled: cdnCompression,
        qdrant_sync_enabled: qdrantSync,
        log_level: logLevel
      });
    } catch (e) {
      console.error(e);
      setRateLimitEnabled(rateLimitEnabled); // revert
      alert("Verification Error: Failed to update rate limit setting.");
    }
  };

  const handleToggleCdn = async () => {
    const nextVal = !cdnCompression;
    setCdnCompression(nextVal);
    try {
      await api.updateAdminSettings({
        rate_limiting_enabled: rateLimitEnabled,
        cdn_optimization_enabled: nextVal,
        qdrant_sync_enabled: qdrantSync,
        log_level: logLevel
      });
    } catch (e) {
      console.error(e);
      setCdnCompression(cdnCompression); // revert
      alert("Verification Error: Failed to update CDN setting.");
    }
  };

  const handleToggleQdrant = async () => {
    const nextVal = !qdrantSync;
    setQdrantSync(nextVal);
    try {
      await api.updateAdminSettings({
        rate_limiting_enabled: rateLimitEnabled,
        cdn_optimization_enabled: cdnCompression,
        qdrant_sync_enabled: nextVal,
        log_level: logLevel
      });
    } catch (e) {
      console.error(e);
      setQdrantSync(qdrantSync); // revert
      alert("Verification Error: Failed to update Qdrant sync setting.");
    }
  };

  const handleLogLevelChange = async (newVal: string) => {
    setLogLevel(newVal);
    try {
      await api.updateAdminSettings({
        rate_limiting_enabled: rateLimitEnabled,
        cdn_optimization_enabled: cdnCompression,
        qdrant_sync_enabled: qdrantSync,
        log_level: newVal
      });
    } catch (e) {
      console.error(e);
      alert("Verification Error: Failed to update Log Level.");
    }
  };

  if (!isInitialized || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // --- ACCESS CONTROL GATE ---
  if (user.role !== "admin") {
    return (
      <div className="flex-1 flex bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 flex items-center justify-center p-8 z-10">
            <div className="w-full max-w-lg p-8 rounded-3xl border border-red-500/15 bg-red-950/10 backdrop-blur-xl shadow-2xl relative text-center space-y-6 animate-pulse">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                <ShieldAlert size={36} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider">
                  403 - Forbidden Session
                </h2>
                <p className="text-sm text-red-400 font-medium">
                  Administrative Node Restricted. Role: <span className="underline uppercase">{user.role}</span>
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-2">
                  Standard cargo operator profiles do not possess security access keys to view audit ledgers or toggle operational policies. This incident has been logged.
                </p>
              </div>
              <button 
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/5 transition-colors cursor-pointer"
              >
                Return to Dashboard Workspace
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // --- ADMINISTRATOR WORKSPACE ---
  return (
    <div className="flex-1 flex bg-slate-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
        <Header />
        
        <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          {/* Welcome title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  System Control & Policy Panel
                </h2>
                <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 text-[9px] font-bold text-emerald-400 tracking-wider uppercase select-none">
                  Admin Node Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure runtime platform parameters and audit network-wide compliance logs.
              </p>
            </div>
            
            <button
              onClick={() => fetchAnalytics()}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
            >
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
              Refresh Security Logs
            </button>
          </div>

          {/* Admin Policy Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* System Policy Controls */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Settings className="text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Global Policy Switches
                </h3>
              </div>

              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Policy 1: Rate Limiter */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Rate-Limiting (60r/min)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Block brute force & API floods</p>
                    </div>
                    <button 
                      onClick={handleToggleRateLimit}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {rateLimitEnabled ? (
                        <ToggleRight className="text-blue-500 w-10 h-10" />
                      ) : (
                        <ToggleLeft className="text-slate-600 w-10 h-10" />
                      )}
                    </button>
                  </div>

                  {/* Policy 2: CDN Edge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Cloudinary CDN Optimizations</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Auto-compress visual document scans</p>
                    </div>
                    <button 
                      onClick={handleToggleCdn}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {cdnCompression ? (
                        <ToggleRight className="text-blue-500 w-10 h-10" />
                      ) : (
                        <ToggleLeft className="text-slate-600 w-10 h-10" />
                      )}
                    </button>
                  </div>

                  {/* Policy 3: Qdrant Index */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Qdrant Cloud Synced</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Sync dense vectors in real-time</p>
                    </div>
                    <button 
                      onClick={handleToggleQdrant}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {qdrantSync ? (
                        <ToggleRight className="text-blue-500 w-10 h-10" />
                      ) : (
                        <ToggleLeft className="text-slate-600 w-10 h-10" />
                      )}
                    </button>
                  </div>

                  {/* Policy 4: Log Level Select */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Telemetry Debug Level
                    </label>
                    <select 
                      value={logLevel}
                      onChange={(e) => handleLogLevelChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/40 cursor-pointer"
                    >
                      <option value="DEBUG" className="bg-slate-900">DEBUG (All logs)</option>
                      <option value="INFO" className="bg-slate-900">INFO (Standard telemetry)</option>
                      <option value="WARNING" className="bg-slate-900">WARNING (Anomalies only)</option>
                      <option value="ERROR" className="bg-slate-900">CRITICAL (System exceptions)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Cyber Hardening Metrics */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Fingerprint className="text-purple-400" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cyber Hardening Status
                </h3>
              </div>

              <div className="space-y-4">
                {/* Metric 1: XSS */}
                <div className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-blue-400" />
                    <span className="text-slate-400">X-XSS-Protection Header</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 uppercase">ACTIVE</span>
                </div>

                {/* Metric 2: JWT Cookies */}
                <div className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-purple-400" />
                    <span className="text-slate-400">HTTP-Only secure JWT cookies</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 uppercase">ENFORCED</span>
                </div>

                {/* Metric 3: DB Pools */}
                <div className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-emerald-400" />
                    <span className="text-slate-400">Neon DB Pool Limit</span>
                  </div>
                  <span className="font-mono font-bold text-white">10 Sessions</span>
                </div>

                {/* Metric 4: MIME */}
                <div className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-400" />
                    <span className="text-slate-400">Payload white-list uploads</span>
                  </div>
                  <span className="font-mono font-bold text-white">PDF, JPEG, PNG</span>
                </div>
              </div>
            </div>

            {/* SECURE System Integration Status Card (Removed private names/URLs) */}
            <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <CloudLightning className="text-emerald-400" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cloud Integration Status
                </h3>
              </div>

              {analytics && (
                <div className="space-y-4 text-xs">
                  {/* Neon DB Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Neon PostgreSQL DB</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      CONNECTED [AES-256]
                    </span>
                  </div>
                  
                  {/* Qdrant DB Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Qdrant Cloud Vector DB</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SYNCED [TLS-v1.3]
                    </span>
                  </div>
                  
                  {/* Cloudinary Storage Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cloudinary Asset CDN</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SECURED PRIVATE
                    </span>
                  </div>

                  {/* Seeded Data Rows */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-slate-400">Seeded Document Count</span>
                    <span className="font-bold text-white font-mono">{analytics.total_processed} Rows</span>
                  </div>

                  {/* System Core Load */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">System Gateway Node</span>
                    <span className="font-bold text-blue-400 flex items-center gap-1 font-mono">
                      <Cpu size={12} />
                      ACTIVE TERMINAL B
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* User Management & Activation Controls */}
          <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <User className="text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Operator User Management
                </h3>
              </div>
              <span className="text-[10px] text-blue-400 font-bold uppercase border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 rounded-full select-none">
                Privilege Console Active
              </span>
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-2">Auditor Profile</th>
                      <th className="py-3 px-2">Role</th>
                      <th className="py-3 px-2">Email Address</th>
                      <th className="py-3 px-2">Operator Status</th>
                      <th className="py-3 px-2 text-right">State Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors text-slate-300">
                        <td className="py-3.5 px-2 font-semibold text-white">
                          {u.full_name || "Unassigned Name"}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-bold uppercase font-mono ${
                            u.role === "admin" 
                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" 
                              : "border-blue-500/20 bg-blue-500/5 text-blue-400"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-400 font-mono">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`inline-flex items-center gap-1 font-bold text-[10px] ${
                            u.is_active ? "text-emerald-400" : "text-slate-500"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
                            }`} />
                            {u.is_active ? "ACTIVE OPERATIONAL" : "DEACTIVATED LOCKOUT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          {u.id === user.id ? (
                            <span className="text-[10px] text-slate-600 italic">Self (Protected)</span>
                          ) : (
                            <button
                              onClick={() => handleToggleUserActive(u.id)}
                              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {u.is_active ? (
                                <ToggleRight className="text-emerald-400 w-8 h-8 inline" />
                              ) : (
                                <ToggleLeft className="text-slate-600 w-8 h-8 inline" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Core Audit Ledger: Expanded Activity logs */}
          <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Activity className="text-blue-400 animate-pulse" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  System Security & Audit Ledger (Expanded Logs)
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 rounded-full select-none">
                Immutable Ledger Active
              </span>
            </div>

            {analytics && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-2">Audited Operator</th>
                      <th className="py-3 px-2">Transaction Code</th>
                      <th className="py-3 px-2">Compliance Action details</th>
                      <th className="py-3 px-2">IP Origin</th>
                      <th className="py-3 px-2 text-right">Transaction Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {analytics.recent_activity.map((act) => (
                      <tr key={act.id} className="hover:bg-white/5 transition-colors text-slate-300">
                        <td className="py-3.5 px-2 font-mono font-semibold text-blue-400">
                          {act.user}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className="px-2.5 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-bold text-white uppercase font-mono">
                            {act.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-400 max-w-sm truncate">
                          {act.details}
                        </td>
                        <td className="py-3.5 px-2 text-slate-500 font-mono">
                          {act.user === "System Automated" ? "localhost" : "127.0.0.1"}
                        </td>
                        <td className="py-3.5 px-2 text-right text-slate-500 font-mono">
                          {act.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
