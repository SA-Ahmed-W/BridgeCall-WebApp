import React, { useState } from 'react';
import { useAuth } from '../hooks/auth/useAuth';
import Navbar from '../components/Navbar';
import User from '../components/User';
import UserFilter from '../components/UserFilter';

export default function Home() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-cyan-400/5 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl animate-pulse"></div>
      </div>

      <Navbar />
      
      <div className="relative container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {user?.displayName || 'User'}!
          </h1>
          <p className="text-gray-400">Connect with users around the world</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-4 px-6 pl-12 
                           text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 
                           focus:border-cyan-400/50 transition-all duration-300"
              />
              <svg 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Component */}
        <div className="mb-8">
          <UserFilter 
            statusFilter={statusFilter} 
            setStatusFilter={setStatusFilter} 
          />
        </div>

        {/* Users List */}
        <User 
          statusFilter={statusFilter} 
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
}
