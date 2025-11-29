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
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[40] animate-slide-in w-full max-w-sm px-4">
      <div className={`bg-zinc-900/90 backdrop-blur-md border ${theme.colors.border} ${theme.colors.text} px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4`}>
        <div className={`p-2 rounded-full bg-white/5 shrink-0`}>
            <Trophy size={18} className={theme.colors.accent} />
        </div>
        <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${theme.colors.accent} mb-0.5`}>Achievement Unlocked</div>
            <div className="font-medium text-sm truncate">{message}</div>
        </div>
        <button onClick={onClose} className={`${theme.colors.textDim} hover:text-white transition-colors`}>
            <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;