import React from 'react';
import { Img, useCurrentFrame, staticFile, useVideoConfig } from 'remotion';

interface SpriteSheetProps {
  /** The base path to the sequence folder relative to the public/ directory */
  basePath: string;
  /** The prefix of the files, e.g., 'frame_' */
  prefix: string;
  /** The file extension, usually 'png' */
  extension?: string;
  /** Number of digits in the padded file name, e.g., 3 for '001' */
  padLength?: number;
  /** The starting index of your sequence, e.g., 0 or 1 */
  startIndex?: number;
  /** If the sequence is shorter than the composition, you can loop it */
  loop?: boolean;
  /** Total frames in the sequence (required if loop is true) */
  totalSequenceFrames?: number;
}

export const SpriteSheet: React.FC<SpriteSheetProps> = ({
  basePath,
  prefix,
  extension = 'png',
  padLength = 3,
  startIndex = 0,
  loop = false,
  totalSequenceFrames = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate the current frame index for the sequence
  let sequenceFrame = frame;
  if (loop && totalSequenceFrames > 0) {
    sequenceFrame = frame % totalSequenceFrames;
  }
  
  // Add starting index offset
  const actualFrame = sequenceFrame + startIndex;

  // Pad the frame number (e.g., 1 -> '001')
  const paddedFrame = actualFrame.toString().padStart(padLength, '0');
  
  // Construct the file path
  // e.g., 'assets/performance/singer/frame_001.png'
  const filePath = `${basePath}/${prefix}${paddedFrame}.${extension}`;

  return (
    <Img 
      src={staticFile(filePath)} 
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        position: 'absolute'
      }} 
    />
  );
};