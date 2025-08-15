export default class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onIceCandidate = null;
    this.pendingCandidates = [];
  }

  isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async handleMobilePermissions() {
    try {
      const constraints = this.isMobile() 
        ? { video: { width: 640, height: 480, facingMode: 'user' }, audio: true }
        : { video: true, audio: true };
        
      await navigator.mediaDevices.getUserMedia(constraints);
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('Please allow camera and microphone access in your browser settings');
      } else if (error.name === 'NotFoundError') {
        alert('No camera or microphone found on this device');
      } else if (error.name === 'NotReadableError') {
        alert('Camera or microphone is already in use by another application');
      } else {
        alert('Error accessing camera/microphone: ' + error.message);
      }
      return false;
    }
  }

  async init(localVideoEl, remoteVideoEl, config = {}) {
    const hasPermissions = await this.handleMobilePermissions();
    if (!hasPermissions) {
      throw new Error('Camera/microphone permissions denied');
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      ...config
    });

    const constraints = this.isMobile() 
      ? { 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user' 
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        }
      : { video: true, audio: true };

    try {
      // Get local stream
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📹 Local stream obtained:', this.localStream.getTracks().map(t => `${t.kind}: ${t.id}`));
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('➕ Adding local track to peer connection:', track.kind, track.id);
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Set local video
      if (localVideoEl) {
        localVideoEl.srcObject = this.localStream;
        console.log('📺 Local video element assigned');
      }

      // Initialize remote stream
      this.remoteStream = new MediaStream();
      console.log('🆕 Remote stream initialized');

      // **FIX: Enhanced track event handler**
      this.peerConnection.addEventListener('track', (event) => {
        console.log('🎬 Track event received!');
        console.log('   Track kind:', event.track.kind);
        console.log('   Track ID:', event.track.id);
        console.log('   Track state:', event.track.readyState);
        console.log('   Streams count:', event.streams.length);
        
        if (event.streams.length > 0) {
          console.log('   Stream ID:', event.streams[0].id);
          console.log('   Stream tracks:', event.streams.getTracks().map(t => `${t.kind}: ${t.id}`));
          
          // Method 1: Use the stream directly (preferred)
          if (remoteVideoEl) {
            remoteVideoEl.srcObject = event.streams;
            console.log('📺 Remote video assigned directly from stream');
            
            // Force play (sometimes needed)
            setTimeout(() => {
              remoteVideoEl.play().catch(e => console.log('Play failed:', e));
            }, 100);
          }
          
          // Method 2: Add to our remote stream (backup)
          event.streams.getTracks().forEach(track => {
            if (!this.remoteStream.getTracks().find(t => t.id === track.id)) {
              this.remoteStream.addTrack(track);
              console.log('➕ Added track to remote stream:', track.kind, track.id);
            }
          });
        } else {
          // Fallback: add track directly
          console.log('⚠️ No streams in track event, adding track directly');
          if (!this.remoteStream.getTracks().find(t => t.id === event.track.id)) {
            this.remoteStream.addTrack(event.track);
            console.log('➕ Added track directly to remote stream:', event.track.kind);
          }
          
          if (remoteVideoEl) {
            remoteVideoEl.srcObject = this.remoteStream;
            console.log('📺 Remote video assigned from manual stream');
          }
        }
      });

      // Debug connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        console.log('🔗 Connection state:', this.peerConnection.connectionState);
      });

      this.peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
      });

      // Handle ICE candidates safely
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && typeof this.onIceCandidate === "function") {
          const candidateObject = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment
          };
          this.onIceCandidate(candidateObject);
        }
      };

      // Process pending candidates when remote description is set
      this.peerConnection.addEventListener('signalingstatechange', () => {
        console.log('📡 Signaling state:', this.peerConnection.signalingState);
        if (this.peerConnection.remoteDescription && this.pendingCandidates.length > 0) {
          console.log('🧊 Processing', this.pendingCandidates.length, 'pending candidates');
          this.pendingCandidates.forEach(candidate => {
            this.addIceCandidate(candidate);
          });
          this.pendingCandidates = [];
        }
      });

    } catch (error) {
      console.error('WebRTC initialization failed:', error);
      throw error;
    }
  }

  async createOffer() {
    console.log('📝 Creating offer...');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log('📝 Local description set (offer)');
    return {
      type: offer.type,
      sdp: offer.sdp
    };
  }

  async setRemoteDescription(desc) {
    try {
      console.log('📡 Setting remote description, current state:', this.peerConnection.signalingState);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
      console.log('📡 Remote description set successfully, new state:', this.peerConnection.signalingState);
    } catch (error) {
      console.error('❌ Failed to set remote description:', error);
      throw error;
    }
  }

  async createAnswer() {
    console.log('📝 Creating answer...');
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('📝 Local description set (answer)');
    return {
      type: answer.type,
      sdp: answer.sdp
    };
  }

  async addIceCandidate(candidate) {
    try {
      if (!this.peerConnection.remoteDescription) {
        console.log('🧊 Remote description not set yet, queuing candidate');
        this.pendingCandidates.push(candidate);
        return;
      }
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('🧊 ICE candidate added successfully');
    } catch (error) {
      console.warn('⚠️ Error adding ICE candidate (ignoring):', error);
    }
  }

  async close() {
    console.log('🧹 Closing WebRTC connection...');
    if (this.peerConnection) this.peerConnection.close();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
  }
}