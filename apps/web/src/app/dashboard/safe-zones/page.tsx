"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Camera, CameraZone } from "@/types";
import { Shield, Plus, Trash2, CheckCircle2, Video, Sparkles } from "lucide-react";

export default function SafeZonesPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [zones, setZones] = useState<CameraZone[]>([]);
  const [loading, setLoading] = useState(true);

  // New Zone Form
  const [zoneName, setZoneName] = useState("");
  const [zoneType, setZoneType] = useState("BED");
  const [suppress, setSuppress] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const camList = await api.getCameras();
      setCameras(camList);
      if (camList.length > 0) {
        const cam = selectedCamera || camList[0];
        setSelectedCamera(cam);
        const zList = await api.getZones(cam.id);
        setZones(zList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCam = async (cam: Camera) => {
    setSelectedCamera(cam);
    const zList = await api.getZones(cam.id);
    setZones(zList);
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera) return;
    try {
      await api.createZone(selectedCamera.id, {
        name: zoneName,
        zone_type: zoneType,
        coordinates_json: "[[200, 200], [500, 200], [500, 400], [200, 400]]",
        suppress_fall_alerts: suppress,
        enabled: true,
      });
      setShowAdd(false);
      setZoneName("");
      const zList = await api.getZones(selectedCamera.id);
      setZones(zList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!selectedCamera) return;
    try {
      await api.deleteZone(id);
      const zList = await api.getZones(selectedCamera.id);
      setZones(zList);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Safe Zones Configuration</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Designate expected resting areas (Bed, Sofa, Recliner) to suppress false alarms
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Safe Zone
        </button>
      </div>

      {/* Camera Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase">Camera:</span>
        {cameras.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelectCam(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCamera?.id === c.id
                ? "bg-primary text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Visual Zone Canvas Representation */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400">
                FRAME PERSPECTIVE: {selectedCamera?.name} ({selectedCamera?.location})
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">
                {zones.length} Zones Configured
              </span>
            </div>

            {/* SVG Zone Layout */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl h-64 relative overflow-hidden flex items-center justify-center p-4">
              <svg className="w-full h-full" viewBox="0 0 640 480">
                {/* Simulated Room Floor */}
                <line x1="0" y1="360" x2="640" y2="360" stroke="#334155" strokeWidth="2" />
                <rect x="0" y="360" width="640" height="120" fill="#1E293B" opacity="0.5" />

                {/* Render Zones */}
                {zones.map((z, idx) => (
                  <g key={z.id}>
                    <rect
                      x={idx === 0 ? 400 : 120}
                      y={idx === 0 ? 250 : 220}
                      width={idx === 0 ? 200 : 180}
                      height={idx === 0 ? 180 : 140}
                      fill="rgba(15, 118, 110, 0.25)"
                      stroke="#0F766E"
                      strokeWidth="2"
                      strokeDasharray="4"
                      rx="8"
                    />
                    <text
                      x={idx === 0 ? 410 : 130}
                      y={idx === 0 ? 280 : 250}
                      fill="#5EEAD4"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {z.name} ({z.zone_type})
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            💡 Safe zones automatically suppress fall alarms when resident remains in bed or sofa.
          </p>
        </div>

        {/* Right (5 cols): Zone List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Active Safe Zones</h2>

          <div className="divide-y divide-slate-100">
            {zones.length === 0 ? (
              <div className="text-slate-400 text-xs py-8 text-center">
                No safe zones defined for this camera.
              </div>
            ) : (
              zones.map((z) => (
                <div key={z.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{z.name}</span>
                    <span className="text-xs text-slate-500">
                      Type: {z.zone_type} &bull; Suppress Alerts: {z.suppress_fall_alerts ? "Yes" : "No"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteZone(z.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Zone Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Camera Safe Zone</h3>
            <form onSubmit={handleCreateZone} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bed Area, Living Room Sofa"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Zone Type</label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                >
                  <option value="BED">Bed (Lying Allowed)</option>
                  <option value="SOFA">Sofa / Couch</option>
                  <option value="CHAIR">Recliner Chair</option>
                  <option value="BATHROOM">Bathroom Entry</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
