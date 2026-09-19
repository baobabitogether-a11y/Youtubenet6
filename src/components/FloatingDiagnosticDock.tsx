import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Workflow,
  ChevronDown,
  ChevronUp,
  Radio,
  Copy,
  Check,
  Volume2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setNetworkInspectorOpen } from '../store/networkSlice';
import { setInspectorOpen } from '../store/errorsSlice';
import { logBuffer } from '../utils/logBuffer';
import { subscribeTTSDebug } from '../lib/ttsEngine';

interface FloatingDiagnosticDockProps {
  onOpenTTSInputs?: () => void;
}

export const FloatingDiagnosticDock: React.FC<FloatingDiagnosticDockProps> = ({
  onOpenTTSInputs,
}) => {
  const dispatch = useAppDispatch();
  const { requests } = useAppSelector((state) => state.network);
  const { errors } = useAppSelector((state) => state.errors);
  const { currentState } = useAppSelector((state) => state.stateMachine);

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [ttsInputsCount, setTtsInputsCount] = useState<number>(0);

  useEffect(() => {
    const unsub = subscribeTTSDebug((state) => {
      setTtsInputsCount(state.inputs.length);
    });
    return unsub;
  }, []);

  const handleQuickCopyLogs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = logBuffer.copyAll();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  const pendingRequests = requests.filter((r) => r.isPending).length;

  return (
    <aside
      id="floating-diagnostic-dock"
      data-testid="floating-diagnostic-dock"
      aria-label="Developer diagnostics dock"
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 font-sans select-none"
    >
      {isMinimized ? (
        <button
          id="expand-diagnostic-dock-button"
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-900/95 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 shadow-2xl backdrop-blur-md transition text-xs font-semibold"
          title="Expand Network & Error Inspectors"
        >
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>{requests.length}</span>
          </div>
          {errors.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
          <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-md text-xs">
          {/* State Machine Status Badge & Clickable Trigger */}
          <button
            id="state-machine-status-badge"
            type="button"
            onClick={() => dispatch(setInspectorOpen(true))}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[11px] transition"
            title={`Redux State Machine: ${currentState}. Click to view state transitions.`}
          >
            <Workflow className="w-3 h-3 text-purple-400" />
            <span className="text-purple-300 font-medium">{currentState}</span>
          </button>

          {/* Quick Copy All Logs & Prompt */}
          <button
            id="quick-copy-diagnostics-btn"
            data-testid="quick-copy-diagnostics-btn"
            type="button"
            onClick={handleQuickCopyLogs}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition active:scale-95 font-medium ${
              copiedPrompt
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-neutral-850 hover:bg-neutral-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
            }`}
            title="Quick Copy Complete App State, Logs & Troubleshooting Prompt to Clipboard"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy Logs</span>
              </>
            )}
          </button>

          {/* Dedicated TTS Inputs View Button */}
          {onOpenTTSInputs && (
            <button
              id="open-tts-inputs-floating-button"
              data-testid="open-tts-inputs-floating-button"
              type="button"
              onClick={onOpenTTSInputs}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 transition active:scale-95 font-medium"
              title="Inspect TTS Input Texts (Newer on Top)"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>TTS</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-900/80 text-[10px] font-mono font-bold text-emerald-200">
                {ttsInputsCount}
              </span>
            </button>
          )}

          {/* Network Inspector Button (Requirement 2) */}
          <button
            id="open-network-inspector-floating-button"
            data-testid="open-network-inspector-floating-button"
            type="button"
            onClick={() => dispatch(setNetworkInspectorOpen(true))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-800/60 transition active:scale-95 font-medium"
            title="Inspect all web requests and responses"
          >
            <div className="relative">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              {pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span>Network</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-900/80 text-[10px] font-mono font-bold text-blue-200">
              {requests.length}
            </span>
          </button>

          {/* Error Inspector Button (Requirement 3) */}
          <button
            id="open-error-inspector-floating-button"
            data-testid="open-error-inspector-floating-button"
            type="button"
            onClick={() => dispatch(setInspectorOpen(true))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition active:scale-95 font-medium ${
              errors.length > 0
                ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border-red-700/80 animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border-neutral-700'
            }`}
            title="Inspect application errors & state machine actions"
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 ${errors.length > 0 ? 'text-red-400' : 'text-neutral-400'}`}
            />
            <span>Errors</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                errors.length > 0
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-900 text-neutral-400'
              }`}
            >
              {errors.length}
            </span>
          </button>

          {/* Minimize toggle */}
          <button
            id="minimize-diagnostic-dock-button"
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            title="Minimize Dock"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
};
