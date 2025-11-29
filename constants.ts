
import { Upgrade, UpgradeType, Achievement, GameState, ThemeConfig, Difficulty } from './types';

export const INITIAL_STATE: GameState = {
  points: 0,
  totalClicks: 0,
  clickPower: 1,
  autoPointsPerSecond: 0,
  upgrades: {},
  unlockedAchievements: [],
  startTime: Date.now(),
  prestigeLevel: 0,
  theme: 'zen',
  difficulty: Difficulty.NORMAL,
  multiplayerMatches: 0,
  multiplayerWins: 0,
  settings: {
    sfxVolume: 0.5,
    musicVolume: 0.0, // Default off or low
    clickSound: 'default',
  }
};

export const PRESTIGE_THRESHOLD = 1000000;
export const PRESTIGE_MULTIPLIER_PER_LEVEL = 0.5; // +50% per level

export const DIFFICULTY_CONFIG: Record<Difficulty, { costMult: number; outputMult: number; label: string }> = {
  [Difficulty.EASY]: { costMult: 0.8, outputMult: 1.2, label: 'Relaxed' },
  [Difficulty.NORMAL]: { costMult: 1.0, outputMult: 1.0, label: 'Balanced' },
  [Difficulty.HARD]: { costMult: 1.5, outputMult: 0.8, label: 'Hardcore' },
};

export const THEMES: Record<string, ThemeConfig> = {
  zen: {
    id: 'zen',
    label: 'Dark Zen',
    colors: {
      bg: 'bg-zinc-950',
      text: 'text-zinc-100',
      textDim: 'text-zinc-500',
      accent: 'text-violet-500',
      accentHover: 'hover:border-violet-500/50',
      accentGlow: 'shadow-[0_0_60px_-15px_rgba(124,58,237,0.3)]',
      panelBg: 'bg-zinc-900/50',
      border: 'border-zinc-800',
      particle: 'text-violet-400',
    }
  },
  neon: {
    id: 'neon',
    label: 'Cyber Neon',
    colors: {
      bg: 'bg-slate-950',
      text: 'text-cyan-50',
      textDim: 'text-slate-500',
      accent: 'text-cyan-400',
      accentHover: 'hover:border-cyan-400/50',
      accentGlow: 'shadow-[0_0_60px_-15px_rgba(34,211,238,0.4)]',
      panelBg: 'bg-slate-900/60',
      border: 'border-slate-800',
      particle: 'text-cyan-300',
    }
  },
  nature: {
    id: 'nature',
    label: 'Deep Forest',
    colors: {
      bg: 'bg-stone-950',
      text: 'text-stone-100',
      textDim: 'text-stone-500',
      accent: 'text-emerald-500',
      accentHover: 'hover:border-emerald-500/50',
      accentGlow: 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)]',
      panelBg: 'bg-stone-900/50',
      border: 'border-stone-800',
      particle: 'text-emerald-400',
    }
  }
};

export const UPGRADES: Upgrade[] = [
  {
    id: 'cursor_reinforce',
    name: 'Reinforced Mouse',
    type: UpgradeType.CLICK_POWER,
    baseCost: 15,
    basePower: 1,
    costMultiplier: 1.5,
    description: '+1 Point per click',
    icon: 'MousePointer2'
  },
  {
    id: 'auto_clicker_bot',
    name: 'Auto-Clicker Bot',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 50,
    basePower: 2,
    costMultiplier: 1.4,
    description: '+2 Points per second',
    icon: 'Bot'
  },
  {
    id: 'double_tap',
    name: 'Double Tap Module',
    type: UpgradeType.CLICK_POWER,
    baseCost: 250,
    basePower: 5,
    costMultiplier: 1.6,
    description: '+5 Points per click',
    icon: 'Zap'
  },
  {
    id: 'gpu_miner',
    name: 'Point Miner GPU',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 1000,
    basePower: 15,
    costMultiplier: 1.5,
    description: '+15 Points per second',
    icon: 'Cpu'
  },
  {
    id: 'quantum_clicker',
    name: 'Quantum Clicker',
    type: UpgradeType.CLICK_POWER,
    baseCost: 5000,
    basePower: 50,
    costMultiplier: 1.8,
    description: '+50 Points per click',
    icon: 'Atom'
  },
  {
    id: 'ai_manager',
    name: 'AI Manager',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 12000,
    basePower: 100,
    costMultiplier: 1.6,
    description: '+100 Points per second',
    icon: 'Brain'
  },
  {
    id: 'reality_engine',
    name: 'Reality Engine',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 150000,
    basePower: 1000,
    costMultiplier: 1.7,
    description: '+1,000 Points per second',
    icon: 'Globe'
  },
  // NEW UPGRADES
  {
    id: 'neural_link',
    name: 'Neural Link',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 500000,
    basePower: 2500,
    costMultiplier: 1.8,
    description: '+2,500 Points per second',
    icon: 'Network'
  },
  {
    id: 'cosmic_ray',
    name: 'Cosmic Ray Collector',
    type: UpgradeType.CLICK_POWER,
    baseCost: 1000000,
    basePower: 500,
    costMultiplier: 2.0,
    description: '+500 Points per click',
    icon: 'Sun'
  },
  {
    id: 'dyson_sphere',
    name: 'Mini Dyson Sphere',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 5000000,
    basePower: 15000,
    costMultiplier: 1.8,
    description: '+15,000 Points per second',
    icon: 'Disc'
  },
  {
    id: 'omniscient_cursor',
    name: 'Omniscient Cursor',
    type: UpgradeType.CLICK_POWER,
    baseCost: 25000000,
    basePower: 5000,
    costMultiplier: 2.2,
    description: '+5,000 Points per click',
    icon: 'Eye'
  },
  {
    id: 'entropy_reverser',
    name: 'Entropy Reverser',
    type: UpgradeType.AUTO_CLICKER,
    baseCost: 100000000,
    basePower: 100000,
    costMultiplier: 2.0,
    description: '+100,000 Points per second',
    icon: 'Infinity'
  },
  {
    id: 'multiverse_tap',
    name: 'Multiverse Tap',
    type: UpgradeType.CLICK_POWER,
    baseCost: 500000000,
    basePower: 25000,
    costMultiplier: 2.5,
    description: '+25,000 Points per click',
    icon: 'Sparkles'
  }
];

export const ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Click 10 times',
    condition: (s) => s.totalClicks >= 10,
    icon: 'Footprints'
  },
  {
    id: 'click_master',
    name: 'Finger Fatigue',
    description: 'Click 1,000 times',
    condition: (s) => s.totalClicks >= 1000,
    icon: 'HandMetal'
  },
  {
    id: 'novice_saver',
    name: 'Piggy Bank',
    description: 'Reach 500 points at once',
    condition: (s) => s.points >= 500,
    icon: 'PiggyBank'
  },
  {
    id: 'automated',
    name: 'Automation Era',
    description: 'Reach 50 points per second',
    condition: (s) => s.autoPointsPerSecond >= 50,
    icon: 'Factory'
  },
  {
    id: 'big_league',
    name: 'Millionaire',
    description: 'Reach 1,000,000 points',
    condition: (s) => s.points >= 1000000,
    icon: 'Trophy'
  },
  {
    id: 'prestige_one',
    name: 'Rebirth',
    description: 'Prestige for the first time',
    condition: (s) => s.prestigeLevel >= 1,
    icon: 'RefreshCw'
  },
  {
    id: 'prestige_master',
    name: 'Time Traveler',
    description: 'Prestige 3 times',
    condition: (s) => s.prestigeLevel >= 3,
    icon: 'Crown'
  },
  {
    id: 'upgrade_addict',
    name: 'Upgrade Addict',
    description: 'Purchase 50 total upgrades',
    condition: (s) => Object.values(s.upgrades).reduce((a, b) => a + b, 0) >= 50,
    icon: 'ShoppingBag'
  },
  {
    id: 'hard_worker',
    name: 'Hard Worker',
    description: 'Reach 10,000 points on Hard difficulty',
    condition: (s) => s.points >= 10000 && s.difficulty === Difficulty.HARD,
    icon: 'Dumbbell'
  },
  // NEW ACHIEVEMENTS
  {
    id: 'time_lord',
    name: 'Time Lord',
    description: 'Reach Prestige Level 5',
    condition: (s) => s.prestigeLevel >= 5,
    icon: 'Hourglass'
  },
  {
    id: 'transcendent',
    name: 'Transcendent',
    description: 'Reach Prestige Level 10',
    condition: (s) => s.prestigeLevel >= 10,
    icon: 'Sparkles'
  },
  {
    id: 'void_walker',
    name: 'Void Walker',
    description: 'Reach Prestige Level 20',
    condition: (s) => s.prestigeLevel >= 20,
    icon: 'Ghost'
  },
  {
    id: 'first_contact',
    name: 'First Contact',
    description: 'Play a Multiplayer match',
    condition: (s) => s.multiplayerMatches >= 1,
    icon: 'Users'
  },
  {
    id: 'friendly_rivalry',
    name: 'Friendly Rivalry',
    description: 'Win 1 Multiplayer match',
    condition: (s) => s.multiplayerWins >= 1,
    icon: 'Swords'
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 10 Multiplayer matches',
    condition: (s) => s.multiplayerWins >= 10,
    icon: 'Medal'
  }
];
