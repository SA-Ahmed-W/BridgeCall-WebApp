
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
    console.log('🔄 Setting up call listener for:', callId);
    
    const unsubscribe = firestore.listenToCall(callId, (data) => {
      console.log('📞 Call data updated:', data);
      setCallData(data);
      if (data?.status === 'ended') {
        endCall();
      }
    });
    return unsubscribe;
  }, [callId]);

  // WebRTC setup and signaling with proper sequencing
  useEffect(() => {
    if (!callData || !user) {
      console.log('⏳ Waiting for callData and user...', { callData: !!callData, user: !!user });
      return;
    }
    if (error) {
      console.log('❌ Skipping due to error:', error);
      return;
    }
    if (isInitialized) {
      console.log('✅ Already initialized, skipping...');
      return;
    }

    console.log('🚀 Starting WebRTC setup...');
    console.log('👤 User role:', user.uid === callData.callerId ? 'CALLER' : 'CALLEE');
    console.log('📋 Call data:', callData);

    const startWebRTC = async () => {
      try {
        setConnectionStatus('Requesting camera/microphone access...');
        console.log('🎥 Initializing WebRTC...');
        
        // Initialize WebRTC
        await webrtc.init(localVideoRef.current, remoteVideoRef.current, {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        setIsInitialized(true);
        console.log('✅ WebRTC initialized successfully');
        setConnectionStatus('Setting up connection...');

        // Handle ICE candidates
        webrtc.onIceCandidate = async (candidateObject) => {
          const field = user.uid === callData.callerId ? "offerCandidates" : "answerCandidates";
          const currentCandidates = callData[field] || [];
          console.log(`🧊 Adding ICE candidate to ${field}:`, candidateObject);
          
          await firestore.updateCall(callId, {
            [field]: [...currentCandidates, candidateObject]
          });
        };

        // CALLER FLOW
        if (user.uid === callData.callerId) {
          console.log('📤 CALLER: Starting caller flow...');
          setConnectionStatus('Creating offer...');
          
          // Create offer if not exists
          if (!callData.offer) {
            console.log('📝 CALLER: Creating offer...');
            const offer = await webrtc.createOffer();
            console.log('📝 CALLER: Offer created:', offer);
            
            await firestore.updateCall(callId, { offer });
            console.log('💾 CALLER: Offer saved to Firestore');
            setConnectionStatus('Waiting for answer...');
          } else {
            console.log('📝 CALLER: Offer already exists:', callData.offer);
          }
          
          // Handle answer when available
          if (callData.answer) {
            console.log('📥 CALLER: Answer received, processing...');
            setConnectionStatus('Processing answer...');
            await webrtc.setRemoteDescription(callData.answer);
            setIsConnected(true);
            setConnectionStatus('Connected');
            
            // Add ICE candidates after remote description is set
            const answerCandidates = callData.answerCandidates || [];
            console.log('🧊 CALLER: Adding answer candidates:', answerCandidates.length);
            answerCandidates.forEach(candidate => {
              webrtc.addIceCandidate(candidate);
            });
          } else {
            console.log('⏳ CALLER: Waiting for answer...');
          }
        } 
        // CALLEE FLOW
        else if (user.uid === callData.calleeId) {
          console.log('📥 CALLEE: Starting callee flow...');
          
          if (callData.offer && !callData.answer) {
            console.log('📝 CALLEE: Offer received, processing...');
            setConnectionStatus('Processing offer...');
            
            // Set remote description first
            await webrtc.setRemoteDescription(callData.offer);
            console.log('✅ CALLEE: Remote description set');
            
            // Add offer candidates after remote description is set
            const offerCandidates = callData.offerCandidates || [];
            console.log('🧊 CALLEE: Adding offer candidates:', offerCandidates.length);
            offerCandidates.forEach(candidate => {
              webrtc.addIceCandidate(candidate);
            });
            
            // Create and send answer
            setConnectionStatus('Creating answer...');
            console.log('📝 CALLEE: Creating answer...');
            const answer = await webrtc.createAnswer();
            console.log('📝 CALLEE: Answer created:', answer);
            
            await firestore.updateCall(callId, { 
              answer, 
              status: 'connected' 
            });
            console.log('💾 CALLEE: Answer saved to Firestore');
            
            setIsConnected(true);
            setConnectionStatus('Connected');
          } else {
            console.log('⏳ CALLEE: Waiting for offer or answer already exists');
            console.log('📋 CALLEE: offer exists:', !!callData.offer);
            console.log('📋 CALLEE: answer exists:', !!callData.answer);
          }
        }

      } catch (err) {
        console.error('❌ WebRTC Error:', err);
        
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

  // Handle dynamic ICE candidates and call updates
  useEffect(() => {
    if (!callData || !isInitialized || !webrtc.peerConnection) return;

    console.log('🔄 Processing call updates...');

    // CALLER: Check for new answer
    if (user.uid === callData.callerId && callData.answer && !isConnected) {
      console.log('📥 CALLER: New answer detected, processing...');
      (async () => {
        try {
          setConnectionStatus('Processing answer...');
          await webrtc.setRemoteDescription(callData.answer);
          setIsConnected(true);
          setConnectionStatus('Connected');
          
          // Add answer candidates
          const answerCandidates = callData.answerCandidates || [];
          answerCandidates.forEach(candidate => {
            webrtc.addIceCandidate(candidate);
          });
        } catch (err) {
          console.error('❌ Error processing answer:', err);
        }
      })();
    }

    // Process new ICE candidates
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
  }, [callData?.offer, callData?.answer, callData?.offerCandidates, callData?.answerCandidates, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up WebRTC...');
      webrtc.close();
    };
  }, []);

  // End call function
  const endCall = async () => {
    try {
      console.log('📞 Ending call...');
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
            <p className="text-gray-500 text-xs">
              Role: {user.uid === callData.callerId ? 'Caller' : 'Callee'} | 
              Offer: {callData.offer ? '✅' : '❌'} | 
              Answer: {callData.answer ? '✅' : '❌'} |
              Initialized: {isInitialized ? '✅' : '❌'}
            </p>
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
