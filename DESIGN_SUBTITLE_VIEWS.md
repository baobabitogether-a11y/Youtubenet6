# Subtitle Views — Replaceable Rendering Contract

This document is the storyboard contract for any view that presents subtitle
data. It is deliberately independent of the browser, Android, YouTube, the
fixture location, the parser, and the provider that produced the data.

## Responsibility

A subtitle view only renders normalized data and reports user intent. It does
not:

- fetch or discover subtitles;
- read SRT or JSON3 files;
- parse raw payloads;
- translate, align, cache, or persist tracks;
- calculate the active cue from video time;
- access browser or Android APIs.

An external provider or coordinator performs those jobs and injects the
result. SRT and JSON3 are provider concerns; the renderer sees one cue shape.

## Interface

The smallest useful contract is:

```ts
interface SubtitleCue {
  id: string;
  start: number;       // seconds
  duration: number;    // seconds
  text: string;
}

interface SubtitleViewProps {
  cues: SubtitleCue[];
  activeCueId?: string | null;
  translatedCues?: Record<string, string>;
  showTranslation?: boolean;
  showTimestamps?: boolean;
  direction?: 'ltr' | 'rtl' | 'auto';
  onSelectCue?: (cue: SubtitleCue) => void;
}
```

The application may use a richer equivalent, but the replaceable view must
still have an explicit input for the cue list and an explicit callback for
interaction. Loading, empty, and error states should be supplied as view
state by the coordinator; they must not be inferred by attempting a fetch.

## Rendering rules

- Render cue text and preserve the supplied cue order.
- Do not change timing values or mutate injected cues.
- Identify the active cue with an accessible state and a stable cue id.
- Invoke `onSelectCue` only after a user action. The caller decides whether
  that action seeks playback, changes selection, or does nothing.
- Treat translations as optional injected display data. Do not call a
  translation service from the view.
- Keep layout, typography, pagination, highlighting style, and placement
  replaceable.

The same contract should support several appearances, including a video
overlay, a transcript, a compact card, a searchable list, or a mobile sheet.
Several views may consume the same data simultaneously without keeping
separate copies.

## Provider boundary

The provider is responsible for converting a source into `SubtitleCue[]`.
The two current source families are:

| Source | Provider responsibility |
| --- | --- |
| `test/fixtures/FcRzAdI8R9U/*.srt` | Parse SRT timings and text |
| `test/fixtures/L2Ryrr6txwA/*.json` | Parse YouTube JSON3 events and segments |
| Android observed timed-text request | Request or receive JSON3, then normalize it |

The renderer must not depend on any of these source paths. A new provider
should be usable without changing a subtitle view.

## Test boundary

Pure view tests inject a small cue list and verify rendered text, order,
active state, optional translation, direction, empty/error states, and the
interaction callback. Parser tests separately verify SRT and JSON3 conversion.
Provider tests separately verify fixture loading, Android request handling, and
network or storage behavior.