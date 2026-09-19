# DEPRECATED.md — Historical & Deprecated Architectures

This document archives subsystems, design patterns, and experimental sandboxes that have been deprecated or removed from active development, as directed in the project evolution guidelines.

---

## 1. Mini Demo Sandbox Pattern (`/demo/`) — DEPRECATED & REMOVED

### Historical Role
In earlier iterations, an isolated `/demo/` directory (`demo/index.html`, `demo/mini-demo.ts`, `demo/hebrewCues.ts`) was maintained as a zero-dependency sandbox for testing YouTube IFrame API time-synchronization with Hebrew subtitles (`he.srt`).

### Deprecation Rationale
- The directory introduced maintenance duplication with the main application and diverged from the unified multi-lingual SRT architecture.
- Per developer directive, the `/demo/` directory has been removed from the repository. All interactive testing, presentation, and verification workflows now run directly on the **Web Companion Demo (Landing Page)** using authentic multi-lingual `.srt` fixtures (`ru.srt`, `he.srt`, `it.srt`, `en.srt`, `ar.srt`).

---

## 2. TTS Queue Architecture & TTS Queue Debugger (`TTSQueueDebugger`) — DEPRECATED

### Historical Role
Previous versions attempted to manage Text-to-Speech playback via an asynchronous queue system (`TTSQueueDebugger`, `TTSInputTextsView` queue feed, repeat counters, and buffered speech items docked beneath the video player).

### Deprecation Rationale
- Asynchronous speech queuing introduced latency, state desynchronization, and queue overflows during rapid user seeking or cue transitions.
- **Architectural Directive ("Don't use queue, you have SRT subtitles")**: All speech flow is now executed **directly from authentic SRT subtitle cues**. 
- The application binds directly to the structured `CaptionCue` array parsed from authentic `.srt` tracks:
  - Video plays the exact SRT cue time interval (`cue.start` to `cue.start + cue.duration`).
  - At cue completion, video pauses and TTS speaks the active cue's target SRT translation directly via `speakText()`.
  - Word-boundary highlights (`HighlightableText.tsx`) track speech progress in real time without intermediary queuing or queue debuggers.

---

## 3. Naive Cue-Start Video Pausing in VideoPlayer — DEPRECATED

### Historical Role
Earlier builds featured an ad-hoc `useEffect` in `VideoPlayer.tsx` that intercepted `activeCue` changes during video playback and immediately paused YouTube video at the start of a cue to trigger speech synthesis.

### Deprecation Rationale
- Pausing at `cue.start` prevented the user from hearing the authentic speaker's dialogue in the video, defeating the purpose of dual-language immersion.
- Superseded by the unified **Sentence-by-Sentence Speech Flow** in `useSyncEngine`:
  1. Play YouTube dialogue for the full cue duration first (`cue.start` to `cue.start + cue.duration`).
  2. Pause YouTube playback automatically at cue completion.
  3. Synthesize target language translation with synchronized word-boundary highlight.
  4. Advance and resume YouTube playback at the next cue.
