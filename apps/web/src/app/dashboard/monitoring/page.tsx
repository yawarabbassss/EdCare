"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Camera, CameraZone } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Video,
  AlertTriangle,
  Play,
  Shield,
  RefreshCw,
  Maximize2,
  CheckCircle,
  Eye,
  Sliders,
  Sparkles
} from "lucide-react";

export default function LiveMonitoringPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const camList = await api.getCameras();
      setCameras(camList);
      if (camList.length > 0 && !selectedCamera) {
        setSelectedCamera(camList[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleSimAction = async (action: string) => {
    if (!selectedCamera) return;
    try {
      setSimFeedback(`Setting stream behavior: ${action}...`);
      await api.triggerCameraSim(selectedCamera.id, action);
      setSimFeedback(`Behavior updated to ${action}`);
      setTimeout(() => setSimFeedback(null), 4000);
    } catch (e: any) {
      setSimFeedback(`Error: ${e.message}`);
    }
  };

  const streamUrl = selectedCamera
    ? `http://127.0.0.1:8000/api/v1/cameras/${selectedCamera.id}/stream`
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Camera Monitoring</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time multi-frame pose estimation & fall detection stream
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cameras.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setSelectedCamera(cam)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCamera?.id === cam.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {cam.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Video Player & Overlays */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col justify-between">
          {/* Top Camera Stream Bar */}
          <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">{selectedCamera?.name || "Living Room Camera"}</span>
              <span className="text-slate-400 font-medium">({selectedCamera?.location || "Living Room"})</span>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <span>15 FPS</span>
              <span>1280x720</span>
              <span className="bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/30">
                AI Vision Active
              </span>
            </div>
          </div>

          {/* Video Stream Element */}
          <div className="relative bg-slate-900 min-h-[420px] flex items-center justify-center">
            {selectedCamera ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={streamUrl}
                alt="Live Camera Vision Feed"
                className="w-full h-auto object-contain max-h-[500px]"
              />
            ) : (
              <div className="text-slate-500 text-sm">Select a camera to start live stream</div>
            )}

            {/* Live HUD Badge */}
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[11px] font-mono border border-slate-700">
              REC &bull; LIVE &bull; YOLO POSE TRACKER
            </div>
          </div>

          {/* Bottom Stream Status */}
          <div className="bg-slate-900 px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Safe Zones Filter: <strong>Bed & Sofa Protected</strong></span>
            </div>

            {simFeedback && (
              <span className="text-teal-300 font-semibold bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                {simFeedback}
              </span>
            )}
          </div>
        </div>

        {/* Right (4 cols): Vision Pipeline HUD & Simulation Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Computer Vision Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Vision Simulation Studio</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Test how the multi-frame pose algorithm detects and verifies movements in real time:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => handleSimAction("FALL")}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-3 rounded-xl text-xs flex items-center justify-between shadow transition-colors"
              >
                <span>🚨 Simulate Sudden Fall</span>
                <span className="bg-red-800 px-2 py-0.5 rounded text-[10px]">Triggers Emergency</span>
              </button>

              <button
                onClick={() => handleSimAction("WALKING")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-3 rounded-xl text-xs flex items-center justify-between border border-slate-200 transition-colors"
              >
                <span>🚶 Simulate Normal Walking</span>
                <span className="text-slate-500 text-[10px]">Normal State</span>
              </button>

              <button
                onClick={() => handleSimAction("SITTING")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-3 rounded-xl text-xs flex items-center justify-between border border-slate-200 transition-colors"
              >
                <span>🪑 Simulate Sitting on Chair</span>
                <span className="text-slate-500 text-[10px]">No Fall</span>
              </button>

              <button
                onClick={() => handleSimAction("BED_SAFE")}
                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold p-3 rounded-xl text-xs flex items-center justify-between border border-emerald-200 transition-colors"
              >
                <span>🛏️ Simulate Lying in Bed</span>
                <span className="text-emerald-700 text-[10px] font-bold">Safe Zone Suppressed</span>
              </button>
            </div>
          </div>

          {/* Algorithm Verification Rules Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Multi-Frame Verification Rules
            </h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Aspect Ratio Flip:</strong> Width/Height &ge; 0.95 (vertical to horizontal).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Floor Proximity:</strong> Lower centroid resting near ground level.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>3.0s Verification Window:</strong> Eliminates false alarms from tying shoes or picking up objects.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
