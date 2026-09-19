// Unified TTS Engine with ITtsEngineAdapter Pattern & Tokenized AbortController Lifecycle
import { logTTS, logError, logWarn, logInfo } from '../utils/logBuffer';
import { store } from '../store/index';
import { addError } from '../store/errorsSlice';
import { recordRequestStart, recordRequestComplete, recordRequestFailed } from '../store/networkSlice';
import { loadAppSettings } from '../utils/appSettings';

export interface TTSRequest {
  text: string;
  lang: string;
  rate: number;
  voiceName?: string;
  onBoundary?: (charIndex: number) => void;
  signal?: AbortSignal;
  requestId: number;
}

export interface TTSResult {
  completed: boolean;
  cancelled?: boolean;
  error?: string;
}

export interface ITtsEngineAdapter {
  readonly name: 'android_native' | 'web_speech' | 'audio_stream';
  isSupported(): boolean;
  speak(request: TTSRequest): Promise<TTSResult>;
  stop(): void;
}

export interface TTSDebugPayload {
  text: string;
  lang: string;
  rate: number;
  voiceName?: string;
  engine: 'android_native' | 'web_speech' | 'audio_stream';
  status: 'idle' | 'speaking' | 'completed' | 'cancelled' | 'error';
  charIndex: number;
  totalChars: number;
  timestamp: string;
  timeMs: number;
  repeatCount: number;
  isRepeat: boolean;
  error?: string;
}

export interface TTSDebugHistoryItem {
  id: string;
  text: string;
  lang: string;
  rate: number;
  engine: string;
  status: string;
  timestamp: string;
  durationMs?: number;
  repeatCount: number;
  isRepeat: boolean;
}

export interface TTSInputRecord {
  id: string;
  index: number;
  text: string;
  lang: string;
  rate: number;
  engine: 'android_native' | 'web_speech' | 'audio_stream';
  status: 'speaking' | 'completed' | 'cancelled' | 'error';
  timestamp: string;
  timeMs: number;
  durationMs?: number;
  charIndex: number;
  totalChars: number;
  wordCount: number;
  repeatCount: number;
  isRepeat: boolean;
  error?: string;
}

// Global debug and telemetry state
let lastSpokenTextNormalized: string | null = null;
let currentConsecutiveRepeatCount: number = 0;
let totalTTSInputCounter: number = 0;

let currentTTSDebugInput: TTSDebugPayload | null = null;
const ttsDebugHistory: TTSDebugHistoryItem[] = [];
const ttsInputsFeed: TTSInputRecord[] = [];
const ttsDebugListeners = new Set<
  (info: {
    current: TTSDebugPayload | null;
    history: TTSDebugHistoryItem[];
    inputs: TTSInputRecord[];
  }) => void
>();

// Tokenized AbortController Lifecycle
let currentAbortController: AbortController | null = null;
let currentRequestId: number = 0;
let isTTSCancelledByUser: boolean = false;

function notifyTTSDebugListeners() {
  const data = {
    current: currentTTSDebugInput ? { ...currentTTSDebugInput } : null,
    history: [...ttsDebugHistory],
    inputs: [...ttsInputsFeed],
  };
  const defer = (cb: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(cb);
    } else {
      setTimeout(cb, 0);
    }
  };
  defer(() => {
    ttsDebugListeners.forEach((fn) => {
      try {
        fn(data);
      } catch {}
    });
  });
}

function updateTTSDebugCharIndex(charIndex: number) {
  if (currentTTSDebugInput) {
    currentTTSDebugInput.charIndex = charIndex;
  }
  if (ttsInputsFeed.length > 0 && ttsInputsFeed[0].status === 'speaking') {
    ttsInputsFeed[0].charIndex = charIndex;
  }
  notifyTTSDebugListeners();
}

function completeTTSDebugState(status: 'completed' | 'cancelled' | 'error', errMsg?: string) {
  if (currentTTSDebugInput) {
    currentTTSDebugInput.status = status;
    if (errMsg) currentTTSDebugInput.error = errMsg;
    const duration = Date.now() - currentTTSDebugInput.timeMs;
    ttsDebugHistory.unshift({
      id: `tts_hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: currentTTSDebugInput.text,
      lang: currentTTSDebugInput.lang,
      rate: currentTTSDebugInput.rate,
      engine: currentTTSDebugInput.engine,
      status,
      timestamp: currentTTSDebugInput.timestamp,
      durationMs: duration,
      repeatCount: currentTTSDebugInput.repeatCount,
      isRepeat: currentTTSDebugInput.isRepeat,
    });
    if (ttsDebugHistory.length > 50) ttsDebugHistory.pop();
  }

  if (ttsInputsFeed.length > 0 && ttsInputsFeed[0].status === 'speaking') {
    ttsInputsFeed[0].status = status;
    ttsInputsFeed[0].durationMs = Date.now() - ttsInputsFeed[0].timeMs;
    if (errMsg) ttsInputsFeed[0].error = errMsg;
  }

  notifyTTSDebugListeners();
}

export function getTTSDebugInfo() {
  return {
    current: currentTTSDebugInput ? { ...currentTTSDebugInput } : null,
    history: [...ttsDebugHistory],
    inputs: [...ttsInputsFeed],
  };
}

export function getTTSInputsFeed(): TTSInputRecord[] {
  return [...ttsInputsFeed];
}

export function clearTTSInputsFeed(): void {
  ttsInputsFeed.length = 0;
  notifyTTSDebugListeners();
}

export function getTTSRepeatCount(): number {
  return currentConsecutiveRepeatCount;
}

export function isTTSRepeatingSameText(): boolean {
  return currentConsecutiveRepeatCount > 1;
}

export function subscribeTTSDebug(
  fn: (info: {
    current: TTSDebugPayload | null;
    history: TTSDebugHistoryItem[];
    inputs: TTSInputRecord[];
  }) => void
): () => void {
  ttsDebugListeners.add(fn);
  const initialData = getTTSDebugInfo();
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      if (ttsDebugListeners.has(fn)) {
        try {
          fn(initialData);
        } catch {}
      }
    });
  } else {
    setTimeout(() => {
      if (ttsDebugListeners.has(fn)) {
        try {
          fn(initialData);
        } catch {}
      }
    }, 0);
  }
  return () => {
    ttsDebugListeners.delete(fn);
  };
}

export function unlockTTSAudio(): void {
  if (typeof window === 'undefined') return;
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    try {
      window.speechSynthesis.resume();
    } catch {}
  }
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!(window as any).__unlockedAudioCtx) {
        (window as any).__unlockedAudioCtx = new AudioCtx();
      }
      if ((window as any).__unlockedAudioCtx.state === 'suspended') {
        (window as any).__unlockedAudioCtx.resume().catch(() => {});
      }
    }
  } catch {}
}

if (typeof window !== 'undefined' && !(window as any).__ttsAudioAutoUnlockAttached) {
  (window as any).__ttsAudioAutoUnlockAttached = true;
  const autoUnlock = () => {
    unlockTTSAudio();
  };
  window.addEventListener('pointerdown', autoUnlock, { capture: true, passive: true });
  window.addEventListener('touchstart', autoUnlock, { capture: true, passive: true });
  window.addEventListener('keydown', autoUnlock, { capture: true, passive: true });
  window.addEventListener('click', autoUnlock, { capture: true, passive: true });
}

function reportTTSError(message: string, details?: any) {
  logError('TTS', message, details);
  try {
    store.dispatch(
      addError({
        section: 'system',
        title: 'TTS Playback Error',
        message: `TTS Error: ${message}`,
        details,
        stack: details?.error?.stack || (typeof details === 'string' ? details : JSON.stringify(details)),
      })
    );
  } catch {}
}

// ----------------------------------------------------------------------------
// Word Timings & Simulated Boundary Helper
// ----------------------------------------------------------------------------
export function extractWordTimings(text: string): Array<{ word: string; start: number; length: number; weight: number }> {
  if (!text) return [];
  const words: Array<{ word: string; start: number; length: number; weight: number }> = [];
  const regex = /\S+/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const isPunct = /^[.,!?;:()[\]{}'"]+$/.test(word);
    const weight = isPunct ? 60 : Math.max(120, word.length * 65);
    words.push({
      word,
      start: match.index,
      length: word.length,
      weight,
    });
  }

  return words;
}

export function startSimulatedBoundaryProgression(
  text: string,
  rate: number,
  onBoundary: (charIndex: number) => void,
  totalDurationMs?: number
): () => void {
  const words = extractWordTimings(text);
  if (words.length === 0) return () => {};

  onBoundary(words[0].start);

  const cleanRate = Math.max(0.4, rate || 1.0);
  let intervals: number[] = [];

  if (totalDurationMs && totalDurationMs > 0) {
    const totalWeight = words.reduce((acc, w) => acc + w.weight, 0);
    intervals = words.map((w) => Math.max(80, (w.weight / totalWeight) * totalDurationMs));
  } else {
    intervals = words.map((w) => Math.max(80, Math.min(1200, w.weight / cleanRate)));
  }

  let currentWordIdx = 0;
  let isCancelled = false;
  let timerId: NodeJS.Timeout | null = null;

  const scheduleNext = () => {
    if (isCancelled) return;
    currentWordIdx++;
    if (currentWordIdx < words.length) {
      onBoundary(words[currentWordIdx].start);
      const nextDelay = intervals[currentWordIdx] || 250;
      timerId = setTimeout(scheduleNext, nextDelay);
    }
  };

  const initialDelay = intervals[0] || 250;
  timerId = setTimeout(scheduleNext, initialDelay);

  return () => {
    isCancelled = true;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
}

// ----------------------------------------------------------------------------
// Adapter 1: Android Native Shell Engine
// ----------------------------------------------------------------------------
class NativeAndroidEngineAdapter implements ITtsEngineAdapter {
  readonly name = 'android_native' as const;
  private currentUtteranceId: string | null = null;
  private activeResolvers: Map<string, { resolve: (res: TTSResult) => void; reject: (err: any) => void }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.onNativeTTSDone = (utteranceId: string) => {
        logTTS(`[Native TTS] Done: ${utteranceId}`);
        const callbacks = this.activeResolvers.get(utteranceId);
        if (callbacks) {
          callbacks.resolve({ completed: true });
          this.activeResolvers.delete(utteranceId);
        }
        if (this.currentUtteranceId === utteranceId) {
          this.currentUtteranceId = null;
        }
      };

      window.onNativeTTSError = (utteranceId: string, err: string) => {
        reportTTSError(`Native TTS error (${utteranceId}): ${err}`);
        const callbacks = this.activeResolvers.get(utteranceId);
        if (callbacks) {
          callbacks.resolve({ completed: false, error: err });
          this.activeResolvers.delete(utteranceId);
        }
        if (this.currentUtteranceId === utteranceId) {
          this.currentUtteranceId = null;
        }
      };

      window.onNativeTTSBoundary = (utteranceId: string, charIndex: number) => {
        // Broadcast to active listener if utterance matches
      };
    }
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.AndroidNativeShell?.speak && typeof window.AndroidNativeShell.speak === 'function')
    );
  }

  async speak(request: TTSRequest): Promise<TTSResult> {
    if (!this.isSupported()) return { completed: false, error: 'Not supported' };

    return new Promise<TTSResult>((resolve, reject) => {
      const utteranceId = `native_tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      this.currentUtteranceId = utteranceId;
      this.activeResolvers.set(utteranceId, { resolve, reject });

      let clearBoundary: (() => void) | null = null;
      if (request.onBoundary) {
        clearBoundary = startSimulatedBoundaryProgression(request.text, request.rate, request.onBoundary);
      }

      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          if (clearBoundary) clearBoundary();
          this.stop();
          resolve({ completed: false, cancelled: true });
        });
      }

      try {
        const success = window.AndroidNativeShell!.speak(
          request.text,
          request.lang,
          request.rate,
          utteranceId
        );
        if (!success) {
          if (clearBoundary) clearBoundary();
          this.activeResolvers.delete(utteranceId);
          this.currentUtteranceId = null;
          resolve({ completed: false, error: 'Native speak returned false' });
        }
      } catch (err: any) {
        if (clearBoundary) clearBoundary();
        this.activeResolvers.delete(utteranceId);
        this.currentUtteranceId = null;
        resolve({ completed: false, error: err?.message || String(err) });
      }
    });
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.AndroidNativeShell?.stopSpeaking) {
      try {
        window.AndroidNativeShell.stopSpeaking();
      } catch {}
    }
    if (this.currentUtteranceId) {
      const callbacks = this.activeResolvers.get(this.currentUtteranceId);
      if (callbacks) callbacks.resolve({ completed: false, cancelled: true });
      this.activeResolvers.delete(this.currentUtteranceId);
      this.currentUtteranceId = null;
    }
  }
}

// ----------------------------------------------------------------------------
// Adapter 2: Web Speech Synthesis Engine
// ----------------------------------------------------------------------------
class WebSpeechEngineAdapter implements ITtsEngineAdapter {
  readonly name = 'web_speech' as const;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
  }

  async speak(request: TTSRequest): Promise<TTSResult> {
    if (!this.isSupported()) return { completed: false, error: 'SpeechSynthesis unavailable' };

    return new Promise<TTSResult>((resolve) => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(request.text);
        utterance.lang = request.lang;
        utterance.rate = request.rate;
        this.currentUtterance = utterance;
        (window as any).__activeTTSUtterance = utterance;

        const voices = window.speechSynthesis.getVoices() || [];
        if (request.voiceName && voices.length > 0) {
          const found = voices.find((v) => v.name === request.voiceName || v.voiceURI === request.voiceName);
          if (found) utterance.voice = found;
        }
        if (!utterance.voice && voices.length > 0) {
          const normLang = request.lang.toLowerCase();
          const baseLang = normLang.split(/[-_]/)[0];
          const exact = voices.find((v) => v.lang.toLowerCase() === normLang);
          const prefix = voices.find((v) => {
            const vLang = v.lang.toLowerCase();
            return (
              vLang.startsWith(baseLang) ||
              ((baseLang === 'he' || baseLang === 'iw') && (vLang.startsWith('he') || vLang.startsWith('iw')))
            );
          });
          if (exact) utterance.voice = exact;
          else if (prefix) utterance.voice = prefix;
        }

        // If voices are available but none match the requested language, Web Speech cannot synthesize it
        if (!utterance.voice && voices.length > 0) {
          logWarn('TTS', `[Web Speech] No voice for "${request.lang}" in system (${voices.length} voices) - falling back to Neural Audio Stream`);
          resolve({ completed: false, error: `No voice for ${request.lang}` });
          return;
        }

        let hasRealBoundary = false;
        let clearSimulated: (() => void) | null = null;

        if (request.onBoundary) {
          request.onBoundary(0);
          clearSimulated = startSimulatedBoundaryProgression(request.text, request.rate, (charIdx) => {
            if (!hasRealBoundary && !request.signal?.aborted) {
              request.onBoundary?.(charIdx);
            }
          });

          utterance.onboundary = (event) => {
            if (request.signal?.aborted) return;
            if ((event.name === 'word' || !event.name) && typeof event.charIndex === 'number') {
              if (event.charIndex > 0) {
                hasRealBoundary = true;
                if (clearSimulated) clearSimulated();
              }
              request.onBoundary?.(event.charIndex);
            }
          };
        }

        let isSettled = false;

        const cleanup = () => {
          if (clearSimulated) clearSimulated();
          this.currentUtterance = null;
          (window as any).__activeTTSUtterance = null;
        };

        const finish = (result: TTSResult) => {
          if (!isSettled) {
            isSettled = true;
            cleanup();
            resolve(result);
          }
        };

        if (request.signal) {
          request.signal.addEventListener('abort', () => {
            try {
              window.speechSynthesis.cancel();
            } catch {}
            finish({ completed: false, cancelled: true });
          });
        }

        const startTime = Date.now();
        utterance.onstart = () => {
          logTTS(`[Web Speech] Started "${request.text.substring(0, 40)}..."`);
        };

        utterance.onend = () => {
          const elapsed = Date.now() - startTime;
          // In Chromium, if speech engine cannot synthesize the language, onend fires immediately (<250ms)
          if (elapsed < 250 && request.text.trim().length > 2) {
            logWarn('TTS', `[Web Speech] Ended suspiciously fast (${elapsed}ms) for "${request.lang}" - treating as silent drop`);
            finish({ completed: false, error: 'Silent drop by Web Speech' });
            return;
          }
          logTTS(`[Web Speech] Completed "${request.text.substring(0, 40)}..."`);
          finish({ completed: true });
        };

        utterance.onerror = (event: any) => {
          const errType = event?.error || 'error';
          if (errType === 'canceled' || errType === 'interrupted' || request.signal?.aborted) {
            finish({ completed: false, cancelled: true });
          } else {
            logWarn('TTS', `[Web Speech] Error "${errType}" for "${request.lang}"`);
            finish({ completed: false, error: errType });
          }
        };

        // Safety fallback timer based on word length
        const wordCount = request.text.split(/\s+/).filter(Boolean).length;
        const maxDurationMs = Math.min(18000, Math.max(1200, (wordCount / (2.0 * Math.max(0.4, request.rate))) * 1000 + 1500));
        setTimeout(() => {
          if (!isSettled) {
            finish({ completed: false, error: 'Web Speech timeout' });
          }
        }, maxDurationMs);

        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        resolve({ completed: false, error: err?.message || String(err) });
      }
    });
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;
    if (typeof window !== 'undefined') {
      (window as any).__activeTTSUtterance = null;
    }
  }
}

// ----------------------------------------------------------------------------
// Adapter 3: Neural Audio Stream Fallback Engine
// ----------------------------------------------------------------------------
class AudioStreamFallbackEngineAdapter implements ITtsEngineAdapter {
  readonly name = 'audio_stream' as const;
  private currentAudioElement: HTMLAudioElement | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.Audio);
  }

  async speak(request: TTSRequest): Promise<TTSResult> {
    if (!this.isSupported()) return { completed: false, error: 'Audio not supported' };

    return new Promise<TTSResult>((resolve) => {
      const langParam = encodeURIComponent(request.lang);
      const textParam = encodeURIComponent(request.text.trim());
      const primaryUrl = `/api/tts?text=${textParam}&lang=${langParam}&q=${textParam}&tl=${langParam}`;
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langParam}&client=tw-ob&q=${textParam}&text=${textParam}`;

      const audio = new Audio(primaryUrl);
      this.currentAudioElement = audio;
      audio.playbackRate = Math.max(0.5, Math.min(2.0, request.rate || 1.0));

      let clearBoundary: (() => void) | null = null;
      let isSettled = false;

      const finish = (result: TTSResult) => {
        if (!isSettled) {
          isSettled = true;
          if (clearBoundary) clearBoundary();
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          resolve(result);
        }
      };

      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          try {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
          } catch {}
          finish({ completed: false, cancelled: true });
        });
      }

      if (request.onBoundary) {
        const words = extractWordTimings(request.text);
        if (words.length > 0) {
          audio.ontimeupdate = () => {
            if (!audio.duration || isNaN(audio.duration) || audio.duration <= 0) return;
            const totalWeight = words.reduce((acc, w) => acc + w.weight, 0);
            const currentTimeMs = (audio.currentTime * 1000) / audio.playbackRate;
            const totalDurationMs = (audio.duration * 1000) / audio.playbackRate;

            let accumulatedMs = 0;
            for (let i = 0; i < words.length; i++) {
              const wordMs = Math.max(80, (words[i].weight / totalWeight) * totalDurationMs);
              if (currentTimeMs >= accumulatedMs && currentTimeMs < accumulatedMs + wordMs) {
                if (!request.signal?.aborted) request.onBoundary?.(words[i].start);
                break;
              }
              accumulatedMs += wordMs;
            }
          };
        }
      }

      audio.onplay = () => {
        if (request.onBoundary && !clearBoundary) {
          clearBoundary = startSimulatedBoundaryProgression(request.text, request.rate, request.onBoundary);
        }
      };

      audio.onended = () => {
        finish({ completed: true });
      };

      audio.onerror = () => {
        if (audio.src.includes('/api/tts')) {
          audio.src = fallbackUrl;
          audio.play().catch((playErr) => {
            finish({ completed: false, error: String(playErr) });
          });
        } else {
          finish({ completed: false, error: 'Audio stream failed on all endpoints' });
        }
      };

      audio.play().catch((playErr) => {
        unlockTTSAudio();
        audio.play().catch((retryErr) => {
          logWarn('TTS', `[Audio Stream] Playback failed or blocked (${String(retryErr || playErr)})`);
          if (request.onBoundary) {
            clearBoundary = startSimulatedBoundaryProgression(request.text, request.rate, request.onBoundary);
          }
          const wordCount = request.text.split(/\s+/).filter(Boolean).length;
          const estDurationMs = Math.min(8000, Math.max(1000, (wordCount / (2.2 * Math.max(0.5, request.rate))) * 1000));
          setTimeout(() => {
            finish({ completed: true });
          }, estDurationMs);
        });
      });
    });
  }

  stop(): void {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentAudioElement.src = '';
      } catch {}
      this.currentAudioElement = null;
    }
  }
}

// ----------------------------------------------------------------------------
// Adapter Registry
// ----------------------------------------------------------------------------
const nativeAdapter = new NativeAndroidEngineAdapter();
const webSpeechAdapter = new WebSpeechEngineAdapter();
const audioStreamAdapter = new AudioStreamFallbackEngineAdapter();

export function isAndroidNativeTTS(): boolean {
  return nativeAdapter.isSupported();
}

export function getTTSEngineType(): 'android_native' | 'web_speech' | 'audio_stream' {
  if (nativeAdapter.isSupported()) return 'android_native';
  if (webSpeechAdapter.isSupported()) return 'web_speech';
  return 'audio_stream';
}

export function isTTSAvailable(): boolean {
  return true;
}

export function detectLanguageFromText(text: string): string {
  if (!text) return 'en';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  if (/[\u3040-\u30FF\u31F0-\u31FF]/.test(text)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return 'ko';
  if (/[\u0370-\u03FF]/.test(text)) return 'el';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

export function normalizeLanguageCode(code: string): string {
  if (!code) return 'en';
  return code.replace(/_auto$/, '').trim();
}

export function getAvailableVoices(langCode?: string): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  try {
    const rawVoices = window.speechSynthesis.getVoices() || [];
    const seen = new Set<string>();
    const voices = rawVoices.filter((v) => {
      const key = `${v.voiceURI || v.name}::${v.lang}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!langCode) return voices;
    const clean = normalizeLanguageCode(langCode).toLowerCase();
    const prefix = clean.split('-')[0];
    const matching = voices.filter(
      (v) => v.lang.toLowerCase() === clean || v.lang.toLowerCase().startsWith(prefix)
    );
    return matching.length > 0 ? matching : voices;
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Primary API: speakText & stopTTS
// ----------------------------------------------------------------------------
export async function speakText(
  text: string,
  lang: string = 'en',
  rate: number = 1.0,
  voiceName?: string,
  onBoundary?: (charIndex: number) => void
): Promise<void> {
  if (!text || !text.trim()) return;

  // Cancel any active speech immediately (Tokenized AbortController Lifecycle)
  stopTTS();
  isTTSCancelledByUser = false;

  const thisRequestId = ++currentRequestId;
  const abortController = new AbortController();
  currentAbortController = abortController;

  unlockTTSAudio();

  let cleanLang = normalizeLanguageCode(lang);
  if ((cleanLang === 'en' || cleanLang === 'auto') && text) {
    const detected = detectLanguageFromText(text);
    if (detected !== 'en') cleanLang = detected;
  }

  const cleanRate = Math.max(0.2, Math.min(3.0, rate || 1.0));

  const normalizedText = text.trim().toLowerCase();
  if (lastSpokenTextNormalized && lastSpokenTextNormalized === normalizedText) {
    currentConsecutiveRepeatCount++;
  } else {
    lastSpokenTextNormalized = normalizedText;
    currentConsecutiveRepeatCount = 1;
  }
  const isRepeat = currentConsecutiveRepeatCount > 1;

  logTTS(
    `Speech requested: "${text.substring(0, 45)}..." [lang: ${cleanLang}, rate: ${cleanRate}x, engine: ${getTTSEngineType()}${
      isRepeat ? `, REPEAT: x${currentConsecutiveRepeatCount}` : ''
    }]`
  );

  currentTTSDebugInput = {
    text,
    lang: cleanLang,
    rate: cleanRate,
    voiceName,
    engine: getTTSEngineType(),
    status: 'speaking',
    charIndex: 0,
    totalChars: text.length,
    timestamp: new Date().toLocaleTimeString(),
    timeMs: Date.now(),
    repeatCount: currentConsecutiveRepeatCount,
    isRepeat,
  };

  totalTTSInputCounter++;
  const inputRecord: TTSInputRecord = {
    id: `tts_in_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    index: totalTTSInputCounter,
    text,
    lang: cleanLang,
    rate: cleanRate,
    engine: getTTSEngineType(),
    status: 'speaking',
    timestamp: new Date().toLocaleTimeString(),
    timeMs: Date.now(),
    charIndex: 0,
    totalChars: text.length,
    wordCount: text.trim().split(/\s+/).filter(Boolean).length,
    repeatCount: currentConsecutiveRepeatCount,
    isRepeat,
  };
  ttsInputsFeed.unshift(inputRecord);
  if (ttsInputsFeed.length > 200) ttsInputsFeed.pop();

  notifyTTSDebugListeners();

  const wrappedBoundary = (charIdx: number) => {
    // Only accept boundary if this request is still active
    if (thisRequestId !== currentRequestId || abortController.signal.aborted) return;
    updateTTSDebugCharIndex(charIdx);
    onBoundary?.(charIdx);
  };

  const request: TTSRequest = {
    text,
    lang: cleanLang,
    rate: cleanRate,
    voiceName,
    onBoundary: wrappedBoundary,
    signal: abortController.signal,
    requestId: thisRequestId,
  };

  try {
    // 1. Android Native TTS
    if (nativeAdapter.isSupported()) {
      const res = await nativeAdapter.speak(request);
      if (thisRequestId !== currentRequestId) return;
      if (res.completed) {
        completeTTSDebugState('completed');
        return;
      }
      if (res.cancelled) {
        completeTTSDebugState('cancelled');
        return;
      }
      logWarn('TTS', 'Native TTS failed or returned false, falling back to Web Speech / Audio');
    }

    // 2. Web Speech API
    if (webSpeechAdapter.isSupported()) {
      const res = await webSpeechAdapter.speak(request);
      if (thisRequestId !== currentRequestId) return;
      if (res.completed) {
        completeTTSDebugState('completed');
        return;
      }
      if (res.cancelled) {
        completeTTSDebugState('cancelled');
        return;
      }
      logWarn('TTS', `Web Speech returned error (${res.error}), testing Audio Stream`);
    }

    // 3. Neural Audio Stream Fallback (resilient neural fallback for all languages)
    const allowNonNative = true;
    if (allowNonNative && audioStreamAdapter.isSupported()) {
      const res = await audioStreamAdapter.speak(request);
      if (thisRequestId !== currentRequestId) return;
      if (res.completed) {
        completeTTSDebugState('completed');
        return;
      }
      if (res.cancelled) {
        completeTTSDebugState('cancelled');
        return;
      }
      completeTTSDebugState('error', res.error);
    } else {
      completeTTSDebugState('completed');
    }
  } catch (err: any) {
    if (thisRequestId === currentRequestId) {
      completeTTSDebugState('error', err?.message || String(err));
    }
  }
}

export function stopTTS(): void {
  isTTSCancelledByUser = true;
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  nativeAdapter.stop();
  webSpeechAdapter.stop();
  audioStreamAdapter.stop();

  if (currentTTSDebugInput && currentTTSDebugInput.status === 'speaking') {
    completeTTSDebugState('cancelled');
  }
}

export function isTTSSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  if (nativeAdapter.isSupported() && window.AndroidNativeShell?.isSpeaking) {
    try {
      return Boolean(window.AndroidNativeShell.isSpeaking());
    } catch {}
  }
  return Boolean(window.speechSynthesis?.speaking);
}

let wakeLock: any = null;

export async function requestWakeLock(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch {
      // Wake lock not available or denied
    }
  }
}

export function releaseWakeLock(): void {
  if (wakeLock) {
    try {
      wakeLock.release();
    } catch {}
    wakeLock = null;
  }
}
