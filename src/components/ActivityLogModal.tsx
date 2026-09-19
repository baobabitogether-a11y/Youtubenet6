import React, { useState, useEffect, useMemo } from 'react';
import { logBuffer, LogEntry } from '../utils/logBuffer';
import {
  X,
  Copy,
  Check,
  Trash2,
  Filter,
  Terminal,
  Clock,
  ArrowDownCircle,
  ExternalLink,
} from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogModal({ isOpen, onClose }: ActivityLogModalProps) {
  const [entries, setEntries] = useState<LogEntry[]>(() => logBuffer.getEntries());
  const [copied, setCopied] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userComplaint, setUserComplaint] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEntries(logBuffer.getEntries());
    const unsubscribe = logBuffer.subscribe(() => {
      setEntries(logBuffer.getEntries());
    });
    return unsubscribe;
  }, [isOpen]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterLevel !== 'ALL' && e.level !== filterLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMsg = e.message.toLowerCase().includes(q);
        const matchCat = e.category.toLowerCase().includes(q);
        const matchUrl = e.url ? e.url.toLowerCase().includes(q) : false;
        return matchMsg || matchCat || matchUrl;
      }
      return true;
    });
  }, [entries, filterLevel, searchQuery]);

  if (!isOpen) return null;

  const handleCopyAll = async (complaintText?: string) => {
    const text = logBuffer.copyAll(complaintText !== undefined ? complaintText : userComplaint);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClear = () => {
    logBuffer.clear();
    setEntries([]);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'WARN':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'ERROR':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      case 'NETWORK':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
      case 'SUBTITLES':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
      case 'TTS':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case 'SYNC':
        return 'bg-teal-950/70 text-teal-300 border-teal-800/60';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div
      id="activity-logs-modal"
      role="dialog"
      aria-modal="true"
      data-testid="activity-logs-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
    >
      <div
        id="activity-log-modal"
        data-testid="activity-log-modal"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-200">
              <Terminal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="activity-log-modal-title"
                  className="text-base sm:text-lg font-semibold text-neutral-100"
                >
                  Application Activity &amp; Network Logs
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono">
                  {entries.length} records (Ring Buffer)
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Safe fixed-size log buffer tracking real-time network requests, HTTP traffic, and app events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-all-logs-btn"
              data-testid="copy-all-logs-btn copy-all-logs-button"
              onClick={handleCopyAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                copied
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
              }`}
              title="Copy entire log stream to clipboard"
            >
              <span id="copy-all-logs-button" className="contents">
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied ({entries.length})</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy All Logs</span>
                  </>
                )}
              </span>
            </button>

            <button
              id="clear-logs-button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700"
              title="Clear current log buffer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              id="close-logs-modal-btn"
              data-testid="close-logs-modal-btn close-activity-log-modal-button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700"
              title="Close log modal"
            >
              <span id="close-activity-log-modal-button" className="contents">
                <X className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar & Troubleshooting Prompt Generator */}
        <div className="px-4 sm:px-6 py-2 bg-neutral-950/80 border-b border-neutral-800/80 flex flex-col gap-2 text-xs">
          {/* Troubleshooting Complaint Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-400 shrink-0">
                User Complaint / Report:
              </span>
              <input
                id="user-complaint-input"
                data-testid="user-complaint-input"
                type="text"
                value={userComplaint}
                onChange={(e) => setUserComplaint(e.target.value)}
                placeholder="e.g. Duplicated TTS voices, subtitles desync, translation failed..."
                className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <button
              id="copy-troubleshooting-prompt-button"
              data-testid="copy-troubleshooting-prompt-button"
              onClick={() => handleCopyAll(userComplaint)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition border shadow-sm ${
                copied
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 hover:border-amber-500/60'
              }`}
              title="Copy complete markdown troubleshooting prompt including your complaint, app state, and all logs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Report!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Troubleshooting Prompt</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {['ALL', 'SUBTITLES', 'SYNC', 'TTS', 'NETWORK', 'WARN', 'ERROR'].map((lvl) => (
                <button
                  key={lvl}
                  id={`filter-btn-${lvl}`}
                  data-testid={`filter-btn-${lvl}`}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2.5 py-0.5 rounded-md transition-all font-mono text-[11px] ${
                    filterLevel === lvl
                      ? 'bg-neutral-700 text-white font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none focus:border-neutral-600 w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Logs List - Preserved Chronological Order */}
        <div
          id="logs-scroll-container"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 font-mono text-xs"
        >
          {filteredEntries.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-neutral-500 text-center">
              <Clock className="w-8 h-8 mb-2 opacity-40" />
              <p>No activity logs recorded yet.</p>
              <p className="text-[11px] text-neutral-600 mt-1">
                Events, network requests, and subtitle extractions will stream here.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const isExpanded = expandedId === entry.id;
              const hasExtra = !!(entry.details || entry.truncatedResponseBody || entry.url);

              return (
                <div
                  key={entry.id}
                  id={`log-entry-${index}`}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-neutral-500 shrink-0 text-[11px] select-none pt-0.5">
                        {entry.formattedTime}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${getLevelColor(
                          entry.level
                        )}`}
                      >
                        {entry.level}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 shrink-0">
                        {entry.category}
                      </span>
                      <span className="text-neutral-200 break-words flex-1 text-xs">
                        {entry.message}
                      </span>
                    </div>

                    {hasExtra && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="text-[11px] text-neutral-400 hover:text-neutral-200 underline shrink-0 px-1"
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-neutral-800/80 text-[11px] space-y-1.5 text-neutral-400 bg-neutral-900/50 p-2 rounded">
                      {entry.url && (
                        <div>
                          <span className="text-neutral-500">URL: </span>
                          <span className="text-neutral-300 break-all">{entry.url}</span>
                          {entry.status !== undefined && (
                            <span className="ml-2 text-neutral-400">
                              (status: {entry.status}, duration: {entry.duration ?? 0}ms)
                            </span>
                          )}
                        </div>
                      )}

                      {entry.details && (
                        <div>
                          <span className="text-neutral-500">Details: </span>
                          <pre className="text-neutral-300 whitespace-pre-wrap break-all mt-1 bg-neutral-950 p-1.5 rounded border border-neutral-800">
                            {typeof entry.details === 'string'
                              ? entry.details
                              : JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      {entry.truncatedResponseBody && (
                        <div>
                          <span className="text-neutral-500">Response Body (Truncated Safe View):</span>
                          <pre className="text-cyan-300 whitespace-pre-wrap break-all mt-1 bg-neutral-950 p-1.5 rounded border border-neutral-800">
                            {entry.truncatedResponseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500 bg-neutral-900">
          <div className="flex items-center gap-2">
            <span>Preserved Chronological Stream</span>
            <span>•</span>
            <span>Max {logBuffer.getEntries().length} / 120 buffer capacity</span>
          </div>
          <button
            onClick={handleCopyAll}
            className="text-neutral-300 hover:text-white flex items-center gap-1 font-medium"
          >
            <Copy className="w-3 h-3" />
            <span>Copy All ({entries.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
