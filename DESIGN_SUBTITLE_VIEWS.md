# Subtitle Views — Replaceable Rendering Contract (DESIGN_SUBTITLE_VIEWS.md)

This document specifies the interface and architectural contract for any view that presents subtitle cues. It is intentionally independent of framework (React, Vue, Svelte, Web Components), platform (Browser, Android, iOS), and subtitle origin (SRT, JSON3, live network, or fixture).

---

## 1. Architectural Purpose

The subtitle renderer is a **pure presentation component**. It does not discover, acquire, fetch, or parse subtitles. Instead, it sits at the end of a unidirectional data pipeline:

```text
[ Subtitle Provider ]  (e.g., Fixture Loader / Android Network Interceptor)
        │
        ▼
[ Normalized Cue Data ] (Array of SubtitleCue objects)
        │
        ▼
[ Subtitle Renderer ]   (Pure View Component)
        │
        ▼
[ Visual Presentation ] (Overlay / Transcript / Cards)
```

---

## 2. Injected Subtitle Data Specification

Any subtitle-rendering view receives its state and data strictly through dependency injection:

```ts
/**
 * A normalized, platform-independent subtitle cue.
 */
interface SubtitleCue {
  id: string;          // Stable, unique cue identifier (e.g. "cue-1", "0")
  start: number;       // Start timestamp in fractional seconds
  duration: number;    // Cue duration in fractional seconds
  text: string;        // Clean, unencoded display text
}

/**
 * Standard properties injected into a Subtitle View.
 */
interface SubtitleViewProps {
  // Primary subtitle cues to render
  cues: SubtitleCue[];
  
  // Currently active cue id corresponding to playback timestamp
  activeCueId?: string | null;
  
  // Optional parallel translated text mapped by original cue ID
  translatedCues?: Record<string, string>;
  
  // Display preferences
  showTranslation?: boolean;
  showTimestamps?: boolean;
  direction?: 'ltr' | 'rtl' | 'auto';
  
  // User interaction callback
  onSelectCue?: (cue: SubtitleCue) => void;
}
```

---

## 3. View Responsibilities: What It Does vs. What It Does NOT Do

### The Subtitle View IS Responsible For:
1. **Rendering Injected Cues**: Displaying primary subtitle text in the sequence provided.
2. **Visual Active State**: Highlighting or autoscrolling to the active cue identified by `activeCueId`.
3. **Parallel Translations**: Rendering translated text alongside or underneath primary text when `showTranslation` is true and `translatedCues` contains a matching ID.
4. **Text Direction**: Respecting RTL or LTR text direction styling.
5. **Emitting Intent**: Calling `onSelectCue(cue)` when the user taps or clicks a cue.

### The Subtitle View IS NOT Responsible For:
- Fetching or downloading subtitles from YouTube or any external server.
- Reading or decoding raw `.srt` or `.json` (JSON3) files.
- Calculating which cue is active from video playback time (time synchronization is performed by a player coordinator).
- Translating text or communicating with translation APIs.
- Mutating or re-sorting the injected `cues` array.
- Controlling video playback directly (the caller's `onSelectCue` handler handles seeking).

---

## 4. How Another Application Can Provide Subtitle Data

Any external system or mock runner can drive this view simply by providing an array adhering to `SubtitleCue[]`:

```ts
// Example: Driving the view with synthetic or external data
const mockCues: SubtitleCue[] = [
  { id: "1", start: 0.0, duration: 2.5, text: "Hello and welcome!" },
  { id: "2", start: 2.5, duration: 3.0, text: "In this lesson, we study subtitles." }
];

// Rendering the view
<MySubtitleView 
  cues={mockCues} 
  activeCueId="1" 
  onSelectCue={(cue) => console.log("User selected cue:", cue.id)} 
/>
```

The provider can source data from local fixtures (`LIBRARY.md`), an external API, a database, or an Android network hook. The view requires zero changes when the provider changes.

---

## 5. How to Replace the Current View Implementation

Because the interface is pure, any visual implementation can drop in as a direct replacement:

1. **Minimalist In-Video Overlay**: Renders only the single active cue as an unobtrusive, high-contrast text overlay above the video frame.
2. **Interactive Transcript Panel**: Renders all cues as a vertically scrollable list with timestamp badges and click-to-seek capabilities.
3. **Bilingual Flashcard Deck**: Renders one cue at a time with large target text and hidden translation revealed upon click.
4. **Mobile Bottom Sheet**: Displays compact cues tailored for touch gestures on mobile devices.

To replace a view:
- Create a new component that accepts `SubtitleViewProps`.
- Ensure it respects `cues`, `activeCueId`, and calls `onSelectCue`.
- Swap the component in the parent container. No data logic or network code needs to be modified.

---

## 6. Testing Contract

Because the component is pure, tests require no mock servers or network stubs:
- **Unit Testing**: Render the view with fixed `cues` and verify that cue text appears in the DOM.
- **Active State Testing**: Pass `activeCueId="cue-2"` and verify the second cue receives the active highlight class/attribute.
- **Interaction Testing**: Simulate a click on a cue element and verify `onSelectCue` is invoked with the clicked `SubtitleCue` object.
- **RTL Testing**: Pass `direction="rtl"` and verify that the container or cue applies RTL layout rules.
