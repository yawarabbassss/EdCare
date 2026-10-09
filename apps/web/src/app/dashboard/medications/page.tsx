"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Medication, MedicationLog } from "@/types";
import {
  Pill,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Trash2,
  Check
} from "lucide-react";

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [adherence, setAdherence] = useState<number>(94.5);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Medication Form State
  const [newName, setNewName] = useState("");
  const [newDosage, setNewDosage] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newFrequency, setNewFrequency] = useState("ONCE_DAILY");
  const [newTime, setNewTime] = useState("08:00");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const elderlyList = await api.getElderlyList();
      const elderlyId = elderlyList[0]?.id;

      const [medsData, logsData, adhData] = await Promise.all([
        api.getMedications(elderlyId),
        api.getMedicationLogs(elderlyId, 0),
        elderlyId ? api.getAdherenceRate(elderlyId) : Promise.resolve({ adherence_rate_percentage: 95 }),
      ]);

      setMedications(medsData);
      setLogs(logsData);
      if (adhData?.adherence_rate_percentage) {
        setAdherence(adhData.adherence_rate_percentage);
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

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const elderlyList = await api.getElderlyList();
      const elderlyId = elderlyList[0]?.id;

      await api.createMedication({
        elderly_id: elderlyId,
        name: newName,
        dosage: newDosage,
        instructions: newInstructions,
        frequency: newFrequency,
        schedules: [{ reminder_time: newTime, days_of_week: "ALL", is_active: true }],
      });

      setShowAddModal(false);
      setNewName("");
      setNewDosage("");
      setNewInstructions("");
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLog = async (logId: string, status: string) => {
    try {
      await api.updateMedicationLogStatus(logId, status);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm("Are you sure you want to remove this medication prescription?")) return;
    try {
      await api.deleteMedication(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Medication Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Prescriptions, daily reminder schedules, and patient adherence tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Prescription
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Active Prescriptions
          </span>
          <span className="text-3xl font-black text-slate-900 block mt-2">{medications.length}</span>
          <span className="text-xs text-slate-500 mt-0.5 block">Managed for Muhammad Ali</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Today&apos;s Doses Taken
          </span>
          <span className="text-3xl font-black text-emerald-600 block mt-2">
            {logs.filter((l) => l.status === "TAKEN").length} / {logs.length}
          </span>
          <span className="text-xs text-emerald-600 font-semibold mt-0.5 block">
            {logs.filter((l) => l.status === "DUE").length} Due Now
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            7-Day Adherence Score
          </span>
          <span className="text-3xl font-black text-indigo-600 block mt-2">{adherence}%</span>
          <span className="text-xs text-slate-500 mt-0.5 block">Automated escalation enabled</span>
        </div>
      </div>

      {/* Main Grid: Today's Dose Log & Prescriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 cols): Today's Schedule & Status */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Today&apos;s Dose Checklist</h2>
            <span className="text-xs font-semibold text-slate-500">Live Adherence Status</span>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="text-slate-400 text-xs py-8 text-center">
                No medication doses scheduled for today.
              </div>
            ) : (
              logs.map((log) => {
                const isTaken = log.status === "TAKEN";
                const isDue = log.status === "DUE";
                const time = new Date(log.scheduled_for).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={log.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      isTaken
                        ? "bg-emerald-50/50 border-emerald-200 text-slate-600"
                        : isDue
                        ? "bg-amber-50 border-amber-300 text-slate-900 animate-pulse"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{time}</span>
                        {isDue && (
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            DUE NOW
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm block mt-0.5">
                        {log.medication?.name} ({log.medication?.dosage})
                      </span>
                      <span className="text-xs text-slate-500 block">
                        {log.medication?.instructions || "Take with meals"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isTaken ? (
                        <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                          <Check className="w-4 h-4" /> Taken
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUpdateLog(log.id, "TAKEN")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                        >
                          Mark Taken
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right (6 cols): Active Prescriptions CRUD */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Active Prescriptions</h2>
            <span className="text-xs text-slate-500">{medications.length} Prescribed</span>
          </div>

          <div className="divide-y divide-slate-100">
            {medications.map((med) => (
              <div key={med.id} className="py-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-xl mt-0.5">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {med.name} &bull; {med.dosage}
                    </span>
                    <span className="text-xs text-slate-500 block">{med.instructions}</span>
                    <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-1">
                      {med.schedules?.map((s) => s.reminder_time).join(", ") || "08:00"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteMedication(med.id)}
                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add New Medication Prescription</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMedication} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lisinopril, Metformin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10mg, 1 tablet"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Reminder Time</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Take with water after breakfast"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  {saving ? "Saving..." : "Save Medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
