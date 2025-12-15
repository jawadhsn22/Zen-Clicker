
import React from 'react';
import { ThemeConfig } from '../types';
import { Moon, Clock, Coins } from 'lucide-react';

interface OfflineModalProps {
  earnings: number;
  timeAway: number; // in seconds
  theme: ThemeConfig;
  onClose: () => void;
}

const OfflineModal: React.FC<OfflineModalProps> = ({ earnings, timeAway, theme, onClose }) => {
  // Format time away
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatPoints = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 animate-slide-in">
        <div className={`max-w-sm w-full ${theme.colors.panelBg} border ${theme.colors.border} rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl`}>
            {/* Ambient background effect */}
            <div className={`absolute top-0 left-0 w-full h-1 ${theme.id === 'zen' ? 'bg-violet-500' : theme.id === 'neon' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
            
            <div className="mb-6 flex justify-center">
                <div className={`p-4 rounded-full bg-white/5 ${theme.colors.accent} relative`}>
                    <Moon size={48} className="animate-pulse" />
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-700">
                        <Clock size={16} className="text-zinc-400" />
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-zinc-400 mb-6 text-sm">
                While you were away for <span className="text-white font-mono font-medium">{formatTime(timeAway)}</span>, 
                your automated systems kept working.
            </p>

            <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-6">
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Offline Earnings</div>
                <div className={`text-3xl font-mono font-bold ${theme.colors.accent} flex items-center justify-center gap-2`}>
                    <Coins size={24} />
                    +{formatPoints(earnings)}
                </div>
            </div>

            <button 
                onClick={onClose}
                className={`w-full py-3.5 font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] bg-white text-black hover:bg-zinc-200`}
            >
                COLLECT
            </button>
        </div>
    </div>
  );
};

export default OfflineModal;
