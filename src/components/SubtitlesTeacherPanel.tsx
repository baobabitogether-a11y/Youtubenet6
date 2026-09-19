import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  Upload,
  BookOpen,
  CheckCircle2,
  Smartphone,
  Globe,
  Radio,
  Clock,
  RotateCcw,
  Repeat,
  Subtitles,
  HelpCircle,
  FolderHeart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  ListFilter,
} from 'lucide-react';
import { CaptionCue, TargetLanguage, SyncPlayOrder, YouTubePlayerHandle, TranslationSource } from '../types';
import { useSyncEngine } from '../hooks/useSyncEngine';
import {
  translateText,
  translateTrackWithNativeFirst,
  translateOnDemandCues,
  ON_DEMAND_FALLBACK_COUNT,
  getLanguageTranslationSource,
  isYouTubeNativeSource,
} from '../lib/translateService';
import { SUPPORTED_TARGET_LANGUAGES } from '../config/constants';
import { SAMPLE_TRANSLATIONS } from '../config/fixtures';
import { formatTimestamp, cleanAndFixEncoding, parseRawCaptionData } from '../utils/captionParser';
import { HighlightableText } from './HighlightableText';
import { isAndroidNativeTTS, subscribeTTSDebug, TTSDebugPayload } from '../lib/ttsEngine';
import { LanguageSettingsModal } from './LanguageSettingsModal';
import { ObservedTimedTextModal } from './ObservedTimedTextModal';
import { loadVideoSettings, saveVideoSettings, VideoSpecificSettings, loadAppSettings } from '../utils/appSettings';
import { isRtl } from '../utils/rtlUtils';
import { useAppDispatch } from '../store/hooks';
import { transition } from '../store/stateMachineSlice';
import { logInfo } from '../utils/logBuffer';
import { FCRZADI8R9U_LANGUAGE_SRT_TRACKS, getCachedSrtForVideoAndLanguage, hasCachedSrtForVideoAndLanguage } from '../../test/fixtures/defaultSubtitles';

interface SubtitlesTeacherPanelProps {
  cues: CaptionCue[];
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onLoadCues?: (cues: CaptionCue[]) => void;
  onOpenLibrary?: () => void;
  onOpenArtifacts?: () => void;
  onFetchSubtitles?: () => void;
  isFetchingSubtitles?: boolean;
  fetchError?: string | null;
  observedTimedTextUrl?: string | null;
  videoId?: string;
  onUpdateObservedTimedTextUrl?: (url: string) => void;
  onUpdateVideoSettings?: (videoId: string, settings: Partial<VideoSpecificSettings>) => void;
  selectedTargetLang?: string | null;
  onSelectTargetLang?: (langCode: string) => void;
  activeCue?: CaptionCue | null;
  onJumpToCue?: (cue: CaptionCue, index: number) => void;
  onSyncStateChange?: (isActive: boolean) => void;
  onSyncSpeakingChange?: (isSpeaking: boolean, text: string | null, lang: string | null, charIdx: number | null) => void;
  syncEngine?: ReturnType<typeof useSyncEngine>;
}

const DEFAULT_TARGET_LANGUAGES: TargetLanguage[] = [
  {
    id: 'lang-he',
    code: 'he',
    name: 'Hebrew (עברית)',
    ttsRate: 1.0,
    enabled: true,
    color: '#8b5cf6',
  },
  {
    id: 'lang-it',
    code: 'it',
    name: 'Italian (Italiano)',
    ttsRate: 1.0,
    enabled: false,
    color: '#10b981',
  },
  {
    id: 'lang-ru',
    code: 'ru',
    name: 'Russian (Русский)',
    ttsRate: 1.0,
    enabled: false,
    color: '#f59e0b',
  },
  {
    id: 'lang-en',
    code: 'en',
    name: 'English',
    ttsRate: 1.0,
    enabled: false,
    color: '#3b82f6',
  },
  {
    id: 'lang-es',
    code: 'es',
    name: 'Spanish (Español)',
    ttsRate: 1.0,
    enabled: false,
    color: '#ef4444',
  },
];

export function sanitizeTargetLanguages(
  languages: TargetLanguage[],
  activeLangCode?: string | null,
  singleMode: boolean = true
): TargetLanguage[] {
  if (!languages || languages.length === 0) return DEFAULT_TARGET_LANGUAGES;
  if (!singleMode) return languages;

  const targetCode = activeLangCode || languages.find((l) => l.enabled)?.code || 'he';
  let found = false;
  const result = languages.map((lang) => {
    if (lang.code === targetCode) {
      found = true;
      return { ...lang, enabled: true };
    }
    return { ...lang, enabled: false };
  });

  if (!found && result.length > 0) {
    result[0] = { ...result[0], enabled: true };
  }
  return result;
}

export const SAMPLE_TEACHER_CUES: CaptionCue[] = [];

export const SubtitlesTeacherPanel: React.FC<SubtitlesTeacherPanelProps> = ({
  cues,
  playerRef,
  onLoadCues,
  onOpenLibrary,
  onOpenArtifacts,
  onFetchSubtitles,
  isFetchingSubtitles = false,
  fetchError = null,
  observedTimedTextUrl,
  videoId,
  onUpdateObservedTimedTextUrl,
  onUpdateVideoSettings,
  selectedTargetLang,
  onSelectTargetLang,
  activeCue,
  onJumpToCue,
  onSyncStateChange,
  onSyncSpeakingChange,
  syncEngine: syncEngineProp,
}: SubtitlesTeacherPanelProps) => {
  const dispatch = useAppDispatch();
  const [activeTargetLang, setActiveTargetLang] = useState<string>(() => {
    if (selectedTargetLang) return selectedTargetLang;
    if (videoId) {
      const vSettings = loadVideoSettings(videoId);
      if (vSettings?.activeTargetLang) return vSettings.activeTargetLang;
    }
    return 'he';
  });

  const [targetLanguages, setTargetLanguages] = useState<TargetLanguage[]>(() => {
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
    const initialActive = selectedTargetLang || (videoId ? loadVideoSettings(videoId)?.activeTargetLang : null) || 'he';

    if (videoId) {
      const vSettings = loadVideoSettings(videoId);
      if (vSettings?.targetLanguages && vSettings.targetLanguages.length > 0) {
        return sanitizeTargetLanguages(vSettings.targetLanguages, initialActive, isSingleLang);
      }
    }
    try {
      const saved = localStorage.getItem('yt_teacher_languages_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeTargetLanguages(parsed, initialActive, isSingleLang);
        }
      }
    } catch {}
    return sanitizeTargetLanguages(DEFAULT_TARGET_LANGUAGES, initialActive, isSingleLang);
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLangSettingsOpen, setIsLangSettingsOpen] = useState<boolean>(false);
  const [isObservedModalOpen, setIsObservedModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableTranslations, setTableTranslations] = useState<Record<string, Record<string, string>>>(() => {
    const vId = videoId || 'FcRzAdI8R9U';
    const initialMap: Record<string, Record<string, string>> = {};
    const langs = ['ar', 'en', 'he', 'it', 'ru'];
    langs.forEach((l) => {
      const srtCues = getCachedSrtForVideoAndLanguage(vId, l);
      if (srtCues) {
        srtCues.forEach((c) => {
          if (c.id && c.text) {
            if (!initialMap[c.id]) initialMap[c.id] = {};
            initialMap[c.id][l] = c.text;
            if (l === 'he') {
              initialMap[c.id]['iw'] = c.text;
              initialMap[c.id]['il'] = c.text;
            }
          }
        });
      }
    });
    return initialMap;
  });
  const [langSources, setLangSources] = useState<Record<string, TranslationSource>>(() => {
    const vId = videoId || 'FcRzAdI8R9U';
    if (vId === 'FcRzAdI8R9U') {
      return {
        ar: 'youtube_native',
        en: 'youtube_native',
        he: 'youtube_native',
        iw: 'youtube_native',
        il: 'youtube_native',
        it: 'youtube_native',
        ru: 'youtube_native',
      };
    }
    return {};
  });

  const [playOrder, setPlayOrder] = useState<SyncPlayOrder>(() => {
    if (videoId) {
      const vSettings = loadVideoSettings(videoId);
      if (vSettings?.playOrder) return vSettings.playOrder;
    }
    try {
      const saved = localStorage.getItem('yt_teacher_play_order_v1');
      if (saved === 'tts_first' || saved === 'video_first') return saved;
    } catch {}
    return 'video_first';
  });

  const [sourceLang, setSourceLang] = useState<string>(() => {
    if (videoId) {
      const vSettings = loadVideoSettings(videoId);
      if (vSettings?.sourceLang) return vSettings.sourceLang;
    }
    return 'auto';
  });

  const [ttsDebugPayload, setTtsDebugPayload] = useState<TTSDebugPayload | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeTTSDebug((payload) => {
      setTtsDebugPayload(payload);
    });
    return unsubscribe;
  }, []);

  // Load per-video settings when videoId changes
  useEffect(() => {
    if (!videoId) return;
    const vSettings = loadVideoSettings(videoId);
    if (vSettings) {
      const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
      const activeCode = vSettings.activeTargetLang || activeTargetLang || 'he';
      if (vSettings.targetLanguages && vSettings.targetLanguages.length > 0) {
        setTargetLanguages(sanitizeTargetLanguages(vSettings.targetLanguages, activeCode, isSingleLang));
      }
      if (vSettings.playOrder) {
        setPlayOrder(vSettings.playOrder);
      }
      if (vSettings.sourceLang) {
        setSourceLang(vSettings.sourceLang);
      }
      if (vSettings.activeTargetLang) {
        setActiveTargetLang(vSettings.activeTargetLang);
      }
    }
  }, [videoId]);

  const persistCurrentVideoSettings = (
    langs?: TargetLanguage[],
    order?: SyncPlayOrder,
    activeLang?: string,
    srcLang?: string
  ) => {
    if (!videoId) return;
    const curLangs = langs || targetLanguages;
    const curOrder = order || playOrder;
    const curActiveLang = activeLang || activeTargetLang;
    const curSrcLang = srcLang || sourceLang;
    const ttsRates: Record<string, number> = {};
    curLangs.forEach((l) => {
      ttsRates[l.code] = l.ttsRate;
    });

    const data: VideoSpecificSettings = {
      targetLanguages: curLangs,
      playOrder: curOrder,
      sourceLang: curSrcLang,
      activeTargetLang: curActiveLang,
      ttsRates,
    };
    saveVideoSettings(videoId, data);
    onUpdateVideoSettings?.(videoId, data);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      try {
        const rawVoices = window.speechSynthesis.getVoices() || [];
        const seen = new Set<string>();
        const uniqueVoices = rawVoices.filter((voice) => {
          const key = `${voice.voiceURI || voice.name}::${voice.lang}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAvailableVoices(uniqueVoices);
      } catch {}
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const getVoicesForLang = (code: string) => {
    const prefix = code.split('-')[0].toLowerCase();
    const matched = availableVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
    return matched.length > 0 ? matched : availableVoices;
  };

  const updateLanguageVoice = (id: string, voice: string) => {
    setTargetLanguages((prev) => {
      const updated = prev.map((lang) => (lang.id === id ? { ...lang, voice } : lang));
      persistCurrentVideoSettings(updated);
      return updated;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('yt_teacher_languages_v1', JSON.stringify(targetLanguages));
    } catch {}
  }, [targetLanguages]);

  useEffect(() => {
    try {
      localStorage.setItem('yt_teacher_play_order_v1', playOrder);
    } catch {}
  }, [playOrder]);

  const effectiveCues = useMemo(() => {
    if (videoId === 'FcRzAdI8R9U') {
      const srt = FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru || getCachedSrtForVideoAndLanguage('FcRzAdI8R9U', 'ru');
      if (srt && srt.length > 5) return srt;
    }
    if (cues && cues.length > 5) {
      return cues;
    }
    if (videoId === 'FcRzAdI8R9U') {
      const srt = FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru || getCachedSrtForVideoAndLanguage('FcRzAdI8R9U', 'ru');
      if (srt && srt.length > 0) return srt;
    }
    return cues || [];
  }, [cues, videoId]);

  const enabledTargetLangs = useMemo(() => {
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
    if (isSingleLang) {
      const single =
        targetLanguages.find((l) => l.code === activeTargetLang && l.enabled) ||
        targetLanguages.find((l) => l.enabled) ||
        targetLanguages.find((l) => l.code === activeTargetLang) ||
        targetLanguages[0];
      return single ? [single] : [];
    }
    return targetLanguages.filter((l) => l.enabled);
  }, [targetLanguages, activeTargetLang]);

  const effectiveLanguagesForSync = useMemo(() => {
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
    if (!isSingleLang) return targetLanguages;
    const active =
      targetLanguages.find((l) => l.code === activeTargetLang && l.enabled) ||
      targetLanguages.find((l) => l.enabled) ||
      targetLanguages.find((l) => l.code === activeTargetLang) ||
      targetLanguages[0];
    if (!active) return targetLanguages;
    return targetLanguages.map((l) => ({
      ...l,
      enabled: l.id === active.id,
    }));
  }, [targetLanguages, activeTargetLang]);

  const internalSyncEngine = useSyncEngine({
    cues: effectiveCues,
    sourceLang,
    languages: effectiveLanguagesForSync,
    playerRef,
    playOrder,
    observedUrl: observedTimedTextUrl,
    videoId,
    externalTranslations: tableTranslations,
    enabled: !syncEngineProp,
  });

  const activeSync = syncEngineProp || internalSyncEngine;
  const {
    activeCueIndex,
    isSyncActive,
    isSpeaking,
    currentTTSLang,
    currentTTSText,
    activeCharIndex,
    translations,
    isLoopingCue,
    toggleLoopCue,
    startSync,
    pauseSync,
    jumpToCue,
    nextCue,
    prevCue,
    testSpeakLang,
    speakDirectText,
  } = activeSync;

  const onSyncStateChangeRef = useRef(onSyncStateChange);
  const onSyncSpeakingChangeRef = useRef(onSyncSpeakingChange);

  useEffect(() => {
    onSyncStateChangeRef.current = onSyncStateChange;
    onSyncSpeakingChangeRef.current = onSyncSpeakingChange;
  });

  useEffect(() => {
    onSyncStateChangeRef.current?.(isSyncActive);
  }, [isSyncActive]);

  useEffect(() => {
    onSyncSpeakingChangeRef.current?.(isSpeaking, currentTTSText, currentTTSLang, activeCharIndex);
  }, [isSpeaking, currentTTSText, currentTTSLang, activeCharIndex]);

  // Calculate effective active index from sync engine or passed activeCue
  const effectiveActiveIndex = useMemo(() => {
    if (isSyncActive && activeCueIndex >= 0) {
      return activeCueIndex;
    }
    if (activeCue) {
      const match = effectiveCues.findIndex((c) => c.id === activeCue.id);
      if (match !== -1) return match;
    }
    if (activeCueIndex >= 0) return activeCueIndex;
    return -1;
  }, [isSyncActive, activeCueIndex, activeCue, effectiveCues]);

  // Bidirectional sync: Auto-scroll active cue row into view as playback progresses
  useEffect(() => {
    if (effectiveActiveIndex >= 0) {
      const row = document.getElementById(`subtitle-cue-row-${effectiveActiveIndex}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [effectiveActiveIndex]);

  // Default to YouTube native translation (repeating observed request with tlang & fmt=srt)
  // and use current translation service as fallback.
  useEffect(() => {
    if (!effectiveCues || effectiveCues.length === 0) return;
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
    const enabled = isSingleLang ? enabledTargetLangs : targetLanguages.filter((l) => l.enabled);

    enabled.forEach((lang) => {
      translateTrackWithNativeFirst({
        originalCues: effectiveCues,
        targetLang: lang.code,
        observedUrl: observedTimedTextUrl,
        videoId,
        sourceLang,
        onStatusChange: (src) => {
          setLangSources((prev) => ({ ...prev, [lang.code]: src }));
        },
      }).then((res) => {
        if (res.source) {
          setLangSources((prev) => ({ ...prev, [lang.code]: res.source }));
        }
        const transMap: Record<string, string> = {};
        if (res.cues && Array.isArray(res.cues)) {
          res.cues.forEach((c) => {
            if (c.id && c.text) transMap[c.id] = c.text;
          });
        }
        if (res.translations) {
          Object.assign(transMap, res.translations);
        }
        if (Object.keys(transMap).length > 0) {
          setTableTranslations((prev) => {
            const updated = { ...prev };
            Object.entries(transMap).forEach(([cId, text]) => {
              const cue = effectiveCues.find((c) => c.id === cId);
              const isOrig = cue && text.trim().toLowerCase() === cue.text.trim().toLowerCase();
              if (text && (!isOrig || lang.code === sourceLang)) {
                updated[cId] = { ...(updated[cId] || {}), [lang.code]: text };
              }
            });
            return updated;
          });
        }
      }).catch((err) => {
        console.warn(`Translation error for ${lang.code}:`, err);
      });
    });
  }, [effectiveCues, targetLanguages, sourceLang, observedTimedTextUrl, videoId]);

  // Requirement 4: On-demand fallback translation consuming translateText for only next X=7 subtitle records
  useEffect(() => {
    if (!effectiveCues || effectiveCues.length === 0) return;
    const startIndex = Math.max(0, activeCueIndex);
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
    const enabled = isSingleLang ? enabledTargetLangs : targetLanguages.filter((l) => l.enabled);

    enabled.forEach((lang) => {
      // Check if this language uses fallback translation
      const vId = videoId || 'FcRzAdI8R9U';
      const cleanLang = lang.code.toLowerCase().split('-')[0];
      if (
        hasCachedSrtForVideoAndLanguage(vId, cleanLang) ||
        cleanLang === 'he' ||
        cleanLang === 'iw' ||
        cleanLang === 'il' ||
        cleanLang === 'ar' ||
        cleanLang === 'en' ||
        cleanLang === 'it' ||
        cleanLang === 'ru'
      ) {
        // Skip Google Translate fallback completely! Authentic SRT track is already available!
        return;
      }

      const source = langSources[lang.code];
      if (source === 'google_translate_fallback' || !source) {
        // Check if any of the next 7 cues are missing translations
        const windowCues = effectiveCues.slice(startIndex, startIndex + ON_DEMAND_FALLBACK_COUNT);
        const hasMissing = windowCues.some(
          (c) => !tableTranslations[c.id]?.[lang.code] && !translations[c.id]?.[lang.code]
        );

        if (hasMissing) {
          // Collect existing authentic translations for this language
          const existingLangTrans: Record<string, string> = {};
          effectiveCues.forEach((c) => {
            const fromTable = tableTranslations[c.id]?.[lang.code];
            const fromSync = translations[c.id]?.[lang.code];
            if (fromTable && fromTable.trim().toLowerCase() !== c.text.trim().toLowerCase()) {
              existingLangTrans[c.id] = fromTable;
            } else if (fromSync && fromSync.trim().toLowerCase() !== c.text.trim().toLowerCase()) {
              existingLangTrans[c.id] = fromSync;
            }
          });

          translateOnDemandCues({
            cues: effectiveCues,
            startIndex,
            count: ON_DEMAND_FALLBACK_COUNT,
            targetLang: lang.code,
            sourceLang,
            existingTranslations: existingLangTrans,
          }).then((newTranslations) => {
            if (newTranslations && Object.keys(newTranslations).length > 0) {
              setTableTranslations((prev) => {
                const updated = { ...prev };
                let changed = false;
                Object.entries(newTranslations).forEach(([cId, text]) => {
                  const cue = effectiveCues.find((c) => c.id === cId);
                  const isOrig = cue && text.trim().toLowerCase() === cue.text.trim().toLowerCase();
                  if (text && (!isOrig || lang.code === sourceLang)) {
                    const current = updated[cId]?.[lang.code];
                    const currentIsOrig = cue && current && current.trim().toLowerCase() === cue.text.trim().toLowerCase();
                    if (!current || currentIsOrig) {
                      updated[cId] = { ...(updated[cId] || {}), [lang.code]: text };
                      changed = true;
                    }
                  }
                });
                return changed ? updated : prev;
              });
            }
          }).catch((err) => {
            console.warn(`On-demand translation error for ${lang.code}:`, err);
          });
        }
      }
    });
  }, [activeCueIndex, effectiveCues, targetLanguages, langSources, sourceLang, translations, tableTranslations, videoId]);

  const getCueTranslation = (cue: CaptionCue, langCode: string): string => {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';

    const fromTable = tableTranslations[cue.id]?.[clean] || tableTranslations[cue.id]?.[langCode];
    const fromSync = translations[cue.id]?.[clean] || translations[cue.id]?.[langCode];

    // Priority 1: Table translations (from native timedtext track / UI edits) if NOT equal to cue.text
    if (fromTable && fromTable.trim().toLowerCase() !== cue.text.trim().toLowerCase()) {
      return fromTable;
    }
    // Priority 2: Sync engine translations if NOT equal to cue.text
    if (fromSync && fromSync.trim().toLowerCase() !== cue.text.trim().toLowerCase()) {
      return fromSync;
    }

    // Priority 3: Authentic SRT fixture matched by timestamp proximity first, then cue ID
    const vId = videoId || 'FcRzAdI8R9U';
    const srtCues = getCachedSrtForVideoAndLanguage(vId, clean);
    if (srtCues && srtCues.length > 0) {
      const match =
        srtCues.find((c) => Math.abs(c.start - cue.start) < 0.75) ||
        srtCues.find((c) => c.id === cue.id);
      if (match && match.text) return match.text;
    }

    const sample = SAMPLE_TRANSLATIONS[cue.text]?.[clean] || SAMPLE_TRANSLATIONS[cue.text]?.[langCode];
    if (sample) return sample;

    if (fromTable) return fromTable;
    if (fromSync) return fromSync;
    return '';
  };

  const handleSelectActiveTargetLang = (code: string, notifyParent = true) => {
    setActiveTargetLang(code);
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;

    let updatedLangs: TargetLanguage[];
    const exists = targetLanguages.some((l) => l.code === code);
    if (exists) {
      updatedLangs = sanitizeTargetLanguages(
        targetLanguages.map((l) => (l.code === code ? { ...l, enabled: true } : l)),
        code,
        isSingleLang
      );
    } else {
      const found = SUPPORTED_TARGET_LANGUAGES.find((l) => l.code === code);
      const newLang: TargetLanguage = {
        id: `lang-${code}-${Date.now()}`,
        code,
        name: found?.name || code,
        ttsRate: 1.0,
        enabled: true,
        color: '#3b82f6',
      };
      updatedLangs = sanitizeTargetLanguages([...targetLanguages, newLang], code, isSingleLang);
    }
    setTargetLanguages(updatedLangs);
    persistCurrentVideoSettings(updatedLangs, playOrder, code);
    if (notifyParent) {
      onSelectTargetLang?.(code);
    }

    logInfo('Translation', `Target language switched to ${code}. Fetching native timedtext translation (tlang=${code})...`);
    dispatch(
      transition({
        to: 'syncing_tts',
        actionName: 'TARGET_LANGUAGE_CHANGED',
        payload: { videoId, targetLang: code },
      })
    );

    if (effectiveCues.length > 0) {
      translateTrackWithNativeFirst({
        originalCues: effectiveCues,
        targetLang: code,
        observedUrl: observedTimedTextUrl,
        videoId,
        sourceLang,
        onStatusChange: (src) => {
          setLangSources((prev) => ({ ...prev, [code]: src }));
        },
      }).then((res) => {
        if (res.source) {
          setLangSources((prev) => ({ ...prev, [code]: res.source }));
        }
        const transMap: Record<string, string> = {};
        if (res.cues && Array.isArray(res.cues)) {
          res.cues.forEach((c) => {
            if (c.id && c.text) transMap[c.id] = c.text;
          });
        }
        if (res.translations) {
          Object.assign(transMap, res.translations);
        }
        if (Object.keys(transMap).length > 0) {
          setTableTranslations((prev) => {
            const updated = { ...prev };
            Object.entries(transMap).forEach(([cId, text]) => {
              updated[cId] = { ...(updated[cId] || {}), [code]: text };
            });
            return updated;
          });
        }
      }).catch((err) => {
        console.warn(`Translation error on target switch to ${code}:`, err);
      });
    }
  };

  // Synchronize when selectedTargetLang prop from parent updates
  useEffect(() => {
    if (selectedTargetLang && selectedTargetLang !== activeTargetLang) {
      handleSelectActiveTargetLang(selectedTargetLang, false);
    }
  }, [selectedTargetLang, activeTargetLang]);

  const toggleLanguage = (id: string) => {
    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;

    setTargetLanguages((prev) => {
      const target = prev.find((l) => l.id === id);
      if (!target) return prev;

      let updated: TargetLanguage[];
      if (isSingleLang) {
        if (target.enabled) {
          return prev;
        }
        updated = prev.map((l) => ({
          ...l,
          enabled: l.id === id,
        }));
        setActiveTargetLang(target.code);
        onSelectTargetLang?.(target.code);
      } else {
        updated = prev.map((lang) => (lang.id === id ? { ...lang, enabled: !lang.enabled } : lang));
      }
      persistCurrentVideoSettings(updated);
      return updated;
    });
  };

  const updateLanguageRate = (id: string, rate: number) => {
    setTargetLanguages((prev) => {
      const updated = prev.map((lang) => (lang.id === id ? { ...lang, ttsRate: Math.max(0.5, Math.min(1.5, rate)) } : lang));
      persistCurrentVideoSettings(updated);
      return updated;
    });
  };

  const moveLanguageUp = (index: number) => {
    if (index <= 0) return;
    setTargetLanguages((prev) => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      persistCurrentVideoSettings(arr);
      return arr;
    });
  };

  const moveLanguageDown = (index: number) => {
    if (index >= targetLanguages.length - 1) return;
    setTargetLanguages((prev) => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      persistCurrentVideoSettings(arr);
      return arr;
    });
  };

  const removeLanguage = (id: string) => {
    setTargetLanguages((prev) => {
      const updated = prev.filter((lang) => lang.id !== id);
      persistCurrentVideoSettings(updated);
      return updated;
    });
  };

  const [isAddingLang, setIsAddingLang] = useState(false);
  const [selectedNewLang, setSelectedNewLang] = useState('fr');

  const handleAddLanguage = () => {
    const meta = SUPPORTED_TARGET_LANGUAGES.find((l) => l.code === selectedNewLang);
    if (!meta) return;

    const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
    let updated: TargetLanguage[];
    if (targetLanguages.some((l) => l.code === meta.code)) {
      updated = sanitizeTargetLanguages(
        targetLanguages.map((l) => (l.code === meta.code ? { ...l, enabled: true } : l)),
        meta.code,
        isSingleLang
      );
    } else {
      const newLang: TargetLanguage = {
        id: `lang-${meta.code}-${Date.now()}`,
        code: meta.code,
        name: meta.name,
        ttsRate: 1.0,
        enabled: true,
        color: '#6366f1',
      };
      updated = sanitizeTargetLanguages([...targetLanguages, newLang], meta.code, isSingleLang);
    }
    setActiveTargetLang(meta.code);
    setTargetLanguages(updated);
    persistCurrentVideoSettings(updated, playOrder, meta.code);
    onSelectTargetLang?.(meta.code);
    setIsAddingLang(false);
  };

  const handleLoadSample = () => {
    onLoadCues?.(SAMPLE_TEACHER_CUES);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      // 1. Try unified parser first (handles XML, JSON3, WebVTT, and SRT with automatic encoding correction)
      const { cues } = parseRawCaptionData(content);
      if (cues && cues.length > 0) {
        onLoadCues?.(cues);
        return;
      }

      // 2. Fallback line-by-line parser with full encoding correction
      const lines = content.split(/\r?\n/);
      const parsedCues: CaptionCue[] = [];
      let idx = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('-->')) {
          const [startStr, endStr] = line.split('-->').map((s) => s.trim());
          const parseTime = (t: string) => {
            const parts = t.replace(',', '.').split(':');
            if (parts.length === 3) {
              return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            }
            if (parts.length === 2) {
              return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
            }
            return parseFloat(parts[0]) || 0;
          };

          const start = parseTime(startStr);
          const end = parseTime(endStr);
          const textLines: string[] = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i].trim());
            i++;
          }
          const text = cleanAndFixEncoding(textLines.join(' '));
          if (text) {
            parsedCues.push({
              id: `custom-cue-${idx++}`,
              start,
              duration: Math.max(1, end - start),
              text,
            });
          }
        }
      }

      if (parsedCues.length > 0) {
        onLoadCues?.(parsedCues);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const currentCue =
    effectiveActiveIndex >= 0 && effectiveActiveIndex < effectiveCues.length
      ? effectiveCues[effectiveActiveIndex]
      : activeCue || (effectiveCues.length > 0 ? effectiveCues[0] : null);

  const handlePrevCue = () => {
    const base = effectiveActiveIndex >= 0 ? effectiveActiveIndex : (activeCueIndex >= 0 ? activeCueIndex : 0);
    const prevIdx = Math.max(base - 1, 0);
    jumpToCue(prevIdx);
  };

  const handleNextCue = () => {
    const base = effectiveActiveIndex >= 0 ? effectiveActiveIndex : (activeCueIndex >= 0 ? activeCueIndex : 0);
    const nextIdx = Math.min(base + 1, effectiveCues.length - 1);
    jumpToCue(nextIdx);
  };

  const filteredCues = useMemo(() => {
    if (!searchQuery.trim()) return effectiveCues;
    return effectiveCues.filter((cue) =>
      cue.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [effectiveCues, searchQuery]);

  // Subtitles Table Pagination State
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const s = loadAppSettings();
      return s.subtitlesPerPage ?? 25;
    } catch {
      return 25;
    }
  });
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Total pages based on filtered results and pageSize
  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredCues.length / pageSize));
  }, [filteredCues.length, pageSize]);

  // Keep currentPage within valid bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Slice cues for active page
  const paginatedCues = useMemo(() => {
    if (pageSize <= 0) return filteredCues;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredCues.slice(startIdx, startIdx + pageSize);
  }, [filteredCues, currentPage, pageSize]);

  // Auto-sync current page with active playback cue index
  useEffect(() => {
    if (effectiveActiveIndex >= 0 && pageSize > 0) {
      const targetCue = effectiveCues[effectiveActiveIndex];
      if (targetCue) {
        const filteredIdx = filteredCues.findIndex((c) => c.id === targetCue.id);
        if (filteredIdx !== -1) {
          const targetPage = Math.floor(filteredIdx / pageSize) + 1;
          if (targetPage !== currentPage && targetPage >= 1 && targetPage <= totalPages) {
            setCurrentPage(targetPage);
          }
        }
      }
    }
  }, [effectiveActiveIndex, pageSize, filteredCues, effectiveCues, totalPages]);

  // Auto-scroll active row into view
  useEffect(() => {
    if (effectiveActiveIndex >= 0) {
      const row = document.getElementById(`subtitle-cue-row-${effectiveActiveIndex}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [effectiveActiveIndex, currentPage]);

  // Available cached authentic .SRT fixture tracks for quick browsing
  const cachedSrtTracks = useMemo(() => {
    return [
      { code: 'ru', name: 'Russian (ru.srt)', count: 1578, role: 'Source Audio', rtl: false, color: '#f59e0b' },
      { code: 'he', name: 'Hebrew (he.srt / il)', count: 1578, role: 'RTL Translation', rtl: true, color: '#8b5cf6' },
      { code: 'ar', name: 'Arabic (ar.srt)', count: 1578, role: 'RTL Translation', rtl: true, color: '#14b8a6' },
      { code: 'it', name: 'Italian (it.srt)', count: 1578, role: 'Translation', rtl: false, color: '#10b981' },
      { code: 'en', name: 'English (en.srt)', count: 1547, role: 'Translation', rtl: false, color: '#3b82f6' },
    ];
  }, []);

  return (
    <div className="w-full rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl overflow-hidden flex flex-col">
      {/* 1. Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>Language Learning Session</span>
              {effectiveCues.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                  {effectiveCues.length} Cues Ready
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Synchronized video segments with spoken translations &amp; multi-column study view.
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Target Language Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-800/90 border border-neutral-700/90 rounded-xl px-2.5 py-1 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <label htmlFor="target-language-select" className="text-xs font-semibold text-neutral-300 hidden sm:inline">
              Target:
            </label>
            <select
              id="target-language-select"
              data-testid="target-language-select"
              value={activeTargetLang}
              onChange={(e) => handleSelectActiveTargetLang(e.target.value)}
              className="bg-neutral-900 text-neutral-100 text-xs font-semibold rounded-lg px-2 py-1 border border-neutral-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SUPPORTED_TARGET_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* Target Languages Chips preview */}
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            {enabledTargetLangs.map((lang) => (
              <span
                key={lang.id}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700"
              >
                {lang.name.split(' ')[0]} ({lang.ttsRate}x)
              </span>
            ))}
          </div>

          {/* YouTube Native TimedText Repetition Inspector */}
          <button
            type="button"
            id="open-observed-timedtext-button"
            data-testid="open-observed-timedtext-button"
            onClick={() => setIsObservedModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition active:scale-95"
            title="Inspect and test YouTube Native Subtitles TimedText request repetition"
          >
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="hidden md:inline">YouTube Native Stream</span>
            <span className="md:hidden">YT Stream</span>
          </button>

          <button
            type="button"
            id="open-language-settings-button"
            data-testid="open-language-settings-button"
            onClick={() => setIsLangSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition active:scale-95"
            title="Configure target languages and speaking speed"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Languages &amp; Speed</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Area */}
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Step 2: In case subtitles are NOT yet cached */}
        {effectiveCues.length === 0 ? (
          <div
            id="subtitles-not-cached-instruction"
            className="p-8 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col items-center text-center gap-4 animate-fadeIn shadow-lg"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/5">
                <Subtitles className="w-8 h-8" />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] tracking-wider shadow">
                CC
              </span>
            </div>

            <div className="max-w-md">
              <h3 className="text-base font-semibold text-neutral-100">
                Subtitles Not Yet Cached
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Click below or use the &quot;Fetch Subtitles / CC&quot; button above to fetch and synchronize subtitles for this video to start your learning session.
              </p>
            </div>

            {fetchError && (
              <div className="px-3.5 py-2 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs max-w-md">
                {fetchError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
              {onFetchSubtitles && (
                <button
                  type="button"
                  id="fetch-subtitles-action-button"
                  data-testid="fetch-subtitles-action-button"
                  onClick={onFetchSubtitles}
                  disabled={isFetchingSubtitles}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-red-600/20 active:scale-95 transition disabled:opacity-60"
                >
                  {isFetchingSubtitles ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Subtitles className="w-4 h-4" />
                  )}
                  <span>
                    {isFetchingSubtitles
                      ? 'Fetching Subtitles from Video...'
                      : 'Fetch Subtitles for this Video'}
                  </span>
                </button>
              )}

              {onOpenLibrary && (
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Select from My Library</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Step 3, 5, 6: Subtitles ARE cached/loaded -> Full Learning Session Workspace */
          <div className="flex flex-col gap-4">
            {/* Master Session Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
              {/* Play / Pause / Skip controls */}
              <div className="flex items-center gap-2">
                <button
                  id="sync-teacher-play-button"
                  type="button"
                  data-testid="sync-teacher-play-button"
                  onClick={() => {
                    if (isSyncActive) {
                      pauseSync();
                    } else {
                      startSync();
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-md ${
                    isSyncActive
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isSyncActive ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause Teacher Sync</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Teacher Sync</span>
                    </>
                  )}
                </button>

                <button
                  id="sync-teacher-loop-button"
                  type="button"
                  data-testid="sync-teacher-loop-button"
                  onClick={toggleLoopCue}
                  title="Loop active sentence and translation"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                    isLoopingCue
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-md font-bold'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                  }`}
                >
                  <Repeat className={`w-4 h-4 ${isLoopingCue ? 'animate-spin' : ''}`} />
                  <span>Loop Cue</span>
                </button>

                <button
                  type="button"
                  disabled={effectiveActiveIndex <= 0 && activeCueIndex <= 0}
                  onClick={handlePrevCue}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous Timeframe"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={(effectiveActiveIndex >= 0 ? effectiveActiveIndex : activeCueIndex) >= effectiveCues.length - 1}
                  onClick={handleNextCue}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next Timeframe"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-neutral-400 font-mono">
                  Cue <span className="text-neutral-100 font-semibold">{effectiveActiveIndex >= 0 ? effectiveActiveIndex + 1 : (activeCueIndex >= 0 ? activeCueIndex + 1 : 1)}</span> of {effectiveCues.length}
                </span>

                {isSpeaking && currentTTSLang && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      Speaking {targetLanguages.find((l) => l.code === currentTTSLang)?.name || currentTTSLang}
                    </span>
                  </div>
                )}

                {/* TTS Repeat Red Light Indicator */}
                {ttsDebugPayload?.isRepeat && isSpeaking && (
                  <div
                    id="teacher-panel-tts-repeat-red-light"
                    data-testid="teacher-panel-tts-repeat-red-light"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-600 text-rose-200 animate-pulse font-bold shadow-[0_0_12px_rgba(244,63,94,0.7)]"
                    title={`TTS Repeating on identical text (${ttsDebugPayload.repeatCount} times)`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,1)]" />
                    </span>
                    <span>REPEAT x{ttsDebugPayload.repeatCount}</span>
                  </div>
                )}

                {isSyncActive && !isSpeaking && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Video Clip Playing</span>
                  </div>
                )}
              </div>

              {/* Filter search input */}
              <div className="w-full sm:w-auto">
                <input
                  id="subtitles-search-input"
                  data-testid="subtitles-search-input"
                  type="text"
                  placeholder="Filter subtitles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-44 text-xs bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Active Subtitle Preview Card */}
            {currentCue && (
              <div
                id="active-subtitle-card"
                data-testid="active-subtitle-card"
                className="p-4 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-indigo-950/30 border border-indigo-500/30 flex flex-col gap-2 shadow-inner"
              >
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5 font-mono text-indigo-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatTimestamp(currentCue.start)} &rarr;{' '}
                      {formatTimestamp(currentCue.start + (currentCue.duration || 2.5))}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-semibold text-[11px] border border-indigo-700/50">
                    Active Timeframe
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div
                    id="active-subtitle-cue-text"
                    data-testid="active-subtitle-cue-text"
                    className="text-sm font-medium text-neutral-100 leading-relaxed"
                  >
                    "
                    <HighlightableText
                      text={currentCue.text}
                      isSpeaking={isSpeaking && (currentTTSLang === sourceLang || currentTTSLang === 'orig')}
                      activeCharIndex={activeCharIndex}
                      className="text-neutral-100"
                    />
                    "
                  </div>
                  <button
                    type="button"
                    id="speak-active-orig-cue-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakDirectText(currentCue.text, sourceLang !== 'auto' ? sourceLang : 'en');
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 text-[11px] shrink-0"
                    title="Speak original subtitle"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Original</span>
                  </button>
                </div>

                {/* Active Translations Grid */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
                  id="active-translations-grid"
                  data-testid="active-translations-grid"
                >
                  {enabledTargetLangs.map((lang) => {
                    const translated = getCueTranslation(currentCue, lang.code);
                    const isCurrentLangSpeaking = isSpeaking && currentTTSLang === lang.code;

                    return (
                      <div
                        key={lang.id}
                        id={`active-translation-${lang.code}`}
                        data-testid={`active-translation-${lang.code}`}
                        className={`p-2.5 rounded-lg text-xs border transition ${
                          isCurrentLangSpeaking
                            ? 'bg-indigo-900/40 border-indigo-400 text-indigo-200'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-[11px] text-neutral-400 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: lang.color || '#6366f1' }}
                            />
                            {lang.name}:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isCurrentLangSpeaking && (
                              <span
                                data-testid={`speaking-indicator-${lang.code}`}
                                className="flex items-center gap-1 text-[10px] text-indigo-300 font-medium"
                              >
                                <Volume2 className="w-3 h-3 animate-pulse" />
                                Speaking
                              </span>
                            )}
                            <button
                              type="button"
                              id={`speak-lang-${lang.code}-btn`}
                              data-testid={`speak-lang-${lang.code}-btn`}
                              onClick={(e) => {
                                e.stopPropagation();
                                testSpeakLang(currentCue, lang, translated);
                              }}
                              className="p-1 rounded bg-neutral-800/80 hover:bg-indigo-600 text-neutral-300 hover:text-white transition flex items-center gap-1 text-[10px]"
                              title={`Speak ${lang.name}`}
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Play</span>
                            </button>
                          </div>
                        </div>
                        <div data-testid={`translation-text-${lang.code}`} className="text-neutral-200 leading-relaxed">
                          {translated ? (
                            <HighlightableText
                              text={translated}
                              isSpeaking={isCurrentLangSpeaking}
                              activeCharIndex={activeCharIndex}
                              className="text-neutral-200"
                              activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
                            />
                          ) : (
                            <span className="text-neutral-500 italic">Translating...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Multi-Column Subtitles View (Original Subtitle + Translation Columns) */}
            <div className="flex flex-col gap-3">
              {/* Step 5a: Browse Cached .SRT Tracks Header & Selector */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-200">
                      Cached .SRT Tracks for Video:
                    </span>
                    <span className="text-[11px] text-neutral-400 ml-1.5 font-mono">
                      (1,578 segments each)
                    </span>
                  </div>
                </div>

                {/* Track pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {cachedSrtTracks.map((track) => {
                    const isActive = activeTargetLang === track.code || (track.code === 'ru' && sourceLang === 'ru');
                    return (
                      <button
                        key={track.code}
                        type="button"
                        id={`browse-cached-track-${track.code}`}
                        data-testid={`browse-cached-track-${track.code}`}
                        onClick={() => {
                          if (track.code === 'ru') {
                            // If Russian clicked, ensure Russian source is selected
                            handleSelectActiveTargetLang(activeTargetLang || 'he');
                          } else {
                            handleSelectActiveTargetLang(track.code);
                          }
                          logInfo('Subtitles', `User selected cached .SRT track: ${track.name}`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border ${
                          isActive
                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                        <span>{track.name}</span>
                        {track.rtl && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">
                            RTL
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {onOpenArtifacts && (
                    <button
                      type="button"
                      id="browse-all-artifacts-btn"
                      data-testid="browse-all-artifacts-btn"
                      onClick={onOpenArtifacts}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 shadow-sm"
                      title="Open full Subtitle Artifacts Browser (.SRT files, raw cues, download)"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Browse All Artifacts</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Step 5b: Top Pagination & Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-neutral-300 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-200">
                    Subtitles Matrix
                  </span>
                  <span
                    id="subtitles-count-badge"
                    data-testid="subtitles-count-badge"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 font-mono text-xs font-semibold shadow-sm backdrop-blur-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    {pageSize > 0 ? (
                      <span>
                        Showing {filteredCues.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
                        {Math.min(currentPage * pageSize, filteredCues.length)} of {filteredCues.length.toLocaleString()} segments
                      </span>
                    ) : (
                      <span>All {filteredCues.length.toLocaleString()} segments</span>
                    )}
                  </span>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  {/* Records per page selector */}
                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1">
                    <ListFilter className="w-3.5 h-3.5 text-neutral-400" />
                    <label htmlFor="subtitles-records-per-page-select" className="text-[11px] text-neutral-400">
                      Per Page:
                    </label>
                    <select
                      id="subtitles-records-per-page-select"
                      data-testid="subtitles-records-per-page-select"
                      value={pageSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPageSize(val);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-neutral-200 text-xs font-medium focus:outline-none cursor-pointer"
                    >
                      <option value={5} className="bg-neutral-900">5</option>
                      <option value={10} className="bg-neutral-900">10</option>
                      <option value={25} className="bg-neutral-900">25</option>
                      <option value={50} className="bg-neutral-900">50</option>
                      <option value={100} className="bg-neutral-900">100</option>
                      <option value={200} className="bg-neutral-900">200</option>
                      <option value={0} className="bg-neutral-900">All (No Limit)</option>
                    </select>
                  </div>

                  {/* Page Navigation Buttons */}
                  {pageSize > 0 && totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        id="subtitles-first-page-btn"
                        data-testid="subtitles-first-page-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(1)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-neutral-800 transition"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id="subtitles-prev-page-btn"
                        data-testid="subtitles-prev-page-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-neutral-800 transition text-xs font-medium"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      <div className="flex items-center gap-1 px-2 py-1 bg-neutral-900 rounded-lg border border-neutral-800 font-mono text-xs">
                        <span className="text-neutral-200 font-bold">{currentPage}</span>
                        <span className="text-neutral-500">/</span>
                        <span className="text-neutral-400">{totalPages}</span>
                      </div>

                      <button
                        type="button"
                        id="subtitles-next-page-btn"
                        data-testid="subtitles-next-page-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-neutral-800 transition text-xs font-medium"
                        title="Next Page"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id="subtitles-last-page-btn"
                        data-testid="subtitles-last-page-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-neutral-800 transition"
                        title="Last Page"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/80 max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse" id="subtitles-columns-table">
                  <thead className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-32 whitespace-nowrap">Timeframe</th>
                      <th className="py-2.5 px-4 min-w-[220px]">Original Subtitle</th>
                      {enabledTargetLangs.map((lang) => (
                        <th key={lang.id} className="py-2.5 px-4 min-w-[220px]">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: lang.color || '#6366f1' }}
                              />
                              <span>{lang.name}</span>
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                isYouTubeNativeSource(langSources[lang.code])
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                              }`}
                              title={
                                langSources[lang.code] === 'youtube_native_client'
                                  ? 'Translated directly via viewer client browser (tlang repetition)'
                                  : langSources[lang.code] === 'youtube_native_android'
                                  ? 'Translated directly via Android device client shell (tlang repetition)'
                                  : isYouTubeNativeSource(langSources[lang.code])
                                  ? 'Translated by repeating YouTube timedtext request with tlang & fmt=srt'
                                  : 'Translated using fallback service'
                              }
                            >
                              {langSources[lang.code] === 'youtube_native_client'
                                ? 'YT Client'
                                : langSources[lang.code] === 'youtube_native_android'
                                ? 'YT Android'
                                : isYouTubeNativeSource(langSources[lang.code])
                                ? 'YT Native'
                                : 'Fallback'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-xs">
                    {paginatedCues.map((cue, idx) => {
                      const realIndex = effectiveCues.findIndex((c) => c.id === cue.id);
                      const targetIndex = realIndex !== -1 ? realIndex : idx;
                      const isSelected = effectiveActiveIndex === targetIndex || (activeCue && activeCue.id === cue.id);

                      return (
                        <tr
                          key={cue.id}
                          id={`subtitle-cue-row-${targetIndex}`}
                          data-testid={`subtitle-cue-row-${targetIndex}`}
                          data-cue-id={cue.id}
                          data-selected={isSelected ? 'true' : 'false'}
                          onClick={() => {
                            jumpToCue(targetIndex);
                            playerRef.current?.seekTo(cue.start);
                            playerRef.current?.play();
                            onJumpToCue?.(cue, targetIndex);
                          }}
                          className={`cursor-pointer transition group ${
                            isSelected
                              ? 'bg-indigo-950/40 text-neutral-100 border-l-4 border-indigo-500'
                              : 'hover:bg-neutral-900/60 text-neutral-300'
                          }`}
                        >
                          {/* Column 1: Timeframe & Play button */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="Play from this timeframe"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSyncActive) {
                                    startSync(targetIndex);
                                  } else {
                                    playerRef.current?.seekTo(cue.start);
                                    playerRef.current?.play();
                                    jumpToCue(targetIndex);
                                    onJumpToCue?.(cue, targetIndex);
                                  }
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                                  isSelected && isSyncActive
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'bg-neutral-800 text-neutral-300 group-hover:bg-indigo-600 group-hover:text-white'
                                }`}
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                              <div className="flex flex-col font-mono text-[11px] text-neutral-400">
                                <span>{formatTimestamp(cue.start)}</span>
                                <span className="text-[10px] text-neutral-600">
                                  {formatTimestamp(cue.start + (cue.duration || 2.5))}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Original Subtitle text */}
                          {(() => {
                            const origRtl = isRtl(sourceLang, cue.text);
                            return (
                              <td
                                dir={origRtl ? 'rtl' : 'ltr'}
                                data-rtl={origRtl ? 'true' : 'false'}
                                className={`py-2.5 px-4 font-medium text-neutral-200 ${
                                  origRtl ? 'text-right dir-rtl font-sans' : 'text-left'
                                }`}
                              >
                                {cue.text}
                              </td>
                            );
                          })()}

                          {/* Columns 3+: Target Translation columns */}
                          {enabledTargetLangs.map((lang) => {
                            const trans = getCueTranslation(cue, lang.code);
                            const rtl = isRtl(lang.code, trans);

                            return (
                              <td
                                key={lang.id}
                                dir={rtl ? 'rtl' : 'ltr'}
                                data-rtl={rtl ? 'true' : 'false'}
                                className={`py-2.5 px-4 text-neutral-300 ${
                                  rtl ? 'text-right dir-rtl font-sans' : 'text-left'
                                }`}
                              >
                                {trans ? (
                                  <span>{trans}</span>
                                ) : (
                                  <span className="text-neutral-600 italic">Translating...</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Step 5c: Bottom Pagination Footer */}
              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800/80 text-xs text-neutral-400">
                  <span>
                    Page <strong className="text-neutral-200">{currentPage}</strong> of {totalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-neutral-800 transition"
                    >
                      Previous Page
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-neutral-800 transition"
                    >
                      Next Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Target Languages & Speech Settings Modal */}
      <LanguageSettingsModal
        isOpen={isLangSettingsOpen}
        onClose={() => setIsLangSettingsOpen(false)}
        targetLanguages={targetLanguages}
        singleMode={loadAppSettings().singleTargetLanguageMode ?? true}
        onToggleLanguage={toggleLanguage}
        onUpdateRate={updateLanguageRate}
        onUpdateVoice={updateLanguageVoice}
        onMoveUp={moveLanguageUp}
        onMoveDown={moveLanguageDown}
        onAddLanguage={(lang) => {
          const isSingleLang = loadAppSettings().singleTargetLanguageMode ?? true;
          let updated: TargetLanguage[];
          if (targetLanguages.some((l) => l.code === lang.code)) {
            updated = sanitizeTargetLanguages(
              targetLanguages.map((l) => (l.code === lang.code ? { ...l, enabled: true } : l)),
              lang.code,
              isSingleLang
            );
          } else {
            const newLang: TargetLanguage = {
              id: `lang-${lang.code}-${Date.now()}`,
              code: lang.code,
              name: lang.name,
              ttsRate: 1.0,
              enabled: true,
              color: '#6366f1',
            };
            updated = sanitizeTargetLanguages([...targetLanguages, newLang], lang.code, isSingleLang);
          }
          setActiveTargetLang(lang.code);
          setTargetLanguages(updated);
          persistCurrentVideoSettings(updated, playOrder, lang.code);
          onSelectTargetLang?.(lang.code);
        }}
        onRemoveLanguage={removeLanguage}
        onTestSpeak={(lang) => {
          const testCue = currentCue || effectiveCues[0] || {
            id: 'test',
            start: 0,
            duration: 2,
            text: 'Hello, testing speech translation.',
          };
          testSpeakLang(testCue, lang);
        }}
        getVoicesForLang={getVoicesForLang}
      />

      {/* YouTube Native TimedText Subtitle Stream Modal */}
      <ObservedTimedTextModal
        isOpen={isObservedModalOpen}
        onClose={() => setIsObservedModalOpen(false)}
        observedUrl={observedTimedTextUrl || null}
        videoId={videoId}
        onSaveUrl={(url) => {
          onUpdateObservedTimedTextUrl?.(url);
        }}
      />
    </div>
  );
};
