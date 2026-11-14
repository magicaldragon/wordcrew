/**
 * The colours a team's name and word are painted with.
 *
 * A free-form colour picker would let a team pick a colour that vanishes: the playfield
 * and the word card are fixed near-black (`--surface-0` / `--surface-1`), so a dark red
 * or a deep navy would drop under 3:1. This is a closed palette instead — every entry is
 * a bright mid-tone (Tailwind's 400 step) that clears WCAG AA for large text on that
 * background, with a lighter 300 step for the small team captions and an RGB triplet for
 * the glow that pulses around whoever is on turn.
 */
export type TeamColorId = 'cyan' | 'orange' | 'emerald' | 'violet' | 'rose' | 'amber';

export interface TeamColor {
  id: TeamColorId;
  /** Word, turn banner, borders and the results score — the loud tone. */
  hex: string;
  /** "Team A" caption, one step lighter so small text stays comfortable. */
  soft: string;
  /** R, G, B as a bare triplet, so callers can build rgba() glows and tints. */
  rgb: string;
}

export const TEAM_COLORS: readonly TeamColor[] = [
  { id: 'cyan', hex: '#22d3ee', soft: '#67e8f9', rgb: '34, 211, 238' },
  { id: 'orange', hex: '#fb923c', soft: '#fdba74', rgb: '251, 146, 60' },
  { id: 'emerald', hex: '#34d399', soft: '#6ee7b7', rgb: '52, 211, 153' },
  { id: 'violet', hex: '#a78bfa', soft: '#c4b5fd', rgb: '167, 139, 250' },
  { id: 'rose', hex: '#fb7185', soft: '#fda4af', rgb: '251, 113, 133' },
  { id: 'amber', hex: '#fbbf24', soft: '#fcd34d', rgb: '251, 191, 36' },
];

export const DEFAULT_TEAM_A_COLOR: TeamColorId = 'cyan';
export const DEFAULT_TEAM_B_COLOR: TeamColorId = 'orange';

/**
 * Maps a stored id onto the palette. Anything unknown (an old build's id, a hand-edited
 * storage entry) falls back to the default instead of painting an unreadable colour.
 */
export const resolveTeamColor = (
  id: string | undefined,
  fallbackId: TeamColorId = DEFAULT_TEAM_A_COLOR,
): TeamColor =>
  TEAM_COLORS.find((color) => color.id === id) ??
  TEAM_COLORS.find((color) => color.id === fallbackId) ??
  TEAM_COLORS[0];

export interface TeamColorPair {
  a: TeamColorId;
  b: TeamColorId;
}

// Beside the other device-scoped settings, so a classroom laptop keeps its teams.
const STORAGE_KEY = 'wordcrew_team_colors';

export const readTeamColors = (): TeamColorPair => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { a: DEFAULT_TEAM_A_COLOR, b: DEFAULT_TEAM_B_COLOR };
    const parsed: unknown = JSON.parse(raw);
    const a = (parsed as TeamColorPair | null)?.a;
    const b = (parsed as TeamColorPair | null)?.b;
    return {
      a: resolveTeamColor(a, DEFAULT_TEAM_A_COLOR).id,
      b: resolveTeamColor(b, DEFAULT_TEAM_B_COLOR).id,
    };
  } catch {
    return { a: DEFAULT_TEAM_A_COLOR, b: DEFAULT_TEAM_B_COLOR };
  }
};

export const writeTeamColors = (pair: TeamColorPair): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
  } catch {
    /* Storage unavailable: the choice simply lasts for this session. */
  }
};
