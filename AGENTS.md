# AGENTS.md — Modular Project Guidelines

## Purpose

This repository contains a subtitle-learning experience delivered through two
different hosts:

- a browser companion used for presentation, fixtures, and automated web
  verification;
- an Android host that can observe YouTube caption traffic and provide native
  capabilities that a browser cannot provide.

The project is intentionally organized around replaceable parts. Markdown
design documents are the source of truth for the purpose and boundaries of a
part. Code is an implementation of those boundaries, not the definition of
the product.

## Mission

The implementation of a view may vary. A view must be easy to replace with a
different visual design as long as the replacement consumes the same defined
interface: the data it is provided with and the user actions it reports.

The application is therefore built from pure, disposable views connected to
external providers. Do not make a visual implementation the source of truth
for subtitle acquisition, language data, or application state.

## Documentation rules

Keep documentation focused on purpose, inputs, outputs, and boundaries rather
than on the current names or layout of implementation files.

- `DESIGN_SUBTITLE_VIEWS.md` defines the data contract for subtitle renderers.
- `DESIGN_VIEW_LANGS.md` defines the data contract for language-selection
  views.
- `README.md` is the user-facing guide and project entry point.
- `replit.md` contains concise Replit run notes.
- `CHANGELOG.md` records historical changes; it is not an active worklist.

When a view is renamed or replaced, update its design contract only if the
contract changes. Do not make a design document depend on a particular
component name, framework, provider, or screen location.

## Architectural principles

### 1. Separate data acquisition from presentation

Subtitle acquisition, parsing, translation, caching, timing, persistence, and
platform integration belong outside subtitle and language views.

Views should be pure components:

- receive all display data through an explicit interface;
- render the data they receive;
- emit user intent through callbacks;
- avoid network requests, storage access, parsing, translation, and hidden
  global state;
- avoid mutating injected objects or arrays.

A view may be used in several situations with the same data: an overlay, a
transcript, a compact control, a settings view, or a mobile dialog. Different
layouts are replaceable when they consume the same contract.

### 2. Prefer stable, small interfaces

Each replaceable part must have a coherent interface that explains:

- what the part is responsible for;
- the data it requires;
- the events or decisions it reports;
- what it deliberately does not do.

Do not expose provider-specific objects to a pure view when a small normalized
data shape is sufficient. Keep provider-specific language aliases, transport
details, and persistence decisions at the boundary that supplies the data.

### 3. Keep platform responsibilities explicit

The browser companion and Android host do not have the same capabilities.
Neither platform should be forced to imitate the other.

#### Browser companion

The browser companion is a fixture-driven presentation and verification
environment. Its subtitle content is supplied locally so the renderer can be
tested and demonstrated without relying on live YouTube requests. Browser
JavaScript cannot inspect caption requests made inside a cross-origin YouTube
iframe.

The supported local fixture formats are:

- SRT files under `test/fixtures/FcRzAdI8R9U/*.srt`;
- YouTube JSON3 files under `test/fixtures/L2Ryrr6txwA/*.json`.

The `.json` files in the second directory contain JSON3 timed-text data; the
extension does not mean that an arbitrary JSON schema is supported. Both
formats must be parsed into the same normalized cue interface before they
reach a renderer.

#### Android host

When the caption control is enabled, the Android host can observe network
requests made by its WebView. It can therefore detect requests to:

`https://www.youtube.com/api/timedtext`

The native host may reuse the observed request context and issue another
request with a different `tlang` value to obtain another language. Preserve
the `fmt=json3` request format where possible because JSON3 carries richer
timing information than SRT. The native host supplies parsed subtitle data to
the same presentation contracts used by the browser companion.

The browser fixture path and Android network-observation path are different
providers. They must converge at the normalized subtitle data interface, not
inside a renderer.

## Deferred Android tests

These tests are important, but are intentionally not part of the current web
implementation pass:

1. When the caption icon is turned on in Android, automatically detect the
   subtitle request.
2. Preserve the complete observed request details, not only its URL. Reuse
   those details to issue a request with a different `tlang` language code and
   verify that subtitles are successfully returned in that language.

Android WebView interception and GitHub Actions emulator testing are later
phases. Do not replace them with browser assumptions or add them to the web
E2E gate.

## Implementation sequence

The current implementation phase is:

1. implement the browser companion from the Markdown contracts;
2. use fixture providers for SRT and JSON3;
3. test the browser behavior with web E2E tests only.

The later phase is Android emulator testing through GitHub Actions, including
the request-preservation and language-switching tests above.

## Fixture library

The fixture library is organized by video ID:

```text
test/fixtures/<VIDEO_ID>/*.{json,srt}
```

`<VIDEO_ID>` is the YouTube video identifier. A directory may contain several
language tracks for the same video, with the language represented by the file
name, for example:

```text
test/fixtures/FcRzAdI8R9U/ru.srt
test/fixtures/L2Ryrr6txwA/he.json
```

The fixture library is a provider for the browser companion. It is not a
responsibility of a subtitle renderer. Fixture adapters must normalize both
formats into the same cue interface before injecting data into a view.

## Subtitle format requirements

SRT and JSON3 are required supported input formats.

- SRT uses numbered cues and `HH:MM:SS,mmm --> HH:MM:SS,mmm` timing lines.
- JSON3 uses YouTube timed-text events with millisecond start and duration
  fields and one or more text segments.
- Both formats must produce cues with a stable id, start time in seconds,
  duration in seconds, and display text.
- Empty or malformed input must produce an explicit parse failure or an empty
  result; it must not be silently presented as valid subtitles.
- Format-specific details must stay in the acquisition/parsing layer.

The canonical fixture verification command is:

```bash
npm run test:caption-formats
```

It must inspect at least one `.srt` fixture from
`test/fixtures/FcRzAdI8R9U/` and one `.json` JSON3 fixture from
`test/fixtures/L2Ryrr6txwA/`, confirm the detected format, and confirm that
the resulting cues have valid timing and non-empty text.

## Dependency injection and storyboard guidance

Design new UI as a storyboard of pure views connected by injected data:

1. a provider obtains or creates data;
2. an adapter normalizes that data;
3. a view renders the normalized data;
4. callbacks report user intent to the provider or coordinator.

The storyboard may place multiple views over the same data. Do not make a view
responsible for discovering its provider based on its location. This allows a
simple replacement design to be handed the relevant Markdown contract without
requiring the rest of the application to be redesigned.

For subtitle views, use `DESIGN_SUBTITLE_VIEWS.md`. For language views, use
`DESIGN_VIEW_LANGS.md`. Those documents may describe multiple views that share
one data contract but appear in different locations or interaction contexts.

## Code and repository hygiene

- Preserve the existing project structure and build tools unless a change is
  required by the user.
- Keep browser fixtures and Android-native behavior separate.
- Do not put network, storage, translation, or parsing logic into a pure
  renderer.
- Do not add fallback data that hides a provider or parser failure.
- Do not commit generated build output, test recordings, screenshots, logs, or
  APKs.
- Keep secrets and credentials out of source files and documentation.

## Verification

Verify the smallest complete behavior affected by a change. For subtitle
changes, run the format verification command and the TypeScript check. For
build-affecting changes, also run the production build.

```bash
npm run test:caption-formats
npm run lint
npm run build
```

If a check cannot run because an external service or platform is unavailable,
report that limitation instead of replacing it with an unverified fallback.