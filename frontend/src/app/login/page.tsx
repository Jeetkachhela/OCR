"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import { ShieldAlert, ArrowRight, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initializeAuth, error, setError, isInitialized } = useStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize auth check
  useEffect(() => {
    initializeAuth();
    setError(null);
  }, [initializeAuth, setError]);

  // Route automatically if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please input email and security access key.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      // Error handled by Zustand store, we just reset submitting status
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 z-10 relative">
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-2xl glass-panel relative">
        
        {/* Glow element */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20 mb-4 select-none text-xl">
            Æ
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wider">
            AETHERIA COGNITIVE
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            AI Logistics Document Intelligence Platform
          </p>
        </div>

        {/* Global error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/15 bg-red-500/5 text-xs text-red-400 flex items-center gap-3 animate-pulse">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Operator Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                placeholder="operator@logistics.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Security Access Key
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Signin Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 group transition-all cursor-pointer active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Initialize Ingestion Session
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
