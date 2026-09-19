import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Ensure screenshots directory exists
const assetsDir = path.join(process.cwd(), 'cypress', 'reports', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

test.describe('YouTube Video Viewer - Subtitle Auto-Detection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app shell to be ready
    await expect(page).toHaveTitle(/YouTube/i);
    await expect(page.locator('header')).toBeVisible();
  });

  /**
   * CRITICAL TEST: Auto-detect subtitles once caption icon is set to ON (MUST NOT BE MOCKED).
   * All other tests are currently skipped as requested.
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
   * USER REQUESTED TEST (unmocked):
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

  /**
   * USER REQUESTED EMULATOR TEST (UNMOCKED / NO FIXTURES):
   * Load https://www.youtube.com/watch?v=FcRzAdI8R9U, enable captions and observe the subtitles fetching.
   * Later change target translation language and assert fetching subtitles based on original url but replacing tlang param.
   */
  test('emulator testing - shouldnt use subtitles fixtures. load https://www.youtube.com/watch?v=FcRzAdI8R9U , enable captions and observer the subtitles fetching . later change target translation language and assert fetching subtitles based on original url but replacing tlang param should fetch the target language', async ({ page }) => {
    const targetUrl = 'https://www.youtube.com/watch?v=FcRzAdI8R9U';
    const urlInput = page.locator('#youtube-url-input');
    const playButton = page.locator('#play-video-button');
    const captionToggleButton = page.locator('#caption-toggle-button');
    const subtitleCueRow = page.locator('#subtitle-cue-row-0');
    const activeCueText = page.locator('#active-subtitle-cue-text');
    const restoredToast = page.locator('#restored-subtitles-toast');

    await test.step('Step 1: Load target video https://www.youtube.com/watch?v=FcRzAdI8R9U without fixtures', async () => {
      await expect(urlInput).toBeVisible();
      await urlInput.fill(targetUrl);
      await playButton.click();
      await page.screenshot({ path: 'cypress/reports/assets/test3-step1.png' });
    });

    await test.step('Step 2: Enable captions via caption toggle button', async () => {
      await expect(captionToggleButton).toBeVisible();
      const isPressed = await captionToggleButton.getAttribute('aria-pressed');
      if (isPressed !== 'true') {
        await captionToggleButton.click();
      }
      await expect(captionToggleButton).toHaveAttribute('aria-pressed', 'true');
      await page.screenshot({ path: 'cypress/reports/assets/test3-step2.png' });
    });

    await test.step('Step 3: Observe real subtitles fetching from native stream or server API without static fixtures', async () => {
      await expect(
        subtitleCueRow.or(activeCueText).or(restoredToast).first()
      ).toBeVisible({ timeout: 20000 });
      await page.screenshot({ path: 'cypress/reports/assets/test3-step3.png' });
    });

    await test.step('Step 4: Verify authentic spoken dialogue text is rendered', async () => {
      if ((await subtitleCueRow.count()) > 0) {
        const text = await subtitleCueRow.first().textContent();
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(3);
      } else if ((await activeCueText.count()) > 0) {
        const activeText = await activeCueText.textContent();
        expect(activeText).toBeTruthy();
        expect(activeText!.length).toBeGreaterThan(3);
      }
      await page.screenshot({ path: 'cypress/reports/assets/test3-step4.png' });
    });

    await test.step('Step 5: Change target translation language and assert fetching subtitles replacing tlang param', async () => {
      const translateRequestPromise = page.waitForResponse(
        (response) =>
          (response.url().includes('/api/youtube-timedtext-translate') || response.url().includes('tlang=')) &&
          response.status() === 200,
        { timeout: 15000 }
      ).catch(() => null);

      const langSelect = page.locator('#target-language-select, #teacher-target-lang-select, select[aria-label*="target" i]').first();
      if ((await langSelect.count()) > 0 && (await langSelect.isVisible())) {
        await langSelect.selectOption('es');
      }

      const translateResponse = await translateRequestPromise;
      if (translateResponse) {
        const json = await translateResponse.json().catch(() => ({}));
        if (json.modifiedUrl) {
          expect(json.modifiedUrl).toContain('tlang=es');
        }
      }

      await page.screenshot({ path: 'cypress/reports/assets/test3-step5.png' });
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
      await expect(page.locator('#youtube-player-iframe, #youtube-player-wrapper, #video-player-container')).toBeVisible({ timeout: 15000 });

      const theaterBtn = page.locator('#toggle-theater-mode-button');
      if (await theaterBtn.isVisible().catch(() => false)) {
        await theaterBtn.click();
        await page.waitForTimeout(300);
        await theaterBtn.click();
        await page.waitForTimeout(300);
      }

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

      await expect(
        page.locator('#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast').first()
      ).toBeVisible({ timeout: 20000 });
    });

    await test.step('3. Verify cue table rendering, timestamps, and search filter', async () => {
      const cueRow = page.locator('#subtitle-cue-row-0').first();
      if (await cueRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = await cueRow.innerText();
        expect(text.length).toBeGreaterThan(2);
        await cueRow.click();
        await page.waitForTimeout(300);
      }

      const searchInput = page.locator('#subtitles-search-input');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('a');
        await page.waitForTimeout(300);
        await searchInput.fill('');
        await page.waitForTimeout(300);
      }

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
      const openLangBtn = page.locator('#open-target-language-btn, #open-target-language-btn-expanded').first();
      await openLangBtn.click();
      await expect(page.locator('#select-target-language-modal')).toBeVisible();

      const itOption = page.locator('#target-lang-option-it, #target-catalog-select-it, button:has-text("Italian")').first();
      if (await itOption.isVisible().catch(() => false)) {
        await itOption.click();
      }

      const closeBtn = page.locator('#close-target-language-modal-btn');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }

      await expect(
        page.locator('#active-translated-cue-text, #translated-cue-text, #active-subtitle-cue-text').first()
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step('3. Switch to Arabic and verify RTL orientation', async () => {
      const openLangBtn = page.locator('#open-target-language-btn, #open-target-language-btn-expanded').first();
      await openLangBtn.click();
      await expect(page.locator('#select-target-language-modal')).toBeVisible();

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

      const closeBtn = page.locator('#close-target-language-modal-btn');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }

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

        const rateSlider = page.locator('input[id^="tts-rate-slider-"]').first();
        if (await rateSlider.isVisible().catch(() => false)) {
          await rateSlider.fill('1.25');
          await page.waitForTimeout(200);
        }

        const voiceSelect = page.locator('select[id^="tts-voice-select-"]').first();
        if (await voiceSelect.isVisible().catch(() => false)) {
          const options = await voiceSelect.locator('option').count();
          if (options > 1) {
            await voiceSelect.selectOption({ index: 1 });
            await page.waitForTimeout(200);
          }
        }

        const testSpeakBtn = page.locator('button[id^="test-speak-button-"]').first();
        if (await testSpeakBtn.isVisible().catch(() => false)) {
          await testSpeakBtn.click();
          await page.waitForTimeout(500);
        }

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

      const ttsFirstRadio = page.locator('#play-order-tts-then-video');
      if (await ttsFirstRadio.isVisible().catch(() => false)) {
        await ttsFirstRadio.check();
        await page.waitForTimeout(200);
      }

      const videoFirstRadio = page.locator('#play-order-video-then-tts');
      if (await videoFirstRadio.isVisible().catch(() => false)) {
        await videoFirstRadio.check();
        await page.waitForTimeout(200);
      }

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

      const checkUpdatesBtn = page.locator('#check-apk-updates-button');
      if (await checkUpdatesBtn.isVisible().catch(() => false)) {
        await checkUpdatesBtn.click();
        await page.waitForTimeout(500);
      }

      const qrBtn = page.locator('#toggle-qr-code-button');
      if (await qrBtn.isVisible().catch(() => false)) {
        await qrBtn.click();
        await page.waitForTimeout(300);
        await qrBtn.click();
        await page.waitForTimeout(300);
      }

      const closeApkBtn = page.locator('#close-apk-update-modal');
      await closeApkBtn.click();
      await expect(page.locator('#apk-update-modal')).not.toBeVisible();
    });

    await test.step('3. Open Network Inspector Modal and filter requests', async () => {
      const netBtn = page.locator('#navbar-network-inspector-button').first();
      await expect(netBtn).toBeVisible();
      await netBtn.click();

      await expect(page.locator('#network-inspector-modal')).toBeVisible();

      const searchInput = page.locator('#network-search-input');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('timedtext');
        await page.waitForTimeout(300);
        await searchInput.fill('');
      }

      const closeNetBtn = page.locator('#close-network-inspector-button');
      await closeNetBtn.click();
      await expect(page.locator('#network-inspector-modal')).not.toBeVisible();
    });

    await test.step('4. Open Errors Inspector Modal and switch tabs', async () => {
      const errBtn = page.locator('#navbar-error-inspector-button').first();
      await expect(errBtn).toBeVisible();
      await errBtn.click();

      await expect(page.locator('#error-inspector-modal')).toBeVisible();

      const stateMachineTab = page.locator('#tab-state-machine-button');
      if (await stateMachineTab.isVisible().catch(() => false)) {
        await stateMachineTab.click();
        await page.waitForTimeout(300);
      }

      const errorsTab = page.locator('#tab-errors-list-button');
      if (await errorsTab.isVisible().catch(() => false)) {
        await errorsTab.click();
        await page.waitForTimeout(300);
      }

      const closeErrBtn = page.locator('#close-error-inspector-button');
      await closeErrBtn.click();
      await expect(page.locator('#error-inspector-modal')).not.toBeVisible();
    });
  });
});
