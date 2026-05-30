"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "../context/Store";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Search, 
  BellRing, 
  FileSpreadsheet, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isSidebarOpen, setSidebarOpen, logout } = useStore();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Ingestion Hub", href: "/documents", icon: UploadCloud },
    { name: "Semantic Search", href: "/search", icon: Search },
    { name: "Operational Alerts", href: "/alerts", icon: BellRing },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "System Control Panel", href: "/admin", icon: ShieldCheck });
  }

  return (
    <aside 
      className={`sidebar-glass h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 z-30 ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
    >
      <div>
        {/* Logo area */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25">
              Æ
            </div>
            {isSidebarOpen && (
              <span className="font-extrabold text-lg text-white tracking-wider text-gradient">
                AETHERIA
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="w-7 h-7 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* User Info banner */}
        {user && isSidebarOpen && (
          <div className="mx-4 my-6 p-4 rounded-xl border border-white/5 bg-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold">
              {user.full_name ? user.full_name[0] : "O"}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-white truncate">{user.full_name}</h4>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="px-3 mt-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? "bg-gradient-to-r from-blue-600/20 to-purple-600/10 text-white font-medium border-l-2 border-blue-500" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={20} className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                }`} />
                {isSidebarOpen && <span className="text-sm">{item.name}</span>}
                
                {/* Tooltip for collapsed sidebar */}
                {!isSidebarOpen && (
                  <div className="absolute left-24 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout area */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors group relative"
        >
          <LogOut size={20} className="transition-transform group-hover:translate-x-0.5" />
          {isSidebarOpen && <span className="text-sm font-medium">System Logout</span>}
          {!isSidebarOpen && (
            <div className="absolute left-24 px-3 py-1.5 bg-slate-900 border border-red-500/20 rounded-lg text-xs text-red-400 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
