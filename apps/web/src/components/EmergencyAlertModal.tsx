"use client";

import React, { useState } from "react";
import { Alert } from "@/types";
import { api } from "@/lib/api";
import { AlertTriangle, Phone, CheckCircle, ShieldAlert, Video, X } from "lucide-react";
import Link from "next/link";

interface EmergencyAlertModalProps {
  alert: Alert | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export function EmergencyAlertModal({ alert, onClose, onStatusUpdated }: EmergencyAlertModalProps) {
  const [loading, setLoading] = useState(false);

  if (!alert) return null;

  const handleUpdateStatus = async (status: string, notes?: string) => {
    try {
      setLoading(true);
      await api.updateAlertStatus(alert.id, status, notes);
      onStatusUpdated();
      onClose();
    } catch (e) {
      console.error("Failed to update alert:", e);
    } finally {
      setLoading(false);
    }
  };

  const timeStr = alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-red-500 animate-emergency-pulse">
        {/* Header Banner */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <AlertTriangle className="w-7 h-7 text-white animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">🚨 POSSIBLE FALL DETECTED</h2>
              <p className="text-red-100 text-xs font-medium">Immediate caregiver verification required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <div>
              <span className="text-slate-500 text-xs font-semibold block uppercase">Elderly User</span>
              <span className="font-bold text-slate-900 text-base">Muhammad Ali</span>
              <span className="text-slate-500 text-xs block">Suite 102 - Room 101</span>
            </div>

            <div>
              <span className="text-slate-500 text-xs font-semibold block uppercase">Location</span>
              <span className="font-bold text-slate-900 text-base">{alert.location || "Bedroom"}</span>
              <span className="text-slate-500 text-xs block">Monitored Cam #1</span>
            </div>

            <div>
              <span className="text-slate-500 text-xs font-semibold block uppercase">Time Detected</span>
              <span className="font-semibold text-slate-900">{timeStr}</span>
            </div>

            <div>
              <span className="text-slate-500 text-xs font-semibold block uppercase">AI Confidence</span>
              <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {Math.round(alert.confidence * 100)}% Verified
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed italic bg-amber-50 p-3 rounded-lg border border-amber-200">
            ⚠️ <strong>Safety Notice:</strong> Automated fall detection is an assistance feature. Please verify with the resident directly or view live video before concluding false alarm.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/dashboard/monitoring"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-center flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Video className="w-4 h-4" />
              View Camera
            </Link>

            <a
              href="tel:911"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl text-center flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Resident / 911
            </a>

            <button
              onClick={() => handleUpdateStatus("ACKNOWLEDGED", "Caregiver attending to resident")}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Acknowledge
            </button>

            <button
              onClick={() => handleUpdateStatus("FALSE_ALARM", "Resident verified sitting safely on floor/carpet")}
              disabled={loading}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" />
              Mark Safe / False Alarm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
