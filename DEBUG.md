# Diagnostic Log Viewer & Network Debugging Specification (DEBUG.md)

This document provides a comprehensive, implementation-agnostic specification for constructing the **Diagnostic Log Viewer**, **Network Inspector**, and **Ring Buffer Engine**. It defines what data to capture, how to format logs, and specifically how to handle network requests with response bodies truncated to 15-character previews for high-density tabular diagnostics.

Following this specification allows any developer or AI coding agent to completely re-create or swap the log viewer and diagnostic components across any framework (React, Vue, Svelte, Web Components, or native Android UI) without regressions.

---

## 1. Architectural Purpose & Separation of Concerns

The debugging system follows the same pure component philosophy as the rest of the application:

```text
[ Global Network & Error Interceptors ] (fetch / XHR / window errors)
                   │
                   ▼
      [ Ring Buffer Engine (logBuffer) ] (Fixed capacity FIFO, safe truncation)
                   │
                   ▼ (Subscribes / Injected State)
   [ Diagnostic Log Viewer / Modal View ] (Pure Presentation UI)
                   │
                   ├──► Renders Categorized Chronological Logs & Network Table
                   └──► Emits 1-Click Clipboard Troubleshooting Prompt
```

### Core Design Rules
1. **Never Interfere with Production Streams**: Intercepting network requests (via `fetch` or `XMLHttpRequest`) must clone response streams safely. Interception must never exhaust the response body or break the user-facing media/captions.
2. **Fixed-Size Ring Buffer (FIFO)**: Log history is bounded (e.g. 500 entries max). When full, the oldest entry is dropped to prevent memory leaks during long playback sessions.
3. **15-Character Response Preview (`responseBodyPreview15`)**: Network response previews are strictly truncated to 15 cleaned characters for compact, high-visibility tabular scanning.
4. **1-Click AI Troubleshooting Prompt**: The viewer formats user complaints, live application state snapshots, network activity tables, and chronological logs into a markdown report ready to paste to an AI developer.

---

## 2. Injected Log Data & Network Specification

### 2.1 Log Entry Contract (`LogEntry`)

```ts
export type LogLevel =
  | 'INFO'
  | 'SUCCESS'
  | 'WARN'
  | 'ERROR'
  | 'NETWORK'
  | 'SUBTITLES'
  | 'TTS'
  | 'SYNC';

export interface LogEntry {
  id: string;                      // Unique ID (e.g. "log-1710000000000-abcd")
  timestamp: number;               // Epoch millisecond timestamp
  formattedTime: string;           // "HH:MM:SS.mmm" format
  level: LogLevel;                 // Severity / subsystem level
  category: string;                // Subsystem tag (e.g. "Network", "timedtext_interception", "Subtitles")
  message: string;                 // Human-readable summary message
  details?: any;                   // Structured object, stack trace, or parameters
  url?: string;                    // Target URL (for network requests)
  status?: number;                 // HTTP status code (e.g. 200, 404)
  duration?: number;               // Latency in milliseconds
  truncatedResponseBody?: string;  // Safe 500-char truncated response body string
  responseBodyPreview15?: string;  // Exactly 15-char clean response preview
}
```

### 2.2 Network Request Record (`NetworkRequestRecord`)

```ts
export interface NetworkRequestRecord {
  id: string;
  url: string;
  method: string;                  // GET, POST, etc.
  type: 'fetch' | 'xhr' | 'timedtext_interception' | 'translation_api';
  status?: number;
  statusText?: string;
  isPending: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
  duration?: number;
  timestamp: number;
}
```

---

## 3. The 15-Character Response Body Truncation Specification

When rendering diagnostic logs and network tables, displaying raw response bodies (such as large XML or JSON timedtext payloads) causes UI freezing, excessive DOM weight, and layout distortion.

To solve this, the engine applies a **two-tier response truncation strategy**:

### Tier 1: High-Density 15-Character Preview (`responseBodyPreview15`)
For fast tabular scanning (in the network activity table and log summaries):
- Clean the response string by collapsing whitespace, carriage returns, and newlines (`[\r\n\t]+`) into single spaces.
- Trim leading and trailing whitespace.
- Extract **exactly the first 15 characters**:
  $$\text{preview} = \text{cleanString}.\text{substring}(0, 15)$$
- Examples:
  - Raw JSON: `{"wireMagic":"pb3","events":[...]}` $\to$ `{"wireMagic":"p` (15 chars)
  - Raw XML: `<?xml version="1.0" encoding="utf-8"?>` $\to$ `<?xml version="` (15 chars)
  - Raw SRT: `1\n00:00:01,420 --> 00:00:04,260\nHello` $\to$ `1 00:00:01,420` (15 chars)

### Tier 2: Safe Expanded View (`truncatedResponseBody`)
When the user expands an entry ("Details" view):
- Truncate at 500 characters:
  $$\text{safeString} = \text{str}.\text{length} \le 500 \ ? \ \text{str} \ : \ \text{str}.\text{substring}(0, 500) + \text{"... [truncated]"}$$

```ts
export function extractBodyPreview15(body: any): string | undefined {
  if (body === undefined || body === null) return undefined;
  try {
    const str = typeof body === 'string' ? body : JSON.stringify(body);
    const clean = str.replace(/[\r\n\t]+/g, ' ').trim();
    return clean.substring(0, 15);
  } catch {
    return undefined;
  }
}
```

---

## 4. Ring Buffer Logging Engine (`LogRingBuffer`)

The logging engine maintains entries in memory with guaranteed upper bounds:

```ts
export const MAX_LOG_ENTRIES = 500;
export const MAX_RESPONSE_BODY_LOG_CHARS = 500;

export class LogRingBuffer {
  private buffer: LogEntry[] = [];
  private subscribers: Set<() => void> = new Set();
  private appStateProvider: (() => any) | null = null;

  public add(entry: {
    level: LogLevel;
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
      responseBodyPreview15: extractBodyPreview15(entry.responseBody),
      url: entry.url,
      status: entry.status,
      duration: entry.duration,
    };

    this.buffer.push(newEntry);
    if (this.buffer.length > MAX_LOG_ENTRIES) {
      this.buffer.shift(); // FIFO eviction
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

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}
```

---

## 5. Network Interception Architecture

The global network interceptor patches `window.fetch` and `XMLHttpRequest` safely:

1. **Safe Body Cloning**:
   ```ts
   const cloned = response.clone();
   const text = await cloned.text();
   let parsedBody: any;
   try { parsedBody = JSON.parse(text); } catch { parsedBody = text; }
   ```
2. **Category Classification**:
   - `timedtext_interception`: URLs containing `timedtext` (YouTube timed-text requests).
   - `translation_api`: URLs containing `translate` or `/api/youtube-timedtext-translate`.
   - `fetch` / `xhr`: General network operations.
3. **HTTP Status Tracking**:
   - On $200 \le \text{status} < 400$: logs `NETWORK` level with duration and 15-char preview.
   - On $\text{status} \ge 400$ or network failure: dispatches both `NETWORK` log and `addError` to the error inspector.
4. **Benign Log Filtering**:
   - Filter Vite development websocket connection retries (`[vite] failed to connect to websocket`) to prevent noisy error flooding.

---

## 6. Constructing the Log Viewer UI Component

Any implementation of the **Activity Log Viewer** modal or drawer must include these structural regions:

```text
┌────────────────────────────────────────────────────────────────────────┐
│  [Terminal Icon] Application Activity & Network Logs  [500 records]   │ [Copy All] [Clear] [X]
├────────────────────────────────────────────────────────────────────────┤
│  User Complaint: [ e.g. Subtitles desync, TTS doubled... ]            │ [Copy AI Prompt]
├────────────────────────────────────────────────────────────────────────┤
│  Filters: [ALL] [SUBTITLES] [SYNC] [TTS] [NETWORK] [WARN] [ERROR]    │ Search: [______]
├────────────────────────────────────────────────────────────────────────┤
│  Timestamp | Level   | Category | Message                              │
│  ────────────────────────────────────────────────────────────────────  │
│  20:58:01  | NETWORK | timedtext| GET .../timedtext completed (200)    │ [Details]
│  20:58:02  | SYNC    | SyncEng  | Cue #4 activated (start: 12.4s)      │
│  20:58:03  | TTS     | Voice    | Spoken utterance matched cue #4      │
└────────────────────────────────────────────────────────────────────────┘
```

### Required Interactive Controls:
1. **Severity Filter Tabs**: Filter entries by `ALL`, `SUBTITLES`, `SYNC`, `TTS`, `NETWORK`, `WARN`, `ERROR`.
2. **Live Search Box**: Performs case-insensitive matching across `message`, `category`, and `url`.
3. **Complaint Text Box**: Allows entering what went wrong to inject directly into the AI prompt.
4. **1-Click Copy All Button**: Copies the entire structured diagnostic report to the clipboard.
5. **Collapsible Details**: Clicking "Details" expands `url`, `duration`, `status`, `details`, and the safe truncated response body.

---

## 7. Automated Troubleshooting Prompt Generator Specification

When the user clicks **"Copy Troubleshooting Prompt"**, the log buffer formats all diagnostic telemetry into a Markdown document:

```markdown
# Bug Report & Troubleshooting Prompt for AI Developer

## User Complaint / Reported Issue
> [User's complaint or request]

## Diagnostic Metadata
- **Report Timestamp**: 2026-09-18T21:01:26.000Z
- **Current URL**: http://localhost:3000/...
- **User Agent**: Mozilla/5.0 ...
- **Recorded Log Count**: 42 events (Ring Buffer, max 500)

## 1. Live Application State Snapshot
\`\`\`json
{
  "videoId": "FcRzAdI8R9U",
  "playbackStatus": "playing",
  "currentTime": 14.285,
  "activeCueId": "cue-4",
  "selectedLanguage": "he"
}
\`\`\`

## 2. Network Activity & TimedText Requests (3 requests)
| Time | Category | Status | Duration | Response (15 chars) | URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 20:58:01.120 | timedtext_interception | 200 | 85ms | `{"wireMagic":"p` | `https://www.youtube.com/api/timedtext?...` |

## 3. Chronological Event & Network Logs (42 records)
\`\`\`log
[20:58:01.120] [NETWORK] [timedtext_interception] GET .../timedtext completed (200) | body_preview(X=15 chars): "{"wireMagic":"p"
[20:58:01.200] [SUBTITLES] [Subtitles] Parsed 38 subtitle cues from JSON3 track
[20:58:02.100] [SYNC] [SyncEngine] Cue #1 active: "Hello and welcome"
\`\`\`

## 4. Instructions for Troubleshooting
Please analyze the live application state, network requests, and chronological logs above to:
1. Identify the root cause of the reported issue.
2. Verify if spoken TTS matched on-screen subtitles.
3. Implement a surgical fix conforming to `AGENTS.md`.
```

---

## 8. View Replacement & Reconstruction Guide

If `ActivityLogModal.tsx` or `NetworkInspectorModal.tsx` are deleted:
1. Construct a component subscribing to `logBuffer.subscribe()` and reading `logBuffer.getEntries()`.
2. Map entries to a chronological list, highlighting levels with standard colors:
   - `NETWORK`: Cyan
   - `SUBTITLES`: Indigo
   - `TTS`: Purple
   - `SYNC`: Teal
   - `ERROR`: Rose / Red
   - `WARN`: Amber / Yellow
   - `SUCCESS`: Emerald / Green
3. For network entries, display `entry.responseBodyPreview15` in the table row.
4. Bind the copy button to `logBuffer.copyAll(userComplaint)`.
5. No backend or database changes are required—the ring buffer operates purely in-memory.
