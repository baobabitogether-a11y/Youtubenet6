import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Globe, Clock, Sparkles, Layers } from 'lucide-react';
import { CaptionCue } from '../types';
import { HighlightableText } from './HighlightableText';
import { formatTimestamp } from '../utils/captionParser';
import { isRtl } from '../utils/rtlUtils';
import { AppSettings } from '../utils/appSettings';
import { subscribeTTSDebug, TTSDebugPayload } from '../lib/ttsEngine';

export interface ParallelTranslationsOverlayProps {
  displayedTargetLanguages?: string[];
  activeCue: CaptionCue | null;
  targetLangCode?: string;
  primaryTargetLang?: string;
  parallelTranslations?: Record<string, string>;
  effectiveDisplayTranslatedText?: string;
  displayTranslatedText?: string;
  translatedCueText?: string | null;
  isHebrewHighlighted?: boolean;
  showSubtitleTimestamps?: boolean;
  isSyncSpeaking?: boolean;
  syncTTSLang?: string | null;
  syncTTSCharIndex?: number | null;
  currentSpeakingCharIndex?: number | null;
  activeTTSTarget?: string | null;
  activeTTSCharIndex?: number | null;
  isTTSSpeakingState?: boolean;
  autoTTSEnabled?: boolean;
  singleTargetLanguageMode?: boolean;
  onSpeakCue?: (targetOrLang: 'original' | 'translated' | string, customText?: string, e?: React.MouseEvent) => void;
  onSpeak?: (targetOrLang: 'original' | 'translated' | string, customText?: string, e?: React.MouseEvent) => void;
  onToggleAutoTTS?: (e?: React.MouseEvent) => void;
  toggleAutoTTS?: (e?: React.MouseEvent) => void;
  onToggleParallelMode?: (e?: React.MouseEvent) => void;
  onOpenTargetLanguageModal?: () => void;
  onSeekTo?: (time: number) => void;
  seekTo?: (time: number) => void;
  settings?: AppSettings;
}

const LANGUAGE_COLOR_STYLES: Record<string, { bg: string; text: string; border: string; badgeBg: string }> = {
  he: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-500/70',
    badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/80',
  },
  it: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-500/70',
    badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80',
  },
  en: {
    bg: 'bg-sky-950/40',
    text: 'text-sky-300',
    border: 'border-sky-500/70',
    badgeBg: 'bg-sky-950/90 text-sky-300 border-sky-500/80',
  },
  ar: {
    bg: 'bg-teal-950/40',
    text: 'text-teal-300',
    border: 'border-teal-500/70',
    badgeBg: 'bg-teal-950/90 text-teal-300 border-teal-500/80',
  },
  ru: {
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-500/70',
    badgeBg: 'bg-rose-950/90 text-rose-300 border-rose-500/80',
  },
  es: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-300',
    border: 'border-orange-500/70',
    badgeBg: 'bg-orange-950/90 text-orange-300 border-orange-500/80',
  },
  fr: {
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    border: 'border-blue-500/70',
    badgeBg: 'bg-blue-950/90 text-blue-300 border-blue-500/80',
  },
  de: {
    bg: 'bg-yellow-950/40',
    text: 'text-yellow-300',
    border: 'border-yellow-500/70',
    badgeBg: 'bg-yellow-950/90 text-yellow-300 border-yellow-500/80',
  },
};

export const ParallelTranslationsOverlay: React.FC<ParallelTranslationsOverlayProps> = (props) => {
  const {
    displayedTargetLanguages,
    activeCue,
    targetLangCode,
    primaryTargetLang,
    parallelTranslations = {},
    effectiveDisplayTranslatedText,
    displayTranslatedText,
    translatedCueText,
    isHebrewHighlighted = false,
    showSubtitleTimestamps = true,
    isSyncSpeaking = false,
    syncTTSLang = null,
    syncTTSCharIndex = null,
    currentSpeakingCharIndex,
    activeTTSTarget = null,
    activeTTSCharIndex = null,
    isTTSSpeakingState = false,
    autoTTSEnabled = true,
    singleTargetLanguageMode,
    onSpeakCue,
    onSpeak,
    onToggleAutoTTS,
    toggleAutoTTS,
    onToggleParallelMode,
    onOpenTargetLanguageModal,
    onSeekTo,
    seekTo,
    settings,
  } = props;

  const [ttsDebugPayload, setTtsDebugPayload] = useState<TTSDebugPayload | null>(null);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeTTSDebug((info) => {
      setTimeout(() => {
        if (isMounted) {
          setTtsDebugPayload(info?.current || null);
        }
      }, 0);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (!activeCue) return null;

  const effectiveTargetLang = targetLangCode || primaryTargetLang || 'he';
  const effectiveSingleMode =
    singleTargetLanguageMode !== undefined
      ? singleTargetLanguageMode
      : (!displayedTargetLanguages || displayedTargetLanguages.length <= 1);

  const effectiveOnSpeak = onSpeakCue || onSpeak || (() => {});
  const effectiveOnSeekTo = onSeekTo || seekTo;
  const effectiveOnToggleTTS = onToggleAutoTTS || toggleAutoTTS || (() => {});
  const effectiveCharIndex = currentSpeakingCharIndex ?? activeTTSCharIndex ?? syncTTSCharIndex ?? null;

  const isRepeatingCurrentTTS =
    Boolean(ttsDebugPayload?.isRepeat && (isTTSSpeakingState || isSyncSpeaking));
  const currentRepeatCount = ttsDebugPayload?.repeatCount || 1;

  // Single target language presentation
  if (effectiveSingleMode) {
    const lang = effectiveTargetLang;
    const translationText =
      parallelTranslations[lang] ||
      effectiveDisplayTranslatedText ||
      displayTranslatedText ||
      translatedCueText ||
      '';

    if (!translationText) return null;

    const isTranslatedRtl = isRtl(lang, translationText);
    const isThisLangSpeaking =
      (isTTSSpeakingState && (activeTTSTarget === 'translated' || activeTTSTarget === lang)) ||
      (isSyncSpeaking && (syncTTSLang === lang || syncTTSLang === 'target'));

    return (
      <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
        {showSubtitleTimestamps && (
          <button
            type="button"
            id="cue-time-section"
            data-testid="cue-time-section"
            onClick={(e) => {
              e.stopPropagation();
              effectiveOnSeekTo?.(activeCue.start);
            }}
            className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-1.5 py-0.5 rounded shrink-0 select-none shadow-sm whitespace-nowrap hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-50"
            title={`Subtitle timeframe: ${formatTimestamp(activeCue.start)} to ${formatTimestamp(
              activeCue.start + (activeCue.duration || 2.5)
            )} (Click to jump)`}
          >
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>
              {formatTimestamp(activeCue.start)} -{' '}
              {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}
            </span>
          </button>
        )}

        {/* TTS Repeat Red Light Indicator */}
        {isRepeatingCurrentTTS && isThisLangSpeaking && (
          <span
            id="tts-repeat-overlay-red-light"
            data-testid="tts-repeat-overlay-red-light"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/95 text-rose-200 border border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse shrink-0"
            title={`TTS repeating on identical text: ${currentRepeatCount} times`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,1)]" />
            </span>
            <span>REPEAT x{currentRepeatCount}</span>
          </span>
        )}

        {(lang === 'he' || isHebrewHighlighted) && (
          <span
            id="defaulted-hebrew-subtitles-badge"
            data-testid="defaulted-hebrew-subtitles-badge"
            className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300 bg-amber-950/90 border border-amber-500/80 px-2 py-0.5 rounded shrink-0 shadow-sm animate-pulse"
            title="Defaulted Hebrew Subtitles"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>עברית (Hebrew)</span>
          </span>
        )}

        <p
          id="active-translated-cue-text"
          dir={isTranslatedRtl ? 'rtl' : 'ltr'}
          data-rtl={isTranslatedRtl ? 'true' : 'false'}
          className={`text-xs sm:text-sm font-semibold tracking-wide drop-shadow-sm leading-snug ${
            lang === 'he' || isHebrewHighlighted
              ? 'text-amber-300 font-bold bg-amber-950/50 px-2.5 py-0.5 rounded-lg border border-amber-500/70 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              : 'text-emerald-400'
          } ${isTranslatedRtl ? 'text-right dir-rtl font-sans' : 'text-center'}`}
        >
          <HighlightableText
            text={translationText}
            isSpeaking={isThisLangSpeaking}
            activeCharIndex={effectiveCharIndex}
            syncMode={settings?.ttsSyncMode || 'word_boundary'}
            lang={lang}
            dir={isTranslatedRtl ? 'rtl' : 'ltr'}
            className={
              lang === 'he' || isHebrewHighlighted ? 'text-amber-300 font-bold' : 'text-emerald-400'
            }
            activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
          />
        </p>

        <button
          type="button"
          id="speak-translated-cue-btn"
          data-testid="speak-translated-cue-btn"
          onClick={(e) => effectiveOnSpeak('translated', translationText, e)}
          className="p-1 px-1.5 rounded-md bg-emerald-950/80 hover:bg-emerald-800 text-emerald-400 hover:text-white border border-emerald-700/60 hover:ring-2 hover:ring-emerald-400 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] relative z-50"
          title="Speak translated text (TTS with word highlight)"
        >
          <Volume2 className="w-3 h-3" />
          <span>Play</span>
        </button>

        <button
          type="button"
          id="quick-toggle-tts-btn"
          data-testid="quick-toggle-tts-btn"
          onClick={effectiveOnToggleTTS}
          className={`p-1 px-1.5 rounded-md border hover:ring-2 hover:ring-emerald-400 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] font-semibold relative z-50 ${
            autoTTSEnabled
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
              : 'bg-neutral-900/90 text-neutral-400 hover:text-white border-neutral-700'
          }`}
          title={
            autoTTSEnabled
              ? 'Auto-TTS Narration is ON (click to disable)'
              : 'Auto-TTS Narration is OFF (click to turn ON)'
          }
        >
          {autoTTSEnabled ? (
            <Volume2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <VolumeX className="w-3 h-3 text-neutral-400" />
          )}
          <span>{autoTTSEnabled ? 'TTS: ON' : 'TTS: OFF'}</span>
        </button>

        {onToggleParallelMode && (
          <button
            type="button"
            id="quick-toggle-parallel-btn"
            data-testid="quick-toggle-parallel-btn"
            onClick={onToggleParallelMode}
            className="p-1 px-1.5 rounded-md bg-indigo-950/80 hover:bg-indigo-800 text-indigo-300 hover:text-white border border-indigo-700/60 hover:ring-2 hover:ring-indigo-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] font-semibold shadow-md relative z-50"
            title="Toggle Parallel Multi-Language Subtitle presentation"
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Parallel</span>
          </button>
        )}

        {onOpenTargetLanguageModal && (
          <button
            type="button"
            id="quick-target-lang-overlay-btn"
            data-testid="quick-target-lang-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTargetLanguageModal();
            }}
            className="p-1 px-1.5 rounded-md bg-indigo-950/80 hover:bg-indigo-800 text-indigo-300 hover:text-white border border-indigo-700/60 hover:ring-2 hover:ring-indigo-400 hover:border-indigo-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] uppercase font-mono font-bold shadow-md relative z-50"
            title="Quickly select or edit target languages for translation"
          >
            <Globe className="w-3 h-3 text-indigo-400" />
            <span>{effectiveTargetLang}</span>
          </button>
        )}
      </div>
    );
  }

  // Parallel Multi-Language Presentation
  const targetLangs =
    displayedTargetLanguages && displayedTargetLanguages.length > 0
      ? displayedTargetLanguages
      : [effectiveTargetLang];

  return (
    <div
      id="parallel-translations-container"
      data-testid="parallel-translations-container"
      className="w-full flex flex-col gap-1.5 pt-0.5 animate-fadeIn"
    >
      {/* Top action bar for timestamps and controls */}
      <div className="flex items-center justify-between gap-2 px-1 border-b border-neutral-800/60 pb-1 text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showSubtitleTimestamps && (
            <button
              type="button"
              id="cue-time-section"
              data-testid="cue-time-section"
              onClick={(e) => {
                e.stopPropagation();
                effectiveOnSeekTo?.(activeCue.start);
              }}
              className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-1.5 py-0.5 rounded shrink-0 select-none shadow-sm whitespace-nowrap hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition cursor-pointer pointer-events-auto relative z-50"
              title={`Subtitle timeframe: ${formatTimestamp(activeCue.start)} to ${formatTimestamp(
                activeCue.start + (activeCue.duration || 2.5)
              )}`}
            >
              <Clock className="w-3 h-3 text-neutral-400" />
              <span>
                {formatTimestamp(activeCue.start)} -{' '}
                {formatTimestamp(activeCue.start + (activeCue.duration || 2.5))}
              </span>
            </button>
          )}

          {isRepeatingCurrentTTS && (
            <span
              id="tts-repeat-overlay-red-light"
              data-testid="tts-repeat-overlay-red-light"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/95 text-rose-200 border border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse shrink-0"
              title={`TTS repeating on identical text: ${currentRepeatCount} times`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,1)]" />
              </span>
              <span>REPEAT x{currentRepeatCount}</span>
            </span>
          )}

          {effectiveTargetLang === 'he' && (
            <span
              id="defaulted-hebrew-subtitles-badge"
              data-testid="defaulted-hebrew-subtitles-badge"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300 bg-amber-950/90 border border-amber-500/80 px-2 py-0.5 rounded shrink-0 shadow-sm animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>עברית (Hebrew)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="quick-toggle-tts-btn"
            data-testid="quick-toggle-tts-btn"
            onClick={effectiveOnToggleTTS}
            className={`p-1 px-1.5 rounded-md border flex items-center gap-1 text-[10px] font-semibold transition pointer-events-auto relative z-50 ${
              autoTTSEnabled
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                : 'bg-neutral-900/90 text-neutral-400 hover:text-white border-neutral-700'
            }`}
          >
            {autoTTSEnabled ? (
              <Volume2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-neutral-400" />
            )}
            <span>{autoTTSEnabled ? 'TTS: ON' : 'TTS: OFF'}</span>
          </button>

          {onToggleParallelMode && (
            <button
              type="button"
              id="quick-toggle-parallel-btn"
              data-testid="quick-toggle-parallel-btn"
              onClick={onToggleParallelMode}
              className="p-1 px-1.5 rounded-md bg-indigo-900/80 hover:bg-indigo-700 text-indigo-200 border border-indigo-600/70 text-[10px] font-semibold transition pointer-events-auto relative z-50"
              title="Switch back to single target language mode"
            >
              1 Lang
            </button>
          )}

          {onOpenTargetLanguageModal && (
            <button
              type="button"
              id="quick-target-lang-overlay-btn"
              data-testid="quick-target-lang-overlay-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTargetLanguageModal();
              }}
              className="p-1 px-1.5 rounded-md bg-indigo-950/80 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/60 text-[10px] uppercase font-mono font-bold transition flex items-center gap-1 pointer-events-auto relative z-50"
            >
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>Languages</span>
            </button>
          )}
        </div>
      </div>

      {/* Parallel Language Rows */}
      <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 select-text">
        {targetLangs.map((lang) => {
          const text =
            parallelTranslations[lang] ||
            (lang === effectiveTargetLang ? (effectiveDisplayTranslatedText || displayTranslatedText || translatedCueText) : '') ||
            '';
          const isTranslatedRtl = isRtl(lang, text);
          const isThisLangSpeaking =
            (isTTSSpeakingState && (activeTTSTarget === lang || (lang === effectiveTargetLang && activeTTSTarget === 'translated'))) ||
            (isSyncSpeaking && syncTTSLang === lang);

          const style = LANGUAGE_COLOR_STYLES[lang] || {
            bg: 'bg-neutral-900/60',
            text: 'text-neutral-200',
            border: 'border-neutral-800',
            badgeBg: 'bg-neutral-900 text-neutral-300 border-neutral-700',
          };

          return (
            <div
              key={lang}
              id={`parallel-lang-row-${lang}`}
              data-testid={`parallel-lang-row-${lang}`}
              className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border backdrop-blur-sm transition-all duration-200 ${
                isThisLangSpeaking
                  ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                  : `${style.bg} ${style.border}`
              }`}
            >
              {/* Left Badge */}
              <button
                type="button"
                id={`parallel-lang-badge-${lang}`}
                data-testid={`parallel-lang-badge-${lang}`}
                onClick={(e) => effectiveOnSpeak(lang, text, e)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border shrink-0 transition-transform active:scale-95 cursor-pointer pointer-events-auto relative z-50 ${style.badgeBg}`}
                title={`Click to speak ${lang.toUpperCase()} translation`}
              >
                {lang}
              </button>

              {/* Translation Text with TTS Highlighting */}
              <div
                className={`flex-1 text-xs font-medium leading-snug px-1 ${
                  lang === 'he' ? 'text-amber-200 font-semibold' : style.text
                } ${isTranslatedRtl ? 'text-right dir-rtl font-sans' : 'text-left'}`}
                dir={isTranslatedRtl ? 'rtl' : 'ltr'}
              >
                {text ? (
                  <HighlightableText
                    text={text}
                    isSpeaking={isThisLangSpeaking}
                    activeCharIndex={isThisLangSpeaking ? effectiveCharIndex : null}
                    syncMode={settings?.ttsSyncMode || 'word_boundary'}
                    lang={lang}
                    dir={isTranslatedRtl ? 'rtl' : 'ltr'}
                    activeWordClassName="bg-amber-400 text-neutral-950 font-bold px-1.5 py-0.5 rounded shadow ring-2 ring-amber-300 scale-105 inline-block mx-0.5"
                  />
                ) : (
                  <span className="text-neutral-500 italic text-[11px]">
                    Translating into {lang.toUpperCase()}...
                  </span>
                )}
              </div>

              {/* Speak Single Row Button */}
              <button
                type="button"
                id={`parallel-speak-btn-${lang}`}
                data-testid={`parallel-speak-btn-${lang}`}
                onClick={(e) => effectiveOnSpeak(lang, text, e)}
                className="p-1 rounded bg-neutral-900/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition pointer-events-auto shrink-0 relative z-50"
                title={`Speak ${lang.toUpperCase()} narration`}
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
