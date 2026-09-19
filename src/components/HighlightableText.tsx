import React, { useMemo, useState, useEffect } from 'react';
import { isRtl } from '../utils/rtlUtils';
import { TTSSyncMode } from '../utils/appSettings';

interface HighlightableTextProps {
  text: string;
  isSpeaking: boolean;
  activeCharIndex: number | null;
  syncMode?: TTSSyncMode;
  className?: string;
  activeWordClassName?: string;
  pastWordClassName?: string;
  futureWordClassName?: string;
  dir?: 'rtl' | 'ltr' | 'auto';
  lang?: string;
}

interface Token {
  id: number;
  text: string;
  isWord: boolean;
  start: number;
  end: number;
}

export const HighlightableText: React.FC<HighlightableTextProps> = ({
  text,
  isSpeaking,
  activeCharIndex,
  syncMode = 'word_boundary',
  className = '',
  activeWordClassName = 'word-boundary-active font-bold px-2 py-0.5 rounded shadow-lg ring-2 ring-amber-400/80 scale-105 inline-block mx-0.5 transition-all duration-100',
  pastWordClassName = 'text-neutral-300 opacity-90',
  futureWordClassName = 'text-neutral-100',
  dir,
  lang,
}) => {
  const effectiveDir = dir || (isRtl(lang, text) ? 'rtl' : 'ltr');

  // Animated RAF character index progress for Alternative 2 (time_linear) and Alternative 3 (word_step)
  const [animatedCharIdx, setAnimatedCharIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isSpeaking || !text || syncMode === 'word_boundary' || syncMode === 'full_sentence') {
      setAnimatedCharIdx(null);
      return;
    }

    // Estimated speech duration based on text length (~60ms per character, minimum 600ms)
    const durationMs = Math.max(600, text.length * 60);
    const startTime = Date.now();
    let rafId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const currentPos = Math.floor(progress * text.length);
      setAnimatedCharIdx(currentPos);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isSpeaking, text, syncMode]);

  // Determine effective char index according to selected sync mode alternative
  const effectiveCharIndex = useMemo(() => {
    if (syncMode === 'word_boundary') {
      return activeCharIndex;
    }
    if (animatedCharIdx !== null) {
      return animatedCharIdx;
    }
    return activeCharIndex;
  }, [syncMode, activeCharIndex, animatedCharIdx]);

  // Parse tokens (words and separators) with exact char ranges across Unicode scripts
  const tokens = useMemo<Token[]>(() => {
    if (!text) return [];
    const result: Token[] = [];
    // Unicode regex splits letters/numbers vs whitespace vs punctuation
    const regex = /(\s+|[^\s\p{L}\p{N}]+|[\p{L}\p{N}]+)/gu;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;
      const isWord = /\S/.test(matchText) && !/^[.,!?;:"'()[\]{}<>«»„“—–]+$/.test(matchText);

      result.push({
        id: idx++,
        text: matchText,
        isWord,
        start,
        end,
      });
    }
    return result;
  }, [text]);

  // Find active token index based on the 4 sync mode alternatives
  const activeTokenIndex = useMemo<number>(() => {
    if (!isSpeaking || tokens.length === 0) {
      return -1;
    }

    // Alternative 4: Full Sentence Duration Sync
    if (syncMode === 'full_sentence') {
      return -2; // Special flag: highlight all word tokens
    }

    if (effectiveCharIndex === null || effectiveCharIndex < 0) {
      return -1;
    }

    // Alternative 3: Discrete Word Step Sync
    if (syncMode === 'word_step') {
      const wordTokens = tokens.filter((t) => t.isWord);
      if (wordTokens.length > 0) {
        const wordIdx = Math.min(
          wordTokens.length - 1,
          Math.floor((effectiveCharIndex / (text.length || 1)) * wordTokens.length)
        );
        const targetWordToken = wordTokens[wordIdx];
        if (targetWordToken) {
          return tokens.findIndex((t) => t.id === targetWordToken.id);
        }
      }
    }

    // Alternative 1 (word_boundary) & Alternative 2 (time_linear): Character-to-Word mapping
    // 1. Exact range match inside a word token
    const exact = tokens.findIndex(
      (t) => t.isWord && effectiveCharIndex >= t.start && effectiveCharIndex < t.end
    );
    if (exact !== -1) return exact;

    // 2. If charIndex is at whitespace/punctuation after a word, highlight latest started word
    let latestWordIdx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].isWord && tokens[i].start <= effectiveCharIndex) {
        latestWordIdx = i;
      }
    }
    if (latestWordIdx !== -1) return latestWordIdx;

    // 3. Fallback to first word token
    const firstWord = tokens.findIndex((t) => t.isWord);
    return firstWord !== -1 ? firstWord : -1;
  }, [tokens, isSpeaking, effectiveCharIndex, syncMode, text.length]);

  if (!text) return null;

  if (!isSpeaking || activeTokenIndex === -1) {
    return (
      <span dir={effectiveDir} className={className}>
        {text}
      </span>
    );
  }

  // Alternative 4: Highlight full sentence
  if (syncMode === 'full_sentence' && activeTokenIndex === -2) {
    return (
      <span
        dir={effectiveDir}
        className={`${className} inline-block bg-amber-400 text-neutral-950 font-bold px-2 py-0.5 rounded shadow-md ring-2 ring-amber-300 transition-all`}
        data-testid="highlightable-text-container"
      >
        {text}
      </span>
    );
  }

  return (
    <span
      dir={effectiveDir}
      className={`${className} inline`}
      data-testid="highlightable-text-container"
    >
      {tokens.map((token, i) => {
        if (!token.isWord) {
          return <span key={token.id}>{token.text}</span>;
        }

        const isActive = i === activeTokenIndex;
        const isPast = i < activeTokenIndex;

        return (
          <span
            key={token.id}
            data-testid={isActive ? 'active-tts-word-highlight' : undefined}
            className={
              isActive
                ? activeWordClassName
                : isPast
                ? pastWordClassName
                : futureWordClassName
            }
          >
            {token.text}
          </span>
        );
      })}
    </span>
  );
};
