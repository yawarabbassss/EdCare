"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeAuthToken, api } from "@/lib/api";
import { Shield, Bell, HeartPulse, User, LogOut, LayoutDashboard, Tablet, Radio } from "lucide-react";

export function Navbar() {
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [userName, setUserName] = useState<string>("Sarah Jenkins, RN");
  const [userRole, setUserRole] = useState<string>("CAREGIVER");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alerts = await api.getAlerts(undefined, "DETECTED");
        setActiveAlertsCount(alerts.length);
      } catch (_) {}
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    window.location.href = "/login";
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-8 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-primary text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight block leading-none">
                Ed<span className="text-primary font-bold">Care</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase block mt-0.5">
                AI Elderly Care Assistant
              </span>
            </div>
          </Link>
        </div>

        {/* Center Nav Portals */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-sm font-medium">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-primary hover:bg-white transition-all flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4 text-primary" />
            Caregiver Dashboard
          </Link>

          <Link
            href="/elderly"
            className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-teal-700 hover:bg-white transition-all flex items-center gap-1.5 font-semibold"
          >
            <Tablet className="w-4 h-4 text-teal-600" />
            Elderly Kiosk / Tablet Mode
          </Link>
        </nav>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {/* Emergency Alert Indicator */}
          {activeAlertsCount > 0 ? (
            <Link
              href="/dashboard/alerts"
              className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              {activeAlertsCount} ACTIVE ALERT{activeAlertsCount > 1 ? "S" : ""}
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              System Normal
            </div>
          )}

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:block text-right">
              <span className="block text-xs font-semibold text-slate-900">{userName}</span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider">{userRole}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
