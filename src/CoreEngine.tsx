import React from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { CharacterLayer } from './CharacterLayer';

export const CoreEngine: React.FC<{timeline: any[]}> = ({ timeline }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {timeline.map((scene, index) => (
        <Sequence 
          key={index}
          from={scene.timing.start_frame} 
          durationInFrames={scene.timing.duration_frames}
        >
          {/* Background Layer */}
          <AbsoluteFill style={{
            backgroundImage: `url(${scene.assets.environment.bg_url})`,
            backgroundSize: 'cover',
            filter: `saturate(${scene.assets.environment.saturation || 1})`
          }} />

          {/* Multiple Actor Layer - Loops through all objects/characters */}
          {scene.assets.actors.map((actor: any, aIdx: number) => (
            <CharacterLayer 
              key={`${index}-${aIdx}`}
              spriteUrl={actor.sprite_url}
              x={actor.x}
              y={actor.y}
              endX={actor.end_x}
              endY={actor.end_y}
              size={actor.size}
              bpm={120} 
              energy={scene.energy_level || 5}
            />
          ))}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};