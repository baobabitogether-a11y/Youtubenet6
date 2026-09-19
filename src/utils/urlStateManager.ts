/**
 * URL State & Cache Reset Manager
 * - Synchronizes active video, timestamp, target language, TTS, captions, and layout mode to URL params.
 * - Handles URL-driven zero-memory cache resets via `reset_${cache/localstorage/all/etc}=true`.
 */

import { validateYouTubeUrl, DEFAULT_VIDEO_ID, DEFAULT_VIDEO_URL } from './youtube';
import { clearSubtitleCache } from './subtitleCache';
import { logInfo, logWarn } from './logBuffer';

export interface UrlAppState {
  videoId?: string;
  url?: string;
  time?: number;
  targetLang?: string;
  autoTTS?: boolean;
  captionsEnabled?: boolean;
  mode?: 'compact' | 'expanded';
}

/**
 * Checks for any URL parameter starting with `reset_` or `reset=true`
 * and performs the corresponding storage/memory wipe for zero-memory testing.
 */
export function checkAndPerformUrlCacheReset(): { wasReset: boolean; resetKeys: string[] } {
  if (typeof window === 'undefined' || !window.location) {
    return { wasReset: false, resetKeys: [] };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const resetKeys: string[] = [];

    params.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      const lowerVal = value.toLowerCase();
      if (
        (lowerKey.startsWith('reset_') || lowerKey === 'reset') &&
        (lowerVal === 'true' || lowerVal === '1' || lowerVal === '')
      ) {
        resetKeys.push(key);
      }
    });

    if (resetKeys.length === 0) {
      return { wasReset: false, resetKeys: [] };
    }

    // Determine reset scope
    const isFullReset = resetKeys.some((k) => {
      const lk = k.toLowerCase();
      return (
        lk === 'reset' ||
        lk === 'reset_all' ||
        lk === 'reset_cache' ||
        lk === 'reset_storage' ||
        lk === 'reset_localstorage' ||
        lk === 'reset_localhost' ||
        lk === 'reset_memory'
      );
    });

    if (isFullReset) {
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
      clearSubtitleCache();
      logInfo(
        'System',
        `🧹 Full Zero-Memory Cache Reset triggered via URL [${resetKeys.join(', ')}]. All localStorage, sessionStorage, and memory caches wiped.`
      );
    } else {
      // Granular resets
      resetKeys.forEach((k) => {
        const lk = k.toLowerCase();
        if (lk.includes('subtitles') || lk.includes('captions')) {
          clearSubtitleCache();
          Object.keys(localStorage).forEach((storageKey) => {
            if (storageKey.startsWith('yt_subtitles_')) {
              localStorage.removeItem(storageKey);
            }
          });
          logInfo('System', `🧹 Subtitles Cache Reset via ${k}`);
        }
        if (lk.includes('settings')) {
          localStorage.removeItem('yt_app_settings_v1');
          logInfo('System', `🧹 Settings Reset via ${k}`);
        }
        if (lk.includes('library') || lk.includes('history')) {
          localStorage.removeItem('yt_video_library_v2');
          localStorage.removeItem('yt_video_history');
          logInfo('System', `🧹 Video Library Reset via ${k}`);
        }
      });
    }

    // Clean up reset params from current browser URL bar without page reload
    const cleanParams = new URLSearchParams(window.location.search);
    resetKeys.forEach((k) => cleanParams.delete(k));
    const newSearch = cleanParams.toString();
    const newRelativePathQuery = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState(null, '', newRelativePathQuery);

    return { wasReset: true, resetKeys };
  } catch (err) {
    console.warn('[UrlStateManager] Cache reset error:', err);
    return { wasReset: false, resetKeys: [] };
  }
}

/**
 * Parses initial application state from URL query parameters
 */
export function getAppStateFromUrl(): UrlAppState {
  if (typeof window === 'undefined') return {};

  try {
    const params = new URLSearchParams(window.location.search);
    const state: UrlAppState = {};

    // Video ID or URL
    const rawUrlOrId = params.get('url') || params.get('v') || params.get('video') || params.get('link') || params.get('text');
    if (rawUrlOrId) {
      const validation = validateYouTubeUrl(rawUrlOrId);
      if (validation.isValid && validation.parsed) {
        state.videoId = validation.parsed.videoId;
        state.url = rawUrlOrId.startsWith('http') ? rawUrlOrId : `https://www.youtube.com/watch?v=${validation.parsed.videoId}`;
      } else if (rawUrlOrId.length === 11 && !rawUrlOrId.includes(' ')) {
        state.videoId = rawUrlOrId;
        state.url = `https://www.youtube.com/watch?v=${rawUrlOrId}`;
      }
    }

    // Playback time
    const t = params.get('t') || params.get('time') || params.get('start');
    if (t) {
      const sec = parseFloat(t);
      if (!isNaN(sec) && sec >= 0) {
        state.time = sec;
      }
    }

    // Target Language
    const lang = params.get('lang') || params.get('tlang') || params.get('target');
    if (lang) {
      state.targetLang = lang.toLowerCase().trim();
    }

    // Auto-TTS
    const tts = params.get('tts') || params.get('speech');
    if (tts !== null) {
      state.autoTTS = tts === '1' || tts === 'true' || tts === 'on';
    }

    // Captions toggle
    const cc = params.get('cc') || params.get('captions') || params.get('subs');
    if (cc !== null) {
      state.captionsEnabled = cc === '1' || cc === 'true' || cc === 'on';
    }

    // Mode
    const mode = params.get('mode') || params.get('layout');
    if (mode === 'compact' || mode === 'expanded') {
      state.mode = mode;
    }

    return state;
  } catch (err) {
    console.warn('[UrlStateManager] Error parsing URL app state:', err);
    return {};
  }
}

let updateDebounceTimer: NodeJS.Timeout | null = null;

/**
 * Updates the current browser URL query parameters to reflect the active application state
 */
export function syncAppStateToUrl(state: {
  videoId?: string;
  url?: string;
  time?: number;
  targetLang?: string;
  autoTTS?: boolean;
  captionsEnabled?: boolean;
  mode?: 'compact' | 'expanded';
}): void {
  if (typeof window === 'undefined' || !window.location) return;

  if (updateDebounceTimer) {
    clearTimeout(updateDebounceTimer);
  }

  updateDebounceTimer = setTimeout(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      if (state.videoId) {
        params.set('v', state.videoId);
      }

      if (typeof state.time === 'number' && state.time > 0) {
        params.set('t', Math.floor(state.time).toString());
      } else {
        params.delete('t');
      }

      if (state.targetLang) {
        params.set('lang', state.targetLang);
      }

      if (state.autoTTS !== undefined) {
        if (state.autoTTS) {
          params.set('tts', '1');
        } else {
          params.delete('tts');
        }
      }

      if (state.captionsEnabled !== undefined) {
        if (!state.captionsEnabled) {
          params.set('cc', '0');
        } else {
          params.delete('cc');
        }
      }

      if (state.mode) {
        if (state.mode === 'expanded') {
          params.set('mode', 'expanded');
        } else {
          params.delete('mode'); // Compact is default
        }
      }

      const queryString = params.toString();
      const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '') + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    } catch {}
  }, 350);
}
