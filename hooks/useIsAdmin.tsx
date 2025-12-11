"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onIdTokenChanged, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setChecking(true);
    const unsub = onIdTokenChanged(auth, async (user: User | null) => {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      try {
        // optional: force token refresh if you need (user.getIdToken(true))
        const adminDocRef = doc(db, "admins", user.uid);
        const snap = await getDoc(adminDocRef);
        setIsAdmin(snap.exists());
      } catch (err) {
        console.error("Failed to check admin status:", err);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  return { isAdmin, checking };
}
