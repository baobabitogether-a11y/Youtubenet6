import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  Radio,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  ShieldAlert,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Code,
  FileText,
  Pin,
} from 'lucide-react';
import {
  TTSInputRecord,
  TTSDebugPayload,
  speakText,
  stopTTS,
  clearTTSInputsFeed,
} from '../lib/ttsEngine';

interface TTSInputTextsViewProps {
  inputs: TTSInputRecord[];
  currentPayload: TTSDebugPayload | null;
  targetLangCode?: string;
  isSpeaking?: boolean;
  onOpenSettings?: () => void;
  compact?: boolean;
  className?: string;
  id?: string;
}

export const TTSInputTextsView: React.FC<TTSInputTextsViewProps> = ({
  inputs = [],
  currentPayload,
  targetLangCode = 'he',
  isSpeaking = false,
  onOpenSettings,
  compact = false,
  className = '',
  id = 'tts-input-texts-view',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'speaking' | 'completed' | 'repeats'>('all');
  const [viewDensity, setViewDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [autoScrollTop, setAutoScrollTop] = useState<boolean>(true);
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to top when new input arrives if pinned
  useEffect(() => {
    if (autoScrollTop && listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [inputs.length, autoScrollTop]);

  const toggleExpandItem = (itemId: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleCopyText = async (itemId: string, text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyAll = async () => {
    const textToCopy = filteredInputs
      .map(
        (item, idx) =>
          `[#${item.index || filteredInputs.length - idx}] [${item.timestamp}] [${item.lang}] (${item.engine}, ${item.rate}x, ${item.status}${item.isRepeat ? `, REPEAT x${item.repeatCount}` : ''}):\n"${item.text}"`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleSpeakItem = async (item: TTSInputRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await speakText(item.text, item.lang, item.rate);
    } catch {}
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    clearTTSInputsFeed();
  };

  // Filter inputs (Newer is already at index 0 from engine)
  const filteredInputs = useMemo(() => {
    return inputs.filter((item) => {
      // Status filter
      if (statusFilter === 'speaking' && item.status !== 'speaking') return false;
      if (statusFilter === 'completed' && item.status !== 'completed') return false;
      if (statusFilter === 'repeats' && !item.isRepeat) return false;

      // Text / Lang search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesText = item.text.toLowerCase().includes(q);
        const matchesLang = item.lang.toLowerCase().includes(q);
        const matchesEngine = item.engine.toLowerCase().includes(q);
        return matchesText || matchesLang || matchesEngine;
      }

      return true;
    });
  }, [inputs, statusFilter, searchQuery]);

  const speakingCount = inputs.filter((i) => i.status === 'speaking').length;
  const repeatsCount = inputs.filter((i) => i.isRepeat).length;

  return (
    <div
      id={id}
      data-testid={id}
      className={`flex flex-col rounded-xl bg-neutral-950/90 border border-neutral-800 text-neutral-200 overflow-hidden shadow-lg ${className}`}
    >
      {/* Top List Control Bar */}
      <div className="p-3 bg-neutral-900/90 border-b border-neutral-800 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Header Title & Live Counter */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/70 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-neutral-100 tracking-wide">
                  TTS Input Texts View
                </span>
                <span
                  id="tts-inputs-order-badge"
                  data-testid="tts-inputs-order-badge"
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60"
                  title="List presents newest inputs on top (reverse chronological order)"
                >
                  NEWER ON TOP &darr;
                </span>
                {isSpeaking && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                Tracking {inputs.length} total TTS input strings in current session
              </p>
            </div>
          </div>

          {/* Quick List Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Density toggle */}
            <button
              type="button"
              id="tts-inputs-density-toggle"
              data-testid="tts-inputs-density-toggle"
              onClick={() => setViewDensity(viewDensity === 'comfortable' ? 'compact' : 'comfortable')}
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium border border-neutral-700 transition"
              title={`Switch to ${viewDensity === 'comfortable' ? 'Compact' : 'Comfortable'} view`}
            >
              {viewDensity === 'comfortable' ? 'Compact Rows' : 'Card View'}
            </button>

            {/* Pin to top toggle */}
            <button
              type="button"
              id="tts-inputs-autoscroll-toggle"
              data-testid="tts-inputs-autoscroll-toggle"
              onClick={() => setAutoScrollTop(!autoScrollTop)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1 ${
                autoScrollTop
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
              }`}
              title={autoScrollTop ? 'Pinned to top (newest always visible)' : 'Auto-scroll disabled'}
            >
              <Pin className="w-3 h-3" />
              <span className="hidden sm:inline">{autoScrollTop ? 'Pinned Top' : 'Free Scroll'}</span>
            </button>

            {/* Copy all inputs */}
            <button
              type="button"
              id="tts-inputs-copy-all-btn"
              data-testid="tts-inputs-copy-all-btn"
              onClick={handleCopyAll}
              disabled={filteredInputs.length === 0}
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-40 text-[11px] font-medium border border-neutral-700 transition flex items-center gap-1"
              title="Copy all listed TTS inputs"
            >
              {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedAll ? 'Copied All' : 'Copy All'}</span>
            </button>

            {/* Clear button */}
            <button
              type="button"
              id="tts-inputs-clear-btn"
              data-testid="tts-inputs-clear-btn"
              onClick={handleClear}
              disabled={inputs.length === 0}
              className="p-1 rounded-lg bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-300 disabled:opacity-40 border border-neutral-700 transition"
              title="Clear TTS inputs history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {onOpenSettings && (
              <button
                type="button"
                id="tts-inputs-settings-btn"
                data-testid="tts-inputs-settings-btn"
                onClick={onOpenSettings}
                className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition"
                title="Configure TTS in Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Search Box */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              id="tts-filter-all-btn"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border ${
                statusFilter === 'all'
                  ? 'bg-neutral-750 text-neutral-100 border-neutral-600'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
            >
              All ({inputs.length})
            </button>

            <button
              type="button"
              id="tts-filter-speaking-btn"
              onClick={() => setStatusFilter('speaking')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border flex items-center gap-1 ${
                statusFilter === 'speaking'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Speaking ({speakingCount})</span>
            </button>

            <button
              type="button"
              id="tts-filter-completed-btn"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border ${
                statusFilter === 'completed'
                  ? 'bg-blue-950 text-blue-300 border-blue-600'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-blue-300'
              }`}
            >
              Completed ({inputs.filter((i) => i.status === 'completed').length})
            </button>

            {repeatsCount > 0 && (
              <button
                type="button"
                id="tts-filter-repeats-btn"
                onClick={() => setStatusFilter('repeats')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border flex items-center gap-1 ${
                  statusFilter === 'repeats'
                    ? 'bg-rose-950 text-rose-300 border-rose-600'
                    : 'bg-neutral-900 text-rose-400 border-neutral-800 hover:text-rose-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>Repeats ({repeatsCount})</span>
              </button>
            )}
          </div>

          {/* Search Filter Input */}
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="tts-inputs-search-input"
              data-testid="tts-inputs-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by text or lang..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-[10px]"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main List Control Content: Presents Newer on Top */}
      <div
        ref={listContainerRef}
        id="tts-inputs-list-container"
        data-testid="tts-inputs-list-container"
        className="p-3 space-y-2.5 max-h-[380px] overflow-y-auto pr-1.5 font-sans"
      >
        {filteredInputs.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-neutral-900/30 border border-neutral-800/60 text-neutral-400 space-y-2">
            <div className="p-2.5 rounded-full bg-neutral-800/80 text-neutral-400 inline-block">
              <Volume2 className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-300">
              {searchQuery || statusFilter !== 'all'
                ? 'No matching TTS inputs found'
                : 'No TTS speech input recorded yet'}
            </h4>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try clearing your search query or status filter to see all recorded speech inputs.'
                : 'Play a video with Auto-TTS enabled or click any subtitle speaker icon to inspect live TTS text inputs here.'}
            </p>
            {inputs.length === 0 && (
              <button
                type="button"
                id="tts-test-input-sample-btn"
                onClick={() => speakText('Hello, this is a test speech input string.', targetLangCode, 1.0)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-medium transition"
              >
                <Play className="w-3 h-3" />
                <span>Trigger Sample TTS Input</span>
              </button>
            )}
          </div>
        ) : (
          filteredInputs.map((item, index) => {
            const isItemSpeaking = item.status === 'speaking';
            const isTopItem = index === 0;
            const isExpanded = !!expandedItemIds[item.id];
            const charProgressPercent =
              isItemSpeaking && item.totalChars > 0
                ? Math.min(100, Math.round((item.charIndex / item.totalChars) * 100))
                : 100;

            if (viewDensity === 'compact') {
              // Compact Row Presentation (Newer on Top)
              return (
                <div
                  key={item.id}
                  id={`tts-input-row-${item.id}`}
                  data-testid={`tts-input-row-${item.id}`}
                  className={`p-2 rounded-lg border font-mono text-xs flex items-center justify-between gap-3 transition-all ${
                    isItemSpeaking
                      ? item.isRepeat
                        ? 'bg-rose-950/40 border-rose-600/80 shadow-[0_0_10px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50'
                        : 'bg-emerald-950/30 border-emerald-600/80 shadow-[0_0_8px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50'
                      : item.isRepeat
                      ? 'bg-rose-950/20 border-rose-800/40 text-neutral-300'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Item Counter (Newer on Top) */}
                    <span className="text-[10px] font-bold text-neutral-500 shrink-0">
                      #{item.index || inputs.length - index}
                    </span>

                    {/* Status Badge */}
                    {isItemSpeaking ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-900/90 text-emerald-300 border border-emerald-600 flex items-center gap-1 shrink-0 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>SPEAKING</span>
                      </span>
                    ) : item.isRepeat ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1 shrink-0">
                        <span className="w-1 h-1 rounded-full bg-rose-500" />
                        <span>x{item.repeatCount}</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0 uppercase">
                        {item.status}
                      </span>
                    )}

                    {/* Lang & Timestamp */}
                    <span className="text-[10px] text-emerald-400 font-bold shrink-0">
                      [{item.lang.toUpperCase()}]
                    </span>
                    <span className="text-[10px] text-neutral-500 shrink-0 hidden sm:inline">
                      {item.timestamp}
                    </span>

                    {/* Text String */}
                    <span className="text-neutral-100 font-sans font-medium text-xs truncate min-w-0 select-all">
                      "{item.text}"
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleSpeakItem(item, e)}
                      className="p-1 rounded bg-neutral-800 hover:bg-indigo-900 text-neutral-300 hover:text-indigo-200 transition"
                      title="Replay this TTS input"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCopyText(item.id, item.text, e)}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                      title="Copy text"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            }

            // Comfortable Card Presentation (Newer on Top)
            return (
              <div
                key={item.id}
                id={`tts-input-card-${item.id}`}
                data-testid={`tts-input-card-${item.id}`}
                className={`p-3 rounded-xl border transition-all duration-200 space-y-2.5 ${
                  isItemSpeaking
                    ? item.isRepeat
                      ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.35)] ring-1 ring-rose-500'
                      : 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500'
                    : item.isRepeat
                    ? 'bg-neutral-900/90 border-rose-800/60 hover:border-rose-700'
                    : isTopItem
                    ? 'bg-neutral-900/95 border-indigo-600/50 shadow-sm'
                    : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header Row of Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {/* Sequential Index Counter */}
                    <span className="font-mono text-xs font-bold text-neutral-400 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                      #{item.index || inputs.length - index}
                      {isTopItem && <span className="ml-1 text-indigo-400 font-semibold">(Latest)</span>}
                    </span>

                    {/* Status Pill */}
                    {isItemSpeaking ? (
                      <span
                        id="tts-input-speaking-pill"
                        data-testid="tts-input-speaking-pill"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse shadow-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>SPEAKING NOW</span>
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'completed'
                            ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                            : item.status === 'cancelled'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}

                    {/* Red Light Repeat Badge */}
                    {item.isRepeat && (
                      <span
                        id={`tts-input-repeat-badge-${item.id}`}
                        data-testid={`tts-input-repeat-badge-${item.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/95 text-rose-200 border border-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
                        title={`Consecutive repeat on identical text (${item.repeatCount} times)`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>REPEAT x{item.repeatCount}</span>
                      </span>
                    )}

                    {/* Timestamp */}
                    <span className="font-mono text-[11px] text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span>{item.timestamp}</span>
                    </span>
                  </div>

                  {/* Metadata Chips (Lang, Engine, Rate, Duration) */}
                  <div className="flex items-center gap-1.5 font-mono text-[10px] flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-emerald-300 border border-neutral-800 font-semibold">
                      {item.lang.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-cyan-300 border border-neutral-800 hidden sm:inline">
                      {item.engine === 'android_native'
                        ? 'Android Native TTS'
                        : item.engine === 'web_speech'
                        ? 'Web Speech API'
                        : 'Audio Stream'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-amber-300 border border-neutral-800">
                      {item.rate}x
                    </span>
                    {item.durationMs && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                        {item.durationMs}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Input Text Box */}
                <div
                  id={`tts-input-text-body-${item.id}`}
                  data-testid={`tts-input-text-body-${item.id}`}
                  className={`p-2.5 rounded-lg bg-neutral-950 border leading-relaxed text-sm select-all ${
                    isItemSpeaking
                      ? item.isRepeat
                        ? 'text-rose-100 border-rose-700/80 bg-rose-950/20'
                        : 'text-neutral-100 border-emerald-700/80 bg-emerald-950/10'
                      : item.isRepeat
                      ? 'text-rose-200/95 border-rose-900/60'
                      : 'text-neutral-200 border-neutral-800'
                  }`}
                >
                  <p className="font-sans font-medium">{item.text}</p>

                  {/* Real-time speaking progress bar */}
                  {isItemSpeaking && (
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-150 ${
                          item.isRepeat ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${charProgressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Footer Metrics & Actions Toolbar */}
                <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                    <span>{item.wordCount} words</span>
                    <span>•</span>
                    <span>{item.totalChars} characters</span>
                    {item.error && (
                      <span className="text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>{item.error}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Speak button */}
                    <button
                      type="button"
                      id={`tts-speak-btn-${item.id}`}
                      data-testid={`tts-speak-btn-${item.id}`}
                      onClick={(e) => handleSpeakItem(item, e)}
                      className="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-medium flex items-center gap-1 transition active:scale-95 shadow-sm"
                      title="Pronounce this text again"
                    >
                      <Volume2 className="w-3 h-3 text-indigo-400" />
                      <span>Speak</span>
                    </button>

                    {/* Copy text */}
                    <button
                      type="button"
                      id={`tts-copy-btn-${item.id}`}
                      data-testid={`tts-copy-btn-${item.id}`}
                      onClick={(e) => handleCopyText(item.id, item.text, e)}
                      className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1 transition"
                      title="Copy text to clipboard"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Expand Raw JSON Metadata */}
                    <button
                      type="button"
                      onClick={() => toggleExpandItem(item.id)}
                      className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition"
                      title="Toggle raw metadata details"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Raw JSON Metadata */}
                {isExpanded && (
                  <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400 overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TTSInputTextsView;
