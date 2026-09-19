import React, { useState } from 'react';
import {
  ArrowLeft,
  Link2,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Subtitles,
  Loader2,
  Settings,
  Globe,
  Activity,
  FileText,
  Maximize2,
  Minimize2,
  Repeat,
} from 'lucide-react';
import { CaptionCue } from '../types';
import { formatTimestamp } from '../utils/captionParser';
import { parseYouTubeUrl } from '../utils/youtube';

interface VideoControlsOverlayProps {
  showControls: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  videoId: string;
  targetLangCode: string;
  hasSubtitles: boolean;
  isCaptionsActive: boolean;
  isFetchingSubtitles: boolean;
  autoTTSEnabled: boolean;
  isSyncActive?: boolean;
  isSyncSpeaking?: boolean;
  isLoopingCue?: boolean;
  activeCue: CaptionCue | null;
  theaterMode: boolean;
  onTogglePlayPause: () => void;
  onToggleMute: () => void;
  onSeek: (seconds: number) => void;
  onToggleCaptions: () => void;
  onToggleAutoTTS: () => void;
  onToggleSync?: () => void;
  onToggleLoopCue?: () => void;
  onNextCue?: () => void;
  onPrevCue?: () => void;
  onSpeakCurrentCueTTS?: () => void;
  onSelectTargetLanguage?: (langCode: string) => void;
  onOpenTargetLanguageModal?: () => void;
  onOpenSettings?: () => void;
  onOpenLogs?: () => void;
  onOpenArtifacts?: () => void;
  onToggleTheater?: () => void;
  onBackOrClose?: () => void;
  onSelectVideo?: (videoId: string, rawUrl: string) => void;
}

export const VideoControlsOverlay: React.FC<VideoControlsOverlayProps> = ({
  showControls,
  isPlaying,
  isMuted,
  currentTime,
  duration,
  videoId,
  targetLangCode,
  hasSubtitles,
  isCaptionsActive,
  isFetchingSubtitles,
  autoTTSEnabled,
  isSyncActive = false,
  isSyncSpeaking = false,
  isLoopingCue = false,
  activeCue,
  theaterMode,
  onTogglePlayPause,
  onToggleMute,
  onSeek,
  onToggleCaptions,
  onToggleAutoTTS,
  onToggleSync,
  onToggleLoopCue,
  onNextCue,
  onPrevCue,
  onSpeakCurrentCueTTS,
  onSelectTargetLanguage,
  onOpenTargetLanguageModal,
  onOpenSettings,
  onOpenLogs,
  onOpenArtifacts,
  onToggleTheater,
  onBackOrClose,
  onSelectVideo,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const normTargetLang = targetLangCode.toLowerCase();

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(newPercent * (duration || 100));
  };

  return (
    <div
      id="compact-player-controls-overlay"
      className={`absolute inset-0 z-30 flex flex-col justify-between transition-opacity duration-200 ${
        showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Top Bar */}
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
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-center border border-neutral-700/60 shadow-lg hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              title="Back / Change Video"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <span className="hidden xs:inline-block px-2.5 py-1 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs font-mono text-neutral-300 select-none">
            {videoId}
          </span>

          {/* Quick URL Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const url = urlInput.trim();
              if (!url) return;
              const parsed = parseYouTubeUrl(url);
              if (parsed && onSelectVideo) {
                onSelectVideo(parsed.videoId, url);
                setUrlInput('');
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
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube link..."
              className="w-full bg-transparent text-white placeholder-neutral-500 text-xs focus:outline-none"
            />
            {urlInput && (
              <button
                type="button"
                id="clear-input-button"
                data-testid="clear-input-button"
                onClick={() => setUrlInput('')}
                className="text-neutral-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="submit"
              id="play-video-button"
              data-testid="play-video-button"
              className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] shrink-0"
            >
              Play
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Target Language Modal Button */}
          {onOpenTargetLanguageModal && (
            <button
              id="open-target-language-btn"
              data-testid="open-target-language-btn"
              type="button"
              onClick={onOpenTargetLanguageModal}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-amber-300 border border-neutral-700/60 shadow-lg flex items-center gap-1.5 text-xs font-bold hover:ring-2 hover:ring-amber-400 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              title="Select Target Translation Language"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>{targetLangCode.toUpperCase()}</span>
            </button>
          )}

          {/* Artifacts Modal Button */}
          {onOpenArtifacts && (
            <button
              id="open-artifacts-button"
              data-testid="open-artifacts-button"
              type="button"
              onClick={onOpenArtifacts}
              className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 shadow-lg flex items-center justify-center hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              title="Browse Cached Multi-lingual .SRT Files"
            >
              <FileText className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Logs Modal Button */}
          {onOpenLogs && (
            <button
              id="open-logs-button"
              data-testid="open-logs-button"
              type="button"
              onClick={onOpenLogs}
              className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 shadow-lg flex items-center justify-center hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              title="Activity Logs & Diagnostics"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
            </button>
          )}

          {/* Settings Modal Button */}
          {onOpenSettings && (
            <button
              id="open-settings-button"
              data-testid="open-settings-button"
              type="button"
              onClick={onOpenSettings}
              className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 shadow-lg flex items-center justify-center hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Theater Mode Toggle */}
          {onToggleTheater && (
            <button
              id="theater-toggle-button"
              data-testid="theater-toggle-button"
              type="button"
              onClick={onToggleTheater}
              className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 shadow-lg flex items-center justify-center hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer pointer-events-auto relative z-40 hidden sm:flex"
              title={theaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
            >
              {theaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Center Feedback */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        <button
          type="button"
          id={isPlaying ? 'center-pause-button' : 'center-play-button'}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlayPause();
          }}
          className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-150 pointer-events-auto"
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
        </button>
      </div>

      {/* Bottom Bar: Timeline + Controls */}
      <footer
        className="w-full p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent relative z-40 pointer-events-auto flex flex-col gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrub Bar */}
        <div className="w-full flex items-center gap-2 text-xs font-mono text-neutral-300 select-none">
          <span id="current-time-display" className="shrink-0">{formatTimestamp(currentTime)}</span>
          <div
            id="timeline-scrub-bar"
            data-testid="timeline-scrub-bar"
            role="slider"
            aria-label="Video timeline progress"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            onClick={handleScrubClick}
            className="flex-1 h-3 rounded-full bg-neutral-800/80 border border-neutral-700/50 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/50 cursor-pointer relative overflow-hidden flex items-center transition-all duration-150 pointer-events-auto relative z-40"
          >
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span id="duration-display" className="shrink-0 text-neutral-400">{formatTimestamp(duration)}</span>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              id="control-play-pause-button"
              type="button"
              onClick={onTogglePlayPause}
              className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-white hover:bg-neutral-800/80 border border-transparent hover:border-amber-400 hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              id="volume-toggle-button"
              type="button"
              onClick={onToggleMute}
              className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-neutral-200 hover:text-white hover:bg-neutral-800/80 border border-transparent hover:border-amber-400 hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer pointer-events-auto relative z-40"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-TTS Toggle Button */}
            <button
              id="control-auto-tts-button"
              data-testid="control-auto-tts-button"
              type="button"
              onClick={onToggleAutoTTS}
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
            <button
              id="caption-toggle-button"
              data-testid="caption-toggle-button"
              type="button"
              onClick={onToggleCaptions}
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
          </div>
        </div>

        {/* Direct SRT Speech Flow Bar */}
        <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-700/60 text-xs font-medium">
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              {onToggleSync && (
                <button
                  type="button"
                  onClick={onToggleSync}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    isSyncActive
                      ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
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
              )}

              {onToggleLoopCue && (
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
              )}

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

            {onSpeakCurrentCueTTS && (
              <button
                type="button"
                onClick={onSpeakCurrentCueTTS}
                disabled={!activeCue}
                title="Test play TTS for current active SRT subtitle cue"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 disabled:opacity-40"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Speak SRT Cue</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
