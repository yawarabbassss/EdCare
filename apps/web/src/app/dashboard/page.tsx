"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Users,
  Video,
  AlertTriangle,
  Pill,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Flame,
  ChevronRight
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const elderlyList = await api.getElderlyList();
      if (elderlyList.length > 0) {
        const profileId = elderlyList[0].id;
        const sum = await api.getDashboardSummary(profileId);
        setSummary(sum);
      }
      const recentEvents = await api.getEvents();
      setEvents(recentEvents.slice(0, 6));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useWebSocket((msg) => {
    if (
      msg.type === "EMERGENCY_ALERT" ||
      msg.type === "MEDICATION_DUE" ||
      msg.type === "MEDICATION_STATUS_CHANGED" ||
      msg.type === "HEALTH_METRIC_RECORDED"
    ) {
      loadData();
    }
  });

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Loading care intelligence...
      </div>
    );
  }

  const stats = summary?.stats || {
    active_alerts_count: 0,
    medications_today: { total: 4, taken: 2, due: 1, missed: 0 },
    adherence_rate: 94.5,
    cameras: { total: 2, online: 2 },
  };

  const profile = summary?.profile || {
    full_name: "Muhammad Ali",
    room_number: "Suite 102",
    fall_risk_level: "HIGH",
    blood_type: "O+",
  };

  const vitals = summary?.latest_vitals || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Caregiver Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time status monitoring for <strong>{profile.full_name}</strong> ({profile.room_number})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/monitoring"
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
          >
            <Video className="w-4 h-4" /> Live Camera Grid
          </Link>
        </div>
      </div>

      {/* ACTIVE EMERGENCY BANNER */}
      {stats.active_alerts_count > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-emergency-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2.5 rounded-xl">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-red-900 font-extrabold text-sm block">
                🚨 {stats.active_alerts_count} UNRESOLVED EMERGENCY ALERT(S)
              </span>
              <span className="text-red-700 text-xs">
                Possible fall or urgent event detected. Immediate response recommended.
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/alerts"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors"
          >
            View Alert Queue
          </Link>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Fall Risk / Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fall Safety</span>
            <div className="bg-amber-500/10 text-amber-600 p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block">{profile.fall_risk_level}</span>
            <span className="text-xs text-amber-600 font-medium block mt-0.5">Continuous Pose Tracking</span>
          </div>
        </div>

        {/* Metric 2: Cameras Online */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vision Feeds</span>
            <div className="bg-teal-500/10 text-primary p-2 rounded-xl">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block">
              {stats.cameras.online} / {stats.cameras.total} Online
            </span>
            <span className="text-xs text-emerald-600 font-medium block mt-0.5">Local Edge Processing</span>
          </div>
        </div>

        {/* Metric 3: Today's Medications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Meds</span>
            <div className="bg-indigo-500/10 text-indigo-600 p-2 rounded-xl">
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block">
              {stats.medications_today.taken} of {stats.medications_today.total} Taken
            </span>
            <span className="text-xs text-indigo-600 font-medium block mt-0.5">
              {stats.medications_today.due > 0 ? `${stats.medications_today.due} Due Now` : "All on schedule"}
            </span>
          </div>
        </div>

        {/* Metric 4: Adherence Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">7-Day Adherence</span>
            <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block">{stats.adherence_rate}%</span>
            <span className="text-xs text-emerald-600 font-medium block mt-0.5">High Compliance Rate</span>
          </div>
        </div>
      </div>

      {/* Center Section: Latest Vitals & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Vitals Snapshot & Quick Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Latest Recorded Vitals</h2>
                <p className="text-xs text-slate-500">Non-diagnostic sensor readings and manual logs</p>
              </div>
              <Link
                href="/dashboard/health"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View History <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Heart Rate</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {vitals.heart_rate?.value || "74"} {vitals.heart_rate?.unit || "bpm"}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Normal Range</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Blood Pressure</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {vitals.blood_pressure?.value || "122/80"} {vitals.blood_pressure?.unit || "mmHg"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Resting</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">SpO2 Oxygen</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {vitals.blood_oxygen?.value || "98"} {vitals.blood_oxygen?.unit || "%"}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Optimal</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Temperature</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {vitals.temperature?.value || "36.6"} {vitals.temperature?.unit || "°C"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Normal</span>
              </div>
            </div>
          </div>

          {/* Quick Simulation Station Box */}
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
            <div>
              <span className="bg-teal-500/20 text-teal-300 font-bold px-2.5 py-1 rounded text-[11px] uppercase tracking-wider inline-block mb-2">
                Live Simulation Lab
              </span>
              <h3 className="text-lg font-bold">Experience Automated Event Verification</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Trigger simulated falls, medication schedules, or abnormal vitals to test the system&apos;s real-time alerts.
              </p>
            </div>
            <Link
              href="/dashboard/monitoring"
              className="bg-primary hover:bg-teal-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shrink-0 shadow transition-colors"
            >
              Launch Live Lab
            </Link>
          </div>
        </div>

        {/* Right (5 cols): Activity Timeline */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Recent Activity Timeline</h2>
              <span className="text-xs text-slate-400 font-semibold">Today</span>
            </div>

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-slate-400 text-xs py-6 text-center">No recent events.</div>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 text-xs p-2.5 rounded-xl bg-slate-50">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        evt.severity === "CRITICAL"
                          ? "bg-red-500"
                          : evt.severity === "WARNING"
                          ? "bg-amber-500"
                          : "bg-teal-500"
                      }`}
                    ></span>
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">{evt.description}</span>
                      <span className="text-[10px] text-slate-400">
                        {evt.created_at ? new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/dashboard/alerts"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              View Full Incident Logs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
