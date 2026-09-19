# Subtitle Views Design Contract

This document defines the boundary for a replaceable subtitle renderer. It is
intentionally independent of YouTube, Android, translation services, browser
storage, and the way subtitle data was obtained.

## Responsibility split

The subtitle view receives already-normalized cues and renders them. A parent
or provider is responsible for:

- fetching or loading subtitle files;
- parsing SRT or JSON3 into `CaptionCue` objects;
- translating or matching tracks;
- deciding which cue is active;
- saving and restoring subtitle data.

The view must not make network requests, read fixture files, parse raw
payloads, access localStorage, or choose a provider.

## Injected data

The minimum input is:

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

`cues` is the only required content input. Empty, loading, and error states
should be supplied explicitly by the parent rather than inferred by fetching.
The renderer may use `activeCueId` to highlight a cue, but it must not derive
active state from video time on its own.

## View behavior

- Render the supplied cue text without changing timing values.
- Preserve cue order as received.
- Mark the active cue with a stable attribute such as
  `data-cue-id="<id>"` and an accessible active state.
- Call `onSelectCue` only for user interaction; the parent decides whether that
  seeks a player or changes selection.
- Support the same data in several placements: video overlay, teacher panel,
  compact transcript, searchable list, or a mobile sheet.
- Keep visual choices disposable: styling, pagination, typography, and layout
  belong to the view implementation, not to the data provider.

## Multiple renderers

Several subtitle views may consume the same `cues`, `activeCueId`, and
`translatedCues` at once. For example, the video overlay can show one active
cue while the teacher panel shows the full transcript. They must not maintain
separate copies of subtitle data or mutate the injected arrays.

## Test boundary

Pure renderer tests should pass in a small cue list and assert rendered text,
active-state attributes, translation visibility, RTL direction, empty state,
and `onSelectCue` behavior. Parser and provider tests belong outside this
component.