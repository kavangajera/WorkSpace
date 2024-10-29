import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Camera, CameraOff, Mic, MicOff, Users } from 'lucide-react';
import { Peer } from "https://esm.sh/peerjs@1.5.4?bundle-deps";

const App = () => {
  const [myVideoStream, setMyVideoStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerError, setPeerError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  
  const videoRef = useRef(null);
  const socket = useRef(null);
  const peerRef = useRef(null);
  const myStream = useRef(null);
  const connections = useRef(new Set());

  const addVideoStream = (stream, userId) => {
    if (!connections.current.has(userId)) {
      connections.current.add(userId);
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: stream
      }));
      setParticipantCount(prev => prev + 1);
    }
  };

  const connectToNewUser = (userId, stream) => {
    if (!connections.current.has(userId) && peerRef.current) {
      console.log('Connecting to user:', userId);
      const call = peerRef.current.call(userId, stream);
      
      call.on('stream', (userVideoStream) => {
        addVideoStream(userVideoStream, userId);
      });

      call.on('close', () => {
        removeUserStream(userId);
      });
    }
  };

  const removeUserStream = (userId) => {
    if (connections.current.has(userId)) {
      connections.current.delete(userId);
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
      setParticipantCount(prev => Math.max(1, prev - 1));
    }
  };

  const toggleMute = () => {
    if (myStream.current) {
      const audioTrack = myStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (myStream.current) {
      const videoTrack = myStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const cleanup = () => {
      connections.current.clear();
      if (myStream.current) {
        myStream.current.getTracks().forEach(track => track.stop());
      }
      if (socket.current) {
        socket.current.disconnect();
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      setParticipantCount(1);
    };

    const init = async () => {
      cleanup();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        myStream.current = stream;
        setMyVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        socket.current = io("https://workspace-qvqj.onrender.com", {
          withCredentials: true,
        });

        peerRef.current = new Peer(undefined, {
          path: '/peerjs',
          host: 'workspace-1-y9er.onrender.com',
          port: '',
          secure: true,
        });

        peerRef.current.on('error', (err) => {
          if (mounted) setPeerError(err.message);
        });

        peerRef.current.on('open', (id) => {
          console.log('Connected with ID:', id);
          socket.current.emit('join-room', 'roomId123', id);
        });

        peerRef.current.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (userVideoStream) => {
            if (mounted) addVideoStream(userVideoStream, call.peer);
          });
        });

        socket.current.on('user-connected', (userId) => {
          if (mounted) connectToNewUser(userId, stream);
        });

        socket.current.on('user-disconnected', (userId) => {
          if (mounted) {
            console.log('User disconnected:', userId);
            removeUserStream(userId);
          }
        });

      } catch (err) {
        console.error('Setup error:', err);
        if (mounted) setPeerError(err.message);
      }
    };

    init();

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      {/* Header with participant count */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-gray-800/50 rounded-full px-4 py-2">
        <Users size={20} className="text-blue-400" />
        <span className="text-sm">{participantCount} {participantCount === 1 ? 'Participant' : 'Participants'}</span>
      </div>

      {peerError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/90 text-white p-2 text-center backdrop-blur-sm">
          Connection Error: {peerError}
        </div>
      )}

      {/* Main video grid */}
      <div className="w-full h-full p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
        {/* Local video */}
        <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden ring-1 ring-gray-700">
          <video
            ref={videoRef}
            autoPlay
            muted
            className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <CameraOff size={48} className="text-gray-500" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 px-4 py-2 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">You</span>
              <div className="flex gap-2">
                {isMuted && <MicOff size={16} className="text-red-500" />}
                {isCameraOff && <CameraOff size={16} className="text-red-500" />}
              </div>
            </div>
          </div>
        </div>

        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([userId, stream]) => (
          <div key={userId} className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden ring-1 ring-gray-700">
            <video
              autoPlay
              ref={video => {
                if (video) video.srcObject = stream;
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 px-4 py-2 bg-gradient-to-t from-black/70 to-transparent">
              <span className="text-sm font-medium">User {userId.slice(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full shadow-lg shadow-black/50 px-6 py-3 flex gap-6">
        <button 
          onClick={toggleCamera}
          className={`p-3 rounded-full transition-all ${
            isCameraOff 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'hover:bg-gray-700 text-gray-300'
          }`}
        >
          {isCameraOff ? <CameraOff size={24} /> : <Camera size={24} />}
        </button>
        <button 
          onClick={toggleMute}
          className={`p-3 rounded-full transition-all ${
            isMuted 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'hover:bg-gray-700 text-gray-300'
          }`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
      </div>
    </div>
  );
};

export default App;