import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  CalculateMetadataFunction,
  Sequence,
  Series,
} from "remotion";
import { Audio } from "@remotion/media";
import { getAudioDuration } from "./getAudioDuration";
import type { Caption } from "@remotion/captions";
import { TikTokCaptions } from "./TikTokCaptions";

export type TechnicalCue =
  | "SLOW_ZOOM_IN"
  | "SLOW_ZOOM_OUT"
  | "PAN_RIGHT"
  | "PAN_LEFT"
  | "TILT_UP"
  | "RACK_FOCUS"
  | "STATIC_MACRO"
  | "FADE_TO_BLACK";

export type SceneType = {
  scene_number: number;
  imageSrc: string;
  narrator_audio: string;
  audioSrc: string;
  technical_cue: TechnicalCue;
  estimated_duration_seconds: number;
  durationInFrames?: number;
  audioDurationSeconds?: number;
  captions?: Caption[];
};

export type NarrationVideoProps = {
  scenes: SceneType[];
  bgMusicSrc?: string;
};

const Atmosphere: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxShadow: "inset 0 0 150px rgba(0,0,0,0.6)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  </AbsoluteFill>
);

const getSafeCue = (input: string): TechnicalCue => {
  const cue = input.toUpperCase();
  if (cue.includes("FADE_TO_BLACK")) return "FADE_TO_BLACK";
  if (cue.includes("RACK_FOCUS")) return "RACK_FOCUS";
  if (cue.includes("STATIC_MACRO")) return "STATIC_MACRO";
  if (cue.includes("TILT_UP")) return "TILT_UP";
  if (cue.includes("PAN_LEFT")) return "PAN_LEFT";
  if (cue.includes("PAN_RIGHT")) return "PAN_RIGHT";
  if (cue.includes("SLOW_ZOOM_OUT")) return "SLOW_ZOOM_OUT";
  return "SLOW_ZOOM_IN"; // Default
};

const NarrationScene: React.FC<{
  scene: SceneType;
  duration: number;
  audioDurationInFrames: number;
}> = ({ scene, duration, audioDurationInFrames }) => {
  const frame = useCurrentFrame();
  const activeCue = useMemo(() => getSafeCue(scene.technical_cue), [scene.technical_cue]);
  const mDur = Math.min(duration, audioDurationInFrames + 15);

  // 1. Handle Transformations
  const transform = useMemo(() => {
    switch (activeCue) {
      case "SLOW_ZOOM_IN":
        return `scale(${interpolate(frame, [0, mDur], [1.05, 1.2], { extrapolateRight: "clamp" })})`;
      case "SLOW_ZOOM_OUT":
        return `scale(${interpolate(frame, [0, mDur], [1.2, 1.05], { extrapolateRight: "clamp" })})`;
      case "PAN_RIGHT":
        return `scale(1.15) translateX(${interpolate(frame, [0, mDur], [-8, 8], { extrapolateRight: "clamp" })}%)`;
      case "PAN_LEFT":
        return `scale(1.15) translateX(${interpolate(frame, [0, mDur], [8, -8], { extrapolateRight: "clamp" })}%)`;
      case "TILT_UP":
        return `scale(1.15) translateY(${interpolate(frame, [0, mDur], [5, -5], { extrapolateRight: "clamp" })}%)`;
      case "STATIC_MACRO":
        return `scale(${interpolate(frame, [0, mDur], [1.3, 1.32], { extrapolateRight: "clamp" })})`;
      default:
        return `scale(${interpolate(frame, [0, mDur], [1.05, 1.1])})`;
    }
  }, [frame, mDur, activeCue]);

  // 2. Handle Filters (Rack Focus & Fade to Black)
  const visualFilter = useMemo(() => {
    let filterString = "contrast(1.05) brightness(0.85)";
    
    if (activeCue === "RACK_FOCUS") {
      const blur = interpolate(frame, [0, mDur * 0.4, mDur * 0.6], [6, 0, 0], { extrapolateRight: "clamp" });
      filterString += ` blur(${blur}px)`;
    }

    if (activeCue === "FADE_TO_BLACK") {
      const brightness = interpolate(frame, [mDur * 0.7, mDur - 5], [0.85, 0], { extrapolateRight: "clamp" });
      filterString = `contrast(1.05) brightness(${brightness})`;
    }

    return filterString;
  }, [frame, mDur, activeCue]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Img
        src={scene.imageSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform,
          filter: visualFilter,
        }}
      />
      <AbsoluteFill>
        {scene.captions && scene.captions.length > 0 && (
          <TikTokCaptions captions={scene.captions} fps={30} />
        )}
      </AbsoluteFill>
      <Audio src={scene.audioSrc} />
    </AbsoluteFill>
  );
};

const LogoOverlay: React.FC<{ scenes: SceneType[]; tFrames: number }> = ({ scenes, tFrames }) => {
  const frame = useCurrentFrame();
  
  const scenesDuration = scenes.reduce((acc, s) => acc + (s.durationInFrames || 150), 0) - Math.max(0, scenes.length - 1) * tFrames;
  const lastScene = scenes[scenes.length - 1];
  const lastSceneDur = lastScene?.durationInFrames || 150;
  const lastSceneAudioDur = Math.ceil((lastScene?.audioDurationSeconds || lastSceneDur / 30) * 30);
  const mDur = Math.min(lastSceneDur, lastSceneAudioDur + 15);
  
  const fadeOutStartFrame = scenesDuration - lastSceneDur + mDur * 0.7;
  const fadeOutEndFrame = scenesDuration - lastSceneDur + (mDur - 5);

  const opacity = interpolate(
    frame,
    [fadeOutStartFrame, fadeOutEndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <Img
        src="https://res.cloudinary.com/dkrpeooca/image/upload/v1773184134/b_can_you_just_add_whi-removebg-preview_gebst8.png"
        style={{
          width: "280px",
          height: "auto",
          position: "absolute",
          top: "20px",
          left: "20px",
        }}
      />
    </AbsoluteFill>
  );
};

const LikeAndSubscribeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const bounce = interpolate(frame, [0, 15, 30], [0, -20, 0], { extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", justifyContent: "center", alignItems: "center", color: "white", flexDirection: "column" }}>
      <h1 style={{ fontSize: "60px", fontFamily: "sans-serif", fontWeight: "bold", marginBottom: "30px", textAlign: "center" }}>
        Enjoyed the story?
      </h1>
      <h2 style={{ fontSize: "40px", fontFamily: "sans-serif", color: "#ccc", marginBottom: "60px", textAlign: "center" }}>
        Like & Subscribe for more!
      </h2>
      <div style={{ display: "flex", gap: "60px", transform: `translateY(${bounce}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "100px", height: "100px", backgroundColor: "#3ea6ff", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
            </svg>
          </div>
          <span style={{ fontSize: "24px", fontWeight: "bold" }}>Like</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "100px", height: "100px", backgroundColor: "#ff0000", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
              <path d="M21.582 6.186a2.72 2.72 0 0 0-1.918-1.92C17.973 3.8 12 3.8 12 3.8s-5.973 0-7.664.466a2.72 2.72 0 0 0-1.918 1.92C1.954 7.886 1.954 12 1.954 12s0 4.114.464 5.814a2.72 2.72 0 0 0 1.918 1.92c1.691.466 7.664.466 7.664.466s5.973 0 7.664-.466a2.72 2.72 0 0 0 1.918-1.92c.464-1.7.464-5.814.464-5.814s0-4.114-.464-5.814zM9.954 15.334V8.666L15.75 12l-5.796 3.334z" />
            </svg>
          </div>
          <span style={{ fontSize: "24px", fontWeight: "bold" }}>Subscribe</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const NarrationVideo: React.FC<NarrationVideoProps> = ({
  scenes,
  bgMusicSrc,
}) => {
  const tFrames = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505" }}>
      {bgMusicSrc && <Audio src={bgMusicSrc} volume={0.06} loop />}
      <Series>
        {scenes.map((scene, index) => {
          const dur = scene.durationInFrames || 150;
          return (
            <Series.Sequence key={`${scene.scene_number}-${index}`} durationInFrames={dur}>
              <NarrationScene
                scene={scene}
                duration={dur}
                audioDurationInFrames={Math.ceil(
                  (scene.audioDurationSeconds || dur / 30) * 30,
                )}
              />
            </Series.Sequence>
          );
        })}
        <Series.Sequence durationInFrames={30}>
          <LikeAndSubscribeScene />
        </Series.Sequence>
      </Series>
      <Atmosphere />
      <LogoOverlay scenes={scenes} tFrames={tFrames} />
    </AbsoluteFill>
  );
};

export const calculateNarrationMetadata: CalculateMetadataFunction<
  NarrationVideoProps
> = async ({ props }) => {
  const fps = 30;
  const tFrames = 0;
  const likeAndSubscribeDur = 30;

  const updatedScenes = await Promise.all(
    props.scenes.map(async (scene) => {
      const aDur = await getAudioDuration(scene.audioSrc);
      const captions = scene.captions ?? [];
      const basePadding = 15;
      const durInFrames = Math.max(
        Math.ceil(aDur * fps) + basePadding,
        105,
      );
      return {
        ...scene,
        durationInFrames: durInFrames,
        audioDurationSeconds: aDur,
        captions,
      };
    }),
  );
  const finalDuration =
    updatedScenes.reduce((acc, s) => acc + (s.durationInFrames || 0), 0) -
    (updatedScenes.length - 1) * tFrames;
  return {
    durationInFrames: Math.max(finalDuration + likeAndSubscribeDur - tFrames, 30),
    props: { ...props, scenes: updatedScenes },
  };
};
