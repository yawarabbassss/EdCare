"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { Bot, Send, User, Sparkles, Terminal, ShieldAlert, CheckCircle2 } from "lucide-react";

interface ChatMessage {
  sender: "user" | "assistant";
  content: string;
  tools?: any[];
  time: string;
}

export default function CaregiverAIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "assistant",
      content:
        "Hello Sarah! I am LEO Care Assistant. I can check Muhammad's medication schedules, recent vitals, fall detection logs, or dispatch family alerts on your behalf. How can I help you today?",
      time: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    const newMsg: ChatMessage = {
      sender: "user",
      content: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      setLoading(true);
      const res = await api.sendChatMessage("caregiver_id", userText);
      const asstMsg: ChatMessage = {
        sender: "assistant",
        content: res.response,
        tools: res.tool_calls,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          content: "Sorry, I encountered an issue processing your request.",
          time: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Care Assistant Console</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Backend-controlled tool calling, schedule queries, and patient status intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chat Stream (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[580px] overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isUser ? "bg-slate-900 text-white" : "bg-primary text-white"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-md space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? "bg-slate-900 text-white rounded-tr-none"
                          : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200"
                      }`}
                    >
                      {m.content}

                      {/* Tool Call Inspector Trace */}
                      {m.tools && m.tools.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs font-mono bg-white/70 p-2 rounded-lg text-slate-700">
                          <span className="font-bold text-[10px] text-teal-800 uppercase block mb-1 flex items-center gap-1">
                            <Terminal className="w-3 h-3" /> Tool Executed: {m.tools[0].tool}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 px-1">{m.time}</span>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-10">
                <Sparkles className="w-4 h-4 animate-spin text-primary" />
                LEO is querying patient records and formulating response...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about medications, vitals, or say 'Trigger emergency'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-primary focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* AI Capabilities & Safety Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-slate-900">Backend Tools Available</h3>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-700 block">get_medications()</span>
                <span className="text-[11px] text-slate-500 font-sans">Fetches active prescriptions & schedules</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-700 block">get_next_medication()</span>
                <span className="text-[11px] text-slate-500 font-sans">Identifies next upcoming or due dose</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-700 block">get_health_records()</span>
                <span className="text-[11px] text-slate-500 font-sans">Reads latest verified vitals</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-red-600 block">trigger_emergency()</span>
                <span className="text-[11px] text-slate-500 font-sans">Dispatches immediate caregiver alert</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-2 text-xs text-amber-900">
            <span className="font-bold uppercase tracking-wider block flex items-center gap-1.5 text-amber-800">
              <ShieldAlert className="w-4 h-4" /> AI Guardrails Active
            </span>
            <p className="leading-relaxed">
              LEO assistant is strictly prohibited from inventing medical facts, making diagnoses, or overriding emergency protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
