import { TargetLanguage, SyncPlayOrder } from '../types';

export interface VideoSettings {
  videoId: string;
  targetLanguages?: TargetLanguage[];
  playOrder?: SyncPlayOrder;
  sourceLang?: string;
  lastUpdated: number;
}

const SETTINGS_PREFIX = 'yt_video_settings_';

/**
 * Retrieve saved settings for a specific video ID
 */
export function getVideoSettings(videoId: string): VideoSettings | null {
  if (typeof window === 'undefined' || !videoId) return null;
  try {
    const raw = localStorage.getItem(`${SETTINGS_PREFIX}${videoId}`);
    if (!raw) return null;
    return JSON.parse(raw) as VideoSettings;
  } catch (err) {
    console.warn(`Failed to read settings for video ${videoId}:`, err);
    return null;
  }
}

/**
 * Save or update settings for a specific video ID
 */
export function saveVideoSettings(
  videoId: string,
  settings: {
    targetLanguages?: TargetLanguage[];
    playOrder?: SyncPlayOrder;
    sourceLang?: string;
  }
): void {
  if (typeof window === 'undefined' || !videoId) return;
  try {
    const existing = getVideoSettings(videoId) || {
      videoId,
      lastUpdated: Date.now(),
    };

    const updated: VideoSettings = {
      ...existing,
      ...settings,
      videoId,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(`${SETTINGS_PREFIX}${videoId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn(`Failed to save settings for video ${videoId}:`, err);
  }
}

/**
 * Delete settings for a video
 */
export function deleteVideoSettings(videoId: string): void {
  if (typeof window === 'undefined' || !videoId) return;
  try {
    localStorage.removeItem(`${SETTINGS_PREFIX}${videoId}`);
  } catch {
    // ignore
  }
}
