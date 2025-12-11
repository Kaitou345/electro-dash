"use client";
import { addAdmin } from "@/lib/admins";
import React, { useState } from "react";

export default function AddAdminForm() {
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await addAdmin(uid);
      setMsg("Admin added.");
      setUid("");
    } catch (err:any) {
      setMsg("Failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAdd} className="space-y-2 rounded border p-4">
      <div className="text-sm text-gray-400">Add admin by UID (get from Firebase Console → Auth → Users)</div>
      <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="User UID" className="p-2 border w-full" required />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded">
          {loading ? "Adding…" : "Add Admin"}
        </button>
        <div className="text-sm text-gray-400">{msg}</div>
      </div>
    </form>
  );
}
