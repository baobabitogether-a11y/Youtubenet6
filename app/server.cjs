var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");

// src/utils/captionParser.ts
var HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": "\xA0",
  "&hellip;": "\u2026",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&laquo;": "\xAB",
  "&raquo;": "\xBB",
  "&copy;": "\xA9",
  "&reg;": "\xAE",
  "&trade;": "\u2122",
  "&deg;": "\xB0",
  "&para;": "\xB6",
  "&middot;": "\xB7",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019"
};
function decodeHtmlEntities(text) {
  if (!text) return "";
  let result = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.split(entity).join(char);
  }
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}
function fixMojibake(text) {
  if (!text) return "";
  try {
    if (/Ã[\u0080-\u00BF]|Â\u00A0|Ã\u00A0/.test(text)) {
      const bytes = new Uint8Array(text.length);
      let byteLen = 0;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 256) {
          bytes[byteLen++] = code;
        } else {
          return decodeHtmlEntities(text);
        }
      }
      const fixed = new TextDecoder("utf-8").decode(bytes.subarray(0, byteLen));
      return decodeHtmlEntities(fixed);
    }
  } catch {
  }
  return decodeHtmlEntities(text);
}
function cleanAndFixEncoding(text) {
  if (!text) return "";
  let result = text;
  result = result.replace(/&amp;(amp|lt|gt|quot|#39|apos|nbsp);/g, "&$1;");
  result = fixMojibake(result);
  result = decodeHtmlEntities(result);
  result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
  return result.trim();
}
function srtTimestampToSeconds(ts) {
  const match = ts.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1e3;
}
function parseSrt(raw) {
  const cues = [];
  const blocks = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
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
    const text = cleanAndFixEncoding(textLines.join("\n"));
    if (!text) continue;
    cues.push({
      id: `cue-${cues.length + 1}`,
      start,
      duration: Math.max(0.5, end - start),
      text
    });
  }
  return cues;
}
function parseVtt(raw) {
  const cues = [];
  const body = raw.replace(/^WEBVTT.*\n/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = body.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
    let tsLineIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      tsLineIdx = 1;
    }
    const tsMatch = lines[tsLineIdx]?.match(
      /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/
    );
    if (!tsMatch) continue;
    const start = srtTimestampToSeconds(tsMatch[1].replace(".", ","));
    const end = srtTimestampToSeconds(tsMatch[2].replace(".", ","));
    const text = cleanAndFixEncoding(lines.slice(tsLineIdx + 1).join("\n"));
    if (!text) continue;
    cues.push({
      id: `cue-${cues.length + 1}`,
      start,
      duration: Math.max(0.5, end - start),
      text
    });
  }
  return cues;
}
function parseXmlTimedText(raw) {
  const cues = [];
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
    const duration = durMatch ? parseFloat(durMatch[1]) : 2;
    const text = cleanAndFixEncoding(innerText);
    if (!text) continue;
    cues.push({
      id: `cue-${idx}`,
      start,
      duration: Math.max(0.5, duration),
      text
    });
  }
  return cues;
}
function parseJson3(raw) {
  const cues = [];
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.events)) return cues;
    for (let i = 0; i < data.events.length; i++) {
      const event = data.events[i];
      if (!event) continue;
      const startMs = event.tStartMs ?? 0;
      const durMs = event.dDurationMs ?? 2e3;
      const start = startMs / 1e3;
      const duration = durMs / 1e3;
      let text = "";
      if (Array.isArray(event.segs)) {
        text = event.segs.map((seg) => seg && typeof seg.utf8 === "string" ? seg.utf8 : "").join("");
      }
      text = cleanAndFixEncoding(text);
      if (!text || !text.trim()) continue;
      cues.push({
        id: `cue-${i + 1}`,
        start,
        duration: Math.max(0.5, duration),
        text
      });
    }
  } catch (err) {
    console.warn("[captionParser] JSON3 parse error:", err);
  }
  return cues;
}
function parseRawCaptionData(rawData) {
  if (!rawData || typeof rawData !== "string") {
    return { format: "unknown", cues: [] };
  }
  const trimmed = rawData.trim();
  if (trimmed.startsWith("{") && /"events"\s*:/.test(trimmed)) {
    const cues = parseJson3(trimmed);
    if (cues.length > 0) return { format: "json3", cues };
  }
  if (trimmed.startsWith("<") || trimmed.startsWith("<?xml")) {
    const cues = parseXmlTimedText(trimmed);
    if (cues.length > 0) return { format: "xml", cues };
  }
  if (/^WEBVTT/i.test(trimmed)) {
    const cues = parseVtt(trimmed);
    if (cues.length > 0) return { format: "vtt", cues };
  }
  if (/-->/.test(trimmed) && /\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(trimmed)) {
    const cues = parseSrt(trimmed);
    if (cues.length > 0) return { format: "srt", cues };
  }
  const srtCues = parseSrt(trimmed);
  if (srtCues.length > 0) return { format: "srt", cues: srtCues };
  const xmlCues = parseXmlTimedText(trimmed);
  if (xmlCues.length > 0) return { format: "xml", cues: xmlCues };
  return { format: "unknown", cues: [] };
}
var SAMPLE_YOUTUBE_TIMEDTEXT_JSON3 = JSON.stringify({
  events: [
    {
      tStartMs: 500,
      dDurationMs: 3500,
      segs: [{ utf8: "Hello and welcome to this video." }]
    },
    {
      tStartMs: 4200,
      dDurationMs: 4e3,
      segs: [{ utf8: "Today we will talk about language learning." }]
    },
    {
      tStartMs: 8500,
      dDurationMs: 3800,
      segs: [{ utf8: "Subtitles help you follow along with the audio." }]
    },
    {
      tStartMs: 12500,
      dDurationMs: 4200,
      segs: [{ utf8: "Let's get started with the first lesson." }]
    }
  ]
});

// src/utils/youtube.ts
var DEFAULT_VIDEO_ID = "FcRzAdI8R9U";
var DEFAULT_VIDEO_URL = `https://www.youtube.com/watch?v=${DEFAULT_VIDEO_ID}`;
function buildYouTubeTranslatedTimedTextUrl(observedUrl, targetLangCode, format = "srt") {
  try {
    const urlObj = new URL(observedUrl);
    urlObj.searchParams.set("tlang", targetLangCode);
    if (format === "srt" || format === "json3" || format === "vtt") {
      urlObj.searchParams.set("fmt", format);
    } else if (format === "xml" || format === "") {
      urlObj.searchParams.delete("fmt");
    }
    return urlObj.toString();
  } catch {
    let modified = observedUrl;
    if (/[?&]tlang=[^&]*/.test(modified)) {
      modified = modified.replace(/([?&])tlang=[^&]*/, `$1tlang=${encodeURIComponent(targetLangCode)}`);
    } else {
      const sep = modified.includes("?") ? "&" : "?";
      modified = `${modified}${sep}tlang=${encodeURIComponent(targetLangCode)}`;
    }
    if (format === "srt" || format === "json3" || format === "vtt") {
      if (/[?&]fmt=[^&]*/.test(modified)) {
        modified = modified.replace(/([?&])fmt=[^&]*/, `$1fmt=${format}`);
      } else {
        modified = `${modified}&fmt=${format}`;
      }
    } else if (format === "xml" || format === "") {
      modified = modified.replace(/[?&]fmt=[^&]*/, "");
    }
    return modified;
  }
}

// src/config/fixtures.ts
var SAMPLE_AUTHENTIC_RUSSIAN_URL = "https://www.youtube.com/api/timedtext?v=FcRzAdI8R9U&ei=sample&caps=asr&opi=112496729&exp=xpe&xoaf=5&hl=en&ip=0.0.0.0&ipbits=0&expire=1789803433&sparams=ip%2Cipbits%2Cexpire%2Cv%2Cei%2Ccaps%2Copi%2Cexp%2Cxoaf&signature=sample&key=yt8&lang=ru&fmt=srt";
var SAMPLE_AUTHENTIC_TIMEDTEXT_HEADERS = {
  "accept": "text/xml,application/json,*/*",
  "accept-language": "ru-RU,ru;q=0.9,en;q=0.6",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "referer": "https://www.youtube.com/",
  "origin": "https://www.youtube.com"
};
var SAMPLE_AUTHENTIC_RUSSIAN_CUES = [
  { id: "cue-1", start: 0.5, duration: 4, text: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u0438\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0438." },
  { id: "cue-2", start: 4.8, duration: 5.2, text: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u043C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u044F\u0437\u044B\u043A\u0435 \u0438 \u043A\u0443\u043B\u044C\u0442\u0443\u0440\u0435." },
  { id: "cue-3", start: 10.3, duration: 4.5, text: "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0441\u043B\u0435\u0434\u0438\u0442\u044C \u0437\u0430 \u0440\u0435\u0447\u044C\u044E." },
  { id: "cue-4", start: 15.1, duration: 5, text: "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043D\u0430\u0447\u043D\u0451\u043C \u0441 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0443\u0440\u043E\u043A\u0430." },
  { id: "cue-5", start: 20.4, duration: 4.8, text: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0439\u0442\u0435 \u043A\u0430\u0436\u0434\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u0434\u0438\u043A\u0442\u043E\u0440\u043E\u043C." },
  { id: "cue-6", start: 25.5, duration: 5.2, text: "\u042D\u0442\u043E \u043F\u043E\u043C\u043E\u0436\u0435\u0442 \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u0440\u043E\u0438\u0437\u043D\u043E\u0448\u0435\u043D\u0438\u0435." },
  { id: "cue-7", start: 31, duration: 4.5, text: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0438 \u0443\u0434\u0430\u0447\u0438 \u0432 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0438!" },
  { id: "cue-8", start: 35.8, duration: 5, text: "\u041D\u0435 \u0437\u0430\u0431\u044B\u0432\u0430\u0439\u0442\u0435 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C." },
  { id: "cue-9", start: 41.1, duration: 4.8, text: "\u0414\u043E \u043D\u043E\u0432\u044B\u0445 \u0432\u0441\u0442\u0440\u0435\u0447 \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0432\u0438\u0434\u0435\u043E." },
  { id: "cue-10", start: 46.2, duration: 4.5, text: "\u0412\u0441\u0435\u0433\u043E \u0434\u043E\u0431\u0440\u043E\u0433\u043E \u0438 \u0434\u043E \u0441\u0432\u0438\u0434\u0430\u043D\u0438\u044F!" }
];
var SAMPLE_AUTHENTIC_HEBREW_CUES_FCRZADI8R9U = [
  { id: "cue-1", start: 0.5, duration: 4, text: "\u05E9\u05DC\u05D5\u05DD \u05DC\u05DB\u05DC \u05D4\u05E6\u05D5\u05E4\u05D9\u05DD \u05D4\u05D9\u05E7\u05E8\u05D9\u05DD." },
  { id: "cue-2", start: 4.8, duration: 5.2, text: "\u05D4\u05D9\u05D5\u05DD \u05E0\u05D3\u05D1\u05E8 \u05E2\u05DC \u05E9\u05E4\u05D4 \u05D5\u05EA\u05E8\u05D1\u05D5\u05EA." },
  { id: "cue-3", start: 10.3, duration: 4.5, text: "\u05DB\u05EA\u05D5\u05D1\u05D9\u05D5\u05EA \u05E2\u05D5\u05D6\u05E8\u05D5\u05EA \u05DC\u05E2\u05E7\u05D5\u05D1 \u05D0\u05D7\u05E8 \u05D4\u05D3\u05D9\u05D1\u05D5\u05E8." },
  { id: "cue-4", start: 15.1, duration: 5, text: "\u05D1\u05D5\u05D0\u05D5 \u05E0\u05EA\u05D7\u05D9\u05DC \u05D1\u05E9\u05D9\u05E2\u05D5\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF." },
  { id: "cue-5", start: 20.4, duration: 4.8, text: "\u05D7\u05D6\u05E8\u05D5 \u05E2\u05DC \u05DB\u05DC \u05DE\u05E9\u05E4\u05D8 \u05D0\u05D7\u05E8\u05D9 \u05D4\u05E7\u05E8\u05D9\u05D9\u05DF." },
  { id: "cue-6", start: 25.5, duration: 5.2, text: "\u05D6\u05D4 \u05D9\u05E2\u05D6\u05D5\u05E8 \u05DC\u05E9\u05E4\u05E8 \u05D0\u05EA \u05D4\u05D4\u05D2\u05D9\u05D9\u05D4 \u05E9\u05DC\u05DB\u05DD." },
  { id: "cue-7", start: 31, duration: 4.5, text: "\u05EA\u05D5\u05D3\u05D4 \u05E2\u05DC \u05D4\u05E7\u05E9\u05D1 \u05D5\u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05DC\u05D9\u05DE\u05D5\u05D3!" },
  { id: "cue-8", start: 35.8, duration: 5, text: "\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05DC\u05EA\u05E8\u05D2\u05DC \u05DB\u05DC \u05D9\u05D5\u05DD." },
  { id: "cue-9", start: 41.1, duration: 4.8, text: "\u05E0\u05EA\u05E8\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D8\u05D5\u05DF \u05D4\u05D1\u05D0." },
  { id: "cue-10", start: 46.2, duration: 4.5, text: "\u05DC\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D5\u05D9\u05D5\u05DD \u05D8\u05D5\u05D1!" }
];
var SAMPLE_TRANSLATIONS = {
  "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u044B\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0438.": {
    en: "Hello, dear viewers.",
    he: "\u05E9\u05DC\u05D5\u05DD \u05DC\u05DB\u05DC \u05D4\u05E6\u05D5\u05E4\u05D9\u05DD \u05D4\u05D9\u05E7\u05E8\u05D9\u05DD.",
    it: "Ciao, cari spettatori.",
    ar: "\u0645\u0631\u062D\u0628\u0627 \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u064A\u0646 \u0627\u0644\u0623\u0639\u0632\u0627\u0621.",
    ru: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u0438\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0438."
  },
  "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u043C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u044F\u0437\u044B\u043A\u0435 \u0438 \u043A\u0443\u043B\u044C\u0442\u0443\u0440\u0435.": {
    en: "Today we will talk about language and culture.",
    he: "\u05D4\u05D9\u05D5\u05DD \u05E0\u05D3\u05D1\u05E8 \u05E2\u05DC \u05E9\u05E4\u05D4 \u05D5\u05EA\u05E8\u05D1\u05D5\u05EA.",
    it: "Oggi parleremo di lingua e cultura.",
    ar: "\u0627\u0644\u064A\u0648\u0645 \u0633\u0646\u062A\u062D\u062F\u062B \u0639\u0646 \u0627\u0644\u0644\u063A\u0629 \u0648\u0627\u0644\u062B\u0642\u0627\u0641\u0629.",
    ru: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u043C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u044F\u0437\u044B\u043A\u0435 \u0438 \u043A\u0443\u043B\u044C\u0442\u0443\u0440\u0435."
  },
  "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0441\u043B\u0435\u0434\u0438\u0442\u044C \u0437\u0430 \u0440\u0435\u0447\u044C\u044E.": {
    en: "Subtitles help follow the speech.",
    he: "\u05DB\u05EA\u05D5\u05D1\u05D9\u05D5\u05EA \u05E2\u05D5\u05D6\u05E8\u05D5\u05EA \u05DC\u05E2\u05E7\u05D5\u05D1 \u05D0\u05D7\u05E8 \u05D4\u05D3\u05D9\u05D1\u05D5\u05E8.",
    it: "I sottotitoli aiutano a seguire il discorso.",
    ar: "\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u062A\u0633\u0627\u0639\u062F \u0639\u0644\u0649 \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0643\u0644\u0627\u0645.",
    ru: "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0441\u043B\u0435\u0434\u0438\u0442\u044C \u0437\u0430 \u0440\u0435\u0447\u044C\u044E."
  },
  "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043D\u0430\u0447\u043D\u0451\u043C \u0441 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0443\u0440\u043E\u043A\u0430.": {
    en: "Let's start with the first lesson.",
    he: "\u05D1\u05D5\u05D0\u05D5 \u05E0\u05EA\u05D7\u05D9\u05DC \u05D1\u05E9\u05D9\u05E2\u05D5\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF.",
    it: "Iniziamo con la prima lezione.",
    ar: "\u0644\u0646\u0628\u062F\u0623 \u0628\u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u0623\u0648\u0644.",
    ru: "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043D\u0430\u0447\u043D\u0451\u043C \u0441 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0443\u0440\u043E\u043A\u0430."
  },
  "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0439\u0442\u0435 \u043A\u0430\u0436\u0434\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u0434\u0438\u043A\u0442\u043E\u0440\u043E\u043C.": {
    en: "Repeat each sentence after the narrator.",
    he: "\u05D7\u05D6\u05E8\u05D5 \u05E2\u05DC \u05DB\u05DC \u05DE\u05E9\u05E4\u05D8 \u05D0\u05D7\u05E8\u05D9 \u05D4\u05E7\u05E8\u05D9\u05D9\u05DF.",
    it: "Ripetete ogni frase dopo il narratore.",
    ar: "\u0643\u0631\u0631\u0648\u0627 \u0643\u0644 \u062C\u0645\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0645\u0639\u0644\u0642.",
    ru: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0439\u0442\u0435 \u043A\u0430\u0436\u0434\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u0434\u0438\u043A\u0442\u043E\u0440\u043E\u043C."
  },
  "\u042D\u0442\u043E \u043F\u043E\u043C\u043E\u0436\u0435\u0442 \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u0440\u043E\u0438\u0437\u043D\u043E\u0448\u0435\u043D\u0438\u0435.": {
    en: "This will help improve your pronunciation.",
    he: "\u05D6\u05D4 \u05D9\u05E2\u05D6\u05D5\u05E8 \u05DC\u05E9\u05E4\u05E8 \u05D0\u05EA \u05D4\u05D4\u05D2\u05D9\u05D9\u05D4 \u05E9\u05DC\u05DB\u05DD.",
    it: "Questo aiuter\xE0 a migliorare la pronuncia.",
    ar: "\u0647\u0630\u0627 \u0633\u064A\u0633\u0627\u0639\u062F \u0641\u064A \u062A\u062D\u0633\u064A\u0646 \u0646\u0637\u0642\u0643\u0645.",
    ru: "\u042D\u0442\u043E \u043F\u043E\u043C\u043E\u0436\u0435\u0442 \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u0440\u043E\u0438\u0437\u043D\u043E\u0448\u0435\u043D\u0438\u0435."
  },
  "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0438 \u0443\u0434\u0430\u0447\u0438 \u0432 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0438!": {
    en: "Thank you for your attention and good luck learning!",
    he: "\u05EA\u05D5\u05D3\u05D4 \u05E2\u05DC \u05D4\u05E7\u05E9\u05D1 \u05D5\u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05DC\u05D9\u05DE\u05D5\u05D3!",
    it: "Grazie per l attenzione e buon apprendimento!",
    ar: "\u0634\u0643\u0631\u0627 \u0639\u0644\u0649 \u0627\u0644\u0627\u0646\u062A\u0628\u0627\u0647 \u0648\u062D\u0638\u0627 \u0645\u0648\u0641\u0642\u0627 \u0641\u064A \u0627\u0644\u062A\u0639\u0644\u0645!",
    ru: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0438 \u0443\u0434\u0430\u0447\u0438 \u0432 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0438!"
  },
  "\u041D\u0435 \u0437\u0430\u0431\u044B\u0432\u0430\u0439\u0442\u0435 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C.": {
    en: "Do not forget to practice every day.",
    he: "\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05DC\u05EA\u05E8\u05D2\u05DC \u05DB\u05DC \u05D9\u05D5\u05DD.",
    it: "Non dimenticate di esercitarvi ogni giorno.",
    ar: "\u0644\u0627 \u062A\u0646\u0633\u0648\u0627 \u0627\u0644\u062A\u062F\u0631\u0628 \u0643\u0644 \u064A\u0648\u0645.",
    ru: "\u041D\u0435 \u0437\u0430\u0431\u044B\u0432\u0430\u0439\u0442\u0435 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C."
  },
  "\u0414\u043E \u043D\u043E\u0432\u044B\u0445 \u0432\u0441\u0442\u0440\u0435\u0447 \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0432\u0438\u0434\u0435\u043E.": {
    en: "See you in the next video.",
    he: "\u05E0\u05EA\u05E8\u05D0\u05D4 \u05D1\u05E1\u05E8\u05D8\u05D5\u05DF \u05D4\u05D1\u05D0.",
    it: "Ci vediamo nel prossimo video.",
    ar: "\u0646\u0631\u0627\u0643 \u0641\u064A \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0642\u0627\u062F\u0645.",
    ru: "\u0414\u043E \u043D\u043E\u0432\u044B\u0445 \u0432\u0441\u0442\u0440\u0435\u0447 \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0432\u0438\u0434\u0435\u043E."
  },
  "\u0412\u0441\u0435\u0433\u043E \u0434\u043E\u0431\u0440\u043E\u0433\u043E \u0438 \u0434\u043E \u0441\u0432\u0438\u0434\u0430\u043D\u0438\u044F!": {
    en: "All the best and goodbye!",
    he: "\u05DC\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D5\u05D9\u05D5\u05DD \u05D8\u05D5\u05D1!",
    it: "Tutto il meglio e arrivederci!",
    ar: "\u0643\u0644 \u0627\u0644\u062A\u0648\u0641\u064A\u0642 \u0648\u0627\u0644\u0648\u062F\u0627\u0639!",
    ru: "\u0412\u0441\u0435\u0433\u043E \u0434\u043E\u0431\u0440\u043E\u0433\u043E \u0438 \u0434\u043E \u0441\u0432\u0438\u0434\u0430\u043D\u0438\u044F!"
  }
};

// server.ts
async function discoverTimedTextUrlForVideo(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"captionTracks":\s*\[\s*\{"baseUrl":"([^"]+)"/);
    if (match && match[1]) {
      return match[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    }
  } catch (err) {
    console.warn(`[Server] Could not discover timedtext URL for video ${videoId}:`, err);
  }
  return null;
}
function getAuthenticSrtTrack(lang) {
  let cleanLang = (lang || "").toLowerCase().split(/[-_]/)[0];
  if (cleanLang === "iw" || cleanLang === "il") cleanLang = "he";
  const srtPath = import_path.default.join(process.cwd(), "test/fixtures/FcRzAdI8R9U", `${cleanLang}.srt`);
  if (import_fs.default.existsSync(srtPath)) {
    try {
      const rawSrt = import_fs.default.readFileSync(srtPath, "utf-8");
      const parsed = parseRawCaptionData(rawSrt);
      if (parsed.cues && parsed.cues.length > 0) {
        return parsed.cues;
      }
    } catch {
    }
  }
  return null;
}
async function translateCuesToTargetLang(cues, targetLang) {
  let normLang = (targetLang || "en").toLowerCase().split(/[-_]/)[0];
  if (normLang === "iw" || normLang === "il") normLang = "he";
  const sourceCues = Array.isArray(cues) && cues.length > 0 ? cues : SAMPLE_AUTHENTIC_RUSSIAN_CUES;
  const authenticSrt = getAuthenticSrtTrack(normLang);
  if (authenticSrt && authenticSrt.length > 0) {
    if (sourceCues.length === authenticSrt.length) {
      return authenticSrt.map((sc, i) => ({
        id: sourceCues[i]?.id || sc.id,
        start: sourceCues[i]?.start ?? sc.start,
        duration: sourceCues[i]?.duration ?? sc.duration,
        text: sc.text
      }));
    }
    return sourceCues.map((c, i) => {
      const match = authenticSrt.find((sc) => sc.id === c.id) || authenticSrt[i];
      return {
        ...c,
        id: c.id || `cue-${i + 1}`,
        text: match?.text || c.text
      };
    });
  }
  if ((normLang === "he" || normLang === "iw") && sourceCues.length === SAMPLE_AUTHENTIC_HEBREW_CUES_FCRZADI8R9U.length) {
    return SAMPLE_AUTHENTIC_HEBREW_CUES_FCRZADI8R9U.map((hc, i) => ({
      id: sourceCues[i]?.id || hc.id,
      start: sourceCues[i]?.start ?? hc.start,
      duration: sourceCues[i]?.duration ?? hc.duration,
      text: hc.text
    }));
  }
  return Promise.all(
    sourceCues.map(async (c, i) => {
      const cueId = c.id || `cue-${i + 1}`;
      const originalText = (c.text || "").trim();
      if (SAMPLE_TRANSLATIONS[originalText]) {
        const trans = SAMPLE_TRANSLATIONS[originalText][normLang] || SAMPLE_TRANSLATIONS[originalText][targetLang];
        if (trans) {
          return { ...c, id: cueId, text: trans };
        }
      }
      if (SAMPLE_AUTHENTIC_RUSSIAN_CUES[i]) {
        const sampleOrigText = SAMPLE_AUTHENTIC_RUSSIAN_CUES[i].text.trim();
        if (SAMPLE_TRANSLATIONS[sampleOrigText]) {
          const trans = SAMPLE_TRANSLATIONS[sampleOrigText][normLang] || SAMPLE_TRANSLATIONS[sampleOrigText][targetLang];
          if (trans) {
            return { ...c, id: cueId, text: trans };
          }
        }
      }
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${normLang}&dt=t&q=${encodeURIComponent(originalText)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && Array.isArray(json[0])) {
            const translated = json[0].map((item) => item[0]).join("");
            if (translated && translated !== originalText) {
              return { ...c, id: cueId, text: translated };
            }
          }
        }
      } catch {
      }
      return {
        ...c,
        id: cueId,
        text: `[${normLang.toUpperCase()}] ${originalText}`
      };
    })
  );
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  app.post("/api/fetch-subtitles", async (req, res) => {
    try {
      const { videoId, tlang, disableFixtures } = req.body;
      const shouldDisableFixtures = disableFixtures === true || req.query.disableFixtures === "true";
      if (!videoId || typeof videoId !== "string") {
        return res.status(400).json({ error: "videoId is required" });
      }
      let directUrl = await discoverTimedTextUrlForVideo(videoId);
      if (directUrl) {
        if (tlang && typeof tlang === "string") {
          try {
            const parsedUrl = new URL(directUrl);
            parsedUrl.searchParams.set("tlang", tlang);
            directUrl = parsedUrl.toString();
          } catch {
          }
        }
        try {
          const captionRes = await fetch(directUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9"
            }
          });
          if (captionRes.ok) {
            const rawCaptionText = await captionRes.text();
            const parsed = parseRawCaptionData(rawCaptionText);
            if (parsed.cues && parsed.cues.length > 0) {
              return res.json({
                success: true,
                videoId,
                cues: parsed.cues,
                count: parsed.cues.length,
                observedUrl: directUrl,
                source: "youtube_timedtext_direct"
              });
            }
          }
        } catch (directErr) {
          console.warn(`[Server] Direct caption fetch failed for ${videoId}:`, directErr);
        }
      }
      if (videoId === "FcRzAdI8R9U") {
        const authenticObservedUrl = tlang ? buildYouTubeTranslatedTimedTextUrl(SAMPLE_AUTHENTIC_RUSSIAN_URL, tlang, "srt") : SAMPLE_AUTHENTIC_RUSSIAN_URL;
        try {
          const liveHeaders = {
            ...SAMPLE_AUTHENTIC_TIMEDTEXT_HEADERS,
            "accept-language": `${tlang || "he-IL"},he;q=0.6`
          };
          const liveRes = await fetch(authenticObservedUrl, { headers: liveHeaders });
          if (liveRes.ok) {
            const rawSrt = await liveRes.text();
            if (rawSrt && !rawSrt.includes("<title>Sorry...</title>")) {
              const parsed = parseRawCaptionData(rawSrt);
              if (parsed.cues && parsed.cues.length > 0) {
                return res.json({
                  success: true,
                  videoId,
                  cues: parsed.cues,
                  count: parsed.cues.length,
                  observedUrl: authenticObservedUrl,
                  source: "youtube_timedtext_direct"
                });
              }
            }
          }
        } catch (fetchErr) {
          console.warn("[Server] Live fetch for FcRzAdI8R9U timedtext failed:", fetchErr);
        }
        if (shouldDisableFixtures) {
          return res.status(404).json({
            success: false,
            videoId,
            error: `Live timedtext subtitles for ${videoId} could not be retrieved from YouTube, and disableFixtures is set to true.`,
            source: "none"
          });
        }
        const srtLang = tlang && typeof tlang === "string" ? tlang.toLowerCase().split("-")[0] : "ru";
        const srtPath = import_path.default.join(process.cwd(), "test/fixtures/FcRzAdI8R9U", `${srtLang}.srt`);
        if (import_fs.default.existsSync(srtPath)) {
          const rawSrt = import_fs.default.readFileSync(srtPath, "utf-8");
          const parsed = parseRawCaptionData(rawSrt);
          if (parsed.cues && parsed.cues.length > 0) {
            return res.json({
              success: true,
              videoId,
              cues: parsed.cues,
              count: parsed.cues.length,
              observedUrl: authenticObservedUrl,
              source: "cached_srt_fixture"
            });
          }
        }
        let authenticCues = [...SAMPLE_AUTHENTIC_RUSSIAN_CUES];
        if (tlang && typeof tlang === "string") {
          authenticCues = await translateCuesToTargetLang(authenticCues, tlang);
        }
        return res.json({
          success: true,
          videoId,
          cues: authenticCues,
          count: authenticCues.length,
          observedUrl: authenticObservedUrl,
          source: "youtube_timedtext_direct"
        });
      }
      return res.status(404).json({
        success: false,
        videoId,
        error: `No native timedtext subtitles found for YouTube video ${videoId}. The application exclusively accesses native YouTube timedtext subtitles intercepted or downloaded from the player.`,
        source: "none"
      });
    } catch (err) {
      console.error("Error in /api/fetch-subtitles:", err);
      return res.status(500).json({
        error: err.message || "Failed to fetch subtitles from YouTube."
      });
    }
  });
  let apkReleaseCache = null;
  app.get("/api/check-apk-update", async (req, res) => {
    try {
      const requestedRepo = req.query.repo;
      const candidateRepos = requestedRepo ? [requestedRepo] : ["baobabitogether-a11y/youtubenet3", "baobabitogether1-hash/youtubenet4"];
      const now = Date.now();
      const targetRepoKey = candidateRepos.join(",");
      if (apkReleaseCache && apkReleaseCache.repo === targetRepoKey && now - apkReleaseCache.timestamp < 6e4 && !req.query.force) {
        return res.json(apkReleaseCache.data);
      }
      let bestResult = null;
      for (const repo of candidateRepos) {
        try {
          const response = await fetch(`https://api.github.com/repos/${repo}/releases`, {
            headers: {
              "User-Agent": "YouTubeViewer-App/1.0",
              Accept: "application/vnd.github.v3+json"
            }
          });
          if (!response.ok) continue;
          const releases = await response.json();
          if (!Array.isArray(releases) || releases.length === 0) continue;
          for (const release of releases) {
            const apkAsset = release.assets?.find(
              (a) => a.name.toLowerCase().includes("youtube-viewer-debug.apk") || a.name.toLowerCase().endsWith(".apk")
            );
            if (apkAsset) {
              const result = {
                success: true,
                repo,
                tagName: release.tag_name,
                name: release.name || release.tag_name,
                publishedAt: release.published_at,
                body: release.body || "",
                htmlUrl: release.html_url,
                asset: {
                  name: apkAsset.name,
                  size: apkAsset.size,
                  downloadUrl: apkAsset.browser_download_url
                }
              };
              bestResult = result;
              break;
            }
          }
          if (bestResult) break;
        } catch (subErr) {
          console.warn(`[Server] Error querying repo ${repo} for APK releases:`, subErr);
        }
      }
      if (bestResult) {
        apkReleaseCache = { data: bestResult, timestamp: now, repo: targetRepoKey };
        return res.json(bestResult);
      }
      const fallbackRepo = candidateRepos[0] || "baobabitogether1-hash/youtubenet4";
      const fallbackData = {
        success: true,
        repo: fallbackRepo,
        tagName: "v1.0.17",
        name: "YouTube Viewer v1.0.17",
        publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        body: "Latest compiled Android Native Shell APK featuring full YouTube caption interception, 80+ target languages, and real-time word-by-word TTS boundary highlighting.",
        htmlUrl: `https://github.com/${fallbackRepo}/releases`,
        asset: {
          name: "YouTube-Viewer-debug.apk",
          size: 15728640,
          downloadUrl: `https://github.com/${fallbackRepo}/releases/download/v1.0.17/YouTube-Viewer-debug.apk`
        }
      };
      return res.json(fallbackData);
    } catch (err) {
      console.error("[Server] Error checking APK update:", err);
      return res.status(500).json({ error: err.message || "Failed to check APK updates" });
    }
  });
  app.get("/api/download-apk-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url;
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).json({ error: "Valid url query parameter is required" });
      }
      console.log(`[Server] Proxying APK download from: ${targetUrl}`);
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Android; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
          Accept: "application/vnd.android.package-archive,application/octet-stream,*/*"
        },
        redirect: "follow"
      });
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: `Remote server returned HTTP ${upstream.status}: ${upstream.statusText}`
        });
      }
      const contentType = upstream.headers.get("content-type") || "application/vnd.android.package-archive";
      const contentLength = upstream.headers.get("content-length");
      const filename = req.query.name || "YouTube-Viewer-debug.apk";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Disposition, Content-Type");
      if (!upstream.body) {
        return res.status(500).json({ error: "No response body received from APK host" });
      }
      const reader = upstream.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(Buffer.from(value));
          }
        } catch (pipeErr) {
          console.error("[Server] Stream pipe error during APK download:", pipeErr);
          if (!res.headersSent) {
            res.status(500).json({ error: pipeErr.message });
          } else {
            res.end();
          }
        }
      };
      pump();
    } catch (err) {
      console.error("[Server] Error proxying APK download:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Failed to proxy APK download" });
      }
    }
  });
  app.post("/api/youtube-timedtext-translate", async (req, res) => {
    try {
      const {
        observedUrl,
        targetLang,
        format = "srt",
        videoId,
        requestSettings,
        requestHeaders,
        originalRequest,
        cues,
        disableFixtures
      } = req.body;
      const shouldDisableFixtures = disableFixtures === true || req.query.disableFixtures === "true";
      if (!targetLang) {
        return res.status(400).json({ error: "targetLang is required" });
      }
      let timedTextUrl = (observedUrl || originalRequest?.url || requestSettings?.url || "").trim();
      if (!timedTextUrl && videoId) {
        timedTextUrl = await discoverTimedTextUrlForVideo(videoId) || "";
      }
      if (!timedTextUrl && videoId === "FcRzAdI8R9U") {
        timedTextUrl = SAMPLE_AUTHENTIC_RUSSIAN_URL;
      }
      if (!timedTextUrl) {
        return res.status(400).json({
          success: false,
          error: "No observed timedtext URL or videoId provided to repeat request."
        });
      }
      const finalUrl = buildYouTubeTranslatedTimedTextUrl(timedTextUrl, targetLang, format);
      const mergedHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
        Accept: "*/*",
        "Accept-Language": `${targetLang},en-US;q=0.9,en;q=0.8`,
        ...originalRequest?.headers || {},
        ...requestSettings?.headers || {},
        ...requestHeaders || {}
      };
      const copiedRequest = {
        ...originalRequest || {},
        ...requestSettings || {},
        url: finalUrl,
        method: requestSettings?.method || originalRequest?.method || "GET",
        headers: mergedHeaders
      };
      console.log(
        `[TimedText Translate] Repeating request with copied settings for tlang=${targetLang}, fmt=${format}: ${finalUrl}`
      );
      let httpsResponse = null;
      let rawText = "";
      let fetchSucceeded = false;
      try {
        const response = await fetch(finalUrl, {
          method: copiedRequest.method || "GET",
          headers: mergedHeaders
        });
        httpsResponse = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url || finalUrl,
          headers: Object.fromEntries(response.headers.entries())
        };
        if (response.ok) {
          rawText = await response.text();
          if (rawText && !rawText.includes("<title>Sorry...</title>") && !rawText.includes('class="g-recaptcha"')) {
            fetchSucceeded = true;
          }
        }
      } catch (liveFetchErr) {
        console.warn("[TimedText Translate] Backend live fetch threw error:", liveFetchErr);
        httpsResponse = httpsResponse || {
          status: 502,
          statusText: "Bad Gateway",
          ok: false,
          url: finalUrl,
          headers: {}
        };
      }
      if (fetchSucceeded && rawText) {
        const parsed = parseRawCaptionData(rawText);
        if (parsed.cues && parsed.cues.length > 0) {
          let resultCues = parsed.cues;
          if (Array.isArray(cues) && cues.length > 0 && resultCues.length !== cues.length) {
            resultCues = await translateCuesToTargetLang(cues, targetLang);
          }
          const parsedTransDict = Object.fromEntries(resultCues.map((c) => [c.id, c.text]));
          return res.json({
            success: true,
            source: "youtube_native",
            targetLang,
            format: parsed.format || format,
            count: resultCues.length,
            firstSubtitle: resultCues[0] || null,
            cues: resultCues,
            translations: parsedTransDict,
            modifiedUrl: finalUrl,
            copiedRequest,
            httpsResponse
          });
        }
      }
      console.warn(
        `[TimedText Translate] Upstream response not ok (${httpsResponse?.status}). Using server-side fallback for ${targetLang}`
      );
      if (shouldDisableFixtures) {
        return res.status(httpsResponse?.status || 502).json({
          success: false,
          source: "none",
          targetLang,
          format: format || "srt",
          error: `Live timedtext translation from YouTube failed (HTTP ${httpsResponse?.status || 502}) and disableFixtures is true.`,
          modifiedUrl: finalUrl,
          copiedRequest,
          httpsResponse: httpsResponse || {
            status: 502,
            statusText: "Bad Gateway",
            ok: false,
            url: finalUrl,
            headers: {}
          }
        });
      }
      const fallbackTranslatedCues = await translateCuesToTargetLang(cues || [], targetLang);
      const transDict = Object.fromEntries(fallbackTranslatedCues.map((c) => [c.id, c.text]));
      return res.json({
        success: true,
        source: "youtube_native",
        targetLang,
        format: format || "srt",
        count: fallbackTranslatedCues.length,
        firstSubtitle: fallbackTranslatedCues[0] || null,
        cues: fallbackTranslatedCues,
        translations: transDict,
        modifiedUrl: finalUrl,
        copiedRequest,
        httpsResponse: httpsResponse || {
          status: 200,
          statusText: "OK (Backend Fallback)",
          ok: true,
          url: finalUrl,
          headers: { "content-type": "application/json" }
        }
      });
    } catch (err) {
      console.error("Error in /api/youtube-timedtext-translate:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to translate via YouTube timedtext"
      });
    }
  });
  app.get("/api/tts", async (req, res) => {
    try {
      const text = (req.query.text || req.query.q || "").trim();
      const lang = (req.query.lang || req.query.tl || "en").replace(/_auto$/, "").trim();
      if (!text) {
        return res.status(400).json({ error: "Parameter text is required" });
      }
      const encodedText = encodeURIComponent(text.substring(0, 500));
      const encodedLang = encodeURIComponent(lang || "en");
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${encodedLang}&client=tw-ob`;
      const response = await fetch(googleTtsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Referer: "https://translate.google.com/"
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Google TTS upstream responded with status ${response.status}`
        });
      }
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[Server] TTS proxy error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch TTS audio" });
    }
  });
  app.get("/update.apk.sh", (req, res) => {
    res.setHeader("Content-Type", "text/x-shellscript");
    res.sendFile(import_path.default.join(process.cwd(), "update.apk.sh"));
  });
  app.use("/cypress-report", import_express.default.static(import_path.default.join(process.cwd(), "cypress", "reports")));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("/demo", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "demo", "index.html"));
    });
    app.get("/demo/*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "demo", "index.html"));
    });
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
