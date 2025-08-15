import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, query,onSnapshot,collection} from 'firebase/firestore';

class Firestore {

  async saveUser(uid, data) {
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          status: 'online',
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
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

  // Subscribe to users collection
  subscribeToUsers(callback) {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (querySnapshot) => {
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      callback(users);
    });
  }
}

export const firestore = new Firestore();
