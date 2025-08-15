import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../hooks/auth/useAuth';
import Navbar from '../components/Navbar';

export default function Home() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-black bg-opacity-20 backdrop-blur-md border border-white border-opacity-20 rounded-xl p-8 shadow-2xl max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">Welcome Home!</h1>
          <div className="space-y-4">
            <p className="text-gray-300 text-lg">
              Hello, <span className="text-[rgb(44,169,188)] font-semibold">{user?.displayName || 'User'}</span>!
            </p>
            <p className="text-gray-400">Email: {user?.email}</p>
            <div className="pt-4">
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
