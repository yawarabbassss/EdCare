"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { EmergencyContact } from "@/types";
import { Phone, Plus, Trash2, Shield, User, HeartPulse, Mail } from "lucide-react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [rel, setRel] = useState("Family Member");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const elderlyList = await api.getElderlyList();
      const elderlyId = elderlyList[0]?.id;
      const data = await api.getContacts(elderlyId);
      setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const elderlyList = await api.getElderlyList();
      const elderlyId = elderlyList[0]?.id;
      await api.addContact({
        elderly_id: elderlyId,
        name,
        relationship: rel,
        phone_number: phone,
        email,
        is_primary: contacts.length === 0,
        priority_order: contacts.length + 1,
      });
      setShowAdd(false);
      setName("");
      setPhone("");
      setEmail("");
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteContact(id);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Contacts</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registered family members, physicians, and first responders for instant dispatch
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((c) => (
          <div
            key={c.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm relative flex flex-col justify-between ${
              c.is_primary ? "border-primary/50 ring-1 ring-primary/20" : "border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      c.is_primary ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                    <span className="text-xs text-slate-500">{c.relationship}</span>
                  </div>
                </div>

                {c.is_primary && (
                  <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    PRIMARY
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`tel:${c.phone_number}`} className="font-semibold text-primary hover:underline">
                    {c.phone_number}
                  </a>
                </div>
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Priority #{c.priority_order}</span>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Emergency Contact</h3>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Relationship</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daughter, Primary Cardiologist"
                  value={rel}
                  onChange={(e) => setRel(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="doctor@clinic.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                />
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
