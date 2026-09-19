import React, { useState, useEffect } from 'react';
import { Youtube, Subtitles, Share2, Activity, AlertTriangle, Settings, Terminal, Copy, Check, Smartphone, Download, Volume2, PlaySquare, FileText } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setNetworkInspectorOpen } from '../store/networkSlice';
import { setInspectorOpen } from '../store/errorsSlice';
import { logBuffer } from '../utils/logBuffer';
import { AppSettings } from '../utils/appSettings';
import { subscribeTTSDebug, TTSInputRecord } from '../lib/ttsEngine';

interface NavbarProps {
  onOpenLibrary?: () => void;
  libraryCount?: number;
  onOpenShare?: () => void;
  onOpenSettings?: () => void;
  onOpenLogs?: () => void;
  onOpenTTSInputs?: () => void;
  onOpenArtifacts?: () => void;
  onOpenApkUpdate?: () => void;
  hasApkUpdate?: boolean;
  latestApkVersion?: string;
  settings?: AppSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLibrary,
  libraryCount,
  onOpenShare,
  onOpenSettings,
  onOpenLogs,
  onOpenTTSInputs,
  onOpenArtifacts,
  onOpenApkUpdate,
  hasApkUpdate = false,
  latestApkVersion,
  settings,
}) => {
  const dispatch = useAppDispatch();
  const { requests } = useAppSelector((state) => state.network);
  const { errors } = useAppSelector((state) => state.errors);
  const [logCount, setLogCount] = useState(() => logBuffer.getEntries().length);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [ttsInputsCount, setTtsInputsCount] = useState(0);

  useEffect(() => {
    const unsubLogs = logBuffer.subscribe(() => {
      setLogCount(logBuffer.getEntries().length);
    });
    const unsubTTS = subscribeTTSDebug((state) => {
      setTtsInputsCount(state.inputs.length);
    });
    return () => {
      unsubLogs();
      unsubTTS();
    };
  }, []);

  const handleQuickCopyLogs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(logBuffer.copyAll());
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch {
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  return (
    <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20 text-white">
            <Youtube className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div>
            <span className="font-semibold text-base sm:text-lg text-neutral-100 tracking-tight flex items-center gap-2">
              YouTube Language Learning
            </span>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Synchronized timed subtitles &amp; multi-language speech translation
            </p>
          </div>
        </div>

        {/* Right side: logs, settings, inspectors, share link & library info */}
        <div className="flex items-center gap-2">
          {/* Activity Logs Button with Copy All Option */}
          {onOpenLogs && (
            <div className="flex items-center rounded-lg border border-neutral-700 bg-neutral-800/80 overflow-hidden">
              <button
                type="button"
                id="navbar-logs-button"
                data-testid="navbar-logs-button"
                onClick={onOpenLogs}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition active:scale-95"
                title="View Activity Logs & Ring Buffer"
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Logs</span>
                <span className="px-1.5 py-0.2 rounded-full bg-neutral-900 text-[10px] font-mono font-bold text-neutral-300">
                  {logCount}
                </span>
              </button>
              <button
                type="button"
                id="navbar-copy-logs-button"
                data-testid="navbar-copy-logs-button"
                onClick={handleQuickCopyLogs}
                className={`p-1.5 border-l border-neutral-700 hover:bg-neutral-700 transition ${
                  copiedLogs ? 'text-emerald-400 bg-emerald-950/60' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Copy All Logs to Clipboard"
              >
                {copiedLogs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Dedicated TTS Input Texts View Button */}
          {onOpenTTSInputs && (
            <button
              type="button"
              id="navbar-tts-inputs-button"
              data-testid="navbar-tts-inputs-button"
              onClick={onOpenTTSInputs}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-800/70 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 text-xs font-medium transition active:scale-95"
              title="Open Dedicated TTS Input Texts View (Newer on Top)"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">TTS Inputs</span>
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-900 text-[10px] font-mono font-bold text-neutral-300">
                {ttsInputsCount}
              </span>
            </button>
          )}

          {/* Subtitle Artifacts Browser */}
          {onOpenArtifacts && (
            <button
              type="button"
              id="navbar-artifacts-btn"
              data-testid="navbar-artifacts-btn navbar-artifacts-button open-artifacts-btn"
              onClick={onOpenArtifacts}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-800/70 bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-300 text-xs font-medium transition active:scale-95"
              title="Browse Subtitle Artifacts (.SRT tracks, raw segments, dual-matrix)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Artifacts</span>
            </button>
          )}

          {/* Settings Button */}
          {onOpenSettings && (
            <button
              type="button"
              id="navbar-settings-button"
              data-testid="navbar-settings-button settings-btn open-settings-button open-settings-btn"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition active:scale-95"
              title="Open Settings"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* Check APK Update & Install via App Button */}
          {onOpenApkUpdate && (
            <button
              type="button"
              id="navbar-apk-update-button"
              data-testid="navbar-apk-update-button"
              onClick={onOpenApkUpdate}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition active:scale-95 ${
                hasApkUpdate
                  ? 'border-emerald-600 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 shadow-sm animate-pulse'
                  : 'border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200'
              }`}
              title={
                hasApkUpdate
                  ? `Update Available: ${latestApkVersion || 'Newer APK'}! Click to install.`
                  : 'Check for newer YouTube-Viewer-debug.apk and install via app'
              }
            >
              <Smartphone className={`w-3.5 h-3.5 ${hasApkUpdate ? 'text-emerald-400' : 'text-neutral-400'}`} />
              <span className="hidden sm:inline">APK</span>
              {hasApkUpdate ? (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold">
                  {latestApkVersion || 'New'}
                </span>
              ) : (
                <span className="text-[10px] text-neutral-400 font-mono hidden md:inline">
                  v1.0.13
                </span>
              )}
            </button>
          )}

          {/* Network Inspector */}
          <button
            type="button"
            id="navbar-network-inspector-button"
            data-testid="navbar-network-inspector-button"
            onClick={() => dispatch(setNetworkInspectorOpen(true))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-800/60 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 text-xs font-medium transition active:scale-95 cursor-pointer"
            title="Inspect web requests & responses"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Network</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-900/80 text-[10px] font-mono font-bold text-blue-200">
              {requests.length}
            </span>
          </button>

          {/* Errors Inspector */}
          <button
            type="button"
            id="navbar-error-inspector-button"
            data-testid="navbar-error-inspector-button"
            onClick={() => dispatch(setInspectorOpen(true))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition active:scale-95 cursor-pointer ${
              errors.length > 0
                ? 'border-red-700/80 bg-red-950/60 hover:bg-red-900/80 text-red-300 animate-pulse'
                : 'border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
            }`}
            title="Inspect app errors & Redux state machine"
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 ${errors.length > 0 ? 'text-red-400' : 'text-neutral-400'}`}
            />
            <span className="hidden sm:inline">Errors</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                errors.length > 0 ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400'
              }`}
            >
              {errors.length}
            </span>
          </button>

          {/* SRT Tracks / Demo Fixtures */}
          <button
            type="button"
            id="navbar-mini-demo-link"
            data-testid="navbar-mini-demo-link"
            onClick={onOpenArtifacts}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-800/60 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 text-xs font-medium transition active:scale-95 cursor-pointer"
            title="Browse cached authentic SRT subtitle tracks"
          >
            <PlaySquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">SRT Tracks</span>
          </button>

          {onOpenShare && (
            <button
              type="button"
              id="navbar-share-button"
              data-testid="navbar-share-button open-share-btn navbar-share-link-button"
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Share a video link with the app"
            >
              <Share2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Share Link</span>
            </button>
          )}

          {onOpenLibrary && (
            <button
              type="button"
              id="navbar-library-button"
              data-testid="navbar-library-button open-library-btn"
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition active:scale-95"
            >
              <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Library {libraryCount !== undefined ? `(${libraryCount})` : ''}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

