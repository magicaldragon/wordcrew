import type { IconName } from '../components/Icon';

/**
 * The tool shelf.
 *
 * Teacher Mode is the first tool and deliberately not part of the game catalogue: a game
 * is scored and ranked, a tool is a classroom utility. Tools get their own dashboard
 * section, so the next one is one entry here plus its screen — no nav surgery.
 */

export interface ToolDefinition {
  id: string;
  /** The shelf label — teachers refer to a tool by number, not by name. */
  slot: string;
  name: string;
  summary: string;
  icon: IconName;
  /** Chips under the summary, one per promise the tool actually keeps. */
  meta: string[];
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'check-vocabulary',
    slot: 'Tool 1',
    name: 'Check Vocabulary',
    summary:
      'Test one CEFR level, A1 to B2, or paste this week’s word list. Meanings are filled in for you to review, and the student gets a report instead of a score.',
    icon: 'type',
    meta: ['Levels A1–B2', 'Your own word list', 'Report per student'],
  },
];

export const CHECK_VOCABULARY = TOOLS[0];

/**
 * The single dial that decides who may open a tool.
 *
 *   'open' — launch phase: free for everyone, signed in or not.
 *   'role' — teachers only (`role: 'teacher'` on users/{uid}) plus the portal admin.
 *   'paid' — the full version, plus the admin. A teacher who has not bought it sees a
 *            locked card with the upgrade CTA — that is the point of the gate.
 *
 * Flip this one string to close the free phase. Nav visibility, the card, the locked
 * state and the paywall all read it from here, so nothing else needs to change.
 */
export type ToolAccessMode = 'open' | 'role' | 'paid';

/**
 * Mutable on purpose: a plain `const` literal would be narrowed to `'open'` at compile
 * time, so the `role` / `paid` branches would drop out of the build entirely.
 *
 * `freeUntil` is the launch promise: while `mode` is 'open', the gate closes by itself at
 * this instant, so the deadline holds without anyone remembering to deploy that day.
 */
export const TOOL_GATE: { mode: ToolAccessMode; freeUntil: string } = {
  mode: 'open',
  freeUntil: '2026-11-30T23:59:59+07:00',
};

/** The deadline as it prints in the UI — derived, so the date lives in exactly one place. */
export const TOOL_FREE_UNTIL_LABEL = new Date(TOOL_GATE.freeUntil).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * The mode actually in force. The launch window only ever closes an 'open' gate; a manual
 * 'role' or 'paid' override is left alone.
 */
export const toolGateMode = (): ToolAccessMode =>
  TOOL_GATE.mode === 'open' && Date.now() > Date.parse(TOOL_GATE.freeUntil)
    ? 'paid'
    : TOOL_GATE.mode;

export interface ToolViewer {
  isTeacher: boolean;
  isAdmin: boolean;
  /** This device or account already owns the full version. */
  isPro: boolean;
}

export type ToolDenial = 'role' | 'payment';

export interface ToolAccess {
  /** The mode in force right now — 'paid' once the launch window has passed. */
  mode: ToolAccessMode;
  allowed: boolean;
  denial: ToolDenial | null;
}

export const toolAccess = (viewer: ToolViewer): ToolAccess => {
  const mode = toolGateMode();
  if (mode === 'role') {
    return viewer.isAdmin || viewer.isTeacher
      ? { mode, allowed: true, denial: null }
      : { mode, allowed: false, denial: 'role' };
  }
  if (mode === 'paid') {
    return viewer.isAdmin || viewer.isPro
      ? { mode, allowed: true, denial: null }
      : { mode, allowed: false, denial: 'payment' };
  }
  return { mode, allowed: true, denial: null };
};

/**
 * Whether the tool section belongs in the nav at all.
 *
 * The paid phase keeps it visible for everyone — a hidden paywall sells nothing. Role
 * gating instead hides the tab, so students are not shown a door they can never open.
 */
export const toolsVisible = (access: ToolAccess): boolean =>
  access.allowed || access.mode === 'paid';
