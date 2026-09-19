/**
 * RTL (Right-to-Left) Utility Functions
 * Supports Hebrew, Arabic, Persian, Urdu, Yiddish, and text containing RTL unicode characters.
 */

// Known RTL ISO 639-1 language codes
export const RTL_LANG_CODES = new Set([
  'he', // Hebrew (modern)
  'iw', // Hebrew (legacy Java/Android/Google code)
  'il', // Hebrew / Israel alias
  'ar', // Arabic
  'fa', // Persian / Farsi
  'ur', // Urdu
  'yi', // Yiddish
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'ckb', // Central Kurdish (Sorani)
]);

// Regex matching Hebrew, Arabic, Persian, and other Right-to-Left Unicode character blocks
export const RTL_CHAR_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;

/**
 * Checks if a language code or text string is Right-to-Left (RTL)
 */
export function isRtl(lang?: string | null, text?: string | null): boolean {
  if (lang) {
    const cleanLang = lang.trim().toLowerCase().split(/[-_]/)[0];
    if (RTL_LANG_CODES.has(cleanLang)) {
      return true;
    }
  }

  if (text && typeof text === 'string') {
    return RTL_CHAR_REGEX.test(text);
  }

  return false;
}

/**
 * Returns HTML direction and Tailwind alignment classes for a given language or text
 */
export function getRtlAttributes(
  lang?: string | null,
  text?: string | null,
  options?: { centered?: boolean }
): {
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  alignClass: string;
} {
  const rtl = isRtl(lang, text);
  return {
    dir: rtl ? 'rtl' : 'ltr',
    isRtl: rtl,
    alignClass: rtl
      ? options?.centered
        ? 'text-center dir-rtl font-sans'
        : 'text-right dir-rtl font-sans'
      : options?.centered
      ? 'text-center'
      : 'text-left',
  };
}
