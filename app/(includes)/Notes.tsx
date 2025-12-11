// src/components/Notes.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAdmin } from "@/hooks/useIsAdmin";

function startOfThisWeek(now = new Date(), weekStart = 6) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day - weekStart + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatEndOfDay(d: Date) {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

function formatDateYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Notes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin, checking: checkingAdmin } = useIsAdmin();

  // this week start and next week end (Sat->Wed, and next week Sat->Wed)
  const { thisWeekStart, nextWeekEnd } = useMemo(() => {
    const start = startOfThisWeek(new Date(), 6);
    const thisWeekEnd = new Date(start);
    thisWeekEnd.setDate(start.getDate() + 4); // Sat..Wed
    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 4);
    return {
      thisWeekStart: start,
      nextWeekEnd: formatEndOfDay(nextEnd),
    };
  }, []);

  // human label for the covered range
  const weekLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${thisWeekStart.toLocaleDateString(undefined, opts)} – ${new Date(nextWeekEnd).toLocaleDateString(undefined, opts)}`;
  }, [thisWeekStart, nextWeekEnd]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const eventsRef = collection(db, "events");

      // Query only by timestamp range (no 'type' clause to avoid composite-index requirement)
      const q = query(
        eventsRef,
        where("timestamp", ">=", Timestamp.fromDate(thisWeekStart)),
        where("timestamp", "<=", Timestamp.fromDate(nextWeekEnd)),
        orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const items = snap.docs
            .map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                type: (data.type || "").toUpperCase(),
                timestamp: data.timestamp,
                date: data.date,
                dayName: data.dayName,
                noteText: data.noteText,
                createdAt: data.createdAt,
                raw: data,
              };
            })
            // client-side filter: only NOTE
            .filter((it) => (it.type || "") === "NOTE")
            .map((it) => {
              // derive a usable date/time and day label
              let eventDate: Date | null = null;
              if (it.date) {
                const parsed = new Date(it.date);
                if (!isNaN(parsed.getTime())) eventDate = parsed;
              }
              if (!eventDate && it.timestamp?.toDate) {
                eventDate = it.timestamp.toDate();
              } else if (!eventDate && it.timestamp) {
                const parsed = new Date(it.timestamp);
                if (!isNaN(parsed.getTime())) eventDate = parsed;
              }

              const dayName = eventDate ? eventDate.toLocaleDateString(undefined, { weekday: "long" }) : (it.dayName || "");
              const dateYMD = eventDate ? formatDateYMD(eventDate) : it.date || "";

              return {
                ...it,
                eventDate,
                dayName,
                dateYMD,
              };
            });

          // sort by timestamp ascending (closest first)
          items.sort((a, b) => {
            const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.eventDate ? a.eventDate.getTime() : 0);
            const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.eventDate ? b.eventDate.getTime() : 0);
            return ta - tb;
          });

          setNotes(items);
          setLoading(false);
        },
        (err) => {
          console.error("Notes snapshot error:", err);
          setError("Failed to load notes.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize notes.");
      setLoading(false);
    }
  }, [thisWeekStart, nextWeekEnd]);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const ok = confirm("Delete this note? This action cannot be undone.");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err: any) {
      console.error("Failed to delete note:", err);
      alert("Failed to delete note: " + (err?.message || err));
    }
  };

  // helper to decide whether a note is this week or next week (used to prefix "Next")
  const isThisWeek = (eventDate?: Date | null) => {
    if (!eventDate) return true;
    const start = startOfThisWeek(new Date(), 6);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    end.setHours(23, 59, 59, 999);
    return eventDate.getTime() <= end.getTime();
  };

  return (
    <section className="bg-gray-900 text-gray-100 py-8">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Notes</h2>
            <p className="text-sm text-gray-400 mt-1">
              Notes for this and next week — range: <span className="text-gray-200">{weekLabel}</span>
            </p>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading notes…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && notes.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">
            No notes found for this period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((n) => {
              const prefix = isThisWeek(n.eventDate) ? "" : `Next `;
              const label = `${prefix}${n.dayName || ""}`;
              const created = n.eventDate ? n.eventDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : (n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "");

              return (
                <article key={n.id} className="relative rounded-lg border border-gray-700 bg-gray-800 p-4">
                  {isAdmin && !checkingAdmin && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Delete note"
                      className="absolute bottom-3 right-3 text-gray-400 hover:text-red-400"
                      aria-label="Delete note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase text-gray-400 font-semibold">{label}</span>
                    <span className="text-xs text-gray-300">{n.dateYMD}</span>
                  </div>

                  <div className="text-sm text-gray-200 whitespace-pre-wrap">{n.noteText}</div>

                  <div className="mt-3 text-xs text-gray-400">Posted: <span className="text-gray-200">{created}</span></div>
                </article>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
