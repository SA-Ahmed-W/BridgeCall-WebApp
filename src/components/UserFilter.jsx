import React from 'react';

function UserFilter({ statusFilter, setStatusFilter }) {
  const statusOptions = [
    { value: 'all', label: 'All Users', color: 'bg-gray-600' },
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'offline', label: 'Offline', color: 'bg-gray-500' },
    { value: 'incall', label: 'In Call', color: 'bg-yellow-400' },
    { value: 'callinitiated', label: 'Call Initiated', color: 'bg-blue-400' }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <h3 className="text-white text-sm font-medium mb-3">Filter by Status</h3>
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value === 'all' ? '' : option.value)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
              transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
              ${(statusFilter === option.value) || (option.value === 'all' && !statusFilter)
                ? 'bg-[rgb(44,169,188)] text-black shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
              {option.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default UserFilter;
