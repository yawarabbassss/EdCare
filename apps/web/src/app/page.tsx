"use client";

import React from "react";
import Link from "next/link";
import {
  HeartPulse,
  ShieldCheck,
  Video,
  Pill,
  Activity,
  Mic,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Users,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-8 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              LEO <span className="text-primary font-bold">CARE</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/elderly"
              className="text-sm font-semibold text-slate-700 hover:text-primary px-3 py-2 rounded-lg transition-colors hidden sm:block"
            >
              Elderly Kiosk View
            </Link>
            <Link
              href="/login"
              className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-teal-600" />
          Production-Ready AI Caregiver & Elderly Safety Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          AI-Powered Elderly Care & <span className="text-primary">Safety Monitoring</span> for Families
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Empowering seniors to live independently at home with automated computer-vision fall detection, intelligent medication reminders, vitals monitoring, and friendly conversational AI assistance.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="bg-primary hover:bg-primary-dark text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-base"
          >
            Open Caregiver Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/elderly"
            className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-8 py-4 rounded-2xl border border-slate-300 shadow-sm transition-all flex items-center gap-2 text-base"
          >
            Launch Elderly Tablet Mode
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Multi-Frame Fall Verification
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Safe Zone Suppression
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Real-Time WebSockets
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero Hallucination AI Tools
          </div>
        </div>
      </section>

      {/* Product Architecture & Key Pillars */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Engineered for Safety, Reliability & Privacy</h2>
            <p className="mt-4 text-slate-600">Built from the ground up for high-stakes healthcare monitoring.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <div className="bg-primary/10 text-primary p-3 rounded-xl w-fit mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Frame Fall Detection</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Processes video frames locally with YOLO & OpenCV pose analysis. Measures rapid descent, aspect-ratio flips ($W/H \ge 0.95$), and floor proximity to eliminate single-frame false positives.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <div className="bg-emerald-500/10 text-emerald-700 p-3 rounded-xl w-fit mb-6">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Medication Management</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Automated daily schedule generator with adherence tracking. Sends timely audio-visual cues to the senior and alerts family when medications are missed.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <div className="bg-indigo-500/10 text-indigo-700 p-3 rounded-xl w-fit mb-6">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Conversational AI Voice Companion</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Seniors can speak naturally: &quot;When is my next pill?&quot; or &quot;What is my blood pressure?&quot;. Uses backend-controlled tools without hallucinating medical facts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Medical Disclaimer Banner */}
      <section className="py-10 bg-amber-50/70 border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 text-amber-900 font-semibold mb-2 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-700" />
            Important Healthcare & Safety Disclaimer
          </div>
          <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
            LEO Elderly Care Assistant is an assistance and remote monitoring tool designed to support family caregivers. It is <strong>not</strong> a certified medical device and does not substitute for professional medical advice, clinical diagnosis, or 911 emergency services. Automated fall detection can make mistakes and should not be relied upon as the sole form of safety protection.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-white p-1.5 rounded-lg">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="text-white font-bold tracking-tight">LEO Care Assistant</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} LEO Elderly Care Assistant. Privacy-first, local-vision architecture.
          </p>
        </div>
      </footer>
    </div>
  );
}
