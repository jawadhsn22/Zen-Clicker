import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { ThemeConfig } from '../types';

interface ToastProps {
  message: string;
  onClose: () => void;
  theme: ThemeConfig;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, theme }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="relative animate-slide-in w-full">
      <div className={`
        bg-zinc-900/90 backdrop-blur-md border ${theme.colors.border} ${theme.colors.text} 
        rounded-2xl shadow-2xl flex items-center gap-3
        /* Mobile: Compact */
        px-3 py-2
        /* Desktop: Standard */
        md:px-5 md:py-3 md:gap-4
      `}>
        <div className={`p-1.5 md:p-2 rounded-full bg-white/5 shrink-0`}>
            <Trophy size={16} className={`md:w-[18px] md:h-[18px] ${theme.colors.accent}`} />
        </div>
        <div className="flex-1 min-w-0">
            <div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${theme.colors.accent} mb-0.5`}>Achievement Unlocked</div>
            <div className="font-medium text-xs md:text-sm truncate">{message}</div>
        </div>
        <button onClick={onClose} className={`${theme.colors.textDim} hover:text-white transition-colors p-1`}>
            <X size={14} className="md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;