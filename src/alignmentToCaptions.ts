import type { Caption } from "@remotion/captions";

export type ElevenLabsAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export const alignmentToCaptions = (
  alignment: ElevenLabsAlignment,
): Caption[] => {
  const captions: Caption[] = [];
  let currentWord = "";
  let wordStartMs = 0;
  let wordEndMs = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i];
    const startMs = Math.round(alignment.character_start_times_seconds[i] * 1000);
    const endMs = Math.round(alignment.character_end_times_seconds[i] * 1000);

    // If we encounter a space or newline, it signals the end of a word in ElevenLabs data
    if (char === " " || char === "\n") {
      if (currentWord) {
        captions.push({
          // Remotion wants the space BEFORE the word for their delimiter logic
          text: (captions.length === 0 ? "" : " ") + currentWord,
          startMs: wordStartMs,
          endMs: wordEndMs,
          timestampMs: wordStartMs,
          confidence: null,
        });
        currentWord = "";
      }
    } else {
      // If it's the first character of a new word, grab the start time
      if (!currentWord) {
        wordStartMs = startMs;
      }
      currentWord += char;
      wordEndMs = endMs;
    }
  }

  // Handle the very last word if there's no trailing space in the alignment data
  if (currentWord) {
    captions.push({
      text: (captions.length === 0 ? "" : " ") + currentWord,
      startMs: wordStartMs,
      endMs: wordEndMs,
      timestampMs: wordStartMs,
      confidence: null,
    });
  }

  return captions;
};