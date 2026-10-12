import React, { useState, useEffect } from 'react';
import {
  X,
  Droplets,
  Sun,
  Scissors,
  Sparkles,
  Heart,
  Calendar,
  Award,
  RefreshCw,
  Plus,
  Bookmark,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playHeartbeatSound, playMessageChime } from '../utils/sounds';
import { triggerHaptic } from '../utils/haptics';

interface WishRibbon {
  id: string;
  author: string;
  text: string;
  color: string;
  createdAt: number;
}

interface BonsaiState {
  points: number;
  level: number;
  hydration: number; // 0-100
  sunlight: number;  // 0-100
  totalWaterings: number;
  lastCared: number;
  wishes: WishRibbon[];
  treeName: string;
}

interface SharedBonsaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userName: string;
  partnerName: string;
  socket?: any;
}

const DEFAULT_STATE: BonsaiState = {
  points: 120,
  level: 2,
  hydration: 85,
  sunlight: 70,
  totalWaterings: 14,
  lastCared: Date.now(),
  treeName: 'Eternal Blossom',
  wishes: [
    {
      id: 'wish-1',
      author: 'Us',
      text: 'To travel the world and always hold hands 💕',
      color: '#f43f5e',
      createdAt: Date.now() - 86400000 * 3,
    },
  ],
};

const STAGES = [
  { level: 1, name: 'Tender Sprout', min: 0, max: 100, icon: '🌱', desc: 'A young shoot planted with love.' },
  { level: 2, name: 'Flourishing Sapling', min: 100, max: 250, icon: '🌿', desc: 'Growing strong through daily connection.' },
  { level: 3, name: 'Cherry Blossom Bonsai', min: 250, max: 450, icon: '🌸', desc: 'Pink petals bloom with affection and laughter.' },
  { level: 4, name: 'Radiant Evergreen', min: 450, max: 700, icon: '🌳', desc: 'Deep roots and resilient golden leaves.' },
  { level: 5, name: 'Celestial Harmony Tree', min: 700, max: 1000, icon: '✨', desc: 'A legendary sanctuary of unconditional bond.' },
];

export const SharedBonsaiModal: React.FC<SharedBonsaiModalProps> = ({
  isOpen,
  onClose,
  roomId,
  userName,
  partnerName,
  socket,
}) => {
  const storageKey = `haven_bonsai_${roomId || 'default'}`;

  const [state, setState] = useState<BonsaiState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  const [animatingAction, setAnimatingAction] = useState<'water' | 'sun' | 'prune' | null>(null);
  const [newWishText, setNewWishText] = useState('');
  const [showAddWish, setShowAddWish] = useState(false);
  const [partnerNotice, setPartnerNotice] = useState<string | null>(null);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, storageKey]);

  // Listen for socket events from partner
  useEffect(() => {
    if (!socket) return;

    const handleSynced = (data: { action: 'water' | 'sunlight' | 'prune' | 'fertilize'; senderName: string; bonsaiState: BonsaiState }) => {
      if (data.bonsaiState) {
        setState(data.bonsaiState);
        setPartnerNotice(`${data.senderName} nurtured the Bonsai with ${data.action}! 🌱`);
        setTimeout(() => setPartnerNotice(null), 4000);
        playMessageChime();
        triggerHaptic('light');
      }
    };

    socket.on('bonsai-synced', handleSynced);
    return () => {
      socket.off('bonsai-synced', handleSynced);
    };
  }, [socket]);

  if (!isOpen) return null;

  const currentStage = STAGES.find((s) => state.points >= s.min && state.points < s.max) || STAGES[STAGES.length - 1];
  const progressPercent = Math.min(
    100,
    Math.round(((state.points - currentStage.min) / (currentStage.max - currentStage.min)) * 100)
  );

  const broadcastState = (newState: BonsaiState, action: 'water' | 'sunlight' | 'prune' | 'fertilize') => {
    setState(newState);
    if (socket && roomId) {
      socket.emit('bonsai-action', {
        roomId,
        action,
        senderName: userName,
        bonsaiState: newState,
      });
    }
  };

  const handleWater = () => {
    setAnimatingAction('water');
    playHeartbeatSound();
    triggerHaptic('success');
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#38bdf8', '#60a5fa', '#3b82f6'],
    });

    const newPoints = state.points + 15;
    const newState: BonsaiState = {
      ...state,
      points: newPoints,
      hydration: Math.min(100, state.hydration + 20),
      totalWaterings: state.totalWaterings + 1,
      lastCared: Date.now(),
    };
    broadcastState(newState, 'water');
    setTimeout(() => setAnimatingAction(null), 1500);
  };

  const handleSunlight = () => {
    setAnimatingAction('sun');
    playMessageChime();
    triggerHaptic('light');
    const newState: BonsaiState = {
      ...state,
      points: state.points + 12,
      sunlight: Math.min(100, state.sunlight + 25),
      lastCared: Date.now(),
    };
    broadcastState(newState, 'sunlight');
    setTimeout(() => setAnimatingAction(null), 1500);
  };

  const handlePrune = () => {
    setAnimatingAction('prune');
    triggerHaptic('light');
    const newState: BonsaiState = {
      ...state,
      points: state.points + 10,
      lastCared: Date.now(),
    };
    broadcastState(newState, 'prune');
    setTimeout(() => setAnimatingAction(null), 1500);
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishText.trim()) return;

    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newWish: WishRibbon = {
      id: `wish-${Date.now()}`,
      author: userName,
      text: newWishText.trim(),
      color: randomColor,
      createdAt: Date.now(),
    };

    const newState: BonsaiState = {
      ...state,
      points: state.points + 25,
      wishes: [newWish, ...state.wishes],
    };

    broadcastState(newState, 'fertilize');
    setNewWishText('');
    setShowAddWish(false);
    confetti({
      particleCount: 50,
      spread: 75,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-xs">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Shared Living Bonsai
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Lvl {currentStage.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evolves & blooms with your daily love and interactions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close Bonsai"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Partner Notification Banner */}
        {partnerNotice && (
          <div className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top-1">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{partnerNotice}</span>
          </div>
        )}

        {/* Main Garden Stage View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Animated Tree Visualizer Canvas Card */}
          <div className="relative rounded-3xl bg-gradient-to-b from-sky-50 via-emerald-50/40 to-amber-50/30 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900 border border-emerald-200/60 dark:border-emerald-900/40 p-6 flex flex-col items-center justify-center min-h-[260px] overflow-hidden shadow-inner">
            {/* Ambient Sunshine Ray */}
            <div className="absolute top-2 right-4 w-28 h-28 rounded-full bg-amber-300/30 blur-2xl animate-pulse pointer-events-none" />

            {/* Falling Water Animation */}
            {animatingAction === 'water' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
                <div className="text-3xl animate-bounce">💧 💧 💧</div>
                <span className="text-xs font-extrabold text-sky-600 bg-white/90 px-3 py-1 rounded-full shadow-md mt-2">
                  +15 Hydration & Growth!
                </span>
              </div>
            )}

            {/* Sunlight Beam Animation */}
            {animatingAction === 'sun' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none animate-in fade-in bg-amber-400/10">
                <div className="text-3xl animate-spin">☀️ ✨ ☀️</div>
                <span className="text-xs font-extrabold text-amber-700 bg-white/90 px-3 py-1 rounded-full shadow-md mt-2">
                  +12 Solar Energy!
                </span>
              </div>
            )}

            {/* Tree SVG Artwork that changes with stage */}
            <div className="relative z-10 flex flex-col items-center select-none">
              <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-300">
                {currentStage.level === 1 && (
                  <svg className="w-32 h-36" viewBox="0 0 100 120" fill="none">
                    <path d="M50 110 V60" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                    <path d="M50 65 Q35 45 40 30 C50 35 55 50 50 65" fill="#22c55e" />
                    <path d="M50 65 Q65 45 60 30 C50 35 45 50 50 65" fill="#16a34a" />
                    {/* Pot */}
                    <path d="M30 110 L35 125 H65 L70 110 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                  </svg>
                )}

                {currentStage.level === 2 && (
                  <svg className="w-36 h-40" viewBox="0 0 120 140" fill="none">
                    <path d="M60 125 C60 90 55 80 50 55 C45 40 40 30 40 30" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />
                    <path d="M55 75 Q75 60 85 45" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="40" cy="30" r="16" fill="#22c55e" opacity="0.9" />
                    <circle cx="85" cy="45" r="14" fill="#16a34a" opacity="0.9" />
                    <circle cx="55" cy="45" r="12" fill="#4ade80" opacity="0.85" />
                    {/* Pot */}
                    <path d="M38 125 L43 140 H77 L82 125 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                  </svg>
                )}

                {currentStage.level >= 3 && (
                  <svg className="w-44 h-48" viewBox="0 0 140 160" fill="none">
                    {/* Bonsai Trunk Curved */}
                    <path d="M70 145 C70 115 50 100 65 75 C80 55 75 40 70 30" stroke="#78350f" strokeWidth="10" strokeLinecap="round" />
                    <path d="M58 95 C40 85 30 70 25 60" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                    <path d="M70 70 C95 65 110 50 115 40" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                    
                    {/* Foliage Clouds */}
                    <circle cx="25" cy="60" r="18" fill={currentStage.level === 3 ? '#f472b6' : '#22c55e'} opacity="0.95" />
                    <circle cx="115" cy="40" r="20" fill={currentStage.level === 3 ? '#ec4899' : '#16a34a'} opacity="0.95" />
                    <circle cx="70" cy="25" r="24" fill={currentStage.level === 3 ? '#fb7185' : '#15803d'} opacity="0.95" />
                    <circle cx="60" cy="38" r="16" fill={currentStage.level === 3 ? '#fbcfe8' : '#86efac'} opacity="0.9" />

                    {/* Pot */}
                    <rect x="40" y="145" width="60" height="12" rx="4" fill="#92400e" stroke="#78350f" strokeWidth="2" />
                  </svg>
                )}
              </div>

              {/* Tree Title & Stage */}
              <div className="mt-3 text-center">
                <span className="text-base font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-1.5">
                  <span>{currentStage.icon}</span>
                  <span>{currentStage.name}</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
                  {currentStage.desc}
                </p>
              </div>
            </div>

            {/* Growth Level Bar */}
            <div className="w-full mt-4 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-emerald-100 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">Growth Progress</span>
                <span className="text-emerald-600 dark:text-emerald-400">{state.points} / {currentStage.max} PTS ({progressPercent}%)</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Care Action Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              id="btn-bonsai-water"
              onClick={handleWater}
              className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800 text-sky-800 dark:text-sky-300 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs mb-1">
                <Droplets className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xs font-bold">Water</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400">+15 Pts</span>
            </button>

            <button
              type="button"
              id="btn-bonsai-sunlight"
              onClick={handleSunlight}
              className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs mb-1">
                <Sun className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xs font-bold">Sunlight</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">+12 Pts</span>
            </button>

            <button
              type="button"
              id="btn-bonsai-prune"
              onClick={handlePrune}
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs mb-1">
                <Scissors className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">Prune</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">+10 Pts</span>
            </button>
          </div>

          {/* Vitals Stats Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-500" /> Hydration
              </span>
              <span className="font-extrabold text-slate-800 dark:text-white">{state.hydration}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" /> Total Care
              </span>
              <span className="font-extrabold text-slate-800 dark:text-white">{state.totalWaterings} Times</span>
            </div>
          </div>

          {/* Wish Ribbons Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-rose-500" />
                <span>Branch Wish Ribbons ({state.wishes.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddWish(!showAddWish)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tie Wish Ribbon</span>
              </button>
            </div>

            {/* Tie New Wish Ribbon Form */}
            {showAddWish && (
              <form onSubmit={handleAddWish} className="mb-3 p-3 bg-emerald-50/60 dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-slate-700 animate-in fade-in">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tie a secret couple promise or wish to the Bonsai:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWishText}
                    onChange={(e) => setNewWishText(e.target.value)}
                    placeholder="e.g., Trip to Japan together next spring..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Tie Ribbon
                  </button>
                </div>
              </form>
            )}

            {/* Wish Ribbons List */}
            <div className="space-y-1.5">
              {state.wishes.map((w) => (
                <div
                  key={w.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: w.color }}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      "{w.text}"
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-mono">
                    by {w.author}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          Nurtured with love by {userName} & {partnerName}
        </div>
      </div>
    </div>
  );
};
