import arSrt from './ar.srt?raw';
import enSrt from './en.srt?raw';
import heSrt from './he.srt?raw';
import itSrt from './it.srt?raw';
import ruSrt from './ru.srt?raw';

export const arSrtRaw: string = arSrt || '';
export const enSrtRaw: string = enSrt || '';
export const heSrtRaw: string = heSrt || '';
export const itSrtRaw: string = itSrt || '';
export const ruSrtRaw: string = ruSrt || '';

/**
 * Default favorite languages: ar, il, ru, it, he
 * Note: 'il', 'he', and 'iw' all map to the Hebrew subtitle fixture.
 */
export const DEFAULT_FAVORITE_LANGUAGES: string[] = ['ar', 'il', 'ru', 'it', 'he'];

export const SRT_RAW_MAP: Record<string, string> = {
  ar: arSrtRaw,
  en: enSrtRaw,
  he: heSrtRaw,
  iw: heSrtRaw,
  il: heSrtRaw,
  it: itSrtRaw,
  ru: ruSrtRaw,
};




/**
 * Normalizes language codes (handling 'il', 'he', 'iw', region tags like 'ar-SA', 'he-IL').
 */
export function normalizeLanguageCode(langCode: string): string {
  const clean = (langCode || '').toLowerCase().trim().split(/[-_]/)[0];
  if (clean === 'il' || clean === 'iw') return 'he';
  return clean;
}

/**
 * Gets the raw SRT string content for a given language code.
 */
export function getRawSrtForLanguage(langCode: string): string | null {
  const clean = normalizeLanguageCode(langCode);
  return SRT_RAW_MAP[clean] || SRT_RAW_MAP[langCode] || null;
}

/**
 * Checks if a language is in the favorite languages list and returns its authentic .srt content.
 * Specifically helps loading test/fixtures/languages/ar.srt if Arabic (ar) is included in favorite languages.
 */
export function loadSrtIfFavorite(
  langCode: string,
  favoriteLangs: string[] = DEFAULT_FAVORITE_LANGUAGES
): string | null {
  if (!langCode) return null;
  const clean = normalizeLanguageCode(langCode);
  const isFav = favoriteLangs.some((fav) => normalizeLanguageCode(fav) === clean);
  if (isFav) {
    return getRawSrtForLanguage(clean);
  }
  return null;
}

