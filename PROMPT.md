# Active Prompt & Task Tracking (PROMPT.md)

## Active User Directive
> "altough tts:on is set - no tts play"
>
> Implementation Scope:
> 1. Diagnose and rectify why Text-to-Speech (TTS) fails to produce audio despite `autoTTSEnabled` / `tts:on` being enabled.
> 2. Fix the Auto-TTS narration loop in `VideoPlayer.tsx`: Ensure cue changes during video playback trigger narration for the displayed target-language text, pausing video during speech and seamlessly resuming playback when speech finishes.
> 3. Fix Web Speech API silent drops and missing-voice detection in `src/lib/ttsEngine.ts`: When system voices do not include the selected language (e.g., Hebrew `he`, Arabic `ar`), immediately cascade to the Neural Audio Stream endpoint (`/api/tts`) rather than silently dropping or using an English voice.
> 4. Ensure robust browser autoplay unlocking in `unlockTTSAudio()` with global interaction listeners on user gestures (`pointerdown`, `touchstart`, `keydown`, `click`).
> 5. Wire settings synchronization (`settings` and `onUpdateSettings`) between `App.tsx` and all `VideoPlayer.tsx` instances to maintain persistent `autoPlayTTS` state.
> 6. Provide immediate audible verification when the user clicks the `TTS: ON/OFF` toggle button.
> 7. Verify all verification scripts (`npm run test:caption-formats`, `npm run lint`, `npm run build`).

## Active Worklist
- [x] Identify root cause in `VideoPlayer.tsx` where Auto-TTS narration effect on `activeCue` change during video playback was missing.
- [x] Implement Auto-TTS playback loop in `VideoPlayer.tsx` with `lastAutoSpokenCueIdRef`, pause-and-resume coordination, and instant audio feedback on `toggleAutoTTS`.
- [x] Add auto-unpause in `playCurrentCueTTS` `finally` block when speech completes.
- [x] Connect `settings` and `onUpdateSettings` to both `<VideoPlayer>` instances in `App.tsx`.
- [x] Add missing voice detection in `WebSpeechEngineAdapter` to immediately fall back to the Neural Audio Stream rather than dropping speech silently for languages without OS voices installed (e.g. `he`, `ar`).
- [x] Improve `AudioStreamFallbackEngineAdapter` with audio unlock retry on `audio.play()` errors.
- [x] Add global pointer/touch/key listeners in `src/lib/ttsEngine.ts` to automatically unlock browser `AudioContext` and `speechSynthesis`.
- [x] Always enable Neural Audio Stream fallback in `speakText` cascade.
- [x] Verify caption fixture test (`npm run test:caption-formats`) passes cleanly with 10 fixtures.
- [x] Verify linter (`npm run lint`) passes with 0 errors.
- [x] Verify production build (`compile_applet`) passes.
