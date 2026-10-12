import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Heart,
  Send,
  RefreshCw,
  Gift,
  Check,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playHeartbeatSound, playMessageChime } from '../utils/sounds';
import { triggerHaptic } from '../utils/haptics';

interface LoveCouponPreset {
  id: string;
  title: string;
  category: string;
  icon: string;
  tagline: string;
}

const PRESET_COUPONS: LoveCouponPreset[] = [
  { id: 'c1', title: 'Breakfast in Bed + Fresh Coffee', category: 'Morning Treat', icon: '🥐', tagline: 'Served warm with extra hugs' },
  { id: 'c2', title: '30-Minute Relaxing Body Massage', category: 'Intimacy', icon: '💆', tagline: 'Aromatherapy oil included' },
  { id: 'c3', title: 'Movie Night Veto Pass', category: 'Entertainment', icon: '🎬', tagline: 'Pick whatever you want with zero complaints' },
  { id: 'c4', title: 'Get Out of Doing Dishes Free Pass', category: 'Chore Pass', icon: '🍽️', tagline: 'I will handle the entire kitchen tonight' },
  { id: 'c5', title: 'Midnight Ice Cream / Sweet Run', category: 'Spontaneous', icon: '🍦', tagline: 'Any craving, anytime of night' },
  { id: 'c6', title: 'One Absolute Unconditional Yes Wish', category: 'Golden Wish', icon: '🌟', tagline: 'Redeemable for any favor or request' },
  { id: 'c7', title: 'Candlelight Dinner Cooked for You', category: 'Chef Special', icon: '🍷', tagline: 'Your favorite meal prepared with love' },
  { id: 'c8', title: 'Warm Bubble Bath & Foot Rub Night', category: 'Pampering', icon: '🛁', tagline: 'Pure luxury, soft music & rest' },
];

interface ScratchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userName: string;
  partnerName: string;
  socket?: any;
}

export const ScratchCardModal: React.FC<ScratchCardModalProps> = ({
  isOpen,
  onClose,
  roomId,
  userName,
  partnerName,
  socket,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'scratch' | 'create'>('scratch');

  // Scratch State
  const [cardText, setCardText] = useState('Breakfast in Bed + Fresh Coffee 🥐☕');
  const [cardCategory, setCardCategory] = useState('Love Coupon');
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const isDrawingRef = useRef(false);

  // Custom Creation State
  const [customText, setCustomText] = useState('');
  const [customCategory, setCustomCategory] = useState('Secret Note');
  const [sentNotice, setSentNotice] = useState(false);

  // Initialize Canvas with silver/metallic scratch foil
  const initFoilCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = canvas.offsetWidth || 340;
    const height = canvas.offsetHeight || 180;
    canvas.width = width;
    canvas.height = height;

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Draw Shimmering Silver-Rose Foil
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#cbd5e1');
    grad.addColorStop(0.3, '#f1f5f9');
    grad.addColorStop(0.5, '#e2e8f0');
    grad.addColorStop(0.7, '#f8fafc');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative sparkles & text on foil
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ RUB WITH FINGER TO SCRATCH ✨', width / 2, height / 2 - 8);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Scratch to reveal your surprise', width / 2, height / 2 + 16);

    setIsScratched(false);
    setScratchPercent(0);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'scratch') {
      setTimeout(() => initFoilCanvas(), 100);
    }
  }, [isOpen, activeTab, cardText]);

  // Listen for received scratch cards from partner
  useEffect(() => {
    if (!socket) return;

    const handleReceived = (data: { card: { text: string; category: string; senderName: string } }) => {
      if (data.card) {
        setCardText(data.card.text);
        setCardCategory(data.card.category || 'Surprise from Partner');
        setActiveTab('scratch');
        setTimeout(() => initFoilCanvas(), 150);
        playHeartbeatSound();
        triggerHaptic('success');
      }
    };

    socket.on('scratch-card-received', handleReceived);
    return () => {
      socket.off('scratch-card-received', handleReceived);
    };
  }, [socket]);

  if (!isOpen) return null;

  // Scratch Action Handling
  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    triggerHaptic('light');

    // Sample percentage scratched every 10 scratches
    if (Math.random() < 0.25) {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let clearPixels = 0;
        const total = imgData.data.length / 4;
        for (let i = 3; i < imgData.data.length; i += 16) {
          if (imgData.data[i] === 0) clearPixels++;
        }
        const pct = Math.round((clearPixels / (total / 4)) * 100);
        setScratchPercent(pct);

        if (pct >= 45 && !isScratched) {
          setIsScratched(true);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          playHeartbeatSound();
          triggerHaptic('success');
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#f43f5e', '#ec4899', '#f59e0b', '#3b82f6'],
          });
        }
      } catch {
        // ignore
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    scratchAt(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    scratchAt(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleSendCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const payload = {
      text: customText.trim(),
      category: customCategory,
      senderName: userName,
    };

    if (socket && roomId) {
      socket.emit('scratch-card-send', {
        roomId,
        card: payload,
      });
    }

    setCardText(payload.text);
    setCardCategory(payload.category);
    setCustomText('');
    setSentNotice(true);
    setTimeout(() => setSentNotice(false), 3000);
    setActiveTab('scratch');
    setTimeout(() => initFoilCanvas(), 150);
    triggerHaptic('success');
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  };

  const handleSelectPreset = (preset: LoveCouponPreset) => {
    setCardText(`${preset.title} ${preset.icon}`);
    setCardCategory(preset.category);
    setActiveTab('scratch');
    setTimeout(() => initFoilCanvas(), 150);

    if (socket && roomId) {
      socket.emit('scratch-card-send', {
        roomId,
        card: {
          text: `${preset.title} ${preset.icon}`,
          category: preset.category,
          senderName: userName,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-xs">
              🎟️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Scratch-Off Love Coupons
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Surprise Card
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rub to reveal secret love passes & hidden romantic notes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close Scratch Cards"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('scratch')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'scratch'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Scratch & Reveal</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Send New Coupon / Note</span>
          </button>
        </div>

        {/* Tab 1: Scratch & Reveal Arena */}
        {activeTab === 'scratch' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                {cardCategory}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Use your finger or mouse to scratch off the foil below:
              </p>
            </div>

            {/* The Scratch-Off Card Container */}
            <div className="relative w-full max-w-sm h-48 sm:h-52 rounded-3xl overflow-hidden border-2 border-amber-300 dark:border-amber-700/60 shadow-xl bg-gradient-to-tr from-amber-50 via-rose-50 to-pink-50 dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-850 p-6 flex flex-col items-center justify-center text-center select-none">
              {/* Revealed Secret Underneath */}
              <div className="flex flex-col items-center justify-center space-y-2 p-2 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center text-2xl shadow-md">
                  💌
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {cardText}
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {isScratched ? '🎉 REDEEMED COUPON' : 'Hidden Secret'}
                </span>
              </div>

              {/* Shimmering Canvas Foil Layer on Top */}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10"
              />
            </div>

            {/* Scratch Status & Reset */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                Scratched: <strong className="text-amber-600">{scratchPercent}%</strong>
              </span>

              <button
                type="button"
                id="btn-scratch-reset"
                onClick={initFoilCanvas}
                className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-foil Card</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Create & Send Love Coupon or Note */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {sentNotice && (
              <div className="p-3 bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Scratch Card sent to {partnerName}! 💌</span>
              </div>
            )}

            {/* Quick Pick Preset Coupons */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Instant Love Coupon Presets (Tap to send):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_COUPONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-2.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-amber-200/80 dark:border-slate-700 text-left transition active:scale-[0.98] cursor-pointer flex items-center gap-2.5 group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {preset.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                        {preset.title}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {preset.tagline}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Secret Note Form */}
            <form onSubmit={handleSendCustomCard} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Or Write a Custom Secret Scratch Note:
              </span>

              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Category (e.g. Sweet Surprise, Secret Promise)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type your secret surprise note here..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                maxLength={180}
              />

              <button
                type="submit"
                disabled={!customText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 disabled:opacity-40 text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Foil Scratch Card</span>
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
          Scratched in real time with haptics & secret reveal
        </div>
      </div>
    </div>
  );
};
