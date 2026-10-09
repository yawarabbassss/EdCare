"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { HealthRecord, HealthThreshold } from "@/types";
import {
  Activity,
  Heart,
  Plus,
  TrendingUp,
  AlertCircle,
  Sliders,
  CheckCircle,
  Info
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function HealthVitalsPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [thresholds, setThresholds] = useState<HealthThreshold[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("heart_rate");
  const [loading, setLoading] = useState(true);

  // New Vitals Entry State
  const [metricType, setMetricType] = useState("heart_rate");
  const [val, setVal] = useState("76");
  const [secVal, setSecVal] = useState("");
  const [unit, setUnit] = useState("bpm");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const elderlyList = await api.getElderlyList();
      const elderlyId = elderlyList[0]?.id;

      const [recData, threshData] = await Promise.all([
        api.getHealthRecords(elderlyId, undefined, 14),
        api.getHealthThresholds(elderlyId),
      ]);

      setRecords(recData);
      setThresholds(threshData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const elderlyList = await api.getElderlyList();
      const elderlyId = elderlyList[0]?.id;

      await api.addHealthRecord({
        elderly_id: elderlyId,
        metric_type: metricType,
        value: parseFloat(val),
        secondary_value: secVal ? parseFloat(secVal) : undefined,
        unit: unit,
        source: "MANUAL",
      });

      setFeedback("Vital reading recorded successfully!");
      setTimeout(() => setFeedback(null), 4000);
      loadData();
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Format chart data for Recharts
  const chartData = records
    .filter((r) => r.metric_type === selectedMetric)
    .map((r) => ({
      time: new Date(r.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
      value: r.value,
      secondary: r.secondary_value,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Health Vitals & Trends</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Non-diagnostic physiological tracking and safe threshold alerts
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: "heart_rate", label: "Heart Rate" },
            { id: "blood_pressure", label: "Blood Pressure" },
            { id: "blood_oxygen", label: "SpO2 Oxygen" },
            { id: "temperature", label: "Temperature" },
            { id: "blood_glucose", label: "Glucose" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMetric(m.id);
                setMetricType(m.id);
                setUnit(
                  m.id === "heart_rate"
                    ? "bpm"
                    : m.id === "blood_pressure"
                    ? "mmHg"
                    : m.id === "blood_oxygen"
                    ? "%"
                    : m.id === "temperature"
                    ? "°C"
                    : "mg/dL"
                );
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedMetric === m.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Historical Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              14-Day Historical Trend: {selectedMetric.replace("_", " ").toUpperCase()}
            </h2>
            <p className="text-xs text-slate-400">Continuous daily sensor trend lines</p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                  border: "none",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0F766E"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorVal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Quick Vitals Entry & Non-Diagnostic Safe Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 cols): Log Reading Form */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-slate-900">Log Manual Vital Reading</h3>
          </div>

          <form onSubmit={handleAddVital} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Metric Type</label>
                <select
                  value={metricType}
                  onChange={(e) => {
                    setMetricType(e.target.value);
                    setSelectedMetric(e.target.value);
                  }}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="heart_rate">Heart Rate (bpm)</option>
                  <option value="blood_pressure">Blood Pressure (mmHg)</option>
                  <option value="blood_oxygen">SpO2 Oxygen (%)</option>
                  <option value="temperature">Temperature (°C)</option>
                  <option value="blood_glucose">Blood Glucose (mg/dL)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Primary Value</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>
            </div>

            {metricType === "blood_pressure" && (
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Diastolic Value</label>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={secVal}
                  onChange={(e) => setSecVal(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl shadow transition-colors text-sm"
            >
              {saving ? "Saving reading..." : "Record Vital Entry"}
            </button>

            {feedback && (
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {feedback}
              </p>
            )}
          </form>
        </div>

        {/* Right (6 cols): Configured Safety Limits & Disclaimer */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Configured Safe Ranges</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800">Heart Rate</span>
              <span className="text-slate-600 font-semibold">55 bpm - 105 bpm</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800">Blood Oxygen (SpO2)</span>
              <span className="text-slate-600 font-semibold">Min: 93%</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800">Temperature</span>
              <span className="text-slate-600 font-semibold">36.0°C - 37.8°C</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800">Blood Glucose</span>
              <span className="text-slate-600 font-semibold">70 mg/dL - 160 mg/dL</span>
            </div>
          </div>

          {/* Medical Disclaimer Callout */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Non-Diagnostic Disclaimer:</strong> This system is for monitoring and assistance only and is not a substitute for professional medical care.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
