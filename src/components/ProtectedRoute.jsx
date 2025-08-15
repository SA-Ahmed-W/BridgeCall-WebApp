import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/auth/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="bg-black bg-opacity-20 backdrop-blur-md border border-white border-opacity-20 text-white rounded-lg p-8 shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(44,169,188)] mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}