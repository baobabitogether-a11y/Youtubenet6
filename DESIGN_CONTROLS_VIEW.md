# Playback Controls View — Replaceable Rendering Contract (DESIGN_CONTROLS_VIEW.md)

This document specifies the interface and architectural contract for any view rendering media playback controls (play/pause buttons, seekbar, timestamp indicators, playback rate selectors, and caption toggles).

---

## 1. Architectural Purpose

A playback controls component is a **pure presentation view**. It does not call player APIs directly, does not calculate time increments, and does not store playback state.

```text
[ State Coordinator / Player Provider ]
                 │
                 ▼ (Injects playback metrics)
[ Playback Controls View ] (Pure UI Presentation)
                 │
                 ▼ (Emits user intent)
         onTogglePlay() / onSeek(time) / onRateChange(rate)
```

---

## 2. Injected Controls Data Specification

Any playback controls view receives its state strictly via dependency injection:

```ts
export interface PlaybackControlsProps {
  // Playback Metrics
  isPlaying: boolean;
  currentTime: number;          // Current position in fractional seconds
  duration: number;             // Total duration in fractional seconds
  playbackRate: number;         // e.g. 0.75, 1.0, 1.25, 1.5, 2.0
  availableRates?: number[];    // Supported speed options (default: [0.5, 0.75, 1, 1.25, 1.5, 2])
  
  // Toggles
  captionsEnabled: boolean;
  theaterMode?: boolean;
  isBuffering?: boolean;
  disabled?: boolean;
  
  // User Action Callbacks
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onRateChange: (rate: number) => void;
  onToggleCaptions: () => void;
  onToggleTheater?: () => void;
}
```

---

## 3. View Responsibilities: What It Does vs. What It Does NOT Do

### The Controls View IS Responsible For:
1. **Rendering Current Progress**: Displaying elapsed time and total duration formatted as `MM:SS` (or `HH:MM:SS`).
2. **Interactive Seekbar**: Visualizing current playback progress ($(\text{currentTime} / \text{duration}) \times 100\%$) and responding to scrub/click interactions by calling `onSeek(seconds)`.
3. **Play/Pause Toggle**: Displaying appropriate play/pause iconography matching `isPlaying`.
4. **Playback Rate Selector**: Presenting speed options and calling `onRateChange(rate)`.
5. **Captions Indicator**: Reflecting `captionsEnabled` visual active/inactive state and triggering `onToggleCaptions()`.

### The Controls View IS NOT Responsible For:
- Communicating with the video element or YouTube player instance.
- Incrementing `currentTime` internally (time updates arrive exclusively from the coordinator).
- Deciding whether a video can be played or paused.
- Loading subtitle tracks or toggling tracks directly.

---

## 4. Multi-Form Interchangeability

The same controller props can drive completely different UI layouts:
1. **Floating Hover Bar**: A glassmorphic bar overlaid along the bottom edge of the video player, fading out during mouse inactivity.
2. **Dedicated Control Ribbon**: A persistent controls bar docked directly beneath the video viewport with expanded speed buttons.
3. **Touch-First Mobile Controls**: Large 44px+ touch targets with quick $\pm 10$s rewind/fast-forward buttons.

---

## 5. Testing Contract

- **Time Formatting**: Verify that `currentTime=65` renders as `"01:05"`.
- **Seek Dispatch**: Simulate a seekbar interaction at 50% on a 120s video; verify `onSeek(60)` is dispatched.
- **Toggle Dispatch**: Click play/pause button and verify `onTogglePlay` is invoked.
- **Speed Selector**: Change speed dropdown to `1.5` and verify `onRateChange(1.5)` is called.
