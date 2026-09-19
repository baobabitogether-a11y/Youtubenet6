# Media Player Provider — Abstract Playback Contract (DESIGN_PLAYER_PROVIDER.md)

This document specifies the abstract media playback contract. It decouples video playback logic from any specific vendor SDK (such as YouTube IFrame API, HTML5 `<video>`, Vimeo, Video.js, or native Android ExoPlayer), allowing any media player backend to drive the subtitle learning platform.

---

## 1. Architectural Purpose

The application requires time-synchronized subtitles. However, subtitle renderers must never communicate directly with the underlying video player or embed vendor-specific player code.

```text
[ Media Player Backend ] (YouTube IFrame / HTML5 Video / ExoPlayer)
          │
          ▼ (Dispatches standardized playback events)
[ Player Coordinator ]   (Maintains normalized playback state)
          │
          ▼ (Injects currentTime & activeCueId)
[ Subtitle Views ]       (Pure presentation)
```

By adhering to this contract, the entire video player implementation can be swapped without touching subtitle rendering, language selection, or translation logic.

---

## 2. Media Player Interface Specification

Any media player implementation must satisfy the `MediaPlayerController` interface:

```ts
export type PlaybackStatus = 'unstarted' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';

export interface MediaSource {
  id: string;              // Standard media identifier (e.g. YouTube Video ID "FcRzAdI8R9U")
  url?: string;            // Optional direct or web stream URL
  startTime?: number;      // Initial seek position in seconds
}

export interface PlayerCapabilities {
  canControlPlaybackRate: boolean;
  canControlVolume: boolean;
  supportsCaptionsNative: boolean;
}

/**
 * Commands dispatched to the player backend.
 */
export interface MediaPlayerController {
  load(source: MediaSource): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seekTo(seconds: number): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void; // 0 to 100
  getDuration(): number;
  getCurrentTime(): number;
  destroy(): void;
}

/**
 * Standard event listeners emitted by the player backend to the coordinator.
 */
export interface MediaPlayerEvents {
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onStatusChange?: (status: PlaybackStatus) => void;
  onDurationChange?: (duration: number) => void;
  onRateChange?: (rate: number) => void;
  onError?: (error: { code: string | number; message: string }) => void;
}
```

---

## 3. High-Frequency Time Update Specification

To support smooth subtitle highlighting and word-boundary synchronizations:
1. **Frequency**: The player backend should emit `onTimeUpdate` at least **4 to 10 times per second** (every 100ms - 250ms) during active playback.
2. **Precision**: `currentTime` must be provided as a non-negative floating-point number in seconds (e.g., `14.285`).
3. **No Direct DOM Manipulation**: The player backend never manipulates subtitle elements directly. It only reports current time to the state coordinator.

---

## 4. Drop-in Backend Implementations

### 4.1 YouTube IFrame API (Current Web Implementation)
- Injects `https://www.youtube.com/iframe_api`.
- Encapsulates `YT.Player`.
- Converts `YT.PlayerState` (`1` → `'playing'`, `2` → `'paused'`, `3` → `'buffering'`) to standard `PlaybackStatus`.
- Polls `player.getCurrentTime()` via `requestAnimationFrame` or `setInterval` (100ms) to emit `onTimeUpdate`.

### 4.2 Standard HTML5 `<video>`
- Binds to `<video src="..." />`.
- Listens to native `timeupdate`, `play`, `pause`, `waiting`, and `error` events.
- Emits standard `MediaPlayerEvents`.

### 4.3 Native Android Shell (`android-shell/`)
- Intercepts playback state within the Android WebView or ExoPlayer bridge.
- Posts time updates across the JavaScript interface (`window.AndroidBridge.postMessage`).

---

## 5. View Independence Guarantee

If the YouTube player component is completely deleted:
1. Create any component implementing `MediaPlayerController`.
2. Bind the player's time updates to the application state coordinator (`onTimeUpdate`).
3. Subtitle views will immediately highlight, scroll, and translate without modifying a single line of subtitle code.
