# YouTube Subtitle & Speech Flow Viewer


[![Build & Release Android APK](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/release-apk.yml/badge.svg)](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/release-apk.yml)
[![Web E2E Tests](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/web.yml/badge.svg)](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/web.yml)
[![Android Emulator E2E Tests](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/emulation.yml/badge.svg)](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/emulation.yml)
[![Publish Web Demo](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/deploy-demo.yml/badge.svg)](https://github.com/baobabitogether-a11y/Youtubenet6/actions/workflows/deploy-demo.yml)

A dedicated Android native shell application for YouTube video learning with synchronized multi-language subtitles, native hardware TTS speech flow, and on-the-fly translation switching. Accompanied by a scoped web companion for automated CI/CD test drivers and live interactive demonstration.

---

## 📲 Install & Update Android APK via CLI

To download and install the latest `YouTube-Viewer-debug.apk` directly onto any connected Android device or emulator via ADB without cloning this repository or keeping local build files, run this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/baobabitogether-a11y/Youtubenet6/main/update.apk.sh | bash -s -- "https://github.com/baobabitogether-a11y/Youtubenet6/releases/latest/download/YouTube-Viewer-debug.apk"
```

### What this command does:
1. **Locates ADB**: Automatically detects `adb` across Windows (Git Bash / MSYS2 / CMD), macOS, and Linux.
2. **Downloads APK**: Streams the latest debug APK from the GitHub release to the local downloads folder.
3. **Installs onto Device**: Executes `adb install -r -d -t` targeting package `com.ytviewer.app` with multi-tiered fallback pipelines.
4. **Launches App**: Starts `com.ytviewer.app/.MainActivity` on the connected target device or emulator.

---

## 🌐 GitHub Pages Links

Access the live web demo, web end-to-end test runner, and Android emulator verification reports:

| Resource | Direct URL | Description |
| :--- | :--- | :--- |
| 🚀 **Web-App Demo Landing Page** | [**Open Live Web Demo**](https://baobabitogether-a11y.github.io/Youtubenet6/app/) | Standalone browser build with responsive playback controls, dual-language subtitles (`top`/`above`/`under`/`bottom`), and instant target language switching. |
| ⚡ **E2E Tests on Web (Cypress Runner)** | [**Open Cypress Runner**](https://baobabitogether-a11y.github.io/Youtubenet6/) | Interactive web test runner with DOM time-travel step inspection, pinned snapshots, video player with chapter markers, and test filters. |
| 📱 **E2E Tests on Android Emulator** | [**Open Android Emulator Report**](https://baobabitogether-a11y.github.io/Youtubenet6/android-emulator-report.html) | Standalone report verifying native WebView `shouldInterceptRequest` on Google Pixel 7 (Android 14 / API 34), Logcat audit, and hardware TTS loop verification. |
| 📱 **Android Emulation in Runner View** | [**Open in Runner (#android)**](https://baobabitogether-a11y.github.io/Youtubenet6/#android) | Direct tab switch inside the interactive Cypress runner dashboard. |
| 📋 **Mochawesome Test Report** | [**Open Mochawesome Report**](https://baobabitogether-a11y.github.io/Youtubenet6/mochawesome.html) | Suite breakdown, pass/fail metrics, step timing breakdown, and test assertion logs. |
| 🔍 **Playwright Trace Inspector** | [**Open Playwright Trace**](https://baobabitogether-a11y.github.io/Youtubenet6/playwright/index.html) | Network timeline, console events, and action waterfall inspector for web test execution. |

---

## 📁 Modular Architecture & Documentation

The project is governed by strict Markdown contracts that decouple visual view implementations from data acquisition and platform internals. Any view can be recreated or swapped using different tools and frameworks by following these specifications:

| Document | Purpose & Scope |
| :--- | :--- |
| **[`AGENTS.md`](./AGENTS.md)** | Core architectural foundation, pure view mandates, data-flow boundaries, and testing phases. |
| **[`ACTIONS.md`](./ACTIONS.md)** | GitHub Actions CI/CD guide: APK release, web testing, emulator pipelines, and artifact flow. |
| **[`LIBRARY.md`](./LIBRARY.md)** | Subtitle fixture library schema (`test/fixtures/<VIDEO_ID>/*.{json,srt}`), formats (SRT/JSON3), and verification. |
| **[`DESIGN_SUBTITLE_VIEWS.md`](./DESIGN_SUBTITLE_VIEWS.md)** | Replaceable view contract for subtitle renderers (injected cues, active state, intent dispatch). |
| **[`DESIGN_VIEW_LANGS.md`](./DESIGN_VIEW_LANGS.md)** | Replaceable view contract for language selectors (injected language options, selection dispatch). |
| **[`DESIGN_CONTROLS_VIEW.md`](./DESIGN_CONTROLS_VIEW.md)** | Replaceable view contract for media playback controls (injected playback metrics, intent callbacks). |
| **[`DESIGN_PLAYER_PROVIDER.md`](./DESIGN_PLAYER_PROVIDER.md)** | Vendor-agnostic media player controller and time-synchronization contract. |
| **[`DESIGN_STATE_COORDINATOR.md`](./DESIGN_STATE_COORDINATOR.md)** | Finite state machine, lifecycle transitions, active cue resolution, and state flow. |
| **[`SCHEMA_TIMEDTEXT.md`](./SCHEMA_TIMEDTEXT.md)** | Format definitions, segment timings, entity decoding, and RTL/BiDi normalization. |
| **[`DEBUG.md`](./DEBUG.md)** | Diagnostic log viewer, network interception, 15-char response preview, and AI troubleshooting prompt generator. |
| **[`PROMPT.md`](./PROMPT.md)** | Active user directive and current task tracker, rewritten in agent's own words. |
| **[`PROMPT_OLD.md`](./PROMPT_OLD.md)** | Historical archive of completed prompts and tasks. |
| **[`CHANGELOG.md`](./CHANGELOG.md)** | Milestone history and chronological release records. |

---

## 🏗️ Architectural Core: Pure Views & Dependency Injection

```text
[ Data Providers ] ──► [ Normalized Data ] ──► [ Pure Views ] ──► [ User Callbacks ]
   - Local Fixtures (Web)     - SubtitleCue[]       - Overlay        - onSelectCue
   - TimedText Hook (Android) - LanguageOption[]    - Transcript     - onSelectLanguage
```

1. **Pure Presentation**: Views never make network calls, read files, or parse raw timed-text files directly.
2. **Implementation Independent**: Any view can be replaced (e.g. replacing a complex transcript panel with a single-line overlay) without touching the data acquisition logic.
3. **Format Support**: Supports both **SubRip (`.srt`)** and **YouTube JSON3 (`.json`)**, preferring JSON3 for millisecond segment timing.

