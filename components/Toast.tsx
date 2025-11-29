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
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-in">
      <div className={`bg-zinc-800 border ${theme.colors.border} ${theme.colors.text} px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 min-w-[300px]`}>
        <div className={`p-2 rounded-full bg-white/5`}>
            <Trophy size={20} className={theme.colors.accent} />
        </div>
        <div className="flex-1">
            <div className={`text-xs font-bold uppercase tracking-wider ${theme.colors.accent}`}>Achievement Unlocked</div>
            <div className="font-medium">{message}</div>
        </div>
        <button onClick={onClose} className={`${theme.colors.textDim} hover:text-white transition-colors`}>
            <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toast;