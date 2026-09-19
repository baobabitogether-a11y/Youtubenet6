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

## 📁 Repository Documentation

- **[`PROMPT.md`](./PROMPT.md)**: Contains ONLY the latest user prompt converted into active TODO tasks.
- **[`CHANGELOG.md`](./CHANGELOG.md)**: Historical archive of all completed tasks, previous prompts, and release milestones.
- **[`AGENTS.md`](./AGENTS.md)**: Developer & coding agent guidelines, platform separation (Android native vs. scoped web companion), and file protection rules.
