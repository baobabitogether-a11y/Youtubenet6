import React, { useState } from 'react';
import {
  Minimize2,
  Maximize2,
  Languages,
  Layers,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
} from 'lucide-react';
import { AppSettings, setSingleTargetLanguageMode } from '../utils/appSettings';

interface DemoQuickFloatingDockProps {
  videoId: string;
  settings: AppSettings;
  selectedTargetLang: string;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onSelectTargetLanguage: (langCode: string) => void;
  onOpenArtifacts?: () => void;
}

export const DemoQuickFloatingDock: React.FC<DemoQuickFloatingDockProps> = ({
  videoId,
  settings,
  selectedTargetLang,
  onUpdateSettings,
  onSelectTargetLanguage,
  onOpenArtifacts,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Only render on landing page / default demonstration video FcRzAdI8R9U
  const isDemoVideo = videoId === 'FcRzAdI8R9U' || !videoId;
  if (!isDemoVideo) return null;

  const isCompact = settings.compactView ?? false;
  const isSingleMode = settings.singleTargetLanguageMode ?? true;
  const isHebrewOnly = isSingleMode && selectedTargetLang === 'he';

  // Toggle Compact Mode
  const handleToggleCompact = () => {
    const nextCompact = !isCompact;
    onUpdateSettings({
      ...settings,
      compactView: nextCompact,
    });
  };

  // Toggle Subtitle Mode: Only Hebrew vs All Subtitles (set them all on)
  const handleToggleSubtitlesMode = () => {
    if (isHebrewOnly) {
      // Switch to Multiple Subtitles (Set them all ON: Hebrew, Italian, English, Arabic, Russian)
      const allDemoLanguages = ['he', 'it', 'en', 'ar', 'ru'];
      setSingleTargetLanguageMode(false);
      onUpdateSettings({
        ...settings,
        singleTargetLanguageMode: false,
        learningLanguages: allDemoLanguages,
      });
      // Keep primary target language as Hebrew or active
      onSelectTargetLanguage('he');
    } else {
      // Switch back to Only One Subtitle: Hebrew
      setSingleTargetLanguageMode(true);
      onUpdateSettings({
        ...settings,
        singleTargetLanguageMode: true,
      });
      onSelectTargetLanguage('he');
    }
  };

  return (
    <div
      id="demo-quick-floating-dock"
      data-testid="demo-quick-floating-dock"
      className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2 select-none animate-fadeIn"
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      {/* Floating Panel Container */}
      <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl shadow-2xl p-2.5 sm:p-3 text-neutral-100 flex flex-col gap-2.5 transition-all duration-200 ring-1 ring-white/10 hover:border-neutral-600">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 px-1 pb-1 border-b border-neutral-800">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
              Demo Quick Controls
            </span>
          </div>

          <button
            id="demo-floating-collapse-btn"
            data-testid="demo-floating-collapse-btn"
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title={isCollapsed ? 'Expand Quick Controls' : 'Minimize Quick Controls'}
            aria-label={isCollapsed ? 'Expand Quick Controls' : 'Minimize Quick Controls'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* 1. Toggle Compact Mode Button */}
            <button
              id="demo-floating-compact-toggle"
              data-testid="demo-floating-compact-toggle"
              type="button"
              onClick={handleToggleCompact}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 ${
                isCompact
                  ? 'bg-blue-950/60 border-blue-500/60 text-blue-200 hover:bg-blue-900/60 shadow-sm'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-750 hover:text-white'
              }`}
              title={isCompact ? 'Compact mode is enabled. Click to expand full teacher workspace.' : 'Expanded workspace is active. Click for compact player.'}
            >
              <div className="flex items-center gap-2">
                {isCompact ? (
                  <Minimize2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span>Compact Mode:</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                  isCompact
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                    : 'bg-neutral-700 text-neutral-400'
                }`}
              >
                {isCompact ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 2. Toggle Subtitles: Only Hebrew vs Multiple (All On) */}
            <button
              id="demo-floating-subtitles-toggle"
              data-testid="demo-floating-subtitles-toggle"
              type="button"
              onClick={handleToggleSubtitlesMode}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 ${
                !isHebrewOnly
                  ? 'bg-amber-950/70 border-amber-500/70 text-amber-200 hover:bg-amber-900/70 shadow-sm'
                  : 'bg-indigo-950/60 border-indigo-500/60 text-indigo-200 hover:bg-indigo-900/60'
              }`}
              title={
                isHebrewOnly
                  ? 'Currently: Only Hebrew subtitles. Click to enable ALL subtitle tracks (HE, IT, EN, AR, RU).'
                  : 'Currently: Multiple subtitles all ON. Click to switch to Hebrew only.'
              }
            >
              <div className="flex items-center gap-2">
                {!isHebrewOnly ? (
                  <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Languages className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}
                <span>Subtitles:</span>
              </div>

              {isHebrewOnly ? (
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                    Hebrew Only
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/30 text-amber-300 border border-amber-400/40">
                    All Subtitles (5 Tracks)
                  </span>
                </div>
              )}
            </button>

            {/* 3. Subtitle Artifacts Button */}
            {onOpenArtifacts && (
              <button
                id="demo-floating-artifacts-btn"
                data-testid="demo-floating-artifacts-btn"
                type="button"
                onClick={onOpenArtifacts}
                className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl text-xs font-medium border bg-indigo-950/50 border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/60 transition-all duration-150"
                title="Browse authentic multi-lingual .SRT fixtures in test/fixtures/languages"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>SRT Artifacts</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
