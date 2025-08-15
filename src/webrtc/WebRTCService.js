export default class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onIceCandidate = null;
  }

  // Add mobile detection
  isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Enhanced mobile permissions handling
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
    // Check permissions first
    const hasPermissions = await this.handleMobilePermissions();
    if (!hasPermissions) {
      throw new Error('Camera/microphone permissions denied');
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      ...config
    });

    // Mobile-optimized constraints
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
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream.getTracks().forEach(track => 
        this.peerConnection.addTrack(track, this.localStream)
      );

      if (localVideoEl) localVideoEl.srcObject = this.localStream;

      // Remote stream setup
      this.remoteStream = new MediaStream();
      this.peerConnection.addEventListener('track', (event) => {
        event.streams[0].getTracks().forEach(track => 
          this.remoteStream.addTrack(track)
        );
        if (remoteVideoEl) remoteVideoEl.srcObject = this.remoteStream;
      });

      // ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && typeof this.onIceCandidate === "function") {
          this.onIceCandidate(event.candidate);
        }
      };

    } catch (error) {
      console.error('WebRTC initialization failed:', error);
      throw error;
    }
  }

  // Rest of your existing methods...
  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async setRemoteDescription(desc) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
  }

  async createAnswer() {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate) {
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async close() {
    if (this.peerConnection) this.peerConnection.close();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
  }
}