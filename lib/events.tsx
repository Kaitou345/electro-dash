import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Normalize timestamp value:
 * - If payload.timestamp is a JS Date, convert to Firestore Timestamp
 * - If it's already a Firestore Timestamp or missing, leave as-is (server will set createdAt)
 */
function normalizeTimestamp(value: any) {
  if (!value) return null;
  if (value instanceof Date) return Timestamp.fromDate(value);
  // If caller passed an ISO string, try to parse
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
  }
  return value; // assume it's already a Firestore Timestamp
}

/**
 * Create or update an event.
 *
 * Behavior:
 * - If payload.type === "NOTE":
 *    - If an existing NOTE document exists for payload.date, overwrite (update) it.
 *    - Otherwise create a new NOTE doc.
 * - For other types: always create a new event document.
 *
 * Expected payload fields (minimal):
 * {
 *   type: "CT" | "RESCHEDULE" | "SKIP" | "NOTE",
 *   date: "YYYY-MM-DD",
 *   dayName: "Saturday",
 *   timestamp: Date | string | Firestore Timestamp,
 *   ...type-specific fields
 * }
 */
export async function createEvent(payload: any) {
  if (!payload || !payload.type) {
    throw new Error("Payload must include `type` field.");
  }
  if (!payload.date) {
    throw new Error("Payload must include `date` (YYYY-MM-DD).");
  }

  const eventsRef = collection(db, "events");

  // Normalize timestamp if provided
  const normalizedTimestamp = normalizeTimestamp(payload.timestamp);

  const baseData = {
    ...payload,
    timestamp: normalizedTimestamp ?? serverTimestamp(),
    // createdAt is added only on creation; updatedAt below
  };

  if (payload.type === "NOTE") {
    // Search for an existing NOTE on the same date (limit 1)
    const q = query(
      eventsRef,
      where("date", "==", payload.date),
      where("type", "==", "NOTE")
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      // Overwrite (update) the first matching NOTE doc
      const existingDoc = snap.docs[0];
      const existingRef = doc(db, "events", existingDoc.id);

      // Overwrite fields: setDoc with merge=false to replace; here we want overwrite semantics.
      // We'll include createdAt from the existing document to preserve original creation time if present.
      const existingData = existingDoc.data() as any;
      const createdAt = existingData?.createdAt ?? serverTimestamp();

      await setDoc(existingRef, {
        ...baseData,
        createdAt,
        updatedAt: serverTimestamp(),
      });

      return existingDoc.id;
    } else {
      // Create new NOTE
      const docRef = await addDoc(eventsRef, {
        ...baseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    }
  }

  // For CT / RESCHEDULE / SKIP -> always create new document
  const docRef = await addDoc(eventsRef, {
    ...baseData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}
