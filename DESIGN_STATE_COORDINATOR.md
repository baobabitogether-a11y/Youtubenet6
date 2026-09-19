# Application State Coordinator & State Machine (DESIGN_STATE_COORDINATOR.md)

This document specifies the abstract application state machine and data coordinator. It governs how media playback, subtitle data acquisition, language selection, and user interactions synchronize without coupling views to business logic.

---

## 1. Architectural Purpose

Views in this application are strictly pure: they receive data as props and emit intent callbacks. The **State Coordinator** is the central orchestrator that:
1. Coordinates player lifecycle and subtitle providers.
2. Synchronizes high-frequency playback timestamps with active subtitle cues.
3. Manages language track transitions and fallback logic.
4. Provides deterministic error handling and recovery.

---

## 2. Finite State Machine (FSM)

```text
               ┌───────────────────────┐
               ▼                       │ (LOAD_MEDIA)
        [ UNINITIALIZED ]              │
               │ (INIT)                │
               ▼                       │
            [ IDLE ] ──────────────────┤
               │ (LOAD_MEDIA)          │
               ▼                       │
       [ LOADING_MEDIA ] ──────────────┤
               │ (MEDIA_READY)         │
               ▼                       │
    [ ACQUIRING_SUBTITLES ] ───────────┤
         │                │ (FAIL)     │
         │ (LOADED)       ▼            │
         │         [ SUBTITLES_NONE ] ─┤
         ▼                │            │
       [ READY ] ◄────────┘            │
         │     ▲                       │
 (PLAY)  │     │ (PAUSE)               │
         ▼     │                       │
      [ PLAYING ] ─────────────────────┤
               │ (ERROR)               ▼
               └────────────────► [ ERROR ]
```

### State Definitions
- `UNINITIALIZED`: Application container booting, evaluating URL parameters and local storage.
- `IDLE`: Ready to accept user input (pasted URL, library selection, or initial default video).
- `LOADING_MEDIA`: Player backend is mounting and loading the requested media ID.
- `ACQUIRING_SUBTITLES`: Subtitle provider is resolving tracks (from `LIBRARY.md` fixtures on web, or network timedtext on Android).
- `READY`: Media and subtitles are synchronized; video is cued at `startTime` or 0s.
- `PLAYING`: Media is actively advancing; coordinator continuously computes `activeCue`.
- `PAUSED`: Media is paused; active cue remains static.
- `SUBTITLES_NONE`: Video is playable, but no subtitles were found for the chosen language track.
- `ERROR`: Recoverable or non-recoverable error encountered (e.g. invalid URL, network drop).

---

## 3. Active Cue Synchronization Algorithm

During `PLAYING` state, the player backend emits `currentTime` at high frequency (100ms - 250ms). The coordinator executes the following pure matching algorithm:

```ts
/**
 * Resolves the active subtitle cue for a given timestamp.
 * 
 * @param cues Sorted list of normalized subtitle cues
 * @param currentTime Current playback time in seconds
 * @param tolerance Optional boundary tolerance in seconds (default: 0.05s)
 * @returns Active SubtitleCue, or null if within a silence interval
 */
export function resolveActiveCue(
  cues: SubtitleCue[],
  currentTime: number,
  tolerance = 0.05
): SubtitleCue | null {
  if (!cues || cues.length === 0) return null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const end = cue.start + cue.duration;
    
    // Check if current time falls within [start - tolerance, end + tolerance]
    if (currentTime >= (cue.start - tolerance) && currentTime < (end + tolerance)) {
      return cue;
    }
    
    // Binary search optimization can be applied if cue list is extensive (> 1,000 items)
    if (cue.start > currentTime + tolerance) {
      break;
    }
  }

  return null;
}
```

---

## 4. Normalized Coordinator State Interface

Any state management solution (Redux, Zustand, XState, or React Context) must expose this standardized state shape to the view layer:

```ts
export interface AppCoordinatorState {
  // Playback Context
  videoId: string;
  playbackStatus: 'unstarted' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';
  currentTime: number;
  duration: number;
  playbackRate: number;
  
  // Subtitle Context
  cues: SubtitleCue[];
  activeCue: SubtitleCue | null;
  captionsEnabled: boolean;
  
  // Language & Translation Context
  selectedLanguage: string;         // e.g. "he", "it", "en"
  availableLanguages: LanguageOption[];
  translatedCues: Record<string, string>;
  isTranslating: boolean;
  
  // Presentation Context
  theaterMode: boolean;
  compactMode: boolean;
}
```

---

## 5. View Independence Guarantee

If the state management layer is migrated from Redux to Zustand or React Context:
1. Re-implement the state machine transitions and `resolveActiveCue` algorithm.
2. Bind state selectors to the pure view props.
3. Views require zero changes because they only depend on incoming props.
