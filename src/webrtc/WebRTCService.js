export default class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onIceCandidate = null; // callback
  }

  async init(localVideoEl, remoteVideoEl, config = {}) {
    this.peerConnection = new RTCPeerConnection(config);

    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      // Adjust video constraints for mobile
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
    } else {
      // Local stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    }

    this.localStream
      .getTracks()
      .forEach((track) =>
        this.peerConnection.addTrack(track, this.localStream)
      );

    // Set local video element
    if (localVideoEl) localVideoEl.srcObject = this.localStream;

    // Remote stream
    this.remoteStream = new MediaStream();
    this.peerConnection.addEventListener("track", (event) => {
      event.streams[0]
        .getTracks()
        .forEach((track) => this.remoteStream.addTrack(track));
      if (remoteVideoEl) remoteVideoEl.srcObject = this.remoteStream;
    });

    // ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && typeof this.onIceCandidate === "function") {
        this.onIceCandidate(event.candidate);
      }
    };
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async setRemoteDescription(desc) {
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(desc)
    );
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
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
  }
}
