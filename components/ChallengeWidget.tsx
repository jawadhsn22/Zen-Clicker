import React, { useEffect, useState } from 'react';
import { Challenge, ThemeConfig } from '../types';
import { Timer, Zap } from 'lucide-react';

interface ChallengeWidgetProps {
  challenge: Challenge;
  currentValue: number; // Current points or clicks depending on challenge type
  theme: ThemeConfig;
}

const ChallengeWidget: React.FC<ChallengeWidgetProps> = ({ challenge, currentValue, theme }) => {
  const [timeLeft, setTimeLeft] = useState(challenge.duration);
  
  // Calculate progress relative to start value
  const progress = currentValue - challenge.startValue;
  const percentage = Math.min(100, Math.max(0, (progress / challenge.targetAmount) * 100));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, challenge.duration - (Date.now() - challenge.startTime) / 1000);
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [challenge]);

  return (
    <div className={`
      absolute z-20 rounded-2xl border shadow-xl backdrop-blur-xl animate-slide-in overflow-hidden
      ${theme.colors.panelBg} ${theme.colors.border}
      
      /* Mobile: Top Center */
      top-2 left-1/2 -translate-x-1/2 w-[95%] max-w-[400px]
      
      /* Desktop: Top Left (Under Settings Buttons) */
      md:top-20 md:left-4 md:translate-x-0 md:w-80
    `}>
      <div className="flex items-center p-3 gap-3">
        {/* Icon / Progress Ring Placeholder */}
        <div className={`
           shrink-0 w-10 h-10 rounded-full flex items-center justify-center border
           bg-white/5 ${theme.colors.border} ${theme.colors.accent}
        `}>
            <Zap size={18} fill="currentColor" className="opacity-90" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-baseline mb-1">
                <h4 className={`text-[10px] font-bold uppercase tracking-wider truncate opacity-80 ${theme.colors.accent}`}>
                    Bonus Challenge
                </h4>
                <div className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : theme.colors.textDim}`}>
                    <Timer size={10} />
                    {timeLeft.toFixed(1)}s
                </div>
            </div>
            
            <div className={`text-xs font-semibold truncate ${theme.colors.text} mb-1.5`}>
                {challenge.description}
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden relative">
                 <div 
                    className={`h-full transition-all duration-300 ease-linear ${theme.id === 'zen' ? 'bg-violet-500' : theme.id === 'neon' ? 'bg-cyan-400' : 'bg-emerald-500'}`}
                    style={{ width: `${percentage}%` }}
                 />
            </div>
            
            <div className={`flex justify-between mt-1 text-[9px] ${theme.colors.textDim} font-mono opacity-80`}>
                <span>{new Intl.NumberFormat('en-US', { notation: "compact" }).format(Math.floor(progress))}</span>
                <span>{new Intl.NumberFormat('en-US', { notation: "compact" }).format(challenge.targetAmount)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeWidget;