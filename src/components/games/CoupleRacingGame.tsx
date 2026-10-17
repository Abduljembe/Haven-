import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw, Zap, Heart, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CoupleRacingGameProps {
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  currentUserAvatar?: string;
  partnerAvatar?: string;
  isPlayer1?: boolean;
  onBroadcastAction: (actionData: any) => void;
  incomingAction?: any;
  isDark?: boolean;
}

export const CoupleRacingGame: React.FC<CoupleRacingGameProps> = ({
  currentUserId,
  currentUserName,
  partnerName,
  isPlayer1 = true,
  onBroadcastAction,
  incomingAction,
  isDark = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'racing' | 'finished'>('menu');
  const [myScore, setMyScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);
  const [myBoosts, setMyBoosts] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);
  const [trackDistance, setTrackDistance] = useState(0);
  const maxDistance = 1000;

  const myCarRef = useRef({ lane: 1, x: 200, y: 450, shield: false });
  const partnerCarRef = useRef({ lane: 0, x: 110, y: 450 });
  const obstaclesRef = useRef<Array<{ id: number; lane: number; y: number; type: 'car' | 'heart' | 'boost' | 'shield' }>>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>>([]);
  const animFrameRef = useRef<number | null>(null);

  const sendGameUpdate = useCallback((lane: number, distance: number, score: number, boosts: number) => {
    onBroadcastAction({
      type: 'racing-update',
      userId: currentUserId,
      lane,
      distance,
      score,
      boosts,
    });
  }, [currentUserId, onBroadcastAction]);

  useEffect(() => {
    if (!incomingAction) return;
    if (incomingAction.type === 'racing-update' && incomingAction.userId !== currentUserId) {
      partnerCarRef.current = {
        lane: incomingAction.lane,
        x: incomingAction.lane === 0 ? 110 : incomingAction.lane === 1 ? 200 : 290,
        y: 450,
      };
      setPartnerScore(incomingAction.score);
    } else if (incomingAction.type === 'racing-start') {
      setGameState('racing');
      setTrackDistance(0);
      setMyScore(0);
      setPartnerScore(0);
      setMyBoosts(3);
      setWinner(null);
    }
  }, [incomingAction, currentUserId]);

  const startGame = () => {
    setGameState('racing');
    setTrackDistance(0);
    setMyScore(0);
    setPartnerScore(0);
    setMyBoosts(3);
    setWinner(null);
    myCarRef.current = { lane: 1, x: 200, y: 450, shield: false };
    obstaclesRef.current = [];
    particlesRef.current = [];
    onBroadcastAction({ type: 'racing-start' });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'racing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        myCarRef.current.lane = Math.max(0, myCarRef.current.lane - 1);
        sendGameUpdate(myCarRef.current.lane, trackDistance, myScore, myBoosts);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        myCarRef.current.lane = Math.min(2, myCarRef.current.lane + 1);
        sendGameUpdate(myCarRef.current.lane, trackDistance, myScore, myBoosts);
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        if (myBoosts > 0) {
          setMyBoosts((b) => b - 1);
          setTrackDistance((d) => Math.min(maxDistance, d + 50));
          setMyScore((s) => s + 75);
          // Spawn boost particles
          const carX = myCarRef.current.lane === 0 ? 110 : myCarRef.current.lane === 1 ? 200 : 290;
          for (let i = 0; i < 15; i++) {
            particlesRef.current.push({
              x: carX,
              y: 450,
              vx: (Math.random() - 0.5) * 4,
              vy: Math.random() * 4 + 2,
              color: '#38bdf8',
              life: 30,
            });
          }
          sendGameUpdate(myCarRef.current.lane, trackDistance + 50, myScore + 75, myBoosts - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, myBoosts, trackDistance, myScore, sendGameUpdate]);

  // Game loop with gorgeous high-fidelity graphics
  useEffect(() => {
    if (gameState !== 'racing') return;

    let lastSpawn = Date.now();
    let roadScroll = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Neon Cyber-Romantic Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#31103f');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starry horizon dots
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 37 + roadScroll * 0.2) % canvas.width;
        const sy = (i * 19) % 150;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 2. Road surface with glowing borders
      roadScroll = (roadScroll + 5) % 40;
      ctx.fillStyle = '#111827';
      ctx.fillRect(70, 0, 260, canvas.height);

      // Neon road shoulders
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f43f5e';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(70, 0);
      ctx.lineTo(70, canvas.height);
      ctx.moveTo(330, 0);
      ctx.lineTo(330, canvas.height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dashed lane lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([25, 25]);
      ctx.lineDashOffset = -roadScroll;
      ctx.beginPath();
      ctx.moveTo(156, 0);
      ctx.lineTo(156, canvas.height);
      ctx.moveTo(244, 0);
      ctx.lineTo(244, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance increment
      setTrackDistance((prev) => {
        const next = prev + 0.8;
        if (next >= maxDistance) {
          setGameState('finished');
          setWinner(myScore >= partnerScore ? currentUserName : partnerName);
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
        return Math.min(maxDistance, next);
      });

      // Spawn obstacles & powerups
      if (Date.now() - lastSpawn > 1300) {
        lastSpawn = Date.now();
        const lane = Math.floor(Math.random() * 3);
        const rand = Math.random();
        const type = rand > 0.5 ? 'car' : rand > 0.3 ? 'heart' : rand > 0.15 ? 'boost' : 'shield';
        obstaclesRef.current.push({
          id: Date.now(),
          lane,
          y: -60,
          type: type as any,
        });
      }

      // Render Obstacles & Powerups
      obstaclesRef.current.forEach((obs) => {
        obs.y += 4;
        const obsX = obs.lane === 0 ? 113 : obs.lane === 1 ? 200 : 287;

        if (obs.type === 'car') {
          // Detailed Obstacle Sports Car
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.roundRect(obsX - 18, obs.y, 36, 64, 8);
          ctx.fill();
          // Windshield
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(obsX - 12, obs.y + 12, 24, 16);
          // Headlights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(obsX - 15, obs.y, 8, 4);
          ctx.fillRect(obsX + 7, obs.y, 8, 4);
          ctx.shadowBlur = 0;
        } else if (obs.type === 'heart') {
          ctx.font = '26px sans-serif';
          ctx.fillText('💖', obsX - 13, obs.y + 32);
        } else if (obs.type === 'boost') {
          ctx.font = '26px sans-serif';
          ctx.fillText('⚡', obsX - 13, obs.y + 32);
        } else if (obs.type === 'shield') {
          ctx.font = '26px sans-serif';
          ctx.fillText('🛡️', obsX - 13, obs.y + 32);
        }

        // Collision with player
        const myX = myCarRef.current.lane === 0 ? 113 : myCarRef.current.lane === 1 ? 200 : 287;
        if (Math.abs(obs.y - 440) < 40 && Math.abs(obsX - myX) < 25) {
          if (obs.type === 'car') {
            if (!myCarRef.current.shield) {
              setTrackDistance((d) => Math.max(0, d - 30));
              setMyScore((s) => Math.max(0, s - 20));
            } else {
              myCarRef.current.shield = false; // Shield protects!
            }
          } else if (obs.type === 'heart') {
            setMyScore((s) => s + 35);
          } else if (obs.type === 'boost') {
            setMyBoosts((b) => b + 1);
          } else if (obs.type === 'shield') {
            myCarRef.current.shield = true;
          }
          obs.y = 9999;
        }
      });

      obstaclesRef.current = obstaclesRef.current.filter((obs) => obs.y < 600);

      // Render Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // Render My Car (Gorgeous Cyber Pink Sports Car)
      const myX = myCarRef.current.lane === 0 ? 113 : myCarRef.current.lane === 1 ? 200 : 287;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fb7185';
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(myX - 18, 420, 36, 68, 10);
      ctx.fill();

      // Windshield & Roof
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(myX - 12, 435, 24, 20);

      // Glowing Neon Headlights & Tail lights
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(myX - 15, 420, 8, 4);
      ctx.fillRect(myX + 7, 420, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(myX - 14, 484, 8, 4);
      ctx.fillRect(myX + 6, 484, 8, 4);

      if (myCarRef.current.shield) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(myX, 454, 32, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Driver Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUserName, myX, 508);

      // Render Partner Car (Gorgeous Cyber Indigo Sports Car)
      const partnerX = partnerCarRef.current.lane === 0 ? 113 : partnerCarRef.current.lane === 1 ? 200 : 287;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#818cf8';
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.roundRect(partnerX - 18, 360, 36, 68, 10);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(partnerX - 12, 375, 24, 20);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#c7d2fe';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(partnerName, partnerX, 352);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, currentUserName, partnerName, myScore, partnerScore]);

  return (
    <div className={`w-full max-w-lg mx-auto rounded-3xl p-6 border shadow-2xl ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-500/30">
            🏎️
          </div>
          <div>
            <h2 className="text-base font-bold">Heart Rush Racing 3D</h2>
            <p className="text-xs text-slate-400">Cyber-romantic arcade racing with {partnerName}</p>
          </div>
        </div>
      </div>

      {/* Menu State */}
      {gameState === 'menu' && (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl mb-2 animate-bounce">🏁</div>
          <h3 className="text-xl font-bold font-serif text-rose-400">Ready to Race, {currentUserName}?</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Use Left/Right arrow keys or touch buttons to switch lanes, dodge cyber traffic, and press Spacebar for hyper-boosts!
          </p>
          <button
            type="button"
            onClick={startGame}
            className="py-3 px-8 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mx-auto cursor-pointer transition transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Graphic Race</span>
          </button>
        </div>
      )}

      {/* Racing State */}
      {gameState === 'racing' && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Track</span>
              <span className="font-mono text-rose-400">{Math.floor(trackDistance)}m</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Score</span>
              <span className="font-mono text-emerald-400">{myScore}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Boosts</span>
              <span className="font-mono text-amber-400">⚡ {myBoosts}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Shield</span>
              <span className="font-mono text-sky-400">{myCarRef.current.shield ? '🛡️ ON' : 'OFF'}</span>
            </div>
          </div>

          {/* Graphic Canvas Track */}
          <div className="relative flex justify-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <canvas ref={canvasRef} width={400} height={520} className="block" />
          </div>

          {/* Mobile Touch Controls */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                myCarRef.current.lane = Math.max(0, myCarRef.current.lane - 1);
                sendGameUpdate(myCarRef.current.lane, trackDistance, myScore, myBoosts);
              }}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" /> Left
            </button>
            <button
              type="button"
              onClick={() => {
                if (myBoosts > 0) {
                  setMyBoosts((b) => b - 1);
                  setTrackDistance((d) => Math.min(maxDistance, d + 50));
                  setMyScore((s) => s + 75);
                  sendGameUpdate(myCarRef.current.lane, trackDistance + 50, myScore + 75, myBoosts - 1);
                }
              }}
              className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 font-bold text-sm text-white flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-orange-900/40"
            >
              <Zap className="w-4 h-4" /> Hyper Boost
            </button>
            <button
              type="button"
              onClick={() => {
                myCarRef.current.lane = Math.min(2, myCarRef.current.lane + 1);
                sendGameUpdate(myCarRef.current.lane, trackDistance, myScore, myBoosts);
              }}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md"
            >
              Right <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Finished State */}
      {gameState === 'finished' && (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl mb-2 animate-bounce">🏆</div>
          <h3 className="text-2xl font-bold font-serif text-rose-400">Cyber Race Champion!</h3>
          <p className="text-sm font-bold">
            Winner: <span className="text-emerald-400 text-base">{winner}</span> 🎉
          </p>
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 max-w-xs mx-auto text-xs space-y-2">
            <div className="flex justify-between">
              <span>{currentUserName}:</span>
              <span className="font-bold text-rose-400">{myScore} pts</span>
            </div>
            <div className="flex justify-between">
              <span>{partnerName}:</span>
              <span className="font-bold text-indigo-400">{partnerScore} pts</span>
            </div>
          </div>
          <button
            type="button"
            onClick={startGame}
            className="py-3 px-8 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 mx-auto cursor-pointer transition transform hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Race Again</span>
          </button>
        </div>
      )}
    </div>
  );
};
