"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  AlertTriangle,
  Mic,
  MicOff,
  Pill,
  Heart,
  Phone,
  CheckCircle2,
  Clock,
  Volume2,
  ShieldCheck,
  Home,
  XCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";

export default function ElderlyKioskPage() {
  const [medLogs, setMedLogs] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any>({
    heart_rate: "74 bpm",
    blood_pressure: "122/80 mmHg",
    blood_oxygen: "98%",
  });
  const [aiResponse, setAiResponse] = useState<string>(
    "Hello Muhammad! I am EdCare, your care companion. How can I help you today?"
  );
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // SOS Emergency countdown state
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosSent, setSosSent] = useState(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial medications and vitals
  const fetchData = async () => {
    try {
      const logs = await api.getMedicationLogs(undefined, 0);
      setMedLogs(logs);
      const vitalsRes = await api.getHealthRecords(undefined, undefined, 1);
      if (vitalsRes.length > 0) {
        const latest: Record<string, string> = {};
        for (const r of vitalsRes) {
          latest[r.metric_type] = `${r.value}${r.secondary_value ? `/${r.secondary_value}` : ""} ${r.unit}`;
        }
        setVitals(latest);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time WebSocket updates
  useWebSocket((msg) => {
    if (msg.type === "MEDICATION_DUE" || msg.type === "MEDICATION_STATUS_CHANGED") {
      fetchData();
    }
  });

  // Speech Recognition setup (Web Speech API)
  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      handleAskAI("When is my next medication?");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("Listening... Please speak now.");
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      handleAskAI(speechToText);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleAskAI = async (queryText: string) => {
    try {
      setAiLoading(true);
      setTranscript(queryText);
      const res = await api.sendChatMessage("elderly_user_id", queryText);
      setAiResponse(res.response);

      // Voice Output (Speech Synthesis)
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(res.response);
        utterance.rate = 0.9; // Friendly gentle pace for seniors
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setAiResponse("I am here to help. You can check your medications or call your family anytime.");
    } finally {
      setAiLoading(false);
    }
  };

  // SOS Countdown handling
  const handleStartSOS = () => {
    setSosActive(true);
    setSosCountdown(5);
    setSosSent(false);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          dispatchSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelSOS = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setSosActive(false);
    setSosCountdown(5);
    setSosSent(false);
  };

  const dispatchSOS = async () => {
    try {
      setSosSent(true);
      await api.triggerSos(undefined, "Elderly Kiosk Station");
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkTaken = async (logId: string) => {
    try {
      await api.updateMedicationLogStatus(logId, "TAKEN");
      fetchData();
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 select-none">
      {/* Top Accessible Status Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-teal-600 text-white p-3 rounded-2xl shadow-lg">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Good Day, Muhammad
            </h1>
            <p className="text-teal-400 text-lg font-semibold flex items-center gap-2 mt-1">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Safety Monitoring Active &bull; Suite 102
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-base font-semibold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Home className="w-5 h-5" /> Caregiver Portal
          </Link>
        </div>
      </header>

      {/* SOS EMERGENCY FULLSCREEN OVERLAY MODAL */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          {!sosSent ? (
            <div className="max-w-xl w-full bg-red-900 border-4 border-red-500 rounded-3xl p-8 shadow-2xl space-y-6">
              <AlertTriangle className="w-24 h-24 text-white mx-auto animate-bounce" />
              <h2 className="text-4xl font-black text-white">EMERGENCY ALERT TRIGGERING</h2>
              <p className="text-2xl text-red-200 font-bold">
                Calling Sarah & Emergency Services in:
              </p>
              <div className="text-7xl font-black text-white bg-red-950/80 w-32 h-32 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-inner">
                {sosCountdown}
              </div>
              <p className="text-lg text-red-200">
                If this was pressed by mistake, press Cancel below.
              </p>
              <button
                onClick={handleCancelSOS}
                className="w-full bg-white hover:bg-slate-100 text-red-900 text-3xl font-black py-6 rounded-2xl shadow-xl transition-transform active:scale-95"
              >
                ✖ CANCEL (I AM SAFE)
              </button>
            </div>
          ) : (
            <div className="max-w-xl w-full bg-emerald-900 border-4 border-emerald-500 rounded-3xl p-8 shadow-2xl space-y-6">
              <CheckCircle2 className="w-24 h-24 text-emerald-300 mx-auto" />
              <h2 className="text-4xl font-black text-white">HELP IS ON THE WAY!</h2>
              <p className="text-2xl text-emerald-100 font-semibold leading-relaxed">
                Emergency alert dispatched to your caregiver <strong>Sarah Jenkins</strong> and emergency contacts. Please stay where you are safely.
              </p>
              <button
                onClick={handleCancelSOS}
                className="w-full bg-white text-emerald-900 text-2xl font-bold py-5 rounded-2xl shadow"
              >
                Close Notice
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main High-Contrast Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1">
        {/* Left Col: Giant 🆘 SOS Button & AI Companion (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* GIANT 🆘 EMERGENCY BUTTON */}
          <button
            onClick={handleStartSOS}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-3xl p-8 shadow-2xl border-4 border-red-400 flex items-center justify-center gap-6 text-3xl sm:text-5xl font-black tracking-tight transition-transform active:scale-95"
          >
            <div className="bg-white/20 p-4 rounded-2xl">
              <AlertTriangle className="w-14 h-14 sm:w-18 sm:h-18 text-white" />
            </div>
            <span>🆘 EMERGENCY HELP</span>
          </button>

          {/* AI VOICE ASSISTANT TILE */}
          <div className="bg-slate-800 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 flex-1 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-500/20 text-teal-300 p-2.5 rounded-2xl border border-teal-500/30">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">EdCare Assistant</h2>
                    <span className="text-teal-400 text-sm font-semibold">Voice & Text Companion</span>
                  </div>
                </div>

                {isListening && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white"></span> Listening...
                  </span>
                )}
              </div>

              {/* Spoken Response Box */}
              <div className="bg-slate-900/90 border-2 border-slate-700 rounded-2xl p-6 min-h-[140px] flex items-center text-xl sm:text-2xl text-slate-100 font-medium leading-relaxed">
                {aiLoading ? (
                  <span className="text-teal-400 font-semibold animate-pulse">
                    LEO is thinking...
                  </span>
                ) : (
                  <span>&quot;{aiResponse}&quot;</span>
                )}
              </div>

              {transcript && (
                <p className="text-sm text-slate-400 mt-2 italic">You said: &quot;{transcript}&quot;</p>
              )}
            </div>

            {/* Voice Push-to-Talk Button & Presets */}
            <div className="mt-6 space-y-4">
              <button
                onClick={startVoiceInput}
                disabled={aiLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-2xl font-bold py-5 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Mic className="w-8 h-8 text-white" />
                {isListening ? "Listening to your voice..." : "Tap to Speak to EdCare"}
              </button>

              {/* Quick Prompt Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm font-semibold">
                <button
                  onClick={() => handleAskAI("When is my next medication?")}
                  className="bg-slate-700/80 hover:bg-slate-700 text-slate-200 p-3 rounded-xl border border-slate-600 text-center"
                >
                  💊 Next Medicine?
                </button>
                <button
                  onClick={() => handleAskAI("What is my blood pressure?")}
                  className="bg-slate-700/80 hover:bg-slate-700 text-slate-200 p-3 rounded-xl border border-slate-600 text-center"
                >
                  🩺 My Blood Pressure?
                </button>
                <button
                  onClick={() => handleAskAI("Call my daughter Sarah")}
                  className="bg-slate-700/80 hover:bg-slate-700 text-slate-200 p-3 rounded-xl border border-slate-600 text-center"
                >
                  📞 Call Sarah
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Today's Medications & Quick Contacts (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* MEDICATIONS CHECKLIST */}
          <div className="bg-slate-800 border-2 border-slate-700 rounded-3xl p-6 shadow-xl flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded-xl">
                <Pill className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Today&apos;s Medications</h2>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              {medLogs.length === 0 ? (
                <div className="text-slate-400 text-lg text-center py-6">
                  No pending medications for today.
                </div>
              ) : (
                medLogs.map((log) => {
                  const isTaken = log.status === "TAKEN";
                  const isDue = log.status === "DUE";
                  const time = new Date(log.scheduled_for).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                        isTaken
                          ? "bg-slate-900/60 border-emerald-800/40 text-slate-400"
                          : isDue
                          ? "bg-teal-950/80 border-teal-500 text-white animate-pulse"
                          : "bg-slate-900 border-slate-700 text-white"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                          {time} {isDue ? "• DUE NOW" : ""}
                        </span>
                        <span className="text-xl font-bold text-white block">
                          {log.medication?.name || "Medication"} ({log.medication?.dosage || ""})
                        </span>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {log.medication?.instructions || "Take with water"}
                        </span>
                      </div>

                      {isTaken ? (
                        <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1.5 rounded-xl border border-emerald-500/30 text-sm flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Taken
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkTaken(log.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-3 rounded-xl shadow text-base active:scale-95 transition-transform"
                        >
                          Mark Taken
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ONE-TAP FAMILY CONTACTS */}
          <div className="bg-slate-800 border-2 border-slate-700 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-500/20 text-indigo-300 p-2 rounded-xl">
                <Phone className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Call Family & Doctor</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="tel:5552345678"
                className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-700 p-4 rounded-2xl flex items-center gap-3 transition-colors"
              >
                <div className="bg-teal-600 text-white p-3 rounded-xl font-bold text-xl">👩</div>
                <div>
                  <span className="text-lg font-bold text-white block">Sarah (Daughter)</span>
                  <span className="text-xs text-slate-400">Primary Caregiver</span>
                </div>
              </a>

              <a
                href="tel:5558901234"
                className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-700 p-4 rounded-2xl flex items-center gap-3 transition-colors"
              >
                <div className="bg-indigo-600 text-white p-3 rounded-xl font-bold text-xl">👨‍⚕️</div>
                <div>
                  <span className="text-lg font-bold text-white block">Dr. Robert Chen</span>
                  <span className="text-xs text-slate-400">Cardiologist</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
