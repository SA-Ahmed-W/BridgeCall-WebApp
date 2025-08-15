import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

class Firestore {

  async saveUser(uid, data) {
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          status: 'active',
          createdAt: serverTimestamp(),
          ...data,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving user to Firestore:', err);
      throw err; // propagate to caller
    }
  }

  async updateUser(uid, data) {
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          ...data,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error updating user in Firestore:', err);
      throw err; // propagate to caller
    }
  }
}

export const firestore = new Firestore();
