"use client";
import React, { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Day as StaticDay } from "@/lib/db"; // reuse existing Day interface for UI compatibility

// Local Day type (if your imported Day shape differs, adjust accordingly)
type Day = {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  CT: any[];
  reschedules: any[];
  skippedClass: any[];
  notes?: string | null;
  dayOff: boolean;
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div className="relative bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl font-bold"
        >
          x
        </button>

        <h2 className="text-lg font-bold mb-4 pr-6">{title}</h2>

        <div className="space-y-4">{children}</div>

        <button
          className="hover:cursor-pointer mt-4 w-full px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 text-sm font-medium"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

function startOfThisWeek(now = new Date(), weekStart = 6) {
  // weekStart: 6 = Saturday (0=Sun..6=Sat)
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day - weekStart + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDateYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const Schedule = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // compute weekStart/weekEnd:
  // - If today is **Thursday (4)** or **Friday (5)** then use *next week's* Saturday→Wednesday.
  // - Otherwise use the current week's Saturday→Wednesday.
  const { weekStart, weekEnd } = useMemo(() => {
    const now = new Date();
    const baseStart = startOfThisWeek(now, 6); // current week's Saturday
    // getDay(): 0=Sun,1=Mon,...3=Wed,4=Thu,5=Fri,6=Sat
    const dayNum = now.getDay();
    let start = baseStart;
    if (dayNum > 3) {
      // today is Thursday (4) or Friday (5) or Saturday (6)
      // for Thursday/Friday we want *next* week's Saturday; for Saturday we keep baseStart
      // but the requirement was "if it's past Wednesday already", so treat dayNum > 3 (Thu/Fri/Sat)
      // as "past Wednesday" — we only advance to next week when today is Thursday or Friday.
      // To strictly interpret "past Wednesday" as Thu/Fri, check dayNum >= 4 && dayNum <= 5
      // We'll advance only for Thursday and Friday:
      if (dayNum === 4 || dayNum === 5) {
        start = new Date(baseStart);
        start.setDate(baseStart.getDate() + 7); // next week's Saturday
        start.setHours(0, 0, 0, 0);
      } else {
        // if dayNum === 6 (Saturday) keep baseStart (today is the start of the week)
        start = baseStart;
      }
    } else {
      start = baseStart;
    }

    const end = new Date(start);
    end.setDate(start.getDate() + 4); // Sat -> Wed
    end.setHours(23, 59, 59, 999);

    return { weekStart: start, weekEnd: end };
  }, []);

  // human readable week label
  const weekLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString(undefined, opts)} – ${new Date(weekEnd).toLocaleDateString(undefined, opts)}`;
  }, [weekStart, weekEnd]);

  const openDayModal = (day: Day) => {
    setSelectedDay(day);
    setModalOpen(true);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const eventsRef = collection(db, "events");
      const q = query(
        eventsRef,
        where("timestamp", ">=", Timestamp.fromDate(weekStart)),
        where("timestamp", "<=", Timestamp.fromDate(weekEnd)),
        orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // build base days array Sat -> Wed
          const baseDays: Day[] = [];
          for (let i = 0; i < 5; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            baseDays.push({
              id: i + 1,
              name: d.toLocaleDateString(undefined, { weekday: "long" }),
              date: formatDateYMD(d),
              CT: [],
              reschedules: [],
              skippedClass: [],
              notes: null,
              dayOff: false,
            });
          }

          // iterate events and push into day buckets
          snapshot.docs.forEach((doc) => {
            const data: any = doc.data();
            // Determine event date string in YYYY-MM-DD
            let eventDateStr = data.date;
            if (!eventDateStr && data.timestamp && data.timestamp.toDate) {
              // fallback to timestamp -> date string
              const tsDate = data.timestamp.toDate();
              eventDateStr = formatDateYMD(tsDate);
            } else if (!eventDateStr && data.timestamp && typeof data.timestamp === "string") {
              // parse ISO string fallback
              const parsed = new Date(data.timestamp);
              if (!isNaN(parsed.getTime())) eventDateStr = formatDateYMD(parsed);
            }

            if (!eventDateStr) return;

            const dayIdx = baseDays.findIndex((d) => d.date === eventDateStr);
            if (dayIdx === -1) return; // event outside Sat-Wed (unexpected) - ignore

            const dayBucket = baseDays[dayIdx];

            // push into correct arrays depending on type
            const type = (data.type || "").toUpperCase();
            if (type === "CT") {
              dayBucket.CT.push({
                subject: data.subject,
                teacher: data.teacher,
                startTime: data.startTime,
                duration: data.duration,
                room: data.room,
                topics: data.topics,
                raw: data,
                id: doc.id,
              });
            } else if (type === "RESCHEDULE") {
              dayBucket.reschedules.push({
                subject: data.subject,
                teacher: data.teacher,
                startTime: data.startTime,
                raw: data,
                id: doc.id,
              });
            } else if (type === "SKIP") {
              dayBucket.skippedClass.push({
                subject: data.subject,
                teacher: data.teacher,
                startTime: data.startTime,
                raw: data,
                id: doc.id,
              });
            } else if (type === "NOTE") {
              // overwrite note (last write wins in snapshot order)
              dayBucket.notes = data.noteText ?? null;
            }
          });

          setDays(baseDays);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching events:", err);
          setError("Failed to load schedule.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize schedule.");
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  const renderDayDetails = (day: Day) => {
    return (
      <div className="space-y-4 text-sm">
        {day.dayOff && (
          <div className="inline-flex items-center rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300">
            Day Off
          </div>
        )}

        {/* CTs = Class Tests */}
        <div>
          <h3 className="font-semibold text-base mb-2">Class Tests (CT)</h3>
          {day.CT.length ? (
            <ul className="space-y-2">
              {day.CT.map((ct: any, idx: number) => (
                <li
                  key={ct.id ?? idx}
                  className="rounded-md border border-red-700/60 bg-red-900/10 p-3 text-xs"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{ct.subject}</span>
                    <span>{ct.startTime}</span>
                  </div>
                  <p className="text-xs text-gray-300">Topic: {ct.topics}</p>
                  <p className="text-xs text-gray-400">
                    Teacher: {ct.teacher} • Duration: {ct.duration} mins • Room:{" "}
                    {ct.room}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No class tests scheduled.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base mb-2">Rescheduled Classes</h3>
          {day.reschedules.length ? (
            <ul className="space-y-2">
              {day.reschedules.map((item: any, idx: number) => (
                <li
                  key={item.id ?? idx}
                  className="rounded-md border border-yellow-700/60 bg-yellow-900/10 p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{item.subject}</span>
                    <span>{item.startTime}</span>
                  </div>
                  <p className="text-gray-300">Teacher: {item.teacher}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No rescheduled classes.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base mb-2">Skipped Classes</h3>
          {day.skippedClass.length ? (
            <ul className="space-y-2">
              {day.skippedClass.map((item: any, idx: number) => (
                <li
                  key={item.id ?? idx}
                  className="rounded-md border border-green-700/60 bg-green-900/10 p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{item.subject}</span>
                    <span>{item.startTime}</span>
                  </div>
                  <p className="text-gray-300">Teacher: {item.teacher}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No skipped classes.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base mb-2">Notes</h3>
          {day.notes ? (
            <p className="text-gray-200">{day.notes}</p>
          ) : (
            <p className="text-gray-400">No notes for this day.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="bg-gray-900 text-gray-100 min-h-[75vh] py-8">
      <Container>
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-semibold">Weekly Class Schedule</h1>
          <p className="text-sm text-gray-400">This week: <span className="font-medium text-gray-200">{weekLabel}</span></p>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading schedule…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-1 gap-4">
          {days.map((day) => {
            const hasCT = day.CT.length > 0;
            const hasReschedules = day.reschedules.length > 0;
            const hasSkipped = day.skippedClass.length > 0;
            const hasNotes = !!day.notes;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => openDayModal(day)}
                className={`group w-full text-left rounded-lg border border-gray-700 p-4 transition-all
                  ${day.dayOff ? "opacity-70 bg-gray-800" : "bg-gray-700"}
                  hover:border-blue-500 hover:bg-gray-600 hover:scale-[1.02]
                  active:scale-[0.98] cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between`}
              >
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:items-center w-full">
                  <div className="font-bold text-base sm:text-lg">{day.name}</div>

                  <div className={hasCT ? "text-red-400 text-sm" : "text-gray-500 text-sm"}>
                    {hasCT ? `${day.CT.length} CT${day.CT.length > 1 ? "s" : ""}` : "No Class Tests"}
                  </div>

                  <div className={hasReschedules ? "text-yellow-400 text-sm" : "text-gray-500 text-sm"}>
                    {hasReschedules ? `${day.reschedules.length} Reschedule${day.reschedules.length > 1 ? "s" : ""}` : "No Reschedules"}
                  </div>

                  <div className={hasSkipped ? "text-green-400 text-sm" : "text-gray-500 text-sm"}>
                    {hasSkipped ? `${day.skippedClass.length} Skipped` : "No Skipped"}
                  </div>

                  <div className={hasNotes ? "text-blue-400 text-sm" : "text-gray-500 text-sm"}>
                    {hasNotes ? "Has Note" : "No Notes"}
                  </div>

                  <p className="mt-2 text-xs text-gray-400 sm:hidden">Click to view details</p>
                </div>

                <span className="hidden sm:inline-block text-gray-400 text-lg font-bold ml-3 group-hover:text-white">
                  ›
                </span>
              </button>
            );
          })}
        </div>
      </Container>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedDay?.name ?? ""}
      >
        {selectedDay && renderDayDetails(selectedDay)}
      </Modal>
    </section>
  );
};

export default Schedule;
