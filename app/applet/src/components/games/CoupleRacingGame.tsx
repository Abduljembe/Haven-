import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw, Zap, Heart, ArrowLeft, ArrowRight } from 'lucide-react';
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

  const myCarRef = useRef({ lane: 1, x: 200, y: 450 });
  const partnerCarRef = useRef({ lane: 0, x: 110, y: 450 });
  const obstaclesRef = useRef<Array<{ id: number; lane: number; y: number; type: 'car' | 'heart' | 'boost' }>>([]);
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

  // Handle incoming partner actions
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
    myCarRef.current = { lane: 1, x: 200, y: 450 };
    obstaclesRef.current = [];
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
          setTrackDistance((d) => Math.min(maxDistance, d + 40));
          setMyScore((s) => s + 50);
          sendGameUpdate(myCarRef.current.lane, trackDistance + 40, myScore + 50, myBoosts - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, myBoosts, trackDistance, myScore, sendGameUpdate]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'racing') return;

    let lastSpawn = Date.now();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Road background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(80, 0, 240, canvas.height);

      // Lanes
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(160, 0);
      ctx.lineTo(160, canvas.height);
      ctx.moveTo(240, 0);
      ctx.lineTo(240, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance
      setTrackDistance((prev) => {
        const next = prev + 0.7;
        if (next >= maxDistance) {
          setGameState('finished');
          setWinner(myScore >= partnerScore ? currentUserName : partnerName);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        return Math.min(maxDistance, next);
      });

      // Spawn obstacles
      if (Date.now() - lastSpawn > 1500) {
        lastSpawn = Date.now();
        const lane = Math.floor(Math.random() * 3);
        const type = Math.random() > 0.4 ? 'car' : Math.random() > 0.5 ? 'heart' : 'boost';
        obstaclesRef.current.push({
          id: Date.now(),
          lane,
          y: -50,
          type,
        });
      }

      // Draw obstacles
      ctx.font = '22px sans-serif';
      obstaclesRef.current.forEach((obs) => {
        obs.y += 3.5;
        const obsX = obs.lane === 0 ? 110 : obs.lane === 1 ? 200 : 290;

        if (obs.type === 'car') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(obsX - 16, obs.y, 32, 54);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obsX - 10, obs.y + 8, 20, 12);
        } else if (obs.type === 'heart') {
          ctx.fillText('💖', obsX - 10, obs.y + 28);
        } else {
          ctx.fillText('⚡', obsX - 10, obs.y + 28);
        }

        // Collision
        const myCarX = myCarRef.current.lane === 0 ? 110 : myCarRef.current.lane === 1 ? 200 : 290;
        if (Math.abs(obs.y - 450) < 35 && Math.abs(obsX - myCarX) < 22) {
          if (obs.type === 'car') {
            setTrackDistance((d) => Math.max(0, d - 25));
            setMyScore((s) => Math.max(0, s - 15));
          } else if (obs.type === 'heart') {
            setMyScore((s) => s + 25);
          } else if (obs.type === 'boost') {
            setMyBoosts((b) => b + 1);
          }
          obs.y = 9999;
        }
      });

      obstaclesRef.current = obstaclesRef.current.filter((obs) => obs.y < 600);

      // My car
      const myX = myCarRef.current.lane === 0 ? 110 : myCarRef.current.lane === 1 ? 200 : 290;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(myX - 16, 430, 32, 54);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(myX - 10, 438, 20, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText('You', myX - 12, 502);

      // Partner car
      const partnerX = partnerCarRef.current.lane === 0 ? 110 : partnerCarRef.current.lane === 1 ? 200 : 290;
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(partnerX - 16, 380, 32, 54);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(partnerX - 10, 388, 20, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(partnerName.slice(0, 8), partnerX - 18, 370);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, partnerName, myScore, partnerScore]);

  return (
    <div className={`w-full max-w-lg mx-auto rounded-3xl p-6 border shadow-2xl ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
            🏎️
          </div>
          <div>
            <h2 className="text-base font-bold">Heart Rush Racing</h2>
            <p className="text-xs text-slate-400">Race side-by-side & collect hearts with {partnerName}</p>
          </div>
        </div>
      </div>

      {/* Menu State */}
      {gameState === 'menu' && (
        <div className="text-center py-8 space-y-4">
          <div className="text-5xl mb-2 animate-bounce">🏁</div>
          <h3 className="text-lg font-bold">Ready to Race, {currentUserName}?</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Use Left/Right arrow keys to switch lanes, dodge obstacles, and press Spacebar for turbo boosts!
          </p>
          <button
            type="button"
            onClick={startGame}
            className="py-3 px-8 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mx-auto cursor-pointer transition transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Couple Race</span>
          </button>
        </div>
      )}

      {/* Racing State */}
      {gameState === 'racing' && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Distance</span>
              <span className="font-mono text-rose-400">{Math.floor(trackDistance)}m / {maxDistance}m</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Score</span>
              <span className="font-mono text-emerald-400">{myScore} pts</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">Boosts (Space)</span>
              <span className="font-mono text-amber-400">⚡ {myBoosts}</span>
            </div>
          </div>

          {/* Canvas Track */}
          <div className="relative flex justify-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
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
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Left
            </button>
            <button
              type="button"
              onClick={() => {
                if (myBoosts > 0) {
                  setMyBoosts((b) => b - 1);
                  setTrackDistance((d) => Math.min(maxDistance, d + 40));
                  setMyScore((s) => s + 50);
                  sendGameUpdate(myCarRef.current.lane, trackDistance + 40, myScore + 50, myBoosts - 1);
                }
              }}
              className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-sm text-white flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md shadow-rose-900/40"
            >
              <Zap className="w-4 h-4" /> Boost
            </button>
            <button
              type="button"
              onClick={() => {
                myCarRef.current.lane = Math.min(2, myCarRef.current.lane + 1);
                sendGameUpdate(myCarRef.current.lane, trackDistance, myScore, myBoosts);
              }}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              Right <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Finished State */}
      {gameState === 'finished' && (
        <div className="text-center py-8 space-y-4">
          <div className="text-5xl mb-2 animate-bounce">🏆</div>
          <h3 className="text-xl font-bold font-serif text-rose-400">Race Complete!</h3>
          <p className="text-sm font-bold">
            Winner: <span className="text-emerald-400">{winner}</span> 🎉
          </p>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 max-w-xs mx-auto text-xs space-y-1">
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
