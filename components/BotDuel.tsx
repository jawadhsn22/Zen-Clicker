
import React, { useState, useEffect, useRef } from 'react';
import { ThemeConfig } from '../types';
import { Zap, X, Trophy, Bot, Swords } from 'lucide-react';
import { playSound } from '../utils/sound';

interface BotDuelProps {
  onClose: () => void;
  theme: ThemeConfig;
  onMatchComplete: (won: boolean) => void;
}

type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
type GamePhase = 'SETUP' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

const GAME_DURATION = 10;

const DIFFICULTY_CONFIG: Record<BotDifficulty, { clicksPerSec: number; label: string; color: string }> = {
    EASY: { clicksPerSec: 3, label: 'Novice Bot', color: 'text-green-500' },
    MEDIUM: { clicksPerSec: 8, label: 'Veteran Bot', color: 'text-yellow-500' },
    HARD: { clicksPerSec: 15, label: 'Zen Master Bot', color: 'text-red-500' },
};

const BotDuel: React.FC<BotDuelProps> = ({ onClose, theme, onMatchComplete }) => {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('EASY');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const botIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (botIntervalRef.current) clearInterval(botIntervalRef.current);
  };

  const startGame = () => {
    setPhase('COUNTDOWN');
    setPlayerScore(0);
    setBotScore(0);
    setTimeLeft(GAME_DURATION);

    let count = 3;
    const countTimer = setInterval(() => {
      playSound('click');
      count--;
      if (count <= 0) {
        clearInterval(countTimer);
        setPhase('PLAYING');
        playSound('pop');
        runGameLoop();
      }
    }, 1000);
  };

  const runGameLoop = () => {
    // Game Timer
    timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                endGame();
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    // Bot Logic (Simulate clicks)
    const clicksPerSec = DIFFICULTY_CONFIG[difficulty].clicksPerSec;
    const intervalMs = 1000 / clicksPerSec;
    
    // Add randomness to bot interval (+/- 20%)
    const scheduleNextBotClick = () => {
        const variance = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
        const actualInterval = intervalMs * (1 + variance);
        
        botIntervalRef.current = window.setTimeout(() => {
            if (phase === 'FINISHED') return;
            setBotScore(s => s + 1);
            scheduleNextBotClick(); // Chain calls
        }, actualInterval);
    };
    
    scheduleNextBotClick();
  };

  const endGame = () => {
      cleanup();
      setPhase('FINISHED');
      const won = playerScore > botScore;
      if (won) playSound('success');
      onMatchComplete(won);
  };

  const handlePlayerClick = () => {
      if (phase !== 'PLAYING') return;
      playSound('click');
      setPlayerScore(s => s + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center font-sans">
       {/* Header */}
       <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/20 border-b border-white/5 z-20">
            <div className="flex items-center gap-2">
                <Swords size={18} className={theme.colors.accent} />
                <span className="font-bold text-white tracking-wide">Solo Practice</span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm">
                Exit
            </button>
        </div>

        <div className="w-full h-full flex flex-col items-center justify-center pt-14 pb-4">
            
            {phase === 'SETUP' && (
                <div className="flex flex-col items-center gap-8 animate-slide-in">
                    <div className="p-6 rounded-full bg-white/5 border border-white/10">
                        <Bot size={64} className={theme.colors.accent} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Select Opponent</h2>
                        <p className="text-zinc-400 text-sm">Test your speed against Zen Bots</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 w-64">
                        {(['EASY', 'MEDIUM', 'HARD'] as BotDifficulty[]).map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`
                                    p-4 rounded-xl border text-left transition-all
                                    ${difficulty === d 
                                        ? `bg-white/10 border-white/30 text-white translate-x-2` 
                                        : 'bg-black/40 border-transparent text-zinc-500 hover:bg-white/5'}
                                `}
                            >
                                <div className={`font-bold ${DIFFICULTY_CONFIG[d].color}`}>{DIFFICULTY_CONFIG[d].label}</div>
                                <div className="text-xs opacity-60">Speed: ~{DIFFICULTY_CONFIG[d].clicksPerSec} cps</div>
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={startGame}
                        className={`
                            px-8 py-3 rounded-full font-bold text-lg
                            bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg
                            hover:scale-105 transition-transform mt-4
                        `}
                    >
                        START DUEL
                    </button>
                </div>
            )}

            {(phase === 'COUNTDOWN' || phase === 'PLAYING') && (
                 <div className="flex-1 w-full h-full relative flex flex-col">
                    {/* Timer */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                        {phase === 'COUNTDOWN' ? (
                            <div className="text-6xl font-black text-white animate-scale-bounce">Ready</div>
                        ) : (
                            <div className={`text-6xl font-mono font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-white'} drop-shadow-2xl`}>
                            {timeLeft}
                            </div>
                        )}
                    </div>

                    {/* Split Screen */}
                    <div className="flex-1 grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full h-full">
                        {/* Player Side */}
                        <div className="relative border border-white/5 bg-transparent">
                             <button
                                onPointerDown={(e) => { e.preventDefault(); handlePlayerClick(); }}
                                className={`w-full h-full flex flex-col items-center justify-center active:bg-white/5 transition-colors touch-none`}
                             >
                                <span className="text-xs uppercase tracking-widest text-zinc-500 mb-2">You</span>
                                <span className={`text-6xl font-black text-blue-500 drop-shadow-xl`}>{playerScore}</span>
                                <span className="mt-4 text-xs text-zinc-600">TAP HERE</span>
                             </button>
                        </div>
                        
                        {/* Bot Side */}
                        <div className="relative border border-white/5 bg-black/20 flex flex-col items-center justify-center">
                            <span className="text-xs uppercase tracking-widest text-zinc-600 mb-2">{DIFFICULTY_CONFIG[difficulty].label}</span>
                            <span className={`text-6xl font-black ${DIFFICULTY_CONFIG[difficulty].color} drop-shadow-xl`}>{botScore}</span>
                        </div>
                    </div>
                 </div>
            )}

            {phase === 'FINISHED' && (
                 <div className="flex flex-col items-center justify-center gap-6 animate-slide-in">
                    <Trophy size={80} className={`${playerScore > botScore ? 'text-yellow-400' : 'text-zinc-600'} drop-shadow-2xl`} />
                    
                    <h2 className="text-4xl font-bold text-white uppercase tracking-tighter">
                       {playerScore > botScore ? 'Victory!' : playerScore === botScore ? 'Tie!' : 'Defeat'}
                    </h2>
         
                    <div className="w-full max-w-sm space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-white/10">
                            <span className="font-bold text-white">You</span>
                            <span className="font-mono font-bold text-blue-500">{playerScore}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-black/20">
                            <span className="text-zinc-400">{DIFFICULTY_CONFIG[difficulty].label}</span>
                            <span className={`font-mono font-bold ${DIFFICULTY_CONFIG[difficulty].color}`}>{botScore}</span>
                        </div>
                    </div>
         
                    <div className="flex gap-4 mt-4">
                        <button 
                            onClick={startGame}
                            className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                        >
                            Rematch
                        </button>
                        <button 
                            onClick={() => setPhase('SETUP')}
                            className="px-6 py-3 border border-white/20 text-white font-bold rounded-full hover:bg-white/10 transition-colors"
                        >
                            Change Difficulty
                        </button>
                    </div>
                 </div>
            )}
        </div>
    </div>
  );
};

export default BotDuel;
