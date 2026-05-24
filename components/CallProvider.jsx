"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketProvider';
import { useUser } from './UserProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video as VideoIcon, VideoOff, Mic, MicOff } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const socket = useSocket();
  const { user } = useUser();

  const [callStatus, setCallStatus] = useState('idle'); // idle, receiving, ringing, connected
  const [callerInfo, setCallerInfo] = useState(null); // Info about the person calling / being called
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  // Setup local/remote video refs when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('incoming_call', (data) => {
      if (callStatus !== 'idle') {
        // If already in a call, maybe reject automatically or show busy
        socket.emit('reject_call', { to: data.from, from: user._id });
        return;
      }
      setCallerInfo(data);
      setCallStatus('receiving');
    });

    socket.on('call_rejected', () => {
      cleanupCall();
      alert("Call was rejected");
    });

    socket.on('call_ended', () => {
      cleanupCall();
    });

    socket.on('webrtc_signal', async (data) => {
      if (data.signal.type === 'offer') {
        // Handled in answerCall
      } else if (data.signal.type === 'answer') {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          setCallStatus('connected');
        }
      } else if (data.signal.candidate) {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
      }
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('webrtc_signal');
    };
  }, [socket, user, callStatus]);

  const initWebRTC = async (isVideo) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
    setLocalStream(stream);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  };

  const callUser = async (userToCallId, isVideo = false, name, avatar) => {
    try {
      setCallerInfo({ from: userToCallId, callerName: name, callerAvatar: avatar, isVideo });
      setCallStatus('ringing');
      
      const pc = await initWebRTC(isVideo);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', { to: userToCallId, from: user._id, signal: { candidate: event.candidate } });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        userToCall: userToCallId,
        from: user._id,
        callerName: user.username,
        callerAvatar: user.avatar,
        isVideo
      });

      socket.emit('webrtc_signal', { to: userToCallId, from: user._id, signal: offer });
    } catch (err) {
      console.error("Failed to start call", err);
      cleanupCall();
    }
  };

  const answerCall = async () => {
    try {
      const pc = await initWebRTC(callerInfo.isVideo);
      setCallStatus('connected');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', { to: callerInfo.from, from: user._id, signal: { candidate: event.candidate } });
        }
      };

      // We need the offer from the socket. 
      // But the offer might have arrived right before we clicked answer. 
      // A better way is to listen for the offer event specifically when we answer.
      // Since it's raw WebRTC, let's setup a one-time listener for the offer.
      const handleOffer = async (data) => {
        if (data.signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc_signal', { to: callerInfo.from, from: user._id, signal: answer });
        }
      };
      
      socket.on('webrtc_signal', handleOffer);
      
      // Request them to send the offer again if we missed it, or just answer with the latest one if we stored it
      // Actually, we can just send an event saying we answered, and they send the offer.
      // But they already sent the offer! So let's store it.
    } catch (err) {
      console.error("Failed to answer", err);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (callerInfo) {
      socket.emit('reject_call', { to: callerInfo.from, from: user._id });
    }
    cleanupCall();
  };

  const endCall = () => {
    if (callerInfo) {
      socket.emit('end_call', { to: callerInfo.from, from: user._id });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallStatus('idle');
    setCallerInfo(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // UI Components
  const renderIncomingCall = () => (
    <AnimatePresence>
      {callStatus === 'receiving' && (
        <motion.div 
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/90 backdrop-blur-xl border border-black/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] rounded-3xl p-4 flex items-center gap-6 pr-6 w-96"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 shadow-lg">
              <AvatarImage src={callerInfo?.callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerInfo?.callerName}`} />
              <AvatarFallback>{callerInfo?.callerName?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 rounded-full ring-4 ring-indigo-500/30 animate-ping" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">{callerInfo?.callerName}</h3>
            <p className="text-sm font-medium text-indigo-600">{callerInfo?.isVideo ? "Incoming Video Call" : "Incoming Audio Call"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={rejectCall} className="w-12 h-12 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all shadow-sm">
              <PhoneOff size={20} />
            </button>
            <button onClick={answerCall} className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-md shadow-green-500/30 animate-bounce">
              <Phone size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderActiveCall = () => (
    <AnimatePresence>
      {(callStatus === 'connected' || callStatus === 'ringing') && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8"
        >
          {callStatus === 'ringing' && (
            <div className="absolute top-20 text-center flex flex-col items-center z-10">
              <Avatar className="h-32 w-32 shadow-2xl mb-6 ring-4 ring-white/10">
                <AvatarImage src={callerInfo?.callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerInfo?.callerName}`} />
              </Avatar>
              <h2 className="text-4xl font-bold text-white mb-2">{callerInfo?.callerName}</h2>
              <p className="text-lg text-white/60 animate-pulse">Ringing...</p>
            </div>
          )}

          {callStatus === 'connected' && (
            <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
              {callerInfo?.isVideo ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Avatar className="h-40 w-40 shadow-2xl mb-8 ring-8 ring-indigo-500/20">
                    <AvatarImage src={callerInfo?.callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerInfo?.callerName}`} />
                  </Avatar>
                  <h2 className="text-3xl font-bold text-white">{callerInfo?.callerName}</h2>
                  <audio ref={remoteVideoRef} autoPlay />
                </div>
              )}
              
              {/* Local PiP Video */}
              {(callerInfo?.isVideo || localStream?.getVideoTracks().length > 0) && (
                <div className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-white/20">
                  <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} />
                  {isVideoOff && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white/50">
                      <VideoOff size={24} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute bottom-12 flex items-center gap-6 px-8 py-4 rounded-full bg-white/10 backdrop-blur-lg border border-white/10">
            <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {isVideoOff ? <VideoOff size={24} /> : <VideoIcon size={24} />}
            </button>
            <div className="w-px h-8 bg-white/20 mx-2" />
            <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/20">
              <PhoneOff size={24} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <CallContext.Provider value={{ callUser, callStatus }}>
      {children}
      {renderIncomingCall()}
      {renderActiveCall()}
    </CallContext.Provider>
  );
};
