"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AuditLog } from "@/types";
import { FileText, ShieldCheck, Clock, User, Terminal } from "lucide-react";

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security & Audit Trail</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Immutable system log of caregiver acknowledgements, prescription changes, and fall alerts
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading audit events...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No audit logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const timeStr = log.created_at
                ? new Date(log.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "";

              return (
                <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 text-slate-700 p-2 rounded-xl mt-0.5">
                      <Terminal className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                        {log.target_type && (
                          <span className="text-slate-500 text-[11px]">
                            Target: {log.target_type}
                          </span>
                        )}
                      </div>

                      {log.details_json && log.details_json !== "{}" && (
                        <p className="text-slate-600 font-mono text-[11px] mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200 max-w-xl truncate">
                          {log.details_json}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeStr}</span>
                    </div>
                    {log.ip_address && <span className="text-[10px] block mt-0.5">{log.ip_address}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
