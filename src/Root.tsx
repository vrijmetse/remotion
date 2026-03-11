import "./index.css";
import { Composition, getInputProps } from "remotion";
import { CoreEngine } from "./CoreEngine";
import { NarrationVideo, calculateNarrationMetadata } from "./NarrationVideo";

interface RenderProps {
  project_metadata: {
    title: string;
    total_frames: number;
  };
  timeline: Array<{
    timing: { start_frame: number; duration_frames: number };
    energy_level: number;
    assets: {
      environment: { bg_url: string; saturation: number };
      actors: Array<{ sprite_url: string; x: number; y: number; size: number }>;
    };
  }>;
}

export const RemotionRoot: React.FC = () => {
  const inputProps = (getInputProps() as unknown) as RenderProps;
  const { 
    project_metadata = { total_frames: 5760, title: "Untitled" } 
  } = inputProps;

  return (
    <>
      <Composition
        id="UniversalEngine"
        component={CoreEngine}
        durationInFrames={project_metadata.total_frames || 5760} 
        fps={30}
        width={1920}
        height={1080}
        defaultProps={({
          timeline: [],
          project_metadata: { total_frames: 5760, title: "Preview" }
        } as unknown) as RenderProps} 
      />
      <Composition
        id="NarrationVideo"
        component={NarrationVideo}
        fps={30}
        width={1920}
        height={1080} // Portrait orientation often used for narrations (shorts/TikTok)
        calculateMetadata={calculateNarrationMetadata}
        defaultProps={{
          scenes: [
            {
              scene_number: 1,
              technical_cue: "SLOW_ZOOM_IN",
              imageSrc: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba",
              audioSrc: "https://actions.google.com/sounds/v1/water/rain_on_roof.ogg",
              narrator_audio: "https://actions.google.com/sounds/v1/water/rain_on_roof.ogg",
              estimated_duration_seconds: 10,
            },
            {
              scene_number: 2,
              technical_cue: "SLOW_ZOOM_IN",
              imageSrc: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba",
              audioSrc: "https://actions.google.com/sounds/v1/water/rain_on_roof.ogg",
              narrator_audio: "https://actions.google.com/sounds/v1/water/rain_on_roof.ogg",
              estimated_duration_seconds: 10,
            }
          ]
        }}
      />
    </>
  );
};