"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { 
  BellRing, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Trash2
} from "lucide-react";

export default function AlertsPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isInitialized, 
    initializeAuth, 
    notifications, 
    fetchNotifications, 
    dismissNotification, 
    dismissAllNotifications 
  } = useStore();

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isInitialized, isAuthenticated, router, fetchNotifications]);

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const unreadAlerts = notifications.filter(n => !n.is_read);
  const readAlerts = notifications.filter(n => n.is_read);

  return (
    <div className="flex-1 flex bg-slate-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
        <Header />
        
        <main className="flex-1 p-8 space-y-8 max-w-4xl mx-auto w-full">
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Operational Alerts & Anomalies
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Unified audit trail of cargo anomalies, low confidence OCR, and duplicate upload prevention logs.
              </p>
            </div>
            
            {unreadAlerts.length > 0 && (
              <button
                onClick={() => dismissAllNotifications()}
                className="px-4 py-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer select-none"
              >
                <Check size={14} className="text-emerald-400" />
                Dismiss All Alerts
              </button>
            )}
          </div>

          <div className="space-y-6">
            
            {/* Active/Unread alerts block */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Active Anomalies ({unreadAlerts.length})
                {unreadAlerts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </h3>

              {unreadAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-white/5 bg-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 size={32} className="text-emerald-500/80 bg-emerald-500/10 p-1.5 rounded-full" />
                  <span className="text-xs">Ledger status normal. Zero unresolved anomalies.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {unreadAlerts.map((n) => {
                    const isError = n.level === "error" || n.type === "system_issue";
                    
                    return (
                      <div 
                        key={n.id}
                        className={`p-5 rounded-2xl border transition-colors flex items-start gap-4 ${
                          isError 
                            ? "bg-red-500/5 border-red-500/15 hover:bg-red-500/10" 
                            : "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/5">
                          {isError 
                            ? <AlertCircle size={20} className="text-red-400" /> 
                            : <AlertTriangle size={20} className="text-amber-400" />
                          }
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                          <h4 className="text-sm font-extrabold text-white">{n.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-500 font-mono block mt-2">
                            Detected At: {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>

                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="w-8 h-8 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer self-center"
                          title="Acknowledge & Dismiss"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resolved alerts block */}
            {readAlerts.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Resolved Alerts ({readAlerts.length})
                </h3>

                <div className="space-y-2.5 opacity-60">
                  {readAlerts.map((n) => (
                    <div 
                      key={n.id}
                      className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-start gap-3.5 text-xs text-slate-400"
                    >
                      <div className="mt-0.5 shrink-0">
                        <CheckCircle2 size={16} className="text-slate-500" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-300 truncate">{n.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xl">{n.message}</p>
                        <span className="text-[9px] text-slate-600 font-mono block mt-1.5">
                          Resolved: {new Date(n.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}
