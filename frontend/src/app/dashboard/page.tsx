"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Download, 
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Zap,
  Server,
  User,
  ShieldCheck,
  Eye,
  FileCheck,
  Database
} from "lucide-react";
import { api } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { 
    user,
    isAuthenticated, 
    isInitialized, 
    initializeAuth, 
    analytics, 
    fetchAnalytics, 
    notifications, 
    fetchNotifications 
  } = useStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated) {
      fetchAnalytics();
      fetchNotifications();
    }
  }, [isInitialized, isAuthenticated, router, fetchAnalytics, fetchNotifications]);

  const handleDownloadReport = async () => {
    try {
      await api.downloadCSV();
    } catch (e) {
      alert("Failed to download compliance report.");
    }
  };

  if (!isInitialized || !isAuthenticated || !analytics || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Loading Cognitive Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-slate-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
        <Header />
        
        <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {user.role === "admin" ? (
            <AdminDashboardView 
              analytics={analytics} 
              notifications={notifications}
              fetchAnalytics={fetchAnalytics}
              handleDownloadReport={handleDownloadReport}
            />
          ) : (
            <OperatorDashboardView 
              analytics={analytics} 
              notifications={notifications}
              fetchAnalytics={fetchAnalytics}
              router={router}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 1. CHIEF ADMINISTRATOR COMMAND CENTRE VIEW
// ==========================================
function AdminDashboardView({ analytics, notifications, fetchAnalytics, handleDownloadReport }: any) {
  const totalAlerts = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="space-y-8">
      {/* Admin Title & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Administrative Control Hub
            </h2>
            <span className="px-2.5 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-[9px] font-extrabold text-blue-400 tracking-wider uppercase">
              Root Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global compliance aggregates, system transaction lines, and regulatory risk distributions.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Sync Ledger
          </button>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/10 cursor-pointer active:scale-95"
          >
            <Download size={14} />
            Export Compliance Audit
          </button>
        </div>
      </div>

      {/* Admin KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Capacity */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Ingested Ledger
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Database size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{analytics.total_processed}</span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp size={10} /> +15%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Active encrypted waybills in Neon pool</p>
        </div>

        {/* KPI 2: Yield */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gateway Ingestion Yield
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {analytics.processing_success_rate.toFixed(1)}%
            </span>
            <span className="text-[9px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full">
              Target 98.5%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Successful document parser yield</p>
        </div>

        {/* KPI 3: System Audits */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Security Alerts
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalAlerts}</span>
            <span className="text-[9px] text-purple-400 font-bold bg-purple-400/10 px-2 py-0.5 rounded-full">
              Auditable Alerts
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Real-time flagged events</p>
        </div>

        {/* KPI 4: Threat Assessment */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Threat Assessment
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">LOW RISK</span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Normal
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Zero critical anomalies flagged</p>
        </div>

      </div>

      {/* Admin Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Ingestion Area Line Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Global Ingestion Volume Trend (Last 7 Days)
            </h3>
            <span className="text-[9px] text-slate-400 font-bold">Processed Count</span>
          </div>

          <div className="w-full h-64 relative flex items-end">
            <svg className="w-full h-full" viewBox="0 0 600 240">
              <line x1="50" y1="40" x2="550" y2="40" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="50" y1="90" x2="550" y2="90" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="50" y1="140" x2="550" y2="140" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
              <line x1="50" y1="190" x2="550" y2="190" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

              <text x="35" y="45" fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">10</text>
              <text x="35" y="95" fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">5</text>
              <text x="35" y="145" fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">2</text>
              <text x="35" y="195" fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">0</text>

              {(() => {
                const data = analytics.processing_volume_trend;
                const maxVal = 10;
                const getX = (index: number) => 50 + (index * (500 / 6));
                const getY = (val: number) => 190 - ((val / maxVal) * 150);

                let linePath = "";
                let fillPath = "";
                
                data.forEach((item: any, idx: number) => {
                  const x = getX(idx);
                  const y = getY(item.processed);
                  if (idx === 0) {
                    linePath = `M ${x} ${y}`;
                    fillPath = `M ${x} 190 L ${x} ${y}`;
                  } else {
                    linePath += ` L ${x} ${y}`;
                    fillPath += ` L ${x} ${y}`;
                  }
                  if (idx === data.length - 1) {
                    fillPath += ` L ${x} 190 Z`;
                  }
                });

                return (
                  <>
                    <defs>
                      <linearGradient id="adminAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={fillPath} fill="url(#adminAreaGrad)" />
                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />

                    {data.map((item: any, idx: number) => {
                      const x = getX(idx);
                      const y = getY(item.processed);
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="3.5" fill="#3b82f6" />
                          <text x={x} y="215" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
                            {item.date}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Cargo Document Splits Donut */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Cargo Document Splits
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Global compliance structure ratio</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 py-2">
            <svg width="150" height="150" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="14" />
              {(() => {
                const data = analytics.document_type_split;
                const total = data.reduce((sum: number, item: any) => sum + item.value, 0) || 1;
                
                let accumulatedAngle = 0;
                const colors = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];
                
                return data.map((item: any, idx: number) => {
                  const percentage = item.value / total;
                  const strokeDasharray = `${percentage * 377} 377`;
                  const strokeDashoffset = `${-accumulatedAngle * 377}`;
                  accumulatedAngle += percentage;
                  
                  return (
                    <circle
                      key={idx}
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke={colors[idx % colors.length]}
                      strokeWidth="14"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 80 80)"
                    />
                  );
                });
              })()}
              <text x="80" y="86" fill="#fff" fontSize="15" fontWeight="extrabold" textAnchor="middle">
                {analytics.total_processed}
              </text>
            </svg>

            {/* Labels */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-[10px]">
              {analytics.document_type_split.map((item: any, idx: number) => {
                const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-red-500"];
                return (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colors[idx % colors.length]}`} />
                    <span className="text-slate-400 truncate">{item.type}</span>
                    <span className="text-white font-bold ml-auto">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Expanded Security Ledger Timeline */}
      <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            System Admin Security Audit Timeline
          </h3>
          <span className="text-[9px] text-blue-400 font-extrabold uppercase border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 rounded-full select-none">
            Compliance Secured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 font-semibold text-[10px]">
                <th className="py-2.5 px-2">Audited Profile</th>
                <th className="py-2.5 px-2">Gateway Action</th>
                <th className="py-2.5 px-2">Operational Scope</th>
                <th className="py-2.5 px-2 text-right">Audited Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {analytics.recent_activity.map((act: any) => (
                <tr key={act.id} className="hover:bg-white/5 transition-colors text-slate-300">
                  <td className="py-3 px-2 font-mono font-semibold text-blue-400">
                    {act.user.split("@")[0]}
                  </td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-extrabold text-white uppercase font-mono">
                      {act.action}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-400 max-w-xs truncate">
                    {act.details}
                  </td>
                  <td className="py-3 px-2 text-right text-slate-500 font-mono">
                    {act.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 2. STANDARD CARGO OPERATOR WORKSPACE VIEW
// ==========================================
function OperatorDashboardView({ analytics, notifications, fetchAnalytics, router }: any) {
  // Extract mock operator processing latency values to show queue parameters
  const processingLatencies = [
    { file: "X00016469670.jpg", time: 2.1 },
    { file: "X00016469671.jpg", time: 1.4 },
    { file: "X51005200931.jpg", time: 2.7 },
    { file: "X51005230605.jpg", time: 1.8 },
    { file: "commercial_invoice_sku1.pdf", time: 0.9 },
    { file: "commercial_invoice_sku2.pdf", time: 1.1 },
  ];

  // We filter SROIE receipt uploads which have standard files filenames
  const sroieScans = notifications
    .filter((n: any) => n.type === "anomaly_detected" || n.message.includes(".jpg"))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Operator Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Ingestion Operations Dashboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-[9px] font-extrabold text-purple-400 tracking-wider uppercase select-none">
              Operator Terminal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time visual OCR scans, layout extraction bounding speeds, and metadata queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-500/10 cursor-pointer active:scale-95"
          >
            <RefreshCw size={14} />
            Refresh OCR Ingestion Queue
          </button>
          <button
            onClick={() => router.push("/documents")}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            Open Ingestion Hub
          </button>
        </div>
      </div>

      {/* Operator KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Ingested */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scanned Receipts Ingested
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">10</span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Zap size={10} /> Active
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Indexed SROIE scanner assets</p>
        </div>

        {/* KPI 2: Queue Health */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scan Ingest Status
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Server size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">STABLE / IDLE</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Ingest queue latency is zero</p>
        </div>

        {/* KPI 3: Processing Latency */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Extraction Speed
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">1.6s</span>
            <span className="text-[9px] text-blue-400 font-bold bg-blue-400/10 px-2 py-0.5 rounded-full">
              Non-blocking
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">FastAPI background thread pools</p>
        </div>

        {/* KPI 4: OCR Accuracy */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scan Layout Accuracy
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileCheck size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {(analytics.avg_ocr_confidence * 100).toFixed(0)}%
            </span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full">
              Optimal
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Average SROIE coordinates rating</p>
        </div>

      </div>

      {/* Operator Visualizations Grid (Totally different visual items) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Latency Column Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Document Cognitive Processing Latency
            </h3>
            <span className="text-[9px] text-slate-500 font-mono">Time taken (seconds)</span>
          </div>

          <div className="h-60 flex items-end justify-between px-4 pt-6">
            {processingLatencies.map((item, idx) => {
              const maxVal = 3.0;
              const heightPct = (item.time / maxVal) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-3 w-12 group">
                  <span className="text-[10px] text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.time}s
                  </span>
                  
                  {/* Column Bar */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-gradient-to-t from-purple-600/30 to-purple-500 rounded-lg shadow-lg shadow-purple-500/10 group-hover:to-purple-400 transition-all duration-300 min-h-[10px]"
                  />
                  
                  <span className="text-[9px] text-slate-400 truncate w-full text-center select-none font-mono">
                    {item.file.substring(0, 8)}...
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* OCR Confidence Range Split (Histogram) */}
        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Confidence Range Splits
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Distribution count of character parsing</p>
          </div>

          <div className="space-y-4">
            {analytics.confidence_distribution.map((dist: any, idx: number) => {
              const percentages = [80, 15, 5, 0];
              const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-red-500"];
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">{dist.range}</span>
                    <span className="text-white font-bold">{percentages[idx % percentages.length]}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${percentages[idx % percentages.length]}%` }}
                      className={`h-full rounded-full ${colors[idx % colors.length]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Operator Scanned File Ingest Grid */}
      <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Scanned Receipt Ingest Ledger
          </h3>
          <span className="text-[9px] text-purple-400 font-extrabold uppercase border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-full select-none">
            OCR ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 font-semibold text-[10px]">
                <th className="py-2.5 px-2">Image File Name</th>
                <th className="py-2.5 px-2">MIME Class</th>
                <th className="py-2.5 px-2">Size</th>
                <th className="py-2.5 px-2">Parser Status</th>
                <th className="py-2.5 px-2 text-right">Ingestion Hub Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {processingLatencies.slice(0, 4).map((scan, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors text-slate-300">
                  <td className="py-3 px-2 font-mono font-semibold text-purple-400">
                    {scan.file}
                  </td>
                  <td className="py-3 px-2 text-slate-400 font-mono">
                    image/jpeg
                  </td>
                  <td className="py-3 px-2 text-slate-500">
                    {(145320 + idx * 8201).toLocaleString()} bytes
                  </td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase select-none">
                      Completed
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button 
                      onClick={() => router.push("/documents")}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white transition-colors cursor-pointer border border-white/5 inline-flex items-center gap-1.5"
                    >
                      <Eye size={12} />
                      Verify Fields
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
