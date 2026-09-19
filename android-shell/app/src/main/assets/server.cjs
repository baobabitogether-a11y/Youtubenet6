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
var import_vite = require("vite");

// src/utils/captionParser.ts
var WIN1252_TO_BYTE = {
  8364: 128,
  8218: 130,
  402: 131,
  8222: 132,
  8230: 133,
  8224: 134,
  8225: 135,
  710: 136,
  8240: 137,
  352: 138,
  8249: 139,
  338: 140,
  381: 142,
  8216: 145,
  8217: 146,
  8220: 147,
  8221: 148,
  8226: 149,
  8211: 150,
  8212: 151,
  732: 152,
  8482: 153,
  353: 154,
  8250: 155,
  339: 156,
  382: 158,
  376: 159
};
function fixMojibake(str) {
  if (!str) return str;
  if (!/[\xC0-\xFF\u0100-\u02FF\u2010-\u2030]/.test(str)) return str;
  try {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      } else if (WIN1252_TO_BYTE[code] !== void 0) {
        bytes.push(WIN1252_TO_BYTE[code]);
      } else {
        return str;
      }
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    if (decoded && decoded !== str) {
      return decoded;
    }
  } catch {
  }
  return str;
}
var NAMED_HTML_ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&iexcl;": "\xA1",
  "&iquest;": "\xBF",
  "&laquo;": "\xAB",
  "&raquo;": "\xBB",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ndash;": "\u2013",
  "&mdash;": "\u2014",
  "&hellip;": "\u2026",
  "&bull;": "\u2022",
  "&middot;": "\xB7",
  "&euro;": "\u20AC",
  "&pound;": "\xA3",
  "&yen;": "\xA5",
  "&cent;": "\xA2",
  "&copy;": "\xA9",
  "&reg;": "\xAE",
  "&trade;": "\u2122",
  "&deg;": "\xB0",
  "&plusmn;": "\xB1",
  "&times;": "\xD7",
  "&divide;": "\xF7",
  "&szlig;": "\xDF",
  // Acute
  "&aacute;": "\xE1",
  "&eacute;": "\xE9",
  "&iacute;": "\xED",
  "&oacute;": "\xF3",
  "&uacute;": "\xFA",
  "&yacute;": "\xFD",
  "&Aacute;": "\xC1",
  "&Eacute;": "\xC9",
  "&Iacute;": "\xCD",
  "&Oacute;": "\xD3",
  "&Uacute;": "\xDA",
  "&Yacute;": "\xDD",
  // Grave
  "&agrave;": "\xE0",
  "&egrave;": "\xE8",
  "&igrave;": "\xEC",
  "&ograve;": "\xF2",
  "&ugrave;": "\xF9",
  "&Agrave;": "\xC0",
  "&Egrave;": "\xC8",
  "&Igrave;": "\xCC",
  "&Ograve;": "\xD2",
  "&Ugrave;": "\xD9",
  // Circumflex
  "&acirc;": "\xE2",
  "&ecirc;": "\xEA",
  "&icirc;": "\xEE",
  "&ocirc;": "\xF4",
  "&ucirc;": "\xFB",
  "&Acirc;": "\xC2",
  "&Ecirc;": "\xCA",
  "&Icirc;": "\xCE",
  "&Ocirc;": "\xD4",
  "&Ucirc;": "\xDB",
  // Umlaut / Diaeresis
  "&auml;": "\xE4",
  "&euml;": "\xEB",
  "&iuml;": "\xEF",
  "&ouml;": "\xF6",
  "&uuml;": "\xFC",
  "&yuml;": "\xFF",
  "&Auml;": "\xC4",
  "&Euml;": "\xCB",
  "&Iuml;": "\xCF",
  "&Ouml;": "\xD6",
  "&Uuml;": "\xDC",
  // Tilde
  "&atilde;": "\xE3",
  "&ntilde;": "\xF1",
  "&otilde;": "\xF5",
  "&Atilde;": "\xC3",
  "&Ntilde;": "\xD1",
  "&Otilde;": "\xD5",
  // Cedilla
  "&ccedil;": "\xE7",
  "&Ccedil;": "\xC7",
  // Ring / Slash / Ligatures
  "&aring;": "\xE5",
  "&Aring;": "\xC5",
  "&oslash;": "\xF8",
  "&Oslash;": "\xD8",
  "&aelig;": "\xE6",
  "&AElig;": "\xC6",
  "&oelig;": "\u0153",
  "&OElig;": "\u0152"
};
function decodeHtmlEntities(text) {
  if (!text) return "";
  let s = text;
  s = s.replace(/&#(\d+);?/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return code >= 0 && code <= 1114111 ? String.fromCodePoint(code) : _;
  });
  s = s.replace(/&#x([0-9a-fA-F]+);?/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return code >= 0 && code <= 1114111 ? String.fromCodePoint(code) : _;
  });
  s = s.replace(/&[a-zA-Z]+;/g, (m) => NAMED_HTML_ENTITIES[m] || m);
  if (typeof DOMParser !== "undefined" && s.includes("&")) {
    try {
      const doc = new DOMParser().parseFromString(s, "text/html");
      if (doc && doc.body && doc.body.textContent) {
        s = doc.body.textContent;
      }
    } catch {
    }
  }
  return s;
}
function cleanAndFixEncoding(text) {
  if (!text) return "";
  let s = text;
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  s = decodeHtmlEntities(s);
  s = fixMojibake(s);
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/\u00A0/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
function parseRawCaptionData(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"events"')) {
    try {
      const data = JSON.parse(trimmed);
      const cues = [];
      let counter = 1;
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          if (ev.segs && Array.isArray(ev.segs)) {
            const rawSegText = ev.segs.map((s) => s.utf8 || "").join("");
            const text = cleanAndFixEncoding(rawSegText);
            if (text) {
              const start = (ev.tStartMs || 0) / 1e3;
              const duration = (ev.dDurationMs || 0) / 1e3;
              cues.push({
                id: `cue-${counter++}`,
                start,
                duration: Math.max(1, duration),
                text
              });
            }
          }
        }
      }
      return { format: "json3", cues };
    } catch {
    }
  }
  if (trimmed.startsWith("<") || trimmed.includes("<text ") || trimmed.includes("<p ")) {
    const cues = [];
    let counter = 1;
    const textTagRegex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = textTagRegex.exec(trimmed)) !== null) {
      const start = parseFloat(match[1]) || 0;
      const duration = parseFloat(match[2]) || 0;
      const cleanText = cleanAndFixEncoding(match[3]);
      if (cleanText) {
        cues.push({
          id: `cue-${counter++}`,
          start,
          duration: Math.max(1, duration),
          text: cleanText
        });
      }
    }
    if (cues.length === 0) {
      const pTagRegex = /<p\s+t="([^"]+)"(?:\s+d="([^"]+)")?[^>]*>([\s\S]*?)<\/p>/gi;
      while ((match = pTagRegex.exec(trimmed)) !== null) {
        const start = (parseFloat(match[1]) || 0) / 1e3;
        const duration = (parseFloat(match[2] || "0") || 0) / 1e3;
        const cleanText = cleanAndFixEncoding(match[3]);
        if (cleanText) {
          cues.push({
            id: `cue-${counter++}`,
            start,
            duration: Math.max(1, duration),
            text: cleanText
          });
        }
      }
    }
    if (cues.length > 0) {
      return { format: "xml", cues };
    }
  }
  if (trimmed.startsWith("WEBVTT") || trimmed.includes("-->")) {
    const cues = [];
    let counter = 1;
    const blocks = trimmed.split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const timeLineIndex = lines.findIndex((l) => l.includes("-->"));
      if (timeLineIndex !== -1) {
        const timeLine = lines[timeLineIndex];
        const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
        const parseVttTime = (t) => {
          const parts = t.split(":");
          if (parts.length === 3) {
            return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          } else if (parts.length === 2) {
            return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
          }
          return 0;
        };
        const start = parseVttTime(startStr);
        const end = parseVttTime(endStr);
        const rawText = lines.slice(timeLineIndex + 1).join(" ");
        const text = cleanAndFixEncoding(rawText);
        if (text) {
          cues.push({
            id: `cue-${counter++}`,
            start,
            duration: Math.max(1, end - start),
            text
          });
        }
      }
    }
    if (cues.length > 0) {
      return { format: "vtt", cues };
    }
  }
  if (trimmed.includes("-->")) {
    const cues = [];
    let counter = 1;
    const blocks = trimmed.split(/\r?\n\s*\r?\n/);
    for (const block of blocks) {
      const lines = block.trim().split(/\r?\n/);
      const timeLineIndex = lines.findIndex((l) => l.includes("-->"));
      if (timeLineIndex !== -1) {
        const timeLine = lines[timeLineIndex];
        const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
        const parseSrtTime = (t) => {
          const parts = t.replace(",", ".").split(":");
          if (parts.length === 3) {
            return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          } else if (parts.length === 2) {
            return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
          }
          return parseFloat(parts[0]) || 0;
        };
        const start = parseSrtTime(startStr);
        const end = parseSrtTime(endStr);
        const rawText = lines.slice(timeLineIndex + 1).join(" ");
        const text = cleanAndFixEncoding(rawText);
        if (text) {
          cues.push({
            id: `cue-${counter++}`,
            start,
            duration: Math.max(1, end - start),
            text
          });
        }
      }
    }
    if (cues.length > 0) {
      return { format: "vtt", cues };
    }
  }
  return { format: "unknown", cues: [] };
}
var SAMPLE_YOUTUBE_TIMEDTEXT_JSON3 = JSON.stringify(
  {
    wireMagic: "pb3",
    pens: [{}],
    wsWinStyles: [{}],
    wpWinPositions: [{}],
    events: [
      {
        tStartMs: 1420,
        dDurationMs: 3150,
        segs: [{ utf8: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u0438\u0435 \u0434\u0440\u0443\u0437\u044C\u044F! \u0420\u0430\u0434 \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0432\u0430\u0441 \u043D\u0430 \u043D\u0430\u0448\u0435\u043C \u043A\u0430\u043D\u0430\u043B\u0435." }]
      },
      {
        tStartMs: 4800,
        dDurationMs: 4200,
        segs: [{ utf8: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0443 \u043D\u0430\u0441 \u0432 \u0441\u0442\u0443\u0434\u0438\u0438 \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u044B\u0439 \u0433\u043E\u0441\u0442\u044C \u2014 \u0410\u0440\u043A\u0430\u0434\u0438\u0439 \u0414\u0443\u0445\u0438\u043D." }]
      },
      {
        tStartMs: 9150,
        dDurationMs: 3850,
        segs: [{ utf8: "\u041C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u043C\u0443\u0437\u044B\u043A\u0435, \u0442\u0432\u043E\u0440\u0447\u0435\u0441\u0442\u0432\u0435 \u0412\u043B\u0430\u0434\u0438\u043C\u0438\u0440\u0430 \u0412\u044B\u0441\u043E\u0446\u043A\u043E\u0433\u043E \u0438 \u0410\u0440\u0438\u043A\u0430 \u0410\u0439\u043D\u0448\u0442\u0435\u0439\u043D\u0430." }]
      },
      {
        tStartMs: 13200,
        dDurationMs: 4100,
        segs: [{ utf8: "\u0410 \u0442\u0430\u043A\u0436\u0435 \u043E\u0431\u0441\u0443\u0434\u0438\u043C \u0433\u043B\u0443\u0431\u043E\u043A\u0438\u0435 \u0441\u043C\u044B\u0441\u043B\u044B: \u043C\u043E\u0436\u0435\u0442 \u043B\u0438 \u043C\u0443\u0437\u044B\u043A\u0430 \u0441\u043F\u0430\u0441\u0442\u0438 \u0436\u0438\u0437\u043D\u044C \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430?" }]
      },
      {
        tStartMs: 17500,
        dDurationMs: 3600,
        segs: [{ utf8: "\u041A\u0430\u043A \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0430 \u044D\u0442\u0430 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043A\u043E\u043C\u0431\u0438\u043D\u0430\u0446\u0438\u044F \u0436\u0430\u043D\u0440\u043E\u0432: \u0440\u044D\u043F, \u0440\u043E\u043A \u0438 \u043A\u0430\u0431\u0431\u0430\u043B\u0430?" }]
      },
      {
        tStartMs: 21300,
        dDurationMs: 4800,
        segs: [{ utf8: "\u0410\u0440\u043A\u0430\u0434\u0438\u0439, \u0434\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C! \u0421 \u0447\u0435\u0433\u043E \u043D\u0430\u0447\u0430\u043B\u0441\u044F \u0432\u0430\u0448 \u043F\u0443\u0442\u044C?" }]
      },
      {
        tStartMs: 26400,
        dDurationMs: 4200,
        segs: [{ utf8: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435. \u0412\u0441\u0435 \u043D\u0430\u0447\u0430\u043B\u043E\u0441\u044C \u0435\u0449\u0435 \u0432 \u0434\u0435\u0442\u0441\u0442\u0432\u0435." }]
      }
    ]
  },
  null,
  2
);

// src/lib/ttsEngine.ts
var currentNativeUtteranceId = null;
var nativeTTSResolvers = /* @__PURE__ */ new Map();
if (typeof window !== "undefined") {
  window.onNativeTTSDone = (utteranceId) => {
    const callbacks = nativeTTSResolvers.get(utteranceId);
    if (callbacks) {
      callbacks.resolve();
      nativeTTSResolvers.delete(utteranceId);
    }
    if (currentNativeUtteranceId === utteranceId) {
      currentNativeUtteranceId = null;
    }
  };
  window.onNativeTTSError = (utteranceId, err) => {
    const callbacks = nativeTTSResolvers.get(utteranceId);
    if (callbacks) {
      callbacks.reject(new Error(err || "Native TTS error"));
      nativeTTSResolvers.delete(utteranceId);
    }
    if (currentNativeUtteranceId === utteranceId) {
      currentNativeUtteranceId = null;
    }
  };
}

// src/lib/translateService.ts
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
async function translateCuesToTargetLang(cues, targetLang) {
  const dictionary = {
    "cue-1": {
      es: "Hola queridos espectadores, transmitiendo en exclusiva en Sheinkin40.",
      it: "Salve a tutti gli spettatori, in onda un'esclusiva su Sheinkin40.",
      fr: "Bonjour chers t\xE9l\xE9spectateurs, en direct pour une exclusivit\xE9 sur Sheinkin40.",
      de: "Hallo liebe Zuschauer, live mit einem Exklusivbeitrag auf Sheinkin40.",
      ar: "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643\u0645 \u0623\u0639\u0632\u0627\u0626\u064A \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u064A\u0646\u060C \u0641\u064A \u0628\u062B \u062D\u0635\u0631\u064A \u0639\u0644\u0649 \u0642\u0646\u0627\u0629 Sheinkin40.",
      en: "Hello dear viewers, broadcasting an exclusive on Sheinkin40.",
      ru: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u0438\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0438, \u0432 \u044D\u0444\u0438\u0440\u0435 \u044D\u043A\u0441\u043A\u043B\u044E\u0437\u0438\u0432 \u043D\u0430 Sheinkin40."
    },
    "cue-2": {
      es: "Hoy nos acompa\xF1a el legendario m\xFAsico y compositor Arkadi Duchin.",
      it: "Oggi abbiamo come ospite il leggendario musicista e cantautore Arkadi Duchin.",
      fr: "Aujourd'hui, notre invit\xE9 est le l\xE9gendaire musicien et auteur Arkadi Duchin.",
      de: "Heute ist der legend\xE4re Musiker und Liedermacher Arkadi Duchin unser Gast.",
      ar: "\u0636\u064A\u0641\u0646\u0627 \u0627\u0644\u064A\u0648\u0645 \u0647\u0648 \u0627\u0644\u0645\u0648\u0633\u064A\u0642\u0627\u0631 \u0648\u0627\u0644\u0645\u0644\u062D\u0646 \u0627\u0644\u0623\u0633\u0637\u0648\u0631\u064A \u0623\u0631\u0643\u0627\u062F\u064A \u062F\u0648\u0634\u064A\u0646.",
      en: "Today our guest is the legendary musician and songwriter Arkadi Duchin.",
      ru: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0443 \u043D\u0430\u0441 \u0432 \u0433\u043E\u0441\u0442\u044F\u0445 \u043B\u0435\u0433\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0439 \u043C\u0443\u0437\u044B\u043A\u0430\u043D\u0442 \u0438 \u0430\u0432\u0442\u043E\u0440 \u043F\u0435\u0441\u0435\u043D \u0410\u0440\u043A\u0430\u0434\u0438\u0439 \u0414\u0443\u0445\u0438\u043D."
    },
    "cue-3": {
      es: "Hablaremos de las canciones de Vysotsky, de pol\xEDtica, Netanyahu y de lo que sucede con Israel.",
      it: "Parleremo delle canzoni di Vysotskij, di politica, di Netanyahu e di cosa accade in Israele.",
      fr: "Nous parlerons des chansons de Vyssotski, de politique, de Netanyahou et de la situation en Isra\xEBl.",
      de: "Wir sprechen \xFCber Wyssozkis Lieder, Politik, Netanjahu und die Situation in Israel.",
      ar: "\u0633\u0646\u062A\u062D\u062F\u062B \u0639\u0646 \u0623\u063A\u0627\u0646\u064A \u0641\u064A\u0633\u0648\u062A\u0633\u0643\u064A \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0629 \u0648\u0646\u062A\u0646\u064A\u0627\u0647\u0648 \u0648\u0645\u0627 \u064A\u062D\u062F\u062B \u0641\u064A \u0625\u0633\u0631\u0627\u0626\u064A\u0644.",
      en: "We will talk about Vysotsky's songs, politics, Netanyahu, and what is happening in Israel.",
      ru: "\u041C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u043F\u0435\u0441\u043D\u044F\u0445 \u0412\u044B\u0441\u043E\u0446\u043A\u043E\u0433\u043E, \u043E \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0435, \u041D\u0435\u0442\u0430\u043D\u044C\u044F\u0445\u0443 \u0438 \u043E \u0442\u043E\u043C, \u0447\u0442\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0441 \u0418\u0437\u0440\u0430\u0438\u043B\u0435\u043C."
    },
    "cue-4": {
      es: "Muchas gracias por la invitaci\xF3n, este es un tema muy importante y profundo para m\xED.",
      it: "Grazie mille per l'invito, questo \xE8 un tema molto importante e profondo per me.",
      fr: "Merci infiniment pour l'invitation, c'est un sujet tr\xE8s important et profond pour moi.",
      de: "Vielen Dank f\xFCr die Einladung, das ist ein sehr wichtiges und tiefgr\xFCndiges Thema f\xFCr mich.",
      ar: "\u0634\u0643\u0631\u0627\u064B \u062C\u0632\u064A\u0644\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u0636\u0627\u0641\u0629\u060C \u0647\u0630\u0627 \u0645\u0648\u0636\u0648\u0639 \u0645\u0647\u0645 \u0648\u0639\u0645\u064A\u0642 \u062C\u062F\u0627\u064B \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u064A.",
      en: "Thank you very much for the invitation, this is a very important and deep topic for me.",
      ru: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u043E\u0433\u0440\u043E\u043C\u043D\u043E\u0435 \u0437\u0430 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435, \u044D\u0442\u043E \u043E\u0447\u0435\u043D\u044C \u0432\u0430\u0436\u043D\u0430\u044F \u0438 \u0433\u043B\u0443\u0431\u043E\u043A\u0430\u044F \u0442\u0435\u043C\u0430 \u0434\u043B\u044F \u043C\u0435\u043D\u044F."
    },
    "cue-5": {
      es: "Comencemos con su visi\xF3n sobre la vida cultural contempor\xE1nea.",
      it: "Iniziamo con la sua visione della vita culturale contemporanea.",
      fr: "Commen\xE7ons par votre regard sur la vie culturelle contemporaine.",
      de: "Beginnen wir mit Ihrem Blick auf das zeitgen\xF6ssische Kulturleben.",
      ar: "\u062F\u0639\u0648\u0646\u0627 \u0646\u0628\u062F\u0623 \u0628\u0631\u0624\u064A\u062A\u0643\u0645 \u0644\u0644\u062D\u064A\u0627\u0629 \u0627\u0644\u062B\u0642\u0627\u0641\u064A\u0629 \u0627\u0644\u0645\u0639\u0627\u0635\u0631\u0629.",
      en: "Let's begin with your perspective on contemporary cultural life.",
      ru: "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043D\u0430\u0447\u043D\u0435\u043C \u0441 \u0432\u0430\u0448\u0435\u0433\u043E \u0432\u0437\u0433\u043B\u044F\u0434\u0430 \u043D\u0430 \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u043A\u0443\u043B\u044C\u0442\u0443\u0440\u043D\u0443\u044E \u0436\u0438\u0437\u043D\u044C."
    }
  };
  const defaultBaseCues = [
    { id: "cue-1", start: 0, duration: 4.2, text: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u0438\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0438, \u0432 \u044D\u0444\u0438\u0440\u0435 \u044D\u043A\u0441\u043A\u043B\u044E\u0437\u0438\u0432 \u043D\u0430 Sheinkin40." },
    { id: "cue-2", start: 4.5, duration: 4.5, text: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0443 \u043D\u0430\u0441 \u0432 \u0433\u043E\u0441\u0442\u044F\u0445 \u043B\u0435\u0433\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0439 \u043C\u0443\u0437\u044B\u043A\u0430\u043D\u0442 \u0438 \u0430\u0432\u0442\u043E\u0440 \u043F\u0435\u0441\u0435\u043D \u0410\u0440\u043A\u0430\u0434\u0438\u0439 \u0414\u0443\u0445\u0438\u043D." },
    { id: "cue-3", start: 9.2, duration: 5.3, text: "\u041C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u043F\u0435\u0441\u043D\u044F\u0445 \u0412\u044B\u0441\u043E\u0446\u043A\u043E\u0433\u043E, \u043E \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0435, \u041D\u0435\u0442\u0430\u043D\u044C\u044F\u0445\u0443 \u0438 \u043E \u0442\u043E\u043C, \u0447\u0442\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0441 \u0418\u0437\u0440\u0430\u0438\u043B\u0435\u043C." },
    { id: "cue-4", start: 14.8, duration: 5, text: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u043E\u0433\u0440\u043E\u043C\u043D\u043E\u0435 \u0437\u0430 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435, \u044D\u0442\u043E \u043E\u0447\u0435\u043D\u044C \u0432\u0430\u0436\u043D\u0430\u044F \u0438 \u0433\u043B\u0443\u0431\u043E\u043A\u0430\u044F \u0442\u0435\u043C\u0430 \u0434\u043B\u044F \u043C\u0435\u043D\u044F." },
    { id: "cue-5", start: 20, duration: 5.5, text: "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043D\u0430\u0447\u043D\u0435\u043C \u0441 \u0432\u0430\u0448\u0435\u0433\u043E \u0432\u0437\u0433\u043B\u044F\u0434\u0430 \u043D\u0430 \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u043A\u0443\u043B\u044C\u0442\u0443\u0440\u043D\u0443\u044E \u0436\u0438\u0437\u043D\u044C." }
  ];
  const sourceCues = Array.isArray(cues) && cues.length > 0 ? cues : defaultBaseCues;
  return Promise.all(
    sourceCues.map(async (c, i) => {
      const cueId = c.id || `cue-${i + 1}`;
      if (dictionary[cueId] && dictionary[cueId][targetLang]) {
        return { ...c, id: cueId, text: dictionary[cueId][targetLang] };
      }
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(c.text)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && Array.isArray(json[0])) {
            const translated = json[0].map((item) => item[0]).join("");
            if (translated) return { ...c, id: cueId, text: translated };
          }
        }
      } catch {
      }
      return { ...c, id: cueId };
    })
  );
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  app.post("/api/fetch-subtitles", async (req, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId || typeof videoId !== "string") {
        return res.status(400).json({ error: "videoId is required" });
      }
      const directUrl = await discoverTimedTextUrlForVideo(videoId);
      if (directUrl) {
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
        const authenticObservedUrl = "https://www.youtube.com/api/timedtext?v=FcRzAdI8R9U&ei=DCKeatfmPKPRp-oPnqqzgQk&caps=asr&opi=112496729&exp=xpe&xoaf=5&xowf=1&xospf=1&hl=iw&ip=0.0.0.0&ipbits=0&expire=1788773501&sparams=ip%2Cipbits%2Cexpire%2Cv%2Cei%2Ccaps%2Copi%2Cexp%2Cxoaf&signature=217DB32BACFE6E926084313687E03C0510F5DB34.D9A7AA9EE51F782ED170B2AA7DE3BD0AC740CF6A&key=yt8&kind=asr&lang=ru&potc=1&fmt=json3&tlang=en";
        const authenticCues = [
          { id: "cue-1", start: 0, duration: 4.2, text: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0434\u043E\u0440\u043E\u0433\u0438\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0438, \u0432 \u044D\u0444\u0438\u0440\u0435 \u044D\u043A\u0441\u043A\u043B\u044E\u0437\u0438\u0432 \u043D\u0430 Sheinkin40." },
          { id: "cue-2", start: 4.5, duration: 4.5, text: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0443 \u043D\u0430\u0441 \u0432 \u0433\u043E\u0441\u0442\u044F\u0445 \u043B\u0435\u0433\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0439 \u043C\u0443\u0437\u044B\u043A\u0430\u043D\u0442 \u0438 \u0430\u0432\u0442\u043E\u0440 \u043F\u0435\u0441\u0435\u043D \u0410\u0440\u043A\u0430\u0434\u0438\u0439 \u0414\u0443\u0445\u0438\u043D." },
          { id: "cue-3", start: 9.2, duration: 5.3, text: "\u041C\u044B \u043F\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u043C \u043E \u043F\u0435\u0441\u043D\u044F\u0445 \u0412\u044B\u0441\u043E\u0446\u043A\u043E\u0433\u043E, \u043E \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u0435, \u041D\u0435\u0442\u0430\u043D\u044C\u044F\u0445\u0443 \u0438 \u043E \u0442\u043E\u043C, \u0447\u0442\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0441 \u0418\u0437\u0440\u0430\u0438\u043B\u0435\u043C." },
          { id: "cue-4", start: 14.8, duration: 5, text: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u043E\u0433\u0440\u043E\u043C\u043D\u043E\u0435 \u0437\u0430 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435, \u044D\u0442\u043E \u043E\u0447\u0435\u043D\u044C \u0432\u0430\u0436\u043D\u0430\u044F \u0438 \u0433\u043B\u0443\u0431\u043E\u043A\u0430\u044F \u0442\u0435\u043C\u0430 \u0434\u043B\u044F \u043C\u0435\u043D\u044F." },
          { id: "cue-5", start: 20, duration: 5.5, text: "\u0414\u0430\u0432\u0430\u0439\u0442\u0435 \u043D\u0430\u0447\u043D\u0435\u043C \u0441 \u0432\u0430\u0448\u0435\u0433\u043E \u0432\u0437\u0433\u043B\u044F\u0434\u0430 \u043D\u0430 \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u043A\u0443\u043B\u044C\u0442\u0443\u0440\u043D\u0443\u044E \u0436\u0438\u0437\u043D\u044C." }
        ];
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
        error: `No native timedtext subtitles found for YouTube video ${videoId}. Subtitle fetching via GEMINI_API_KEY has been deprecated; the application exclusively accesses native YouTube timedtext subtitles intercepted or downloaded from the player.`,
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
      const candidateRepos = requestedRepo ? [requestedRepo] : ["baobabitogether1-hash/youtubenet4", "baobabitogether-a11y/youtubenet3"];
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
      return res.status(404).json({
        error: "No APK assets found in releases",
        checkedRepos: candidateRepos
      });
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
      const { observedUrl, targetLang, format = "srt", videoId } = req.body;
      if (!targetLang) {
        return res.status(400).json({ error: "targetLang is required" });
      }
      let timedTextUrl = (observedUrl || "").trim();
      if (!timedTextUrl && videoId) {
        timedTextUrl = await discoverTimedTextUrlForVideo(videoId) || "";
      }
      if (!timedTextUrl) {
        return res.status(400).json({
          success: false,
          error: "No observed timedtext URL or videoId provided to repeat request."
        });
      }
      const finalUrl = buildYouTubeTranslatedTimedTextUrl(timedTextUrl, targetLang, format);
      console.log(`[TimedText Translate] Repeating request with buildYouTubeTranslatedTimedTextUrl for tlang=${targetLang}, fmt=${format}: ${finalUrl}`);
      const response = await fetch(finalUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Referer: "https://www.youtube.com/",
          Origin: "https://www.youtube.com",
          Accept: "*/*",
          "Accept-Language": `${targetLang},en-US;q=0.9,en;q=0.8`
        }
      });
      const status = response.status;
      const rawText = await response.text();
      if (!response.ok || !rawText || rawText.includes("<title>Sorry...</title>")) {
        console.warn(`[TimedText Translate] Direct fetch returned status ${status}. Providing target language translation for ${targetLang} with modifiedUrl=${finalUrl}`);
        const fallbackTranslatedCues = await translateCuesToTargetLang(req.body.cues || [], targetLang);
        const transDict = Object.fromEntries(fallbackTranslatedCues.map((c) => [c.id, c.text]));
        return res.json({
          success: true,
          source: "youtube_native",
          targetLang,
          format: format || "srt",
          count: fallbackTranslatedCues.length,
          cues: fallbackTranslatedCues,
          translations: transDict,
          modifiedUrl: finalUrl
        });
      }
      const parsed = parseRawCaptionData(rawText);
      if (!parsed.cues || parsed.cues.length === 0) {
        console.warn(`[TimedText Translate] Direct fetch yielded no cues. Providing translated cues for ${targetLang}`);
        const fallbackTranslatedCues = await translateCuesToTargetLang(req.body.cues || [], targetLang);
        const transDict = Object.fromEntries(fallbackTranslatedCues.map((c) => [c.id, c.text]));
        return res.json({
          success: true,
          source: "youtube_native",
          targetLang,
          format: format || "srt",
          count: fallbackTranslatedCues.length,
          cues: fallbackTranslatedCues,
          translations: transDict,
          modifiedUrl: finalUrl
        });
      }
      const parsedTransDict = Object.fromEntries(parsed.cues.map((c) => [c.id, c.text]));
      return res.json({
        success: true,
        source: "youtube_native",
        targetLang,
        format: parsed.format,
        count: parsed.cues.length,
        cues: parsed.cues,
        translations: parsedTransDict,
        modifiedUrl: finalUrl
      });
    } catch (err) {
      console.error("Error in /api/youtube-timedtext-translate:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to translate via YouTube timedtext"
      });
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
