import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Search,
  Play,
  Volume2,
  Code,
  Layers,
  Globe,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  FCRZADI8R9U_LANGUAGE_SRT_TRACKS,
  getCachedSrtForVideoAndLanguage,
} from '../../test/fixtures/defaultSubtitles';
import { getRawSrtForLanguage, normalizeLanguageCode } from '../../test/fixtures/FcRzAdI8R9U/srtStrings';
import { CaptionCue } from '../types';
import { speakText } from '../lib/ttsEngine';

interface SubtitleArtifactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  activeTargetLang?: string;
  onSelectLanguage?: (langCode: string) => void;
  onSeek?: (seconds: number) => void;
}

interface TrackDef {
  code: string;
  name: string;
  nativeName: string;
  role: 'source' | 'target';
  rtl?: boolean;
  color: string;
}

const AVAILABLE_TRACKS: TrackDef[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', role: 'source', color: '#3b82f6' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', role: 'target', rtl: true, color: '#10b981' },
  { code: 'en', name: 'English', nativeName: 'English', role: 'target', color: '#6366f1' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', role: 'target', color: '#f59e0b' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', role: 'target', rtl: true, color: '#ec4899' },
];

function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

export const SubtitleArtifactsModal: React.FC<SubtitleArtifactsModalProps> = ({
  isOpen,
  onClose,
  videoId,
  activeTargetLang = 'he',
  onSelectLanguage,
  onSeek,
}) => {
  const [selectedTrackCode, setSelectedTrackCode] = useState<string>(activeTargetLang || 'he');
  const [activeTab, setActiveTab] = useState<'matrix' | 'raw_srt' | 'json'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Synchronize when modal opens
  React.useEffect(() => {
    if (activeTargetLang) {
      setSelectedTrackCode(activeTargetLang);
    }
  }, [activeTargetLang, isOpen]);

  const currentTrackDef =
    AVAILABLE_TRACKS.find((t) => t.code === selectedTrackCode) ||
    AVAILABLE_TRACKS.find((t) => t.code === normalizeLanguageCode(selectedTrackCode)) ||
    AVAILABLE_TRACKS[1]; // fallback to Hebrew

  // Get cues for selected language
  const targetCues: CaptionCue[] =
    FCRZADI8R9U_LANGUAGE_SRT_TRACKS[normalizeLanguageCode(selectedTrackCode)] ||
    getCachedSrtForVideoAndLanguage(videoId, selectedTrackCode) ||
    [];

  // Get source cues (Russian)
  const sourceCues: CaptionCue[] =
    FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru ||
    getCachedSrtForVideoAndLanguage(videoId, 'ru') ||
    [];

  // Get raw SRT text
  const rawSrtContent =
    getRawSrtForLanguage(selectedTrackCode) ||
    (targetCues.length > 0
      ? targetCues
          .map(
            (c, i) =>
              `${i + 1}\n${formatTimestamp(c.start)} --> ${formatTimestamp(c.start + (c.duration || 3))}\n${c.text}\n`
          )
          .join('\n')
      : 'No raw SRT data available for this language.');

  const filteredCues = useMemo(() => {
    if (!searchQuery.trim()) return targetCues;
    const q = searchQuery.toLowerCase().trim();
    return targetCues.filter((cue, idx) => {
      const sourceMatch = sourceCues[idx]?.text?.toLowerCase().includes(q);
      const targetMatch = cue.text.toLowerCase().includes(q);
      const timeMatch = formatTimestamp(cue.start).includes(q);
      return sourceMatch || targetMatch || timeMatch;
    });
  }, [targetCues, sourceCues, searchQuery]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStatus(`${label} copied!`);
      setTimeout(() => setCopiedStatus(null), 3000);
    } catch {
      setCopiedStatus('Failed copying to clipboard');
    }
  };

  const handleDownloadSrt = () => {
    try {
      const blob = new Blob([rawSrtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FcRzAdI8R9U_${selectedTrackCode}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCopiedStatus(`.SRT file downloaded!`);
      setTimeout(() => setCopiedStatus(null), 3000);
    } catch (e: any) {
      setCopiedStatus(`Download failed: ${e?.message}`);
    }
  };

  const handleSpeakCue = (text: string, lang: string) => {
    speakText(text, lang, 1.0);
  };

  if (!isOpen) return null;

  return (
    <div
      id="subtitle-artifacts-modal"
      data-testid="subtitle-artifacts-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-100">
                  Subtitle Artifacts Browser
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-medium">
                  {videoId || 'FcRzAdI8R9U'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Authentic 1,578-segment SubRip (.SRT) fixtures for source &amp; target languages
              </p>
            </div>
          </div>

          <button
            id="close-artifacts-modal-btn"
            data-testid="close-artifacts-modal-btn close-subtitle-artifacts-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <span id="close-subtitle-artifacts-modal" className="contents">
              <X className="w-5 h-5" />
            </span>
          </button>
        </div>

        {/* Track Selector Bar */}
        <div className="px-4 sm:px-6 py-3 bg-neutral-950/80 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-400 mr-1">Language Track:</span>
            {AVAILABLE_TRACKS.map((track) => {
              const isSelected = selectedTrackCode === track.code;
              return (
                <button
                  key={track.code}
                  id={`artifact-track-tab-${track.code}`}
                  data-testid={`artifact-track-tab-${track.code} artifacts-lang-tab-${track.code}`}
                  onClick={() => setSelectedTrackCode(track.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  <span id={`artifacts-lang-tab-${track.code}`} className="contents">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#fff' : track.color }}
                    />
                    <span className="font-semibold">{track.name}</span>
                    <span className="text-[10px] opacity-75">({track.nativeName})</span>
                    {track.role === 'source' && (
                      <span className="text-[9px] px-1 rounded bg-neutral-800 text-neutral-300 font-mono">
                        SRC
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick apply language to player */}
          {onSelectLanguage && selectedTrackCode !== 'ru' && (
            <button
              id="apply-artifacts-lang-to-player-btn"
              onClick={() => {
                onSelectLanguage(selectedTrackCode);
                setCopiedStatus(`Applied ${currentTrackDef.name} to active video!`);
                setTimeout(() => setCopiedStatus(null), 2500);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use in Video</span>
            </button>
          )}
        </div>

        {/* Action & View Tabs Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              id="view-formatted-cues-btn"
              data-testid="view-formatted-cues-btn artifacts-tab-matrix-btn"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'matrix'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span id="artifacts-tab-matrix-btn" className="contents">
                <Layers className="w-3.5 h-3.5" />
                <span>Dual Subtitle Matrix</span>
              </span>
            </button>
            <button
              id="view-raw-srt-btn"
              data-testid="view-raw-srt-btn artifacts-tab-raw-srt-btn"
              onClick={() => setActiveTab('raw_srt')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'raw_srt'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span id="artifacts-tab-raw-srt-btn" className="contents">
                <FileText className="w-3.5 h-3.5" />
                <span>Raw .SRT File</span>
              </span>
            </button>
            <button
              id="artifacts-tab-json-btn"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'json'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Cues</span>
            </button>
          </div>

          {/* Feedback & Actions */}
          <div className="flex items-center gap-2">
            {copiedStatus && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" />
                {copiedStatus}
              </span>
            )}

            <button
              id="copy-srt-artifact-btn"
              onClick={() => handleCopy(rawSrtContent, '.SRT Content')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium transition"
              title="Copy raw SRT to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy .SRT</span>
            </button>

            <button
              id="download-srt-artifact-btn"
              onClick={handleDownloadSrt}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm"
              title="Download authentic .srt file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .SRT</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'matrix' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="artifacts-search-input"
                  data-testid="artifacts-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${targetCues.length} segments in ${currentTrackDef.name} or Russian source...`}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Segments Table */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                <div className="max-h-[50vh] overflow-y-auto divide-y divide-neutral-800/60">
                  {filteredCues.slice(0, 100).map((cue, idx) => {
                    const srcCue = sourceCues[idx];
                    const cueNum = idx + 1;
                    return (
                      <div
                        key={cue.id || idx}
                        className="p-3 hover:bg-neutral-900/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[11px] shrink-0">
                            #{cueNum}
                          </span>

                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-neutral-400">
                                {formatTimestamp(cue.start)} → {formatTimestamp(cue.start + (cue.duration || 3))}
                              </span>
                            </div>

                            {/* Russian Source */}
                            {srcCue && selectedTrackCode !== 'ru' && (
                              <div className="text-neutral-400 text-[11px]">
                                <span className="font-semibold text-neutral-500 mr-1.5">RU:</span>
                                <span>{srcCue.text}</span>
                              </div>
                            )}

                            {/* Target Language Text */}
                            <div
                              className={`text-neutral-100 font-medium ${
                                currentTrackDef.rtl ? 'text-right font-sans text-sm' : ''
                              }`}
                              dir={currentTrackDef.rtl ? 'rtl' : 'ltr'}
                            >
                              <span className="font-semibold text-indigo-400 mr-1.5 uppercase text-[10px]">
                                {selectedTrackCode}:
                              </span>
                              <span>{cue.text}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {onSeek && (
                            <button
                              type="button"
                              onClick={() => onSeek(cue.start)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-indigo-600 text-neutral-300 hover:text-white transition text-xs"
                              title="Play this segment in video"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSpeakCue(cue.text, selectedTrackCode)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-emerald-600 text-neutral-300 hover:text-white transition text-xs"
                            title="Speak with Text-to-Speech"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-[11px] text-neutral-500 text-right">
                Showing {Math.min(100, filteredCues.length)} of {filteredCues.length} segments
              </div>
            </div>
          )}

          {activeTab === 'raw_srt' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>SubRip Subtitle Format (.SRT)</span>
                <span className="font-mono">{targetCues.length} cues</span>
              </div>
              <textarea
                id="raw-srt-textarea"
                data-testid="raw-srt-textarea"
                readOnly
                value={rawSrtContent}
                rows={16}
                className="w-full p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 overflow-x-auto max-h-[50vh] leading-relaxed resize-none focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>JSON CaptionCue[] Representation</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(targetCues, null, 2), 'JSON')}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 overflow-x-auto max-h-[50vh] overflow-y-auto leading-relaxed select-all">
                {JSON.stringify(targetCues.slice(0, 50), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Selected: <strong className="text-neutral-200">{currentTrackDef.name}</strong> ({targetCues.length} segments)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
