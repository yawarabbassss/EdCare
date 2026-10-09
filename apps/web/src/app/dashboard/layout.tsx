"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { EmergencyAlertModal } from "@/components/EmergencyAlertModal";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Alert } from "@/types";
import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  Pill,
  Activity,
  Bot,
  Shield,
  Phone,
  FileText,
  Settings,
  Sparkles,
  ChevronRight,
  HeartPulse
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<Alert | null>(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  const fetchActiveAlerts = async () => {
    try {
      const alerts = await api.getAlerts(undefined, "DETECTED");
      setActiveAlertsCount(alerts.length);
      if (alerts.length > 0 && !activeEmergencyAlert) {
        // Show emergency modal if not already opened
        setActiveEmergencyAlert(alerts[0]);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

  // Listen to WebSocket emergency broadcasts
  useWebSocket((msg) => {
    if (msg.type === "EMERGENCY_ALERT") {
      fetchActiveAlerts();
      if (msg.alert) {
        setActiveEmergencyAlert(msg.alert as Alert);
      }
    } else if (msg.type === "ALERT_STATUS_UPDATED") {
      fetchActiveAlerts();
    }
  });

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Live Monitoring", href: "/dashboard/monitoring", icon: Video },
    {
      name: "Emergency Alerts",
      href: "/dashboard/alerts",
      icon: AlertTriangle,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
    },
    { name: "Medications", href: "/dashboard/medications", icon: Pill },
    { name: "Health Vitals", href: "/dashboard/health", icon: Activity },
    { name: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
    { name: "Safe Zones", href: "/dashboard/safe-zones", icon: Shield },
    { name: "Emergency Contacts", href: "/dashboard/contacts", icon: Phone },
    { name: "Audit Trail", href: "/dashboard/audit", icon: FileText },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Emergency Alert Modal (pops up on real-time fall detection) */}
      <EmergencyAlertModal
        alert={activeEmergencyAlert}
        onClose={() => setActiveEmergencyAlert(null)}
        onStatusUpdated={fetchActiveAlerts}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Caregiver Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm sticky top-28 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Caregiver Console
            </div>

            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                    <span>{item.name}</span>
                  </div>

                  {item.badge ? (
                    <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-100 px-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Active Patient
                </span>
                <span className="text-sm font-bold text-slate-900 block">Muhammad Ali</span>
                <span className="text-xs text-slate-500 block">Suite 102 &bull; High Fall Risk</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dashboard Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
