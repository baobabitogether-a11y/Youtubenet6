import { CaptionCue } from '../types';

/**
 * Caption Parser Utility
 * Parses raw YouTube caption data in SRT, VTT, XML (timedtext), and JSON3 formats.
 * Also provides encoding fixup, base64 decoding, timestamp formatting, and export helpers.
 */

export interface ParsedCaptionResult {
  format: 'srt' | 'vtt' | 'xml' | 'json3' | 'unknown';
  cues: CaptionCue[];
}

// ─── Encoding Helpers ───────────────────────────────────────────

export function decodeBase64ToUtf8(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return base64;
  }
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': '\u00A0',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&laquo;': '«',
  '&raquo;': '»',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&deg;': '°',
  '&para;': '¶',
  '&middot;': '·',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
};

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  let result = text;
  // Named entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.split(entity).join(char);
  }
  // Numeric entities: &#1234; or &#x4D2;
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}

export function fixMojibake(text: string): string {
  if (!text) return '';
  // Detect common UTF-8 mojibake patterns and attempt to fix
  // Pattern: text that was UTF-8 but decoded as Latin-1/Windows-1252
  try {
    // Check if text contains typical mojibake indicators
    if (/Ã[\u0080-\u00BF]|Â\u00A0|Ã\u00A0/.test(text)) {
      // Re-encode as Latin-1 then decode as UTF-8
      const bytes = new Uint8Array(text.length);
      let byteLen = 0;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 256) {
          bytes[byteLen++] = code;
        } else {
          // Can't fix this with simple re-encoding
          return decodeHtmlEntities(text);
        }
      }
      const fixed = new TextDecoder('utf-8').decode(bytes.subarray(0, byteLen));
      return decodeHtmlEntities(fixed);
    }
  } catch {}
  return decodeHtmlEntities(text);
}

export function cleanAndFixEncoding(text: string): string {
  if (!text) return '';
  let result = text;
  // Fix double-encoded HTML entities
  result = result.replace(/&amp;(amp|lt|gt|quot|#39|apos|nbsp);/g, '&$1;');
  // Fix mojibake
  result = fixMojibake(result);
  // Decode remaining HTML entities
  result = decodeHtmlEntities(result);
  // Normalize whitespace
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove zero-width characters
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  return result.trim();
}

// ─── Timestamp Helpers ──────────────────────────────────────────

export function formatTimestamp(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function srtTimestampToSeconds(ts: string): number {
  const match = ts.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  return (
    parseInt(match[1]) * 3600 +
    parseInt(match[2]) * 60 +
    parseInt(match[3]) +
    parseInt(match[4]) / 1000
  );
}

function secondsToSrtTimestamp(seconds: number): string {
  const ms = Math.round((seconds % 1) * 1000);
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function secondsToVttTimestamp(seconds: number): string {
  const ms = Math.round((seconds % 1) * 1000);
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// ─── SRT Parser ─────────────────────────────────────────────────

function parseSrt(raw: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const blocks = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // First line might be an index number; find the timestamp line
    let tsLineIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      tsLineIdx = 1;
    }

    const tsMatch = lines[tsLineIdx]?.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!tsMatch) continue;

    const start = srtTimestampToSeconds(tsMatch[1]);
    const end = srtTimestampToSeconds(tsMatch[2]);
    const textLines = lines.slice(tsLineIdx + 1);
    const text = cleanAndFixEncoding(textLines.join('\n'));
    if (!text) continue;

    cues.push({
      id: `cue-${cues.length + 1}`,
      start,
      duration: Math.max(0.5, end - start),
      text,
    });
  }

  return cues;
}

// ─── VTT Parser ─────────────────────────────────────────────────

function parseVtt(raw: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  // Remove WEBVTT header
  const body = raw.replace(/^WEBVTT.*\n/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = body.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let tsLineIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      tsLineIdx = 1;
    }

    const tsMatch = lines[tsLineIdx]?.match(
      /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/
    );
    if (!tsMatch) continue;

    const start = srtTimestampToSeconds(tsMatch[1].replace('.', ','));
    const end = srtTimestampToSeconds(tsMatch[2].replace('.', ','));
    const text = cleanAndFixEncoding(lines.slice(tsLineIdx + 1).join('\n'));
    if (!text) continue;

    cues.push({
      id: `cue-${cues.length + 1}`,
      start,
      duration: Math.max(0.5, end - start),
      text,
    });
  }

  return cues;
}

// ─── XML TimedText Parser ────────────────────────────────────────

function parseXmlTimedText(raw: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  // Match <text start="..." dur="...">...</text> elements
  const regex = /<text\s+([^>]+)>([\s\S]*?)<\/text>/g;
  let match;
  let idx = 0;

  while ((match = regex.exec(raw)) !== null) {
    const attrs = match[1];
    const innerText = match[2];
    idx++;

    const startMatch = attrs.match(/start="([\d.]+)"/);
    const durMatch = attrs.match(/dur="([\d.]+)"/);
    if (!startMatch) continue;

    const start = parseFloat(startMatch[1]);
    const duration = durMatch ? parseFloat(durMatch[1]) : 2.0;
    const text = cleanAndFixEncoding(innerText);

    if (!text) continue;
    cues.push({
      id: `cue-${idx}`,
      start,
      duration: Math.max(0.5, duration),
      text,
    });
  }

  return cues;
}

// ─── JSON3 Parser ────────────────────────────────────────────────
// YouTube JSON3 format:
// { "events": [ { "tStartMs": 0, "dDurationMs": 4000, "segs": [{ "utf8": "text" }] } ] }

function parseJson3(raw: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.events)) return cues;

    for (let i = 0; i < data.events.length; i++) {
      const event = data.events[i];
      if (!event) continue;

      const startMs = event.tStartMs ?? 0;
      const durMs = event.dDurationMs ?? 2000;
      const start = startMs / 1000;
      const duration = durMs / 1000;

      // Build text from segments
      let text = '';
      if (Array.isArray(event.segs)) {
        text = event.segs
          .map((seg: any) => (seg && typeof seg.utf8 === 'string' ? seg.utf8 : ''))
          .join('');
      }

      text = cleanAndFixEncoding(text);
      if (!text || !text.trim()) continue;

      cues.push({
        id: `cue-${i + 1}`,
        start,
        duration: Math.max(0.5, duration),
        text,
      });
    }
  } catch (err) {
    console.warn('[captionParser] JSON3 parse error:', err);
  }

  return cues;
}

// ─── Main Parser ────────────────────────────────────────────────

export function parseRawCaptionData(rawData: string): ParsedCaptionResult {
  if (!rawData || typeof rawData !== 'string') {
    return { format: 'unknown', cues: [] };
  }

  const trimmed = rawData.trim();

  // JSON3 detection: starts with { and contains "events"
  if (trimmed.startsWith('{') && /"events"\s*:/.test(trimmed)) {
    const cues = parseJson3(trimmed);
    if (cues.length > 0) return { format: 'json3', cues };
  }

  // XML detection: starts with < or <?xml
  if (trimmed.startsWith('<') || trimmed.startsWith('<?xml')) {
    const cues = parseXmlTimedText(trimmed);
    if (cues.length > 0) return { format: 'xml', cues };
  }

  // VTT detection: starts with WEBVTT
  if (/^WEBVTT/i.test(trimmed)) {
    const cues = parseVtt(trimmed);
    if (cues.length > 0) return { format: 'vtt', cues };
  }

  // SRT detection: contains timestamp pattern with -->
  if (/-->/.test(trimmed) && /\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(trimmed)) {
    const cues = parseSrt(trimmed);
    if (cues.length > 0) return { format: 'srt', cues };
  }

  // Fallback: try SRT anyway (some SRT files lack standard headers)
  const srtCues = parseSrt(trimmed);
  if (srtCues.length > 0) return { format: 'srt', cues: srtCues };

  // Fallback: try XML
  const xmlCues = parseXmlTimedText(trimmed);
  if (xmlCues.length > 0) return { format: 'xml', cues: xmlCues };

  return { format: 'unknown', cues: [] };
}

// ─── Export Helpers ─────────────────────────────────────────────

export function cuesToSrt(cues: CaptionCue[]): string {
  if (!cues || cues.length === 0) return '';
  return cues
    .map((cue, i) => {
      const end = cue.start + (cue.duration || 2.5);
      return `${i + 1}\n${secondsToSrtTimestamp(cue.start)} --> ${secondsToSrtTimestamp(end)}\n${cue.text}`;
    })
    .join('\n\n');
}

export function cuesToVtt(cues: CaptionCue[]): string {
  if (!cues || cues.length === 0) return 'WEBVTT\n\n';
  return (
    'WEBVTT\n\n' +
    cues
      .map((cue, i) => {
        const end = cue.start + (cue.duration || 2.5);
        return `${i + 1}\n${secondsToVttTimestamp(cue.start)} --> ${secondsToVttTimestamp(end)}\n${cue.text}`;
      })
      .join('\n\n')
  );
}

// ─── Sample Data for Testing ────────────────────────────────────

export const SAMPLE_YOUTUBE_TIMEDTEXT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0.5" dur="3.5">Hello and welcome to this video.</text>
  <text start="4.2" dur="4.0">Today we will talk about language learning.</text>
  <text start="8.5" dur="3.8">Subtitles help you follow along with the audio.</text>
  <text start="12.5" dur="4.2">Let's get started with the first lesson.</text>
</transcript>`;

export const SAMPLE_YOUTUBE_TIMEDTEXT_JSON3 = JSON.stringify({
  events: [
    {
      tStartMs: 500,
      dDurationMs: 3500,
      segs: [{ utf8: 'Hello and welcome to this video.' }],
    },
    {
      tStartMs: 4200,
      dDurationMs: 4000,
      segs: [{ utf8: 'Today we will talk about language learning.' }],
    },
    {
      tStartMs: 8500,
      dDurationMs: 3800,
      segs: [{ utf8: 'Subtitles help you follow along with the audio.' }],
    },
    {
      tStartMs: 12500,
      dDurationMs: 4200,
      segs: [{ utf8: "Let's get started with the first lesson." }],
    },
  ],
});
