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
  let currentText = "";
  let wordStartMs = 0;
  let wordEndMs = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i];
    const startMs = Math.round(alignment.character_start_times_seconds[i] * 1000);
    const endMs = Math.round(alignment.character_end_times_seconds[i] * 1000);

    if (char === " " || char === "\n") {
      // Extend the current word's end time to include the space
      // This prevents the highlight from flickering off between words
      if (currentText) {
        wordEndMs = endMs;
      }
    } else {
      // If the previous character was a space, we are starting a new word
      if (i > 0 && (alignment.characters[i - 1] === " " || alignment.characters[i - 1] === "\n")) {
        if (currentText) {
          captions.push({
            text: currentText,
            startMs: wordStartMs,
            endMs: wordEndMs,
            timestampMs: wordStartMs,
            confidence: null,
          });
          currentText = "";
        }
      }
      
      if (!currentText) {
        wordStartMs = startMs;
      }
      currentText += char;
      wordEndMs = endMs;
    }
  }

  // Handle the very last word
  if (currentText) {
    captions.push({
      text: currentText,
      startMs: wordStartMs,
      endMs: wordEndMs,
      timestampMs: wordStartMs,
      confidence: null,
    });
  }

  return captions;
};