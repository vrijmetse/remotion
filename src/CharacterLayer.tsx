import React from 'react';
import { 
  spring, 
  useCurrentFrame, 
  useVideoConfig, 
  interpolate, 
  Img,
  AbsoluteFill,
  staticFile
} from 'remotion';

interface Props {
  spriteUrl: string;
  bpm: number;
  energy: number;
  x?: number; // Start X (0 to 100)
  y?: number; // Start Y (0 to 100)
  endX?: number; // Optional End X
  endY?: number; // Optional End Y
  size?: number; // 0 to 100
}

export const CharacterLayer: React.FC<Props> = ({ 
  spriteUrl, 
  bpm, 
  energy,
  x = 50,
  y = 80,
  endX,
  endY,
  size = 70
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Interpolate position if end coordinates are provided
  const currentX = endX !== undefined 
    ? interpolate(frame, [0, durationInFrames], [x, endX]) 
    : x;
  const currentY = endY !== undefined 
    ? interpolate(frame, [0, durationInFrames], [y, endY]) 
    : y;

  const speedMultiplier = energy > 8 ? 2 : 1;
  const framesPerBeat = (60 / bpm) * fps / speedMultiplier;

  const stiffness = interpolate(energy, [1, 10], [40, 220]);
  const bounce = spring({
    frame: frame % framesPerBeat,
    fps,
    config: { stiffness, damping: 12 },
  });

  const jitter = energy === 10 ? Math.sin(frame * 1.5) * 3 : 0;
  const scale = interpolate(bounce, [0, 1], [1, 1.12]);
  const translateY = interpolate(bounce, [0, 1], [0, -30]);

  return (
    <div style={{
      position: 'absolute',
      left: `${currentX}%`,
      top: `${currentY}%`,
      transform: `translate(-50%, -100%) scale(${scale}) translateY(${translateY + jitter}px)`,
      width: `${size}%`,
      display: 'flex',
      justifyContent: 'center'
    }}>
      <Img 
        src={spriteUrl.startsWith('http') ? spriteUrl : staticFile(spriteUrl)} 
        style={{ height: 'auto', width: '100%' }} 
      />
    </div>
  );
};