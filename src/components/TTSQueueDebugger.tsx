import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  ChevronDown,
  ChevronUp,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  ListFilter,
  FileText,
} from 'lucide-react';
import { CaptionCue } from '../types';
import {
  subscribeTTSDebug,
  TTSDebugPayload,
  TTSDebugHistoryItem,
  TTSInputRecord,
  speakText,
  stopTTS,
} from '../lib/ttsEngine';
import { formatTimestamp } from '../utils/captionParser';
import { TTSInputTextsView } from './TTSInputTextsView';

interface TTSQueueDebuggerProps {
  activeCue?: CaptionCue | null;
  nextCue?: CaptionCue | null;
  targetLangCode?: string;
  translatedText?: string | null;
  nextTranslatedText?: string | null;
  isSpeaking?: boolean;
  isSyncActive?: boolean;
  autoTTSEnabled?: boolean;
  onToggleAutoTTS?: () => void;
  onTestSpeak?: () => void;
  onOpenSettings?: () => void;
  compact?: boolean;
  className?: string;
  id?: string;
}

export const TTSQueueDebugger: React.FC<TTSQueueDebuggerProps> = ({
  activeCue,
  nextCue,
  targetLangCode = 'he',
  translatedText,
  nextTranslatedText,
  isSpeaking: externalSpeaking,
  isSyncActive = false,
  autoTTSEnabled = true,
  onToggleAutoTTS,
  onTestSpeak,
  onOpenSettings,
  compact = false,
  className = '',
  id = 'tts-queue-debugger',
}) => {
  const [debugState, setDebugState] = useState<{
    current: TTSDebugPayload | null;
    history: TTSDebugHistoryItem[];
    inputs: TTSInputRecord[];
  }>({ current: null, history: [], inputs: [] });

  const [isCollapsed, setIsCollapsed] = useState(false);
  // Default to the dedicated TTS Input Texts list view (Newer on top)
  const [activeTab, setActiveTab] = useState<'input_texts' | 'current_input' | 'queue' | 'history'>('input_texts');

  useEffect(() => {
    const unsubscribe = subscribeTTSDebug((state) => {
      setDebugState(state);
    });
    return unsubscribe;
  }, []);

  const currentPayload = debugState.current;
  const isSpeaking = externalSpeaking || currentPayload?.status === 'speaking';

  const cleanLang = (targetLangCode || 'he').toLowerCase().split('-')[0];
  const langName = cleanLang === 'he' ? 'Hebrew (עברית)' : cleanLang.toUpperCase();

  const handleStop = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    stopTTS();
  };

  const handleReplay = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onTestSpeak) {
      onTestSpeak();
      return;
    }
    const textToSpeak = currentPayload?.text || translatedText || activeCue?.text;
    if (textToSpeak) {
      const langToUse = currentPayload?.lang || targetLangCode;
      try {
        await speakText(textToSpeak, langToUse, currentPayload?.rate || 1.0);
      } catch {}
    }
  };

  const charProgressPercent =
    currentPayload && currentPayload.totalChars > 0
      ? Math.min(100, Math.round((currentPayload.charIndex / currentPayload.totalChars) * 100))
      : 0;

  return (
    <div
      id={id}
      data-testid={id}
      className={`rounded-xl border border-neutral-800 bg-neutral-950/95 text-neutral-200 overflow-hidden shadow-xl transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-neutral-100 tracking-wide truncate">
            TTS Input Texts &amp; Queue View
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
            NEWER ON TOP
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* TTS Repeat Red Light Indicator */}
          {currentPayload?.isRepeat && (
            <span
              id="tts-repeat-red-light"
              data-testid="tts-repeat-red-light"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/95 text-rose-200 border border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-pulse shrink-0"
              title={`TTS Repeating on Same Text: Repeated ${currentPayload.repeatCount} times consecutively`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
              </span>
              <span>REPEAT x{currentPayload.repeatCount}</span>
            </span>
          )}

          {/* Status Badge */}
          {isSpeaking ? (
            <span
              id="tts-debugger-speaking-badge"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 animate-pulse"
            >
              <Radio className="w-3 h-3 animate-spin" />
              <span>Speaking ({currentPayload?.engine || 'TTS'})</span>
            </span>
          ) : (
            <span
              id="tts-debugger-idle-badge"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              <span>Idle</span>
            </span>
          )}

          {/* Quick Action Buttons */}
          {isSpeaking ? (
            <button
              type="button"
              id="tts-debug-stop-btn"
              data-testid="tts-debug-stop-btn"
              onClick={handleStop}
              className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[11px] font-medium flex items-center gap-1 transition"
              title="Stop TTS immediately"
            >
              <VolumeX className="w-3 h-3" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              id="tts-debug-replay-btn"
              data-testid="tts-debug-replay-btn"
              onClick={handleReplay}
              className="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[11px] font-medium flex items-center gap-1 transition"
              title="Replay active TTS input"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Replay</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              id="tts-debug-open-settings-btn"
              data-testid="tts-debug-open-settings-btn"
              onClick={onOpenSettings}
              className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition"
              title="Configure TTS in Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            id="tts-debug-toggle-collapse-btn"
            data-testid="tts-debug-toggle-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition"
            title={isCollapsed ? 'Expand TTS Debugger' : 'Collapse TTS Debugger'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-neutral-800 pb-2 text-xs">
            {/* DEFAULT VIEW: TTS Input Texts (Newer on Top) */}
            <button
              type="button"
              id="tts-tab-inputs-feed-btn"
              data-testid="tts-tab-inputs-feed-btn"
              onClick={() => setActiveTab('input_texts')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'input_texts'
                  ? 'bg-neutral-800 text-emerald-300 border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
              <span>TTS Input Texts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-900 border border-neutral-700 text-neutral-300">
                {debugState.inputs.length}
              </span>
            </button>

            <button
              type="button"
              id="tts-tab-input-btn"
              data-testid="tts-tab-input-btn"
              onClick={() => setActiveTab('current_input')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'current_input'
                  ? 'bg-neutral-800 text-indigo-300 border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Payload Detail</span>
            </button>

            <button
              type="button"
              id="tts-tab-queue-btn"
              data-testid="tts-tab-queue-btn"
              onClick={() => setActiveTab('queue')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'bg-neutral-800 text-cyan-300 border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Queue ({activeCue ? '1 Active' : '0'}{nextCue ? ' + 1 Next' : ''})</span>
            </button>

            <button
              type="button"
              id="tts-tab-history-btn"
              data-testid="tts-tab-history-btn"
              onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-neutral-800 text-amber-300 border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>History ({debugState.history.length})</span>
            </button>
          </div>

          {/* DEFAULT TAB: TTS INPUT TEXTS LIST (NEWER ON TOP) */}
          {activeTab === 'input_texts' && (
            <TTSInputTextsView
              inputs={debugState.inputs}
              currentPayload={currentPayload}
              targetLangCode={targetLangCode}
              isSpeaking={isSpeaking}
              onOpenSettings={onOpenSettings}
              compact={compact}
              id="tts-queue-inputs-list-view"
            />
          )}

          {/* TAB 2: ACTIVE TTS INPUT PAYLOAD DETAIL */}
          {activeTab === 'current_input' && (
            <div className="space-y-2.5">
              {/* Input Text Box */}
              <div
                className={`p-2.5 rounded-lg bg-neutral-900 border font-mono text-xs transition-all ${
                  currentPayload?.isRepeat
                    ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/50'
                    : 'border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Volume2 className={`w-3.5 h-3.5 ${currentPayload?.isRepeat ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <span>Active Speech String:</span>
                    </span>
                    {currentPayload?.isRepeat && (
                      <span
                        id="tts-repeat-box-indicator"
                        data-testid="tts-repeat-box-indicator"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/90 border border-rose-600/80 px-1.5 py-0.2 rounded animate-pulse"
                        title={`Repeating on identical text (${currentPayload.repeatCount}x)`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,1)]" />
                        <span>Repeat #{currentPayload.repeatCount}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-neutral-500">
                    {currentPayload?.charIndex ?? 0} / {currentPayload?.totalChars ?? (translatedText?.length || 0)} chars ({charProgressPercent}%)
                  </span>
                </div>

                <div
                  id="tts-debug-active-text"
                  data-testid="tts-debug-active-text"
                  className={`p-2 rounded bg-neutral-950 leading-relaxed border select-all ${
                    currentPayload?.isRepeat
                      ? 'text-rose-100 border-rose-800/70 bg-rose-950/20'
                      : 'text-neutral-100 border-neutral-800/80'
                  }`}
                >
                  {currentPayload?.text || translatedText || activeCue?.text || (
                    <span className="text-neutral-500 italic">No active speech input currently queued</span>
                  )}
                </div>

                {/* Character Progress Bar */}
                {isSpeaking && (
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-150 ${
                        currentPayload?.isRepeat ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${charProgressPercent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Metadata Key-Value Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 flex flex-col gap-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase">Language</span>
                  <span className="text-emerald-300 font-semibold truncate">
                    {currentPayload?.lang || targetLangCode} ({langName})
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 flex flex-col gap-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase">Engine</span>
                  <span className="text-cyan-300 font-semibold truncate">
                    {currentPayload?.engine || 'Web Speech / Native'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 flex flex-col gap-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase">Speech Rate</span>
                  <span className="text-amber-300 font-semibold">
                    {currentPayload?.rate ? `${currentPayload.rate}x` : '1.0x'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 flex flex-col gap-0.5">
                  <span className="text-neutral-500 text-[10px] uppercase">Auto-TTS Mode</span>
                  <span className={autoTTSEnabled ? 'text-emerald-400 font-semibold' : 'text-neutral-400 font-semibold'}>
                    {autoTTSEnabled ? 'Enabled' : 'Disabled (Off)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TTS QUEUE (QUE) */}
          {activeTab === 'queue' && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Queued Utterance Sequence</span>
                <span className="text-neutral-500">Execution: Pauses Video &rarr; Speaks TTS &rarr; Resumes</span>
              </div>

              {/* Active Cue in Queue */}
              <div
                id="tts-queue-item-active"
                data-testid="tts-queue-item-active"
                className="p-2.5 rounded-lg bg-gradient-to-r from-neutral-900 to-indigo-950/40 border border-indigo-500/40 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    [1] Current Timeframe: {activeCue?.id || 'cue-active'} ({formatTimestamp(activeCue?.start || 0)})
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-900/80 text-indigo-200 border border-indigo-700/50">
                    {isSpeaking ? 'ACTIVE SPEAKING' : 'READY / IN VIEW'}
                  </span>
                </div>

                <div className="font-mono text-neutral-300 text-[11px] pl-3 border-l-2 border-indigo-500/50">
                  <div className="text-neutral-400 truncate">Source: {activeCue?.text || '—'}</div>
                  <div className="text-emerald-300 font-medium truncate">
                    Target ({targetLangCode}): {translatedText || currentPayload?.text || '—'}
                  </div>
                </div>
              </div>

              {/* Next Cue in Queue */}
              {nextCue ? (
                <div
                  id="tts-queue-item-next"
                  data-testid="tts-queue-item-next"
                  className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1.5 opacity-80 hover:opacity-100 transition"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      [2] Upcoming Next: {nextCue.id} ({formatTimestamp(nextCue.start)})
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700">
                      QUEUED NEXT
                    </span>
                  </div>

                  <div className="font-mono text-neutral-400 text-[11px] pl-3 border-l-2 border-neutral-700">
                    <div className="truncate">Source: {nextCue.text}</div>
                    {nextTranslatedText && (
                      <div className="text-neutral-300 truncate">Target ({targetLangCode}): {nextTranslatedText}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-neutral-900/30 border border-neutral-800/50 text-neutral-500 italic text-[11px] text-center">
                  End of video timeframe queue reached
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RECENT SPEECH HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {debugState.history.length === 0 ? (
                <div className="p-4 rounded-lg bg-neutral-900/30 border border-neutral-800/50 text-neutral-500 italic text-xs text-center">
                  No TTS speech events recorded in this session yet
                </div>
              ) : (
                debugState.history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-neutral-900 border border-neutral-800/80 flex items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <span>{item.timestamp}</span>
                        <span className="text-emerald-400 font-semibold">{item.lang}</span>
                        <span>{item.engine}</span>
                        {item.durationMs && <span>({item.durationMs}ms)</span>}
                        {item.isRepeat && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Repeat #{item.repeatCount}
                          </span>
                        )}
                      </div>
                      <div className="text-neutral-200 truncate mt-0.5">"{item.text}"</div>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        item.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : item.status === 'cancelled'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TTSQueueDebugger;

