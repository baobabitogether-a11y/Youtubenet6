import { CaptionCue } from '../../src/types';
import { parseRawCaptionData } from '../../src/utils/captionParser';
import { ruSrtRaw, enSrtRaw, heSrtRaw, itSrtRaw, arSrtRaw } from './FcRzAdI8R9U/srtStrings';
import { L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS } from './L2Ryrr6txwA/jsonStrings';
import { EILFKSGNKDA_LANGUAGE_TRACKS } from './eilfksgnkda';

/**
 * @deprecated test/fixtures/subtitles.json is deprecated.
 * The application uses real authentic .srt fixtures from test/fixtures/FcRzAdI8R9U/
 * with language tracks for: it, ru, he, en, ar.
 */

// Parse real SRT subtitle fixtures for video FcRzAdI8R9U
const parsedRu = parseRawCaptionData(ruSrtRaw).cues;
const parsedEn = parseRawCaptionData(enSrtRaw).cues;
const parsedHe = parseRawCaptionData(heSrtRaw).cues;
const parsedIt = parseRawCaptionData(itSrtRaw).cues;
const parsedAr = parseRawCaptionData(arSrtRaw).cues;

export const DEFAULT_FAVORITE_LANGUAGES = ['ar', 'il', 'ru', 'it', 'he'];

export const FCRZADI8R9U_LANGUAGE_SRT_TRACKS: Record<string, CaptionCue[]> = {
  ru: parsedRu,
  en: parsedEn,
  he: parsedHe,
  iw: parsedHe,
  il: parsedHe,
  it: parsedIt,
  ar: parsedAr,
};

// Fallback cue definitions for legacy demo and test video IDs
const LEGACY_VIDEO_CUES: Record<string, CaptionCue[]> = {
  default: [
    { id: 'cue-1', start: 0.0, duration: 4.0, text: 'Welcome to this YouTube video presentation.' },
    { id: 'cue-2', start: 4.2, duration: 5.0, text: 'Follow along with the synchronized timed subtitles.' },
    { id: 'cue-3', start: 9.5, duration: 4.8, text: 'Click any word to look up translations and hear pronunciation.' },
    { id: 'cue-4', start: 14.5, duration: 5.5, text: 'Subtitles are automatically synchronized with the video playback.' },
    { id: 'cue-5', start: 20.2, duration: 4.5, text: 'Enjoy practicing and improving your language skills!' },
  ],
  jNQXAC9IVRw: [
    { id: 'cue-1', start: 1.2, duration: 3.2, text: 'All right, so here we are in front of the elephants.' },
    { id: 'cue-2', start: 4.5, duration: 3.0, text: 'The cool thing about these guys is that...' },
    { id: 'cue-3', start: 7.6, duration: 3.5, text: '...they have really, really, really long trunks.' },
    { id: 'cue-4', start: 11.2, duration: 2.8, text: 'And that is cool.' },
    { id: 'cue-5', start: 14.1, duration: 4.2, text: 'And that is pretty much all there is to say.' },
  ],
  c0pUbsq9FLk: [
    { id: 'cue-1', start: 0.5, duration: 3.5, text: 'Welcome to this video tutorial on language learning.' },
    { id: 'cue-2', start: 4.2, duration: 4.0, text: 'We will demonstrate real-time synchronized caption playback.' },
    { id: 'cue-3', start: 8.5, duration: 4.2, text: 'Text-to-speech audio pronounces each sentence with proper pacing.' },
    { id: 'cue-4', start: 13.0, duration: 3.8, text: 'Enjoy practicing your foreign language listening comprehension.' },
  ],
  HGEyIt2bMiE: [
    { id: 'cue-1', start: 0.8, duration: 3.8, text: 'Hello and welcome to this English language practice lesson.' },
    { id: 'cue-2', start: 4.8, duration: 4.2, text: 'In this lesson, we will focus on everyday conversational expressions.' },
    { id: 'cue-3', start: 9.2, duration: 4.5, text: 'Listen carefully to the pronunciation of each phrase.' },
    { id: 'cue-4', start: 14.0, duration: 3.5, text: 'Repeat each sentence after the speaker to improve fluency.' },
    { id: 'cue-5', start: 18.0, duration: 4.0, text: 'Great job, keep up the regular practice every day!' },
  ],
};

export const DEFAULT_MOCKED_SUBTITLES: Record<string, CaptionCue[]> = {
  ...LEGACY_VIDEO_CUES,
  FcRzAdI8R9U: parsedRu,
  L2Ryrr6txwA: L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS.en,
  EILFkSGNkdA: EILFKSGNKDA_LANGUAGE_TRACKS.en,
};

export { L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS };

export function getMockedSubtitlesForVideo(videoId: string): CaptionCue[] {
  if (videoId === 'FcRzAdI8R9U') {
    return parsedRu;
  }
  if (videoId === 'L2Ryrr6txwA') {
    return L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS.en;
  }
  if (videoId === 'EILFkSGNkdA') {
    return EILFKSGNKDA_LANGUAGE_TRACKS.en;
  }
  if (DEFAULT_MOCKED_SUBTITLES[videoId]) {
    return DEFAULT_MOCKED_SUBTITLES[videoId];
  }
  return DEFAULT_MOCKED_SUBTITLES['default'];
}

export function getCachedSrtForVideoAndLanguage(videoId: string, langCode: string): CaptionCue[] | null {
  if (videoId === 'FcRzAdI8R9U' || !videoId) {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';
    return FCRZADI8R9U_LANGUAGE_SRT_TRACKS[clean] || null;
  }
  if (videoId === 'L2Ryrr6txwA') {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';
    return L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS[clean] || null;
  }
  if (videoId === 'EILFkSGNkdA') {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';
    return EILFKSGNKDA_LANGUAGE_TRACKS[clean] || null;
  }
  return null;
}

export function hasCachedSrtForVideoAndLanguage(videoId: string, langCode: string): boolean {
  if (videoId === 'FcRzAdI8R9U' || !videoId) {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';
    return !!FCRZADI8R9U_LANGUAGE_SRT_TRACKS[clean];
  }
  if (videoId === 'L2Ryrr6txwA') {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';
    return !!L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS[clean];
  }
  if (videoId === 'EILFkSGNkdA') {
    let clean = (langCode || '').toLowerCase().split(/[-_]/)[0];
    if (clean === 'iw' || clean === 'il') clean = 'he';
    return !!EILFKSGNKDA_LANGUAGE_TRACKS[clean];
  }
  return false;
}

export function getAllCachedLanguageCodesForVideo(videoId: string): string[] {
  if (videoId === 'FcRzAdI8R9U' || !videoId) {
    return ['ar', 'il', 'ru', 'it', 'he', 'en'];
  }
  if (videoId === 'L2Ryrr6txwA') {
    return ['en', 'ru', 'he', 'it', 'ar'];
  }
  if (videoId === 'EILFkSGNkdA') {
    return ['en', 'he', 'iw'];
  }
  return [];
}

