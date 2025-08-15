import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/auth/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="bg-black bg-opacity-20 backdrop-blur-md border border-white border-opacity-20 text-white rounded-lg p-8 shadow-lg">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
