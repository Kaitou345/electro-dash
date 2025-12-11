import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function addAdmin(uid: string) {
  const ref = doc(db, "admins", uid);
  await setDoc(ref, {
    createdAt: serverTimestamp(),
    addedBy: "admin-ui",
  });
}
