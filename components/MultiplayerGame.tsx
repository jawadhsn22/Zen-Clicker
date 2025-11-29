import React, { useState, useEffect } from 'react';
import { ThemeConfig } from '../types';
import { X, Trophy, Users, Globe, Smartphone } from 'lucide-react';
import { playSound } from '../utils/sound';
import OnlineDuel from './OnlineDuel';

interface MultiplayerGameProps {
  onClose: () => void;
  theme: ThemeConfig;
  initialRoomId?: string | null;
  onMatchComplete: (result: { winnerIndex: number | null; isOnline: boolean }) => void;
}

const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ onClose, theme, initialRoomId, onMatchComplete }) => {
  const [mode, setMode] = useState<'MENU' | 'LOCAL' | 'ONLINE'>(initialRoomId ? 'ONLINE' : 'MENU');
  
  // Local State
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [localState, setLocalState] = useState<'SETUP' | 'PLAYING' | 'FINISHED'>('SETUP');
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [winner, setWinner] = useState<number | null>(null);

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500'
  ];

  // Local Handlers
  const handleLocalStart = (count: number) => {
    setPlayerCount(count);
    setScores([0, 0, 0, 0]);
    setTimeLeft(10);
    setWinner(null);
    setLocalState('PLAYING');
    playSound('pop');
  };

  const handleLocalClick = (playerIndex: number) => {
    if (localState !== 'PLAYING') return;
    playSound('click');
    setScores(prev => {
      const newScores = [...prev];
      newScores[playerIndex]++;
      return newScores;
    });
  };

  useEffect(() => {
    if (mode === 'LOCAL' && localState === 'PLAYING') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setLocalState('FINISHED');
            playSound('success');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [localState, mode]);

  useEffect(() => {
    if (localState === 'FINISHED') {
      const maxScore = Math.max(...scores.slice(0, playerCount));
      const winningIndex = scores.findIndex(s => s === maxScore);
      setWinner(winningIndex);
      
      // Local match complete
      // We only count "wins" for Player 1 (index 0) in local if they win against others
      // or just count as a "match played"
      onMatchComplete({ 
          winnerIndex: winningIndex, 
          isOnline: false 
      });
    }
  }, [localState, scores, playerCount, onMatchComplete]);

  // Mode Routing
  if (mode === 'ONLINE') {
    return <OnlineDuel 
        onClose={onClose} 
        theme={theme} 
        initialRoomId={initialRoomId} 
        onMatchComplete={(won) => onMatchComplete({ winnerIndex: won ? 0 : 1, isOnline: true })}
    />;
  }

  // Render Local Game or Menu
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col font-sans">
      <div className="absolute top-4 right-4 z-50">
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white hover:bg-white/20">
          <X size={24} />
        </button>
      </div>

      {mode === 'MENU' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-slide-in">
           <div className="text-center mb-8">
               <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Multiplayer</h2>
               <p className="text-zinc-400">Choose your battleground</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
               <button 
                  onClick={() => setMode('LOCAL')}
                  className={`group relative p-8 rounded-2xl border ${theme.colors.border} bg-zinc-900 hover:bg-zinc-800 transition-all hover:scale-[1.02] text-left overflow-hidden`}
               >
                   <div className={`absolute top-0 right-0 p-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full transition-transform group-hover:scale-110`} />
                   <Smartphone size={40} className="text-emerald-400 mb-4" />
                   <h3 className="text-2xl font-bold text-white mb-2">Local Battle</h3>
                   <p className="text-zinc-500 text-sm leading-relaxed">Play with up to 4 friends on this device. Fast-paced tapping frenzy.</p>
               </button>

               <button 
                  onClick={() => setMode('ONLINE')}
                  className={`group relative p-8 rounded-2xl border ${theme.colors.border} bg-zinc-900 hover:bg-zinc-800 transition-all hover:scale-[1.02] text-left overflow-hidden`}
               >
                   <div className={`absolute top-0 right-0 p-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full transition-transform group-hover:scale-110`} />
                   <Globe size={40} className="text-violet-400 mb-4" />
                   <h3 className="text-2xl font-bold text-white mb-2">Online Duel</h3>
                   <p className="text-zinc-500 text-sm leading-relaxed">Invite a friend via link for a 1v1 battle across different devices.</p>
               </button>
           </div>
        </div>
      )}

      {mode === 'LOCAL' && (
        <>
            {localState === 'SETUP' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-slide-in">
                <Users size={64} className={theme.colors.accent} />
                <h2 className="text-3xl font-bold text-white">Local Battle</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                    {[2, 3, 4].map(count => (
                    <button 
                        key={count}
                        onClick={() => handleLocalStart(count)}
                        className={`py-6 px-4 rounded-xl border ${theme.colors.border} bg-zinc-900 hover:bg-zinc-800 transition-all hover:scale-105 flex flex-col items-center gap-2`}
                    >
                        <span className="text-4xl font-bold text-white">{count}</span>
                        <span className="text-xs uppercase tracking-wider text-zinc-500">Players</span>
                    </button>
                    ))}
                </div>
                <button onClick={() => setMode('MENU')} className="text-zinc-500 hover:text-white mt-8">Back to Menu</button>
                </div>
            )}

            {localState === 'PLAYING' && (
                <div className="flex-1 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
                        <div className="text-6xl font-black text-white drop-shadow-2xl font-mono bg-black/50 px-6 py-2 rounded-2xl backdrop-blur">
                            {timeLeft}
                        </div>
                    </div>
                    <div className="h-full w-full flex flex-wrap">
                        {Array.from({ length: playerCount }).map((_, i) => {
                            let layoutClass = '';
                            if (playerCount === 2) layoutClass = 'w-full h-1/2 md:w-1/2 md:h-full';
                            if (playerCount === 3) layoutClass = 'w-full h-1/3 md:w-1/3 md:h-full';
                            if (playerCount === 4) layoutClass = 'w-1/2 h-1/2';
                            return (
                                <div key={i} className={`${layoutClass} relative touch-none`}>
                                    <button
                                        onPointerDown={(e) => { e.preventDefault(); handleLocalClick(i); }}
                                        className={`w-full h-full ${colors[i]} active:brightness-110 transition-all flex items-center justify-center`}
                                    >
                                        <span className="text-6xl font-black text-white/50 select-none pointer-events-none">{scores[i]}</span>
                                        <span className="absolute bottom-4 left-4 text-white/60 font-bold uppercase text-sm">Player {i + 1}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {localState === 'FINISHED' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 animate-slide-in bg-zinc-900">
                <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
                <h2 className="text-4xl font-bold text-white mb-2">
                    {winner !== null && scores[winner] > 0 ? `Player ${winner + 1} Wins!` : "It's a Tie!"}
                </h2>
                <p className="text-zinc-400 mb-8 text-xl">Score: {winner !== null ? scores[winner] : 0} Clicks</p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button onClick={() => handleLocalStart(playerCount)} className="py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition">Play Again</button>
                        <button onClick={() => setLocalState('SETUP')} className="py-3 border border-zinc-700 text-white rounded-full hover:bg-zinc-800 transition">Change Players</button>
                        <button onClick={() => setMode('MENU')} className="py-3 text-zinc-500 hover:text-white transition">Back to Menu</button>
                </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default MultiplayerGame;