import React, { useState, useEffect } from 'react';
import { firestore } from '../db/firestore';
import { useAuth } from '../hooks/auth/useAuth';

function User({ statusFilter, searchTerm }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  // Subscribe to users collection
  useEffect(() => {
    const unsubscribe = firestore.subscribeToUsers((usersData) => {
      // Filter out current user from the list
      const otherUsers = usersData.filter(u => u.id !== currentUser?.uid);
      setUsers(otherUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Filter users based on status and search term
  useEffect(() => {
    let filtered = [...users];

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Filter by search term (name)
    if (searchTerm.trim()) {
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, statusFilter, searchTerm]);

  // Handle call button click
  const handleCallClick = (user) => {
    if (user.status === 'online') {
      console.log(`Initiating call to ${user.displayName || user.name}...`);
      // Future implementation: WebRTC call logic
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500 text-black';
      case 'offline': return 'bg-gray-500 text-white';
      case 'incall': return 'bg-yellow-400 text-black';
      case 'callinitiated': return 'bg-blue-400 text-black';
      default: return 'bg-gray-400 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-2 border-[rgb(44,169,188)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <p className="text-gray-400 text-lg">No users found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm ? 'Try adjusting your search term' : 'No users match the selected filter'}
            </p>
          </div>
        </div>
      ) : (
        filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 
                       transform hover:scale-[1.02] transition-all duration-300 shadow-lg"
          >
            <div className="flex items-center justify-between">
              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Status Badge */}
                  <span className={`
                    text-xs font-semibold rounded-full px-3 py-1 uppercase tracking-wide
                    ${getStatusColor(user.status || 'offline')}
                  `}>
                    {user.status || 'offline'}
                  </span>
                </div>
                
                <h3 className="text-white text-xl font-semibold mb-1">
                  {user.displayName || user.name || 'Unnamed User'}
                </h3>
                
                <p className="text-gray-300 text-sm">
                  {user.email || 'No email provided'}
                </p>
              </div>

              {/* Call Button */}
              <button
                disabled={user.status !== 'online'}
                onClick={() => handleCallClick(user)}
                className={`
                  p-4 rounded-full transition-all duration-300 transform
                  focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-black
                  ${user.status === 'online'
                    ? 'bg-[rgb(44,169,188)] text-black hover:bg-cyan-400 hover:scale-110 focus:ring-cyan-400/50 shadow-lg shadow-cyan-400/25'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  }
                `}
                title={user.status === 'online' 
                  ? `Call ${user.displayName || user.name}` 
                  : `${user.displayName || user.name} is not available`
                }
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
                  />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default User;
