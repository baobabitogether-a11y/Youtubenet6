import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  TTSInputRecord,
  TTSDebugPayload,
  TTSDebugHistoryItem,
  subscribeTTSDebug,
} from '../lib/ttsEngine';
import { TTSInputTextsView } from './TTSInputTextsView';

interface TTSInputTextsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLangCode?: string;
  onOpenSettings?: () => void;
}

export const TTSInputTextsModal: React.FC<TTSInputTextsModalProps> = ({
  isOpen,
  onClose,
  targetLangCode = 'he',
  onOpenSettings,
}) => {
  const [debugState, setDebugState] = useState<{
    current: TTSDebugPayload | null;
    history: TTSDebugHistoryItem[];
    inputs: TTSInputRecord[];
  }>({ current: null, history: [], inputs: [] });

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeTTSDebug((state) => {
      setDebugState(state);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="tts-input-texts-modal"
      data-testid="tts-input-texts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/70 text-emerald-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <span>TTS Input Texts Inspector</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                  NEWER ON TOP
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Live stream and comprehensive list control of all speech input strings presented to TTS
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-tts-inputs-modal-btn"
            data-testid="close-tts-inputs-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto">
          <TTSInputTextsView
            inputs={debugState.inputs}
            currentPayload={debugState.current}
            targetLangCode={targetLangCode}
            isSpeaking={debugState.current?.status === 'speaking'}
            onOpenSettings={onOpenSettings}
            id="tts-inputs-modal-view"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-400">
          <span>Presented in reverse chronological order (newest text inputs at top)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TTSInputTextsModal;
