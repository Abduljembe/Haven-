import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  KeyRound,
  Sparkles,
  User,
  Users,
  Calendar,
  ArrowRight,
  Lock,
  PartyPopper,
  Gamepad2,
  Share2,
  Copy,
  Check,
  Dice5,
  RefreshCw,
  X,
  Mail,
  Sliders,
  Smartphone,
  Clock,
  Zap,
  Sun,
  Moon,
  Headphones,
} from 'lucide-react';
import { CoupleSpaceConfig, SpaceType } from '../types';
import { generateRandomPasskey } from '../utils/crypto';
import { AvatarPicker } from './AvatarPicker';
import { DEFAULT_AVATARS } from '../utils/avatarUtils';
import { HavenLogo } from './HavenLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { trackUserProfile } from '../utils/authService';
import { ColorMode, getSavedColorMode, saveColorMode } from '../utils/theme';

const generateUniqueRoomCode = (type: SpaceType) => {
  const coupleAdjectives = ['lovers', 'serene', 'velvet', 'aurora', 'cosmic', 'forever', 'tender', 'golden', 'eternal', 'starlight'];
  const coupleNouns = ['sanctuary', 'haven', 'oasis', 'nest', 'bloom', 'harbor', 'retreat', 'cove', 'heart', 'isle'];
  
  const squadAdjectives = ['squad', 'nexus', 'chaos', 'vibes', 'gamers', 'chill', 'hype', 'galaxy', 'epic', 'alpha'];
  const squadNouns = ['hangout', 'lounge', 'circle', 'hq', 'zone', 'hub', 'crew', 'den', 'party', 'room'];

  const adjs = type === 'friends' ? squadAdjectives : coupleAdjectives;
  const nouns = type === 'friends' ? squadNouns : coupleNouns;
  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
};

interface SetupSpaceModalProps {
  onComplete: (config: CoupleSpaceConfig) => void;
  initialError?: string | null;
  onOpenSingles?: () => void;
  onClose?: () => void;
  initialMode?: 'create' | 'join';
  initialSpaceType?: SpaceType;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const SetupSpaceModal: React.FC<SetupSpaceModalProps> = ({ 
  onComplete, 
  initialError, 
  onOpenSingles,
  onClose,
  initialMode = 'create',
  initialSpaceType = 'couple',
  onOpenAuth,
}) => {
  const [spaceType, setSpaceType] = useState<SpaceType>(initialSpaceType);
  const [mode, setMode] = useState<'create' | 'join'>(initialMode);
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('🎉');
  const [roomId, setRoomId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState(DEFAULT_AVATARS[0]);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState(DEFAULT_AVATARS[1]);
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [autoDeleteTimer, setAutoDeleteTimer] = useState<number>(0);
  const [tabletCleanChat, setTabletCleanChat] = useState<boolean>(true);
  const [roomColorMode, setRoomColorMode] = useState<ColorMode>(() => getSavedColorMode());
  const [error, setError] = useState(initialError || '');
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // Check URL params for pre-filled room and key
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      const urlKey = params.get('key');
      const urlType = params.get('type') as SpaceType | null;
      const urlAnniversary = params.get('since');
      const urlGroupName = params.get('group');
      const urlMode = params.get('mode');

      if (urlMode === 'singles' && onOpenSingles) {
        onOpenSingles();
      }

      if (urlRoom) {
        setRoomId(urlRoom);
        setMode('join');
      } else {
        setRoomId(generateUniqueRoomCode('couple'));
      }

      if (urlKey) {
        setPasskey(urlKey);
      } else {
        setPasskey(generateRandomPasskey());
      }

      if (urlAnniversary) {
        setAnniversaryDate(urlAnniversary);
      }
    } catch {
      setRoomId(generateUniqueRoomCode('couple'));
      setPasskey(generateRandomPasskey());
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Please enter your name or nickname');
      return;
    }
    if (!roomId.trim()) {
      setError('Please provide a Room ID');
      return;
    }
    if (!passkey.trim()) {
      setError('Please provide an encryption secret passkey');
      return;
    }

    const defaultPartnerName =
      spaceType === 'friends'
        ? groupName.trim() || 'Squad Members'
        : mode === 'create'
        ? 'My Love'
        : 'Partner';

    const config: CoupleSpaceConfig = {
      roomId: roomId.trim().toLowerCase(),
      passkey: passkey.trim(),
      spaceType,
      groupName: spaceType === 'friends' ? groupName.trim() || 'Besties Squad' : undefined,
      groupEmoji: spaceType === 'friends' ? groupEmoji : '💖',
      userRole: mode === 'create' ? 'partner1' : 'partner2',
      userName: userName.trim(),
      userAvatar: userAvatar,
      partnerName: partnerName.trim() || defaultPartnerName,
      partnerAvatar: partnerAvatar,
      anniversaryDate: anniversaryDate || undefined,
      autoDeleteTimer: autoDeleteTimer,
      tabletCleanChat: tabletCleanChat,
      isVerified: false,
    };

    // Save to local storage for quick reconnection
    try {
      saveColorMode(roomColorMode);
      localStorage.setItem('haven_couple_config', JSON.stringify(config));
      const savedUserId = localStorage.getItem('haven_user_id') || `user-${Date.now()}`;
      trackUserProfile({
        id: savedUserId,
        name: config.userName,
        avatar: config.userAvatar,
        spaceId: config.roomId,
      });
    } catch {
      // ignore
    }

    onComplete(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div
        id="setup-space-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Header Visual */}
        <div className="relative px-6 pt-7 pb-6 text-white text-center overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10 blur-lg pointer-events-none" />

          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner mb-3">
            <HavenLogo
              size="lg"
              variant="couple"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight font-serif">
            Haven Spouse Sanctuary
          </h1>
          <p className="text-rose-100 text-sm mt-1 max-w-xs mx-auto">
            Your private sanctuary for encrypted chats, HD video calls, and romantic rituals.
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-rose-100 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Client-Side End-to-End Encrypted (AES-256-GCM)</span>
          </div>
        </div>

        {onOpenAuth && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-rose-500" />
              <span>Have an account or spouse invite?</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              Sign In with Email &rarr;
            </button>
          </div>
        )}

        {/* Sanctuary Destination Selector (Spouse Sanctuary vs Singles Sanctuary) */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Choose Sanctuary Destination
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                id="btn-select-couple-mode"
                onClick={() => {
                  setSpaceType('couple');
                  if (mode === 'create') setRoomId(generateUniqueRoomCode('couple'));
                }}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  spaceType === 'couple'
                    ? 'bg-white text-rose-600 shadow-sm border border-rose-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>Spouse Sanctuary</span>
              </button>
              <button
                type="button"
                id="btn-select-singles-mode"
                onClick={() => {
                  if (onOpenSingles) {
                    onOpenSingles();
                    if (onClose) onClose();
                  }
                }}
                className="py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 text-purple-700 hover:text-purple-900 border border-purple-200/60 shadow-xs hover:bg-white"
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Singles Lounge ✨</span>
              </button>
            </div>
            <p className="text-[11px] text-rose-700 bg-rose-50/90 border border-rose-200/70 rounded-xl p-2.5 mt-2.5 text-center font-medium">
              ❤️ <strong>Spouse Sanctuary:</strong> 1-on-1 private end-to-end encrypted space for you & your partner. All your friends and squad groups remain accessible inside the WhatsApp chat view!
            </p>
          </div>

          {/* Tab Toggle: Create vs Join */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-5">
            <button
              id="tab-create-space"
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'create'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create New Space
            </button>
            <button
              id="tab-join-space"
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'join'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Join Partner's Space
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            {/* User Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Nickname
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-user-name"
                  type="text"
                  required
                  placeholder="e.g. Alex, Sam, Jordan"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Avatar Picker */}
            <AvatarPicker
              label="Your Profile Photo / Avatar"
              idPrefix="setup-user"
              currentAvatar={userAvatar}
              onChange={(newAvatar) => setUserAvatar(newAvatar)}
            />

            {/* Partner Name (Only if Couple Space) */}
            {spaceType === 'couple' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Partner's Name / Pet Name (Optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="input-partner-name"
                    type="text"
                    placeholder="e.g. Maya, My Queen, Sweetheart"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Space ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Room Code / ID
                </label>
                <button
                  type="button"
                  onClick={() => setRoomId(generateUniqueRoomCode(spaceType))}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer flex items-center gap-1"
                  title="Generate a memorable unique room code"
                >
                  <Dice5 className="w-3.5 h-3.5" />
                  <span>Roll Unique Code</span>
                </button>
              </div>
              <div className="relative">
                <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-room-id"
                  type="text"
                  required
                  placeholder="e.g. lovers-haven-7489"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {spaceType === 'friends'
                  ? 'Anyone with this unique Room Code & Passkey can join your Squad room anytime!'
                  : 'Share this unique Room Code with your partner so they can join your forever sanctuary.'}
              </p>
            </div>

            {/* Secret Passkey (Encryption Key) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Secret Room Passkey (E2EE Key)
                </label>
                <button
                  type="button"
                  onClick={() => setPasskey(generateRandomPasskey())}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Generate New
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-passkey"
                  type="text"
                  required
                  placeholder="e.g. secret-squad-pass-777"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>
              <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-amber-50/70 border border-amber-100 rounded-lg text-[11px] text-amber-800">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  This passkey is used on client devices to encrypt all chat messages, drawings, and media.
                </span>
              </div>
            </div>

            {/* Instant Invite Link & Share Card */}
            {roomId.trim() && passkey.trim() && (
              <div className="p-3 bg-gradient-to-r from-rose-50/80 via-purple-50/50 to-indigo-50/80 border border-rose-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Instant Space Invite Link</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Indefinite Storage 🟢
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?room=${encodeURIComponent(roomId)}&key=${encodeURIComponent(passkey)}&type=${spaceType}`}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const origin = window.location.origin;
                      const url = `${origin}/?room=${encodeURIComponent(roomId)}&key=${encodeURIComponent(passkey)}&type=${spaceType}`;
                      const text = spaceType === 'friends'
                        ? `Join our Squad Room! Room Code: #${roomId}\n${url}`
                        : `Join our private Sanctuary space! Room Code: #${roomId}\n${url}`;

                      if (navigator.share) {
                        try {
                          await navigator.share({ title: `Haven #${roomId}`, text, url });
                          return;
                        } catch {
                          // fallback
                        }
                      }
                      try {
                        await navigator.clipboard.writeText(url);
                        setCopiedInviteLink(true);
                        setTimeout(() => setCopiedInviteLink(false), 2500);
                      } catch {
                        // ignore
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                      copiedInviteLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-rose-600'
                    }`}
                  >
                    {copiedInviteLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Send this link to someone or give them the Room Code <strong>#{roomId}</strong>. All messages and media remain preserved indefinitely until mutual permanent deletion.
                </p>
              </div>
            )}

            {/* Anniversary Date (Optional for Couples) */}
            {spaceType === 'couple' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Relationship Start Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="input-anniversary-date"
                    type="date"
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Room Features & Tablet Display Settings */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>Room Features & Tablet Setup</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                  Tablet Ready
                </span>
              </div>

              {/* Room Lighting & Appearance (Light vs Dark Mode) */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  {roomColorMode === 'dark' ? (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Room Lighting Mode
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Default appearance for your space
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRoomColorMode('light')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roomColorMode === 'light'
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomColorMode('dark')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roomColorMode === 'dark'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Moon className="w-3 h-3 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* Tablet Spacious Chat Mode Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Tablet Spacious Chat Mode
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Creates maximum room for messages and comfortable on-screen typing on tablets.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTabletCleanChat(!tabletCleanChat)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    tabletCleanChat ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  title="Toggle Tablet Spacious Chat Mode"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      tabletCleanChat ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Disappearing Messages Initial Setting */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Disappearing Messages
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Auto-destruct messages after timer
                    </span>
                  </div>
                </div>
                <select
                  value={autoDeleteTimer}
                  onChange={(e) => setAutoDeleteTimer(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-rose-400"
                >
                  <option value={0}>Off (Forever)</option>
                  <option value={30}>30 Seconds</option>
                  <option value={300}>5 Minutes</option>
                  <option value={3600}>1 Hour</option>
                  <option value={86400}>24 Hours</option>
                </select>
              </div>

              {/* Room Feature Highlights */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Features enabled in this room (accessible in Feature Settings):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-medium">
                    <PartyPopper className="w-3 h-3 text-amber-600" /> Confetti Cannon
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-medium">
                    <Zap className="w-3 h-3 text-rose-600" /> Love Buzz
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-medium">
                    🎵 Spotify DJ
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[10px] font-medium">
                    🍿 Watch Party
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-medium">
                    <Gamepad2 className="w-3 h-3 text-indigo-600" /> Games Arena
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-enter-space"
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl text-white font-semibold text-sm shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 shadow-rose-500/25 hover:shadow-rose-500/40"
              >
                <span>
                  {mode === 'create'
                    ? 'Create & Enter Our Spouse Sanctuary'
                    : 'Connect to Our Spouse Sanctuary'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Install App helper button */}
              <div className="pt-2">
                <PWAInstallButton variant="full" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
