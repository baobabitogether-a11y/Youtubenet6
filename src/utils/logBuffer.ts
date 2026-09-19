/**
 * Ring Buffer Logging Engine
 * Step 1.1 Safe Logging: Fixed-size ring buffer with guaranteed access and
 * response body truncation strictly within log entries to preserve app payload data.
 */

export interface LogEntry {
  id: string;
  timestamp: number;
  formattedTime: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'NETWORK' | 'SUBTITLES' | 'TTS' | 'SYNC';
  category: string;
  message: string;
  details?: any;
  truncatedResponseBody?: string;
  responseBodyPreview15?: string;
  url?: string;
  status?: number;
  duration?: number;
}

export const MAX_LOG_ENTRIES = 500;
export const MAX_RESPONSE_BODY_LOG_CHARS = 500;

export type AppStateProvider = () => any;

class LogRingBuffer {
  private buffer: LogEntry[] = [];
  private subscribers: Set<() => void> = new Set();
  private appStateProvider: AppStateProvider | null = null;

  public registerAppStateProvider(provider: AppStateProvider): void {
    this.appStateProvider = provider;
  }

  public formatTime(ts: number = Date.now()): string {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  /**
   * Truncates response body strictly for logging display to prevent memory/resource draining.
   * Original application payloads are kept intact.
   */
  public truncateBody(body: any, maxChars: number = MAX_RESPONSE_BODY_LOG_CHARS): string | undefined {
    if (body === undefined || body === null) return undefined;
    try {
      let str = typeof body === 'string' ? body : JSON.stringify(body);
      if (str.length <= maxChars) {
        return str;
      }
      return `${str.substring(0, maxChars)}... [truncated ${str.length - maxChars} chars]`;
    } catch {
      return '[Unstringifiable Body]';
    }
  }

  /**
   * Extracts exactly X=15 characters of response body preview for high-visibility log diagnostics
   */
  public extractBodyPreview15(body: any): string | undefined {
    if (body === undefined || body === null) return undefined;
    try {
      let str = typeof body === 'string' ? body : JSON.stringify(body);
      const clean = str.replace(/[\r\n\t]+/g, ' ').trim();
      return clean.substring(0, 15);
    } catch {
      return undefined;
    }
  }

  public add(entry: {
    level: LogEntry['level'];
    category: string;
    message: string;
    details?: any;
    responseBody?: any;
    url?: string;
    status?: number;
    duration?: number;
  }): LogEntry {
    const now = Date.now();
    const newEntry: LogEntry = {
      id: `log-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      formattedTime: this.formatTime(now),
      level: entry.level,
      category: entry.category,
      message: entry.message,
      details: entry.details,
      truncatedResponseBody: this.truncateBody(entry.responseBody),
      responseBodyPreview15: this.extractBodyPreview15(entry.responseBody),
      url: entry.url,
      status: entry.status,
      duration: entry.duration,
    };

    this.buffer.push(newEntry);
    if (this.buffer.length > MAX_LOG_ENTRIES) {
      this.buffer.shift();
    }

    this.notify();
    return newEntry;
  }

  public getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  public clear(): void {
    this.buffer = [];
    this.notify();
  }

  /**
   * Formats all log entries, live state, and user complaint into a comprehensive troubleshooting prompt
   */
  public generateTroubleshootingPrompt(userComplaint?: string): string {
    const lines: string[] = [];

    lines.push('# Bug Report & Troubleshooting Prompt for AI Developer');
    lines.push('');
    lines.push('## User Complaint / Reported Issue');
    lines.push(
      userComplaint && userComplaint.trim()
        ? `> ${userComplaint.trim()}`
        : '> [No specific complaint text entered — complete runtime diagnostic state requested]'
    );
    lines.push('');
    lines.push('## Diagnostic Metadata');
    lines.push(`- **Report Timestamp**: ${new Date().toISOString()} (${this.formatTime()})`);
    lines.push(`- **Current URL**: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`);
    lines.push(`- **User Agent**: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`);
    lines.push(`- **Recorded Log Count**: ${this.buffer.length} events (Ring Buffer, max 500)`);
    lines.push('');

    // Live App State Snapshot
    lines.push('## 1. Live Application State Snapshot');
    if (this.appStateProvider) {
      try {
        const rawState = this.appStateProvider();
        lines.push('```json');
        lines.push(typeof rawState === 'string' ? rawState : JSON.stringify(rawState, null, 2));
        lines.push('```');
      } catch (err) {
        lines.push(`[State Provider Evaluation Error: ${err}]`);
      }
    } else {
      lines.push('[State provider not registered]');
    }
    lines.push('');

    // Network Activity Table
    const networkLogs = this.buffer.filter((e) => e.level === 'NETWORK' || !!e.url);
    lines.push(`## 2. Network Activity & TimedText Requests (${networkLogs.length} requests)`);
    if (networkLogs.length === 0) {
      lines.push('*No external network requests recorded (using offline/demo fixtures).*');
    } else {
      lines.push('| Time | Category | Status | Duration | Response (15 chars) | URL |');
      lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
      networkLogs.forEach((n) => {
        const preview = n.responseBodyPreview15 ? `\`${n.responseBodyPreview15}\`` : '-';
        const statusStr = n.status !== undefined ? String(n.status) : 'pending';
        const durStr = n.duration !== undefined ? `${n.duration}ms` : '-';
        lines.push(`| ${n.formattedTime} | ${n.category} | ${statusStr} | ${durStr} | ${preview} | \`${n.url || n.message}\` |`);
      });
    }
    lines.push('');

    // Chronological Logs
    lines.push(`## 3. Chronological Event & Network Logs (${this.buffer.length} records)`);
    lines.push('```log');
    if (this.buffer.length === 0) {
      lines.push(`[${this.formatTime()}] [INFO] [System] Log buffer is currently empty.`);
    } else {
      this.buffer.forEach((entry) => {
        let line = `[${entry.formattedTime}] [${entry.level}] [${entry.category}] ${entry.message}`;
        if (entry.url) {
          line += ` | URL: ${entry.url} (status=${entry.status ?? 'pending'}${entry.duration !== undefined ? `, ${entry.duration}ms` : ''})`;
        }
        if (entry.responseBodyPreview15 !== undefined) {
          line += ` | body_preview(X=15 chars): "${entry.responseBodyPreview15}"`;
        }
        if (entry.details) {
          try {
            line += ` | Details: ${typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)}`;
          } catch {}
        }
        if (entry.truncatedResponseBody && !entry.responseBodyPreview15) {
          line += ` | Response: ${entry.truncatedResponseBody}`;
        }
        lines.push(line);
      });
    }
    lines.push('```');
    lines.push('');

    // Developer Troubleshooting Instructions
    lines.push('## 4. Instructions for Troubleshooting');
    lines.push('Please analyze the live application state, network requests, and chronological logs above to:');
    lines.push('1. Identify the root cause of the reported user complaint or state abnormality.');
    lines.push('2. Verify if spoken TTS matched the presented on-screen subtitles.');
    lines.push('3. Check for any redundant network calls or failed caption fetches.');
    lines.push('4. Implement a precise surgical fix in accordance with `AGENTS.md` guidelines.');

    return lines.join('\n');
  }

  /**
   * Formats all log entries and complete application state into a single cohesive string for 1-click clipboard copy
   */
  public copyAll(userComplaint?: string): string {
    return this.generateTroubleshootingPrompt(userComplaint);
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }
}

export const logBuffer = new LogRingBuffer();

// Convenient shorthand loggers
export const logInfo = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: 'INFO', category, message, details });

export const logSuccess = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: 'SUCCESS', category, message, details });

export const logWarn = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: 'WARN', category, message, details });

export const logError = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: 'ERROR', category, message, details });

export const logNetwork = (entry: {
  category?: string;
  url: string;
  method?: string;
  status?: number;
  duration?: number;
  responseBody?: any;
  message: string;
}) =>
  logBuffer.add({
    level: 'NETWORK',
    category: entry.category || 'Network',
    message: entry.message,
    url: entry.url,
    status: entry.status,
    duration: entry.duration,
    responseBody: entry.responseBody,
  });

export const logSubtitles = (message: string, details?: any, responseBody?: any) =>
  logBuffer.add({ level: 'SUBTITLES', category: 'Subtitles', message, details, responseBody });

export const logTTS = (message: string, details?: any) =>
  logBuffer.add({ level: 'TTS', category: 'TTS', message, details });

export const logSync = (message: string, details?: any) =>
  logBuffer.add({ level: 'SYNC', category: 'SyncEngine', message, details });

export const registerAppStateProvider = (provider: AppStateProvider) =>
  logBuffer.registerAppStateProvider(provider);
