"use client";

import React, { useState } from "react";
import { Settings, Sliders, Bell, Shield, Video, CheckCircle2, Lock } from "lucide-react";

export default function SettingsPage() {
  const [sensitivity, setSensitivity] = useState(85);
  const [confirmSec, setConfirmSec] = useState(3.0);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [localVisionOnly, setLocalVisionOnly] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System & Privacy Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure computer vision fall sensitivity, emergency escalations, and notification channels
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Section 1: Computer Vision Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-slate-900">Fall Detection Calibration</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">Detection Sensitivity ({sensitivity}%)</label>
                <span className="text-slate-400">Default: 85%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-slate-500 text-[11px] mt-1">
                Higher sensitivity catches minor falls faster; lower sensitivity prevents false alarms during active exercises.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">
                  Multi-Frame Confirmation Window ({confirmSec} seconds)
                </label>
                <span className="text-slate-400">Recommended: 2.5s - 3.5s</span>
              </div>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="8.0"
                value={confirmSec}
                onChange={(e) => setConfirmSec(parseFloat(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Privacy-First Architecture */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Privacy & Camera Security</h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={localVisionOnly}
                onChange={(e) => setLocalVisionOnly(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <span className="font-bold text-slate-900 block">Privacy-First Edge Processing Mode</span>
                <span className="text-slate-500 block text-[11px]">
                  Fall detection occurs strictly on local compute; video frames are never streamed to public cloud servers without caregiver request.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Notification Delivery Channels */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Caregiver Notification Channels</h2>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={pushNotifs}
                onChange={(e) => setPushNotifs(e.target.checked)}
                className="accent-primary"
              />
              <span className="font-bold text-slate-900">WebSockets & Browser Push Notifications</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="accent-primary"
              />
              <span className="font-bold text-slate-900">Emergency Escalation Emails</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Preferences saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto bg-primary hover:bg-primary-dark text-white font-bold px-6 py-2.5 rounded-xl shadow transition-colors text-sm"
          >
            Save All Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
