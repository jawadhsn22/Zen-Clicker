
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Upgrade, UpgradeType, ThemeConfig, Challenge, Difficulty, ClickSoundVariant } from './types';
import { INITIAL_STATE, UPGRADES, ACHIEVEMENTS, THEMES, PRESTIGE_THRESHOLD, PRESTIGE_MULTIPLIER_PER_LEVEL, DIFFICULTY_CONFIG } from './constants';
import Clicker from './components/Clicker';
import UpgradeShop from './components/UpgradeShop';
import AchievementPanel from './components/AchievementPanel';
import Toast from './components/Toast';
import ChallengeWidget from './components/ChallengeWidget';
import MultiplayerGame from './components/MultiplayerGame';
import PrestigeSuccess from './components/PrestigeSuccess';
import OfflineModal from './components/OfflineModal';
import { Crown, Settings, Users, Volume2, VolumeX, Moon, MousePointer2, ShoppingBag, Menu, Sparkles, Save, Vibrate, Trophy, X, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { playSound, setVolumes } from './utils/sound';

// --- SECURITY UTILS ---
const SAVE_KEY = 'zenClickerSave';
const SALT = 'zen-secure-v1-salt-'; // In production, use environment variable

const generateChecksum = (data: string): string => {
  let hash = 0;
  const str = data + SALT;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
};

const encodeSave = (state: GameState): string => {
    const json = JSON.stringify(state);
    const checksum = generateChecksum(json);
    // Wrap in a structure to separate data from validation
    const payload = JSON.stringify({ d: json, h: checksum });
    return btoa(payload);
};

const decodeSave = (encoded: string): GameState | null => {
    try {
        const decodedString = atob(encoded);
        // Try parsing as new secure format
        try {
            const { d, h } = JSON.parse(decodedString);
            if (d && h) {
                const calculatedHash = generateChecksum(d);
                if (calculatedHash !== h) {
                    console.warn("Save file integrity check failed. Potential tampering detected.");
                    return null;
                }
                return JSON.parse(d);
            }
        } catch (e) {
            // Fallback: Try parsing legacy format (direct JSON)
            // This allows old saves to work, but next save will upgrade them
            return JSON.parse(decodedString);
        }
    } catch (e) {
        console.error("Failed to decode save:", e);
        return null;
    }
    return null;
};
// ---------------------

const App: React.FC = () => {
  // Temporary storage for offline earnings during initialization
  const [offlineGains, setOfflineGains] = useState<{ points: number; time: number } | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = decodeSave(saved);
      if (parsed) {
        const loadedState = { 
          ...INITIAL_STATE, 
          ...parsed,
          settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) }
        };

        // --- OFFLINE EARNINGS CALCULATION ---
        if (loadedState.lastSaveTime && loadedState.autoPointsPerSecond > 0) {
            const now = Date.now();
            
            // SECURITY: Check for time travel (Clock Skew)
            if (now < loadedState.lastSaveTime) {
                console.warn("Clock skew detected. Offline earnings skipped.");
                return { ...loadedState, lastSaveTime: now };
            }

            const diffInSeconds = (now - loadedState.lastSaveTime) / 1000;
            
            // Cap at 24 hours (86400 seconds)
            const cappedSeconds = Math.min(diffInSeconds, 86400);

            if (cappedSeconds > 60) { // Only award if away for more than 1 minute
                const prestigeMult = 1 + (loadedState.prestigeLevel * PRESTIGE_MULTIPLIER_PER_LEVEL);
                const diffMult = DIFFICULTY_CONFIG[loadedState.difficulty as Difficulty].outputMult;
                
                const earned = Math.floor(cappedSeconds * loadedState.autoPointsPerSecond * prestigeMult * diffMult);
                
                if (earned > 0) {
                    // We modify the initial state directly here so the UI reflects it immediately
                    loadedState.points += earned;
                }
            }
        }
        return loadedState;
      }
    }
    return INITIAL_STATE;
  });

  // Effect to calculate and show offline earnings modal on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        const parsed = decodeSave(saved);
        if (parsed && parsed.lastSaveTime && parsed.autoPointsPerSecond > 0) {
            const now = Date.now();
            // Clock skew check repeated here for modal logic
            if (now < parsed.lastSaveTime) return;

            const diffInSeconds = (now - parsed.lastSaveTime) / 1000;
            const cappedSeconds = Math.min(diffInSeconds, 86400);

            if (cappedSeconds > 60) {
                 const prestigeMult = 1 + ((parsed.prestigeLevel || 0) * PRESTIGE_MULTIPLIER_PER_LEVEL);
                 const diffMult = DIFFICULTY_CONFIG[(parsed.difficulty || 'NORMAL') as Difficulty].outputMult;
                 const earned = Math.floor(cappedSeconds * parsed.autoPointsPerSecond * prestigeMult * diffMult);

                 if (earned > 0) {
                     setOfflineGains({ points: earned, time: cappedSeconds });
                 }
            }
        }
    }
  }, []); // Run once on mount

  const [notification, setNotification] = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showPrestigeSuccess, setShowPrestigeSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  
  // Desktop Panel State (Only one active at a time)
  const [activeDesktopPanel, setActiveDesktopPanel] = useState<'none' | 'settings' | 'upgrades' | 'achievements'>('none');

  // Mobile UI State
  const [mobileTab, setMobileTab] = useState<'clicker' | 'upgrades' | 'settings'>('clicker');
  
  // Idle detection state
  const [isIdle, setIsIdle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const currentTheme = THEMES[gameState.theme] || THEMES['zen'];
  const prestigeMultiplier = 1 + (gameState.prestigeLevel * PRESTIGE_MULTIPLIER_PER_LEVEL);
  const difficultyMult = DIFFICULTY_CONFIG[gameState.difficulty];

  // Dynamic Prestige Threshold: Increases by 50% compounding per level
  const currentPrestigeThreshold = PRESTIGE_THRESHOLD * Math.pow(1.5, gameState.prestigeLevel);

  // --- Initial Load Check for Invites ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setInviteRoomId(room);
      setShowMultiplayer(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // --- Update Audio Volumes ---
  useEffect(() => {
      setVolumes(gameState.settings.sfxVolume, gameState.settings.musicVolume);
  }, [gameState.settings]);

  // --- Idle Detection Logic ---
  const resetIdleTimer = useCallback(() => {
    if (showMultiplayer) return;

    if (isIdle) {
      setIsIdle(false);
    }
    
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    
    idleTimerRef.current = window.setTimeout(() => {
      if (!showMultiplayer) {
        setIsIdle(true);
      }
    }, IDLE_TIMEOUT);
  }, [isIdle, showMultiplayer]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // --- Game Loop ---
  useEffect(() => {
    // PERFORMANCE: Pause game loop if modal is open to reduce load
    if (gameState.autoPointsPerSecond === 0 || isIdle || showPrestigeModal || showPrestigeSuccess || offlineGains) return;
    
    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        points: prev.points + ((prev.autoPointsPerSecond * prestigeMultiplier * difficultyMult.outputMult) / 10)
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [gameState.autoPointsPerSecond, prestigeMultiplier, difficultyMult, isIdle, showPrestigeModal, showPrestigeSuccess, offlineGains]);

  // --- Save Logic (Manual & Auto) ---
  const saveGame = useCallback((state: GameState) => {
    setIsSaving(true);
    // Update lastSaveTime to now
    const stateToSave = { ...state, lastSaveTime: Date.now() };
    
    // Secure Save
    const encoded = encodeSave(stateToSave);
    localStorage.setItem(SAVE_KEY, encoded);
    
    setTimeout(() => setIsSaving(false), 800);
  }, []);

  // Auto-Save Loop
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame(gameState);
    }, 5000); // Save every 5 seconds
    return () => clearInterval(interval);
  }, [gameState, saveGame]);

  // --- Challenge Logic ---
  useEffect(() => {
    if (showMultiplayer || isIdle || showPrestigeSuccess) return;

    if (!activeChallenge) {
      const spawnTimer = setInterval(() => {
        if (!activeChallenge && Math.random() < 0.3) { 
           spawnChallenge();
        }
      }, 10000);
      return () => clearInterval(spawnTimer);
    } else {
        const now = Date.now();
        const elapsed = (now - activeChallenge.startTime) / 1000;
        
        let progress = 0;
        if (activeChallenge.targetType === 'POINTS') {
            progress = gameState.points - activeChallenge.startValue;
        } else {
            progress = gameState.totalClicks - activeChallenge.startValue;
        }

        if (progress >= activeChallenge.targetAmount) {
            completeChallenge(activeChallenge);
        } else if (elapsed >= activeChallenge.duration) {
            failChallenge();
        }
    }
  }, [activeChallenge, gameState.points, gameState.totalClicks, showMultiplayer, isIdle, showPrestigeSuccess]);

  const spawnChallenge = () => {
    const type = Math.random() > 0.5 ? 'CLICKS' : 'POINTS';
    const duration = 30; 
    let target = 0;
    let desc = '';
    let reward = 0;
    const production = (gameState.autoPointsPerSecond * prestigeMultiplier * difficultyMult.outputMult) || 10;
    
    if (type === 'POINTS') {
        target = Math.floor(production * 15); 
        desc = `Earn ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(target)} points`;
        reward = target * 5; 
    } else {
        target = 50 + Math.floor(gameState.totalClicks * 0.05); 
        if (target > 200) target = 200; 
        desc = `Click ${target} times`;
        reward = production * 60; 
    }

    if (gameState.difficulty === Difficulty.HARD) target = Math.floor(target * 1.2);
    if (gameState.difficulty === Difficulty.EASY) target = Math.floor(target * 0.8);
    if (reward < 100) reward = 100;

    setActiveChallenge({
        id: Date.now().toString(),
        description: desc,
        targetType: type as any,
        targetAmount: target,
        duration,
        startTime: Date.now(),
        startValue: type === 'POINTS' ? gameState.points : gameState.totalClicks,
        rewardPoints: reward
    });
  };

  const completeChallenge = (challenge: Challenge) => {
    setGameState(prev => ({ ...prev, points: prev.points + challenge.rewardPoints }));
    playSound('success');
    setNotification(`Challenge Complete! +${new Intl.NumberFormat('en-US', { notation: "compact" }).format(challenge.rewardPoints)} Pts`);
    setActiveChallenge(null);
  };

  const failChallenge = () => setActiveChallenge(null);

  // --- Achievement Check ---
  useEffect(() => {
    const unlockedNow = new Set(gameState.unlockedAchievements);
    let newUnlock: string | null = null;
    ACHIEVEMENTS.forEach(ach => {
      if (!unlockedNow.has(ach.id) && ach.condition(gameState)) {
        unlockedNow.add(ach.id);
        newUnlock = ach.name;
      }
    });
    if (newUnlock) {
      playSound('success');
      setGameState(prev => ({ ...prev, unlockedAchievements: Array.from(unlockedNow) }));
      setNotification(newUnlock);
    }
  }, [gameState]);

  // --- Handlers ---
  const handleManualClick = useCallback(() => {
    resetIdleTimer();
    setGameState(prev => ({
      ...prev,
      points: prev.points + (prev.clickPower * prestigeMultiplier * difficultyMult.outputMult),
      totalClicks: prev.totalClicks + 1
    }));
  }, [prestigeMultiplier, difficultyMult, resetIdleTimer]);

  const handleBuyUpgrade = (upgrade: Upgrade) => {
    resetIdleTimer();
    setGameState(prev => {
      const currentCount = prev.upgrades[upgrade.id] || 0;
      const baseCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentCount));
      const cost = Math.floor(baseCost * difficultyMult.costMult);
      if (prev.points < cost) return prev;

      const newUpgrades = { ...prev.upgrades, [upgrade.id]: currentCount + 1 };
      let newClickPower = prev.clickPower;
      let newAutoPoints = prev.autoPointsPerSecond;
      if (upgrade.type === UpgradeType.CLICK_POWER) newClickPower += upgrade.basePower;
      else newAutoPoints += upgrade.basePower;

      return {
        ...prev,
        points: prev.points - cost,
        upgrades: newUpgrades,
        clickPower: newClickPower,
        autoPointsPerSecond: newAutoPoints
      };
    });
  };

  const handlePrestigeStart = () => {
    playSound('prestige');
    setShowPrestigeModal(false);
    setShowPrestigeSuccess(true);
  };

  const handlePrestigeComplete = () => {
    const newState: GameState = {
        points: 0,
        clickPower: 1,
        autoPointsPerSecond: 0,
        upgrades: {},
        startTime: Date.now(),
        lastSaveTime: Date.now(),
        // Persisted Data
        totalClicks: gameState.totalClicks,
        unlockedAchievements: gameState.unlockedAchievements,
        prestigeLevel: gameState.prestigeLevel + 1,
        theme: gameState.theme,
        difficulty: gameState.difficulty,
        settings: gameState.settings,
        multiplayerMatches: gameState.multiplayerMatches,
        multiplayerWins: gameState.multiplayerWins,
    };

    setGameState(newState);
    // Force immediate save encoded with new secure format
    const encoded = encodeSave(newState);
    localStorage.setItem(SAVE_KEY, encoded);
    
    setShowPrestigeSuccess(false);
  };

  const handleResetGame = () => {
    localStorage.removeItem(SAVE_KEY);
    setGameState(INITIAL_STATE);
    setShowResetConfirm(false);
    setActiveDesktopPanel('none');
    window.location.reload(); // Reload to ensure clean slate
  };
  
  // Apply the doubled offline earnings
  const handleOfflineDouble = () => {
    if (offlineGains) {
        setGameState(prev => ({
            ...prev,
            points: prev.points + offlineGains.points // Add it AGAIN to double it
        }));
    }
  };

  const toggleTheme = (themeId: string) => setGameState(prev => ({ ...prev, theme: themeId }));
  const setDifficulty = (diff: Difficulty) => setGameState(prev => ({ ...prev, difficulty: diff }));
  const handleVolumeChange = (type: 'sfx' | 'music', val: number) => {
    setGameState(prev => ({
        ...prev,
        settings: { ...prev.settings, [type === 'sfx' ? 'sfxVolume' : 'musicVolume']: val }
    }));
  };
  const setClickSound = (variant: ClickSoundVariant) => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, clickSound: variant }
    }));
    setTimeout(() => playSound(variant as any), 100);
  };
  
  const toggleHaptics = () => {
    setGameState(prev => {
      const newVal = !prev.settings.hapticsEnabled;
      if (newVal && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
      return {
        ...prev,
        settings: { ...prev.settings, hapticsEnabled: newVal }
      };
    });
  };

  // Memoized to prevent infinite loop in multiplayer effect
  const handleMultiplayerComplete = useCallback(({ winnerIndex, isOnline }: { winnerIndex: number | null, isOnline: boolean }) => {
      setGameState(prev => ({
          ...prev,
          multiplayerMatches: prev.multiplayerMatches + 1,
          multiplayerWins: winnerIndex === 0 ? prev.multiplayerWins + 1 : prev.multiplayerWins
      }));
  }, []);

  const closeMultiplayer = () => {
      setShowMultiplayer(false);
      setInviteRoomId(null); 
  };

  const toggleDesktopPanel = (panel: 'settings' | 'upgrades' | 'achievements') => {
      setActiveDesktopPanel(prev => prev === panel ? 'none' : panel);
  };

  const renderSettingsContent = () => (
    <div className="space-y-6">
      {/* Audio Settings */}
      <div className="space-y-3">
        <h4 className={`text-xs uppercase tracking-widest font-bold ${currentTheme.colors.textDim}`}>Audio</h4>
        
        {/* SFX Volume */}
        <div className="flex items-center gap-3">
           <button onClick={() => handleVolumeChange('sfx', gameState.settings.sfxVolume > 0 ? 0 : 0.5)}>
             {gameState.settings.sfxVolume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} className="text-zinc-600" />}
           </button>
           <input 
             type="range" 
             min="0" max="1" step="0.1"
             value={gameState.settings.sfxVolume}
             onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
             className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
           />
        </div>

        {/* Music Volume */}
        <div className="flex items-center gap-3">
           <button onClick={() => handleVolumeChange('music', gameState.settings.musicVolume > 0 ? 0 : 0.3)}>
             {gameState.settings.musicVolume > 0 ? <Sparkles size={18} /> : <VolumeX size={18} className="text-zinc-600" />}
           </button>
           <input 
             type="range" 
             min="0" max="1" step="0.1"
             value={gameState.settings.musicVolume}
             onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
             className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
           />
        </div>

        {/* Click Sound Selector */}
        <div className="grid grid-cols-4 gap-2 mt-2">
            {(['default', 'blaster', 'bubble', 'mechanical'] as ClickSoundVariant[]).map(sound => (
                <button
                    key={sound}
                    onClick={() => setClickSound(sound)}
                    className={`
                        p-2 rounded-lg text-[10px] font-mono border transition-all
                        ${gameState.settings.clickSound === sound 
                            ? `bg-white/10 ${currentTheme.colors.border} text-white` 
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'}
                    `}
                >
                    {sound}
                </button>
            ))}
        </div>
      </div>

      {/* Haptics */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Vibrate size={18} className={gameState.settings.hapticsEnabled ? currentTheme.colors.accent : 'text-zinc-600'} />
              <span className="text-sm">Haptic Feedback</span>
          </div>
          <button 
            onClick={toggleHaptics}
            className={`w-10 h-5 rounded-full relative transition-colors ${gameState.settings.hapticsEnabled ? currentTheme.colors.accent.replace('text-', 'bg-') : 'bg-zinc-800'}`}
          >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${gameState.settings.hapticsEnabled ? 'left-6' : 'left-1'}`} />
          </button>
      </div>

      {/* Themes */}
      <div className="space-y-3">
         <h4 className={`text-xs uppercase tracking-widest font-bold ${currentTheme.colors.textDim}`}>Theme</h4>
         <div className="grid grid-cols-2 gap-2">
            {Object.values(THEMES).map(t => (
                <button
                    key={t.id}
                    onClick={() => toggleTheme(t.id)}
                    className={`
                        p-2 rounded-xl border text-xs font-medium transition-all
                        ${gameState.theme === t.id 
                            ? `bg-white/10 ${t.colors.border} text-white` 
                            : 'border-transparent bg-black/20 text-zinc-500 hover:bg-white/5'}
                    `}
                >
                    {t.label}
                </button>
            ))}
         </div>
      </div>

       {/* Data Management */}
       <div className="space-y-3 pt-4 border-t border-white/5">
            <h4 className={`text-xs uppercase tracking-widest font-bold ${currentTheme.colors.textDim}`}>Data</h4>
            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg w-full"
                >
                    <Trash2 size={14} />
                    Reset Progress
                </button>
                 <div className="text-[10px] text-zinc-600 text-center">
                    Auto-saving enabled
                </div>
            </div>
       </div>
    </div>
  );

  if (showMultiplayer) {
    return <MultiplayerGame onClose={closeMultiplayer} theme={currentTheme} initialRoomId={inviteRoomId} onMatchComplete={handleMultiplayerComplete} />;
  }

  if (showPrestigeSuccess) {
    return <PrestigeSuccess level={gameState.prestigeLevel + 1} newMultiplier={1 + (gameState.prestigeLevel + 1) * PRESTIGE_MULTIPLIER_PER_LEVEL} onComplete={handlePrestigeComplete} />;
  }

  return (
    // Changed h-screen to h-dvh for better mobile resizing support
    <div className={`flex flex-col h-[100dvh] w-full ${currentTheme.colors.bg} ${currentTheme.colors.text} overflow-hidden transition-colors duration-500`}>
      
      {/* iOS Haptics Hack Elements (Hidden) */}
      <input type="checkbox" id="haptic-ios-hack" className="hidden fixed -left-[9999px] opacity-0 pointer-events-none" />
      <label htmlFor="haptic-ios-hack" className="hidden fixed -left-[9999px] opacity-0 pointer-events-none"></label>

      {/* Offline Earnings Modal */}
      {offlineGains && (
          <OfflineModal 
            earnings={offlineGains.points} 
            timeAway={offlineGains.time} 
            theme={currentTheme}
            onClose={() => setOfflineGains(null)}
            onDouble={handleOfflineDouble}
          />
      )}

      {/* Auto Save Indicator */}
      <div className={`
        fixed z-50 transition-all duration-500 pointer-events-none flex items-center gap-2
        ${isSaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        bottom-20 right-4 md:bottom-8 md:right-4 
      `}>
          <Save size={14} className={`${currentTheme.colors.accent} animate-spin`} />
          <span className={`text-[10px] font-mono uppercase tracking-widest ${currentTheme.colors.textDim}`}>Saving...</span>
      </div>

      {/* Idle Overlay */}
      {isIdle && !offlineGains && (
         <div className="absolute inset-0 z-[60] backdrop-blur-md bg-black/40 flex flex-col items-center justify-center animate-slide-in px-4">
            <div className={`p-8 rounded-3xl ${currentTheme.colors.panelBg} border ${currentTheme.colors.border} text-center shadow-2xl transform transition-transform hover:scale-105 max-w-sm w-full`}>
               <Moon size={48} className={`mx-auto mb-4 ${currentTheme.colors.accent} animate-pulse`} />
               <h2 className="text-2xl font-bold text-white mb-2">Sleep Mode</h2>
               <p className="text-zinc-400 mb-6">Generation paused to save resources.</p>
               <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                  Move or Click to Resume
               </div>
            </div>
         </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 animate-slide-in">
            <div className={`max-w-xs w-full ${currentTheme.colors.panelBg} border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl relative`}>
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Are you sure?</h3>
                <p className="text-sm text-zinc-400 mb-6">This will delete all progress, including prestige levels and achievements. This action cannot be undone.</p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleResetGame}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
                    >
                        Yes, Delete Everything
                    </button>
                    <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="w-full py-2.5 text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-4 border-b border-white/5 bg-black/90">
            <span className="font-bold text-lg tracking-tight">Zen<span className={currentTheme.colors.accent}>Clicker</span></span>
            
            <div className="flex items-center gap-3">
                {/* Multiplayer Button Mobile */}
                <button 
                    onClick={() => setShowMultiplayer(true)}
                    className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors"
                >
                    <Users size={18} />
                </button>

                {gameState.points >= currentPrestigeThreshold && (
                    <button 
                        onClick={() => setShowPrestigeModal(true)}
                        className="p-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg animate-pulse"
                    >
                        <Crown size={16} />
                    </button>
                )}
            </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0 pb-16 md:pb-0 min-h-0">

        {/* TOP SECTION: Split into Left (Clicker) and Right (Shop) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* --- LEFT PANEL / CLICKER TAB --- */}
            <div className={`
                flex-1 relative flex flex-col h-full transition-opacity duration-300
                ${mobileTab === 'clicker' ? 'flex' : 'hidden md:flex'}
            `}>
                {/* Desktop Tools (Left Side) */}
                <div className="hidden md:flex absolute top-4 left-6 z-40 gap-3 items-center">
                    {/* Settings Toggle */}
                    <button 
                        onClick={() => toggleDesktopPanel('settings')}
                        className={`p-2.5 rounded-xl border transition-all hover:scale-105 ${activeDesktopPanel === 'settings' ? `bg-white/10 ${currentTheme.colors.border} ${currentTheme.colors.accent}` : `bg-black/40 border-transparent hover:bg-white/10 text-zinc-400`}`}
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    
                    {/* Multiplayer */}
                    <button 
                        onClick={() => setShowMultiplayer(true)}
                        className={`p-2.5 rounded-xl border bg-black/40 border-transparent hover:bg-white/10 text-zinc-400 hover:text-indigo-400 transition-all hover:scale-105`}
                        title="Multiplayer Battle"
                    >
                        <Users size={20} />
                    </button>

                    {/* Upgrades Toggle */}
                    <button 
                        onClick={() => toggleDesktopPanel('upgrades')}
                        className={`p-2.5 rounded-xl border transition-all hover:scale-105 ${activeDesktopPanel === 'upgrades' ? `bg-white/10 ${currentTheme.colors.border} ${currentTheme.colors.accent}` : `bg-black/40 border-transparent hover:bg-white/10 text-zinc-400`}`}
                        title="Upgrades Shop"
                    >
                        <ShoppingBag size={20} />
                    </button>

                    {/* Achievements Toggle */}
                    <button 
                        onClick={() => toggleDesktopPanel('achievements')}
                        className={`p-2.5 rounded-xl border transition-all hover:scale-105 ${activeDesktopPanel === 'achievements' ? `bg-white/10 ${currentTheme.colors.border} ${currentTheme.colors.accent}` : `bg-black/40 border-transparent hover:bg-white/10 text-zinc-400`}`}
                        title="Achievements"
                    >
                        <Trophy size={20} />
                    </button>
                </div>

                {/* Prestige Button (Desktop) */}
                {gameState.points >= currentPrestigeThreshold && (
                    <div className="hidden md:block absolute top-4 right-4 z-40 animate-slide-in">
                        <button 
                            onClick={() => setShowPrestigeModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:scale-105 transition-all"
                        >
                            <Crown size={16} />
                            <span className="font-bold text-sm tracking-wide">PRESTIGE</span>
                        </button>
                    </div>
                )}

                {/* --- FLOATING DESKTOP PANELS --- */}

                {/* Settings Panel */}
                {activeDesktopPanel === 'settings' && (
                    <div className={`hidden md:block absolute top-20 left-6 z-50 w-80 ${currentTheme.colors.panelBg} border ${currentTheme.colors.border} rounded-2xl p-6 shadow-2xl animate-slide-in backdrop-blur-xl`}>
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                            <h3 className="font-bold uppercase tracking-wider text-sm">Settings</h3>
                            <button onClick={() => setActiveDesktopPanel('none')}><X size={16} className="text-zinc-500 hover:text-white" /></button>
                        </div>
                        {renderSettingsContent()}
                    </div>
                )}

                {/* Upgrades Panel (Floating) */}
                {activeDesktopPanel === 'upgrades' && (
                    <div className={`hidden md:flex flex-col absolute top-20 left-6 z-50 w-96 max-h-[70vh] ${currentTheme.colors.panelBg} border ${currentTheme.colors.border} rounded-2xl shadow-2xl animate-slide-in backdrop-blur-xl overflow-hidden`}>
                        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-black/20">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className={currentTheme.colors.accent} />
                                <h3 className="font-bold uppercase tracking-wider text-sm">Upgrades</h3>
                            </div>
                            <button onClick={() => setActiveDesktopPanel('none')}><X size={16} className="text-zinc-500 hover:text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <UpgradeShop 
                                gameState={gameState}
                                onBuy={handleBuyUpgrade} 
                                theme={currentTheme}
                                prestigeMultiplier={prestigeMultiplier}
                            />
                        </div>
                    </div>
                )}

                {/* Achievements Panel (Floating) */}
                {activeDesktopPanel === 'achievements' && (
                    <div className={`hidden md:flex flex-col absolute top-20 left-6 z-50 w-[500px] max-h-[60vh] ${currentTheme.colors.panelBg} border ${currentTheme.colors.border} rounded-2xl shadow-2xl animate-slide-in backdrop-blur-xl overflow-hidden`}>
                        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-black/20">
                            <div className="flex items-center gap-2">
                                <Trophy size={18} className={currentTheme.colors.accent} />
                                <h3 className="font-bold uppercase tracking-wider text-sm">Achievements</h3>
                            </div>
                            <button onClick={() => setActiveDesktopPanel('none')}><X size={16} className="text-zinc-500 hover:text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <AchievementPanel unlockedIds={gameState.unlockedAchievements} theme={currentTheme} />
                        </div>
                    </div>
                )}

                {/* Challenge Widget */}
                {activeChallenge && (
                     <div className="relative w-full z-30 pointer-events-none md:mt-20">
                        <div className="pointer-events-auto">
                            <ChallengeWidget challenge={activeChallenge} currentValue={activeChallenge.targetType === 'POINTS' ? gameState.points : gameState.totalClicks} theme={currentTheme} />
                        </div>
                     </div>
                )}

                {/* Clicker Content */}
                <div className="flex-1 relative flex flex-col items-center justify-center">
                    <Clicker 
                        onClick={handleManualClick} 
                        points={gameState.points}
                        clickPower={gameState.clickPower}
                        autoPointsPerSecond={gameState.autoPointsPerSecond}
                        theme={currentTheme}
                        prestigeMultiplier={prestigeMultiplier}
                        prestigeLevel={gameState.prestigeLevel}
                        clickSound={gameState.settings.clickSound}
                        hapticsEnabled={gameState.settings.hapticsEnabled}
                    />

                    {/* Toast Notification Positioned Below Clicker */}
                    {notification && (
                        <div className={`
                            /* Mobile: Absolute positioning above nav bar (prevent layout shift) */
                            absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] z-50
                            /* Desktop: Relative flow positioning */
                            md:relative md:bottom-auto md:left-auto md:translate-x-0 md:mt-8 md:w-full md:max-w-sm
                        `}>
                            <Toast message={notification} onClose={() => setNotification(null)} theme={currentTheme} />
                        </div>
                    )}
                </div>
            </div>

            {/* --- MOBILE ONLY PANELS (Preserved) --- */}
            
            {/* Mobile Upgrades Tab - Added min-h-0 to allow nested scroll */}
            <div className={`
                flex-col z-20 shadow-2xl bg-black/20 border-l border-white/5 min-h-0
                ${mobileTab === 'upgrades' ? 'flex flex-1 w-full' : 'hidden'}
            `}>
                <UpgradeShop 
                    gameState={gameState}
                    onBuy={handleBuyUpgrade} 
                    theme={currentTheme}
                    prestigeMultiplier={prestigeMultiplier}
                />
            </div>
            
            {/* Mobile Settings Tab - Added min-h-0 */}
            <div className={`
                flex-1 flex flex-col p-6 overflow-y-auto bg-black/40 min-h-0
                ${mobileTab === 'settings' ? 'flex' : 'hidden'}
            `}>
                <h2 className="text-2xl font-bold mb-8">Menu</h2>
                {renderSettingsContent()}
                
                {/* Mobile Achievements shown in settings */}
                <div className="mt-8 pt-8 border-t border-white/10">
                    <AchievementPanel unlockedIds={gameState.unlockedAchievements} theme={currentTheme} />
                </div>
                
                <div className="text-center mt-12 mb-8 text-xs text-zinc-600 font-mono">
                    ZenClicker v1.2.1
                </div>
            </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden absolute bottom-0 left-0 right-0 h-16 bg-black/90 border-t border-white/5 flex justify-around items-center z-50 pb-safe">
        <button 
            onClick={() => setMobileTab('clicker')}
            className={`flex flex-col items-center gap-1.5 p-2 w-16 transition-colors ${mobileTab === 'clicker' ? currentTheme.colors.accent : 'text-zinc-500'}`}
        >
            <MousePointer2 size={24} strokeWidth={mobileTab === 'clicker' ? 2.5 : 2} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Click</span>
        </button>
        <button 
            onClick={() => setMobileTab('upgrades')}
            className={`flex flex-col items-center gap-1.5 p-2 w-16 transition-colors ${mobileTab === 'upgrades' ? currentTheme.colors.accent : 'text-zinc-500'}`}
        >
            <div className="relative">
                <ShoppingBag size={24} strokeWidth={mobileTab === 'upgrades' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide">Shop</span>
        </button>
        <button 
            onClick={() => setMobileTab('settings')}
            className={`flex flex-col items-center gap-1.5 p-2 w-16 transition-colors ${mobileTab === 'settings' ? currentTheme.colors.accent : 'text-zinc-500'}`}
        >
            <Menu size={24} strokeWidth={mobileTab === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Menu</span>
        </button>
      </nav>

      {/* Prestige Confirmation Modal */}
      {showPrestigeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 animate-slide-in">
            <div className={`max-w-md w-full ${currentTheme.colors.panelBg} border ${currentTheme.colors.border} rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
                
                <Crown size={48} className="mx-auto text-amber-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Ascend to New Heights</h2>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                    Reset your progress to gain a permanent multiplier.
                    <br />
                    <span className="text-amber-500 font-bold block mt-2 text-lg">
                        Current: {prestigeMultiplier.toFixed(1)}x
                        {' -> '}
                        New: {(prestigeMultiplier + PRESTIGE_MULTIPLIER_PER_LEVEL).toFixed(1)}x
                    </span>
                    <span className="block mt-4 text-xs text-zinc-500">
                        Next Prestige Cost: {new Intl.NumberFormat('en-US', { notation: "compact" }).format(currentPrestigeThreshold)} Points
                    </span>
                </p>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handlePrestigeStart}
                        className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02]"
                    >
                        ASCEND
                    </button>
                    <button 
                        onClick={() => setShowPrestigeModal(false)}
                        className="w-full py-3 text-zinc-500 hover:text-zinc-300 font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
