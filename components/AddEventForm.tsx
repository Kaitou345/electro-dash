"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createEvent } from "@/lib/events";

type EventType = "CT" | "RESCHEDULE" | "SKIP" | "NOTE";

export default function AddEventForm() {
  const [type, setType] = useState<EventType>("CT");
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [startTime, setStartTime] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [duration, setDuration] = useState("");
  const [room, setRoom] = useState("");
  const [topics, setTopics] = useState("");
  const [noteText, setNoteText] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // clear irrelevant fields when type changes
    setFieldErrors({});
    setMsg(null);
    if (type === "NOTE") {
      setSubject("");
      setTeacher("");
      setDuration("");
      setRoom("");
      setTopics("");
      setStartTime("");
    } else {
      setNoteText("");
    }
  }, [type]);

  // ---------- Helpers for min date / min time ----------

  // Returns today's date in YYYY-MM-DD (local)
  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Returns current time in HH:MM (local)
  const nowTimeHHMM = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // If selected date is today, minTime is now, else 00:00
  const minTimeForSelectedDate = useMemo(() => {
    if (!date) return "00:00";
    return date === todayISO ? nowTimeHHMM() : "00:00";
    // note: this memo won't update per minute; validation also checks current time on submit
  }, [date, todayISO]);

  // ---------- Validation ----------

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!date) errors.date = "Date is required.";

    if (type === "CT") {
      if (!subject.trim()) errors.subject = "Subject is required.";
      if (!teacher.trim()) errors.teacher = "Teacher is required.";
      if (!duration.trim() || Number(duration) <= 0) errors.duration = "Duration must be a positive number.";
      if (!startTime) errors.startTime = "Start time is required.";
      if (!topics.trim()) errors.topics = "Topics is required.";
    }

    if (type === "RESCHEDULE" || type === "SKIP") {
      if (!subject.trim()) errors.subject = "Subject is required.";
      if (!teacher.trim()) errors.teacher = "Teacher is required.";
      if (!startTime) errors.startTime = "Start time is required.";
    }

    if (type === "NOTE") {
      if (!noteText.trim()) errors.noteText = "Note text is required.";
    }

    // Additional validation: if date is today, ensure startTime is not before now
    if (date && startTime) {
      const today = new Date();
      const selectedDateTime = new Date(`${date}T${startTime}`);
      if (date === todayISO) {
        // Compare using local times
        if (selectedDateTime.getTime() < today.getTime()) {
          errors.startTime = "Time cannot be earlier than the current time for today.";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setDate("");
    setStartTime("");
    setSubject("");
    setTeacher("");
    setDuration("");
    setRoom("");
    setTopics("");
    setNoteText("");
    setFieldErrors({});
    setMsg(null);
  };

  // ---------- Submit handler ----------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    setFieldErrors({});

    try {
      const ok = validate();
      if (!ok) {
        setMsg("Please fix the errors above.");
        return;
      }

      const timestamp = startTime ? new Date(`${date}T${startTime}`) : new Date(`${date}T00:00`);

      const basePayload: any = {
        type,
        date,
        dayName: new Date(date).toLocaleDateString(undefined, { weekday: "long" }),
        timestamp, // createEvent will normalize
      };

      let payload: any;
      if (type === "CT") {
        payload = {
          ...basePayload,
          subject: subject.trim(),
          teacher: teacher.trim(),
          startTime,
          duration: Number(duration),
          room: room.trim() || null,
          topics: topics.trim(),
        };
      } else if (type === "RESCHEDULE" || type === "SKIP") {
        payload = {
          ...basePayload,
          subject: subject.trim(),
          teacher: teacher.trim(),
          startTime,
        };
      } else {
        payload = {
          ...basePayload,
          noteText: noteText.trim(),
        };
      }

      await createEvent(payload);

      setMsg(type === "NOTE" ? "Note saved (overwritten if existed)" : "Event created successfully.");
      resetForm();
    } catch (err: any) {
      console.error(err);
      setMsg("Failed to create event: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Render ----------

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-5 rounded-lg border border-gray-700" aria-label="Add event form">
      <h2 className="text-lg font-semibold">Create Event</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          className="p-3 rounded bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none"
        >
          <option value="CT">CT</option>
          <option value="RESCHEDULE">Reschedule</option>
          <option value="SKIP">Skip</option>
          <option value="NOTE">Note</option>
        </select>

        {/* Date picker: min prevents selecting past dates.
            onKeyDown prevents manual typing so user uses native picker */}
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          required
          min={todayISO}
          onKeyDown={(e) => {
            // prevent manual typing into date input; still allows picker selection
            e.preventDefault();
          }}
          className={`p-3  rounded bg-gray-700 border ${fieldErrors.date ? "border-red-500" : "border-gray-600"} text-gray-200 focus:outline-none`}
        />

        {/* Time input: min is dynamic to avoid selecting past times for today */}
        {type !== "NOTE" && (
          <input
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            type="time"
            className={`p-3  rounded bg-gray-700 border ${fieldErrors.startTime ? "border-red-500" : "border-gray-600"} text-gray-200 focus:outline-none`}
            min={minTimeForSelectedDate}
          />
        )}
      </div>

      {type === "CT" && (
        <div className="space-y-3 border border-red-700/40 bg-red-900/10 p-4 rounded">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={`p-3 rounded bg-gray-700 border ${fieldErrors.subject ? "border-red-500" : "border-gray-600"} text-gray-200 w-full`} required />
          {fieldErrors.subject && <p className="text-xs text-red-400 mt-1">{fieldErrors.subject}</p>}

          <input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Teacher" className={`p-3 rounded bg-gray-700 border ${fieldErrors.teacher ? "border-red-500" : "border-gray-600"} text-gray-200 w-full`} required />
          {fieldErrors.teacher && <p className="text-xs text-red-400 mt-1">{fieldErrors.teacher}</p>}

          <div className="grid sm:grid-cols-2 gap-3">
            <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" min={1} placeholder="Duration (mins)" className={`p-3 rounded bg-gray-700 border ${fieldErrors.duration ? "border-red-500" : "border-gray-600"} text-gray-200 w-full`} required />
            <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room" className="p-3 rounded bg-gray-700 border border-gray-600 text-gray-200 w-full" />
          </div>
          {fieldErrors.duration && <p className="text-xs text-red-400 mt-1">{fieldErrors.duration}</p>}

          <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Topics" className={`p-3 rounded bg-gray-700 border ${fieldErrors.topics ? "border-red-500" : "border-gray-600"} text-gray-200 w-full`} required />
          {fieldErrors.topics && <p className="text-xs text-red-400 mt-1">{fieldErrors.topics}</p>}
        </div>
      )}

      {(type === "RESCHEDULE" || type === "SKIP") && (
        <div className="space-y-3 border border-yellow-700/40 bg-yellow-900/10 p-4 rounded">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={`p-3 rounded bg-gray-700 border ${fieldErrors.subject ? "border-red-500" : "border-gray-600"} text-gray-200 w-full`} required />
          {fieldErrors.subject && <p className="text-xs text-red-400 mt-1">{fieldErrors.subject}</p>}

          <input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Teacher" className={`p-3 rounded bg-gray-700 border ${fieldErrors.teacher ? "border-red-500" : "border-gray-600"} text-gray-200 w-full`} required />
          {fieldErrors.teacher && <p className="text-xs text-red-400 mt-1">{fieldErrors.teacher}</p>}
        </div>
      )}

      {type === "NOTE" && (
        <div className="space-y-3 border border-blue-700/40 bg-blue-900/10 p-4 rounded">
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note for this day..." className={`w-full p-3 rounded bg-gray-700 border ${fieldErrors.noteText ? "border-red-500" : "border-gray-600"} text-gray-200 min-h-20`} required />
          {fieldErrors.noteText && <p className="text-xs text-red-400 mt-1">{fieldErrors.noteText}</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          {loading ? "Saving…" : "Create Event"}
        </button>

        {msg && <p className="text-sm text-gray-300">{msg}</p>}
      </div>
    </form>
  );
}
