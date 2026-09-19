import React, { useState, useRef } from 'react';
import {
  AppSettings,
  SUPPORTED_LANGUAGES_CATALOG,
  exportFullAppState,
  importFullAppState,
} from '../utils/appSettings';
import {
  X,
  Settings,
  Sliders,
  Sparkles,
  Layers,
  RotateCcw,
  Check,
  Globe,
  Radio,
  HardDrive,
  Cpu,
  Smartphone,
  Download,
  Upload,
  Copy,
  FileJson,
  FileText,
  ExternalLink,
  Eye,
  Plus,
  Volume2,
  VolumeX,
  Clock,
  Terminal,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetSettings: () => void;
  onOpenApkUpdate?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  onOpenApkUpdate,
}: SettingsModalProps) {
  const [importExportStatus, setImportExportStatus] = useState<string | null>(null);
  const [importExportError, setImportExportError] = useState<string | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState<boolean>(false);
  const [pastedJson, setPastedJson] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAndroidNative =
    typeof window !== 'undefined' && !!(window as any).AndroidNativeShell;

  const toggleMethod = (key: keyof AppSettings['methods']) => {
    onUpdateSettings({
      ...settings,
      methods: {
        ...settings.methods,
        [key]: !settings.methods[key],
      },
    });
  };

  const handleExportJsonDownload = () => {
    try {
      const jsonStr = exportFullAppState();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yt-viewer-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportExportStatus('Settings and status exported to JSON file!');
      setImportExportError(null);
      setTimeout(() => setImportExportStatus(null), 4000);
    } catch (err: any) {
      setImportExportError(`Export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleExportClipboard = async () => {
    try {
      const jsonStr = exportFullAppState();
      await navigator.clipboard.writeText(jsonStr);
      setImportExportStatus('Settings snapshot copied to clipboard!');
      setImportExportError(null);
      setTimeout(() => setImportExportStatus(null), 4000);
    } catch {
      // Fallback
      setImportExportStatus('Snapshot ready. Use download if clipboard is blocked.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importFullAppState(content);
        if (res.success && res.settings) {
          onUpdateSettings(res.settings);
          setImportExportStatus('Settings & status restored successfully!');
          setImportExportError(null);
          setTimeout(() => setImportExportStatus(null), 4000);
        } else {
          setImportExportError(res.error || 'Failed to import settings');
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleApplyPastedJson = () => {
    if (!pastedJson.trim()) return;
    const res = importFullAppState(pastedJson);
    if (res.success && res.settings) {
      onUpdateSettings(res.settings);
      setImportExportStatus('Settings & status imported from JSON successfully!');
      setImportExportError(null);
      setPasteModalOpen(false);
      setPastedJson('');
      setTimeout(() => setImportExportStatus(null), 4000);
    } else {
      setImportExportError(res.error || 'Invalid JSON format');
    }
  };

  return (
    <div
      id="settings-modal"
      data-testid="settings-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-200">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-neutral-100">
                Application Settings
              </h2>
              <p className="text-xs text-neutral-400">
                Configure advanced features and subtitle extraction methods.
              </p>
            </div>
          </div>

          <button
            id="close-settings-modal-button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm">
          {/* Section: Display & Performance Mode */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Display &amp; Performance Mode</span>
            </h3>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Always Show Key Buttons (Play/Pause, CC, Language, Settings)
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Keeps the most important player buttons persistently accessible at all times.
                  </div>
                </div>
                <input
                  id="toggle-always-show-key-controls"
                  type="checkbox"
                  checked={settings.alwaysShowKeyControls ?? true}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, alwaysShowKeyControls: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Subtitle Position
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 uppercase">
                    {settings.subtitlePosition || 'top'}
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  Select where dialogue captions are displayed on screen.
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      { id: 'top', label: 'On Top (Video)' },
                      { id: 'above', label: 'Above Player' },
                      { id: 'under', label: 'Under Player' },
                      { id: 'bottom', label: 'Bottom (Video)' },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, subtitlePosition: pos.id })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        (settings.subtitlePosition || 'top') === pos.id
                          ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>TTS Sync &amp; Text Highlight Mode (4 Alternatives)</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 uppercase font-bold">
                    {settings.ttsSyncMode || 'word_boundary'}
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  Select which synchronization algorithm to use for TTS speech audio playback and target text highlighting.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    {
                      id: 'word_boundary',
                      title: '1. Word Boundary Event',
                      desc: 'Syncs using native TTS boundary event callbacks.',
                    },
                    {
                      id: 'time_linear',
                      title: '2. Smooth Linear (RAF)',
                      desc: 'Interpolates character index linearly during speech.',
                    },
                    {
                      id: 'word_step',
                      title: '3. Discrete Word Step',
                      desc: 'Steps word-by-word at equal time intervals.',
                    },
                    {
                      id: 'full_sentence',
                      title: '4. Full Sentence Highlight',
                      desc: 'Highlights full sentence for complete TTS duration.',
                    },
                  ].map((alt) => {
                    const isSelected = (settings.ttsSyncMode || 'word_boundary') === alt.id;
                    return (
                      <button
                        key={alt.id}
                        type="button"
                        id={`tts-sync-mode-${alt.id}`}
                        onClick={() =>
                          onUpdateSettings({ ...settings, ttsSyncMode: alt.id as any })
                        }
                        className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-500/80 text-amber-100 shadow-md ring-1 ring-amber-500/50'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-xs text-neutral-100">{alt.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1 leading-tight">{alt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Keep Translated Subtitles on Top
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Places translated dialogue on top above the original spoken line for comfortable reading.
                  </div>
                </div>
                <input
                  id="toggle-translated-subs-on-top"
                  type="checkbox"
                  checked={settings.showTranslatedOnTop ?? true}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showTranslatedOnTop: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Allow Non-Native TTS Fallback (Audio Stream)</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                      Disabled by default
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    When disabled (default), only native Android hardware TTS or standard browser Web Speech is used. Enable only if you want an external neural audio stream fallback when a local voice is missing.
                  </div>
                </div>
                <input
                  id="toggle-non-native-tts-setting"
                  data-testid="toggle-non-native-tts-setting"
                  type="checkbox"
                  checked={settings.allowNonNativeTTSFallback ?? false}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, allowNonNativeTTSFallback: e.target.checked })
                  }
                  className="w-5 h-5 accent-purple-500 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Present TTS Input &amp; Queue Debugger</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                      Default: ON
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Display real-time TTS input payload, active utterance status, character progress, and upcoming speech queue for live debugging.
                  </div>
                </div>
                <input
                  id="toggle-tts-debug-queue-setting"
                  data-testid="toggle-tts-debug-queue-setting"
                  type="checkbox"
                  checked={settings.showTtsDebugQueue ?? true}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showTtsDebugQueue: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Auto-fetch Target Subtitles via tlang
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Try once to fetch user-defined target language subtitles using YouTube tlang parameter change after default subtitles are fetched, presenting 1 notification.
                  </div>
                </div>
                <input
                  id="toggle-autofetch-target-tlang"
                  type="checkbox"
                  checked={settings.autoFetchTargetTranslationsWithTlang ?? true}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      autoFetchTargetTranslationsWithTlang: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-indigo-500 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Subtitles Table Records Per Page
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {settings.subtitlesPerPage === 0 ? 'All' : `${settings.subtitlesPerPage || 25} segments`}
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  Choose how many subtitle segments to display per page in the Subtitles Teacher Table.
                </div>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[
                    { value: 10, label: '10' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                    { value: 0, label: 'All' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, subtitlesPerPage: opt.value })
                      }
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        (settings.subtitlesPerPage ?? 25) === opt.value
                          ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Compact Design (Fast, Lightweight, Tap-to-Show Controls)</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Default
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Designed for high performance without scrolling. Controls hide automatically during video playback and appear when tapped. Turn off to switch to the Expanded Workspace view with the full subtitles teacher panel.
                  </div>
                </div>
                <input
                  id="toggle-compact-view-setting"
                  data-testid="toggle-compact-view-setting"
                  type="checkbox"
                  checked={settings.compactView ?? true}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, compactView: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Setting 1: Auto-play TTS Speech Narration (OFF by default) */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Auto-play TTS Speech (Dialogue Narration)</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    By default ON: automatically narrates dialogue with synchronized TTS speech and text highlighting. Can be paused or toggled off anytime.
                  </div>
                </div>
                <input
                  id="toggle-autoplay-tts-setting"
                  data-testid="toggle-autoplay-tts-setting"
                  type="checkbox"
                  checked={settings.autoPlayTTS ?? false}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, autoPlayTTS: e.target.checked })
                  }
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Setting 2: Single Target Language Mode (ON by default) */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Use Only 1 Target Language by Default</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    By default ON: keeps comprehension focused on 1 primary target language. In compact mode, use the quick &quot;+ Lang&quot; button to enable presentation of more languages.
                  </div>
                </div>
                <input
                  id="toggle-single-target-lang-mode"
                  data-testid="toggle-single-target-lang-mode"
                  type="checkbox"
                  checked={settings.singleTargetLanguageMode ?? true}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      singleTargetLanguageMode: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-indigo-500 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Setting 3: Show Subtitle Time Section Beside Subtitles (ON by default) */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Show Subtitle Time Section Besides Subtitles</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    By default ON: displays the subtitle cue&apos;s start and end timeframe (e.g. 00:04 - 00:07) directly beside each subtitle line on screen.
                  </div>
                </div>
                <input
                  id="toggle-show-subtitle-timestamps"
                  data-testid="toggle-show-subtitle-timestamps"
                  type="checkbox"
                  checked={settings.showSubtitleTimestamps ?? true}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      showSubtitleTimestamps: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Section: General Learning Languages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Favorite Languages (Default Translation Targets)</span>
              </h3>
              <span className="text-[11px] text-neutral-500">
                {(settings.learningLanguages || []).length} active
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              When loading any new video, the app will ask which of your chosen favorite languages (default: IT, RU, HE, EN, AR) you want to translate into.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUPPORTED_LANGUAGES_CATALOG.map((lang) => {
                const isSelected = (settings.learningLanguages || ['it', 'ru', 'he', 'en', 'ar']).includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      const current = settings.learningLanguages || ['it', 'ru', 'he', 'en', 'ar'];
                      let updated: string[];
                      if (isSelected) {
                        if (current.length <= 1) return; // Keep at least one
                        updated = current.filter((c) => c !== lang.code);
                      } else {
                        updated = [...current, lang.code];
                      }
                      onUpdateSettings({ ...settings, learningLanguages: updated });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-200 shadow-sm shadow-indigo-950/40'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[10px] uppercase opacity-60">({lang.code})</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Playback Order Sequence */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              <span>Playback Flow & Synchronization Order</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  settings.playOrder === 'video_then_tts'
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-neutral-100'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  id="play-order-video-then-tts"
                  data-testid="play-order-video-then-tts"
                  name="playOrder"
                  checked={settings.playOrder === 'video_then_tts'}
                  onChange={() => onUpdateSettings({ ...settings, playOrder: 'video_then_tts' })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Video First, then TTS
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Plays video segment, pauses, speaks translated TTS, then moves to next block.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  settings.playOrder === 'tts_then_video'
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-neutral-100'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  id="play-order-tts-then-video"
                  data-testid="play-order-tts-then-video"
                  name="playOrder"
                  checked={settings.playOrder === 'tts_then_video'}
                  onChange={() => onUpdateSettings({ ...settings, playOrder: 'tts_then_video' })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    TTS First, then Video
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Speaks translation first while paused, then plays the corresponding video segment.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Subtitle Fetching Methods (All On by Default) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Subtitle Fetching Methods</span>
              </h3>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/80">
                All Available
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Android Native timedtext Interception
                  </div>
                  <div className="text-xs text-neutral-400">
                    Intercepts network stream directly in Android WebView via native hooks.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.methods.nativeTimedTextInterception}
                  onChange={() => toggleMethod('nativeTimedTextInterception')}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Direct timedtext with tlang Parameter
                  </div>
                  <div className="text-xs text-neutral-400">
                    Constructs and requests translated timedtext subtitle tracks directly.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.methods.directTimedTextTlang}
                  onChange={() => toggleMethod('directTimedTextTlang')}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Server Subtitle Extraction API
                  </div>
                  <div className="text-xs text-neutral-400">
                    Direct YouTube timedtext extraction (relies on native player captions).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.methods.serverSubtitleExtraction}
                  onChange={() => toggleMethod('serverSubtitleExtraction')}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Google Free Translation Fallback (gtx)
                  </div>
                  <div className="text-xs text-neutral-400">
                    Translates cues on-demand if native YouTube translation is not available.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.methods.googleFreeTranslationFallback}
                  onChange={() => toggleMethod('googleFreeTranslationFallback')}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Local Offline Subtitle Cache
                  </div>
                  <div className="text-xs text-neutral-400">
                    Synchronous cache lookup for instantaneous subtitle restoration.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.methods.offlineLocalCache}
                  onChange={() => toggleMethod('offlineLocalCache')}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Advanced Developer Features (Off by default) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Advanced Features (Off by Default for Fast Performance)</span>
              </h3>
              <span className="text-[11px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/80">
                Resource Protection
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Floating Diagnostic Dock
                  </div>
                  <div className="text-xs text-neutral-400">
                    Displays state machine badges, audio meters, and live status dock.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableDiagnosticDock}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, enableDiagnosticDock: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Live Network Inspector
                  </div>
                  <div className="text-xs text-neutral-400">
                    Traces all fetch, XHR, and timedtext requests in detailed inspector.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableNetworkInspector}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, enableNetworkInspector: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    State Machine & Error Inspector
                  </div>
                  <div className="text-xs text-neutral-400">
                    Deep audit of Redux state transitions and categorised errors.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableErrorInspector}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, enableErrorInspector: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs sm:text-sm text-neutral-200">
                    Background Auto-Precache All Translations
                  </div>
                  <div className="text-xs text-neutral-400">
                    Pre-translates full tracks in background (heavy). Keep OFF for fast performance.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableBackgroundPrecache}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, enableBackgroundPrecache: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
              </div>
            </div>
          </div>

          {/* Section: Import / Export App Settings & Exact Status */}
          <div className="space-y-3 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-indigo-400" />
                <span>Import &amp; Export App Settings &amp; Status</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-indigo-300 font-mono">
                JSON Snapshot
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="text-xs text-neutral-400 leading-relaxed">
                Export and share your complete application configuration, per-video target language preferences, and runtime status snapshot, or restore previous settings across devices.
              </div>

              {importExportStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{importExportStatus}</span>
                </div>
              )}

              {importExportError && (
                <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{importExportError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  id="export-settings-json-btn"
                  onClick={handleExportJsonDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition"
                  title="Download full settings & status snapshot as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export JSON</span>
                </button>

                <button
                  type="button"
                  id="copy-settings-json-btn"
                  onClick={handleExportClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition"
                  title="Copy JSON snapshot to clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy Snapshot</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />

                <button
                  type="button"
                  id="import-settings-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 text-xs font-medium transition"
                  title="Import settings snapshot from a JSON file"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Import File</span>
                </button>

                <button
                  type="button"
                  id="import-settings-paste-btn"
                  onClick={() => setPasteModalOpen(!pasteModalOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium transition"
                  title="Paste JSON string directly"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Paste JSON</span>
                </button>
              </div>

              {pasteModalOpen && (
                <div className="pt-2 space-y-2 border-t border-neutral-800 animate-fadeIn">
                  <textarea
                    rows={4}
                    value={pastedJson}
                    onChange={(e) => setPastedJson(e.target.value)}
                    placeholder='Paste JSON settings object here (e.g. {"settings": {...}})...'
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasteModalOpen(false);
                        setPastedJson('');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPastedJson}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      Apply JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Android Shell APK & App Updates */}
          <div className="space-y-3 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Android Shell APK &amp; App Updates</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-emerald-300 font-mono font-bold">
                {isAndroidNative ? 'Native Shell: v1.0.13' : 'Web Companion Demo'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-medium text-xs sm:text-sm text-neutral-200 flex items-center gap-2">
                  <span>YouTube-Viewer-debug.apk</span>
                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                    {isAndroidNative ? 'Installed APK' : 'Android App Only'}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {isAndroidNative
                    ? 'Check if a newer APK build is available and install directly via the in-app installer.'
                    : 'Web companion mode is active. APK updates and native installer apply to Android devices.'}
                </div>
              </div>

              {onOpenApkUpdate && (
                <button
                  type="button"
                  id="settings-check-apk-button"
                  onClick={() => {
                    onClose();
                    onOpenApkUpdate();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Check &amp; Install APK</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 flex items-center justify-between bg-neutral-900">
          <button
            onClick={onResetSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Safe Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
