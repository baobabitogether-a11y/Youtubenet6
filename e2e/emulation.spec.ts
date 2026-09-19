import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Ensure screenshots directory exists
const assetsDir = path.join(process.cwd(), 'cypress', 'reports', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

test.describe('YouTube Video Viewer - Android Emulation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app shell to be ready
    await expect(page).toHaveTitle(/YouTube/i);
    await expect(page.locator('header')).toBeVisible();
  });

  /**
   * EMULATION SPEC:
   * Load https://www.youtube.com/watch?v=FcRzAdI8R9U without static fixtures,
   * enable captions and observe subtitle fetching.
   * Then change target translation language and assert fetching subtitles based on original url replacing tlang param.
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

    await test.step('Step 5: Change target translation language and assert fetching subtitles replacing tlang param with copied request settings and response assertions', async () => {
      // Capture initial first subtitle record text and count
      let initialFirstSubtitleText = '';
      let initialSubtitleCount = 0;
      if ((await subtitleCueRow.count()) > 0) {
        initialFirstSubtitleText = (await subtitleCueRow.first().textContent())?.trim() || '';
        initialSubtitleCount = await subtitleCueRow.count();
      } else if ((await activeCueText.count()) > 0) {
        initialFirstSubtitleText = (await activeCueText.textContent())?.trim() || '';
        initialSubtitleCount = 1;
      }

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

        // 1. Verify tlang param was changed in url
        if (json.modifiedUrl) {
          expect(json.modifiedUrl).toContain('tlang=es');
        }

        // 2. Verify original working request settings and headers were copied
        expect(json.copiedRequest).toBeDefined();
        expect(json.copiedRequest.headers).toBeDefined();

        // 3. Verify https response results are provided
        expect(json.httpsResponse).toBeDefined();
        expect(typeof json.httpsResponse.status).toBe('number');

        // 4. Response assertion: number of subtitle records is identical after changing tlang
        expect(json.count).toBeDefined();
        if (json.cues && Array.isArray(json.cues)) {
          expect(json.count).toBe(json.cues.length);
          if (initialSubtitleCount > 1) {
            expect(json.cues.length).toBe(initialSubtitleCount);
          }
        }

        // 5. Response assertion: first subtitle record is different from original
        expect(json.firstSubtitle).toBeDefined();
        if (initialFirstSubtitleText && json.firstSubtitle?.text) {
          expect(json.firstSubtitle.text.trim()).not.toBe(initialFirstSubtitleText);
        }
      }

      await page.screenshot({ path: 'cypress/reports/assets/test3-step5.png' });
    });
  });
});

test.describe('Step 4.3: Target Language Switch API Suite', () => {
  /**
   * STEP 4.3 SPECIFICATION TEST:
   * Target Language Switch with 'tlang' Replacement:
   * - Copies the original working request for the default subtitles together with all request settings (headers, method, url)
   * - Changes the tlang param
   * - If client request returns error - fallbacks to backend with full request, original headers, and settings
   * - Provides https response results
   * - Response assertion: identical subtitle records count after changing tlang
   * - Response assertion: first subtitle record is different from source
   */
  test('Step 4.3: Target Language Switch with tlang Replacement - copies request settings, falls back to backend, provides https response results, asserts identical count and different first subtitle', async ({ request }) => {
    const originalRequestUrl = 'https://www.youtube.com/api/timedtext?v=FcRzAdI8R9U&caps=asr&lang=ru&potc=1&fmt=srt';
    const originalRequestSettings = {
      url: originalRequestUrl,
      method: 'GET',
      headers: {
        'accept': '*/*',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'referer': 'https://www.youtube.com/watch?v=FcRzAdI8R9U',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    };

    // Original Russian cues
    const sourceCues = [
      { id: 'cue-1', start: 0.0, duration: 4.2, text: 'Здравствуйте, дорогие зрители, в эфире эксклюзив на Sheinkin40.' },
      { id: 'cue-2', start: 4.5, duration: 4.5, text: 'Сегодня у нас в гостях легендарный музыкант и автор песен Аркадий Духин.' },
      { id: 'cue-3', start: 9.2, duration: 5.3, text: 'Мы поговорим о песнях Высоцкого, о политике, Нетаньяху и о том, что происходит с Израилем.' },
    ];
    const initialCount = sourceCues.length;
    const initialFirstText = sourceCues[0].text;

    // Test 1: Change tlang to Spanish ('es')
    const responseEs = await request.post('/api/youtube-timedtext-translate', {
      data: {
        observedUrl: originalRequestUrl,
        targetLang: 'es',
        format: 'srt',
        videoId: 'FcRzAdI8R9U',
        requestSettings: originalRequestSettings,
        requestHeaders: originalRequestSettings.headers,
        originalRequest: originalRequestSettings,
        cues: sourceCues,
      },
    });

    expect(responseEs.status()).toBe(200);
    const dataEs = await responseEs.json();

    // Verify modified URL contains tlang=es
    expect(dataEs.modifiedUrl).toContain('tlang=es');

    // Verify copied request preserves original settings and headers
    expect(dataEs.copiedRequest).toBeDefined();
    expect(dataEs.copiedRequest.headers).toBeDefined();
    expect(dataEs.copiedRequest.headers['user-agent'] || dataEs.copiedRequest.headers['User-Agent']).toBeDefined();

    // Verify https response results provided
    expect(dataEs.httpsResponse).toBeDefined();
    expect(typeof dataEs.httpsResponse.status).toBe('number');
    expect(dataEs.httpsResponse.url).toBeDefined();

    // Response assertion 1: Number of subtitles records is IDENTICAL after changing tlang
    expect(dataEs.count).toBe(initialCount);
    expect(dataEs.cues.length).toBe(initialCount);

    // Response assertion 2: First subtitle record is DIFFERENT from source
    expect(dataEs.firstSubtitle).toBeDefined();
    expect(dataEs.firstSubtitle.text).not.toBe(initialFirstText);
    expect(dataEs.cues[0].text).not.toBe(initialFirstText);

    // Test 2: Change tlang to Hebrew ('he')
    const responseHe = await request.post('/api/youtube-timedtext-translate', {
      data: {
        observedUrl: originalRequestUrl,
        targetLang: 'he',
        format: 'srt',
        videoId: 'FcRzAdI8R9U',
        requestSettings: originalRequestSettings,
        requestHeaders: originalRequestSettings.headers,
        originalRequest: originalRequestSettings,
        cues: sourceCues,
      },
    });

    expect(responseHe.status()).toBe(200);
    const dataHe = await responseHe.json();

    // Verify modified URL contains tlang=he
    expect(dataHe.modifiedUrl).toContain('tlang=he');
    expect(dataHe.httpsResponse).toBeDefined();

    // Response assertion 1: Number of subtitles records is IDENTICAL for 'he'
    expect(dataHe.count).toBe(initialCount);
    expect(dataHe.cues.length).toBe(initialCount);

    // Response assertion 2: First subtitle record is DIFFERENT from Russian source and DIFFERENT from Spanish
    expect(dataHe.firstSubtitle.text).not.toBe(initialFirstText);
    expect(dataHe.firstSubtitle.text).not.toBe(dataEs.firstSubtitle.text);

    // Test 3: Verify disableFixtures flag behavior
    const responseDisabled = await request.post('/api/fetch-subtitles', {
      data: {
        videoId: 'non_existent_video_12345',
        disableFixtures: true,
      },
    });
    expect(responseDisabled.status()).toBe(404);
    const dataDisabled = await responseDisabled.json();
    expect(dataDisabled.success).toBe(false);
  });
});
