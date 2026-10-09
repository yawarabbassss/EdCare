"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setAuthToken } from "@/lib/api";
import { HeartPulse, ArrowRight, Lock, Mail, User, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("caregiver@leocare.ai");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await api.login({ email, password });
      setAuthToken(res.access_token);
      localStorage.setItem("leo_user_role", res.role);
      localStorage.setItem("leo_user_name", res.full_name);

      if (res.role === "ELDERLY_USER") {
        router.push("/elderly");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (presetEmail: string, role: string) => {
    setEmail(presetEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex bg-primary text-white p-3 rounded-2xl shadow-md mb-4">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign In to LEO Care</h2>
        <p className="mt-2 text-sm text-slate-600">
          Or select a demo role below for instant one-click testing
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Quick 1-Click Demo Profiles */}
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Demo Persona:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePreset("caregiver@leocare.ai", "CAREGIVER")}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                  email === "caregiver@leocare.ai"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="block font-bold">👩‍⚕️ Caregiver</span>
                <span className="text-[10px] text-slate-500 font-normal">Sarah Jenkins, RN</span>
              </button>

              <button
                type="button"
                onClick={() => handlePreset("elderly@leocare.ai", "ELDERLY_USER")}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                  email === "elderly@leocare.ai"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="block font-bold">👴 Elderly User</span>
                <span className="text-[10px] text-slate-500 font-normal">Muhammad Ali</span>
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-primary focus:border-primary"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              {loading ? "Authenticating..." : "Sign In to Assistant"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
