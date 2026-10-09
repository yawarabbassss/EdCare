"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Alert } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Clock,
  MapPin,
  Filter,
  CheckCircle2,
  RefreshCw,
  Phone
} from "lucide-react";

export default function EmergencyAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts(
        undefined,
        filterStatus === "ALL" ? undefined : filterStatus
      );
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus]);

  useWebSocket((msg) => {
    if (msg.type === "EMERGENCY_ALERT" || msg.type === "ALERT_STATUS_UPDATED" || msg.type === "ALERT_ESCALATED") {
      fetchAlerts();
    }
  });

  const handleUpdateStatus = async (alertId: string, status: string, notes?: string) => {
    try {
      await api.updateAlertStatus(alertId, status, notes);
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Alerts</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified fall incidents, manual SOS triggers, and system escalations
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
          {["ALL", "DETECTED", "ACKNOWLEDGED", "RESOLVED", "FALSE_ALARM"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === status
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading && alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No emergency alerts found</p>
            <p className="text-xs text-slate-400">All residents are resting and monitored safely.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((a) => {
              const isDetected = a.status === "DETECTED" || a.status === "ESCALATED";
              const timeStr = a.created_at
                ? new Date(a.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recent";

              return (
                <div
                  key={a.id}
                  className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    isDetected ? "bg-red-50/50 border-l-4 border-l-red-500" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isDetected
                          ? "bg-red-600 text-white animate-bounce"
                          : a.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {a.alert_type.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isDetected
                              ? "bg-red-600 text-white animate-pulse"
                              : a.status === "ACKNOWLEDGED"
                              ? "bg-amber-100 text-amber-800"
                              : a.status === "FALSE_ALARM"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {a.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {a.location || "Living Room"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {timeStr}
                        </span>
                        <span>Confidence: {Math.round(a.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for unacknowledged / active alerts */}
                  {isDetected && (
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() =>
                          handleUpdateStatus(a.id, "ACKNOWLEDGED", "Caregiver responding to incident")
                        }
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>

                      <button
                        onClick={() =>
                          handleUpdateStatus(a.id, "FALSE_ALARM", "Verified sitting/tying shoes")
                        }
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        False Alarm
                      </button>
                    </div>
                  )}

                  {a.status === "ACKNOWLEDGED" && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(a.id, "RESOLVED", "Resident helped and in safe condition")
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors self-end sm:self-center shrink-0 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Resolved
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
