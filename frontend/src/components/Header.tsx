"use client";

import { useState, useEffect } from "react";
import { useStore } from "../context/Store";
import { Bell, Check, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const { user, notifications, fetchNotifications, dismissNotification, dismissAllNotifications } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Poll alerts every 15 seconds to simulate real-time operations
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications().then(() => setIsConnected(true)).catch(() => setIsConnected(false));
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadAlerts = notifications.filter((n) => !n.is_read);
  const activeAlertsLimit = unreadAlerts.slice(0, 5);

  return (
    <header className="h-20 px-8 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white tracking-tight">
          {user?.role === "admin" ? "Administration Command Center" : "Operational Terminal"}
        </h1>
        {/* Pulsing connection status dot */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[11px] text-slate-400 font-semibold select-none">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-md shadow-emerald-500/50" : "bg-red-500 shadow-md shadow-red-500/50"} animate-pulse`} />
          {isConnected ? "CLOUD CONNECTED" : "BACKEND OFFLINE"}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notification Bell Panel */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all relative"
          >
            <Bell size={20} className={unreadAlerts.length > 0 ? "animate-bounce mt-0.5" : ""} />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border border-slate-950 text-[10px] text-white font-extrabold flex items-center justify-center">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Alert Dropdown Panel */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-96 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 z-40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    System Alerts 
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      {unreadAlerts.length} new
                    </span>
                  </h3>
                  {unreadAlerts.length > 0 && (
                    <button
                      onClick={() => dismissAllNotifications()}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {unreadAlerts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                    <Check size={28} className="text-emerald-500/80 bg-emerald-500/10 p-1 rounded-full" />
                    <span className="text-xs">No active anomalies detected</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {activeAlertsLimit.map((n) => {
                      const isError = n.level === "error" || n.type === "system_issue";
                      return (
                        <div 
                          key={n.id}
                          className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                            isError 
                              ? "bg-red-500/5 border-red-500/15 hover:bg-red-500/10" 
                              : "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isError 
                              ? <AlertCircle size={16} className="text-red-400" /> 
                              : <AlertTriangle size={16} className="text-amber-400" />
                            }
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h5 className="text-xs font-semibold text-white truncate">{n.title}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="w-5 h-5 rounded hover:bg-white/10 text-slate-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      );
                    })}
                    
                    {unreadAlerts.length > 5 && (
                      <Link
                        href="/alerts"
                        onClick={() => setIsOpen(false)}
                        className="block text-center text-xs text-blue-400 hover:text-blue-300 font-semibold py-2 mt-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5"
                      >
                        View all operational alerts
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User initials bubble and metadata */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/15 select-none">
            {user?.full_name ? user.full_name.split(" ").map(w => w[0]).join("") : "OP"}
          </div>
          <div className="hidden md:block overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">
              {user?.full_name || "Operations Auditor"}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium select-none">
              Terminal Node B-12
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
