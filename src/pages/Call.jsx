import React, { useEffect, useRef, useState,useMemo } from 'react';
import WebRTCService from '../webrtc/WebRTCService';
import { firestore } from '../db/firestore';
import { useAuth } from '../hooks/auth/useAuth';
import { useParams, useNavigate } from 'react-router-dom';

export default function Call() {
  const { callId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callData, setCallData] = useState(null);
  const [webrtc] = useState(() => new WebRTCService());
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

    const servers = useMemo(
    () => ({
      iceServers: [
        {
          urls: [
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
          ],
        },
      ],
    }),
    []
  );

  // Check device capabilities on mount
  useEffect(() => {
    const checkDeviceCapabilities = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support video calling');
        return;
      }

      // Check if on mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        setConnectionStatus('Preparing mobile device...');
      }

      // Check permissions early
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' });
        if (permissions.state === 'denied') {
          setError('Camera permission denied. Please enable in browser settings.');
        }
      } catch (permErr) {
        // Permissions API not supported, will handle during getUserMedia
        console.log('Permissions API not supported');
      }
    };

    checkDeviceCapabilities();
  }, []);

  // Listen for call doc changes
  useEffect(() => {
    if (!callId) return;
    const unsubscribe = firestore.listenToCall(callId, (data) => {
      setCallData(data);
      if (data?.status === 'ended') {
        endCall();
      }
    });
    return unsubscribe;
  }, [callId]);

  // WebRTC setup and signaling
useEffect(() => {
  if (!callData || !user || error) return;

  const startWebRTC = async () => {
    try {
      setConnectionStatus('Requesting camera/microphone access...');
      
      await webrtc.init(localVideoRef.current, remoteVideoRef.current, {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      setPermissionGranted(true);
      setConnectionStatus('Setting up connection...');

      // FIX: Handle ICE candidates properly
      webrtc.onIceCandidate = async (candidateObject) => {
        const field = user.uid === callData.callerId ? "offerCandidates" : "answerCandidates";
        const currentCandidates = callData[field] || [];
        await firestore.updateCall(callId, {
          [field]: [...currentCandidates, candidateObject] // Already a plain object
        });
      };

      if (user.uid === callData.callerId) {
        // Caller flow
        setConnectionStatus('Creating offer...');
        if (!callData.offer) {
          const offer = await webrtc.createOffer();
          await firestore.updateCall(callId, { offer }); // Already a plain object
          setConnectionStatus('Waiting for answer...');
        }
        
        if (callData.answer) {
          setConnectionStatus('Connecting...');
          await webrtc.setRemoteDescription(callData.answer);
          setIsConnected(true);
          setConnectionStatus('Connected');
        }
      } else if (user.uid === callData.calleeId) {
        // Callee flow
        if (callData.offer && !callData.answer) {
          setConnectionStatus('Answering call...');
          await webrtc.setRemoteDescription(callData.offer);
          const answer = await webrtc.createAnswer();
          await firestore.updateCall(callId, { 
            answer, // Already a plain object
            status: 'connected' 
          });
          setIsConnected(true);
          setConnectionStatus('Connected');
        }
      }

      // Add ICE candidates
      const offerCandidates = callData.offerCandidates || [];
      const answerCandidates = callData.answerCandidates || [];
      
      [...offerCandidates, ...answerCandidates].forEach(candidate => {
        webrtc.addIceCandidate(candidate).catch(console.error);
      });

    } catch (err) {
      console.error('WebRTC Error:', err);
      
      if (err.message.includes('permissions denied')) {
        setError('Camera/microphone access denied. Please refresh and allow permissions.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found on your device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera/microphone is being used by another application.');
      } else {
        setError('Failed to establish connection: ' + err.message);
      }
      setConnectionStatus('Connection failed');
    }
  };

  startWebRTC();
}, [callData, user, callId, error]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webrtc.close();
    };
  }, []);

  // End call function
  const endCall = async () => {
    try {
      await webrtc.close();
      if (callData && callData.status !== 'ended') {
        await firestore.updateCall(callId, { status: 'ended' });
      }
      await firestore.updateUser(user.uid, { status: 'online' });
      navigate('/');
    } catch (error) {
      console.error('Error ending call:', error);
      navigate('/');
    }
  };

  if (!callData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading call...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <div className="text-gray-400 text-sm mb-6">
            {webrtc.isMobile() ? 
              'Make sure your browser has camera and microphone permissions enabled.' :
              'Try refreshing the page and allowing camera/microphone access.'
            }
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="bg-cyan-500 text-black px-6 py-3 rounded-lg hover:bg-cyan-400 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-white text-xl font-bold">
              {user.uid === callData.callerId ? `Calling ${callData.calleeName}` : `Call from ${callData.callerName}`}
            </h1>
            <p className="text-cyan-400 text-sm">{connectionStatus}</p>
          </div>
          <button
            onClick={endCall}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-all duration-300"
          >
            End Call
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative p-4">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-xl bg-gray-900"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        />
        
        {/* Local Video (Picture-in-Picture) */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-4 right-4 w-48 h-36 object-cover rounded-xl border-2 border-cyan-400 shadow-lg md:w-48 md:h-36 sm:w-32 sm:h-24"
        />

        {/* Connection Status Overlay */}
        {!isConnected && !error && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 text-center">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg">{connectionStatus}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}