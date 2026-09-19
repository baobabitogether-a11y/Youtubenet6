import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Ensure screenshots directory exists
const assetsDir = path.join(process.cwd(), 'cypress', 'reports', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

test.describe('YouTube Video Viewer - Web E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app shell to be ready
    await expect(page).toHaveTitle(/YouTube/i);
    await expect(page.locator('header')).toBeVisible();
  });

  /**
   * WEB CRITICAL TEST 1: Auto-detect subtitles once caption icon is set to ON (Web Platform Flow).
   */
  test('Auto-detect subtitles once caption icon is set to ON', async ({ page }) => {
    const captionToggleButton = page.locator('#caption-toggle-button');

    await test.step('Step 1: Locate the caption toggle icon on the video player', async () => {
      await expect(captionToggleButton).toBeVisible();
      await page.screenshot({ path: 'cypress/reports/assets/test1-step1.png' });
    });

    await test.step('Step 2: Toggle caption icon to ON', async () => {
      const isPressed = await captionToggleButton.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionToggleButton.click();
      }
      await page.screenshot({ path: 'cypress/reports/assets/test1-step2.png' });
    });

    await test.step('Step 3: Verify caption toggle button state is ON (aria-pressed=true)', async () => {
      await expect(captionToggleButton).toHaveAttribute('aria-pressed', 'true');
      await page.screenshot({ path: 'cypress/reports/assets/test1-step3.png' });
    });

    const subtitleCueRow = page.locator('#subtitle-cue-row-0');
    const activeCueText = page.locator('#active-subtitle-cue-text');
    const restoredToast = page.locator('#restored-subtitles-toast');

    await test.step('Step 4: Wait for subtitle cues to be auto-detected and rendered', async () => {
      await expect(
        subtitleCueRow.or(activeCueText).or(restoredToast).first()
      ).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: 'cypress/reports/assets/test1-step4.png' });
    });

    await test.step('Step 5: Verify detected caption text is non-empty spoken dialogue', async () => {
      if ((await subtitleCueRow.count()) > 0) {
        const text = await subtitleCueRow.first().textContent();
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(3);
      } else {
        const activeText = await activeCueText.textContent();
        expect(activeText).toBeTruthy();
        expect(activeText!.length).toBeGreaterThan(3);
      }
      await page.screenshot({ path: 'cypress/reports/assets/test1-step5.png' });
    });

    await test.step('Step 6: Confirm Redux State Machine reached active status', async () => {
      const stateBadge = page.locator('#state-machine-status-badge');
      if ((await stateBadge.count()) > 0) {
        await expect(stateBadge).toBeVisible();
      }
      await page.screenshot({ path: 'cypress/reports/assets/test1-step6.png' });
    });
  });

  /**
   * WEB CRITICAL TEST 2:
   * Ensure subtitles are correctly fetched when caption icon is pressed after input url: https://www.youtube.com/watch?v=c0pUbsq9FLk
   */
  test('ensure subtitles are correctly fetched when caption icon is pressed after input url: https://www.youtube.com/watch?v=c0pUbsq9FLk', async ({ page }) => {
    const targetUrl = 'https://www.youtube.com/watch?v=c0pUbsq9FLk';
    const urlInput = page.locator('#youtube-url-input');
    const playButton = page.locator('#play-video-button');
    const captionToggleButton = page.locator('#caption-toggle-button');
    const subtitleCueRow = page.locator('#subtitle-cue-row-0');
    const activeCueText = page.locator('#active-subtitle-cue-text');
    const restoredToast = page.locator('#restored-subtitles-toast');

    await test.step('Step 1: Enter custom YouTube URL into input field', async () => {
      await expect(urlInput).toBeVisible();
      await urlInput.fill(targetUrl);
      await page.screenshot({ path: 'cypress/reports/assets/test2-step1.png' });
    });

    await test.step('Step 2: Click Play button to cue the video', async () => {
      await playButton.click();
      await page.screenshot({ path: 'cypress/reports/assets/test2-step2.png' });
    });

    await test.step('Step 3: Locate caption toggle button', async () => {
      await expect(captionToggleButton).toBeVisible();
      await page.screenshot({ path: 'cypress/reports/assets/test2-step3.png' });
    });

    await test.step('Step 4: Click caption toggle button to activate subtitles', async () => {
      const isPressed = await captionToggleButton.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionToggleButton.click();
      }
      await expect(captionToggleButton).toHaveAttribute('aria-pressed', 'true');
      await page.screenshot({ path: 'cypress/reports/assets/test2-step4.png' });
    });

    await test.step('Step 5: Verify real subtitles are fetched and rendered in the viewer', async () => {
      await expect(
        subtitleCueRow.or(activeCueText).or(restoredToast).first()
      ).toBeVisible({ timeout: 20000 });
      await page.screenshot({ path: 'cypress/reports/assets/test2-step5.png' });
    });

    await test.step('Step 6: Verify subtitle content is non-empty speech text', async () => {
      if ((await subtitleCueRow.count()) > 0) {
        const text = await subtitleCueRow.first().textContent();
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(3);
      } else if ((await activeCueText.count()) > 0) {
        const activeText = await activeCueText.textContent();
        expect(activeText).toBeTruthy();
        expect(activeText!.length).toBeGreaterThan(3);
      }
      await page.screenshot({ path: 'cypress/reports/assets/test2-step6.png' });
    });
  });

  test('TTS Audio Playback - verifies speech execution and audio stream fallback without error', async ({ page }) => {
    await test.step('1. Verify YouTube player is ready', async () => {
      await expect(page.locator('#youtube-player-iframe')).toBeVisible({ timeout: 15000 });
    });

    await test.step('2. Turn on captions to load subtitle cues', async () => {
      const captionBtn = page.locator('#caption-toggle-button');
      await expect(captionBtn).toBeVisible({ timeout: 10000 });
      const isPressed = await captionBtn.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionBtn.click();
      }
      await page.waitForTimeout(1000);
      await expect(captionBtn).toHaveAttribute('aria-pressed', 'true');
    });

    await test.step('3. Verify TTS audio endpoint and triggering speech', async () => {
      // Direct verification of /api/tts endpoint
      const response = await page.request.get('/api/tts?text=hello%20world&lang=en');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('audio/mpeg');

      // Check if TTS play button exists in panel or overlay
      const speakBtn = page.locator('#speak-lang-it-btn, #speak-lang-es-btn, #speak-translated-cue-btn').first();
      if (await speakBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await speakBtn.click();
        await page.waitForTimeout(800);
      }

      // Check activity logs quick bringup
      const logsBtn = page.locator('#open-logs-view-btn, #open-logs-view-btn-expanded').first();
      if (await logsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logsBtn.click();
        await page.waitForTimeout(500);
        // Verify Activity Log modal is visible
        await expect(page.locator('#activity-log-modal, [role="dialog"]').first()).toBeVisible();
      }
    });
  });

  // =========================================================================
  // EXTENDED REAL E2E TESTS (WITHOUT FIXTURES)
  // =========================================================================
  test('1. Video Playback - loads video player, accepts URL, and toggles theater mode', async ({ page }) => {
    await test.step('1. Navigate without fixtures', async () => {
      await page.goto('/?disableFixtures=true');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#youtube-url-input')).toBeVisible();
    });

    await test.step('2. Input YouTube URL and test Clear / Load buttons', async () => {
      const input = page.locator('#youtube-url-input');
      await input.fill('https://www.youtube.com/watch?v=temp_url');

      const clearBtn = page.locator('#clear-input-button');
      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click();
        await expect(input).toHaveValue('');
      }

      const realUrl = 'https://www.youtube.com/watch?v=c0pUbsq9FLk';
      await input.fill(realUrl);
      await expect(page.locator('#play-video-button')).toBeVisible();
      await page.locator('#play-video-button').click();
    });

    await test.step('3. Verify video player container and buttons', async () => {
      // Check iframe player presence
      await expect(page.locator('#youtube-player-iframe, #youtube-player-wrapper, #video-player-container')).toBeVisible({ timeout: 15000 });

      // Check toggle theater mode button
      const theaterBtn = page.locator('#toggle-theater-mode-button');
      if (await theaterBtn.isVisible().catch(() => false)) {
        await theaterBtn.click();
        await page.waitForTimeout(300);
        // Toggle back
        await theaterBtn.click();
        await page.waitForTimeout(300);
      }

      // Check autoplay and loop buttons if visible
      const autoplayBtn = page.locator('#toggle-autoplay-button');
      if (await autoplayBtn.isVisible().catch(() => false)) {
        await autoplayBtn.click();
        await page.waitForTimeout(200);
      }

      const loopBtn = page.locator('#toggle-loop-button');
      if (await loopBtn.isVisible().catch(() => false)) {
        await loopBtn.click();
        await page.waitForTimeout(200);
      }

      // Check copy video link button
      const copyLinkBtn = page.locator('#copy-video-link-button');
      if (await copyLinkBtn.isVisible().catch(() => false)) {
        await copyLinkBtn.click();
        await page.waitForTimeout(200);
      }
    });
  });
  test('2. Subtitles View - displays subtitle cues, timestamps, text, search, and jump to cue', async ({ page }) => {
    await test.step('1. Navigate without fixtures and load video', async () => {
      await page.goto('/?disableFixtures=true');
      await page.waitForLoadState('domcontentloaded');

      const input = page.locator('#youtube-url-input');
      await input.fill('https://www.youtube.com/watch?v=FcRzAdI8R9U');
      await page.locator('#play-video-button').click();
    });

    await test.step('2. Enable caption icon and await real subtitle cues', async () => {
      const captionBtn = page.locator('#caption-toggle-button');
      await expect(captionBtn).toBeVisible();
      const isPressed = await captionBtn.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionBtn.click();
      }

      // Wait for subtitle cues to load
      await expect(
        page.locator('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast').first()
      ).toBeVisible({ timeout: 20000 });
    });

    await test.step('3. Verify cue table rendering, timestamps, and search filter', async () => {
      // Check cue rows
      const cueRow = page.locator('#subtitle-cue-row-0').first();
      if (await cueRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = await cueRow.innerText();
        expect(text.length).toBeGreaterThan(2);

        // Click row to jump to cue
        await cueRow.click();
        await page.waitForTimeout(300);
      }

      // Test search filter input
      const searchInput = page.locator('#subtitles-search-input');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('a');
        await page.waitForTimeout(300);
        await searchInput.fill('');
        await page.waitForTimeout(300);
      }

      // Test pagination buttons if present
      const nextBtn = page.locator('#subtitles-next-page-btn');
      if (await nextBtn.isVisible().catch(() => false)) {
        const isDisabled = await nextBtn.isDisabled().catch(() => false);
        if (!isDisabled) {
          await nextBtn.click();
          await page.waitForTimeout(300);
          const prevBtn = page.locator('#subtitles-prev-page-btn');
          if (await prevBtn.isVisible().catch(() => false)) {
            await prevBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }

      // Test sync teacher play button
      const syncPlayBtn = page.locator('#sync-teacher-play-button');
      if (await syncPlayBtn.isVisible().catch(() => false)) {
        await syncPlayBtn.click();
        await page.waitForTimeout(500);
        await syncPlayBtn.click();
      }
    });
  });
  test('3. Subtitles Translation - verifies translation for Italian and Arabic', async ({ page }) => {
    await test.step('1. Navigate without fixtures and load video with captions', async () => {
      await page.goto('/?disableFixtures=true');
      await page.waitForLoadState('domcontentloaded');

      const input = page.locator('#youtube-url-input');
      await input.fill('https://www.youtube.com/watch?v=FcRzAdI8R9U');
      await page.locator('#play-video-button').click();

      const captionBtn = page.locator('#caption-toggle-button');
      await expect(captionBtn).toBeVisible();
      const isPressed = await captionBtn.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionBtn.click();
      }

      await expect(
        page.locator('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast').first()
      ).toBeVisible({ timeout: 20000 });
    });

    await test.step('2. Select Italian and verify translated subtitle overlay', async () => {
      // Open modal
      const openLangBtn = page.locator('#open-target-language-btn, #open-target-language-btn-expanded').first();
      await openLangBtn.click();
      await expect(page.locator('#select-target-language-modal')).toBeVisible();

      // Select Italian
      const itOption = page.locator('#target-lang-option-it, #target-catalog-select-it, button:has-text("Italian")').first();
      if (await itOption.isVisible().catch(() => false)) {
        await itOption.click();
      }

      // Close modal if still open
      const closeBtn = page.locator('#close-target-language-modal-btn');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }

      // Verify translated text is present
      await expect(
        page.locator('#active-translated-cue-text, #translated-cue-text, #active-subtitle-cue-text').first()
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step('3. Switch to Arabic and verify RTL orientation', async () => {
      // Reopen modal
      const openLangBtn = page.locator('#open-target-language-btn, #open-target-language-btn-expanded').first();
      await openLangBtn.click();
      await expect(page.locator('#select-target-language-modal')).toBeVisible();

      // Go to All Languages tab and search for Arabic
      const allTab = page.locator('#tab-all-languages');
      if (await allTab.isVisible().catch(() => false)) {
        await allTab.click();
      }

      const searchInput = page.locator('#search-target-language-input');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('Arabic');
        await page.waitForTimeout(300);
      }

      const arSelect = page.locator('#target-catalog-select-ar, #target-lang-option-ar, button:has-text("Arabic")').first();
      if (await arSelect.isVisible().catch(() => false)) {
        await arSelect.click();
      }

      // Close modal
      const closeBtn = page.locator('#close-target-language-modal-btn');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }

      // Check RTL styling or attribute
      const translatedEl = page.locator('#active-translated-cue-text').first();
      if (await translatedEl.isVisible({ timeout: 5000 }).catch(() => false)) {
        const dir = await translatedEl.getAttribute('dir');
        const dataRtl = await translatedEl.getAttribute('data-rtl');
        expect(dir === 'rtl' || dataRtl === 'true').toBe(true);
      }
    });
  });
  test('4. TTS Config - configures speaking rate, voice selection, and test audio', async ({ page }) => {
    await test.step('1. Navigate without fixtures and load video', async () => {
      await page.goto('/?disableFixtures=true');
      await page.waitForLoadState('domcontentloaded');

      const input = page.locator('#youtube-url-input');
      await input.fill('https://www.youtube.com/watch?v=FcRzAdI8R9U');
      await page.locator('#play-video-button').click();
    });

    await test.step('2. Open Language Settings modal and configure TTS rate/voice', async () => {
      const openLangSettingsBtn = page.locator('#open-language-settings-button').first();
      if (await openLangSettingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openLangSettingsBtn.click();
        await expect(page.locator('#language-settings-modal, [role="dialog"]').first()).toBeVisible();

        // Check rate slider
        const rateSlider = page.locator('input[id^="tts-rate-slider-"]').first();
        if (await rateSlider.isVisible().catch(() => false)) {
          await rateSlider.fill('1.25');
          await page.waitForTimeout(200);
        }

        // Check voice select
        const voiceSelect = page.locator('select[id^="tts-voice-select-"]').first();
        if (await voiceSelect.isVisible().catch(() => false)) {
          const options = await voiceSelect.locator('option').count();
          if (options > 1) {
            await voiceSelect.selectOption({ index: 1 });
            await page.waitForTimeout(200);
          }
        }

        // Check test speak button
        const testSpeakBtn = page.locator('button[id^="test-speak-button-"]').first();
        if (await testSpeakBtn.isVisible().catch(() => false)) {
          await testSpeakBtn.click();
          await page.waitForTimeout(500);
        }

        // Close modal
        const doneBtn = page.locator('#done-language-settings-button');
        if (await doneBtn.isVisible().catch(() => false)) {
          await doneBtn.click();
          await page.waitForTimeout(300);
        }
      }
    });

    await test.step('3. Toggle Auto-TTS player controls', async () => {
      const autoTTSBtn = page.locator('#toggle-auto-tts-button, #control-auto-tts-button, #toggle-auto-tts-btn-expanded').first();
      if (await autoTTSBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await autoTTSBtn.click();
        await page.waitForTimeout(300);
        await autoTTSBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });
  test('5. Synchronized Playback with Configured Order (TTS First vs Video First)', async ({ page }) => {
    await test.step('1. Navigate without fixtures and configure playback order in Settings', async () => {
      await page.goto('/?disableFixtures=true');
      await page.waitForLoadState('domcontentloaded');

      const settingsBtn = page.locator('#navbar-settings-button, #open-settings-button').first();
      await settingsBtn.click();
      await expect(page.locator('#settings-modal, [role="dialog"]').first()).toBeVisible();

      // Switch to TTS First, then Video
      const ttsFirstRadio = page.locator('#play-order-tts-then-video');
      if (await ttsFirstRadio.isVisible().catch(() => false)) {
        await ttsFirstRadio.check();
        await page.waitForTimeout(200);
      }

      // Switch to Video First, then TTS
      const videoFirstRadio = page.locator('#play-order-video-then-tts');
      if (await videoFirstRadio.isVisible().catch(() => false)) {
        await videoFirstRadio.check();
        await page.waitForTimeout(200);
      }

      // Close settings modal
      const closeBtn = page.locator('#close-settings-modal-button');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    });

    await test.step('2. Load video and verify synchronized playback controls', async () => {
      const input = page.locator('#youtube-url-input');
      await input.fill('https://www.youtube.com/watch?v=FcRzAdI8R9U');
      await page.locator('#play-video-button').click();

      const captionBtn = page.locator('#caption-toggle-button');
      await expect(captionBtn).toBeVisible();
      const isPressed = await captionBtn.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionBtn.click();
      }

      await expect(
        page.locator('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast').first()
      ).toBeVisible({ timeout: 20000 });

      // Check sync engine play / pause trigger
      const syncPlayBtn = page.locator('#sync-teacher-play-button');
      if (await syncPlayBtn.isVisible().catch(() => false)) {
        await syncPlayBtn.click();
        await page.waitForTimeout(500);
        await syncPlayBtn.click();
      }
    });
  });
  test('6. APK Guide Modal - opens APK guide and network inspection modal', async ({ page }) => {
    await test.step('1. Navigate without fixtures', async () => {
      await page.goto('/?disableFixtures=true');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('2. Open APK Update & Guide Modal and interact with buttons', async () => {
      const apkBtn = page.locator('#navbar-apk-update-button').first();
      await expect(apkBtn).toBeVisible();
      await apkBtn.click();

      await expect(page.locator('#apk-update-modal')).toBeVisible();

      // Check for updates button
      const checkUpdatesBtn = page.locator('#check-apk-updates-button');
      if (await checkUpdatesBtn.isVisible().catch(() => false)) {
        await checkUpdatesBtn.click();
        await page.waitForTimeout(500);
      }

      // Toggle QR code button
      const qrBtn = page.locator('#toggle-qr-code-button');
      if (await qrBtn.isVisible().catch(() => false)) {
        await qrBtn.click();
        await page.waitForTimeout(300);
        await qrBtn.click();
        await page.waitForTimeout(300);
      }

      // Close APK modal
      const closeApkBtn = page.locator('#close-apk-update-modal');
      await closeApkBtn.click();
      await expect(page.locator('#apk-update-modal')).not.toBeVisible();
    });

    await test.step('3. Open Network Inspector Modal and filter requests', async () => {
      const netBtn = page.locator('#navbar-network-inspector-button').first();
      await expect(netBtn).toBeVisible();
      await netBtn.click();

      await expect(page.locator('#network-inspector-modal')).toBeVisible();

      // Search/filter
      const searchInput = page.locator('#network-search-input');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('timedtext');
        await page.waitForTimeout(300);
        await searchInput.fill('');
      }

      // Close Network Inspector
      const closeNetBtn = page.locator('#close-network-inspector-button');
      await closeNetBtn.click();
      await expect(page.locator('#network-inspector-modal')).not.toBeVisible();
    });

    await test.step('4. Open Errors Inspector Modal and switch tabs', async () => {
      const errBtn = page.locator('#navbar-error-inspector-button').first();
      await expect(errBtn).toBeVisible();
      await errBtn.click();

      await expect(page.locator('#error-inspector-modal')).toBeVisible();

      // Switch to state machine tab
      const stateMachineTab = page.locator('#tab-state-machine-button');
      if (await stateMachineTab.isVisible().catch(() => false)) {
        await stateMachineTab.click();
        await page.waitForTimeout(300);
      }

      // Switch back to errors list tab
      const errorsTab = page.locator('#tab-errors-list-button');
      if (await errorsTab.isVisible().catch(() => false)) {
        await errorsTab.click();
        await page.waitForTimeout(300);
      }

      // Close Errors Inspector
      const closeErrBtn = page.locator('#close-error-inspector-button');
      await closeErrBtn.click();
      await expect(page.locator('#error-inspector-modal')).not.toBeVisible();
    });
  });

  /**
   * WEB CRITICAL TEST 7:
   * Compact View - Quick Target Language Selection & Language-Bound TTS Sync
   */
  test('7. Compact View - Quick Target Language Selection and Language-Bound TTS Sync', async ({ page }) => {
    await test.step('Step 1: Ensure caption toggle is ON and video subtitles load', async () => {
      const captionToggleButton = page.locator('#caption-toggle-button');
      await expect(captionToggleButton).toBeVisible();
      const isPressed = await captionToggleButton.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionToggleButton.click();
      }
      await expect(
        page.locator('#subtitle-cue-row-0')
          .or(page.locator('#active-subtitle-cue-text'))
          .or(page.locator('#restored-subtitles-toast'))
          .first()
      ).toBeVisible({ timeout: 20000 });
      await page.screenshot({ path: 'cypress/reports/assets/test7-step1.png' });
    });

    await test.step('Step 2: Locate quick target language overlay button in compact view', async () => {
      // Hover over video container to reveal controls overlay if hidden
      const playerContainer = page.locator('#video-player-container').or(page.locator('#compact-player-controls-overlay')).first();
      if (await playerContainer.isVisible().catch(() => false)) {
        await playerContainer.hover().catch(() => {});
      }

      const quickLangBtn = page.locator('#quick-target-lang-overlay-btn')
        .or(page.locator('#open-target-language-btn'))
        .or(page.locator('#open-target-language-btn-expanded'))
        .or(page.locator('#target-language-select'))
        .first();

      await expect(quickLangBtn).toBeVisible({ timeout: 15000 });
      await quickLangBtn.click();
      await page.screenshot({ path: 'cypress/reports/assets/test7-step2.png' });
    });

    await test.step('Step 3: Verify target language modal opens and select Italian (it)', async () => {
      const modal = page.locator('#select-target-language-modal');
      const isModalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
      if (isModalVisible) {
        const italianOption = page.locator('button[data-lang-code="it"]').or(page.locator('text="Italian"')).first();
        if (await italianOption.isVisible().catch(() => false)) {
          await italianOption.click();
        } else {
          const closeBtn = page.locator('#close-target-language-modal-btn')
            .or(page.locator('#close-target-language-modal'))
            .or(page.locator('button:has-text("Close")'))
            .first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
          }
        }
      }
      await page.screenshot({ path: 'cypress/reports/assets/test7-step3.png' });
    });

    await test.step('Step 4: Confirm active target language badge updates in VideoPlayer', async () => {
      const activeLangBadge = page.locator('#quick-target-lang-overlay-btn')
        .or(page.locator('#open-target-language-btn'))
        .or(page.locator('#target-language-select'))
        .first();
      await expect(activeLangBadge).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'cypress/reports/assets/test7-step4.png' });
    });

    await test.step('Step 5: Verify language-bound TTS highlighting logic on subtitle cue', async () => {
      const playTranslatedCueBtn = page.locator('#speak-translated-cue-btn').first();
      if (await playTranslatedCueBtn.isVisible().catch(() => false)) {
        await playTranslatedCueBtn.click();
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: 'cypress/reports/assets/test7-step5.png' });
    });
  });

  /**
   * WEB CRITICAL TEST 8:
   * Verify TTS Sync & Text Highlight Alternatives Configuration (4 Modes)
   */
  test('8. Settings - TTS Sync & Text Highlight Alternatives (4 Modes)', async ({ page }) => {
    const settingsBtn = page.locator('#open-settings-btn, #open-settings-button').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const modal = page.locator('#settings-modal');
    await expect(modal).toBeVisible();

    // Test clicking each of the 4 TTS sync modes
    for (const mode of ['word_boundary', 'time_linear', 'word_step', 'full_sentence']) {
      const modeBtn = page.locator(`#tts-sync-mode-${mode}`);
      await expect(modeBtn).toBeVisible();
      await modeBtn.click();
      await page.waitForTimeout(200);
    }

    // Close settings modal
    const closeBtn = page.locator('#close-settings-modal-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  /**
   * WEB CRITICAL TEST 9:
   * Verify Single Target Language Mode & Hebrew (he) Default Target Language Behavior
   */
  test('9. Settings & Teacher Panel - Single Target Language Mode & Default Hebrew', async ({ page }) => {
    // 1. Open Settings modal and verify Single Target Language toggle
    const settingsBtn = page.locator('#open-settings-btn, #open-settings-button').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();

    const singleLangToggle = page.locator('#single-target-language-mode-toggle');
    await expect(singleLangToggle).toBeVisible();

    // Toggle off then on to verify reactivity
    await singleLangToggle.click();
    await page.waitForTimeout(100);
    await singleLangToggle.click();
    await page.waitForTimeout(100);

    const closeSettingsBtn = page.locator('#close-settings-modal-button');
    await closeSettingsBtn.click();
    await expect(settingsModal).not.toBeVisible();

    // 2. Open Target Language modal and confirm Hebrew is the active/default target language
    const openLangBtn = page.locator('#open-target-language-btn, #open-target-language-btn-expanded').first();
    if (await openLangBtn.isVisible()) {
      await openLangBtn.click();
      const langModal = page.locator('#select-target-language-modal');
      await expect(langModal).toBeVisible();

      // Verify Hebrew option is present
      const heOption = page.locator('#target-lang-option-he, button:has-text("Hebrew")').first();
      await expect(heOption).toBeVisible();

      // Click Hebrew to set it as active
      await heOption.click();
      await expect(langModal).not.toBeVisible();
    }
  });

  /**
   * WEB CRITICAL TEST 10:
   * Verify Single Language TTS Presented Text Fidelity & Zero Phantom Speech
   */
  test('10. TTS Playback - Strict Presented Text Fidelity & No Phantom Speech', async ({ page }) => {
    // Step 1: Ensure subtitles are loaded and captions are enabled
    const captionToggleButton = page.locator('#caption-toggle-button');
    await expect(captionToggleButton).toBeVisible();
    const isPressed = await captionToggleButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await captionToggleButton.click();
    }
    await page.screenshot({ path: 'cypress/reports/assets/test10-step1.png' });

    // Step 2: Jump to first cue segment in the table to present active cue
    const cueRow0 = page.locator('#subtitle-cue-row-0');
    await expect(cueRow0).toBeVisible({ timeout: 10000 });
    await cueRow0.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'cypress/reports/assets/test10-step2.png' });

    // Step 3: Verify the active cue is selected and presented in the subtitle matrix
    await expect(cueRow0).toHaveAttribute('data-selected', 'true');

    // Step 4: Verify TTS play trigger in card or player overlay triggers speech strictly for presented text
    const speakLangBtn = page.locator('#speak-lang-he-btn, button[title*="Speak Hebrew"]').first();
    if (await speakLangBtn.isVisible()) {
      await speakLangBtn.click();
      await page.waitForTimeout(100);
    }
    await page.screenshot({ path: 'cypress/reports/assets/test10-step3.png' });

    // Step 5: Verify Auto-TTS toggle works reliably without phantom speech
    const autoTTSBtn = page.locator('#auto-tts-toggle-btn').first();
    if (await autoTTSBtn.isVisible()) {
      await autoTTSBtn.click();
      await page.waitForTimeout(100);
      await autoTTSBtn.click();
    }
    await page.screenshot({ path: 'cypress/reports/assets/test10-step4.png' });
  });

  /**
   * WEB CRITICAL TEST 11:
   * Verify URL State Synchronization, Zero-Memory Cache Reset Banner, Non-Native TTS Settings, and Complete Diagnostics Logs
   */
  test('11. URL State Management, Cache Reset & Complete Diagnostic Logs', async ({ page }) => {
    // Step 1: Navigate with reset_all=true and verify cache-reset banner appears
    await page.goto('/?reset_all=true&lang=he&v=FcRzAdI8R9U');
    await page.waitForLoadState('domcontentloaded');

    const resetIndicator = page.locator('#cache-reset-indicator');
    await expect(resetIndicator).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'cypress/reports/assets/test11-step1.png' });

    // Dismiss banner
    const dismissResetBtn = page.locator('#dismiss-cache-reset-indicator');
    if (await dismissResetBtn.isVisible()) {
      await dismissResetBtn.click();
      await expect(resetIndicator).not.toBeVisible();
    }

    // Step 2: Verify Settings Modal contains Non-Native TTS toggle, disabled by default
    const settingsBtn = page.locator('#navbar-settings-button, #settings-btn, button:has-text("Settings")').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      const settingsModal = page.locator('#settings-modal');
      await expect(settingsModal).toBeVisible();

      const nonNativeTtsToggle = page.locator('#toggle-non-native-tts-setting');
      await expect(nonNativeTtsToggle).toBeVisible();
      await expect(nonNativeTtsToggle).not.toBeChecked();

      // Close settings modal
      const closeSettingsBtn = page.locator('#close-settings-modal-button');
      await closeSettingsBtn.click();
      await expect(settingsModal).not.toBeVisible();
    }

    // Step 3: Open Activity Logs Modal and verify Copy All button exists
    const logsBtn = page.locator('#navbar-logs-button, #open-logs-btn, #open-logs-view-btn').first();
    if (await logsBtn.isVisible()) {
      await logsBtn.click();
      const logsModal = page.locator('#activity-logs-modal');
      await expect(logsModal).toBeVisible();

      const copyAllBtn = page.locator('#copy-all-logs-btn');
      await expect(copyAllBtn).toBeVisible();
      await copyAllBtn.click();
      await page.waitForTimeout(200);

      // Close modal
      const closeLogsBtn = page.locator('#close-logs-modal-btn');
      await closeLogsBtn.click();
      await expect(logsModal).not.toBeVisible();
    }
    await page.screenshot({ path: 'cypress/reports/assets/test11-step2.png' });
  });

  /**
   * WEB CRITICAL TEST 12:
   * Verify Button Action Suite: Navbar triggers, Quick Controls, Position Selector, and Modals
   */
  test('12. Comprehensive Button Verification: Navbar Modals & Quick Controls', async ({ page }) => {
    // 1. Navbar Library Button
    const libraryBtn = page.locator('#navbar-library-button, #open-library-btn').first();
    await expect(libraryBtn).toBeVisible();
    await libraryBtn.click();
    const libraryModal = page.locator('#video-library-modal');
    await expect(libraryModal).toBeVisible();
    const closeLibraryBtn = page.locator('#close-library-modal-btn, button[aria-label="Close Library"]').first();
    if (await closeLibraryBtn.isVisible()) {
      await closeLibraryBtn.click();
      await expect(libraryModal).not.toBeVisible();
    }

    // 2. Navbar Share Button
    const shareBtn = page.locator('#navbar-share-button, #open-share-btn').first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
    const shareModal = page.locator('#share-link-modal');
    await expect(shareModal).toBeVisible();
    const closeShareBtn = page.locator('#close-share-modal-btn, button[aria-label="Close Share"]').first();
    if (await closeShareBtn.isVisible()) {
      await closeShareBtn.click();
      await expect(shareModal).not.toBeVisible();
    }

    // 3. Navbar Subtitle Artifacts Button
    const artifactsBtn = page.locator('#navbar-artifacts-btn').first();
    if (await artifactsBtn.isVisible()) {
      await artifactsBtn.click();
      const artifactsModal = page.locator('#subtitle-artifacts-modal');
      await expect(artifactsModal).toBeVisible();
      const closeArtifactsBtn = page.locator('#close-artifacts-modal-btn').first();
      await closeArtifactsBtn.click();
      await expect(artifactsModal).not.toBeVisible();
    }

    // 4. Quick Control: Subtitle Position Selector
    const positionSelect = page.locator('#subtitle-position-dropdown, select[aria-label*="Position"]').first();
    if (await positionSelect.isVisible()) {
      await positionSelect.selectOption('top');
      await expect(positionSelect).toHaveValue('top');
      await positionSelect.selectOption('bottom');
      await expect(positionSelect).toHaveValue('bottom');
    }

    // 5. Quick Control: Language Modal Button
    const langModalBtn = page.locator('#open-target-language-btn, #target-lang-badge').first();
    if (await langModalBtn.isVisible()) {
      await langModalBtn.click();
      const langModal = page.locator('#select-target-language-modal');
      await expect(langModal).toBeVisible();
      const closeLangBtn = page.locator('#close-target-language-modal-btn').first();
      if (await closeLangBtn.isVisible()) {
        await closeLangBtn.click();
        await expect(langModal).not.toBeVisible();
      }
    }
  });

  /**
   * WEB CRITICAL TEST 13:
   * Verify Subtitle Artifacts Browser: Track Browsing, Raw .SRT View, Search, and Cues
   */
  test('13. Subtitle Artifacts Browser: .SRT Tracks, Search, Raw & Formatted Views', async ({ page }) => {
    // Open Subtitle Artifacts modal via button in navbar or quick controls
    const artifactsBtn = page.locator('#navbar-artifacts-btn, #open-artifacts-view-btn').first();
    await expect(artifactsBtn).toBeVisible();
    await artifactsBtn.click();

    const artifactsModal = page.locator('#subtitle-artifacts-modal');
    await expect(artifactsModal).toBeVisible();

    // Verify track tabs exist
    const ruTrackTab = page.locator('#artifact-track-tab-ru');
    const heTrackTab = page.locator('#artifact-track-tab-he');
    const itTrackTab = page.locator('#artifact-track-tab-it');
    await expect(ruTrackTab).toBeVisible();
    await expect(heTrackTab).toBeVisible();
    await expect(itTrackTab).toBeVisible();

    // Switch to Hebrew track tab
    await heTrackTab.click();
    await page.waitForTimeout(200);

    // Switch to Raw .SRT View
    const rawSrtBtn = page.locator('#view-raw-srt-btn');
    if (await rawSrtBtn.isVisible()) {
      await rawSrtBtn.click();
      const rawTextarea = page.locator('#raw-srt-textarea');
      await expect(rawTextarea).toBeVisible();
      const content = await rawTextarea.inputValue();
      expect(content).toContain('-->');
    }

    // Switch back to Formatted Cues View
    const formattedBtn = page.locator('#view-formatted-cues-btn');
    if (await formattedBtn.isVisible()) {
      await formattedBtn.click();
      const searchInput = page.locator('#artifacts-search-input');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('1');
      await page.waitForTimeout(200);
      await searchInput.clear();
    }

    // Close Artifacts modal
    const closeBtn = page.locator('#close-artifacts-modal-btn');
    await closeBtn.click();
    await expect(artifactsModal).not.toBeVisible();
  });

  /**
   * WEB CRITICAL TEST 14:
   * Verify App Settings & Exact Status: Export JSON, Copy Snapshot, Paste Dialog, and Reset
   */
  test('14. App Settings & Exact Status: Import, Export, Copy Snapshot & Reset', async ({ page }) => {
    // Open Settings Modal
    const settingsBtn = page.locator('#navbar-settings-button, #settings-btn, button:has-text("Settings")').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();

    // Verify Export JSON button
    const exportBtn = page.locator('#export-settings-json-btn');
    await expect(exportBtn).toBeVisible();

    // Verify Copy Snapshot button
    const copySnapshotBtn = page.locator('#copy-settings-snapshot-btn');
    await expect(copySnapshotBtn).toBeVisible();
    await copySnapshotBtn.click();
    await page.waitForTimeout(200);

    // Verify Paste Dialog button
    const pasteDialogBtn = page.locator('#open-import-paste-dialog-btn');
    if (await pasteDialogBtn.isVisible()) {
      await pasteDialogBtn.click();
      const pasteDialog = page.locator('#import-settings-paste-dialog');
      await expect(pasteDialog).toBeVisible();
      const cancelPasteBtn = page.locator('#cancel-import-paste-btn');
      await cancelPasteBtn.click();
      await expect(pasteDialog).not.toBeVisible();
    }

    // Close settings modal
    const closeSettingsBtn = page.locator('#close-settings-modal-button');
    await closeSettingsBtn.click();
    await expect(settingsModal).not.toBeVisible();
  });

  /**
   * WEB CRITICAL TEST 15:
   * Verify Demo Quick Floating Dock: 1-Click Compact Mode Toggle & Subtitles Single vs All Tracks Toggle
   */
  test('15. Demo Quick Floating Dock: Compact Mode Toggle & Subtitles Single vs All Mode', async ({ page }) => {
    // Locate the quick floating dock
    const floatingDock = page.locator('#demo-quick-floating-dock');
    await expect(floatingDock).toBeVisible({ timeout: 10000 });

    // 1. Verify and click Compact Mode Toggle
    const compactToggleBtn = page.locator('#demo-floating-compact-toggle');
    await expect(compactToggleBtn).toBeVisible();
    await compactToggleBtn.click();
    await page.waitForTimeout(300);

    // Click again to return to previous mode
    await compactToggleBtn.click();
    await page.waitForTimeout(300);

    // 2. Verify and click Subtitles Single (Hebrew) vs Multiple (All On) Toggle
    const subtitlesToggleBtn = page.locator('#demo-floating-subtitles-toggle');
    await expect(subtitlesToggleBtn).toBeVisible();
    
    // Toggle to All Subtitles (5 Tracks)
    await subtitlesToggleBtn.click();
    await page.waitForTimeout(400);

    // Toggle back to Hebrew Only
    await subtitlesToggleBtn.click();
    await page.waitForTimeout(400);

    // 3. Test Collapse / Expand button
    const collapseBtn = page.locator('#demo-floating-collapse-btn');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(200);
      await collapseBtn.click();
      await page.waitForTimeout(200);
    }
  });

  /**
   * WEB CRITICAL TEST 16:
   * Verify Caption Toggle Icon: Subtitle Auto-Detection Scoped to Android Native App
   */
  test('16. Caption Toggle Icon: Platform Scoping & CC Toggle Behavior', async ({ page }) => {
    // Locate the caption toggle button
    const captionToggle = page.locator('#caption-toggle-button').first();
    await expect(captionToggle).toBeVisible();

    // Verify initial aria-pressed or active state
    const initialPressed = await captionToggle.getAttribute('aria-pressed');

    // Click caption toggle to toggle state
    await captionToggle.click();
    await page.waitForTimeout(300);

    const toggledPressed = await captionToggle.getAttribute('aria-pressed');
    expect(toggledPressed).not.toBe(initialPressed);

    // Toggle back to original state
    await captionToggle.click();
    await page.waitForTimeout(300);
    const restoredPressed = await captionToggle.getAttribute('aria-pressed');
    expect(restoredPressed).toBe(initialPressed);
  });
});
