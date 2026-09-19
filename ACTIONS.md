# GitHub Actions CI/CD Architecture (ACTIONS.md)

This document describes the automated GitHub Actions pipelines in `.github/workflows/`, their triggers, execution order, artifacts, and how they reinforce the project's modular architecture.

---

## 1. Overview of Workflows

The repository uses automated GitHub Actions workflows to build, test, and release both the browser companion and the Android native host.

```text
[Push / Pull Request / Manual Dispatch]
   │
   ├─── 1. release-apk.yml ───► Builds Web UI & Packages Android Debug APK
   │         │
   │         ├───► 2. deploy-demo.yml ───► Publishes Web App & Reports to GitHub Pages
   │         │          │
   │         │          └───► 3. web.yml ───► Runs Web E2E (Playwright & Cypress)
   │         │
   │         └───► 4. emulation.yml ──► Runs Android Emulator E2E on macOS (Deferred)
   │
   └─── 5. update-readme.yml ──► Synchronizes Fork / Owner Identity in README
```

---

## 2. Workflow Specifications

### 2.1 Build & Release Android APK (`release-apk.yml`)
- **Trigger**: Pushes to `main`/`master`, version tags (`v*`), or manual `workflow_dispatch`.
- **Primary Tasks**:
  1. Compiles the web companion frontend using `npm run build`.
  2. Copies compiled web assets into the Android native host (`android-shell/app/src/main/assets/`).
  3. Sets up Java 17 and executes Gradle debug compilation (`./gradlew assembleDebug`).
  4. Generates SHA-256 checksums for the compiled APK.
  5. Publishes a GitHub Release with the downloadable `YouTube-Viewer-debug.apk` and archives the `youtube-viewer-apks` and `web-dist` artifacts.

### 2.2 Publish Web Demo to GitHub Pages (`deploy-demo.yml`)
- **Trigger**: Automatic completion of `release-apk.yml`, pushes to `main`/`master`, or manual `workflow_dispatch`.
- **Primary Tasks**:
  1. Obtains or builds the web companion static distribution files.
  2. Executes `scripts/prepare-report.mjs` to structure demo and test report directories.
  3. Deploys static files to the `gh-pages` branch and configures native GitHub Pages hosting.

### 2.3 Web End-to-End Tests (`web.yml`)
- **Trigger**: Automatic completion of `deploy-demo.yml`, pull requests, or manual `workflow_dispatch`.
- **Primary Tasks**:
  1. Checks if the live GitHub Pages deployment is reachable; if not, spins up a local server (`http://localhost:3000`).
  2. Runs Playwright end-to-end specifications (`npx playwright test e2e/web.spec.ts`).
  3. Runs Cypress test suites with the Mochawesome reporter (`npm run test:cy:report:web`).
  4. Archives Playwright and Cypress test traces, video recordings, and screenshots.
  5. Updates test output on `gh-pages`.

### 2.4 Android Emulator End-to-End Tests (`emulation.yml`)
- **Trigger**: Automatic completion of `release-apk.yml`, pull requests, or manual `workflow_dispatch`.
- **Runner**: `macos-14` (utilizes native hardware virtualization).
- **Primary Tasks**:
  1. Downloads the pre-built APK from `release-apk.yml` (skipping redundant compilation).
  2. Boots an Android 14 (API 34) arm64-v8a emulator using `reactivecircus/android-emulator-runner`.
  3. Installs the APK via ADB, launches `com.ytviewer.app/.MainActivity` with a YouTube URL intent, captures screen buffer (`screencap`), dumps Logcat logs, and executes `scripts/generate-android-report.mjs`.
  4. Generates an interactive HTML emulator verification report and publishes it to `gh-pages`.
  > **Note**: Android emulator testing is designated for later phases. It is decoupled from the current web companion implementation phase.

### 2.5 Ensure README Fork & Owner Sync (`update-readme.yml`)
- **Trigger**: Pushes affecting `README.md`, `scripts/update-readme.mjs`, or workflow definitions.
- **Primary Tasks**:
  1. Executes `scripts/update-readme.mjs` to detect the current GitHub repository owner and name.
  2. Dynamically rewrites badge URLs, download links, and GitHub Pages paths so that forks point to their own repository resources rather than the upstream template.
  3. Automatically commits and pushes changes back to the branch.

---

## 3. How Actions Enforce Architectural Modularity

1. **Separation of Platform Gates**:
   - Web companion builds and tests (`web.yml`) do not require Android SDKs, emulators, or native compilation.
   - Native Android builds (`release-apk.yml`) treat the web companion as pre-compiled static assets injected into `android-shell/app/src/main/assets/`.
2. **Artifact-Driven Pipelines**:
   - Workflows pass compiled output (`web-dist`, `youtube-viewer-apks`) as discrete GitHub artifacts rather than recompiling source code at each stage.
3. **Reproducible Test Verification**:
   - All tests run against either the live deployed GitHub Pages site or standardized Node.js fixtures, verifying that presentation contracts remain functional regardless of build environment.
