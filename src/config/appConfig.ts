import { LibraryVideoItem } from '../types';
import { FCRZADI8R9U_LANGUAGE_SRT_TRACKS, L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS } from '../../test/fixtures/defaultSubtitles';
import { EILFKSGNKDA_LANGUAGE_TRACKS } from '../../test/fixtures/eilfksgnkda';

/**
 * Global Application Configuration & Default Settings
 */

export const DEFAULT_VIDEO_ID = 'FcRzAdI8R9U';
export const DEFAULT_VIDEO_URL = `https://www.youtube.com/watch?v=${DEFAULT_VIDEO_ID}`;

export const SRT_DEMO_VIDEO_ID = 'FcRzAdI8R9U';
export const SRT_DEMO_VIDEO_URL = `https://www.youtube.com/watch?v=${SRT_DEMO_VIDEO_ID}`;

export const JSON3_DEMO_VIDEO_ID = 'L2Ryrr6txwA';
export const JSON3_DEMO_VIDEO_URL = `https://www.youtube.com/watch?v=${JSON3_DEMO_VIDEO_ID}`;

export const ANDROID_TEST_VIDEO_ID = 'HGEyIt2bMiE';
export const ANDROID_TEST_VIDEO_URL = `https://www.youtube.com/watch?v=${ANDROID_TEST_VIDEO_ID}`;

export const ME_AT_THE_ZOO_ID = 'jNQXAC9IVRw';
export const ME_AT_THE_ZOO_URL = `https://www.youtube.com/watch?v=${ME_AT_THE_ZOO_ID}`;

export const TUTORIAL_TEST_VIDEO_ID = 'c0pUbsq9FLk';
export const TUTORIAL_TEST_VIDEO_URL = `https://www.youtube.com/watch?v=${TUTORIAL_TEST_VIDEO_ID}`;

export const EILFKSGNKDA_VIDEO_ID = 'EILFkSGNkdA';
export const EILFKSGNKDA_VIDEO_URL = `https://www.youtube.com/watch?v=${EILFKSGNKDA_VIDEO_ID}`;

// Storage Keys
export const STORAGE_KEYS = {
  SUBTITLE_CACHE_PREFIX: 'yt_subtitles_',
  LIBRARY_STORAGE_KEY: 'yt_video_library_v2',
  LAST_ACTIVE_VIDEO_KEY: 'yt_last_active_video_v1',
  TIMEDTEXT_URL_PREFIX: 'yt_observed_timedtext_',
  SETTINGS_STORAGE_KEY: 'yt_app_settings_v4',
  VIDEO_SETTINGS_PREFIX: 'yt_vsettings_',
} as const;

// Default Library Items (with Authentic Russian Sheinkin40 SRT and JustinGuitar JSON3)
export const DEFAULT_LIBRARY_ITEMS: LibraryVideoItem[] = [
  {
    id: DEFAULT_VIDEO_ID,
    originalUrl: DEFAULT_VIDEO_URL,
    title: 'Authentic Russian Interview · SRT (Sheinkin40)',
    cues: FCRZADI8R9U_LANGUAGE_SRT_TRACKS.ru,
    timestamp: Date.now(),
  },
  {
    id: JSON3_DEMO_VIDEO_ID,
    originalUrl: JSON3_DEMO_VIDEO_URL,
    title: 'Guitar Lesson · JSON3 TimedText (JustinGuitar)',
    cues: L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS.en,
    timestamp: Date.now() + 1,
  },
  {
    id: ME_AT_THE_ZOO_ID,
    originalUrl: ME_AT_THE_ZOO_URL,
    title: 'Me at the zoo',
    cues: [
      { id: 'cue-1', start: 1.2, duration: 3.2, text: 'All right, so here we are in front of the elephants.' },
      { id: 'cue-2', start: 4.5, duration: 3.0, text: 'The cool thing about these guys is that...' },
      { id: 'cue-3', start: 7.6, duration: 3.5, text: '...they have really, really, really long trunks.' },
      { id: 'cue-4', start: 11.2, duration: 2.8, text: 'And that is cool.' },
      { id: 'cue-5', start: 14.1, duration: 4.2, text: 'And that is pretty much all there is to say.' },
    ],
    timestamp: Date.now() + 2,
  },
  {
    id: EILFKSGNKDA_VIDEO_ID,
    originalUrl: EILFKSGNKDA_VIDEO_URL,
    title: 'JSON3 Subtitle Demo (English + Hebrew)',
    cues: EILFKSGNKDA_LANGUAGE_TRACKS.en,
    timestamp: Date.now() + 3,
  },
];

// UI Text Constants (Labels, Messages, Toasts)
export const UI_TEXT = {
  APP_TITLE: 'YouTube Subtitle & Speech Flow Viewer',
  CAPTIONS_ON: 'CC: ON',
  CAPTIONS_OFF: 'Turn CC ON',
  DETECTING_SUBTITLES: 'Detecting subtitles...',
  FETCH_SUBTITLES: 'Fetch Subtitles / CC',
  BACK_CHANGE_VIDEO: 'Back / Change Video',
  CHANGE_TARGET_LANG: 'Change Target Language',
  SETTINGS: 'Settings',
  PLAY: 'Play',
  PAUSE: 'Pause',
  MUTE: 'Mute',
  UNMUTE: 'Unmute',
  RESTORED_CACHED_SUBTITLES: (count: number) => `Restored ${count} cached subtitles`,
  SAVED_SUBTITLES_TO_CACHE: (count: number) => `Saved ${count} subtitles to cache`,
  AUTO_DETECTED_SUBTITLES: (count: number) => `Auto-detected ${count} subtitles`,
  SUBTITLE_PLACEHOLDER_ACTIVE: 'Captions active • Spoken dialogue will appear here',
  SUBTITLE_PLACEHOLDER_OFF: 'Turn captions ON to detect dialogue',
  NON_YOUTUBE_LINK_WARNING: 'The shared link is not a YouTube URL. The app only accepts YouTube links (youtube.com, youtu.be, shorts, live, embed).',
  TLANG_FETCH_SUCCESS: (langs: string[]) => `Target translations (${langs.join(', ').toUpperCase()}) fetched via tlang`,
  TLANG_FETCH_PARTIAL: (succeeded: number, total: number) => `Target translations via tlang: ${succeeded}/${total} succeeded`,
  TLANG_FETCH_FAILED: 'Target translation via tlang was not available for this track',
} as const;
