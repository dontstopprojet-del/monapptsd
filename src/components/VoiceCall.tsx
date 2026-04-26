import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { outgoingRingtone } from '../utils/ringtones';

interface VoiceCallProps {
  currentUser: any;
  otherUser: any;
  conversationId: string;
  darkMode: boolean;
  lang: string;
  onClose: () => void;
  isIncoming?: boolean;
  incomingSignalId?: string;
}

type CallStatus = 'initiating' | 'ringing' | 'connecting' | 'active' | 'ended' | 'rejected' | 'failed';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const VoiceCall = ({
  currentUser,
  otherUser,
  conversationId,
  darkMode,
  lang,
  onClose,
  isIncoming = false,
  incomingSignalId,
}: VoiceCallProps) => {
  const [callStatus, setCallStatus] = useState<CallStatus>(isIncoming ? 'ringing' : 'initiating');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasAnsweredRef = useRef(false);
  const signalIdRef = useRef<string | null>(incomingSignalId || null);

  const t = lang === 'fr' ? {
    calling: 'Appel en cours...',
    ringing: 'Sonnerie...',
    connecting: 'Connexion...',
    active: 'En cours',
    ended: 'Appel termine',
    rejected: 'Appel rejete',
    failed: 'Echec de l\'appel',
    incoming: 'Appel entrant',
    accept: 'Accepter',
    reject: 'Rejeter',
    hangup: 'Raccrocher',
    mute: 'Micro',
    speaker: 'Haut-parleur',
  } : {
    calling: 'Calling...',
    ringing: 'Ringing...',
    connecting: 'Connecting...',
    active: 'Active',
    ended: 'Call ended',
    rejected: 'Call rejected',
    failed: 'Call failed',
    incoming: 'Incoming call',
    accept: 'Accept',
    reject: 'Reject',
    hangup: 'Hang up',
    mute: 'Mute',
    speaker: 'Speaker',
  };

  const C = {
    bg: darkMode ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.97)',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    success: '#10B981',
    danger: '#EF4444',
    primary: '#0891b2',
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: '#EF4444',
      tech: '#3b82f6',
      client: '#10B981',
      office: '#F59E0B',
      office_employee: '#F59E0B',
    };
    return colors[role] || C.primary;
  };

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  const flushPendingIceCandidates = useCallback(async () => {
    const candidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];
    for (const candidate of candidates) {
      await supabase.from('call_signals').insert({
        conversation_id: conversationId,
        caller_id: currentUser.id,
        receiver_id: otherUser.id,
        signal_type: 'ice_candidate',
        signal_data: { candidate },
        status: 'active',
      });
    }
  }, [conversationId, currentUser.id, otherUser.id]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidateData = event.candidate.toJSON();
        if (signalIdRef.current) {
          await supabase.from('call_signals').insert({
            conversation_id: conversationId,
            caller_id: currentUser.id,
            receiver_id: otherUser.id,
            signal_type: 'ice_candidate',
            signal_data: { candidate: candidateData },
            status: 'active',
          });
        } else {
          pendingIceCandidatesRef.current.push(candidateData);
        }
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStatus('active');
        if (!durationIntervalRef.current) {
          durationIntervalRef.current = window.setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }
      } else if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            endCall();
          }
        }, 5000);
      } else if (pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [conversationId, currentUser.id, otherUser.id, flushPendingIceCandidates]);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { data, error } = await supabase.from('call_signals').insert({
        conversation_id: conversationId,
        caller_id: currentUser.id,
        receiver_id: otherUser.id,
        signal_type: 'offer',
        signal_data: { sdp: offer.sdp, type: offer.type },
        status: 'ringing',
      }).select().single();

      if (error) throw error;
      signalIdRef.current = data.id;
      setCallStatus('ringing');

      await flushPendingIceCandidates();
    } catch (err) {
      console.error('Error starting call:', err);
      setCallStatus('failed');
      setTimeout(onClose, 2000);
    }
  }, [conversationId, currentUser.id, otherUser.id, createPeerConnection, flushPendingIceCandidates, onClose]);

  const acceptCall = useCallback(async () => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    try {
      setCallStatus('connecting');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const { data: offerSignal } = await supabase
        .from('call_signals')
        .select('*')
        .eq('id', incomingSignalId)
        .maybeSingle();

      if (!offerSignal) throw new Error('No offer found');

      signalIdRef.current = incomingSignalId || null;

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: offerSignal.signal_data.type,
        sdp: offerSignal.signal_data.sdp,
      }));

      for (const candidate of iceCandidatesQueueRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      }
      iceCandidatesQueueRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from('call_signals').insert({
        conversation_id: conversationId,
        caller_id: currentUser.id,
        receiver_id: otherUser.id,
        signal_type: 'answer',
        signal_data: { sdp: answer.sdp, type: answer.type },
        status: 'active',
      });

      await supabase.from('call_signals')
        .update({ status: 'active' })
        .eq('id', incomingSignalId);

      await flushPendingIceCandidates();
    } catch (err) {
      console.error('Error accepting call:', err);
      setCallStatus('failed');
      setTimeout(onClose, 2000);
    }
  }, [incomingSignalId, conversationId, currentUser.id, otherUser.id, createPeerConnection, flushPendingIceCandidates, onClose]);

  const rejectCall = useCallback(async () => {
    if (incomingSignalId) {
      await supabase.from('call_signals')
        .update({ status: 'rejected' })
        .eq('id', incomingSignalId);

      await supabase.from('call_signals').insert({
        conversation_id: conversationId,
        caller_id: currentUser.id,
        receiver_id: otherUser.id,
        signal_type: 'call_reject',
        signal_data: {},
        status: 'rejected',
      });
    }
    cleanup();
    onClose();
  }, [incomingSignalId, conversationId, currentUser.id, otherUser.id, cleanup, onClose]);

  const endCall = useCallback(async () => {
    setCallStatus('ended');

    await supabase.from('call_signals').insert({
      conversation_id: conversationId,
      caller_id: currentUser.id,
      receiver_id: otherUser.id,
      signal_type: 'call_end',
      signal_data: {},
      status: 'ended',
    });

    const currentSignalId = signalIdRef.current;
    if (currentSignalId) {
      await supabase.from('call_signals')
        .update({ status: 'ended' })
        .eq('id', currentSignalId);
    }

    cleanup();
    setTimeout(onClose, 1500);
  }, [conversationId, currentUser.id, otherUser.id, cleanup, onClose]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(prev => !prev);
    if (remoteAudioRef.current) {
      (remoteAudioRef.current as any).setSinkId?.('default');
    }
  };

  useEffect(() => {
    const channelName = `call_${conversationId}_${currentUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, async (payload) => {
        const signal = payload.new as any;
        if (signal.conversation_id !== conversationId) return;

        if (signal.signal_type === 'answer' && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription({ type: signal.signal_data.type, sdp: signal.signal_data.sdp })
            );
            setCallStatus('connecting');
          } catch (err) {
            console.error('Error setting remote description:', err);
          }
        }

        if (signal.signal_type === 'ice_candidate') {
          const candidate = new RTCIceCandidate(signal.signal_data.candidate);
          if (peerConnectionRef.current?.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(candidate).catch(() => {});
          } else {
            iceCandidatesQueueRef.current.push(signal.signal_data.candidate);
          }
        }

        if (signal.signal_type === 'call_end') {
          setCallStatus('ended');
          cleanup();
          setTimeout(onClose, 1500);
        }

        if (signal.signal_type === 'call_reject') {
          setCallStatus('rejected');
          cleanup();
          setTimeout(onClose, 2000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, currentUser.id, cleanup, onClose]);

  useEffect(() => {
    if (!isIncoming) {
      startCall();
    }
    return () => {
      outgoingRingtone.stop();
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isIncoming && (callStatus === 'ringing' || callStatus === 'initiating')) {
      outgoingRingtone.playOutgoingRingtone();
    } else {
      outgoingRingtone.stop();
    }
    return () => { outgoingRingtone.stop(); };
  }, [callStatus, isIncoming]);

  const statusLabel = callStatus === 'initiating' ? t.calling
    : callStatus === 'ringing' ? (isIncoming ? t.incoming : t.ringing)
    : callStatus === 'connecting' ? t.connecting
    : callStatus === 'active' ? formatDuration(callDuration)
    : callStatus === 'ended' ? t.ended
    : callStatus === 'rejected' ? t.rejected
    : t.failed;

  const showPulse = callStatus === 'ringing' || callStatus === 'initiating' || callStatus === 'connecting';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: darkMode
        ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(180deg, #0891b2 0%, #0e7490 50%, #164e63 100%)',
      zIndex: 10010,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '60px 24px 48px',
    }}>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.7)',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          {isIncoming && callStatus === 'ringing' ? t.incoming : (lang === 'fr' ? 'Appel vocal' : 'Voice Call')}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          {showPulse && (
            <>
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '-20px',
                right: '-20px',
                bottom: '-20px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.15)',
                animation: 'callPulse 2s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                top: '-40px',
                left: '-40px',
                right: '-40px',
                bottom: '-40px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.08)',
                animation: 'callPulse 2s ease-in-out infinite 0.5s',
              }} />
            </>
          )}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: getRoleColor(otherUser?.role || ''),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: '40px',
            fontWeight: '800',
            boxShadow: `0 8px 32px ${getRoleColor(otherUser?.role || '')}60`,
          }}>
            {getInitials(otherUser?.name || 'U')}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#FFF',
            marginBottom: '6px',
          }}>
            {otherUser?.name || 'Utilisateur'}
          </div>
          <div style={{
            fontSize: '16px',
            color: callStatus === 'active' ? '#10B981' : 'rgba(255,255,255,0.7)',
            fontWeight: '600',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {statusLabel}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        {callStatus === 'active' && (
          <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
            <button
              onClick={toggleMute}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                background: isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)',
                color: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span style={{ fontSize: '22px' }}>{isMuted ? '🔇' : '🎤'}</span>
              <span style={{ fontSize: '9px', opacity: 0.8 }}>{t.mute}</span>
            </button>
            <button
              onClick={toggleSpeaker}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                background: isSpeaker ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.15)',
                color: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span style={{ fontSize: '22px' }}>{isSpeaker ? '🔊' : '🔈'}</span>
              <span style={{ fontSize: '9px', opacity: 0.8 }}>{t.speaker}</span>
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {isIncoming && callStatus === 'ringing' ? (
            <>
              <button
                onClick={rejectCall}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFF',
                  cursor: 'pointer',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(239,68,68,0.5)',
                  transition: 'transform 0.2s',
                }}
              >
                📵
              </button>
              <button
                onClick={acceptCall}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#10B981',
                  color: '#FFF',
                  cursor: 'pointer',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.5)',
                  animation: 'callPulse 1.5s ease-in-out infinite',
                  transition: 'transform 0.2s',
                }}
              >
                📞
              </button>
            </>
          ) : callStatus !== 'ended' && callStatus !== 'rejected' && callStatus !== 'failed' ? (
            <button
              onClick={endCall}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                background: '#EF4444',
                color: '#FFF',
                cursor: 'pointer',
                fontSize: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,0.5)',
                transition: 'transform 0.2s',
              }}
            >
              📵
            </button>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes callPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default VoiceCall;
