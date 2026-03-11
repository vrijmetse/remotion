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

const PRE_APPEAR_MS = 100;

const CaptionPage: React.FC<{ page: TikTokPage; startFrame: number }> = ({ page, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The 'frame' here is relative to the start of the Sequence.
  // We add the absolute startFrame to get the exact time relative to the scene.
  const currentTimeMs = ((frame + startFrame) / fps) * 1000;

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
                transition: "transform 0.12s, color 0.12s, background-color 0.12s, text-shadow 0.12s",
                display: "inline-block",
                textShadow: isActive ? "none" : "0 4px 15px rgba(0,0,0,1)",
                opacity: 1,
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
        // Start showing the caption slightly before the first word is spoken
        // so the viewer can anticipate it.
        let intendedStartMs = page.startMs - PRE_APPEAR_MS;
        
        // Prevent overlapping with the PREVIOUS page's last spoken word
        const prevPage = pages[index - 1];
        if (prevPage) {
           const prevLastTokenMs = prevPage.tokens[prevPage.tokens.length - 1].toMs;
           intendedStartMs = Math.max(intendedStartMs, prevLastTokenMs);
        }
        intendedStartMs = Math.max(0, intendedStartMs);

        const startFrame = Math.floor((intendedStartMs / 1000) * fps);
        
        // Calculate when the next page starts to avoid overlap
        let nextStartMs = pages[index + 1] 
          ? pages[index + 1].startMs - PRE_APPEAR_MS
          : null;
          
        if (nextStartMs !== null) {
             const lastTokenMs = page.tokens[page.tokens.length - 1].toMs;
             nextStartMs = Math.max(nextStartMs, lastTokenMs);
             nextStartMs = Math.max(0, nextStartMs);
        }
        
        const nextStartFrame = nextStartMs !== null 
          ? Math.floor((nextStartMs / 1000) * fps)
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
            <CaptionPage page={page} startFrame={startFrame} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};