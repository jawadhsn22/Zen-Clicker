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
        shadow-2xl flex items-center
        /* Mobile: Compact with reduced padding */
        rounded-xl px-3 py-2 gap-3
        /* Desktop: Standard size */
        md:rounded-2xl md:px-5 md:py-3 md:gap-4
      `}>
        <div className={`
            rounded-full bg-white/5 shrink-0
            /* Mobile: Smaller padding */
            p-1.5
            /* Desktop: Standard padding */
            md:p-2
        `}>
            <Trophy size={16} className={`md:w-[18px] md:h-[18px] ${theme.colors.accent}`} />
        </div>
        <div className="flex-1 min-w-0">
            <div className={`font-bold uppercase tracking-wider ${theme.colors.accent} mb-0.5 text-[9px] md:text-[10px]`}>Achievement Unlocked</div>
            <div className="font-medium truncate text-xs md:text-sm">{message}</div>
        </div>
        <button onClick={onClose} className={`${theme.colors.textDim} hover:text-white transition-colors p-1`}>
            <X size={14} className="md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;