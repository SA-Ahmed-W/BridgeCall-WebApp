import { useEffect, useState } from 'react';

export default function IncomingCall({ visible, callInfo, onAccept, onReject }) {
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, onReject]);

  useEffect(() => {
    if (visible) {
      setTimeRemaining(30);
    }
  }, [visible]);

  if (!visible || !callInfo) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-pulse">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-cyan-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Incoming Call</h2>
          <p className="text-cyan-400 text-lg font-medium mb-2">
            {callInfo.callerName || 'Unknown Caller'}
          </p>
          <p className="text-gray-400 text-sm">
            {timeRemaining}s remaining
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onReject}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Decline
          </button>
          
          <button
            onClick={onAccept}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}