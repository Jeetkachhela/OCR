"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import { ShieldAlert, ArrowRight, Lock, Mail, Loader2, User, Briefcase, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, initializeAuth, error, setError, isInitialized } = useStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("operator");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize auth check
  useEffect(() => {
    initializeAuth();
    setError(null);
    setSuccessMessage(null);
  }, [initializeAuth, setError]);

  // Route automatically if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isRegisterMode) {
      if (!email || !password || !fullName || !role) {
        setError("Please fill out all registration fields.");
        return;
      }
      if (password.length < 6) {
        setError("Security key must be at least 6 characters.");
        return;
      }
      
      setIsSubmitting(true);
      try {
        await register(email, password, fullName, role);
        setSuccessMessage("Operator profile created successfully! Please log in.");
        setIsRegisterMode(false);
        setPassword("");
      } catch (err: any) {
        // Handled by store
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!email || !password) {
        setError("Please input email and security access key.");
        return;
      }
      
      setIsSubmitting(true);
      try {
        await login(email, password);
        router.push("/dashboard");
      } catch (err: any) {
        // Handled by store
      } finally {
        setIsSubmitting(false);
      }
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
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-2xl glass-panel relative transition-all duration-300">
        
        {/* Glow element */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20 mb-4 select-none text-xl">
            Æ
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wider">
            {isRegisterMode ? "CREATE AUDITOR PROFILE" : "AETHERIA COGNITIVE"}
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            {isRegisterMode ? "Register new system credentials" : "AI Logistics Document Intelligence Platform"}
          </p>
        </div>

        {/* Global error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/15 bg-red-500/5 text-xs text-red-400 flex items-center gap-3 animate-pulse">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-xs text-emerald-400 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegisterMode && (
            <>
              {/* Full Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Assign System Privilege
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-white/5 focus:border-blue-500/50 focus:bg-slate-800 rounded-xl text-white text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="operator">Operator (Scan pipelines & manual correction)</option>
                    <option value="admin">Administrator (Macro analytics & configuration controls)</option>
                  </select>
                </div>
              </div>
            </>
          )}
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
                required
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {isRegisterMode ? "Define Security Access Key" : "Security Access Key"}
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 focus:border-blue-500/50 focus:bg-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 group transition-all cursor-pointer active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isRegisterMode ? "Create System Profile" : "Initialize Ingestion Session"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggle Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
          >
            {isRegisterMode 
              ? "Already have an account? Sign in here" 
              : "Don't have an operator profile? Create one here"}
          </button>
        </div>
      </div>
    </div>
  );
}
