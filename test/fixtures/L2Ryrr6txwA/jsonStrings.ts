import { CaptionCue } from '../../../src/types';
import { parseRawCaptionData } from '../../../src/utils/captionParser';

import arJsonRaw from './ar.json?raw';
import enJsonRaw from './en.json?raw';
import heJsonRaw from './he.json?raw';
import itJsonRaw from './it.json?raw';
import ruJsonRaw from './ru.json?raw';

export const JSON3_RAW_MAP: Record<string, string> = {
  ar: arJsonRaw || '',
  en: enJsonRaw || '',
  he: heJsonRaw || '',
  iw: heJsonRaw || '',
  il: heJsonRaw || '',
  it: itJsonRaw || '',
  ru: ruJsonRaw || '',
};

// Parse JSON3 timed-text subtitle fixtures for video L2Ryrr6txwA
const parsedAr = parseRawCaptionData(arJsonRaw || '').cues;
const parsedEn = parseRawCaptionData(enJsonRaw || '').cues;
const parsedHe = parseRawCaptionData(heJsonRaw || '').cues;
const parsedIt = parseRawCaptionData(itJsonRaw || '').cues;
const parsedRu = parseRawCaptionData(ruJsonRaw || '').cues;

export const L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS: Record<string, CaptionCue[]> = {
  ar: parsedAr,
  en: parsedEn,
  he: parsedHe,
  iw: parsedHe,
  il: parsedHe,
  it: parsedIt,
  ru: parsedRu,
};

export function getRawJson3ForLanguage(langCode: string): string | null {
  const clean = (langCode || '').toLowerCase().trim().split(/[-_]/)[0];
  if (clean === 'il' || clean === 'iw') return JSON3_RAW_MAP['he'] || null;
  return JSON3_RAW_MAP[clean] || JSON3_RAW_MAP[langCode] || null;
}
