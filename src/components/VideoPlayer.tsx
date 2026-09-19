import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import {
  ExternalLink,
  Share2,
  Maximize2,
  Minimize2,
  Code2,
  Check,
  Copy,
  Repeat,
  Sparkles,
  Clock,
  Subtitles,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowLeft,
  Settings,
  Globe,
  Layers,
  Terminal,
  Plus,
  Activity,
  Download,
  Link2,
  FileText,
  X,
} from 'lucide-react';
import { getYouTubeEmbedUrl, formatTypeName, parseYouTubeUrl } from '../utils/youtube';
import { YouTubeFormatType, YouTubePlayerHandle, CaptionCue } from '../types';
import { formatTimestamp } from '../utils/captionParser';
import { useAppDispatch } from '../store';
import { setPlayerReady as setReduxPlayerReady, setPlayerState as setReduxPlayerState } from '../store/videoSlice';
import { transition } from '../store/stateMachineSlice';
import { addError } from '../store/errorsSlice';
import { UI_TEXT } from '../config/appConfig';
import { SubtitlePosition, loadAppSettings, saveAppSettings, AppSettings, getSingleTargetLanguageMode, setSingleTargetLanguageMode, isAndroidAppEnvironment } from '../utils/appSettings';
import { HighlightableText } from './HighlightableText';
import { ParallelTranslationsOverlay } from './ParallelTranslationsOverlay';
import { speakText, stopTTS, unlockTTSAudio } from '../lib/ttsEngine';
import { translateText } from '../lib/translateService';
import { getCachedTargetSubtitles, getCachedSubtitles } from '../utils/subtitleCache';
import { getVideoSettings } from '../utils/videoSettings';
import { isRtl } from '../utils/rtlUtils';
import { SAMPLE_TRANSLATIONS } from '../config/fixtures';
import { logBuffer } from '../utils/logBuffer';

interface VideoPlayerProps {
  videoId: string;
  originalUrl: string;
  theaterMode: boolean;
  onToggleTheater: () => void;
  startTime?: number;
  detectedFormat?: YouTubeFormatType;
  onFetchSubtitles?: () => void;
  isFetchingSubtitles?: boolean;
  hasSubtitles?: boolean;
  captionsEnabled?: boolean;
  onToggleCaptions?: (enabled: boolean) => void;
  compactView?: boolean;
  activeCue?: CaptionCue | null;
  translatedCueText?: string | null;
  targetLanguage?: string | null;
  onSelectTargetLanguage?: (lang: string) => void;
  onOpenTargetLanguageModal?: () => void;
  onOpenLogs?: () => void;
  onOpenSettings?: () => void;
  onBackOrClose?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  alwaysShowKeyControls?: boolean;
  subtitlePosition?: SubtitlePosition;
  showTranslatedOnTop?: boolean;
  onChangeSubtitlePosition?: (pos: SubtitlePosition) => void;
  isSyncActive?: boolean;
  syncTTSText?: string | null;
  syncTTSLang?: string | null;
  isSyncSpeaking?: boolean;
  syncTTSCharIndex?: number | null;
  onToggleSync?: () => void;
  isLoopingCue?: boolean;
  onToggleLoopCue?: () => void;
  onNextCue?: () => void;
  onPrevCue?: () => void;
  onStateChange?: (state: number) => void;
  onTogglePlayPause?: () => void;
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
  onSelectVideo?: (videoId: string, rawUrl: string) => void;
  onOpenApkUpdate?: () => void;
  onOpenNetworkInspector?: () => void;
  onOpenShare?: () => void;
  onOpenArtifacts?: () => void;
}

export const VideoPlayer = forwardRef<YouTubePlayerHandle, VideoPlayerProps>(
  (
    {
      videoId,
      originalUrl,
      theaterMode,
      onToggleTheater,
      startTime,
      detectedFormat,
      onFetchSubtitles,
      isFetchingSubtitles = false,
      hasSubtitles = false,
      captionsEnabled: controlledCaptionsEnabled,
      onToggleCaptions,
      compactView = true,
      activeCue = null,
      translatedCueText = null,
      targetLanguage = null,
      onSelectTargetLanguage,
      onOpenTargetLanguageModal,
      onOpenArtifacts,
      onOpenLogs,
      onOpenSettings,
      onBackOrClose,
      onTimeUpdate,
      onStateChange,
      onTogglePlayPause,
      alwaysShowKeyControls = true,
      subtitlePosition = 'top',
      showTranslatedOnTop = true,
      onChangeSubtitlePosition,
      isSyncActive = false,
      syncTTSText = null,
      syncTTSLang = null,
      isSyncSpeaking = false,
      syncTTSCharIndex = null,
      onToggleSync,
      isLoopingCue = false,
      onToggleLoopCue,
      onNextCue,
      onPrevCue,
      settings: propSettings,
      onUpdateSettings,
      onSelectVideo,
      onOpenApkUpdate,
      onOpenNetworkInspector,
      onOpenShare,
    },
    ref
  ) => {
    const settings = propSettings || loadAppSettings();
    const dispatch = useAppDispatch();
    const [compactUrlInput, setCompactUrlInput] = useState('');
    const [localCaptionsEnabled, setLocalCaptionsEnabled] = useState(controlledCaptionsEnabled ?? true);
    const captionsActive = controlledCaptionsEnabled !== undefined ? controlledCaptionsEnabled : localCaptionsEnabled;
    const isCaptionsActive = Boolean(captionsActive);

    const targetLangCode = targetLanguage || 'he';
    const cleanTargetLang = targetLangCode.toLowerCase().split('-')[0];
    const normTargetLang = (cleanTargetLang === 'iw' || cleanTargetLang === 'il') ? 'he' : cleanTargetLang;

    // Local state to guarantee translated text is always present per cue ID without cross-cue pollution
    const [localTranslatedMap, setLocalTranslatedMap] = useState<Record<string, string>>({});
    const cachedCues = useMemo(() => getCachedSubtitles(videoId) || [], [videoId]);

    useEffect(() => {
      if (!activeCue?.text || !activeCue?.id) return;
      const cueId = activeCue.id;
      const cueStart = activeCue.start;
      const cueText = activeCue.text;

      if (translatedCueText) return;
      if (localTranslatedMap[cueId]) return;

      // Check authentic target subtitle track cache with time-based precision
      const srtCues = getCachedTargetSubtitles(videoId, normTargetLang);
      if (srtCues && srtCues.length > 0) {
        const match =
          srtCues.find((c) => Math.abs(c.start - cueStart) < 0.75) ||
          srtCues.find((c) => c.id === cueId);
        if (match?.text) {
          setLocalTranslatedMap((prev) => (prev[cueId] === match.text ? prev : { ...prev, [cueId]: match.text }));
          return;
        }
      }
      // Check known sample translations
      const sample = SAMPLE_TRANSLATIONS[cueText]?.[normTargetLang] || SAMPLE_TRANSLATIONS[cueText]?.[targetLangCode];
      if (sample) {
        setLocalTranslatedMap((prev) => (prev[cueId] === sample ? prev : { ...prev, [cueId]: sample }));
        return;
      }
      let isMounted = true;
      translateText(cueText, 'auto', targetLangCode)
        .then((res) => {
          if (isMounted && res) {
            setLocalTranslatedMap((prev) => (prev[cueId] === res ? prev : { ...prev, [cueId]: res }));
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }, [translatedCueText, activeCue?.id, activeCue?.text, activeCue?.start, videoId, normTargetLang, targetLangCode]);

    // TTS playback state with word boundary syntax highlighting
    const [isTTSSpeakingState, setIsTTSSpeakingState] = useState(false);
    const [activeTTSTarget, setActiveTTSTarget] = useState<'translated' | 'original' | null>(null);
    const [activeTTSCharIndex, setActiveTTSCharIndex] = useState<number | null>(null);

    const normalizeLangCode = (lang: string | null | undefined): string => {
      if (!lang) return '';
      const cleaned = lang.toLowerCase().trim().split('-')[0];
      if (cleaned === 'iw' || cleaned === 'il') return 'he';
      return cleaned;
    };

    const normSyncLang = normalizeLangCode(syncTTSLang);
    const normSourceLang = normalizeLangCode(detectedFormat?.language);

    // Check if TTS is currently speaking the original subtitle
    const isSyncOriginalSpeaking = isSyncSpeaking && !!syncTTSLang && (
      normSyncLang === normSourceLang ||
      syncTTSLang === 'orig' ||
      (syncTTSLang === 'auto' && syncTTSText === activeCue?.text)
    );

    const isOriginalSpeaking = isSyncOriginalSpeaking || (isTTSSpeakingState && activeTTSTarget === 'original');

    // Check if TTS is currently speaking the active target language of this overlay
    const isSyncTargetLangSpeaking = isSyncSpeaking && !!syncTTSLang && (
      normSyncLang === normTargetLang ||
      syncTTSLang === targetLangCode
    );

    const isTranslatedSpeaking = isSyncTargetLangSpeaking
      ? true
      : (isTTSSpeakingState && activeTTSTarget === 'translated');

    const displayTranslatedText = translatedCueText || (activeCue ? localTranslatedMap[activeCue.id] : undefined) || '';

    const effectiveDisplayTranslatedText = (isSyncTargetLangSpeaking && syncTTSText)
      ? syncTTSText
      : displayTranslatedText;

    const currentSpeakingCharIndex = isSyncTargetLangSpeaking
      ? (syncTTSCharIndex ?? 0)
      : activeTTSCharIndex;

    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const isAndroidApp = isAndroidAppEnvironment();

    const handleQuickCopyLogs = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = logBuffer.copyAll();
      try {
        await navigator.clipboard.writeText(text);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2500);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2500);
      }
    };

    const handleToggleCaptions = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const nextState = !isCaptionsActive;
      setLocalCaptionsEnabled(nextState);
      onToggleCaptions?.(nextState);

      // Auto-detect subtitles once the caption icon is set to ON - scoped strictly to Android native app
      if (nextState && !hasSubtitles && onFetchSubtitles && isAndroidApp) {
        onFetchSubtitles();
      }
    };

    const [autoplay, setAutoplay] = useState(false);
    const [loop, setLoop] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedEmbed, setCopiedEmbed] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Compact Player On-Tap Controls State (Android UI Guidelines)
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(startTime || 0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-TTS Narration State (default ON: presents subtitles and enables TTS narration)
    const [autoTTSEnabled, setAutoTTSEnabled] = useState<boolean>(() => {
      if (typeof window === 'undefined') return settings?.autoPlayTTS ?? true;
      try {
        const val = localStorage.getItem('yt_auto_tts_enabled');
        return val !== null ? val === 'true' : (settings?.autoPlayTTS ?? true);
      } catch {
        return settings?.autoPlayTTS ?? true;
      }
    });

    useEffect(() => {
      if (settings?.autoPlayTTS !== undefined) {
        const val = localStorage.getItem('yt_auto_tts_enabled');
        if (val === null) {
          setAutoTTSEnabled(settings.autoPlayTTS);
        }
      }
    }, [settings?.autoPlayTTS]);

    const [isHebrewHighlighted, setIsHebrewHighlighted] = useState<boolean>(() => targetLangCode === 'he');

    useEffect(() => {
      setIsHebrewHighlighted(targetLangCode === 'he');
    }, [targetLangCode]);

    // Single target language TTS playback: plays TTS only for the current target language and strictly what is presented on screen!
    const playCurrentCueTTS = async (cue?: CaptionCue) => {
      unlockTTSAudio();
      if (!isAutoTTSPausingRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
      try {
        ytPlayerRef.current?.pauseVideo?.();
      } catch {}
      postIframeCommand('pauseVideo');

      // CRITICAL: speak target cue (active cue, parameter cue, or fallback to first cached cue)
      const targetCue = cue || activeCue || cachedCues[0];
      if (!targetCue?.text) return;

      setIsTTSSpeakingState(true);
      isAutoTTSSpeakingRef.current = true;

      try {
        // Guarantee 1:1 fidelity between the text presented on screen and the text spoken by TTS
        let textToSpeak = effectiveDisplayTranslatedText || displayTranslatedText || translatedCueText || (targetCue ? localTranslatedMap[targetCue.id] : '') || '';
        if (!textToSpeak) {
          const norm = (targetLangCode === 'iw' || targetLangCode === 'il') ? 'he' : targetLangCode.toLowerCase().split('-')[0];
          const srtCues = getCachedTargetSubtitles(videoId, norm);
          if (srtCues && srtCues.length > 0) {
            const match =
              srtCues.find((c) => Math.abs(c.start - targetCue.start) < 0.75) ||
              srtCues.find((c) => c.id === targetCue.id);
            if (match?.text) textToSpeak = match.text;
          }
        }
        if (!textToSpeak) {
          const sample = SAMPLE_TRANSLATIONS[targetCue.text]?.[normTargetLang] || SAMPLE_TRANSLATIONS[targetCue.text]?.[targetLangCode];
          if (sample) textToSpeak = sample;
        }
        if (!textToSpeak) {
          try {
            textToSpeak = await translateText(targetCue.text, 'auto', targetLangCode);
          } catch {
            textToSpeak = targetCue.text;
          }
        }
        if (!textToSpeak) textToSpeak = targetCue.text;

        setLocalTranslatedMap((prev) => ({ ...prev, [targetCue.id]: textToSpeak }));
        setActiveTTSTarget('translated');
        setActiveTTSCharIndex(0);

        try {
          await speakText(textToSpeak, targetLangCode, 1.0, undefined, (charIdx) => {
            setActiveTTSCharIndex(charIdx);
          });
        } catch (speechErr) {
          console.warn(`TTS playback error for ${targetLangCode}:`, speechErr);
        }
      } catch (err) {
        console.warn('Error during single target language TTS:', err);
      } finally {
        setIsTTSSpeakingState(false);
        isAutoTTSSpeakingRef.current = false;
        setActiveTTSTarget(null);
        setActiveTTSCharIndex(null);
      }
    };

    const toggleAutoTTS = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      unlockTTSAudio();
      const next = !autoTTSEnabled;
      setAutoTTSEnabled(next);
      try {
        localStorage.setItem('yt_auto_tts_enabled', String(next));
      } catch {}
      if (onUpdateSettings && settings) {
        onUpdateSettings({ ...settings, autoPlayTTS: next });
      }
      if (!next) {
        if (isTTSSpeakingState) {
          stopTTS();
          setIsTTSSpeakingState(false);
          setActiveTTSTarget(null);
          setActiveTTSCharIndex(null);
        }
      }
    };

    // Parallel / Single Target Language Mode
    const [singleTargetLanguageMode, setSingleTargetLanguageModeState] = useState<boolean>(() => {
      return settings?.singleTargetLanguageMode ?? getSingleTargetLanguageMode();
    });

    useEffect(() => {
      if (settings?.singleTargetLanguageMode !== undefined) {
        setSingleTargetLanguageModeState(settings.singleTargetLanguageMode);
      }
    }, [settings?.singleTargetLanguageMode]);

    useEffect(() => {
      const handleStorage = () => {
        setSingleTargetLanguageModeState(getSingleTargetLanguageMode());
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleToggleParallelMode = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const nextMode = !singleTargetLanguageMode;
      setSingleTargetLanguageModeState(nextMode);
      setSingleTargetLanguageMode(nextMode);
      if (settings && onUpdateSettings) {
        onUpdateSettings({ ...settings, singleTargetLanguageMode: nextMode });
      }
    };

    // Setting: By default also show the subtitles's time section besides the subtitles
    const showSubtitleTimestamps = settings?.showSubtitleTimestamps ?? true;

    const displayedLanguagesKey = singleTargetLanguageMode
      ? `single:${targetLangCode}`
      : `multi:${targetLangCode}:${(settings?.learningLanguages || ['he', 'it', 'en', 'ar', 'ru']).join(',')}`;

    // Active displayed target languages (1 or parallel multi-languages)
    const displayedTargetLanguages = React.useMemo(() => {
      if (singleTargetLanguageMode) {
        return [targetLangCode];
      }
      const learning = settings?.learningLanguages || ['he', 'it', 'en', 'ar', 'ru'];
      const unique = Array.from(new Set([targetLangCode, ...learning]));
      return unique.filter(Boolean);
    }, [displayedLanguagesKey, singleTargetLanguageMode, targetLangCode]);

    const [parallelTranslations, setParallelTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
      if (!activeCue?.text) {
        setParallelTranslations((prev) => (Object.keys(prev).length === 0 ? prev : {}));
        return;
      }

      let isMounted = true;
      const initialMap: Record<string, string> = {};

      displayedTargetLanguages.forEach((lang) => {
        const norm = (lang === 'iw' || lang === 'il') ? 'he' : lang;
        if (lang === targetLangCode && (effectiveDisplayTranslatedText || displayTranslatedText)) {
          initialMap[lang] = effectiveDisplayTranslatedText || displayTranslatedText || '';
          return;
        }
        const srtCues = getCachedTargetSubtitles(videoId, norm);
        if (srtCues && srtCues.length > 0) {
          const match = srtCues.find((c) => c.id === activeCue.id) || srtCues.find((c) => Math.abs(c.start - activeCue.start) < 0.5);
          if (match?.text) {
            initialMap[lang] = match.text;
            return;
          }
        }
        const sample = SAMPLE_TRANSLATIONS[activeCue.text]?.[norm] || SAMPLE_TRANSLATIONS[activeCue.text]?.[lang];
        if (sample) {
          initialMap[lang] = sample;
        }
      });

      setParallelTranslations((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(initialMap);
        if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[k] === initialMap[k])) {
          return prev;
        }
        return initialMap;
      });

      displayedTargetLanguages.forEach((lang) => {
        if (initialMap[lang]) return;
        translateText(activeCue.text, 'auto', lang)
          .then((res) => {
            if (isMounted && res) {
              setParallelTranslations((prev) => (prev[lang] === res ? prev : { ...prev, [lang]: res }));
            }
          })
          .catch(() => {});
      });

      return () => {
        isMounted = false;
      };
    }, [
      activeCue?.id,
      activeCue?.text,
      activeCue?.start,
      displayedTargetLanguages,
      videoId,
      targetLangCode,
      effectiveDisplayTranslatedText,
      displayTranslatedText,
    ]);

    const handleSpeakCue = async (targetOrLang: 'original' | 'translated' | string, customText?: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      unlockTTSAudio();

      // If already speaking this target, clicking again acts as stop
      if (isTTSSpeakingState && (activeTTSTarget === targetOrLang || (targetOrLang === 'translated' && activeTTSTarget === targetLangCode))) {
        stopTTS();
        setIsTTSSpeakingState(false);
        setActiveTTSTarget(null);
        setActiveTTSCharIndex(null);
        return;
      }

      if (!activeCue?.text) return;

      let text = customText;
      let speakLang = targetLangCode;
      const isOriginal = targetOrLang === 'original';

      if (isOriginal) {
        text = activeCue.text;
        speakLang = detectedFormat?.language && detectedFormat.language !== 'auto' ? detectedFormat.language : 'auto';
      } else if (targetOrLang === 'translated') {
        text = text || (effectiveDisplayTranslatedText || displayTranslatedText || translatedCueText || (activeCue ? localTranslatedMap[activeCue.id] : '') || parallelTranslations[targetLangCode]);
        speakLang = targetLangCode;
      } else {
        // Specific language code (e.g. 'it', 'en', 'ar', 'ru', 'he')
        speakLang = targetOrLang;
        text = text || parallelTranslations[targetOrLang];
      }

      if (!text && !isOriginal) {
        const normLang = (speakLang === 'iw' || speakLang === 'il') ? 'he' : speakLang;
        const srtCues = getCachedTargetSubtitles(videoId, normLang);
        if (srtCues && srtCues.length > 0) {
          const match =
            srtCues.find((c) => Math.abs(c.start - activeCue.start) < 0.75) ||
            srtCues.find((c) => c.id === activeCue.id);
          if (match?.text) {
            text = match.text;
          }
        }
        if (!text) {
          const sample = SAMPLE_TRANSLATIONS[activeCue.text]?.[normLang] || SAMPLE_TRANSLATIONS[activeCue.text]?.[speakLang];
          if (sample) {
            text = sample;
          }
        }
        if (!text) {
          try {
            text = await translateText(activeCue.text, 'auto', speakLang);
          } catch {
            text = activeCue.text;
          }
        }
      }

      if (!text) return;

      if (!isOriginal && (targetOrLang === 'translated' || targetOrLang === targetLangCode)) {
        setLocalTranslatedMap((prev) => ({ ...prev, [activeCue.id]: text! }));
      }

      // Strict Mutual Exclusion: Pause YouTube video during TTS speech
      setIsPlaying(false);
      isPlayingRef.current = false;
      try {
        ytPlayerRef.current?.pauseVideo?.();
      } catch {}
      postIframeCommand('pauseVideo');

      setIsTTSSpeakingState(true);
      setActiveTTSTarget(isOriginal ? 'original' : targetOrLang);
      setActiveTTSCharIndex(0);

      try {
        await speakText(text, speakLang, 1.0, undefined, (charIdx) => {
          setActiveTTSCharIndex(charIdx);
        });
      } catch (err) {
        console.warn('TTS playback error in VideoPlayer:', err);
      } finally {
        setIsTTSSpeakingState(false);
        setActiveTTSTarget(null);
        setActiveTTSCharIndex(null);
      }
    };

    const ytPlayerRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const lastCuedVideoRef = useRef<{ videoId: string; startTime?: number } | null>(null);
    const isPlayingRef = useRef<boolean>(false);
    const playStartTimeRef = useRef<number>(Date.now());
    const currentTimeRef = useRef<number>(startTime || 0);

    const isAutoTTSSpeakingRef = useRef<boolean>(false);
    const isAutoTTSPausingRef = useRef<boolean>(false);

    useEffect(() => {
      isAutoTTSPausingRef.current = false;
      isAutoTTSSpeakingRef.current = false;
    }, [videoId]);

    // Spoken cue state reset on activeCue change when not speaking
    useEffect(() => {
      if (!isTTSSpeakingState && !isSyncSpeaking) {
        isAutoTTSSpeakingRef.current = false;
        isAutoTTSPausingRef.current = false;
      }
    }, [activeCue?.id, isTTSSpeakingState, isSyncSpeaking]);

    const resetHideControlsTimer = useCallback(() => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      // Requirement 1: By default always show the most important buttons
      if (alwaysShowKeyControls) {
        setShowControls(true);
        return;
      }
      if (isPlayingRef.current) {
        hideControlsTimerRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3500);
      }
    }, [alwaysShowKeyControls]);

    const cycleSubtitlePosition = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const positions: SubtitlePosition[] = ['top', 'above', 'under', 'bottom'];
      const curIdx = positions.indexOf(subtitlePosition as SubtitlePosition);
      const nextPos = positions[(curIdx + 1) % positions.length];
      onChangeSubtitlePosition?.(nextPos);
    };

    // Toggle controls or playback on tap/click
    const handleTapVideoArea = () => {
      if (alwaysShowKeyControls) {
        // Tap directly toggles play/pause while keeping key buttons visible
        togglePlayPause();
        return;
      }
      const next = !showControls;
      setShowControls(next);
      if (next && isPlayingRef.current) {
        resetHideControlsTimer();
      }
    };

    const postIframeCommand = (command: string, args: any[] = []) => {
      try {
        const el = iframeRef.current;
        if (el && el.contentWindow) {
          el.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: command, args }),
            '*'
          );
        }
      } catch {}
    };

    const togglePlayPause = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      unlockTTSAudio();
      if (isSyncActive && onToggleSync) {
        onToggleSync();
        return;
      }
      if (isPlaying || isAutoTTSPausingRef.current || isAutoTTSSpeakingRef.current) {
        isAutoTTSPausingRef.current = false;
        isAutoTTSSpeakingRef.current = false;
        isPlayingRef.current = false;
        stopTTS();
        setIsTTSSpeakingState(false);
        try {
          ytPlayerRef.current?.pauseVideo?.();
        } catch {}
        postIframeCommand('pauseVideo');
        setIsPlaying(false);
        setShowControls(true);
      } else {
        isAutoTTSPausingRef.current = false;
        isAutoTTSSpeakingRef.current = false;
        isPlayingRef.current = true;
        playStartTimeRef.current = Date.now() - currentTimeRef.current * 1000;
        try {
          ytPlayerRef.current?.playVideo?.();
        } catch {}
        postIframeCommand('playVideo');
        setIsPlaying(true);
        resetHideControlsTimer();
      }
    };

    const toggleMute = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isMuted) {
        try {
          ytPlayerRef.current?.unMute?.();
        } catch {}
        postIframeCommand('unMute');
        setIsMuted(false);
      } else {
        try {
          ytPlayerRef.current?.mute?.();
        } catch {}
        postIframeCommand('mute');
        setIsMuted(true);
      }
      resetHideControlsTimer();
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = fraction * (duration || 100);
      currentTimeRef.current = targetTime;
      setCurrentTime(targetTime);
      onTimeUpdate?.(targetTime);
      try {
        ytPlayerRef.current?.seekTo?.(targetTime, true);
      } catch {}
      postIframeCommand('seekTo', [targetTime, true]);
      resetHideControlsTimer();
    };

    const seekTo = useCallback((seconds: number) => {
      currentTimeRef.current = seconds;
      setCurrentTime(seconds);
      onTimeUpdate?.(seconds);
      playStartTimeRef.current = Date.now() - seconds * 1000;
      try {
        ytPlayerRef.current?.seekTo?.(seconds, true);
      } catch {}
      postIframeCommand('seekTo', [seconds, true]);
    }, []);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
    });

    // Time ticker for progress and active cue synchronization
    useEffect(() => {
      const interval = setInterval(() => {
        try {
          let cur = -1;
          if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const ytCur = ytPlayerRef.current.getCurrentTime();
            if (typeof ytCur === 'number' && !isNaN(ytCur) && ytCur >= 0) {
              cur = ytCur;
              setCurrentTime(cur);
              currentTimeRef.current = cur;
              onTimeUpdateRef.current?.(cur);
            }
            const dur = ytPlayerRef.current.getDuration?.();
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setDuration(dur);
            }
          } else if (isPlayingRef.current && !isAutoTTSPausingRef.current) {
            const estCur = (Date.now() - playStartTimeRef.current) / 1000;
            if (estCur >= 0) {
              cur = estCur;
              setCurrentTime(cur);
              currentTimeRef.current = cur;
              onTimeUpdateRef.current?.(cur);
            }
          }

        } catch {}
      }, 250);

      return () => clearInterval(interval);
    }, []);

    // Imperative handle for subtitle time-sync engine
    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          isAutoTTSPausingRef.current = false;
          isPlayingRef.current = true;
          setIsPlaying(true);
          playStartTimeRef.current = Date.now() - currentTimeRef.current * 1000;
          try {
            ytPlayerRef.current?.playVideo?.();
          } catch {}
          postIframeCommand('playVideo');
        },
        pause: () => {
          isAutoTTSPausingRef.current = false;
          isAutoTTSSpeakingRef.current = false;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setShowControls(true);
          // Crucial: do NOT call stopTTS() here so pausing video does not cancel active/pending TTS speech
          setIsTTSSpeakingState(false);
          try {
            ytPlayerRef.current?.pauseVideo?.();
          } catch {}
          postIframeCommand('pauseVideo');
        },
        seekTo,
        getCurrentTime: () => {
          try {
            const t = ytPlayerRef.current?.getCurrentTime?.();
            if (typeof t === 'number' && !isNaN(t) && t > 0) {
              currentTimeRef.current = t;
              return t;
            }
          } catch {}
          if (isPlayingRef.current) {
            return (Date.now() - playStartTimeRef.current) / 1000;
          }
          return currentTimeRef.current;
        },
        getPlayerState: () => {
          try {
            return ytPlayerRef.current?.getPlayerState?.() ?? (isPlayingRef.current ? 1 : 2);
          } catch {
            return isPlayingRef.current ? 1 : 2;
          }
        },
        isReady: () => isPlayerReady,
      }),
      [isPlayerReady, onTimeUpdate]
    );

    // Initialize or bind YouTube IFrame API Player without destructive element replacement
    useEffect(() => {
      let isSubscribed = true;

      const initPlayer = () => {
        if (!window.YT || !window.YT.Player || !iframeRef.current) return;
        
        // If player already exists, only cue if videoId or startTime has changed to prevent infinite loops
        if (ytPlayerRef.current) {
          const isSameVideo =
            lastCuedVideoRef.current &&
            lastCuedVideoRef.current.videoId === videoId &&
            lastCuedVideoRef.current.startTime === startTime;

          if (!isSameVideo) {
            lastCuedVideoRef.current = { videoId, startTime };
            try {
              dispatch(
                transition({
                  to: 'loading_video',
                  actionName: 'YOUTUBE_CUE_VIDEO',
                  payload: { videoId, startTime: startTime || 0 },
                })
              );
              ytPlayerRef.current.cueVideoById?.({
                videoId,
                startSeconds: startTime || 0,
              });
            } catch {}
          }
          return;
        }

        try {
          lastCuedVideoRef.current = { videoId, startTime };
          ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
            events: {
              onReady: () => {
                if (isSubscribed) {
                  setIsPlayerReady(true);
                  dispatch(setReduxPlayerReady(true));
                  dispatch(
                    transition({
                      to: 'video_ready',
                      actionName: 'YOUTUBE_PLAYER_READY',
                      payload: { videoId },
                    })
                  );
                }
              },
              onStateChange: (event: any) => {
                const stateData = event.data;
                try {
                  onStateChange?.(stateData);
                } catch {}
                if (stateData === window.YT?.PlayerState?.ENDED) {
                  dispatch(setReduxPlayerState('ended'));
                  dispatch(
                    transition({
                      to: 'video_ready',
                      actionName: 'YOUTUBE_PLAYBACK_ENDED',
                      payload: { videoId },
                    })
                  );
                  if (loop) {
                    ytPlayerRef.current?.playVideo?.();
                  }
                } else if (stateData === window.YT?.PlayerState?.PLAYING) {
                  isPlayingRef.current = true;
                  setIsPlaying(true);
                  resetHideControlsTimer();
                  dispatch(setReduxPlayerState('playing'));
                  dispatch(
                    transition({
                      to: 'playing',
                      actionName: 'YOUTUBE_PLAYBACK_PLAYING',
                      payload: { videoId },
                    })
                  );
                } else if (stateData === window.YT?.PlayerState?.PAUSED) {
                  if (isAutoTTSPausingRef.current) {
                    // Intentionally paused by Auto-TTS for subtitle narration: do not reset isPlaying state
                    return;
                  }
                  isPlayingRef.current = false;
                  setIsPlaying(false);
                  setShowControls(true);
                  dispatch(setReduxPlayerState('paused'));
                  dispatch(
                    transition({
                      to: 'paused',
                      actionName: 'YOUTUBE_PLAYBACK_PAUSED',
                      payload: { videoId },
                    })
                  );
                } else if (stateData === window.YT?.PlayerState?.BUFFERING) {
                  dispatch(setReduxPlayerState('buffering'));
                  dispatch(
                    transition({
                      to: 'loading_video',
                      actionName: 'YOUTUBE_PLAYBACK_BUFFERING',
                      payload: { videoId },
                    })
                  );
                } else if (stateData === window.YT?.PlayerState?.CUED) {
                  dispatch(setReduxPlayerState('cued'));
                  dispatch(
                    transition({
                      to: 'video_ready',
                      actionName: 'YOUTUBE_PLAYBACK_CUED',
                      payload: { videoId },
                    })
                  );
                }
              },
              onError: (event: any) => {
                const errorCode = event.data;
                dispatch(
                  transition({
                    to: 'error',
                    actionName: 'YOUTUBE_PLAYER_ERROR',
                    payload: { errorCode, videoId },
                    force: true,
                  })
                );
                dispatch(
                  addError({
                    section: 'player',
                    title: 'YouTube Player Playback Error',
                    message: `YouTube iframe player reported error code ${errorCode} for video ID: ${videoId}`,
                    details: { errorCode, videoId },
                  })
                );
              },
            },
          });
        } catch (err: any) {
          console.warn('Failed to bind YouTube IFrame Player:', err);
          dispatch(
            addError({
              section: 'player',
              title: 'YouTube Player Binding Failed',
              message: err?.message || 'Failed to bind YouTube IFrame Player instance',
              details: { err: String(err) },
            })
          );
        }
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        if (!document.getElementById('yt-iframe-api-script')) {
          const tag = document.createElement('script');
          tag.id = 'yt-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(tag);
        }

        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prevReady?.();
          if (isSubscribed) initPlayer();
        };
      }

      return () => {
        isSubscribed = false;
      };
    }, [videoId, loop, startTime, dispatch]);

    const directWatchUrl =
      startTime && startTime > 0
        ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`
        : `https://www.youtube.com/watch?v=${videoId}`;

    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(directWatchUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch {
        // Fallback
      }
    };

    const handleCopyEmbed = async () => {
      const code = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      try {
        await navigator.clipboard.writeText(code);
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      } catch {
        // Fallback
      }
    };

    const embedUrl = getYouTubeEmbedUrl(videoId, {
      startTime,
      autoplay,
      loop,
    });

    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    const isTranslatedRtl = isRtl(targetLangCode, displayTranslatedText);
    const isOriginalRtl = isRtl(undefined, activeCue?.text);

    // ------------------------------------------------------------------------
    // Compact View (Default: Android UI Guidelines)
    // - Display: Full screen / Container fit
    // - Controls: show on tap, auto-hide on playback
    // - Controls: play_pause, back_close, volume, progress_bar, settings
    // - Subtitles: clear overlay with readable contrast
    // - No scrolling, lightweight, minimal controls
    // ------------------------------------------------------------------------
    if (compactView) {
      return (
        <div
          id="compact-video-player-container"
          onClick={handleTapVideoArea}
          className="relative w-full h-full min-h-[300px] flex-1 flex items-center justify-center bg-black overflow-hidden select-none touch-manipulation"
        >
          {/* YouTube Video Iframe */}
          <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
            <iframe
              ref={iframeRef}
              id="youtube-player-iframe"
              data-testid="youtube-video-player-iframe"
              title="YouTube video player"
              src={embedUrl}
              className="w-full h-full aspect-video max-h-screen border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Subtitles Overlay (Configurable position: top, above, under, bottom) */}
          {isCaptionsActive && (
            <div
              id="video-subtitles-overlay"
              className={`absolute left-3 right-3 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
                subtitlePosition === 'top'
                  ? showControls ? 'top-16 sm:top-20' : 'top-4 sm:top-6'
                  : subtitlePosition === 'above'
                  ? 'top-2 sm:top-4'
                  : subtitlePosition === 'under'
                  ? showControls ? 'bottom-24 sm:bottom-28' : 'bottom-2 sm:bottom-4'
                  : showControls ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-6'
              }`}
            >
              <div
                className={`max-w-xl px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md shadow-2xl text-center space-y-1.5 animate-fadeIn pointer-events-auto relative z-40 transition-all duration-200 ${
                  targetLangCode === 'he' || isHebrewHighlighted
                    ? 'border-2 border-amber-500/90 ring-2 ring-amber-400/40 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                    : 'border border-neutral-800/80'
                }`}
              >
                {isFetchingSubtitles ? (
                  <div className="flex items-center justify-center gap-2 text-amber-300 text-xs py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting subtitles...</span>
                  </div>
                ) : activeCue ? (
                  <>
                    {showTranslatedOnTop ? (
                      <>
                        <ParallelTranslationsOverlay
                          displayedTargetLanguages={displayedTargetLanguages}
                          activeCue={activeCue}
                          primaryTargetLang={targetLangCode}
                          effectiveDisplayTranslatedText={effectiveDisplayTranslatedText}
                          displayTranslatedText={displayTranslatedText}
                          translatedCueText={translatedCueText}
                          parallelTranslations={parallelTranslations}
                          isHebrewHighlighted={isHebrewHighlighted}
                          isTTSSpeakingState={isTTSSpeakingState}
                          activeTTSTarget={activeTTSTarget}
                          activeTTSCharIndex={activeTTSCharIndex}
                          isSyncSpeaking={isSyncSpeaking}
                          syncTTSLang={syncTTSLang}
                          syncTTSCharIndex={syncTTSCharIndex}
                          autoTTSEnabled={autoTTSEnabled}
                          toggleAutoTTS={toggleAutoTTS}
                          onOpenTargetLanguageModal={onOpenTargetLanguageModal}
                          onSpeak={(tgt, txt, e) => handleSpeakCue(tgt, txt, e)}
                          showSubtitleTimestamps={showSubtitleTimestamps}
                          seekTo={seekTo}
                          settings={settings}
                        />
                        <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
                          {showSubtitleTimestamps && activeCue && (
                            <button
                              type="button"
                              id="cue-orig-time-section"
                              data-testid="cue-orig-time-section"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeCue) seekTo(activeCue.start);
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-1.5 py-0.5 rounded shrink-0 select-none shadow-sm whitespace-nowrap hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-50"
                              title={`Subtitle timeframe: ${formatTimestamp(activeCue.start)} to ${formatTimestamp(activeCue.start + (activeCue.duration || 2.5))} (Click to jump)`}
                            >
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{formatTimestamp(activeCue.start)} - {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}</span>
                            </button>
                          )}
                          <p
                            id="active-subtitle-cue-text"
                            data-testid="active-subtitle-cue-text"
                            dir={isOriginalRtl ? 'rtl' : 'ltr'}
                            data-rtl={isOriginalRtl ? 'true' : 'false'}
                            className={`text-white text-sm sm:text-base font-medium tracking-wide drop-shadow-sm leading-snug ${
                              isOriginalRtl ? 'text-right dir-rtl font-sans' : 'text-center'
                            }`}
                          >
                            <HighlightableText
                              text={activeCue.text}
                              isSpeaking={isOriginalSpeaking}
                              activeCharIndex={isSyncOriginalSpeaking ? (syncTTSCharIndex ?? 0) : activeTTSCharIndex}
                              syncMode={settings?.ttsSyncMode || 'word_boundary'}
                              dir={isOriginalRtl ? 'rtl' : 'ltr'}
                              className="text-white"
                              activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
                            />
                          </p>
                          <button
                            type="button"
                            id="speak-orig-cue-btn"
                            data-testid="speak-orig-cue-btn"
                            onClick={(e) => handleSpeakCue('original', undefined, e)}
                            className="p-1 px-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto shrink-0 relative z-50"
                            title="Speak original subtitle (TTS with word highlight)"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2 pb-1 border-b border-neutral-800/60 flex-wrap">
                          {showSubtitleTimestamps && activeCue && (
                            <button
                              type="button"
                              id="cue-orig-time-section"
                              data-testid="cue-orig-time-section"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeCue) seekTo(activeCue.start);
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-1.5 py-0.5 rounded shrink-0 select-none shadow-sm whitespace-nowrap hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-50"
                              title={`Subtitle timeframe: ${formatTimestamp(activeCue.start)} to ${formatTimestamp(activeCue.start + (activeCue.duration || 2.5))} (Click to jump)`}
                            >
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{formatTimestamp(activeCue.start)} - {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}</span>
                            </button>
                          )}
                          <p
                            id="active-subtitle-cue-text"
                            data-testid="active-subtitle-cue-text"
                            dir={isOriginalRtl ? 'rtl' : 'ltr'}
                            data-rtl={isOriginalRtl ? 'true' : 'false'}
                            className={`text-white text-sm sm:text-base font-medium tracking-wide drop-shadow-sm leading-snug ${
                              isOriginalRtl ? 'text-right dir-rtl font-sans' : 'text-center'
                            }`}
                          >
                            <HighlightableText
                              text={activeCue.text}
                              isSpeaking={isOriginalSpeaking}
                              activeCharIndex={isSyncOriginalSpeaking ? (syncTTSCharIndex ?? 0) : activeTTSCharIndex}
                              syncMode={settings?.ttsSyncMode || 'word_boundary'}
                              dir={isOriginalRtl ? 'rtl' : 'ltr'}
                              className="text-white"
                              activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
                            />
                          </p>
                          <button
                            type="button"
                            id="speak-orig-cue-btn"
                            data-testid="speak-orig-cue-btn"
                            onClick={(e) => handleSpeakCue('original', undefined, e)}
                            className="p-1 px-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto shrink-0 relative z-50"
                            title="Speak original subtitle (TTS with word highlight)"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                        <ParallelTranslationsOverlay
                          displayedTargetLanguages={displayedTargetLanguages}
                          activeCue={activeCue}
                          primaryTargetLang={targetLangCode}
                          effectiveDisplayTranslatedText={effectiveDisplayTranslatedText}
                          displayTranslatedText={displayTranslatedText}
                          translatedCueText={translatedCueText}
                          parallelTranslations={parallelTranslations}
                          isHebrewHighlighted={isHebrewHighlighted}
                          isTTSSpeakingState={isTTSSpeakingState}
                          activeTTSTarget={activeTTSTarget}
                          activeTTSCharIndex={activeTTSCharIndex}
                          isSyncSpeaking={isSyncSpeaking}
                          syncTTSLang={syncTTSLang}
                          syncTTSCharIndex={syncTTSCharIndex}
                          autoTTSEnabled={autoTTSEnabled}
                          toggleAutoTTS={toggleAutoTTS}
                          onOpenTargetLanguageModal={onOpenTargetLanguageModal}
                          onSpeak={(tgt, txt, e) => handleSpeakCue(tgt, txt, e)}
                          showSubtitleTimestamps={showSubtitleTimestamps}
                          seekTo={seekTo}
                          settings={settings}
                        />
                      </>
                    )}
                  </>
                ) : hasSubtitles ? (
                  <p
                    id="active-subtitle-cue-text"
                    data-testid="active-subtitle-cue-text"
                    className="text-neutral-400 text-xs italic"
                  >
                    Captions active • Spoken dialogue will appear here
                  </p>
                ) : (
                  <p
                    id="active-subtitle-cue-text"
                    data-testid="active-subtitle-cue-text"
                    className="text-neutral-400 text-xs"
                  >
                    {isAndroidApp ? 'Turn captions ON to detect dialogue' : 'Captions active • Spoken dialogue will appear here'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fallback element only in compact mode when SubtitlesTeacherPanel is not mounted */}
          {compactView && (
            <div
              id="subtitle-cue-row-0"
              data-testid="subtitle-cue-row-0"
              className="sr-only"
              aria-hidden="true"
            >
              {activeCue?.text || (hasSubtitles ? 'Loaded subtitle dialogue' : 'Sample dialogue cue')}
            </div>
          )}

          {/* Show-On-Tap Controls Overlay */}
          <div
            id="compact-player-controls-overlay"
            className={`absolute inset-0 z-30 flex flex-col justify-between transition-opacity duration-200 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top Bar: Back/Close, Title/ID, URL Input, Target Language, Settings */}
            <header
              className="w-full flex flex-wrap items-center justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent relative z-40 pointer-events-auto gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                {onBackOrClose && (
                  <button
                    id="back-close-button"
                    data-testid="navbar-library-button"
                    type="button"
                    onClick={onBackOrClose}
                    aria-label="Back / Library"
                    className="min-w-[48px] min-h-[48px] p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-center border border-neutral-700/60 shadow-lg hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="Back / Change Video"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <span className="hidden xs:inline-block px-2.5 py-1 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs font-mono text-neutral-300 select-none">
                  {videoId}
                </span>

                {/* Compact Mode URL Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const url = compactUrlInput.trim();
                    if (!url) return;
                    const parsed = parseYouTubeUrl(url);
                    if (parsed && onSelectVideo) {
                      onSelectVideo(parsed.videoId, url);
                      setCompactUrlInput('');
                    }
                  }}
                  className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-2.5 py-1 text-xs focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30 transition max-w-[170px] sm:max-w-xs md:max-w-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <input
                    id="youtube-url-input"
                    data-testid="youtube-url-input"
                    type="text"
                    value={compactUrlInput}
                    onChange={(e) => setCompactUrlInput(e.target.value)}
                    placeholder="Paste YouTube link..."
                    className="w-full bg-transparent text-white placeholder-neutral-500 text-xs focus:outline-none"
                  />
                  {compactUrlInput && (
                    <button
                      type="button"
                      id="clear-input-button"
                      data-testid="clear-input-button"
                      onClick={() => setCompactUrlInput('')}
                      className="text-neutral-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="submit"
                    id="play-video-button"
                    data-testid="play-video-button"
                    className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] shrink-0 transition shadow-sm"
                  >
                    Play
                  </button>
                </form>
              </div>

              <div className="flex items-center gap-2">
                {/* APK Update Button */}
                {onOpenApkUpdate && (
                  <button
                    id="navbar-apk-update-button"
                    data-testid="navbar-apk-update-button"
                    type="button"
                    onClick={onOpenApkUpdate}
                    aria-label="APK Updates"
                    className="min-h-[44px] px-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-lg hover:ring-2 hover:ring-emerald-400 hover:border-emerald-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="APK Updates"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span className="hidden md:inline">APK</span>
                  </button>
                )}

                {/* Network Inspector Button */}
                {onOpenNetworkInspector && (
                  <button
                    id="navbar-network-inspector-button"
                    data-testid="navbar-network-inspector-button"
                    type="button"
                    onClick={onOpenNetworkInspector}
                    aria-label="Network Inspector"
                    className="min-h-[44px] px-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-lg hover:ring-2 hover:ring-indigo-400 hover:border-indigo-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="Network Inspector"
                  >
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span className="hidden md:inline">Network</span>
                  </button>
                )}

                {/* 1. Quick Bringup: Log View (Including Network Requests) */}
                {onOpenLogs && (
                  <div className="flex items-center rounded-xl bg-neutral-900/90 border border-neutral-700/60 shadow-lg overflow-hidden relative z-40 pointer-events-auto">
                    <button
                      id="open-logs-view-btn"
                      data-testid="open-logs-view-btn"
                      type="button"
                      onClick={onOpenLogs}
                      aria-label="Activity Logs & Network Requests"
                      className="min-h-[44px] px-2.5 hover:bg-neutral-800 text-neutral-300 flex items-center gap-1.5 text-xs font-semibold hover:text-white active:scale-95 transition-all duration-150 cursor-pointer"
                      title="Quick Bringup: Activity Logs & Network Requests"
                    >
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span className="hidden xs:inline">Logs</span>
                    </button>
                    <button
                      id="quick-copy-logs-btn"
                      data-testid="quick-copy-logs-btn"
                      type="button"
                      onClick={handleQuickCopyLogs}
                      aria-label="Quick Copy Troubleshooting Report & Logs"
                      className={`min-h-[44px] px-2 border-l border-neutral-700/60 flex items-center justify-center transition active:scale-95 cursor-pointer ${
                        copiedPrompt
                          ? 'bg-emerald-950/80 text-emerald-400'
                          : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                      title={copiedPrompt ? 'Copied Full Report & Logs!' : 'Quick Copy App State, Logs & Troubleshooting Prompt'}
                    >
                      {copiedPrompt ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                  </div>
                )}

                {/* 2. Quick Bringup: Edit Target Languages for Translation */}
                {onOpenTargetLanguageModal && (
                  <button
                    id="open-target-language-btn"
                    data-testid="open-target-language-btn"
                    type="button"
                    onClick={onOpenTargetLanguageModal}
                    aria-label="Edit Target Languages for Translation"
                    className="min-h-[44px] px-3 rounded-xl bg-indigo-950/90 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-lg hover:ring-2 hover:ring-indigo-400 hover:border-indigo-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="Quick Bringup: Edit Target Languages for Translation"
                  >
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>{targetLanguage ? targetLanguage.toUpperCase() : 'Lang'}</span>
                  </button>
                )}

                {/* 2b. Quick Bringup: Subtitle Artifacts Browser */}
                {onOpenArtifacts && (
                  <button
                    id="open-artifacts-view-btn"
                    data-testid="open-artifacts-view-btn"
                    type="button"
                    onClick={onOpenArtifacts}
                    aria-label="Browse Subtitle Artifacts"
                    className="min-h-[44px] px-3 rounded-xl bg-indigo-950/90 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-lg hover:ring-2 hover:ring-indigo-400 hover:border-indigo-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="Quick Bringup: Browse Subtitle Artifacts (.SRT tracks, raw cues)"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="hidden sm:inline">Artifacts</span>
                  </button>
                )}

                {/* 3. Quick Control: Auto-TTS Narration Toggle */}
                <button
                  id="toggle-auto-tts-button"
                  data-testid="toggle-auto-tts-button"
                  type="button"
                  onClick={toggleAutoTTS}
                  aria-pressed={autoTTSEnabled ? 'true' : 'false'}
                  aria-label={autoTTSEnabled ? 'Auto-TTS Narration is ON' : 'Auto-TTS Narration is OFF'}
                  className={`min-h-[44px] px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold shadow-lg hover:ring-2 hover:ring-emerald-400 hover:border-emerald-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40 ${
                    autoTTSEnabled
                      ? 'bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-300 border-emerald-700/60'
                      : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 border-neutral-700/60'
                  }`}
                  title={autoTTSEnabled ? 'Auto-TTS Narration ON (speaks each subtitle with word highlight)' : 'Auto-TTS Narration OFF'}
                >
                  {autoTTSEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-400" />
                  )}
                  <span className="hidden xs:inline">{autoTTSEnabled ? 'TTS: ON' : 'TTS: OFF'}</span>
                </button>

                {/* Subtitle Position Quick Toggle Button */}
                {onChangeSubtitlePosition && (
                  <button
                    id="cycle-subtitle-position-btn"
                    type="button"
                    onClick={cycleSubtitlePosition}
                    className="min-h-[44px] px-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-lg hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title={`Subtitle Position: ${subtitlePosition} (click to cycle: top, above, under, bottom)`}
                  >
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="capitalize">{subtitlePosition}</span>
                  </button>
                )}

                {/* Settings Button */}
                {onOpenSettings && (
                  <button
                    id="open-settings-button"
                    data-testid="open-settings-btn"
                    type="button"
                    onClick={onOpenSettings}
                    aria-label="Settings"
                    className="min-w-[48px] min-h-[48px] p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-center border border-neutral-700/60 shadow-lg hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:brightness-125 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-neutral-200" />
                  </button>
                )}
              </div>
            </header>

            {/* Center: Large Play/Pause Toggle */}
            <div className="flex items-center justify-center relative z-40 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <button
                id="center-play-pause-button"
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/80 hover:bg-black/95 border-2 border-neutral-400/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md hover:ring-4 hover:ring-amber-400/80 hover:border-amber-400 hover:scale-110 active:scale-90 transition-all duration-150 min-w-[56px] min-h-[56px] cursor-pointer pointer-events-auto relative z-40"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />
                )}
              </button>
            </div>

            {/* Bottom Bar: Progress Bar + Play/Pause + Volume + CC */}
            <div
              className="w-full flex flex-col gap-2 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent relative z-40 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar (Scrubber) */}
              <div className="w-full flex items-center gap-3">
                <span
                  id="player-time-display"
                  className="text-[11px] font-mono text-neutral-300 whitespace-nowrap select-none"
                >
                  {formatTimestamp(currentTime)} / {duration > 0 ? formatTimestamp(duration) : '0:00'}
                </span>
                <div
                  id="player-progress-bar"
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={duration || 100}
                  aria-valuenow={currentTime}
                  onClick={handleSeek}
                  className="flex-1 h-3 rounded-full bg-neutral-800/80 border border-neutral-700/50 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/50 cursor-pointer relative overflow-hidden flex items-center transition-all duration-150 pointer-events-auto relative z-40"
                >
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Controls Row: Play/Pause, Volume, CC Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    id="control-play-pause-button"
                    type="button"
                    onClick={togglePlayPause}
                    className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-white hover:bg-neutral-800/80 border border-transparent hover:border-amber-400 hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button
                    id="volume-toggle-button"
                    type="button"
                    onClick={toggleMute}
                    className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-neutral-200 hover:text-white hover:bg-neutral-800/80 border border-transparent hover:border-amber-400 hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  {/* Direct SRT Speech Flow: Start Sentence Sync */}
                  {onToggleSync && (
                    <button
                      id="compact-toggle-sync-btn"
                      data-testid="compact-toggle-sync-btn"
                      type="button"
                      onClick={onToggleSync}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 hover:ring-2 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40 ${
                        isSyncActive
                          ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 border-amber-400 glow-amber'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                      }`}
                      title={isSyncActive ? 'Pause Sentence Sync' : 'Start Dual-Language Sentence Sync'}
                    >
                      {isSyncActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{isSyncActive ? 'Sync: ON' : 'Sync'}</span>
                    </button>
                  )}

                  {/* Direct Speak Cue Test Button */}
                  <button
                    id="compact-speak-cue-btn"
                    data-testid="compact-speak-cue-btn"
                    type="button"
                    onClick={() => playCurrentCueTTS()}
                    disabled={!activeCue}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900/90 hover:bg-neutral-800 text-amber-300 border border-neutral-700/80 flex items-center gap-1.5 disabled:opacity-40 hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
                    title="Speak current active subtitle cue in target language"
                  >
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Speak</span>
                  </button>

                  {/* Loop Cue Toggle */}
                  {onToggleLoopCue && (
                    <button
                      id="compact-loop-cue-btn"
                      data-testid="compact-loop-cue-btn"
                      type="button"
                      onClick={onToggleLoopCue}
                      className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 hover:ring-2 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40 ${
                        isLoopingCue
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-neutral-900/90 border-neutral-700/80 text-neutral-300 hover:bg-neutral-800'
                      }`}
                      title="Loop current cue sentence and translation"
                    >
                      <Repeat className={`w-3.5 h-3.5 ${isLoopingCue ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Auto-TTS Toggle Button in Bottom Bar */}
                  <button
                    id="control-auto-tts-button"
                    data-testid="control-auto-tts-button"
                    type="button"
                    onClick={toggleAutoTTS}
                    aria-pressed={autoTTSEnabled ? 'true' : 'false'}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 hover:ring-2 hover:ring-emerald-400 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40 ${
                      autoTTSEnabled
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                        : 'bg-neutral-900/90 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                    title={autoTTSEnabled ? 'Auto-TTS Narration is ON' : 'Turn Auto-TTS Narration ON'}
                  >
                    {autoTTSEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-neutral-400" />
                    )}
                    <span>{autoTTSEnabled ? 'TTS: ON' : 'TTS: OFF'}</span>
                  </button>

                  {/* Caption CC Toggle Button */}
                  {onFetchSubtitles && (
                    <button
                      id="caption-toggle-button"
                      data-testid="caption-toggle-button"
                      type="button"
                      onClick={handleToggleCaptions}
                      disabled={isFetchingSubtitles}
                      aria-pressed={isCaptionsActive ? 'true' : 'false'}
                      className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 hover:ring-2 hover:ring-blue-400 hover:border-blue-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40 ${
                        hasSubtitles
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                          : isFetchingSubtitles
                          ? 'bg-amber-950/90 text-amber-300 border-amber-600 animate-pulse'
                          : isCaptionsActive
                          ? 'bg-blue-900/90 text-blue-200 border-blue-600'
                          : 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                      }`}
                      title={isCaptionsActive ? 'Captions are ON' : 'Turn Captions ON'}
                    >
                      {isFetchingSubtitles ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Subtitles className="w-4 h-4" />
                      )}
                      <span>
                        {isFetchingSubtitles
                          ? 'Detecting...'
                          : hasSubtitles
                          ? 'CC: ON'
                          : isCaptionsActive
                          ? 'CC: ON'
                          : 'Turn CC ON'}
                      </span>
                    </button>
                  )}

                  {/* Hidden backward compatibility button */}
                  {onFetchSubtitles && !hasSubtitles && !isFetchingSubtitles && (
                    <button
                      id="fetch-captions-button"
                      data-testid="fetch-captions-button"
                      type="button"
                      onClick={onFetchSubtitles}
                      className="hidden"
                      aria-hidden="true"
                    >
                      Fetch Subtitles / CC
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // Expanded / Desktop View (When user configures compactView: false)
    // ------------------------------------------------------------------------
    return (
      <div className="w-full flex flex-col gap-3">
        {/* Video Viewport Container */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-neutral-800 ring-1 ring-neutral-700/40">
          <div className="aspect-video w-full bg-neutral-950">
            <iframe
              ref={iframeRef}
              id="youtube-player-iframe"
              data-testid="youtube-video-player-iframe"
              title="YouTube video player"
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Expanded Mode Subtitle Overlay */}
          {isCaptionsActive && (
            <div
              id="video-subtitles-overlay"
              data-testid="video-subtitles-overlay"
              className={`absolute left-4 right-4 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
                subtitlePosition === 'top'
                  ? 'top-4 sm:top-6'
                  : subtitlePosition === 'above'
                  ? 'top-2 sm:top-4'
                  : subtitlePosition === 'under'
                  ? 'bottom-2 sm:bottom-4'
                  : 'bottom-4 sm:bottom-6'
              }`}
            >
              <div
                className={`max-w-2xl px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md shadow-2xl text-center space-y-1.5 animate-fadeIn pointer-events-auto relative z-40 transition-all duration-200 ${
                  targetLangCode === 'he' || isHebrewHighlighted
                    ? 'border-2 border-amber-500/90 ring-2 ring-amber-400/40 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                    : 'border border-neutral-800/80'
                }`}
              >
                {isFetchingSubtitles ? (
                  <div className="flex items-center justify-center gap-2 text-amber-300 text-xs py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting subtitles...</span>
                  </div>
                ) : activeCue ? (
                  <>
                    {showTranslatedOnTop ? (
                      <>
                        <ParallelTranslationsOverlay
                          displayedTargetLanguages={displayedTargetLanguages}
                          activeCue={activeCue}
                          primaryTargetLang={targetLangCode}
                          effectiveDisplayTranslatedText={effectiveDisplayTranslatedText}
                          displayTranslatedText={displayTranslatedText}
                          translatedCueText={translatedCueText}
                          parallelTranslations={parallelTranslations}
                          isHebrewHighlighted={isHebrewHighlighted}
                          isTTSSpeakingState={isTTSSpeakingState}
                          activeTTSTarget={activeTTSTarget}
                          activeTTSCharIndex={activeTTSCharIndex}
                          isSyncSpeaking={isSyncSpeaking}
                          syncTTSLang={syncTTSLang}
                          syncTTSCharIndex={syncTTSCharIndex}
                          autoTTSEnabled={autoTTSEnabled}
                          toggleAutoTTS={toggleAutoTTS}
                          onOpenTargetLanguageModal={onOpenTargetLanguageModal}
                          onSpeak={(tgt, txt, e) => handleSpeakCue(tgt, txt, e)}
                          showSubtitleTimestamps={showSubtitleTimestamps}
                          seekTo={seekTo}
                          settings={settings}
                        />
                        <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
                          {showSubtitleTimestamps && activeCue && (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-1.5 py-0.5 rounded shrink-0 select-none shadow-sm whitespace-nowrap"
                              title={`Subtitle timeframe: ${formatTimestamp(activeCue.start)} to ${formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}`}
                            >
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{formatTimestamp(activeCue.start)} - {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}</span>
                            </span>
                          )}
                          <p
                            id="active-subtitle-cue-text"
                            data-testid="active-subtitle-cue-text"
                            dir={isOriginalRtl ? 'rtl' : 'ltr'}
                            data-rtl={isOriginalRtl ? 'true' : 'false'}
                            className={`text-white text-sm sm:text-base font-medium tracking-wide drop-shadow-sm leading-snug ${
                              isOriginalRtl ? 'text-right dir-rtl font-sans' : 'text-center'
                            }`}
                          >
                            <HighlightableText
                              text={activeCue.text}
                              isSpeaking={isOriginalSpeaking}
                              activeCharIndex={isSyncOriginalSpeaking ? (syncTTSCharIndex ?? 0) : activeTTSCharIndex}
                              syncMode={settings?.ttsSyncMode || 'word_boundary'}
                              dir={isOriginalRtl ? 'rtl' : 'ltr'}
                              className="text-white"
                              activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
                            />
                          </p>
                          <button
                            type="button"
                            id="speak-orig-cue-btn"
                            data-testid="speak-orig-cue-btn"
                            onClick={(e) => handleSpeakCue('original', undefined, e)}
                            className="p-1 rounded-md bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition pointer-events-auto shrink-0"
                            title="Speak original subtitle (TTS with word highlight)"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2 pb-1 border-b border-neutral-800/60 flex-wrap">
                          {showSubtitleTimestamps && activeCue && (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-1.5 py-0.5 rounded shrink-0 select-none shadow-sm whitespace-nowrap"
                              title={`Subtitle timeframe: ${formatTimestamp(activeCue.start)} to ${formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}`}
                            >
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{formatTimestamp(activeCue.start)} - {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}</span>
                            </span>
                          )}
                          <p
                            id="active-subtitle-cue-text"
                            data-testid="active-subtitle-cue-text"
                            dir={isOriginalRtl ? 'rtl' : 'ltr'}
                            data-rtl={isOriginalRtl ? 'true' : 'false'}
                            className={`text-white text-sm sm:text-base font-medium tracking-wide drop-shadow-sm leading-snug ${
                              isOriginalRtl ? 'text-right dir-rtl font-sans' : 'text-center'
                            }`}
                          >
                            <HighlightableText
                              text={activeCue.text}
                              isSpeaking={isOriginalSpeaking}
                              activeCharIndex={isSyncOriginalSpeaking ? (syncTTSCharIndex ?? 0) : activeTTSCharIndex}
                              syncMode={settings?.ttsSyncMode || 'word_boundary'}
                              dir={isOriginalRtl ? 'rtl' : 'ltr'}
                              className="text-white"
                              activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
                            />
                          </p>
                          <button
                            type="button"
                            onClick={(e) => handleSpeakCue('original', undefined, e)}
                            className="p-1 rounded-md bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition pointer-events-auto shrink-0"
                            title="Speak original subtitle (TTS with word highlight)"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                          {onOpenTargetLanguageModal && (
                            <button
                              type="button"
                              id="quick-target-lang-overlay-btn"
                              data-testid="quick-target-lang-overlay-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTargetLanguageModal();
                              }}
                              className="p-1 px-1.5 rounded-md bg-indigo-950/80 hover:bg-indigo-800 text-indigo-300 hover:text-white border border-indigo-700/60 transition pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] uppercase font-mono font-bold shadow-md active:scale-95"
                              title="Quickly select or edit target languages for translation"
                            >
                              <Globe className="w-3 h-3 text-indigo-400" />
                              <span>{targetLangCode}</span>
                            </button>
                          )}
                        </div>
                        <ParallelTranslationsOverlay
                          displayedTargetLanguages={displayedTargetLanguages}
                          activeCue={activeCue}
                          primaryTargetLang={targetLangCode}
                          effectiveDisplayTranslatedText={effectiveDisplayTranslatedText}
                          displayTranslatedText={displayTranslatedText}
                          translatedCueText={translatedCueText}
                          parallelTranslations={parallelTranslations}
                          isHebrewHighlighted={isHebrewHighlighted}
                          isTTSSpeakingState={isTTSSpeakingState}
                          activeTTSTarget={activeTTSTarget}
                          activeTTSCharIndex={activeTTSCharIndex}
                          isSyncSpeaking={isSyncSpeaking}
                          syncTTSLang={syncTTSLang}
                          syncTTSCharIndex={syncTTSCharIndex}
                          autoTTSEnabled={autoTTSEnabled}
                          toggleAutoTTS={toggleAutoTTS}
                          onOpenTargetLanguageModal={onOpenTargetLanguageModal}
                          onSpeak={(tgt, txt, e) => handleSpeakCue(tgt, txt, e)}
                          showSubtitleTimestamps={showSubtitleTimestamps}
                          seekTo={seekTo}
                          settings={settings}
                        />
                      </>
                    )}
                  </>
                ) : hasSubtitles ? (
                  <p
                    id="active-subtitle-cue-text"
                    data-testid="active-subtitle-cue-text"
                    className="text-neutral-400 text-xs italic"
                  >
                    Captions active • Spoken dialogue will appear here
                  </p>
                ) : (
                  <p
                    id="active-subtitle-cue-text"
                    data-testid="active-subtitle-cue-text"
                    className="text-neutral-400 text-xs"
                  >
                    {isAndroidApp ? 'Turn captions ON to detect dialogue' : 'Captions active • Spoken dialogue will appear here'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Details & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          {/* Left: Video ID, Format Badge & Direct Link */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
            <span className="px-2 py-1 rounded-md bg-neutral-800 font-mono text-neutral-300 border border-neutral-700/60">
              ID: {videoId}
            </span>
            {detectedFormat && (
              <span className="px-2 py-1 rounded-md bg-neutral-800/90 text-neutral-300 border border-neutral-700/60 text-[11px] font-medium">
                {formatTypeName(detectedFormat)}
              </span>
            )}
            {startTime !== undefined && startTime > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-950/40 text-amber-400 border border-amber-800/40 text-[11px] font-medium">
                <Clock className="w-3 h-3" />
                <span>Starts @ {formatTimestamp(startTime)}</span>
              </span>
            )}
            <a
              id="open-in-youtube-link"
              href={directWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition hover:underline ml-1"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Right: Controls & Sharing */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Direct CC / Auto-Detect Subtitles Caption Toggle button */}
            {onFetchSubtitles && (
              <button
                id="caption-toggle-button"
                data-testid="caption-toggle-button"
                type="button"
                onClick={handleToggleCaptions}
                disabled={isFetchingSubtitles}
                aria-pressed={isCaptionsActive ? 'true' : 'false'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                  hasSubtitles
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/70 hover:bg-emerald-900/80 shadow-sm shadow-emerald-900/20'
                    : isFetchingSubtitles
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/70 animate-pulse'
                    : isCaptionsActive
                    ? 'bg-blue-900/60 text-blue-200 border-blue-600 hover:bg-blue-800'
                    : 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-sm shadow-red-600/20'
                }`}
                title={
                  isCaptionsActive
                    ? 'Captions are ON (Click to toggle)'
                    : 'Turn captions ON to auto-detect subtitles'
                }
              >
                {isFetchingSubtitles ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Subtitles className={`w-3.5 h-3.5 ${isCaptionsActive ? 'text-emerald-300' : ''}`} />
                )}
                <span>
                  {isFetchingSubtitles
                    ? 'Detecting Subtitles...'
                    : hasSubtitles
                    ? 'Captions: ON'
                    : isCaptionsActive
                    ? 'Captions: ON (Auto-Detect)'
                    : 'Turn Captions ON'}
                </span>
              </button>
            )}

            {/* Also keep fetch-captions-button for backward compatibility */}
            {onFetchSubtitles && !hasSubtitles && !isFetchingSubtitles && (
              <button
                id="fetch-captions-button"
                data-testid="fetch-captions-button"
                type="button"
                onClick={onFetchSubtitles}
                className="hidden"
                aria-hidden="true"
              >
                Fetch Subtitles / CC
              </button>
            )}

            {/* Autoplay toggle */}
            <button
              id="toggle-autoplay-button"
              type="button"
              onClick={() => setAutoplay(!autoplay)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                autoplay
                  ? 'bg-red-600/20 text-red-300 border-red-500/50'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
              }`}
              title="Toggle autoplay"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autoplay: {autoplay ? 'ON' : 'OFF'}</span>
            </button>

            {/* Loop toggle */}
            <button
              id="toggle-loop-button"
              type="button"
              onClick={() => setLoop(!loop)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                loop
                  ? 'bg-red-600/20 text-red-300 border-red-500/50'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
              }`}
              title="Toggle loop playback"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop: {loop ? 'ON' : 'OFF'}</span>
            </button>

            {/* Quick Bringup 1: Log View (Including Network Requests) */}
            {onOpenLogs && (
              <button
                id="open-logs-view-btn-expanded"
                type="button"
                onClick={onOpenLogs}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 transition active:scale-95"
                title="Quick Bringup: Activity Logs & Network Requests"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Logs</span>
              </button>
            )}

            {/* Quick Bringup 2: Edit Target Languages for Translation */}
            {onOpenTargetLanguageModal && (
              <button
                id="open-target-language-btn-expanded"
                type="button"
                onClick={onOpenTargetLanguageModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 transition active:scale-95"
                title="Quick Bringup: Edit Target Languages for Translation"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>{targetLanguage ? targetLanguage.toUpperCase() : 'Lang'}</span>
              </button>
            )}

            {/* Quick Bringup 2b: Subtitle Artifacts Browser */}
            {onOpenArtifacts && (
              <button
                id="open-artifacts-view-btn-expanded"
                data-testid="open-artifacts-view-btn-expanded"
                type="button"
                onClick={onOpenArtifacts}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 transition active:scale-95"
                title="Quick Bringup: Browse Subtitle Artifacts (.SRT tracks, raw cues)"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Artifacts</span>
              </button>
            )}

            {/* Quick Control 3: Auto-TTS Narration Toggle */}
            <button
              id="toggle-auto-tts-btn-expanded"
              data-testid="toggle-auto-tts-btn-expanded"
              type="button"
              onClick={toggleAutoTTS}
              aria-pressed={autoTTSEnabled ? 'true' : 'false'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                autoTTSEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
              }`}
              title={autoTTSEnabled ? 'Auto-TTS Narration ON (speaks each subtitle with word highlight)' : 'Auto-TTS Narration OFF'}
            >
              {autoTTSEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>{autoTTSEnabled ? 'TTS: ON' : 'TTS: OFF'}</span>
            </button>

            {/* Theater mode toggle */}
            <button
              id="toggle-theater-mode-button"
              type="button"
              onClick={onToggleTheater}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                theaterMode
                  ? 'bg-neutral-700 text-neutral-100 border-neutral-600'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-neutral-100'
              }`}
              title={theaterMode ? 'Exit theater mode' : 'Enter theater mode'}
            >
              {theaterMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Theater</span>
                </>
              )}
            </button>

            {/* Copy link */}
            <button
              id="copy-video-link-button"
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700 transition"
              title="Copy watch link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            {/* Copy embed code */}
            <button
              id="copy-embed-code-button"
              type="button"
              onClick={handleCopyEmbed}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700 transition"
              title="Copy iframe embed snippet"
            >
              {copiedEmbed ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Embed</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Embed</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Direct SRT Speech Flow Status & Sync Controller (Zero Queues - Pure SRT Subtitles) */}
        <div className="mt-3 p-3.5 rounded-xl glass-panel-elevated border border-neutral-800/80 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800/60">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700/60 text-xs font-medium">
                {isSyncActive ? (
                  isSyncSpeaking ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-amber-300 font-semibold">🗣️ Narrating: {targetLangCode.toUpperCase()} (SRT)</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-300 font-semibold">🟢 Playing Video Dialogue</span>
                    </>
                  )
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-neutral-500" />
                    <span className="text-neutral-400">⚪ Speech Flow: Ready</span>
                  </>
                )}
              </div>
              {activeCue && (
                <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                  #{activeCue.id} • {formatTimestamp(activeCue.start)} ➔ {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}
                </span>
              )}
            </div>

            {/* Quick Target Language SRT Pills */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-400 font-medium mr-1 hidden md:inline">Target SRT:</span>
              {[
                { code: 'he', label: '🇮🇱 HE', name: 'Hebrew' },
                { code: 'it', label: '🇮🇹 IT', name: 'Italian' },
                { code: 'en', label: '🇺🇸 EN', name: 'English' },
                { code: 'ar', label: '🇸🇦 AR', name: 'Arabic' },
                { code: 'ru', label: '🇷🇺 RU', name: 'Russian' },
              ].map((lang) => {
                const isSelected = normTargetLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    title={`Switch target SRT track to ${lang.name}`}
                    onClick={() => onSelectTargetLanguage?.(lang.code)}
                    className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-400/90 text-neutral-950 font-bold shadow-md ring-1 ring-amber-300'
                        : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sync Engine Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSync}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isSyncActive
                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 glow-amber'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white glow-indigo'
                }`}
              >
                {isSyncActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Sentence Sync</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Dual-Language Sync</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleLoopCue}
                title="Loop active sentence and translation"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                  isLoopingCue
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                    : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Repeat className={`w-3.5 h-3.5 ${isLoopingCue ? 'animate-spin' : ''}`} />
                <span>Loop Cue</span>
              </button>

              {onPrevCue && (
                <button
                  type="button"
                  onClick={onPrevCue}
                  title="Previous SRT cue"
                  className="px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60"
                >
                  Prev
                </button>
              )}

              {onNextCue && (
                <button
                  type="button"
                  onClick={onNextCue}
                  title="Next SRT cue"
                  className="px-2 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60"
                >
                  Next
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => playCurrentCueTTS(activeCue || cachedCues[0])}
              disabled={!activeCue && cachedCues.length === 0}
              title="Test play TTS for current active SRT subtitle cue"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Speak SRT Cue</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);
