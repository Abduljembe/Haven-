import { useState, useEffect, useRef, useCallback } from 'react';
import { playVoiceWakeChime, playVoiceSuccessChime } from '../utils/sounds';

export interface VoiceCommandAction {
  type:
    | 'play_music'
    | 'play_video'
    | 'pause'
    | 'resume'
    | 'next'
    | 'previous'
    | 'volume_up'
    | 'volume_down'
    | 'mute'
    | 'unmute'
    | 'search';
  query?: string;
  rawText: string;
}

export interface UseHavenVoiceAssistantOptions {
  context: 'music' | 'watch' | 'global';
  onPlayQuery?: (query: string, rawText: string) => void | Promise<void>;
  onPlayVideoQuery?: (query: string, rawText: string) => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  onPrevious?: () => void | Promise<void>;
  onVolumeUp?: () => void | Promise<void>;
  onVolumeDown?: () => void | Promise<void>;
  onMute?: () => void | Promise<void>;
  onUnmute?: () => void | Promise<void>;
  enableSpeechFeedback?: boolean;
}

/**
 * Text-to-speech assistant feedback helper (Alexa/Siri style voice)
 * Returns a Promise that resolves when speaking is fully finished or timed out.
 */
export function speakAssistantFeedback(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const friendlyVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Siri') ||
            v.name.includes('Karen') ||
            v.name.includes('Alex'))
      );
      if (friendlyVoice) {
        utterance.voice = friendlyVoice;
      }

      // Safety timeout: some mobile/browser engines fail to fire onend
      const estimatedDurationMs = Math.max(1600, text.split(' ').length * 400 + 800);
      let isSettled = false;

      const handleDone = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(fallbackTimer);
          resolve();
        }
      };

      const fallbackTimer = setTimeout(handleDone, estimatedDurationMs);
      utterance.onend = handleDone;
      utterance.onerror = handleDone;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      resolve();
    }
  });
}

export function useHavenVoiceAssistant(options: UseHavenVoiceAssistantOptions) {
  const {
    context,
    onPlayQuery,
    onPlayVideoQuery,
    onPause,
    onResume,
    onNext,
    onPrevious,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onUnmute,
    enableSpeechFeedback = true,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [assistantStatus, setAssistantStatus] = useState<
    'idle' | 'listening' | 'processing' | 'speaking' | 'cooldown'
  >('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Core synchronization refs to prevent race conditions and self-echo
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const clearNoticeTimerRef = useRef<any>(null);
  const actionCooldownRef = useRef<number>(0);
  const isBusyRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isHandsFreeRef = useRef<boolean>(false);
  const lastSpokenMessageRef = useRef<string>('');

  // Keep isHandsFreeRef in sync with state
  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechClass));
    }
  }, []);

  /**
   * Safely pauses recognition while assistant is speaking to avoid hearing its own speech
   */
  const pauseListeningForSpeech = useCallback(() => {
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setIsListening(false);
  }, []);

  /**
   * Resumes recognition once assistant finishes speaking, with an echo-suppression delay
   */
  const resumeListeningAfterSpeech = useCallback(() => {
    isSpeakingRef.current = false;
    setIsSpeaking(false);

    // Give 450ms for room acoustics / speaker reverb to fade before listening
    setTimeout(() => {
      if (isHandsFreeRef.current && !isBusyRef.current && !isSpeakingRef.current) {
        startListeningInstance();
      }
    }, 450);
  }, []);

  /**
   * Speak feedback to user and WAIT until fully finished before returning
   */
  const speakAndWait = useCallback(
    async (msg: string) => {
      setLastActionMessage(msg);
      lastSpokenMessageRef.current = msg.toLowerCase();

      if (clearNoticeTimerRef.current) clearTimeout(clearNoticeTimerRef.current);
      clearNoticeTimerRef.current = setTimeout(() => {
        setLastActionMessage(null);
      }, 5000);

      if (!enableSpeechFeedback) return;

      pauseListeningForSpeech();
      try {
        await speakAssistantFeedback(msg);
      } finally {
        resumeListeningAfterSpeech();
      }
    },
    [enableSpeechFeedback, pauseListeningForSpeech, resumeListeningAfterSpeech]
  );

  /**
   * Clean task finisher that resets busy locks and cooldown
   */
  const completeTask = useCallback(() => {
    setAssistantStatus('cooldown');
    setCurrentTask(null);
    setTimeout(() => {
      isBusyRef.current = false;
      setIsBusy(false);
      setAssistantStatus(isHandsFreeRef.current ? 'listening' : 'idle');
      setTranscript('');
      setInterimTranscript('');
    }, 400);
  }, []);

  /**
   * Command parser & sequential executor
   * Enforces ONE task at a time. Drops overlapping commands while busy.
   */
  const parseAndExecuteCommand = useCallback(
    async (text: string): Promise<boolean> => {
      const clean = text.toLowerCase().trim();
      if (!clean) return false;

      // 1. Guard against overlapping commands: strictly do ONE task at a time!
      if (isBusyRef.current || isSpeakingRef.current) {
        return false;
      }

      // 2. Prevent self-echo: discard if recognized text is what the assistant just spoke
      const lastSpoken = lastSpokenMessageRef.current;
      if (
        lastSpoken &&
        (clean.includes(lastSpoken) ||
          lastSpoken.includes(clean) ||
          clean.includes('haven voice active') ||
          clean.includes('playback paused') ||
          clean.includes('resuming playback') ||
          clean.includes('volume up') ||
          clean.includes('volume down') ||
          clean.includes('skipping to next'))
      ) {
        return false;
      }

      const now = Date.now();
      if (now - actionCooldownRef.current < 900) {
        return false;
      }

      // 3. Wake words check: "haven", "hey haven", "ok haven", "alexa"
      const hasWakeWord =
        clean.startsWith('haven') ||
        clean.startsWith('hey haven') ||
        clean.startsWith('ok haven') ||
        clean.startsWith('okay haven') ||
        clean.startsWith('hi haven') ||
        clean.startsWith('alexa');

      // Strip wake word prefix
      let command = clean
        .replace(/^(hey|ok|okay|hi)\s+haven[,.\s]*/i, '')
        .replace(/^haven[,.\s]*/i, '')
        .replace(/^alexa[,.\s]*/i, '')
        .trim();

      // If neither wake word nor explicit control keyword is found:
      if (
        !hasWakeWord &&
        !command.startsWith('play') &&
        !command.startsWith('watch') &&
        !command.startsWith('pause') &&
        !command.startsWith('stop') &&
        !command.startsWith('next') &&
        !command.startsWith('resume') &&
        !command.startsWith('volume') &&
        !command.startsWith('mute') &&
        !command.startsWith('unmute')
      ) {
        // If push-to-talk mic button was tapped and user said a name directly (e.g. "Deadpool" or "Sunflower")
        if (!isHandsFreeRef.current && command.length > 1) {
          command = `play ${command}`;
        } else {
          return false;
        }
      }

      // Lock execution for ONE single task at a time
      actionCooldownRef.current = now;
      isBusyRef.current = true;
      setIsBusy(true);
      setAssistantStatus('processing');
      playVoiceWakeChime();

      try {
        // -------------------------------------------------------------
        // Task A: Play Video (e.g. "Haven watch Deadpool", "Haven play video Deadpool")
        // -------------------------------------------------------------
        const watchMatch = command.match(/^(?:watch|play\s+video|stream)\s+(.+)/i);
        if (watchMatch) {
          const query = watchMatch[1].replace(/^(the\s+video|song|movie)\s+/i, '').trim();
          if (query) {
            setCurrentTask(`Playing video: ${query}`);
            playVoiceSuccessChime();

            // 1. Speak feedback and WAIT for speech to finish completely!
            setAssistantStatus('speaking');
            await speakAndWait(`Playing ${query} on Watch Party`);

            // 2. Execute task
            setAssistantStatus('processing');
            if (onPlayVideoQuery) {
              await onPlayVideoQuery(query, clean);
            } else if (onPlayQuery) {
              await onPlayQuery(query, clean);
            }

            completeTask();
            return true;
          }
        }

        // -------------------------------------------------------------
        // Task B: Play Music / Video query (e.g. "Haven play Bien", "Play Sunflower")
        // -------------------------------------------------------------
        const playMatch = command.match(/^play\s+(.+)/i);
        if (playMatch) {
          const query = playMatch[1].replace(/^(the\s+song|track|music|artist|video)\s+/i, '').trim();
          if (query) {
            setCurrentTask(`Playing: ${query}`);
            playVoiceSuccessChime();

            setAssistantStatus('speaking');
            if (context === 'watch') {
              await speakAndWait(`Playing ${query} on Watch Party`);
              setAssistantStatus('processing');
              if (onPlayVideoQuery) {
                await onPlayVideoQuery(query, clean);
              } else if (onPlayQuery) {
                await onPlayQuery(query, clean);
              }
            } else {
              await speakAndWait(`Playing ${query} on Music Lounge`);
              setAssistantStatus('processing');
              if (onPlayQuery) {
                await onPlayQuery(query, clean);
              }
            }

            completeTask();
            return true;
          }
        }

        // -------------------------------------------------------------
        // Task C: Pause / Stop
        // -------------------------------------------------------------
        if (
          /^(pause|stop|halt|freeze|quiet)$/i.test(command) ||
          command.includes('pause the music') ||
          command.includes('pause movie')
        ) {
          setCurrentTask('Pausing playback');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Playback paused');
          setAssistantStatus('processing');
          await onPause?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task D: Resume / Unpause
        // -------------------------------------------------------------
        if (/^(resume|continue|unpause)$/i.test(command) || /^play$/i.test(command)) {
          setCurrentTask('Resuming playback');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Resuming playback');
          setAssistantStatus('processing');
          await onResume?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task E: Next / Skip Track
        // -------------------------------------------------------------
        if (/^(next|skip|next\s+track|next\s+song|next\s+video)$/i.test(command)) {
          setCurrentTask('Skipping to next');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Skipping to next');
          setAssistantStatus('processing');
          await onNext?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task F: Previous Track
        // -------------------------------------------------------------
        if (/^(previous|back|prev|prev\s+song|previous\s+song)$/i.test(command)) {
          setCurrentTask('Going back');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Going back');
          setAssistantStatus('processing');
          await onPrevious?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task G: Volume Up
        // -------------------------------------------------------------
        if (/^(volume\s+up|louder|turn\s+it\s+up|turn\s+up)$/i.test(command)) {
          setCurrentTask('Turning volume up');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Volume up');
          setAssistantStatus('processing');
          await onVolumeUp?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task H: Volume Down
        // -------------------------------------------------------------
        if (/^(volume\s+down|quieter|softer|turn\s+it\s+down|turn\s+down)$/i.test(command)) {
          setCurrentTask('Turning volume down');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Volume down');
          setAssistantStatus('processing');
          await onVolumeDown?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task I: Mute
        // -------------------------------------------------------------
        if (/^(mute|silence)$/i.test(command)) {
          setCurrentTask('Muting sound');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Muted');
          setAssistantStatus('processing');
          await onMute?.();
          completeTask();
          return true;
        }

        // -------------------------------------------------------------
        // Task J: Unmute
        // -------------------------------------------------------------
        if (/^(unmute|sound\s+on)$/i.test(command)) {
          setCurrentTask('Unmuting sound');
          playVoiceSuccessChime();
          setAssistantStatus('speaking');
          await speakAndWait('Unmuted');
          setAssistantStatus('processing');
          await onUnmute?.();
          completeTask();
          return true;
        }

        // Unrecognized command: unlock cleanly
        isBusyRef.current = false;
        setIsBusy(false);
        setAssistantStatus(isHandsFreeRef.current ? 'listening' : 'idle');
        return false;
      } catch (err) {
        console.warn('Voice command execution error:', err);
        isBusyRef.current = false;
        setIsBusy(false);
        setAssistantStatus(isHandsFreeRef.current ? 'listening' : 'idle');
        return false;
      }
    },
    [
      speakAndWait,
      completeTask,
      context,
      onPlayQuery,
      onPlayVideoQuery,
      onPause,
      onResume,
      onNext,
      onPrevious,
      onVolumeUp,
      onVolumeDown,
      onMute,
      onUnmute,
    ]
  );

  /**
   * Internal Speech Recognition lifecycle
   */
  const startListeningInstance = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isSpeakingRef.current || isBusyRef.current) return;

    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechClass) {
      setErrorNotice('Voice recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorNotice(null);
        if (!isBusyRef.current && !isSpeakingRef.current) {
          setAssistantStatus('listening');
        }
      };

      recognition.onresult = (event: any) => {
        // Discard any incoming audio while assistant is speaking or executing a task
        if (isSpeakingRef.current || isBusyRef.current) {
          return;
        }

        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentInterim && !isSpeakingRef.current && !isBusyRef.current) {
          setInterimTranscript(currentInterim);
        }

        if (finalTranscript) {
          const trimmed = finalTranscript.trim();
          if (isSpeakingRef.current || isBusyRef.current) {
            return;
          }
          setTranscript(trimmed);
          setInterimTranscript('');
          parseAndExecuteCommand(trimmed);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed') {
          setErrorNotice('Microphone access denied. Please allow microphone permission in browser settings.');
          setIsListening(false);
          setIsHandsFree(false);
          setAssistantStatus('idle');
          return;
        }
        console.warn('Speech recognition warning:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Do not auto-restart if currently speaking or executing a task
        if (isHandsFreeRef.current && !isSpeakingRef.current && !isBusyRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isHandsFreeRef.current && !isSpeakingRef.current && !isBusyRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      setErrorNotice('Could not start microphone listener. Tap mic to retry.');
      setIsListening(false);
      setAssistantStatus('idle');
    }
  }, [parseAndExecuteCommand]);

  const startListening = useCallback(() => {
    startListeningInstance();
  }, [startListeningInstance]);

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setIsHandsFree(false);
    setAssistantStatus('idle');
    setInterimTranscript('');
  }, []);

  const toggleHandsFree = useCallback(() => {
    if (isHandsFree) {
      setIsHandsFree(false);
      stopListening();
    } else {
      setIsHandsFree(true);
      playVoiceWakeChime();
      startListening();
      speakAndWait("Haven Voice active. Say: 'Haven play' followed by any title.");
    }
  }, [isHandsFree, startListening, stopListening, speakAndWait]);

  const triggerPushToTalk = useCallback(() => {
    if (isListening && !isHandsFree) {
      stopListening();
    } else {
      if (isBusyRef.current) return;
      playVoiceWakeChime();
      startListening();
    }
  }, [isListening, isHandsFree, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (clearNoticeTimerRef.current) clearTimeout(clearNoticeTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    isHandsFree,
    isBusy,
    currentTask,
    assistantStatus,
    transcript,
    interimTranscript,
    lastActionMessage,
    errorNotice,
    isSpeaking,
    startListening,
    stopListening,
    toggleHandsFree,
    triggerPushToTalk,
    parseAndExecuteCommand,
    clearNotice: () => setLastActionMessage(null),
  };
}
