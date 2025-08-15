import React, { useEffect, useRef, useState } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);

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

  // WebRTC setup and signaling with proper sequencing
  useEffect(() => {
    if (!callData || !user || error || isInitialized) return;

    const startWebRTC = async () => {
      try {
        setConnectionStatus('Requesting camera/microphone access...');
        
        // Initialize WebRTC
        await webrtc.init(localVideoRef.current, remoteVideoRef.current, {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        setIsInitialized(true);
        setConnectionStatus('Setting up connection...');

        // Handle ICE candidates
        webrtc.onIceCandidate = async (candidateObject) => {
          const field = user.uid === callData.callerId ? "offerCandidates" : "answerCandidates";
          const currentCandidates = callData[field] || [];
          await firestore.updateCall(callId, {
            [field]: [...currentCandidates, candidateObject]
          });
        };

        // CALLER FLOW
        if (user.uid === callData.callerId) {
          setConnectionStatus('Creating offer...');
          
          // Create offer if not exists
          if (!callData.offer) {
            const offer = await webrtc.createOffer();
            await firestore.updateCall(callId, { offer });
            setConnectionStatus('Waiting for answer...');
          }
          
          // Handle answer when available
          if (callData.answer) {
            setConnectionStatus('Processing answer...');
            await webrtc.setRemoteDescription(callData.answer);
            setIsConnected(true);
            setConnectionStatus('Connected');
            
            // Add ICE candidates after remote description is set
            const answerCandidates = callData.answerCandidates || [];
            answerCandidates.forEach(candidate => {
              webrtc.addIceCandidate(candidate);
            });
          }
        } 
        // CALLEE FLOW
        else if (user.uid === callData.calleeId) {
          if (callData.offer && !callData.answer) {
            setConnectionStatus('Processing offer...');
            
            // Set remote description first
            await webrtc.setRemoteDescription(callData.offer);
            
            // Add offer candidates after remote description is set
            const offerCandidates = callData.offerCandidates || [];
            offerCandidates.forEach(candidate => {
              webrtc.addIceCandidate(candidate);
            });
            
            // Create and send answer
            setConnectionStatus('Creating answer...');
            const answer = await webrtc.createAnswer();
            await firestore.updateCall(callId, { 
              answer, 
              status: 'connected' 
            });
            
            setIsConnected(true);
            setConnectionStatus('Connected');
          }
        }

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
  }, [callData, user, callId, error, isInitialized]);

  // Handle dynamic ICE candidates (after initial setup)
  useEffect(() => {
    if (!callData || !isInitialized || !webrtc.peerConnection) return;

    const handleNewCandidates = () => {
      if (user.uid === callData.callerId) {
        // Caller processes answer candidates
        const answerCandidates = callData.answerCandidates || [];
        answerCandidates.forEach(candidate => {
          webrtc.addIceCandidate(candidate);
        });
      } else if (user.uid === callData.calleeId) {
        // Callee processes offer candidates  
        const offerCandidates = callData.offerCandidates || [];
        offerCandidates.forEach(candidate => {
          webrtc.addIceCandidate(candidate);
        });
      }
    };

    handleNewCandidates();
  }, [callData?.offerCandidates, callData?.answerCandidates, isInitialized]);

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
            Make sure your browser has camera and microphone permissions enabled.
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
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-xl bg-gray-900"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        />
        
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-4 right-4 w-48 h-36 object-cover rounded-xl border-2 border-cyan-400 shadow-lg md:w-48 md:h-36 sm:w-32 sm:h-24"
        />

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
