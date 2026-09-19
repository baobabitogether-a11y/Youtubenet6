# Timed-Text Schema & Caption Normalization (SCHEMA_TIMEDTEXT.md)

This document specifies the exact data schemas, entity decoding, character normalization, and RTL/BiDi handling required for subtitle parsing across SubRip (`.srt`) and YouTube JSON3 (`.json`) formats.

---

## 1. Schema Definitions

### 1.1 YouTube JSON3 Format (`.json`)

YouTube's native timed-text format (`fmt=json3`) provides millisecond segment accuracy:

```json
{
  "wireMagic": "pb3",
  "events": [
    {
      "tStartMs": 1420,
      "dDurationMs": 2840,
      "segs": [
        {
          "utf8": "Hello ",
          "tOffsetMs": 0
        },
        {
          "utf8": "everyone,",
          "tOffsetMs": 420
        },
        {
          "utf8": " welcome!",
          "tOffsetMs": 1150
        }
      ]
    }
  ]
}
```

#### JSON3 Parsing Rules:
1. `start = event.tStartMs / 1000` (convert milliseconds to fractional seconds).
2. `duration = event.dDurationMs / 1000`.
3. If `dDurationMs` is missing or `<= 0`, fallback to `2.5` seconds or calculate distance to the next event start.
4. `text = event.segs.map(s => s.utf8).join('')`.
5. Retain `segs` array if fine-grained word-boundary highlighting is enabled.

---

### 1.2 SubRip Format (`.srt`)

Classic line-based timestamp format:

```text
1
00:00:01,420 --> 00:00:04,260
Hello everyone, welcome!

2
00:00:04,500 --> 00:00:08,100
Today we learn about modularity.
```

#### SRT Parsing Rules:
1. Parse timestamp block: `(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})`.
2. Convert start and end times to fractional seconds:
   $$\text{seconds} = \text{hours} \times 3600 + \text{minutes} \times 60 + \text{seconds} + \frac{\text{milliseconds}}{1000}$$
3. Calculate duration: $\text{duration} = \text{endSeconds} - \text{startSeconds}$.
4. Strip styling tags: remove HTML tags (`<i>`, `<b>`, `<u>`, `<font ...>`, `</font>`).

---

## 2. Text Normalization & Clean-up

Before cues are injected into views, the parser MUST execute these normalization steps:

### 2.1 HTML Entity Decoding
All escaped entities must be replaced with their literal UTF-8 equivalents:
- `&amp;` → `&`
- `&quot;` → `"`
- `&#39;` or `&apos;` → `'`
- `&lt;` → `<`
- `&gt;` → `>`
- `&#x2F;` → `/`
- `&nbsp;` → standard space

### 2.2 Mojibake & Encoding Repair
- Strip leading UTF-8 Byte Order Marks (`\uFEFF`).
- Replace Windows-1252 artifact sequences (e.g. `Ã©` → `é`, `â€™` → `'`) if raw text was incorrectly decoded as ISO-8859-1.
- Collapse excessive consecutive newlines (`\n{3,}`) into a single newline.

---

## 3. RTL (Right-to-Left) & BiDi Text Handling

Special rules apply to Hebrew (`he`, `iw`) and Arabic (`ar`):

1. **Direction Detection**:
   When `lang === 'he' || lang === 'iw' || lang === 'ar'`, or when Unicode text contains Hebrew/Arabic code ranges (`[\u0590-\u05FF\u0600-\u06FF]`), set text direction to `rtl`.
2. **Bidirectional Isolates**:
   Wrap mixed-script strings (e.g., Hebrew text containing an English technical term or YouTube channel name) using Unicode bidirectional marks or CSS `unicode-bidi: isolate;` to prevent punctuation inversion (e.g., period appearing on wrong side of sentence).
3. **Word Boundary Alignment**:
   In RTL layouts, word-boundary highlights must flow right-to-left.

---

## 4. Normalization Output Contract

Regardless of input format, parsers produce the uniform `CaptionCue` structure:

```ts
export interface CaptionCue {
  id: string;          // Formatted index: "cue-1", "cue-2", etc.
  start: number;       // In seconds (float, >= 0)
  duration: number;    // In seconds (float, > 0)
  text: string;        // Clean, trimmed UTF-8 string
  segments?: Array<{   // Optional word-level timing (from JSON3)
    text: string;
    offsetMs: number;
  }>;
}
```

This strict schema guarantees that views never need to know the origin of the subtitle track.
