import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../hooks/auth/useAuth';
import {firestore} from "../db/firestore"; 

export default function Navbar() {
  const { user } = useAuth();
  

  const handleLogout = async () => {
    try {
      
      await firestore.updateUser(user.uid, { status: 'offline' });
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-black bg-opacity-30 backdrop-blur-md border-b border-white border-opacity-20 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-white text-xl font-bold">
            Bridge<span className="text-[rgb(44,169,188)]">Connect</span>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                Welcome, {user?.displayName || 'User'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-[rgb(44,169,188)] hover:bg-opacity-80 text-black font-semibold py-2 px-4 rounded-lg transition-all duration-300"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
