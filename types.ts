
export enum GamePhase {
  SETUP = 'setup',
  INSTRUCTION = 'instruction', 
  PLAYING = 'playing',
  RESULTS = 'results',
}

export enum GameMode {
  NORMAL = 'normal',
  HELL = 'hell',
  TEAM = 'team',
}

export interface GameSettings {
  words: string[]; 
  totalTimeLimit: number; // in seconds
  timePerWord?: number; // in seconds, for Team Mode
  gameMode: GameMode;
  isDemo?: boolean; // true when the round is a free demo (device not unlocked)
  // Palette ids from `services/teamColors.ts` — only Team mode paints two sides, but the
  // choice is carried on the settings so the results screen can match the board.
  teamAColor?: string;
  teamBColor?: string;
}

export interface CustomSoundFile {
  name: string;
  data: string; // base64 data URL
}
