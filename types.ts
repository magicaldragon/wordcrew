
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
}

export interface CustomSoundFile {
  name: string;
  data: string; // base64 data URL
}
