import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Fingerprint,
  Heart,
  Volume2,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/haptics';

interface TouchPoint {
  x: number;
  y: number;
  active: boolean;
  name: string;
  avatar: string;
}

interface TouchMeltModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userName: string;
  userAvatar: string;
  partnerName: string;
  partnerAvatar: string;
  socket?: any;
}

export const TouchMeltModal: React.FC<TouchMeltModalProps> = ({
  isOpen,
  onClose,
  roomId,
  userName,
  userAvatar,
  partnerName,
  partnerAvatar,
  socket,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'touch' | 'heartbeat'>('touch');

  // Touch State
  const [myTouch, setMyTouch] = useState<TouchPoint | null>(null);
  const [partnerTouch, setPartnerTouch] = useState<TouchPoint | null>(null);
  const [isMerged, setIsMerged] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Heartbeat Knock State
  const [isRecordingKnock, setIsRecordingKnock] = useState(false);
  const [knockTimestamps, setKnockTimestamps] = useState<number[]>([]);
  const [lastReceivedKnock, setLastReceivedKnock] = useState<{ senderName: string; pattern: number[] } | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  // Initialize Web Audio on first user interaction
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Play realistic synthesized Heartbeat "Lub-Dub" sound
  const playHeartbeatSoundNode = (pitch = 1) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Lub (low deep thump)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80 * pitch, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain1.gain.setValueAtTime(0.6, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Dub (slightly higher thump ~0.15s later)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110 * pitch, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.28);
    gain2.gain.setValueAtTime(0.7, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.28);
  };

  // Play melodic harmonic chime when touches converge
  const playHarmonicChord = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const freqs = [261.63, 329.63, 392.00, 523.25]; // C Major Chord
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + 1.2);
    });
  };

  // Socket listener for partner touch position & heartbeat knocks
  useEffect(() => {
    if (!socket) return;

    const handleTouchStream = (data: { touch: TouchPoint & { userId: string } }) => {
      if (data.touch) {
        if (data.touch.active) {
          setPartnerTouch(data.touch);
        } else {
          setPartnerTouch(null);
        }
      }
    };

    const handleKnockReceived = (data: { senderName: string; pattern: number[] }) => {
      setLastReceivedKnock(data);
      triggerHaptic('buzz');
      // Play back received pattern
      playKnockPattern(data.pattern);
    };

    socket.on('touch-melt-stream', handleTouchStream);
    socket.on('heartbeat-knock-received', handleKnockReceived);

    return () => {
      socket.off('touch-melt-stream', handleTouchStream);
      socket.off('heartbeat-knock-received', handleKnockReceived);
    };
  }, [socket]);

  // Check touch proximity convergence
  useEffect(() => {
    if (myTouch?.active && partnerTouch?.active) {
      const dx = myTouch.x - partnerTouch.x;
      const dy = myTouch.y - partnerTouch.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If touches are close (within 140px) or both holding for > 1s, merge!
      if (dist < 160 && !isMerged) {
        setIsMerged(true);
        playHarmonicChord();
        triggerHaptic('buzz');
        confetti({
          particleCount: 50,
          spread: 80,
          origin: { x: (myTouch.x + partnerTouch.x) / (2 * window.innerWidth), y: (myTouch.y + partnerTouch.y) / (2 * window.innerHeight) },
          colors: ['#f43f5e', '#ec4899', '#f59e0b', '#fb7185'],
        });
      }
    } else {
      setIsMerged(false);
    }
  }, [myTouch, partnerTouch, isMerged]);

  if (!isOpen) return null;

  // Handle Touch / Mouse Events on Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pt: TouchPoint = {
      x,
      y,
      active: true,
      name: userName,
      avatar: userAvatar,
    };
    setMyTouch(pt);
    playHeartbeatSoundNode(0.9);
    triggerHaptic('light');

    if (socket && roomId) {
      socket.emit('touch-melt-pos', {
        roomId,
        touch: pt,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!myTouch?.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pt: TouchPoint = {
      x,
      y,
      active: true,
      name: userName,
      avatar: userAvatar,
    };
    setMyTouch(pt);

    if (socket && roomId) {
      socket.emit('touch-melt-pos', {
        roomId,
        touch: pt,
      });
    }
  };

  const handlePointerUp = () => {
    if (!myTouch) return;
    setMyTouch(null);
    setIsMerged(false);

    if (socket && roomId) {
      socket.emit('touch-melt-pos', {
        roomId,
        touch: { x: 0, y: 0, active: false, name: userName, avatar: userAvatar },
      });
    }
  };

  // Heartbeat Knock Recorder Logic
  const handleKnockTap = () => {
    const now = Date.now();
    playHeartbeatSoundNode(1);
    triggerHaptic('light');

    if (!isRecordingKnock) {
      setIsRecordingKnock(true);
      setKnockTimestamps([0]);
    } else {
      const first = knockTimestamps[0] || now;
      const delta = now - first;
      setKnockTimestamps((prev) => [...prev, delta]);
    }
  };

  const playKnockPattern = (pattern: number[]) => {
    if (!pattern.length) return;
    setIsPlayingBack(true);

    pattern.forEach((delay, idx) => {
      setTimeout(() => {
        playHeartbeatSoundNode(idx % 2 === 0 ? 1 : 1.15);
        triggerHaptic('light');
        if (idx === pattern.length - 1) {
          setIsPlayingBack(false);
        }
      }, delay);
    });
  };

  const handleSendKnock = () => {
    if (knockTimestamps.length < 2) return;
    if (socket && roomId) {
      socket.emit('heartbeat-knock', {
        roomId,
        senderName: userName,
        pattern: knockTimestamps,
      });
    }
    triggerHaptic('success');
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    setIsRecordingKnock(false);
    setKnockTimestamps([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl shadow-xs">
              <Fingerprint className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Mutual Touch Melt</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Tactile Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Touch the screen together or record rhythm knocks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Touch Melt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('touch')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'touch'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Fingerprint Convergence</span>
          </button>
          <button
            onClick={() => setActiveTab('heartbeat')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'heartbeat'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Heartbeat Knock Sync</span>
          </button>
        </div>

        {/* Tab 1: Mutual Fingerprint Convergence Canvas */}
        {activeTab === 'touch' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5">
            <div className="text-center mb-3">
              <p className="text-xs text-slate-300">
                Place and hold your finger anywhere below. When <strong className="text-rose-400">{partnerName}</strong> touches too, your energy rings merge!
              </p>
            </div>

            {/* Touch Interactive Pad */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative flex-1 min-h-[300px] rounded-3xl border-2 transition-all duration-300 cursor-crosshair overflow-hidden touch-none flex items-center justify-center ${
                isMerged
                  ? 'border-amber-400/80 bg-gradient-to-tr from-rose-950/60 via-amber-950/40 to-pink-950/60 shadow-[0_0_50px_rgba(245,158,11,0.25)]'
                  : myTouch?.active
                  ? 'border-rose-500/50 bg-slate-950/80'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              {/* Background Radar Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-48 h-48 rounded-full border border-rose-500/40 animate-ping" />
                <div className="w-32 h-32 rounded-full border border-pink-500/30" />
              </div>

              {/* Instructions Prompt when idle */}
              {!myTouch?.active && !partnerTouch?.active && (
                <div className="text-center pointer-events-none p-6 animate-pulse">
                  <Fingerprint className="w-16 h-16 text-rose-500/40 mx-auto mb-2" />
                  <span className="text-sm font-bold text-slate-400">Touch & Hold Screen Here</span>
                  <span className="block text-[11px] text-slate-500 mt-1">Multi-touch enabled</span>
                </div>
              )}

              {/* My Touch Aura Ring */}
              {myTouch?.active && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform"
                  style={{ left: myTouch.x, top: myTouch.y }}
                >
                  <div className="w-28 h-28 rounded-full bg-rose-500/25 border-2 border-rose-400 animate-ping duration-1000" />
                  <div className="absolute w-20 h-20 rounded-full bg-rose-500/35 border-2 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.6)] flex items-center justify-center">
                    <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white" />
                  </div>
                </div>
              )}

              {/* Partner Touch Aura Ring */}
              {partnerTouch?.active && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-150"
                  style={{ left: partnerTouch.x, top: partnerTouch.y }}
                >
                  <div className="w-28 h-28 rounded-full bg-indigo-500/25 border-2 border-indigo-400 animate-ping duration-1000" />
                  <div className="absolute w-20 h-20 rounded-full bg-indigo-500/35 border-2 border-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.6)] flex items-center justify-center">
                    <img src={partnerAvatar} alt={partnerName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white" />
                  </div>
                </div>
              )}

              {/* Merged Convergence Effect */}
              {isMerged && (
                <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center bg-rose-500/10 backdrop-blur-xs animate-in zoom-in-95">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-[0_0_60px_rgba(251,113,133,0.8)] animate-bounce">
                    <Heart className="w-14 h-14 fill-white animate-pulse" />
                  </div>
                  <span className="text-base font-extrabold text-white mt-3 drop-shadow-md">
                    Touches Merged! ✨
                  </span>
                  <span className="text-xs text-rose-200">Shared Heartbeat & Haptic Warmth</span>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${myTouch?.active ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                <span>You: {myTouch?.active ? 'Touching Pad' : 'Idle'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${partnerTouch?.active ? 'bg-indigo-400 animate-ping' : 'bg-slate-600'}`} />
                <span>{partnerName}: {partnerTouch?.active ? 'Touching Pad 💖' : 'Waiting...'}</span>
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Heartbeat Knock Sync */}
        {activeTab === 'heartbeat' && (
          <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-4">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300">
              <p className="font-bold text-white mb-1 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Record & Send Physical Rhythm Knocks:</span>
              </p>
              Tap the large heart in any rhythm (like a secret knock or heartbeat tempo). When sent, {partnerName}'s phone will vibrate and play that exact tactile rhythm!
            </div>

            {/* Tap Button Canvas */}
            <div className="flex flex-col items-center justify-center py-6">
              <button
                type="button"
                id="btn-tap-heartbeat"
                onClick={handleKnockTap}
                className="w-36 h-36 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-red-500 text-white flex flex-col items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.4)] active:scale-90 hover:scale-105 transition-transform cursor-pointer"
              >
                <Heart className={`w-14 h-14 fill-white ${isRecordingKnock ? 'animate-bounce' : 'animate-pulse'}`} />
                <span className="text-xs font-extrabold mt-1 uppercase tracking-wider">
                  {isRecordingKnock ? 'Tap Rhythm!' : 'Tap Here'}
                </span>
              </button>

              <div className="mt-4 text-center">
                <span className="text-sm font-bold text-slate-200">
                  {knockTimestamps.length} Beats Recorded
                </span>
                {knockTimestamps.length > 0 && (
                  <div className="flex gap-1.5 justify-center mt-2">
                    {knockTimestamps.map((_, i) => (
                      <span key={i} className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => playKnockPattern(knockTimestamps)}
                disabled={knockTimestamps.length < 2 || isPlayingBack}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingBack ? 'Playing...' : 'Test Playback'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendKnock}
                disabled={knockTimestamps.length < 2}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-40 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Send Rhythm Knock</span>
              </button>
            </div>

            {/* Last received knock banner */}
            {lastReceivedKnock && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs text-rose-300">
                <span>Received knock rhythm from {lastReceivedKnock.senderName}!</span>
                <button
                  type="button"
                  onClick={() => playKnockPattern(lastReceivedKnock.pattern)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 cursor-pointer"
                >
                  Replay
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
