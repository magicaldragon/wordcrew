import type { SoloTrack } from '../services/solo';
import type { Dictionary } from './types';

type TrackText = { name: string; tagline: string };

/**
 * Solo track names and taglines live in `services/solo.ts` because the engine picks the
 * word lists by track id. The copy a reader sees is translated by that same id, so every
 * screen that prints a track routes through here instead of printing the engine string.
 */
export function trackText(
  tracks: Dictionary['game']['setup']['tracks'],
  track: Pick<SoloTrack, 'id' | 'name' | 'tagline'>,
): TrackText {
  return (tracks as Record<string, TrackText>)[track.id] ?? track;
}
