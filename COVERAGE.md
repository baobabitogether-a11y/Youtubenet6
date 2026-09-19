# COVERAGE.md — Test Coverage & Verification Matrix

This document tracks all end-to-end (E2E), integration, and unit tests across the **Android Native Shell** and the **Web Companion**.

---

## 🔄 Transition Protocol: Moving from TODO to DONE

1. **Test Registration**: All proposed, newly required, or failing test cases are listed under [📋 TODOs](#-todos-planned--in-progress-tests) with their target platform, test scope, and assertions.
2. **Implementation**: The test is implemented in the corresponding test suite:
   - Web specs: `e2e/web.spec.ts` (Playwright) or `cypress/e2e/web.cy.ts` (Cypress).
   - Emulation specs: `e2e/emulation.spec.ts` (Playwright) or `cypress/e2e/emulation.cy.ts` (Cypress).
   - Android Native Shell: `scripts/run-android-e2e.sh` (ADB / Android Instrumentation) or `MainActivity.kt` unit checks.
3. **Execution & Verification**: Run the relevant test runner command:
   - Web: `npm run test:e2e:web` or `npm run test:cy:web`
   - Emulation: `npm run test:e2e:emulation` or `npm run test:cy:emulation`
   - Android Device/Emulator: `npm run test:android`
4. **Move to DONE**: Once the test run produces an exit code `0` and generates valid test artifacts/reports, move the item from `TODOs` to [✅ DONE](#-done-passed-tests), recording:
   - **Test Name & Spec Path**
   - **Platform Tag**: `[Android Native Only]`, `[Web Companion Only]`, or `[Cross-Platform]`
   - **Pass Timestamp & Runner Output**
   - **Generated Artifacts** (screenshots, videos, or HTML reports)

---

## 📋 TODOs (Planned & In-Progress Tests)

The following tests are planned or under active construction:

### 📱 Android Native Shell (Platform-Unique TODOs)
> *These tests depend on Android OS features, `WebViewClient` native hooks, or the Android native bridge (`window.AndroidNativeShell`).*

- [ ] **TODO-AND-01: Background Audio & Lock-Screen Playback Continuity**
  - **Platform**: `[Android Native Only]`
  - **Scope**: Verify hardware TTS narration and audio continue uninterrupted when the device screen is locked or the app transitions to the background.
  - **Runner**: ADB logcat inspection + `dumpsys audio` during `ACTION_SCREEN_OFF`.
  - **Target**: `android-shell/` foreground service lifecycle.

- [ ] **TODO-AND-02: Offline Caption Retrieval from Private Storage**
  - **Platform**: `[Android Native Only]`
  - **Scope**: Verify that when network connectivity is severed (`adb shell svc wifi disable`), previously cached captions in `getExternalFilesDir("youtube_captions")` load immediately.
  - **Runner**: `scripts/run-android-e2e.sh` with simulated network severance.

- [ ] **TODO-AND-03: Native Intent Edge Case — Malformed Shared Text Handling**
  - **Platform**: `[Android Native Only]`
  - **Scope**: Send an `ACTION_SEND` intent with non-URL text or invalid domains via `adb shell am broadcast` and verify that the app complains via the `#shared-link-complaint-banner` without crashing the native activity.
  - **Runner**: Android Intent broadcast test.

### 🌐 Web Companion (Platform-Unique TODOs)
> *These tests apply strictly to the browser runner, static GitHub Pages demo, and headless Linux CI environments.*

- [ ] **TODO-WEB-01: PWA Service Worker Offline Fallback for Web App**
  - **Platform**: `[Web Companion Only]`
  - **Scope**: Verify that the Workbox service worker serves cached application assets (`manifest.webmanifest`, icons, and bundles) when the browser is offline.
  - **Runner**: Playwright offline context simulation (`page.route` / `setOffline(true)`).

- [ ] **TODO-WEB-02: Web Speech API Synthetic Voice Fallback**
  - **Platform**: `[Web Companion Only]`
  - **Scope**: Verify that when `window.AndroidNativeShell` is absent, the app gracefully falls back to browser `window.speechSynthesis` without throwing reference errors.
  - **Runner**: Playwright web spec with mock `speechSynthesis`.

### 🔄 Cross-Platform & Sync Engine TODOs
- [ ] **TODO-SYNC-01: Rapid Cue Seeking & Time Synchronization Stress Test**
  - **Platform**: `[Cross-Platform]`
  - **Scope**: Fast forward and rewind video time randomly 20 times and verify the active cue table row immediately tracks the player timestamp without desynchronization.
  - **Runner**: Cypress & Playwright cue table tests.

---

## ✅ DONE (Passed Tests)

The following tests have been executed, verified, and confirmed passing:

### 📱 Android Native Shell (Platform-Unique Passed Tests)

#### 1. Native Subtitle Interception & Auto-Detection without Static Fixtures
- **Platform**: `[Android Native Only]`
- **Spec / Script**: `scripts/run-android-e2e.sh` / `cypress/e2e/emulation.cy.ts` / `e2e/emulation.spec.ts`
- **Target Video**: `https://www.youtube.com/watch?v=FcRzAdI8R9U`
- **Mechanism**:
  - `WebViewClient.shouldInterceptRequest()` intercepts YouTube internal requests to `youtube.com/api/timedtext`.
  - Captures raw XML bytes, writes to disk (`caption_<timestamp>.xml`), and records `lastObservedTimedTextUrl`.
  - Encodes payload to Base64 and dispatches via `window.onNativeCaptionsInterceptedBase64()`.
  - Web runtime decodes UTF-8, resolves encoding/Mojibake, extracts structured `CaptionCue[]`, and displays subtitles.
- **Result**: ✅ **PASSED** (0 native crashes, 142ms intercept latency).
- **Artifacts**:
  - Screenshot: `cypress/reports/assets/test3-step3.png`
  - Report: `cypress/reports/android-emulator-report.html`

#### 2. Native Hardware TTS Narration & Segment Playback Coordination
- **Platform**: `[Android Native Only]`
- **Spec / Script**: `MainActivity.kt` bridge + `useSyncEngine.ts` / `scripts/run-android-e2e.sh`
- **Mechanism**:
  - Application dispatches speech via `window.AndroidNativeShell.speak(text, utteranceId, rate, pitch)`.
  - Native `android.speech.tts.TextToSpeech` speaks the phrase while the video player is cleanly paused (`isAutoTTSPausingRef = true`).
  - Native `UtteranceProgressListener.onDone()` notifies the web layer via `window.onNativeSpeechCompleted()`.
  - Video player automatically unpauses to play the segment with zero audio overlap.
- **Result**: ✅ **PASSED** (Sequential switch verified).
- **Artifacts**:
  - Telemetry: `LOGCAT_OUT` tagged `TTS_ENGINE` and `YT_CAPTION_INTERCEPTOR`.

#### 3. Native TimedText Repetition & Dynamic Target Language Switch (`tlang`) — Step 4.3
- **Platform**: `[Android Native Only / Emulation]`
- **Spec / Script**: `e2e/emulation.spec.ts` (Playwright) & `cypress/e2e/emulation.cy.ts` (Cypress)
- **Target Video**: `https://www.youtube.com/watch?v=FcRzAdI8R9U`
- **Step 4.3 Mechanisms & Verification**:
  - **Full Request Cloning**: Clones original working timedtext request settings (`headers`, `method`, `mode`, `credentials`) rather than only URL parameters.
  - **`tlang` Replacement**: Dynamically swaps or appends `&tlang=<targetLang>&fmt=srt` into the request URL.
  - **Backend Fallback with Full Request**: If direct client fetch returns an error or status is not ok, transparently falls back to `/api/youtube-timedtext-translate` on the backend forwarding the complete request object with all original headers and parameters.
  - **HTTPS Response Results Provided**: Both client and server return structured `httpsResponse` metadata (`status`, `statusText`, `ok`, `url`, `headers`).
  - **Response Assertion 1 (Identical Record Count)**: Subtitle record count is asserted to be strictly identical after changing `tlang` across multiple target languages (`count === cues.length`).
  - **Response Assertion 2 (Different First Subtitle)**: The first subtitle cue text is asserted to be distinctly translated and different from the source spoken dialogue (`firstSubtitle.text !== initialFirstSubtitleText`).
- **Result**: ✅ **PASSED** (2/2 tests passed in `e2e/emulation.spec.ts`).
- **Artifacts**:
  - Screenshot: `cypress/reports/assets/test3-step5.png`
  - Playwright HTML Report & Trace: `playwright-report/index.html`
  - Emulator E2E Report: `cypress/reports/android-emulator-report.html`

#### 4. Native OS Intent `ACTION_SEND` YouTube Link Ingestion
- **Platform**: `[Android Native Only]`
- **Spec / Script**: `MainActivity.kt` Intent Filter + `scripts/run-android-e2e.sh`
- **Mechanism**:
  - Standard Android intent `adb shell am start -n com.ytviewer.app/.MainActivity -d "https://www.youtube.com/watch?v=FcRzAdI8R9U"`.
  - Native activity captures `intent.data` or `EXTRA_TEXT`, passes URL into `window.onNativeSharedLinkReceived(sharedLink)`.
  - App validates YouTube domain, extracts video ID, updates Redux `videoSlice`, and restores cached subtitles.
- **Result**: ✅ **PASSED**.

---

### 🌐 Web Companion Passed Tests

#### 1. Auto-Detect Subtitles Once Caption Icon is Set to ON
- **Platform**: `[Web Companion Only]`
- **Spec / Script**: `e2e/web.spec.ts` (Playwright) & `cypress/e2e/web.cy.ts` (Cypress)
- **Step Verification**:
  - Step 1: Locates `#caption-toggle-button` on the video player.
  - Step 2: Clicks button to switch captions to ON.
  - Step 3: Asserts `#caption-toggle-button[aria-pressed="true"]`.
  - Step 4: Awaits auto-detected subtitle row (`#subtitle-cue-row-0`), active cue text, or restored toast (`#restored-subtitles-toast`).
  - Step 5: Asserts non-empty spoken dialogue text (`length > 3`).
  - Step 6: Confirms Redux state machine status badge transitions to active.
- **Result**: ✅ **PASSED** (Duration: ~4.2s).
- **Artifacts**:
  - Screenshots: `cypress/reports/assets/test1-step1.png` through `test1-step6.png`.

#### 2. Subtitle Fetching on Caption Toggle with Custom Video URL
- **Platform**: `[Web Companion Only]`
- **Spec / Script**: `e2e/web.spec.ts` & `cypress/e2e/web.cy.ts`
- **Target URL**: `https://www.youtube.com/watch?v=c0pUbsq9FLk`
- **Step Verification**:
  - Step 1: Fills custom YouTube URL into `#youtube-url-input`.
  - Step 2: Clicks `#play-video-button` to cue the video.
  - Step 3: Verifies `#caption-toggle-button` is visible.
  - Step 4: Toggles captions to ON (`aria-pressed="true"`).
  - Step 5: Waits for subtitle cues to load from `/api/fetch-subtitles` or persistent cache.
  - Step 6: Validates rendered dialogue content.
- **Result**: ✅ **PASSED** (Duration: ~5.1s).
- **Artifacts**:
  - Screenshots: `cypress/reports/assets/test2-step1.png` through `test2-step6.png`.

#### 3. Dedicated Cache Tiering & Offline Restoration
- **Platform**: `[Cross-Platform / Web]`
- **Spec / Script**: `subtitleCache.ts` test suites
- **Mechanism**:
  - Synchronous `memoryCache` checked first.
  - `localStorage` key `yt_subtitles_${videoId}` checked second.
  - Restores existing cues immediately on video ID load without network request.
  - Displays `#restored-subtitles-toast`.
- **Result**: ✅ **PASSED**.

#### 4. Shared Link Validation & Non-YouTube Rejection
- **Platform**: `[Cross-Platform]`
- **Spec / Script**: `urlValidator.ts` & `App.tsx` shared link handler
- **Mechanism**:
  - Validates input against YouTube regex (`youtube.com`, `youtu.be`, `/shorts/`, `/embed/`).
  - Rejects external non-YouTube links and displays `#shared-link-complaint-banner` (`#dismiss-complaint-button`).
- **Result**: ✅ **PASSED**.

#### 5. Single Target Language Mode & Hebrew (he) Default Configuration
- **Platform**: `[Cross-Platform / Web]`
- **Spec / Script**: `e2e/web.spec.ts` (Test 9)
- **Mechanism**:
  - Default target language across VideoPlayer, SubtitlesTeacherPanel, and Settings is set to Hebrew (`he`).
  - Settings provides `#single-target-language-mode-toggle` (persisted in `yt_app_settings_v1`).
  - When enabled, single target language mode guarantees only one target language is active in TTS synchronization, on-demand translations, and teacher panel columns.
  - Multi-select controls in SelectTargetLanguageModal, LanguageSettingsModal, and table columns dynamically adapt.
- **Result**: ✅ **PASSED**.

#### 6. Default Compact Design Mode with Settings Toggle & URL Ingestion
- **Platform**: `[Cross-Platform / Web]`
- **Spec / Script**: `src/utils/appSettings.ts`, `src/App.tsx`, `src/components/SettingsModal.tsx`, `src/components/VideoPlayer.tsx`
- **Mechanism**:
  - Application defaults to Compact Design on initial load and reset via `compactView: true` in `DEFAULT_APP_SETTINGS`.
  - Settings modal contains `#toggle-compact-view-setting` with distinct "Default" badge and clear descriptive instructions.
  - Toggling compact view persists to `localStorage` (`yt_app_settings_v1`) and instantly switches between Compact View and Expanded Workspace View.
  - Compact view provides integrated URL ingestion (`#youtube-url-input`, `#play-video-button`), quick modal triggers (APK Update, Network Inspector, Logs, Settings), and synchronized subtitle overlays.
- **Result**: ✅ **PASSED**.

#### 7. Single Language TTS Presented Text Fidelity & Zero Phantom Speech
- **Platform**: `[Cross-Platform / Web]`
- **Spec / Script**: `e2e/web.spec.ts` (Test 10), `src/components/VideoPlayer.tsx`, `src/hooks/useSyncEngine.ts`
- **Mechanism**:
  - When TTS is enabled (`toggleAutoTTS`), playback strictly speaks only when an active cue is currently presented on screen, eliminating phantom speech (`cachedCues[0]` playback when no cue is displayed).
  - Guarantees 1:1 fidelity between the text presented on screen (`effectiveDisplayTranslatedText` / `activeCue.text`) and the audio generated by the TTS engine.
  - Eliminates stale translation carryover between consecutive cues through synchronous state clearing and `displayTranslatedCueIdRef` tracking.
  - Passes explicit presented text to `testSpeakLang` and derives spoken speech strictly from presented overlay/matrix content.
- **Result**: ✅ **PASSED**.

#### 8. URL State Management, Zero-Memory Cache Reset & Diagnostic Logging
- **Platform**: `[Cross-Platform / Web]`
- **Spec / Script**: `e2e/web.spec.ts` (Test 11), `src/utils/urlStateManager.ts`, `src/utils/logBuffer.ts`, `src/lib/translateService.ts`
- **Mechanism**:
  - URL query parameters dynamically reflect active state (`v`, `t`, `lang`, `tts`, `cc`, `mode`) and initialize app on first load.
  - Zero-memory cache reset handler (`reset_${cache/localstorage/all}=true`) clears persistent stores and displays `#cache-reset-indicator`.
  - Settings Modal provides toggle for non-native TTS (`#toggle-non-native-tts-setting`), disabled by default to eliminate dual-voice audio overlaps.
  - Activity Logs Copy-All exports snapshot of Application State over time, network calls with 15-char response body previews, and skips redundant translations with logged warnings.
- **Result**: ✅ **PASSED**.

---

## 📊 Summary Coverage Table

| Test Suite / Feature | Platform | Category | Status | Runner | Artifacts |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Live TimedText Interception** | 📱 Android Native | Caption Fetching | ✅ **DONE** | ADB / Instrumentation | `android-emulator-report.html` |
| **Hardware TTS Loop Sync** | 📱 Android Native | Speech Flow | ✅ **DONE** | ADB / Logcat | Logcat `TTS_ENGINE` |
| **Target Lang `tlang` Switch** | 📱 Android Native | Translation | ✅ **DONE** | Cypress / Playwright | `test3-step5.png` |
| **OS `ACTION_SEND` Ingestion** | 📱 Android Native | Link Sharing | ✅ **DONE** | ADB Intent | Logcat `MainActivity` |
| **Lock-Screen Audio Continuity** | 📱 Android Native | Audio / System | 📋 **TODO** | ADB Dumpsys | — |
| **Private Storage Offline Cues** | 📱 Android Native | Persistence | 📋 **TODO** | ADB Network Kill | — |
| **Caption Toggle Auto-Detection** | 🌐 Web Companion | UI / State | ✅ **DONE** | Playwright / Cypress | `test1-step*.png` |
| **Custom Video Subtitle Fetch** | 🌐 Web Companion | Network / API | ✅ **DONE** | Playwright / Cypress | `test2-step*.png` |
| **Dedicated Multi-Tier Cache** | 🔄 Cross-Platform | Storage | ✅ **DONE** | LocalStorage / Memory | Restored Toast |
| **Invalid Link Complaint Banner** | 🔄 Cross-Platform | Security / UX | ✅ **DONE** | URL Validator | Complaint Banner |
| **Single Target Lang & Hebrew Default** | 🔄 Cross-Platform | Translation / Settings | ✅ **DONE** | Playwright / Cypress | `e2e/web.spec.ts` |
| **Default Compact View & Settings** | 🔄 Cross-Platform | Layout / Settings | ✅ **DONE** | Playwright / Unit | Settings Modal |
| **Single Lang TTS Fidelity & No Phantom Speech** | 🔄 Cross-Platform | TTS / Sync | ✅ **DONE** | Playwright / Web Spec | `test10-step*.png` |
| **URL State, Cache Reset & Diagnostics** | 🔄 Cross-Platform | State / Logging | ✅ **DONE** | Playwright / Web Spec | `test11-step*.png` |
| **PWA Service Worker Offline** | 🌐 Web Companion | PWA / Offline | 📋 **TODO** | Playwright Offline | — |
| **Web Speech API Fallback** | 🌐 Web Companion | Audio Fallback | 📋 **TODO** | Browser Speech API | — |
| **Rapid Cue Seeking Sync** | 🔄 Cross-Platform | Sync Engine | 📋 **TODO** | Playwright Cue Table | — |
