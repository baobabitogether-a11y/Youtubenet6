# Previous Prompt & Task Archive (PROMPT_OLD.md)

## Archived User Directive 1
> The imported Web Companion was updated to run on Replit with the smallest necessary synchronization and presentation changes.

### Worklist 1
- Triage imported repository and establish baseline build.
- Validate server and client bundle execution.
- Maintain minimal changes necessary for container execution.

---

## Archived User Directive 2
> Ensure all Markdown documentation files (`.md`) are updated to enforce complete architectural modularity, decoupling the design specifications from specific code implementations so the application can be reconstructed or modified across different tools.
> 
> Key deliverables:
> 1. Create `ACTIONS.md` documenting GitHub Actions workflows, execution pipelines, and how they relate to the modular architecture.
> 2. Create `LIBRARY.md` documenting the subtitle fixture library (`test/fixtures/XXX/*.{json,srt}`), supported formats (SRT & JSON3), and fixture-driven web development.
> 3. Update `AGENTS.md` in our own words with the 12 core modularity, architecture, pure-view, fixture, platform separation, and testing requirements.
> 4. Ensure `DESIGN_SUBTITLE_VIEWS.md` and `DESIGN_VIEW_LANGS.md` define stable, tool-agnostic view contracts.
> 5. Update `README.md` to reference the complete documentation suite.
> 6. Provide concrete suggestions for expanding the documentation system to further enhance modularity and tool-agnostic development.

### Worklist 2
- [x] Back up prior directive to `PROMPT_OLD.md`.
- [x] Create comprehensive `ACTIONS.md` explaining GitHub Actions workflows and CI/CD pipelines.
- [x] Create `LIBRARY.md` detailing the fixture library architecture, directory schema, formats, and verification.
- [x] Update `AGENTS.md` with complete implementation-agnostic modularity principles, pure component contracts, and testing boundaries.
- [x] Refine `DESIGN_SUBTITLE_VIEWS.md` and `DESIGN_VIEW_LANGS.md` with explicit data flow and replacement interfaces.
- [x] Update `README.md` to link all primary Markdown guides and explain the modular architecture.
- [x] Verify format verification (`npm run test:caption-formats`), TypeScript compilation (`npm run lint`), and production build (`npm run build`).
- [x] Present documentation enhancements and recommendations to user.

---

## Archived User Directive 3
> Formally integrate the suggested modular design contracts into the documentation ecosystem (`DESIGN_PLAYER_PROVIDER.md`, `DESIGN_STATE_COORDINATOR.md`, `SCHEMA_TIMEDTEXT.md`, and `DESIGN_CONTROLS_VIEW.md`) and prepare the project specifications so that if all view implementations are deleted, the application can be reconstructed purely from the `.md` documentation files without any regression. Also create `DEBUG.md` detailing the diagnostic log viewer, network interception, 15-char response preview, and AI troubleshooting prompt generator.

### Worklist 3
- [x] Create `DESIGN_PLAYER_PROVIDER.md` (Media Playback Contract & Event Stream).
- [x] Create `DESIGN_STATE_COORDINATOR.md` (Abstract Application State Machine).
- [x] Create `SCHEMA_TIMEDTEXT.md` (Timed-Text Schema, Segments, BiDi/RTL Rules).
- [x] Create `DESIGN_CONTROLS_VIEW.md` (Pure Playback Controls Contract).
- [x] Create `DEBUG.md` (Diagnostic Log Viewer, Ring Buffer, Network Interception, 15-char Response Preview, and AI Troubleshooting Prompt Generator).
- [x] Update `AGENTS.md` and `README.md` to incorporate the complete architectural contracts.
- [x] Verify format verification, linter, and build passing.

---

## Archived User Directive 4
> Provide a quick-selection mechanism allowing users to toggle instantaneously between the primary SubRip (.SRT) demo video (`FcRzAdI8R9U` with authentic multi-language tracks in `test/fixtures/FcRzAdI8R9U/*.srt`) and the YouTube JSON3 timed-text demo video (`L2Ryrr6txwA` with authentic 199-segment multi-language tracks in `test/fixtures/L2Ryrr6txwA/*.json`).

### Worklist 4
- [x] Create `test/fixtures/L2Ryrr6txwA/jsonStrings.ts` to import and parse JSON3 tracks (`en`, `he`, `ru`, `it`, `ar`).
- [x] Register `L2Ryrr6txwA` in `test/fixtures/defaultSubtitles.ts` and `src/utils/subtitleCache.ts`.
- [x] Add `L2Ryrr6txwA` entry to `DEFAULT_LIBRARY_ITEMS` in `src/config/appConfig.ts`.
- [x] Add quick format toggle buttons (SRT vs JSON3) to `src/components/DemoQuickFloatingDock.tsx`.
- [x] Add quick demo switcher chips directly into `src/components/LinkInputBar.tsx`.
- [x] Upgrade `src/components/SubtitleArtifactsModal.tsx` to handle both SRT and JSON3 formats with format-specific downloads and raw text tabs.
- [x] Connect `handleSwitchDemoVideo` in `src/App.tsx` for immediate state restoration and toast notifications.
- [x] Verify caption fixture script (`npm run test:caption-formats`) passes 10 fixtures across SRT and JSON3.
- [x] Verify TypeScript type safety (`npm run lint`) passes cleanly with 0 errors.
- [x] Verify production compilation (`compile_applet`) succeeds.


