# AGENTS.md — Modular Project & Agent Guidelines

## 1. Project Purpose & Documentation Hierarchy

This repository implements a modular subtitle-learning platform designed to run across two hosts:
- **Browser Companion**: A fixture-driven web environment for testing, UI validation, and demonstration without relying on live YouTube caption interception.
- **Android Native Host**: A native container (`android-shell/`) capable of inspecting WebView network traffic to capture live YouTube caption requests and leverage hardware capabilities.

The project is governed strictly by Markdown design specifications rather than specific code implementations. By following these documents, the entire application or any of its views can be completely re-created, replaced, or updated using different tools and frameworks while preserving identical behavior.

### Required Documentation Ecosystem
- **`AGENTS.md`**: Architectural foundation, modularity mandates, component contracts, platform boundaries, and testing roadmap.
- **`PROMPT.md`**: Active user requirements and task tracker, rewritten in the agent's own words for every directive.
- **`PROMPT_OLD.md`**: Historical archive of previous directives and completed task lists.
- **`LIBRARY.md`**: Specification and structure of the subtitle fixture library (`test/fixtures/`).
- **`DESIGN_SUBTITLE_VIEWS.md`**: Structural interface and behavior contract for all subtitle-rendering views.
- **`DESIGN_VIEW_LANGS.md`**: Structural interface and behavior contract for all language-selection views.
- **`DESIGN_CONTROLS_VIEW.md`**: Structural interface and behavior contract for playback control views.
- **`DESIGN_PLAYER_PROVIDER.md`**: Vendor-agnostic media playback provider and time synchronization contract.
- **`DESIGN_STATE_COORDINATOR.md`**: Finite state machine, transitions, active cue resolution, and state flow.
- **`SCHEMA_TIMEDTEXT.md`**: Format definitions, segment timings, entity decoding, and RTL/BiDi normalization.
- **`DEBUG.md`**: Diagnostic log viewer, network request interception, 15-char response preview, and AI troubleshooting prompt generator.
- **`ACTIONS.md`**: Automated GitHub Actions CI/CD workflows and deployment pipelines.

---

## 2. Modularity and Pure View Architecture

The primary architectural goal is **complete modularity through pure components**:

```text
[External Provider / Network / Cache]
                  │
                  ▼ (Fetches & Normalizes)
          [Normalized Data]
                  │
                  ▼ (Injected via Props)
         [Pure View Component]
                  │
                  ├──► Renders UI Presentation
                  └──► Emits User Intent Callbacks (e.g., onSelect)
```

### Pure Component Mandates
1. **Separation of Concerns**: Data acquisition, network traffic, cache persistence, and format parsing belong strictly outside presentation views.
2. **Dependency Injection**: Views receive all necessary state and data via props or parameters.
3. **No Hidden Logic**: A view must never initiate network requests, read the filesystem, access localStorage, parse raw SRT/JSON3 files, or perform translations on its own.
4. **Interchangeability**: Any view implementation (e.g., overlay, transcript list, compact card, bottom sheet) must be completely swappable with another visual implementation as long as both consume the same defined interface.
5. **Pure Event Dispatch**: Views report user interactions solely through callback functions (e.g., `onSelectCue`, `onSelectLanguage`). The view does not decide how playback or state responds to that event.

---

## 3. Subtitle Rendering Pipeline

The application is fundamentally a subtitle-rendering and language-learning tool. Subtitle renderers must never fetch subtitles directly:

```text
Subtitle Provider ──► Subtitle Data ──► Subtitle Renderer ──► UI Display
```

- **Subtitle Provider**: Loads local fixtures (web) or intercepts network requests (Android), parses them, and yields normalized cues.
- **Subtitle Renderer**: Defined in `DESIGN_SUBTITLE_VIEWS.md`. It accepts `SubtitleCue[]`, an active cue identifier, optional translations, and interaction callbacks.
- **Independence**: This separation enables isolated unit and visual regression testing of any renderer using synthetic or fixture subtitle cues.

---

## 4. Language Selection Pipeline

Language-selection controls must strictly decouple language data management from visual display:

```text
Language Provider ──► Language Options Data ──► Language View ──► User Action
```

- **Contract**: Defined in `DESIGN_VIEW_LANGS.md`.
- **Injected Data**: A normalized array of language objects (`code`, `name`, optional `nativeName`, `direction`, `enabled`).
- **View Responsibility**: Renders the options and triggers an `onSelect(code)` callback upon user selection.
- **Agnostic**: Multiple views (drop-downs, floating pills, settings modals, sidebar lists) can consume the identical language list without requiring separate data stores.

---

## 5. Supported Subtitle Formats

The application supports two input formats:
1. **SubRip Text (`.srt`)**: Classic timestamped cue lines (`HH:MM:SS,mmm --> HH:MM:SS,mmm`).
2. **YouTube JSON3 (`.json`)**: YouTube's structured timed-text format containing event timestamps and word/segment arrays.

**JSON3 is the preferred format** when fetching or querying subtitles because it contains fine-grained segment and word timings, enabling synchronized word-boundary highlights that are lost in basic SRT files.

---

## 6. Platform Responsibilities: Web Companion vs. Android Host

The browser companion and Android native host solve different constraints:

### Web Companion
- Operates inside standard web browsers and CI/CD pipelines.
- Standard browsers cannot inspect cross-origin HTTPS requests inside a YouTube `<iframe>`.
- Uses the fixture library (`test/fixtures/`) to supply offline subtitle tracks across multiple languages.
- Serves as the primary presentation and automated verification driver.

### Android Native Host
- Operates inside an Android WebView (`android-shell/`).
- Intercepts network operations when the user toggles captions, detecting requests to:
  `https://www.youtube.com/api/timedtext`
- Modifies the observed request parameters (e.g., swapping `tlang` to request another target language) and replays it.
- **Critical Requirement**: Must preserve the complete original request context (headers, cookies, query parameters, formatting) rather than constructing an arbitrary URL.
- Preserves `fmt=json3` to retain timing accuracy.

---

## 7. Subtitle Fixture Library Architecture

The fixture library is a first-class feature of the project, documented in `LIBRARY.md`.

- **Root Location**: `test/fixtures/`
- **Schema**: `test/fixtures/<VIDEO_ID>/*.{json,srt}` where `<VIDEO_ID>` is the 11-character YouTube video ID.
- **Reference Tracks**:
  - `test/fixtures/FcRzAdI8R9U/*.srt` (SRT fixtures: `en`, `ru`, `he`, `it`, `ar`)
  - `test/fixtures/L2Ryrr6txwA/*.json` (JSON3 fixtures: `en`, `ru`, `he`, `it`, `ar`)
- **Format Verification**: Validated via `npm run test:caption-formats`.

---

## 8. Deferred Android E2E Tests

These tests represent native Android capabilities and are intentionally documented for later implementation:

- **Android E2E Test 2.1**:
  - Enable the native caption icon in the Android WebView.
  - Automatically detect the outgoing `timedtext` network operation in the native interceptor.
- **Android E2E Test 2.2**:
  - Detect the initial `timedtext` request.
  - Modify the `tlang` parameter to a target language code while preserving all other request attributes (headers, credentials, format).
  - Execute the modified request and assert a successful timed-text response in the target language.

> **Implementation Phase Notice**: Do not implement these Android tests during the current web implementation phase. They are scheduled for a later stage utilizing GitHub Actions Android emulators.

---

## 9. Current Implementation & Testing Phase

The active implementation phase mandates:
1. Strict adherence to Markdown design contracts (`DESIGN_SUBTITLE_VIEWS.md`, `DESIGN_VIEW_LANGS.md`, `DESIGN_CONTROLS_VIEW.md`, `DESIGN_PLAYER_PROVIDER.md`, `DESIGN_STATE_COORDINATOR.md`, `SCHEMA_TIMEDTEXT.md`).
2. Complete view reconstruction capability: If any or all presentation views are deleted, they can be reconstructed from scratch purely using these Markdown contracts.
3. Web companion operation driven by local fixture providers from `LIBRARY.md`.
4. Automated testing scoped to web E2E tests only (Playwright and Cypress).
5. Code verification via standard scripts:
   ```bash
   npm run test:caption-formats   # Validates SRT and JSON3 fixture parsing
   npm run lint                   # Validates TypeScript type safety
   npm run build                  # Validates production bundles
   ```

---

## 10. Summary of Architectural Mission

- **Views are replaceable**: Any UI component can be rewritten or swapped without breaking data flow.
- **Contracts are the truth**: Markdown specifications define component inputs, responsibilities, and outputs.
- **Components are pure**: External providers inject data; views simply render and emit user callbacks.
- **Fixtures are first-class**: The fixture library provides deterministic, verified offline datasets.
- **Total Reconstruction Ready**: The `.md` contracts fully document data shapes, algorithms, and event flows so the complete frontend can be regenerated or migrated across different frameworks.
