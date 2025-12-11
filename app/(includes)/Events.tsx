// src/components/Events.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type EventType = "CT" | "RESCHEDULE" | "SKIP";

type EventItem = {
  id: string;
  type: EventType;
  timestamp: Timestamp | any;
  date?: string;
  dayName?: string;
  subject?: string;
  teacher?: string;
  startTime?: string;
  duration?: number;
  room?: string;
  topics?: string;
  noteText?: string;
  createdAt?: any;
};

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

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering UI state
  const [selectedTypes, setSelectedTypes] = useState<Record<EventType, boolean>>({
    CT: true,
    RESCHEDULE: true,
    SKIP: true,
  });
  const [subjectQuery, setSubjectQuery] = useState("");

  const { isAdmin, checking: checkingAdmin } = useIsAdmin();

  // compute this week start (Sat) and next week end (Sat+7..Wed)
  const { thisWeekStart, nextWeekEnd } = useMemo(() => {
    const start = startOfThisWeek(new Date(), 6);
    const thisWeekEnd = new Date(start);
    thisWeekEnd.setDate(start.getDate() + 4); // Sat..Wed
    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 4);
    // query timestamps use start at 00:00 and nextEnd at 23:59:59
    return {
      thisWeekStart: start,
      nextWeekEnd: formatEndOfDay(nextEnd),
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const eventsRef = collection(db, "events");

      // WORKAROUND: do NOT include `where("type", "in", ...)` to avoid composite index requirement.
      // We query only by timestamp range and order by timestamp, then filter types on the client.
      const q = query(
        eventsRef,
        where("timestamp", ">=", Timestamp.fromDate(thisWeekStart)),
        where("timestamp", "<=", Timestamp.fromDate(nextWeekEnd)),
        orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const items: EventItem[] = snap.docs
            .map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                type: (data.type || "").toUpperCase(),
                timestamp: data.timestamp,
                date: data.date,
                dayName: data.dayName,
                subject: data.subject,
                teacher: data.teacher,
                startTime: data.startTime,
                duration: data.duration,
                room: data.room,
                topics: data.topics,
                noteText: data.noteText,
                createdAt: data.createdAt,
              } as EventItem;
            })
            // Filter on client to include only the three desired types
            .filter((it) => ["CT", "RESCHEDULE", "SKIP"].includes((it.type || "").toUpperCase()))
            // Defensive sort in case timestamps are not comparable directly
            .sort((a, b) => {
              const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
              const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
              return ta - tb;
            });

          setEvents(items);
          setLoading(false);
        },
        (err) => {
          console.error("Events snapshot error:", err);
          setError("Failed to load events.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize events.");
      setLoading(false);
    }
  }, [thisWeekStart, nextWeekEnd]);

  const toggleType = (t: EventType) => {
    setSelectedTypes((s) => ({ ...s, [t]: !s[t] }));
  };

  const filtered = events.filter((ev) => {
    if (!selectedTypes[ev.type as EventType]) return false;
    if (subjectQuery.trim()) {
      return (ev.subject || "").toLowerCase().includes(subjectQuery.trim().toLowerCase());
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const ok = confirm("Delete this event? This action cannot be undone.");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event: " + (err?.message || err));
    }
  };

  return (
    <section className="bg-gray-900 text-gray-100 py-8">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Events (This + Next Week)</h2>
            <p className="text-sm text-gray-400 mt-1">
              Shows CTs, reschedules and skipped classes from this week and next.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1 border border-gray-700">
              <label className={`px-2 py-1 rounded cursor-pointer text-sm ${selectedTypes.CT ? "bg-red-700/10 border border-red-700/30 text-red-300" : "text-gray-400"}`}>
                <input className="sr-only" type="checkbox" checked={selectedTypes.CT} onChange={() => toggleType("CT")} />
                CT
              </label>
              <label className={`px-2 py-1 rounded cursor-pointer text-sm ${selectedTypes.RESCHEDULE ? "bg-yellow-700/10 border border-yellow-700/30 text-yellow-300" : "text-gray-400"}`}>
                <input className="sr-only" type="checkbox" checked={selectedTypes.RESCHEDULE} onChange={() => toggleType("RESCHEDULE")} />
                Reschedule
              </label>
              <label className={`px-2 py-1 rounded cursor-pointer text-sm ${selectedTypes.SKIP ? "bg-green-700/10 border border-green-700/30 text-green-300" : "text-gray-400"}`}>
                <input className="sr-only" type="checkbox" checked={selectedTypes.SKIP} onChange={() => toggleType("SKIP")} />
                Skip
              </label>
            </div>

            <input
              placeholder="Filter by subject..."
              value={subjectQuery}
              onChange={(e) => setSubjectQuery(e.target.value)}
              className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm"
            />
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading events…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {filtered.length === 0 && !loading ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">
            No events match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ev) => {
              const isThisWeek = (() => {
                const start = startOfThisWeek(new Date(), 6);
                const thisEnd = new Date(start);
                thisEnd.setDate(start.getDate() + 4);
                thisEnd.setHours(23, 59, 59, 999);
                const t = ev.timestamp?.toDate ? ev.timestamp.toDate() : new Date(ev.timestamp);
                return t.getTime() <= thisEnd.getTime();
              })();

              const labelPrefix = isThisWeek ? ev.dayName ?? "" : `Next ${ev.dayName ?? ""}`;

              return (
                <div key={ev.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4 flex flex-col gap-3 relative">
                  {isAdmin && !checkingAdmin && (
                    <button
                      onClick={() => handleDelete(ev.id)}
                      title="Delete event"
                      className="cursor-pointer absolute bottom-3 right-3 text-gray-400 hover:text-red-400"
                      aria-label="Delete event"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{labelPrefix}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                      ev.type === "CT" ? "bg-red-700/10 text-red-300 border border-red-700/30" :
                      ev.type === "RESCHEDULE" ? "bg-yellow-700/10 text-yellow-300 border border-yellow-700/30" :
                      "bg-green-700/10 text-green-300 border border-green-700/30"
                    }`}>
                      {ev.type}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold">{ev.subject ?? "Untitled"}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{ev.topics ?? (ev.type === "CT" ? "No topic specified" : "")}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-300 mt-1">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      {ev.startTime ?? (ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "")}
                    </span>

                    {ev.duration ? <span>Duration: {ev.duration} mins</span> : null}
                    {ev.room ? <span>Room: {ev.room}</span> : null}
                  </div>

                  <p className="text-xs text-gray-400 mt-1">Teacher: <span className="text-gray-200">{ev.teacher ?? "-"}</span></p>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
