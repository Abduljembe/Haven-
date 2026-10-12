import React, { useState, useEffect } from 'react';
import {
  X,
  Swords,
  Sparkles,
  Heart,
  Lock,
  Unlock,
  ArrowRight,
  RefreshCw,
  Trophy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playHeartbeatSound, playMessageChime } from '../utils/sounds';
import { triggerHaptic } from '../utils/haptics';

interface DilemmaQuestion {
  id: number;
  category: 'cozy' | 'spicy' | 'wild' | 'future';
  optionA: { text: string; icon: string };
  optionB: { text: string; icon: string };
  tag: string;
}

const DILEMMAS: DilemmaQuestion[] = [
  {
    id: 1,
    category: 'cozy',
    optionA: { text: 'Rainy cabin getaway with blankets & hot cocoa', icon: '🌧️' },
    optionB: { text: 'Sunny tropical beach villa with cocktails', icon: '🏖️' },
    tag: 'Vacation Vibe',
  },
  {
    id: 2,
    category: 'cozy',
    optionA: { text: 'Cook a 3-course dinner together from scratch', icon: '🍝' },
    optionB: { text: 'Order gourmet takeout and binge-watch in bed', icon: '🍕' },
    tag: 'Date Night',
  },
  {
    id: 3,
    category: 'spicy',
    optionA: { text: '1 hour uninterrupted deep foot & back massage', icon: '💆' },
    optionB: { text: 'Late-night rooftop champagne & slow dance', icon: '🥂' },
    tag: 'Romance',
  },
  {
    id: 4,
    category: 'wild',
    optionA: { text: 'Spontaneous midnight road trip to nowhere', icon: '🚗' },
    optionB: { text: 'Theme park rollercoasters all day until midnight', icon: '🎢' },
    tag: 'Adrenaline',
  },
  {
    id: 5,
    category: 'future',
    optionA: { text: 'Modern minimalist penthouse in a bustling city', icon: '🏙️' },
    optionB: { text: 'Cottage in the hills with a golden retriever & garden', icon: '🏡' },
    tag: 'Dream Home',
  },
  {
    id: 6,
    category: 'spicy',
    optionA: { text: 'Always read each other’s unspoken thoughts', icon: '🔮' },
    optionB: { text: 'Always feel each other’s physical touch from miles away', icon: '⚡' },
    tag: 'Superpower',
  },
  {
    id: 7,
    category: 'cozy',
    optionA: { text: 'Morning coffee & quiet sunrise kisses', icon: '☕' },
    optionB: { text: 'Late midnight whispers & falling asleep tangled', icon: '🌙' },
    tag: 'Rituals',
  },
  {
    id: 8,
    category: 'wild',
    optionA: { text: 'Get matching secret minimalist tattoos', icon: '✨' },
    optionB: { text: 'Skydiving together over the ocean', icon: '🪂' },
    tag: 'Crazy Dare',
  },
  {
    id: 9,
    category: 'cozy',
    optionA: { text: 'Adopt two cuddly kittens together', icon: '🐱' },
    optionB: { text: 'Adopt an energetic playful puppy together', icon: '🐶' },
    tag: 'Pet Life',
  },
  {
    id: 10,
    category: 'future',
    optionA: { text: 'Travel to 20 different countries together', icon: '✈️' },
    optionB: { text: 'Build a personalized dream sanctuary together', icon: '🏰' },
    tag: 'Bucket List',
  },
];

interface BlindDilemmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
  userName: string;
  partnerName: string;
  socket?: any;
}

export const BlindDilemmaModal: React.FC<BlindDilemmaModalProps> = ({
  isOpen,
  onClose,
  roomId,
  userId,
  userName,
  partnerName,
  socket,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myChoice, setMyChoice] = useState<'A' | 'B' | null>(null);
  const [partnerChoice, setPartnerChoice] = useState<'A' | 'B' | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const question = DILEMMAS[currentIndex % DILEMMAS.length];

  // Listen for partner answers
  useEffect(() => {
    if (!socket) return;

    const handleDilemmaUpdate = (data: { action: 'answer' | 'next'; questionId: number; answerIndex?: number; senderId: string; senderName: string }) => {
      if (data.action === 'answer' && data.senderId !== userId) {
        setPartnerChoice(data.answerIndex === 0 ? 'A' : 'B');
        playMessageChime();
        triggerHaptic('light');
      } else if (data.action === 'next') {
        setCurrentIndex((prev) => (prev + 1) % DILEMMAS.length);
        setMyChoice(null);
        setPartnerChoice(null);
        setIsRevealed(false);
      }
    };

    socket.on('dilemma-update', handleDilemmaUpdate);
    return () => {
      socket.off('dilemma-update', handleDilemmaUpdate);
    };
  }, [socket, userId]);

  // Reveal when both answer
  useEffect(() => {
    if (myChoice && partnerChoice && !isRevealed) {
      setIsRevealed(true);
      setTotalAnswered((prev) => prev + 1);

      if (myChoice === partnerChoice) {
        setMatchScore((prev) => prev + 1);
        playHeartbeatSound();
        triggerHaptic('success');
        confetti({
          particleCount: 60,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#ec4899', '#f59e0b', '#10b981'],
        });
      } else {
        triggerHaptic('buzz');
      }
    }
  }, [myChoice, partnerChoice, isRevealed]);

  if (!isOpen) return null;

  const handleSelect = (choice: 'A' | 'B') => {
    if (myChoice) return; // already picked
    setMyChoice(choice);
    playMessageChime();
    triggerHaptic('light');

    if (socket && roomId) {
      socket.emit('dilemma-action', {
        roomId,
        action: 'answer',
        questionId: question.id,
        answerIndex: choice === 'A' ? 0 : 1,
        senderId: userId,
        senderName: userName,
      });
    }
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % DILEMMAS.length;
    setCurrentIndex(nextIdx);
    setMyChoice(null);
    setPartnerChoice(null);
    setIsRevealed(false);

    if (socket && roomId) {
      socket.emit('dilemma-action', {
        roomId,
        action: 'next',
        questionId: DILEMMAS[nextIdx].id,
        senderId: userId,
        senderName: userName,
      });
    }
  };

  const isMatched = myChoice && partnerChoice && myChoice === partnerChoice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-purple-500/30 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-xs">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Blind Match Dilemmas
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Quiz #{currentIndex + 1}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Picks are secret until both choose, then revealed together!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close Dilemmas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Streak Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Matches: <span className="text-emerald-600 dark:text-emerald-400">{matchScore}</span> / {totalAnswered}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            {question.tag}
          </span>
        </div>

        {/* Dilemma Question & Choice Arena */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="text-center mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Would You Rather...
            </span>
          </div>

          {/* Option A */}
          <button
            type="button"
            id="btn-dilemma-option-a"
            onClick={() => handleSelect('A')}
            disabled={myChoice !== null}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 group active:scale-[0.98] ${
              myChoice === 'A'
                ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 shadow-md ring-2 ring-purple-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-purple-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-2xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {question.optionA.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Option A
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {question.optionA.text}
              </p>
            </div>
            {myChoice === 'A' && (
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs shadow-xs shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </button>

          <div className="text-center font-bold text-xs uppercase text-slate-400 py-0.5">
            — OR —
          </div>

          {/* Option B */}
          <button
            type="button"
            id="btn-dilemma-option-b"
            onClick={() => handleSelect('B')}
            disabled={myChoice !== null}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 group active:scale-[0.98] ${
              myChoice === 'B'
                ? 'border-pink-500 bg-pink-50/80 dark:bg-pink-950/40 shadow-md ring-2 ring-pink-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-pink-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-100 dark:bg-pink-950 text-2xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {question.optionB.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">
                Option B
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {question.optionB.text}
              </p>
            </div>
            {myChoice === 'B' && (
              <span className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs shadow-xs shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </button>

          {/* Lock / Waiting Status Banner */}
          {!isRevealed && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-slate-600 dark:text-slate-300">
                  {!myChoice
                    ? 'Make your secret pick above...'
                    : partnerChoice
                    ? 'Both picked! Revealing choices...'
                    : `Waiting for ${partnerName} to pick... ⏳`}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {myChoice ? 'You: Locked' : 'You: Pending'}
              </span>
            </div>
          )}

          {/* Reveal Result Banner */}
          {isRevealed && (
            <div
              className={`p-4 rounded-2xl border text-center animate-in zoom-in-95 duration-300 ${
                isMatched
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                  : 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
              }`}
            >
              <div className="text-3xl mb-1">
                {isMatched ? '🎉 💖 🎉' : '⚖️ 🤝 ⚖️'}
              </div>
              <h3 className="text-base font-extrabold mb-1">
                {isMatched ? '100% Soulmate Match!' : 'Opposites Attract!'}
              </h3>
              <p className="text-xs opacity-90">
                {isMatched
                  ? `You both picked Option ${myChoice}! Your minds think as one.`
                  : `You picked Option ${myChoice} and ${partnerName} picked Option ${partnerChoice}! Variety is the spice of life.`}
              </p>

              <button
                type="button"
                id="btn-dilemma-next"
                onClick={handleNext}
                className="mt-3.5 py-2 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold shadow-md transition active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next Dilemma</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
          Syncs secretly in real time across your space
        </div>
      </div>
    </div>
  );
};
