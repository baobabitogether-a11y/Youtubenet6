# Subtitle Fixture Library (LIBRARY.md)

## 1. Purpose

The subtitle fixture library is a core architectural component of the application. It provides deterministic, offline-capable subtitle datasets for development, visual verification, and automated browser testing without relying on live YouTube caption network requests.

Because browser JavaScript cannot inspect or intercept cross-origin network traffic originating inside a standard YouTube `<iframe>`, the browser companion relies on this library to provide authentic timed captions across multiple languages and formats.

---

## 2. Library Location and Directory Structure

The fixture library resides at:

```text
test/fixtures/
```

Fixtures are strictly organized by YouTube video ID (`<VIDEO_ID>`):

```text
test/fixtures/<VIDEO_ID>/*.{json,srt}
```

### Directory Layout Example

```text
test/fixtures/
├── FcRzAdI8R9U/                # YouTube Video ID
│   ├── ar.srt                  # Arabic Subtitles (SRT format)
│   ├── en.srt                  # English Subtitles (SRT format)
│   ├── he.srt                  # Hebrew Subtitles (SRT format)
│   ├── it.srt                  # Italian Subtitles (SRT format)
│   ├── ru.srt                  # Russian Subtitles (SRT format)
│   └── srtStrings.ts           # Optional TypeScript string fixtures
│
└── L2Ryrr6txwA/                # YouTube Video ID
    ├── ar.json                 # Arabic Subtitles (YouTube JSON3 format)
    ├── en.json                 # English Subtitles (YouTube JSON3 format)
    ├── he.json                 # Hebrew Subtitles (YouTube JSON3 format)
    ├── it.json                 # Italian Subtitles (YouTube JSON3 format)
    └── ru.json                 # Russian Subtitles (YouTube JSON3 format)
```

---

## 3. Supported Subtitle Formats

The fixture library and its parsers support two formats:

### 3.1 SubRip Text (`.srt`)
- **Extension**: `.srt`
- **File Structure**:
  - Sequential numeric cue identifier.
  - Timestamp span in `HH:MM:SS,mmm --> HH:MM:SS,mmm` notation.
  - Subtitle text line(s).
  - Blank line separating cues.
- **Reference Fixture**: `test/fixtures/FcRzAdI8R9U/*.srt`

### 3.2 YouTube JSON3 Timed Text (`.json`)
- **Extension**: `.json` (Note: Represents the YouTube timedtext JSON3 schema; not arbitrary JSON).
- **Structure**:
  - Root `events` array containing timed caption event objects.
  - `tStartMs` (integer milliseconds start time).
  - `dDurationMs` (integer milliseconds duration).
  - `segs` array containing text segment objects (`utf8` text string and optional character timing).
- **Reference Fixture**: `test/fixtures/L2Ryrr6txwA/*.json`
- **Preference**: JSON3 is the preferred format when fetching subtitles because it provides millisecond-accurate word/segment timing that enables rich word-level highlight synchronization.

---

## 4. How Fixtures Are Consumed by the Web Companion

1. **Provider Resolution**:
   When a user loads a video or selects a language track, the fixture provider scans `test/fixtures/<VIDEO_ID>/` for matching files by language code (e.g., `he`, `it`, `en`, `ar`, `ru`).
2. **Format Normalization**:
   The parser parses either the `.srt` or `.json` (JSON3) file and normalizes it into a common `CaptionCue[]` array:
   ```ts
   interface CaptionCue {
     id: string;        // Unique identifier (e.g. "cue-1", "0")
     start: number;     // Start timestamp in seconds (float)
     duration: number;  // Display duration in seconds (float)
     text: string;      // Normalized subtitle display text
   }
   ```
3. **Dependency Injection**:
   The normalized `CaptionCue[]` array is injected into the pure subtitle renderer views defined in `DESIGN_SUBTITLE_VIEWS.md`. The renderer receives clean, formatted data without knowing whether the source was SRT, JSON3, local file, or live network stream.

---

## 5. Naming and Organization Conventions

- **Directory Name**: Must match the exact 11-character YouTube video ID (case-sensitive).
- **File Name**: Must be `<LANG_CODE>.<FORMAT>` where `<LANG_CODE>` is an ISO 639-1 or YouTube language code (e.g., `en`, `he`, `ar`, `it`, `ru`, `es`, `zh-CN`).
- **File Encoding**: Must be UTF-8 without BOM.
- **Error Behavior**: Empty or malformed fixture files must produce an explicit parsing error; they must not be presented as empty or valid subtitles.

---

## 6. Verification

The fixture library is validated via an automated format verification script:

```bash
npm run test:caption-formats
```

This command inspects all `.srt` and `.json` fixtures under `test/fixtures/FcRzAdI8R9U/` and `test/fixtures/L2Ryrr6txwA/`, verifying file format detection, timing validity (`start >= 0`, `duration > 0`), and non-empty cue text.
