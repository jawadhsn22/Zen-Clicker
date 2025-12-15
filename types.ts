
export enum UpgradeType {
  CLICK_POWER = 'CLICK_POWER',
  AUTO_CLICKER = 'AUTO_CLICKER',
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

export type ClickSoundVariant = 'default' | 'blaster' | 'bubble' | 'mechanical';

export interface Upgrade {
  id: string;
  name: string;
  type: UpgradeType;
  baseCost: number;
  basePower: number; // Amount it adds to click or per second
  costMultiplier: number;
  description: string;
  icon: string;
  condition?: (state: GameState) => boolean; // Unlock condition
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (state: GameState) => boolean;
  unlocked: boolean;
  icon: string;
}

export interface GameState {
  points: number;
  totalClicks: number;
  clickPower: number;
  autoPointsPerSecond: number;
  upgrades: Record<string, number>; // id -> count
  unlockedAchievements: string[];
  startTime: number;
  lastSaveTime: number; // New: For offline earnings
  prestigeLevel: number;
  theme: string;
  difficulty: Difficulty;
  multiplayerMatches: number;
  multiplayerWins: number;
  settings: {
    sfxVolume: number; // 0 to 1
    musicVolume: number; // 0 to 1
    clickSound: ClickSoundVariant;
    hapticsEnabled: boolean;
  };
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  value: string;
  scale: number;
  rotation: number;
  colorClass: string;
  duration: number;
}

export interface ThemeConfig {
  id: string;
  label: string;
  colors: {
    bg: string;
    text: string;
    textDim: string;
    accent: string;
    accentHover: string;
    accentGlow: string;
    panelBg: string;
    border: string;
    particle: string;
  };
}

export interface Challenge {
  id: string;
  description: string;
  targetType: 'CLICKS' | 'POINTS';
  targetAmount: number;
  duration: number; // seconds
  startTime: number;
  rewardPoints: number;
  startValue: number; // Value of clicks or points when challenge started
}
