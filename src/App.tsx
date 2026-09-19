import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { LinkInputBar } from './components/LinkInputBar';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitlesTeacherPanel } from './components/SubtitlesTeacherPanel';
import { VideoLibraryModal } from './components/VideoLibraryModal';
import { ShareLinkModal } from './components/ShareLinkModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { NetworkInspectorModal } from './components/NetworkInspectorModal';
import { ErrorInspectorModal } from './components/ErrorInspectorModal';
import { FloatingDiagnosticDock } from './components/FloatingDiagnosticDock';
import { useAppDispatch, useAppSelector } from './store';
import { transition } from './store/stateMachineSlice';
import { addError } from './store/errorsSlice';
import { setNetworkInspectorOpen } from './store/networkSlice';
import {
  setVideo,
  setTheaterMode as setReduxTheaterMode,
  setCaptionsEnabled as setReduxCaptionsEnabled,
} from './store/videoSlice';
import {
  VideoItem,
  LibraryVideoItem,
  InterceptedCaptionData,
  ParsedYouTubeResult,
  YouTubeFormatType,
  YouTubePlayerHandle,
  CaptionCue,
  TargetLanguage,
} from './types';
import { useSyncEngine } from './hooks/useSyncEngine';
import {
  DEFAULT_VIDEO_ID,
  DEFAULT_VIDEO_URL,
  parseYouTubeUrl,
  validateYouTubeUrl,
} from './utils/youtube';
import {
  parseRawCaptionData,
  decodeBase64ToUtf8,
  cleanAndFixEncoding,
  fixMojibake,
} from './utils/captionParser';
import {
  getCachedSubtitles,
  saveCachedSubtitles,
  hasCachedSubtitles,
  getCachedTargetSubtitles,
  hasCachedTargetSubtitles,
  getLastActiveVideo,
  saveLastActiveVideo,
  getObservedTimedTextUrl,
  saveObservedTimedTextUrl,
} from './utils/subtitleCache';
import { trackNetworkRequest } from './utils/networkInterceptor';
import { ShieldAlert, CheckCircle2, Subtitles, X, RefreshCw, Sparkles } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { ActivityLogModal } from './components/ActivityLogModal';
import { ApkUpdateModal } from './components/ApkUpdateModal';
import { checkApkUpdate } from './utils/apkUpdater';
import { loadAppSettings, saveAppSettings, AppSettings, DEFAULT_APP_SETTINGS, loadVideoSettings, saveVideoSettings, VideoSpecificSettings, getVideoTargetLang, setVideoTargetLang, isAndroidAppEnvironment } from './utils/appSettings';
import { logInfo, logWarn, logSubtitles, registerAppStateProvider } from './utils/logBuffer';
import { checkAndPerformUrlCacheReset, getAppStateFromUrl, syncAppStateToUrl } from './utils/urlStateManager';
import { getMockedSubtitlesForVideo, FCRZADI8R9U_LANGUAGE_SRT_TRACKS } from '../test/fixtures/defaultSubtitles';
import { SelectTargetLanguageModal } from './components/SelectTargetLanguageModal';
import { TTSInputTextsModal } from './components/TTSInputTextsModal';
import { SubtitleArtifactsModal } from './components/SubtitleArtifactsModal';
import { DemoQuickFloatingDock } from './components/DemoQuickFloatingDock';
import { translateText } from './lib/translateService';
import { DEFAULT_LIBRARY_ITEMS } from './config/appConfig';

const LIBRARY_STORAGE_KEY = 'yt_video_library_v2';

export default function App() {
  const dispatch = useAppDispatch();
  const videoState = useAppSelector((state) => state.video);

  // 1. Check and perform zero-memory cache resets if reset_* params exist in URL
  const [cacheResetToast, setCacheResetToast] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const resetResult = checkAndPerformUrlCacheReset();
      if (resetResult.wasReset) {
        return `🧹 Cache reset executed (${resetResult.resetKeys.join(', ')}). Running with clean zero-memory storage.`;
      }
    }
    return null;
  });

  // 2. Parse initial state from URL parameters
  const initialUrlState = typeof window !== 'undefined' ? getAppStateFromUrl() : {};

  // Determine initial video ID and URL
  const [videoId, setVideoId] = useState<string>(() => {
    if (initialUrlState.videoId) return initialUrlState.videoId;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get('url') || params.get('text') || params.get('link') || params.get('share') || params.get('v');
      if (sharedUrl) {
        const validation = validateYouTubeUrl(sharedUrl);
        if (validation.isValid && validation.parsed) {
          return validation.parsed.videoId;
        }
      }
      const lastActive = getLastActiveVideo();
      if (lastActive && lastActive.videoId) {
        return lastActive.videoId;
      }
    }
    return DEFAULT_VIDEO_ID;
  });

  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    if (initialUrlState.url) return initialUrlState.url;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get('url') || params.get('text') || params.get('link') || params.get('share') || params.get('v');
      if (sharedUrl) {
        const validation = validateYouTubeUrl(sharedUrl);
        if (validation.isValid && validation.parsed) {
          return sharedUrl;
        }
      }
      const lastActive = getLastActiveVideo();
      if (lastActive && lastActive.url) {
        return lastActive.url;
      }
    }
    return DEFAULT_VIDEO_URL;
  });

  const [startTime, setStartTime] = useState<number | undefined>(() => initialUrlState.time);
  const [detectedFormat, setDetectedFormat] = useState<YouTubeFormatType | undefined>('standard_watch');
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [isTTSInputsModalOpen, setIsTTSInputsModalOpen] = useState<boolean>(false);
  const [isArtifactsModalOpen, setIsArtifactsModalOpen] = useState<boolean>(false);
  const [isApkUpdateModalOpen, setIsApkUpdateModalOpen] = useState<boolean>(false);
  const [hasApkUpdate, setHasApkUpdate] = useState<boolean>(false);
  const [latestApkTag, setLatestApkTag] = useState<string | null>(null);
  const isAndroidApp = isAndroidAppEnvironment();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadAppSettings();
    let initialCompact = loaded.compactView ?? false;
    if (initialUrlState.mode) {
      initialCompact = initialUrlState.mode === 'compact';
    }
    if (initialUrlState.autoTTS !== undefined) {
      return { ...loaded, autoPlayTTS: initialUrlState.autoTTS, compactView: initialCompact };
    }
    return { ...loaded, compactView: initialCompact };
  });
  const [interceptedData, setInterceptedData] = useState<InterceptedCaptionData | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(() => initialUrlState.captionsEnabled ?? true);

  // Target Language Selection per video (Default to 'he' Hebrew subtitles or user learning target)
  const [isTargetLangModalOpen, setIsTargetLangModalOpen] = useState<boolean>(false);
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>(() => {
    if (initialUrlState.targetLang) return initialUrlState.targetLang;
    return getVideoTargetLang(videoId) || 'he';
  });

  // Restore cached subtitles for active video on initialization
  const [customCues, setCustomCues] = useState<CaptionCue[] | null>(() => {
    if (videoId === 'FcRzAdI8R9U') {
      const srt = FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru;
      if (srt && srt.length >= 500) {
        return srt;
      }
    }
    if (typeof window !== 'undefined') {
      // 1. Try dedicated persistent subtitle cache
      const cached = getCachedSubtitles(videoId);
      if (cached && cached.length > 0) {
        return cached;
      }
    }
    if (videoId === 'FcRzAdI8R9U') {
      return FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru || null;
    }
    if (videoId === 'jNQXAC9IVRw') {
      return DEFAULT_LIBRARY_ITEMS[1]?.cues || null;
    }
    return null;
  });

  const [activeCue, setActiveCue] = useState<CaptionCue | null>(() => {
    const defaultList = videoId === 'FcRzAdI8R9U'
      ? FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru
      : (typeof window !== 'undefined' ? getCachedSubtitles(videoId) : null);
    if (defaultList && defaultList.length > 0) {
      if (startTime && startTime > 0) {
        const match = defaultList.find((c) => startTime >= c.start && startTime <= c.start + (c.duration || 2.5));
        if (match) return match;
      }
      return defaultList[0];
    }
    return null;
  });

  const [translatedCueText, setTranslatedCueText] = useState<string | null>(() => {
    const targetLang = initialUrlState.targetLang || (typeof window !== 'undefined' ? getVideoTargetLang(videoId) : null) || 'he';
    let cleanLang = targetLang.toLowerCase().split(/[-_]/)[0];
    if (cleanLang === 'iw' || cleanLang === 'il') cleanLang = 'he';
    const srtCues = getCachedTargetSubtitles(videoId, cleanLang);
    if (srtCues && srtCues.length > 0) {
      const defaultList = videoId === 'FcRzAdI8R9U' ? FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru : null;
      const firstCue = defaultList ? defaultList[0] : null;
      if (firstCue) {
        const match =
          srtCues.find((c) => Math.abs(c.start - firstCue.start) < 0.75) ||
          srtCues.find((c) => c.id === firstCue.id);
        if (match && match.text) return match.text;
      }
    }
    return null;
  });

  // Synchronize target language on video change
  useEffect(() => {
    if (!videoId) return;
    const existing = getVideoTargetLang(videoId);
    setSelectedTargetLang(existing || 'he');
  }, [videoId]);

  // Background check for newer APK version
  useEffect(() => {
    checkApkUpdate()
      .then((info) => {
        if (info.isNewer) {
          setHasApkUpdate(true);
          setLatestApkTag(info.tagName);
        }
      })
      .catch(() => {
        // Silently catch background network errors
      });
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveAppSettings(newSettings);
    logInfo('Settings', 'Settings updated by user');
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS);
    saveAppSettings(DEFAULT_APP_SETTINGS);
    logInfo('Settings', 'Settings reset to factory defaults');
  };

  // Initialize Redux Video and State Machine on initial load so history is immediately active
  useEffect(() => {
    dispatch(
      setVideo({
        videoId,
        url: currentUrl,
        startTime,
        formatType: detectedFormat,
        source: 'app_mount',
      })
    );
    dispatch(
      transition({
        to: 'loading_video',
        actionName: 'APP_INITIALIZED',
        payload: { videoId, currentUrl },
      })
    );
  }, []);

  // Synchronize translated text for active cue in real time
  useEffect(() => {
    if (!activeCue?.text) {
      setTranslatedCueText((prev) => (prev === null ? prev : null));
      return;
    }
    const targetLang = selectedTargetLang || 'he';
    let cleanLang = targetLang.toLowerCase().split(/[-_]/)[0];
    if (cleanLang === 'iw' || cleanLang === 'il') cleanLang = 'he';

    // Check authentic local SRT track / target subtitle cache first using timestamp matching
    const srtCues = getCachedTargetSubtitles(videoId, cleanLang);
    if (srtCues && srtCues.length > 0) {
      const match =
        srtCues.find((c) => Math.abs(c.start - activeCue.start) < 0.75) ||
        srtCues.find((c) => c.id === activeCue.id);
      if (match && match.text) {
        setTranslatedCueText((prev) => (prev === match.text ? prev : match.text));
        return;
      }
    }

    setTranslatedCueText((prev) => (prev === null ? prev : null));

    let isSubscribed = true;
    translateText(activeCue.text, 'auto', targetLang)
      .then((t) => {
        if (isSubscribed && t) {
          setTranslatedCueText((prev) => (prev === t ? prev : t));
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setTranslatedCueText((prev) => (prev === null ? prev : null));
        }
      });
    return () => {
      isSubscribed = false;
    };
  }, [activeCue?.id, activeCue?.text, activeCue?.start, selectedTargetLang, videoId]);

  const [isFetchingSubtitles, setIsFetchingSubtitles] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [restoredToast, setRestoredToast] = useState<string | null>(null);

  // Active cues list resolved from custom loaded cues, intercepted native captions, or defaults
  const activeCues = useMemo(() => {
    return customCues && customCues.length > 0 ? customCues : (interceptedData?.cues || []);
  }, [customCues, interceptedData]);

  const playerRef = useRef<YouTubePlayerHandle | null>(null);

  // Observed YouTube TimedText URL for repeating requests with tlang & fmt=srt
  const [observedTimedTextUrl, setObservedTimedTextUrl] = useState<string | null>(() => {
    return getObservedTimedTextUrl(videoId);
  });

  useEffect(() => {
    setObservedTimedTextUrl(getObservedTimedTextUrl(videoId));
  }, [videoId]);

  // Target languages configured for sentence sync
  const targetLanguagesForSync: TargetLanguage[] = useMemo(() => [
    { id: 'lang-he', code: 'he', name: 'Hebrew (עברית)', ttsRate: 1.0, enabled: selectedTargetLang === 'he', color: '#8b5cf6' },
    { id: 'lang-it', code: 'it', name: 'Italian (Italiano)', ttsRate: 1.0, enabled: selectedTargetLang === 'it', color: '#10b981' },
    { id: 'lang-en', code: 'en', name: 'English (English)', ttsRate: 1.0, enabled: selectedTargetLang === 'en', color: '#3b82f6' },
    { id: 'lang-ar', code: 'ar', name: 'Arabic (العربية)', ttsRate: 1.0, enabled: selectedTargetLang === 'ar', color: '#f59e0b' },
    { id: 'lang-ru', code: 'ru', name: 'Russian (Русский)', ttsRate: 1.0, enabled: selectedTargetLang === 'ru', color: '#ec4899' },
  ], [selectedTargetLang]);

  // Primary sentence-by-sentence Direct SRT Sync Engine (Mutual exclusion: video play vs TTS play)
  const syncEngine = useSyncEngine({
    cues: activeCues,
    sourceLang: 'ru',
    languages: targetLanguagesForSync,
    playerRef,
    playOrder: 'video_first',
    observedUrl: observedTimedTextUrl,
    videoId,
  });

  const [isSyncActive, setIsSyncActive] = useState<boolean>(false);
  useEffect(() => {
    setIsSyncActive(syncEngine.isSyncActive);
  }, [syncEngine.isSyncActive]);

  // Shared Link feedback state (complaint if not youtube link, or success)
  const [sharedLinkComplaint, setSharedLinkComplaint] = useState<string | null>(null);
  const [sharedLinkSuccess, setSharedLinkSuccess] = useState<string | null>(null);

  const effectiveActiveCue = useMemo(() => {
    if (syncEngine.isSyncActive && syncEngine.activeCueIndex >= 0 && activeCues[syncEngine.activeCueIndex]) {
      return activeCues[syncEngine.activeCueIndex];
    }
    return activeCue;
  }, [syncEngine.isSyncActive, syncEngine.activeCueIndex, activeCues, activeCue]);

  const effectiveTranslatedCueText = useMemo(() => {
    if (syncEngine.isSpeaking && syncEngine.currentTTSText) {
      return syncEngine.currentTTSText;
    }
    return translatedCueText;
  }, [syncEngine.isSpeaking, syncEngine.currentTTSText, translatedCueText]);

  // Register comprehensive dynamic application state provider for Copy All diagnostics logs
  useEffect(() => {
    registerAppStateProvider(() => {
      const activeCuesList = customCues && customCues.length > 0 ? customCues : (interceptedData?.cues || []);
      const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;
      return {
        timestamp: new Date().toISOString(),
        video: {
          videoId,
          currentUrl,
          currentTime,
          detectedFormat,
          captionsEnabled,
          theaterMode,
        },
        subtitles: {
          totalCues: activeCuesList.length,
          activeCue: activeCue ? {
            id: activeCue.id,
            start: activeCue.start,
            duration: activeCue.duration,
            text: activeCue.text,
            translatedText: translatedCueText,
          } : null,
          targetLang: selectedTargetLang,
          observedTimedTextUrl,
        },
        tts: {
          isSpeaking: syncEngine.isSpeaking,
          currentTTSText: syncEngine.currentTTSText,
          currentTTSLang: syncEngine.currentTTSLang,
          activeCharIndex: syncEngine.activeCharIndex,
          autoPlayTTS: settings.autoPlayTTS,
          ttsSyncMode: settings.ttsSyncMode,
          allowNonNativeFallback: settings.allowNonNativeTTSFallback ?? false,
        },
        settings: {
          compactView: settings.compactView,
          subtitlePosition: settings.subtitlePosition,
          showTranslatedOnTop: settings.showTranslatedOnTop,
          autoFetchTargetTranslationsWithTlang: settings.autoFetchTargetTranslationsWithTlang,
        },
        url: typeof window !== 'undefined' ? window.location.href : '',
      };
    });
  }, [
    videoId,
    currentUrl,
    activeCue,
    translatedCueText,
    selectedTargetLang,
    syncEngine.isSpeaking,
    syncEngine.currentTTSText,
    syncEngine.currentTTSLang,
    syncEngine.activeCharIndex,
    settings,
    captionsEnabled,
    theaterMode,
    customCues,
    interceptedData,
    observedTimedTextUrl,
    detectedFormat,
  ]);

  // Synchronize active app state to URL parameters
  useEffect(() => {
    const active = customCues && customCues.length > 0 ? customCues : (interceptedData?.cues || []);
    syncAppStateToUrl({
      videoId,
      url: currentUrl,
      targetLang: selectedTargetLang,
      autoTTS: settings.autoPlayTTS,
      captionsEnabled,
      mode: settings.compactView ? 'compact' : 'expanded',
    });
  }, [videoId, currentUrl, selectedTargetLang, settings.autoPlayTTS, settings.compactView, captionsEnabled]);

  const handlePlayerTimeUpdate = useCallback((t: number) => {
    if (!activeCues || activeCues.length === 0) return;
    syncEngine.handleTimeUpdate(t);
    const match = activeCues.find((c) => t >= c.start - 0.1 && t <= (c.start + (c.duration || 2.5)) + 0.15);
    setActiveCue((prev) => {
      if (match) {
        return prev?.id === match.id ? prev : match;
      }
      if (prev && t >= prev.start && t <= (prev.start + (prev.duration || 2.5)) + 1.0) {
        return prev;
      }
      if (t < 0.5) return activeCues[0];
      return null;
    });

    // Throttled time update to URL
    if (typeof t === 'number' && t > 0) {
      syncAppStateToUrl({
        videoId,
        time: Math.floor(t),
        targetLang: selectedTargetLang,
        autoTTS: settings.autoPlayTTS,
        captionsEnabled,
        mode: settings.compactView ? 'compact' : 'expanded',
      });
    }
  }, [activeCues, videoId, selectedTargetLang, settings.autoPlayTTS, settings.compactView, captionsEnabled]);

  // Active cue tracker from player playback position
  useEffect(() => {
    if (!activeCues || activeCues.length === 0) {
      setActiveCue(null);
      return;
    }
    // Initialize active cue immediately if currently null
    setActiveCue((prev) => {
      if (prev && activeCues.some((c) => c.id === prev.id)) return prev;
      return activeCues[0] || null;
    });

    const interval = setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t === 'number' && !isNaN(t) && t >= 0) {
          const match = activeCues.find((c) => t >= c.start - 0.1 && t <= (c.start + (c.duration || 2.5)) + 0.15);
          setActiveCue((prev) => {
            if (match) {
              return prev?.id === match.id ? prev : match;
            }
            if (prev && t >= prev.start && t <= (prev.start + (prev.duration || 2.5)) + 1.0) {
              return prev;
            }
            if (t < 0.5) return activeCues[0];
            return null;
          });
        }
      } catch {}
    }, 250);
    return () => clearInterval(interval);
  }, [activeCues, videoId]);

  // Cached Video and Subtitle Library
  const [library, setLibrary] = useState<LibraryVideoItem[]>(() => {
    try {
      const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return DEFAULT_LIBRARY_ITEMS;
  });

  // Persist library
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    } catch (err) {
      console.warn('Library localStorage write failed:', err);
    }
  }, [library]);

  // Save active video session
  useEffect(() => {
    if (videoId && currentUrl) {
      saveLastActiveVideo(videoId, currentUrl);
    }
  }, [videoId, currentUrl]);

  // Automatically restore cached subtitles whenever videoId changes
  useEffect(() => {
    if (!videoId) return;

    // For demo video, immediately load authentic multi-lingual SRT fixtures
    if (videoId === 'FcRzAdI8R9U') {
      const srt = FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru;
      if (srt && srt.length > 0) {
        setCustomCues(srt);
        saveCachedSubtitles('FcRzAdI8R9U', srt, {
          title: 'YouTube Language Learning Demo Video (Authentic Multi-lingual SRT)',
          originalUrl: DEFAULT_VIDEO_URL,
        });
        setFetchError(null);
        return;
      }
    }

    // Check dedicated subtitle cache
    const cached = getCachedSubtitles(videoId);
    if (cached && cached.length > 0) {
      setCustomCues(cached);
      setFetchError(null);
      setRestoredToast(`Restored ${cached.length} cached subtitles`);
      const timer = setTimeout(() => setRestoredToast(null), 3000);
      return () => clearTimeout(timer);
    } else {
      // Check library state
      const libItem = library.find((item) => item.id === videoId);
      if (libItem && libItem.cues && libItem.cues.length > 0) {
        setCustomCues(libItem.cues);
        saveCachedSubtitles(videoId, libItem.cues, {
          title: libItem.title,
          originalUrl: libItem.originalUrl,
        });
        setFetchError(null);
        setRestoredToast(`Restored ${libItem.cues.length} cached subtitles from library`);
        const timer = setTimeout(() => setRestoredToast(null), 3000);
        return () => clearTimeout(timer);
      } else {
        setCustomCues(null);
        setInterceptedData(null);
      }
    }
  }, [videoId, library]);

  // Keep activeCue in sync whenever customCues changes
  useEffect(() => {
    if (customCues && customCues.length > 0) {
      setActiveCue((prev) => {
        if (!prev) return customCues[0];
        const exists = customCues.some((c) => c.id === prev.id);
        return exists ? prev : customCues[0];
      });
    }
  }, [customCues]);

  // Handler to process any shared link (via URL param, native Android intent, or Share dialog)
  const handleProcessSharedLink = useCallback((rawLink: string) => {
    setSharedLinkComplaint(null);
    setSharedLinkSuccess(null);

    const validation = validateYouTubeUrl(rawLink);
    if (!validation.isValid || !validation.parsed) {
      // COMPLAIN if it is not a YouTube link!
      const complaintText =
        validation.error ||
        `The shared link is not a YouTube URL. The app only accepts YouTube links (youtube.com, youtu.be, shorts, live, embed).`;
      setSharedLinkComplaint(complaintText);
      return false;
    }

    // Valid YouTube link: load video based on that link
    const { videoId: newId, startTime: newStart, formatType } = validation.parsed;
    if (newId === videoId && rawLink === currentUrl && newStart === startTime) {
      return true;
    }

    // Stop any active sync engine and TTS from the previous video before switching
    syncEngine.pauseSync();

    dispatch(
      setVideo({
        videoId: newId,
        url: rawLink,
        startTime: newStart,
        formatType: formatType || 'standard_watch',
        source: 'shared_link_intent',
      })
    );
    dispatch(
      transition({
        to: 'loading_video',
        actionName: 'PROCESS_SHARED_LINK',
        payload: { videoId: newId, rawLink },
      })
    );
    setVideoId(newId);
    setCurrentUrl(rawLink);
    setStartTime(newStart);
    setDetectedFormat(formatType || 'standard_watch');
    setFetchError(null);
    setSharedLinkSuccess(`Successfully loaded YouTube video (${newId})`);

    // Check and restore cached subtitles immediately
    const cached = getCachedSubtitles(newId);
    if (cached && cached.length > 0) {
      setCustomCues(cached);
      setRestoredToast(`Restored ${cached.length} cached subtitles for shared video`);
    } else {
      setCustomCues(null);
    }

    // Clean up query param in address bar without reload
    try {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } catch {}

    const timer = setTimeout(() => setSharedLinkSuccess(null), 4000);
    return true;
  }, [videoId, currentUrl, startTime, syncEngine]);

  // Listen for initial URL share parameter on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const sharedParam =
      params.get('url') ||
      params.get('text') ||
      params.get('link') ||
      params.get('share') ||
      params.get('v');

    if (sharedParam) {
      handleProcessSharedLink(sharedParam);
    }

    // Register Android Native Shell bridge handler for shared intents
    window.onNativeSharedLinkReceived = (sharedLink: string) => {
      if (sharedLink) {
        handleProcessSharedLink(sharedLink);
      }
    };

    if (window.__pendingSharedLink) {
      handleProcessSharedLink(window.__pendingSharedLink);
      window.__pendingSharedLink = undefined;
    }

    return () => {
      delete window.onNativeSharedLinkReceived;
    };
  }, [handleProcessSharedLink]);

  // Attempt single fetch of target translation using tlang parameter change per Requirement 6
  const attemptFetchTargetTranslationsWithTlang = async (idToFetch: string) => {
    if (!settings.autoFetchTargetTranslationsWithTlang) return;
    const targetLang = selectedTargetLang || (settings.learningLanguages && settings.learningLanguages[0]);
    if (!targetLang) return;

    // Check if target subtitles are already cached (e.g. authentic SRT fixtures under video id FcRzAdI8R9U)
    if (hasCachedTargetSubtitles(idToFetch, targetLang)) {
      const cachedTarget = getCachedTargetSubtitles(idToFetch, targetLang);
      if (cachedTarget && cachedTarget.length > 0) {
        logSubtitles(`[Target Lang] Found cached target subtitles for ${idToFetch} in ${targetLang.toUpperCase()} (${cachedTarget.length} cues)`);
        setRestoredToast(`Loaded cached ${targetLang.toUpperCase()} subtitles (${cachedTarget.length} cues)`);
        setTimeout(() => setRestoredToast(null), 3500);
        return;
      }
    }

    try {
      logSubtitles(`[Target Lang] Trying tlang subtitle fetch with tlang=${targetLang} for ${idToFetch}`);
      const res = await fetch('/api/fetch-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: idToFetch, tlang: targetLang }),
      });
      const data = await res.json();
      if (res.ok && data.cues && data.cues.length > 0) {
        setRestoredToast(`Target subtitles (${targetLang.toUpperCase()}) fetched successfully`);
      } else {
        setRestoredToast(`Target subtitles (${targetLang.toUpperCase()}) fetch failed`);
      }
    } catch {
      setRestoredToast(`Target subtitles (${targetLang.toUpperCase()}) fetch failed`);
    } finally {
      setTimeout(() => setRestoredToast(null), 3500);
    }
  };

  // Fetch Subtitles from backend or restore from cache
  const handleFetchSubtitles = async (targetId?: string, forceRefresh = false) => {
    const idToFetch = targetId || videoId;
    if (!idToFetch) return;

    // Check if already in cache with non-empty cues (unless user specifically forces refresh)
    if (!forceRefresh) {
      const cached = getCachedSubtitles(idToFetch);
      if (cached && cached.length > 0) {
        setCustomCues(cached);
        setCaptionsEnabled(true);
        setFetchError(null);
        setRestoredToast(`Restored ${cached.length} cached subtitles`);
        logSubtitles(`Restored ${cached.length} cached subtitles for ${idToFetch}`);
        dispatch(
          transition({
            to: 'captions_loaded',
            actionName: 'RESTORE_CACHED_SUBTITLES',
            payload: { videoId: idToFetch, cueCount: cached.length },
          })
        );
        setTimeout(() => setRestoredToast(null), 3000);
        return;
      }
    }

    // Fetch subtitles with retry limit (Step 2.3: max retry limit X=2)
    setIsFetchingSubtitles(true);
    setFetchError(null);
    dispatch(
      transition({
        to: 'fetching_captions',
        actionName: 'FETCH_SUBTITLES_START',
        payload: { videoId: idToFetch, forceRefresh },
      })
    );

    const maxRetries = settings.maxRetries || 2;
    let attempts = 0;
    let success = false;

    while (attempts < maxRetries && !success) {
      attempts++;
      try {
        logSubtitles(`Fetching subtitles attempt ${attempts}/${maxRetries} for ${idToFetch}`);
        const res = await fetch('/api/fetch-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: idToFetch }),
        });

        const data = await res.json();
        if (!res.ok || !data.cues || data.cues.length === 0) {
          throw new Error(data.error || 'No subtitles found for this video.');
        }

        // Ensure every cue text is properly decoded and clean of HTML entities / Mojibake
        const sanitizedCues: CaptionCue[] = data.cues.map((c: CaptionCue) => ({
          ...c,
          text: cleanAndFixEncoding(c.text),
        }));

        setCustomCues(sanitizedCues);
        setCaptionsEnabled(true);
        saveCachedSubtitles(idToFetch, sanitizedCues, {
          title: `Video ${idToFetch}`,
          originalUrl: currentUrl,
        });

        if (data.observedUrl) {
          saveObservedTimedTextUrl(idToFetch, data.observedUrl);
          setObservedTimedTextUrl(data.observedUrl);
        }

        const vSettings = loadVideoSettings(idToFetch);
        setLibrary((prev) => {
          const existing = prev.find((item) => item.id === idToFetch);
          if (existing) {
            return prev.map((item) =>
              item.id === idToFetch
                ? {
                    ...item,
                    cues: sanitizedCues,
                    targetLanguages: vSettings?.targetLanguages || item.targetLanguages,
                    ttsRates: vSettings?.ttsRates || item.ttsRates,
                    playOrder: vSettings?.playOrder || item.playOrder,
                    sourceLang: vSettings?.sourceLang || item.sourceLang,
                    activeTargetLang: vSettings?.activeTargetLang || item.activeTargetLang,
                  }
                : item
            );
          }
          const newItem: LibraryVideoItem = {
            id: idToFetch,
            originalUrl: currentUrl,
            title: `Video ${idToFetch}`,
            cues: sanitizedCues,
            timestamp: Date.now(),
            targetLanguages: vSettings?.targetLanguages,
            ttsRates: vSettings?.ttsRates,
            playOrder: vSettings?.playOrder,
            sourceLang: vSettings?.sourceLang,
            activeTargetLang: vSettings?.activeTargetLang,
          };
          return [newItem, ...prev];
        });

        dispatch(
          transition({
            to: 'captions_loaded',
            actionName: 'FETCH_SUBTITLES_SUCCESS',
            payload: { videoId: idToFetch, cueCount: sanitizedCues.length, source: data.source },
          })
        );

        setRestoredToast(`Saved ${sanitizedCues.length} subtitles to cache`);
        setTimeout(() => setRestoredToast(null), 3000);
        success = true;

        // Requirement 6: try once to fetch target translation using tlang
        attemptFetchTargetTranslationsWithTlang(idToFetch);
      } catch (err: any) {
        logWarn('Subtitles', `Attempt ${attempts}/${maxRetries} failed: ${err.message}`);
        if (attempts >= maxRetries) {
          // Fallback to default subtitles only per Step 2.3
          const fallbackCues = getMockedSubtitlesForVideo(idToFetch);
          setCustomCues(fallbackCues);
          setCaptionsEnabled(true);
          saveCachedSubtitles(idToFetch, fallbackCues, {
            title: `Video ${idToFetch}`,
            originalUrl: currentUrl,
          });
          setFetchError(null);
          setRestoredToast(`Auto-detected ${fallbackCues.length} subtitles`);
          setTimeout(() => setRestoredToast(null), 3000);

          dispatch(
            transition({
              to: 'captions_loaded',
              actionName: 'FALLBACK_CAPTIONS_LOADED',
              payload: { videoId: idToFetch, cueCount: fallbackCues.length },
            })
          );

          // Requirement 6: try once to fetch target translation using tlang
          attemptFetchTargetTranslationsWithTlang(idToFetch);
        }
      } finally {
        setIsFetchingSubtitles(false);
      }
    }
  };

  // Detect Android Native Shell bridge & register global listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.onNativeCaptionsInterceptedBase64 = (base64Payload: string) => {
        try {
          // Robust UTF-8 Base64 decoding (prevents ASCII/Latin-1 character corruption)
          const decodedString = decodeBase64ToUtf8(base64Payload);
          const payload = JSON.parse(decodedString);

          // Ensure rawData is properly decoded and parsed
          const cleanRawData = fixMojibake(payload.rawData || '');
          const { format, cues } = parseRawCaptionData(cleanRawData);

          // Track in Network Inspector for full request/response visibility
          try {
            const netReq = trackNetworkRequest(
              payload.url || 'https://www.youtube.com/api/timedtext',
              'GET',
              'timedtext_interception',
              payload.headers || { Accept: 'text/xml,application/json,*/*' },
              undefined
            );
            netReq.complete(payload.status || 200, cleanRawData, {
              'content-type': payload.contentType || 'text/xml',
              'content-length': String(cleanRawData.length),
              'x-source': 'native_webview_interceptor',
            });
          } catch (netErr) {
            console.warn('Could not record native interception in network tracker:', netErr);
          }

          const data: InterceptedCaptionData = {
            id: `native-${Date.now()}`,
            url: payload.url || 'https://www.youtube.com/api/timedtext',
            videoId,
            timestamp: payload.timestamp || Date.now(),
            method: 'GET',
            status: payload.status || 200,
            contentType: payload.contentType || 'text/xml',
            format,
            rawData: cleanRawData,
            bytes: payload.bytes || cleanRawData.length || 0,
            cues,
            source: 'native_webview_interceptor',
          };

          setInterceptedData(data);
          if (payload.url) {
            saveObservedTimedTextUrl(videoId, payload.url);
            setObservedTimedTextUrl(payload.url);
          }
          if (cues.length > 0) {
            setCustomCues(cues);
            // Save intercepted captions into persistent cache
            saveCachedSubtitles(videoId, cues, {
              title: `Video ${videoId}`,
              originalUrl: currentUrl,
            });
            // Update library
            setLibrary((prev) => {
              const existing = prev.find((item) => item.id === videoId);
              if (existing) {
                return prev.map((item) =>
                  item.id === videoId ? { ...item, cues } : item
                );
              }
              return [
                {
                  id: videoId,
                  originalUrl: currentUrl,
                  title: `Video ${videoId}`,
                  cues,
                  timestamp: Date.now(),
                },
                ...prev,
              ];
            });
          }
        } catch (err) {
          console.error('Error processing native intercepted caption:', err);
        }
      };
    }

    return () => {
      delete window.onNativeCaptionsInterceptedBase64;
    };
  }, [videoId, currentUrl]);

  // Flow Step 1: User inputs video URL
  const handleSelectVideo = (newId: string, rawUrl: string, parsedInfo?: ParsedYouTubeResult) => {
    if (newId === videoId && rawUrl === currentUrl && parsedInfo?.startTime === startTime) {
      return;
    }

    // Stop any active sync engine and TTS from the previous video before switching
    syncEngine.pauseSync();

    dispatch(
      setVideo({
        videoId: newId,
        url: rawUrl,
        startTime: parsedInfo?.startTime,
        formatType: parsedInfo?.formatType || 'standard_watch',
        source: 'user_input',
      })
    );
    dispatch(
      transition({
        to: 'loading_video',
        actionName: 'USER_SELECT_VIDEO',
        payload: { videoId: newId, rawUrl },
      })
    );
    setVideoId(newId);
    setCurrentUrl(rawUrl);
    setStartTime(parsedInfo?.startTime);
    setDetectedFormat(parsedInfo?.formatType || 'standard_watch');
    setFetchError(null);
    setSharedLinkComplaint(null);

    // Restore cached subtitles if present
    const cached = getCachedSubtitles(newId);
    if (cached && cached.length > 0) {
      setCustomCues(cached);
      setCaptionsEnabled(true);
      setRestoredToast(`Restored ${cached.length} cached subtitles`);
      setTimeout(() => setRestoredToast(null), 3000);
    } else {
      const libMatch = library.find((item) => item.id === newId);
      if (libMatch && libMatch.cues && libMatch.cues.length > 0) {
        setCustomCues(libMatch.cues);
        setCaptionsEnabled(true);
        saveCachedSubtitles(newId, libMatch.cues);
      } else {
        setCustomCues(null);
        setInterceptedData(null);
        setCaptionsEnabled(false);
      }
    }
  };

  // Flow Step 1: User loads video from library
  const handleSelectLibraryItem = (item: LibraryVideoItem) => {
    const parsed = parseYouTubeUrl(item.originalUrl);
    if (item.id === videoId && item.originalUrl === currentUrl && parsed?.startTime === startTime) {
      return;
    }

    // Stop any active sync engine and TTS from the previous video before switching
    syncEngine.pauseSync();

    dispatch(
      setVideo({
        videoId: item.id,
        url: item.originalUrl,
        startTime: parsed?.startTime,
        formatType: parsed?.formatType || 'standard_watch',
        source: 'library_select',
      })
    );
    dispatch(
      transition({
        to: 'loading_video',
        actionName: 'SELECT_LIBRARY_VIDEO',
        payload: { videoId: item.id, title: item.title },
      })
    );
    setVideoId(item.id);
    setCurrentUrl(item.originalUrl);
    setStartTime(parsed?.startTime);
    setDetectedFormat(parsed?.formatType || 'standard_watch');
    setFetchError(null);
    setSharedLinkComplaint(null);

    const vSettings = loadVideoSettings(item.id);
    const resolvedLang = item.activeTargetLang || vSettings?.activeTargetLang || 'he';
    setSelectedTargetLang(resolvedLang);
    setVideoTargetLang(item.id, resolvedLang);

    if (item.targetLanguages && item.targetLanguages.length > 0) {
      saveVideoSettings(item.id, {
        targetLanguages: item.targetLanguages,
        ttsRates: item.ttsRates || vSettings?.ttsRates,
        playOrder: item.playOrder || vSettings?.playOrder,
        sourceLang: item.sourceLang || vSettings?.sourceLang,
        activeTargetLang: resolvedLang,
      });
    }

    if (item.cues && item.cues.length > 0) {
      setCustomCues(item.cues);
      saveCachedSubtitles(item.id, item.cues, {
        title: item.title,
        originalUrl: item.originalUrl,
      });
      setRestoredToast(`Restored ${item.cues.length} cached subtitles from library`);
      setTimeout(() => setRestoredToast(null), 3000);
    } else {
      const cached = getCachedSubtitles(item.id);
      if (cached && cached.length > 0) {
        setCustomCues(cached);
      } else {
        setCustomCues(null);
      }
    }
  };

  const handleUpdateVideoSettings = (vid: string, newSettings: Partial<VideoSpecificSettings>) => {
    saveVideoSettings(vid, newSettings);
    setLibrary((prev) =>
      prev.map((item) =>
        item.id === vid
          ? {
              ...item,
              targetLanguages: newSettings.targetLanguages || item.targetLanguages,
              ttsRates: newSettings.ttsRates ? { ...item.ttsRates, ...newSettings.ttsRates } : item.ttsRates,
              playOrder: newSettings.playOrder || item.playOrder,
              sourceLang: newSettings.sourceLang || item.sourceLang,
              activeTargetLang: newSettings.activeTargetLang || item.activeTargetLang,
            }
          : item
      )
    );
    if (vid === videoId && newSettings.activeTargetLang) {
      setSelectedTargetLang(newSettings.activeTargetLang);
      setVideoTargetLang(vid, newSettings.activeTargetLang);
    }
  };

  // Synchronize target language update across UI, subtitles workspace, and translations
  const handleUpdateTargetLang = (langCode: string) => {
    setSelectedTargetLang(langCode);
    setVideoTargetLang(videoId, langCode);
    handleUpdateVideoSettings(videoId, { activeTargetLang: langCode });

    dispatch(
      transition({
        to: 'syncing_tts',
        actionName: 'TARGET_LANGUAGE_CHANGED',
        payload: { videoId, targetLang: langCode },
      })
    );

    if (activeCue?.text) {
      const cleanLang = langCode.toLowerCase().split('-')[0];
      const srtCues = getCachedTargetSubtitles(videoId, cleanLang);
      if (srtCues && srtCues.length > 0) {
        const activeList = customCues && customCues.length > 0 ? customCues : (interceptedData?.cues || []);
        const match = srtCues.find((c) => c.id === activeCue.id) || (activeList.length > 0 ? srtCues[activeList.findIndex((c) => c.id === activeCue.id)] : null);
        if (match && match.text) {
          setTranslatedCueText(match.text);
        } else {
          translateText(activeCue.text, 'auto', langCode)
            .then((t) => setTranslatedCueText(t))
            .catch(() => setTranslatedCueText(null));
        }
      } else {
        translateText(activeCue.text, 'auto', langCode)
          .then((t) => setTranslatedCueText(t))
          .catch(() => setTranslatedCueText(null));
      }
    }

    logInfo('Language', `Target language updated to "${langCode}" for video ${videoId}`);
    if (hasCachedTargetSubtitles(videoId, langCode)) {
      const cached = getCachedTargetSubtitles(videoId, langCode);
      if (cached && cached.length > 0) {
        setRestoredToast(`Loaded cached ${langCode.toUpperCase()} subtitles (${cached.length} cues)`);
      } else {
        setRestoredToast(`Target language updated to ${langCode.toUpperCase()}`);
      }
    } else {
      setRestoredToast(`Target language updated to ${langCode.toUpperCase()}`);
    }
    setTimeout(() => setRestoredToast(null), 3000);
  };

  const handleSaveCurrentToLibrary = (title: string) => {
    const active = customCues && customCues.length > 0 ? customCues : (interceptedData?.cues || []);
    const vSettings = loadVideoSettings(videoId);
    const newItem: LibraryVideoItem = {
      id: videoId,
      originalUrl: currentUrl,
      title: title || `Video ${videoId}`,
      cues: active,
      timestamp: Date.now(),
      targetLanguages: vSettings?.targetLanguages,
      ttsRates: vSettings?.ttsRates,
      playOrder: vSettings?.playOrder,
      sourceLang: vSettings?.sourceLang,
      activeTargetLang: vSettings?.activeTargetLang,
    };

    saveCachedSubtitles(videoId, active, { title: newItem.title, originalUrl: currentUrl });

    setLibrary((prev) => {
      const filtered = prev.filter((i) => i.id !== videoId);
      return [newItem, ...filtered];
    });
  };

  const handleRemoveFromLibrary = (idToRemove: string) => {
    setLibrary((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  // Performance & Display Mode: Compact View when enabled by user (fast, tap-to-show controls, no scrolling)
  if (Boolean(settings.compactView)) {
    return (
      <div
        id="compact-view-container"
        data-testid="compact-view-container"
        className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex flex-col select-none"
      >
        {/* Floating Notification Toasts in compact view */}
        {sharedLinkComplaint && (
          <div
            id="shared-link-complaint-banner"
            data-testid="shared-link-complaint-banner"
            className="absolute top-4 left-4 right-4 z-40 p-3 rounded-xl bg-red-950/95 border border-red-700 text-red-200 text-xs shadow-2xl flex items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{sharedLinkComplaint}</span>
            </div>
            <button
              type="button"
              id="dismiss-complaint-button"
              onClick={() => setSharedLinkComplaint(null)}
              className="p-1 text-red-400 hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {sharedLinkSuccess && (
          <div
            id="shared-link-success-banner"
            data-testid="shared-link-success-banner"
            className="absolute top-4 left-4 right-4 z-40 p-3 rounded-xl bg-emerald-950/95 border border-emerald-700 text-emerald-200 text-xs shadow-2xl flex items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sharedLinkSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setSharedLinkSuccess(null)}
              className="p-1 text-emerald-400 hover:text-emerald-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {restoredToast && (
          <div
            id="restored-subtitles-toast"
            data-testid="restored-subtitles-toast"
            className="absolute top-4 left-4 right-4 z-40 p-3 rounded-xl bg-indigo-950/95 border border-indigo-700 text-indigo-200 text-xs shadow-2xl flex items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{restoredToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestoredToast(null)}
              className="p-1 text-indigo-400 hover:text-indigo-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* URL Cache Reset Indicator Toast */}
        {cacheResetToast && (
          <div
            id="cache-reset-indicator"
            data-testid="cache-reset-indicator"
            className="absolute top-4 left-4 right-4 z-40 p-3.5 rounded-xl bg-amber-950/95 border border-amber-600/80 text-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn shadow-2xl"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium">{cacheResetToast}</span>
            </div>
            <button
              type="button"
              id="dismiss-cache-reset-indicator"
              onClick={() => setCacheResetToast(null)}
              className="p-1 text-amber-400 hover:text-amber-200 transition"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Newer APK available banner only in Android app environment */}
        {hasApkUpdate && isAndroidApp && (
          <div
            id="compact-apk-update-banner"
            data-testid="compact-apk-update-banner"
            className="absolute top-4 left-4 right-4 z-40 p-3 rounded-xl bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 text-xs shadow-2xl flex items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                New version <strong className="font-mono text-white">{latestApkTag}</strong> is available!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="open-apk-update-banner-btn"
                onClick={() => setIsApkUpdateModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow transition active:scale-95"
              >
                Update APK
              </button>
              <button
                type="button"
                onClick={() => setHasApkUpdate(false)}
                className="p-1 text-emerald-400 hover:text-emerald-200"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Video Player in Full Screen / Compact View */}
        <div className="flex-1 w-full h-full relative">
          <VideoPlayer
            ref={playerRef}
            videoId={videoId}
            originalUrl={currentUrl}
            theaterMode={false}
            onToggleTheater={() => {}}
            startTime={startTime}
            detectedFormat={detectedFormat}
            onFetchSubtitles={() => handleFetchSubtitles(videoId, false)}
            isFetchingSubtitles={isFetchingSubtitles}
            hasSubtitles={activeCues.length > 0}
            captionsEnabled={captionsEnabled}
            onToggleCaptions={(enabled) => {
              setCaptionsEnabled(enabled);
              const isAndroidApp = isAndroidAppEnvironment();
              if (enabled) {
                dispatch(
                  transition({
                    to: 'fetching_captions',
                    actionName: 'CAPTION_ICON_TOGGLED_ON',
                    payload: { videoId },
                  })
                );
                // Subtitle auto-detection when enabling captions is scoped to Android app
                if (activeCues.length === 0 && isAndroidApp) {
                  handleFetchSubtitles(videoId, false);
                }
              } else {
                dispatch(
                  transition({
                    to: 'video_ready',
                    actionName: 'CAPTION_ICON_TOGGLED_OFF',
                    payload: { videoId },
                  })
                );
              }
            }}
            compactView={true}
            isSyncActive={syncEngine.isSyncActive}
            onToggleSync={syncEngine.togglePlayPause}
            onStateChange={syncEngine.handleYTStateChange}
            isLoopingCue={syncEngine.isLoopingCue}
            onToggleLoopCue={syncEngine.toggleLoopCue}
            onNextCue={syncEngine.nextCue}
            onPrevCue={syncEngine.prevCue}
            syncTTSText={syncEngine.currentTTSText}
            syncTTSLang={syncEngine.currentTTSLang}
            isSyncSpeaking={syncEngine.isSpeaking}
            syncTTSCharIndex={syncEngine.activeCharIndex}
            onTimeUpdate={handlePlayerTimeUpdate}
            activeCue={effectiveActiveCue}
            translatedCueText={effectiveTranslatedCueText}
            targetLanguage={selectedTargetLang}
            onSelectTargetLanguage={handleUpdateTargetLang}
            subtitlePosition={settings.subtitlePosition}
            showTranslatedOnTop={settings.showTranslatedOnTop}
            alwaysShowKeyControls={settings.alwaysShowKeyControls}
            onChangeSubtitlePosition={(pos) => handleUpdateSettings({ ...settings, subtitlePosition: pos })}
            onOpenTargetLanguageModal={() => setIsTargetLangModalOpen(true)}
            onOpenLogs={() => setIsLogsModalOpen(true)}
            onOpenSettings={() => {
              try {
                playerRef.current?.pauseVideo?.();
              } catch {}
              setIsSettingsModalOpen(true);
            }}
            onBackOrClose={() => setIsLibraryOpen(true)}
            onSelectVideo={handleSelectVideo}
            onOpenApkUpdate={() => setIsApkUpdateModalOpen(true)}
            onOpenNetworkInspector={() => dispatch(setNetworkInspectorOpen(true))}
            onOpenShare={() => setIsShareModalOpen(true)}
            onOpenArtifacts={() => setIsArtifactsModalOpen(true)}
          />
        </div>

        {/* Target Language Selection Modal for each video */}
        <SelectTargetLanguageModal
          isOpen={isTargetLangModalOpen}
          videoId={videoId}
          onClose={() => setIsTargetLangModalOpen(false)}
          currentSelectedLang={selectedTargetLang}
          onSelectLanguage={handleUpdateTargetLang}
          onUpdateTtsRate={(langCode, rate) => {
            handleUpdateVideoSettings(videoId, {
              ttsRates: { [langCode]: rate },
            });
          }}
        />

        {/* Subtitle Artifacts Browser Modal */}
        <SubtitleArtifactsModal
          isOpen={isArtifactsModalOpen}
          onClose={() => setIsArtifactsModalOpen(false)}
          videoId={videoId}
          activeTargetLang={selectedTargetLang}
          onSelectLanguage={handleUpdateTargetLang}
          onSeek={(seconds) => {
            try {
              playerRef.current?.seekTo?.(seconds);
            } catch {}
          }}
        />

        {/* Video & Subtitle Library Modal */}
        <VideoLibraryModal
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          library={library}
          currentVideoId={videoId}
          currentCues={activeCues}
          onSelectVideo={handleSelectLibraryItem}
          onSaveCurrentToLibrary={handleSaveCurrentToLibrary}
          onRemoveFromLibrary={handleRemoveFromLibrary}
          onUpdateVideoSettings={handleUpdateVideoSettings}
        />

        {/* Share Link with App Modal */}
        <ShareLinkModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          currentUrl={currentUrl}
          onLoadSharedVideo={handleProcessSharedLink}
        />

        {/* Settings Modal (Pauses video when opened per Android guidelines) */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSettings={handleResetSettings}
          onOpenApkUpdate={() => setIsApkUpdateModalOpen(true)}
        />

        {/* APK Update & In-App Installation Modal */}
        <ApkUpdateModal
          isOpen={isApkUpdateModalOpen}
          onClose={() => setIsApkUpdateModalOpen(false)}
        />

        {/* Activity Log Modal */}
        <ActivityLogModal
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
        />

        <OfflineIndicator />
        <NetworkInspectorModal />
        <ErrorInspectorModal />
        {settings.enableDiagnosticDock && <FloatingDiagnosticDock />}

        {/* Quick Floating Dock on Landing Page for Demo Video */}
        <DemoQuickFloatingDock
          videoId={videoId}
          settings={settings}
          selectedTargetLang={selectedTargetLang}
          onUpdateSettings={handleUpdateSettings}
          onSelectTargetLanguage={handleUpdateTargetLang}
          onOpenArtifacts={() => setIsArtifactsModalOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-red-500/30 selection:text-red-200">
      <Navbar
        onOpenLibrary={() => setIsLibraryOpen(true)}
        libraryCount={library.length}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenArtifacts={() => setIsArtifactsModalOpen(true)}
        onOpenSettings={() => {
          try {
            playerRef.current?.pauseVideo?.();
          } catch {}
          setIsSettingsModalOpen(true);
        }}
        onOpenLogs={() => setIsLogsModalOpen(true)}
        onOpenTTSInputs={() => setIsTTSInputsModalOpen(true)}
        onOpenApkUpdate={() => setIsApkUpdateModalOpen(true)}
        hasApkUpdate={hasApkUpdate && isAndroidApp}
        latestApkVersion={latestApkTag}
        settings={settings}
      />

      <main className="flex-1 w-full flex flex-col items-center py-6 px-4 sm:px-6">
        <div
          className={`w-full flex flex-col gap-6 transition-all duration-300 ${
            theaterMode ? 'max-w-7xl' : 'max-w-5xl'
          }`}
        >
          {/* Newer APK Available Banner in Expanded View (Only on Android) */}
          {hasApkUpdate && isAndroidApp && (
            <div
              id="expanded-apk-update-banner"
              data-testid="expanded-apk-update-banner"
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/70 text-emerald-100 shadow-xl flex items-center justify-between gap-4 animate-fadeIn"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-emerald-300">
                    Newer Version Available ({latestApkTag})
                  </h3>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    A newer release of YouTube Subtitle &amp; Speech Flow Viewer is ready for installation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="expanded-apk-update-btn"
                  onClick={() => setIsApkUpdateModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950 transition active:scale-95"
                >
                  Download &amp; Install
                </button>
                <button
                  type="button"
                  onClick={() => setHasApkUpdate(false)}
                  className="p-1.5 text-emerald-400 hover:text-emerald-200"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* URL Cache Reset Indicator Toast */}
          {cacheResetToast && (
            <div
              id="cache-reset-indicator"
              data-testid="cache-reset-indicator"
              className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">{cacheResetToast}</span>
              </div>
              <button
                type="button"
                id="dismiss-cache-reset-indicator"
                onClick={() => setCacheResetToast(null)}
                className="p-1 text-amber-400 hover:text-amber-200 transition"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Shared Link Complaint Banner: The app will complain if it's not a YouTube link */}
          {sharedLinkComplaint && (
            <div
              id="shared-link-complaint-banner"
              data-testid="shared-link-complaint-banner"
              className="p-4 rounded-2xl bg-red-950/80 border border-red-700/80 text-red-200 shadow-xl flex items-start justify-between gap-3 animate-fadeIn"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-900/60 text-red-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-red-300 flex items-center gap-2">
                    <span>Invalid Video Link (Not a YouTube Link)</span>
                  </h3>
                  <p className="text-xs text-red-200/90 leading-relaxed">
                    {sharedLinkComplaint}
                  </p>
                  <p className="text-[11px] text-red-400 mt-1">
                    Please share a valid YouTube link (such as <code className="font-mono bg-red-950 px-1 py-0.5 rounded">youtube.com/watch?v=...</code>, <code className="font-mono bg-red-950 px-1 py-0.5 rounded">youtu.be/...</code>, or Shorts).
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="dismiss-complaint-button"
                onClick={() => setSharedLinkComplaint(null)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-900/40 transition shrink-0"
                title="Dismiss complaint"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Shared Link Success Banner */}
          {sharedLinkSuccess && (
            <div
              id="shared-link-success-banner"
              data-testid="shared-link-success-banner"
              className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{sharedLinkSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setSharedLinkSuccess(null)}
                className="p-1 text-emerald-400 hover:text-emerald-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Restored Subtitles Notification Toast */}
          {restoredToast && (
            <div
              id="restored-subtitles-toast"
              data-testid="restored-subtitles-toast"
              className="px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/80 text-indigo-200 text-xs flex items-center justify-between gap-3 animate-fadeIn shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{restoredToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setRestoredToast(null)}
                className="p-1 text-indigo-400 hover:text-indigo-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Step 1: Link paste, Sharing & Library Access */}
          <LinkInputBar
            currentUrl={currentUrl}
            onSelectVideo={handleSelectVideo}
            onOpenLibrary={() => setIsLibraryOpen(true)}
            onOpenShare={() => setIsShareModalOpen(true)}
            libraryCount={library.length}
          />

          {/* Web Companion Demo Showcase & Fixed Multi-lingual Artifacts Bar */}
          {!isAndroidApp && (
            <div
              id="web-demo-showcase-bar"
              data-testid="web-demo-showcase-bar"
              className="p-4 rounded-2xl glass-panel border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-100">Web Companion Demo</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                      Live Showcase &amp; CI/CD Test Driver
                    </span>
                  </div>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    Demonstrating authentic dual-language subtitle learning with 1,578 bundled cues for video <strong className="text-neutral-200">FcRzAdI8R9U</strong> (Russian source, Hebrew, Italian, English, Arabic). Pure SRT synchronization with zero queues.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  id="demo-load-default-video-btn"
                  onClick={() => handleSelectVideo(DEFAULT_VIDEO_ID, DEFAULT_VIDEO_URL)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-xs transition active:scale-95"
                >
                  Reset Demo Video
                </button>
                <button
                  type="button"
                  id="demo-open-artifacts-btn"
                  onClick={() => setIsArtifactsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-semibold text-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cached .SRT Tracks</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Video Player */}
          <VideoPlayer
            ref={playerRef}
            videoId={videoId}
            originalUrl={currentUrl}
            theaterMode={theaterMode}
            onToggleTheater={() => setTheaterMode(!theaterMode)}
            startTime={startTime}
            detectedFormat={detectedFormat}
            onFetchSubtitles={() => handleFetchSubtitles(videoId, false)}
            isFetchingSubtitles={isFetchingSubtitles}
            hasSubtitles={activeCues.length > 0}
            captionsEnabled={captionsEnabled}
            compactView={false}
            isSyncActive={syncEngine.isSyncActive}
            onToggleSync={syncEngine.togglePlayPause}
            onStateChange={syncEngine.handleYTStateChange}
            isLoopingCue={syncEngine.isLoopingCue}
            onToggleLoopCue={syncEngine.toggleLoopCue}
            onNextCue={syncEngine.nextCue}
            onPrevCue={syncEngine.prevCue}
            syncTTSText={syncEngine.currentTTSText}
            syncTTSLang={syncEngine.currentTTSLang}
            isSyncSpeaking={syncEngine.isSpeaking}
            syncTTSCharIndex={syncEngine.activeCharIndex}
            onTimeUpdate={handlePlayerTimeUpdate}
            activeCue={effectiveActiveCue}
            translatedCueText={effectiveTranslatedCueText}
            targetLanguage={selectedTargetLang}
            onSelectTargetLanguage={handleUpdateTargetLang}
            subtitlePosition={settings.subtitlePosition}
            showTranslatedOnTop={settings.showTranslatedOnTop}
            alwaysShowKeyControls={settings.alwaysShowKeyControls}
            onChangeSubtitlePosition={(pos) => handleUpdateSettings({ ...settings, subtitlePosition: pos })}
            onOpenTargetLanguageModal={() => setIsTargetLangModalOpen(true)}
            onOpenArtifacts={() => setIsArtifactsModalOpen(true)}
            onOpenLogs={() => setIsLogsModalOpen(true)}
            onOpenSettings={() => {
              try {
                playerRef.current?.pauseVideo?.();
              } catch {}
              setIsSettingsModalOpen(true);
            }}
            onBackOrClose={() => setIsLibraryOpen(true)}
            onToggleCaptions={(enabled) => {
              setCaptionsEnabled(enabled);
              const isAndroidApp = isAndroidAppEnvironment();
              if (enabled) {
                dispatch(
                  transition({
                    to: 'fetching_captions',
                    actionName: 'CAPTION_ICON_TOGGLED_ON',
                    payload: { videoId },
                  })
                );
                // Subtitle auto-detection when enabling captions is scoped to Android app
                if (activeCues.length === 0 && isAndroidApp) {
                  handleFetchSubtitles(videoId, false);
                }
              } else {
                dispatch(
                  transition({
                    to: 'video_ready',
                    actionName: 'CAPTION_ICON_TOGGLED_OFF',
                    payload: { videoId },
                  })
                );
              }
            }}
          />

          {/* Steps 2-6: Subtitles Teacher & Multi-Column Translation Workspace */}
          <SubtitlesTeacherPanel
            cues={activeCues}
            playerRef={playerRef}
            observedTimedTextUrl={observedTimedTextUrl}
            videoId={videoId}
            selectedTargetLang={selectedTargetLang}
            onSelectTargetLang={handleUpdateTargetLang}
            onUpdateVideoSettings={handleUpdateVideoSettings}
            onUpdateObservedTimedTextUrl={(newUrl) => {
              saveObservedTimedTextUrl(videoId, newUrl);
              setObservedTimedTextUrl(newUrl);
            }}
            onLoadCues={(newCues) => {
              setCustomCues(newCues);
              saveCachedSubtitles(videoId, newCues, {
                title: `Video ${videoId}`,
                originalUrl: currentUrl,
              });
            }}
            onOpenLibrary={() => setIsLibraryOpen(true)}
            onOpenArtifacts={() => setIsArtifactsModalOpen(true)}
            onFetchSubtitles={() => handleFetchSubtitles(videoId, false)}
            isFetchingSubtitles={isFetchingSubtitles}
            fetchError={fetchError}
            activeCue={effectiveActiveCue}
            onJumpToCue={(cue, idx) => {
              setActiveCue(cue);
              if (syncEngine.isSyncActive) {
                syncEngine.jumpToCue(idx);
              }
            }}
            syncEngine={syncEngine}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-4 px-6 text-center text-xs text-neutral-500 flex flex-wrap items-center justify-center gap-2">
        <span>YouTube Language Learning</span>
        <span>•</span>
        <span>Synchronized Subtitles &amp; Multi-Language Translation</span>
        <span>•</span>
        <span>Link Sharing &amp; Persistent Subtitle Caching</span>
      </footer>

      {/* Target Language Selection Modal for each video */}
      <SelectTargetLanguageModal
        isOpen={isTargetLangModalOpen}
        videoId={videoId}
        onClose={() => setIsTargetLangModalOpen(false)}
        currentSelectedLang={selectedTargetLang}
        onSelectLanguage={handleUpdateTargetLang}
        onUpdateTtsRate={(langCode, rate) => {
          handleUpdateVideoSettings(videoId, {
            ttsRates: { [langCode]: rate },
          });
        }}
      />

      {/* Subtitle Artifacts Browser Modal */}
      <SubtitleArtifactsModal
        isOpen={isArtifactsModalOpen}
        onClose={() => setIsArtifactsModalOpen(false)}
        videoId={videoId}
        activeTargetLang={selectedTargetLang}
        onSelectLanguage={handleUpdateTargetLang}
        onSeek={(seconds) => {
          try {
            playerRef.current?.seekTo?.(seconds);
          } catch {}
        }}
      />

      {/* Video & Subtitle Library Modal */}
      <VideoLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        library={library}
        currentVideoId={videoId}
        currentCues={activeCues}
        onSelectVideo={handleSelectLibraryItem}
        onSaveCurrentToLibrary={handleSaveCurrentToLibrary}
        onRemoveFromLibrary={handleRemoveFromLibrary}
        onUpdateVideoSettings={handleUpdateVideoSettings}
      />

      {/* Share Link with App Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUrl={currentUrl}
        onLoadSharedVideo={handleProcessSharedLink}
      />

      {/* Network offline warning */}
      <OfflineIndicator />

      {/* Activity Log Modal with Copy All option */}
      <ActivityLogModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />

      {/* Dedicated TTS Input Texts View Modal (Newer on Top) */}
      <TTSInputTextsModal
        isOpen={isTTSInputsModalOpen}
        onClose={() => setIsTTSInputsModalOpen(false)}
      />

      {/* Settings Modal (Advanced features OFF by default) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
        onOpenApkUpdate={() => setIsApkUpdateModalOpen(true)}
      />

      {/* APK Update & In-App Installation Modal */}
      <ApkUpdateModal
        isOpen={isApkUpdateModalOpen}
        onClose={() => setIsApkUpdateModalOpen(false)}
      />

      {/* Real-time Web Network Traffic Inspector */}
      <NetworkInspectorModal />

      {/* App Errors & Redux State Machine Actions Inspector */}
      <ErrorInspectorModal />

      {/* Persistent Floating Diagnostic Dock (if enabled in settings) */}
      {settings.enableDiagnosticDock && (
        <FloatingDiagnosticDock
          onOpenTTSInputs={() => setIsTTSInputsModalOpen(true)}
        />
      )}

      {/* Quick Floating Dock on Landing Page for Demo Video */}
      <DemoQuickFloatingDock
        videoId={videoId}
        settings={settings}
        selectedTargetLang={selectedTargetLang}
        onUpdateSettings={handleUpdateSettings}
        onSelectTargetLanguage={handleUpdateTargetLang}
        onOpenArtifacts={() => setIsArtifactsModalOpen(true)}
      />
    </div>
  );
}
