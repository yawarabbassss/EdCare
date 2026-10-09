"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { AlertTriangle, Activity, Pill, Video, RefreshCw, CheckCircle, Sparkles } from "lucide-react";

export function DemoControllerBar() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSimulate = async (type: "fall" | "med" | "vitals" | "walk" | "bed") => {
    try {
      setLoadingAction(type);
      setFeedback(null);

      if (type === "fall") {
        await api.simulateFall(undefined, "Bedroom");
        setFeedback("🚨 Simulated Fall Dispatched! Check alerts.");
      } else if (type === "med") {
        await api.simulateMedicationDue();
        setFeedback("💊 Simulated Medication DUE NOW event broadcasted!");
      } else if (type === "vitals") {
        await api.simulateVitalsAnomaly(undefined, "heart_rate", 126, "bpm");
        setFeedback("🩺 Simulated High Heart Rate (126 bpm) event sent!");
      }

      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback(`Simulation error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5" /> Interactive Demo Studio
        </span>
        <span className="text-slate-400 hidden sm:inline">Simulate realistic healthcare events in real-time:</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleSimulate("fall")}
          disabled={loadingAction !== null}
          className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Simulate Fall
        </button>

        <button
          onClick={() => handleSimulate("med")}
          disabled={loadingAction !== null}
          className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Pill className="w-3.5 h-3.5" />
          Simulate Pill Due
        </button>

        <button
          onClick={() => handleSimulate("vitals")}
          disabled={loadingAction !== null}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Activity className="w-3.5 h-3.5" />
          Simulate High HR (126 bpm)
        </button>

        {feedback && (
          <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {feedback}
          </span>
        )}
      </div>
    </div>
  );
}
