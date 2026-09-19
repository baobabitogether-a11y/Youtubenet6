import React from 'react';
import { Loader2, Clock, Volume2 } from 'lucide-react';
import { CaptionCue } from '../types';
import { SubtitlePosition, AppSettings } from '../utils/appSettings';
import { formatTimestamp } from '../utils/captionParser';
import { HighlightableText } from './HighlightableText';
import { ParallelTranslationsOverlay } from './ParallelTranslationsOverlay';

interface SubtitleOverlayContainerProps {
  isCaptionsActive: boolean;
  isFetchingSubtitles: boolean;
  hasSubtitles: boolean;
  activeCue: CaptionCue | null;
  subtitlePosition: SubtitlePosition;
  showControls: boolean;
  showTranslatedOnTop: boolean;
  targetLangCode: string;
  isHebrewHighlighted: boolean;
  isOriginalRtl: boolean;
  isOriginalSpeaking: boolean;
  isSyncOriginalSpeaking: boolean;
  syncTTSCharIndex: number | null | undefined;
  activeTTSCharIndex: number;
  showSubtitleTimestamps: boolean;
  isAndroidApp: boolean;
  displayedTargetLanguages: string[];
  effectiveDisplayTranslatedText: string | null;
  displayTranslatedText: string | null;
  translatedCueText: string | null;
  parallelTranslations: Record<string, string>;
  isTTSSpeakingState: boolean;
  activeTTSTarget: string | null;
  isSyncSpeaking?: boolean;
  syncTTSLang?: string | null;
  autoTTSEnabled: boolean;
  toggleAutoTTS: () => void;
  onOpenTargetLanguageModal?: () => void;
  onSpeakCue: (target: string, customText?: string, e?: React.MouseEvent) => void;
  seekTo: (seconds: number) => void;
  settings?: AppSettings;
}

export const SubtitleOverlayContainer: React.FC<SubtitleOverlayContainerProps> = ({
  isCaptionsActive,
  isFetchingSubtitles,
  hasSubtitles,
  activeCue,
  subtitlePosition,
  showControls,
  showTranslatedOnTop,
  targetLangCode,
  isHebrewHighlighted,
  isOriginalRtl,
  isOriginalSpeaking,
  isSyncOriginalSpeaking,
  syncTTSCharIndex,
  activeTTSCharIndex,
  showSubtitleTimestamps,
  isAndroidApp,
  displayedTargetLanguages,
  effectiveDisplayTranslatedText,
  displayTranslatedText,
  translatedCueText,
  parallelTranslations,
  isTTSSpeakingState,
  activeTTSTarget,
  isSyncSpeaking = false,
  syncTTSLang = null,
  autoTTSEnabled,
  toggleAutoTTS,
  onOpenTargetLanguageModal,
  onSpeakCue,
  seekTo,
  settings,
}) => {
  if (!isCaptionsActive) return null;

  return (
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
                  onSpeak={(tgt, txt, e) => onSpeakCue(tgt, txt, e)}
                  showSubtitleTimestamps={showSubtitleTimestamps}
                  seekTo={seekTo}
                  settings={settings}
                />
                <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
                  {showSubtitleTimestamps && (
                    <button
                      type="button"
                      id="cue-orig-time-section"
                      data-testid="cue-orig-time-section"
                      onClick={(e) => {
                        e.stopPropagation();
                        seekTo(activeCue.start);
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
                    onClick={(e) => onSpeakCue('original', undefined, e)}
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
                  {showSubtitleTimestamps && (
                    <button
                      type="button"
                      id="cue-orig-time-section"
                      data-testid="cue-orig-time-section"
                      onClick={(e) => {
                        e.stopPropagation();
                        seekTo(activeCue.start);
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
                    onClick={(e) => onSpeakCue('original', undefined, e)}
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
                  onSpeak={(tgt, txt, e) => onSpeakCue(tgt, txt, e)}
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
  );
};
