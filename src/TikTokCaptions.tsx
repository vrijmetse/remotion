import React, { useMemo } from "react";
import {
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
} from "remotion";
import { createTikTokStyleCaptions } from "@remotion/captions";
import type { Caption, TikTokPage } from "@remotion/captions";

/** * STYLING CONSTANTS
 */
const HIGHLIGHT_BG = "white";
const HIGHLIGHT_TEXT = "black";
const DEFAULT_TEXT_COLOR = "white";
const SWITCH_CAPTIONS_EVERY_MS = 2500;

const CaptionPage: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Since this is inside a TransitionSeries.Sequence, 
  // frame 0 is the start of the scene.
  const currentTimeMs = (frame / fps) * 1000;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "120px",
      }}
    >
      <div
        style={{
          fontSize: "55px",
          fontWeight: "900",
          fontFamily: "'Inter', 'Arial Black', sans-serif",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignContent: "center",
          gap: "12px 18px",
          width: "85%",
          lineHeight: 1.6,
          textAlign: "center",
          margin: "0 auto",
        }}
      >
        {page.tokens.map((token, index) => {
          // Absolute comparison works because currentTimeMs is relative to scene start
          const isActive =
            currentTimeMs >= token.fromMs && currentTimeMs < token.toMs;
          
          const hasBeenSpoken = currentTimeMs >= token.fromMs;

          return (
            <span
              key={`${token.fromMs}-${index}`}
              style={{
                backgroundColor: isActive ? HIGHLIGHT_BG : "transparent",
                color: isActive ? HIGHLIGHT_TEXT : DEFAULT_TEXT_COLOR,
                padding: "4px 14px",
                borderRadius: "6px",
                transform: isActive 
                  ? `scale(1.12) rotate(${index % 2 === 0 ? -1.5 : 1.5}deg)` 
                  : `scale(1) rotate(0deg)`,
                transition: "all 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                display: "inline-block",
                textShadow: isActive ? "none" : "0 4px 15px rgba(0,0,0,1)",
                opacity: hasBeenSpoken ? 1 : 0,
              }}
            >
              {token.text.toUpperCase()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const TikTokCaptions: React.FC<{ captions: Caption[]; fps: number }> = ({
  captions,
  fps,
}) => {
  const { pages } = useMemo(() => {
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
    });
  }, [captions]);

  return (
    <AbsoluteFill>
      {pages.map((page, index) => {
        // Start frame relative to the scene (0)
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        
        // Calculate when the next page starts to avoid overlap
        const nextStartFrame = pages[index + 1] 
          ? Math.floor((pages[index + 1].startMs / 1000) * fps)
          : null;

        // Duration calculation
        const lastTokenEndMs = page.tokens[page.tokens.length - 1].toMs;
        const endFrame = Math.floor((lastTokenEndMs / 1000) * fps) + Math.floor(fps * 0.5);

        // Clip the duration so it doesn't bleed into the next page
        const finalEndFrame = nextStartFrame ? Math.min(endFrame, nextStartFrame) : endFrame;
        const durationInFrames = Math.max(finalEndFrame - startFrame, 1);

        return (
          <Sequence
            key={`${page.startMs}-${index}`}
            from={startFrame}
            durationInFrames={durationInFrames}
            layout="none"
          >
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};