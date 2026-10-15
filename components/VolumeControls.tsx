import React from 'react';
import { Icon } from './Icon';

interface VolumeControlsProps {
  musicVolume: number;
  onMusicVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  effectsVolume: number;
  onEffectsVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  // Keeps the input/label ids unique when the same controls are rendered twice
  // (Setup screen + in-game pause menu).
  idPrefix: string;
}

/**
 * Shared Music / Effects level sliders. Lives in the Setup settings panel and in
 * the in-game pause menu so the levels are reachable both before and during a round.
 */
export const VolumeControls: React.FC<VolumeControlsProps> = ({
  musicVolume,
  onMusicVolumeChange,
  effectsVolume,
  onEffectsVolumeChange,
  idPrefix,
}) => (
  <div className="flex flex-col gap-2.5">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={`${idPrefix}musicVolume`} className="text-xs sm:text-sm text-light-text">
        Music
      </label>
      <div className="flex items-center gap-2">
        <span className="text-muted-text" aria-hidden="true"><Icon name="music" size={16} /></span>
        <input
          type="range"
          id={`${idPrefix}musicVolume`}
          min="0"
          max="1"
          step="0.01"
          value={musicVolume}
          onChange={onMusicVolumeChange}
          className="h-2 w-32 sm:w-44 rounded-lg bg-cyber-purple appearance-none cursor-pointer accent-electric-blue"
          aria-label="Music volume"
        />
        <span className="w-9 text-right text-xs text-muted-text">{(musicVolume * 100).toFixed(0)}%</span>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={`${idPrefix}effectsVolume`} className="text-xs sm:text-sm text-light-text">
        Effects
      </label>
      <div className="flex items-center gap-2">
        <span className="text-muted-text" aria-hidden="true"><Icon name="volume" size={16} /></span>
        <input
          type="range"
          id={`${idPrefix}effectsVolume`}
          min="0"
          max="1"
          step="0.01"
          value={effectsVolume}
          onChange={onEffectsVolumeChange}
          className="h-2 w-32 sm:w-44 rounded-lg bg-cyber-purple appearance-none cursor-pointer accent-neon-green"
          aria-label="Effects volume"
        />
        <span className="w-9 text-right text-xs text-muted-text">{(effectsVolume * 100).toFixed(0)}%</span>
      </div>
    </div>
  </div>
);
