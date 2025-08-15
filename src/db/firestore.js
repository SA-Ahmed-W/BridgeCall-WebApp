import { db } from "../firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  query,
  onSnapshot,
  collection,
  where,
  updateDoc,
} from "firebase/firestore";

class Firestore {
  async saveUser(uid, data) {
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          status: "online",
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          ...data,
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error saving user to Firestore:", err);
      throw err;
    }
  }

  async updateUser(uid, data) {
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          ...data,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error updating user in Firestore:", err);
      throw err;
    }
  }

  subscribeToUsers(callback) {
    const q = query(collection(db, "users"));
    return onSnapshot(q, (querySnapshot) => {
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      callback(users);
    });
  }

  async createCall(callId, data) {
    await setDoc(doc(db, "calls", callId), {
      ...data,
      createdAt: serverTimestamp(),
      status: "initiated",
      offerCandidates: [],
      answerCandidates: [],
    });
  }

  async updateCall(callId, data) {
    await updateDoc(doc(db, "calls", callId), { ...data });
  }

  listenToCall(callId, cb) {
    return onSnapshot(doc(db, "calls", callId), (snap) => {
      cb(snap.exists() ? snap.data() : null);
    });
  }

  listenIncomingCalls(myUid, cb) {
    const callsQuery = query(
      collection(db, "calls"),
      where("calleeId", "==", myUid),
      where("status", "==", "initiated")
    );
    return onSnapshot(callsQuery, (querySnapshot) => {
      cb(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }

 
}

export const firestore = new Firestore();