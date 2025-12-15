
import React, { useState, useCallback, useRef } from 'react';
import { Particle, ThemeConfig, ClickSoundVariant } from '../types';
import { PRESTIGE_MULTIPLIER_PER_LEVEL } from '../constants';
import { MousePointer2, Zap } from 'lucide-react';
import { playSound } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';

interface ClickerProps {
  onClick: () => void;
  points: number;
  clickPower: number;
  autoPointsPerSecond: number;
  theme: ThemeConfig;
  prestigeMultiplier: number;
  prestigeLevel: number;
  clickSound?: ClickSoundVariant;
  hapticsEnabled?: boolean;
}

const Clicker: React.FC<ClickerProps> = ({ 
  onClick, 
  points, 
  clickPower, 
  autoPointsPerSecond, 
  theme, 
  prestigeMultiplier, 
  prestigeLevel, 
  clickSound = 'default',
  hapticsEnabled = true
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Play sound
    playSound(clickSound as ClickSoundVariant);

    // Haptic Feedback (Uses new utility with iOS hack)
    triggerHaptic(hapticsEnabled);

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Add particle with randomized properties
    const id = Date.now() + Math.random();
    // Randomize position slightly around the click
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 60;

    const actualClickPower = clickPower * prestigeMultiplier;
    
    // Random visual properties
    const scale = 0.8 + Math.random() * 0.7; // 0.8 to 1.5
    const rotation = (Math.random() - 0.5) * 40; // -20 to 20 degrees
    const duration = 0.8 + Math.random() * 0.4; // 0.8s to 1.2s
    
    // Pick a random color variant from the theme palette
    const variants = [theme.colors.particle, theme.colors.text, theme.colors.accent, 'text-white'];
    const colorClass = variants[Math.floor(Math.random() * variants.length)];

    setParticles(prev => [
      ...prev,
      { 
        id, 
        x: clientX + offsetX, 
        y: clientY + offsetY, 
        value: `+${formatNumber(actualClickPower)}`,
        scale,
        rotation,
        colorClass,
        duration
      }
    ]);

    // Cleanup particle based on its specific duration
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, duration * 1000);

    // Visual press effect
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 80);

    onClick();
  }, [clickPower, prestigeMultiplier, onClick, theme, clickSound, hapticsEnabled]);

  // Number formatter
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
      notation: num > 1000000 ? 'compact' : 'standard'
    }).format(num);
  };

  return (
    <div className={`flex flex-col items-center justify-center h-full relative p-6 select-none ${theme.colors.text} touch-none`}>
        {/* Ambient Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-20 ${theme.id === 'zen' ? 'bg-violet-600' : theme.id === 'neon' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />

        <div className="text-center mb-12 relative z-10 pointer-events-none">
            <h2 className={`text-sm font-medium tracking-widest uppercase mb-2 ${theme.colors.textDim}`}>Current Balance</h2>
            <div className={`text-6xl md:text-8xl font-bold font-mono tracking-tighter transition-all duration-300 ${theme.colors.text}`}>
                {formatNumber(points)}
            </div>
            <div className={`flex items-center justify-center gap-2 mt-4 text-sm ${theme.colors.textDim}`}>
                <Zap size={14} className={theme.colors.accent} />
                <span>{formatNumber(autoPointsPerSecond * prestigeMultiplier)} / sec</span>
                {prestigeMultiplier > 1 && (
                  <span 
                    className="ml-2 text-xs px-2 py-0.5 rounded-full border border-current opacity-60 cursor-help pointer-events-auto"
                    title={`Base (1) + (Lvl ${prestigeLevel} × ${PRESTIGE_MULTIPLIER_PER_LEVEL})`}
                  >
                    {prestigeMultiplier.toFixed(1)}x Multiplier
                  </span>
                )}
            </div>
        </div>

        <button
            ref={buttonRef}
            onClick={handleInteraction}
            className={`
                relative group w-48 h-48 md:w-64 md:h-64 rounded-full 
                bg-gradient-to-b from-white/5 to-transparent
                border-4 ${theme.colors.border} ${theme.colors.accentGlow}
                flex items-center justify-center
                transition-all duration-75 ease-out
                ${theme.colors.accentHover} hover:shadow-lg
                active:scale-95
                z-20
                touch-none select-none
                ${isPressed ? 'scale-95 border-current shadow-inner' : ''}
            `}
            style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        >
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/5`} />
            <MousePointer2 
                size={64} 
                className={`${theme.colors.text} relative z-10 transition-transform duration-75 ${isPressed ? 'scale-90' : 'scale-100'}`} 
            />
            
            {/* Inner Ring Pulse */}
            <div className="absolute inset-2 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 animate-pulse-slow" />
        </button>

        {/* Floating Particles */}
        {particles.map(p => (
            <div
                key={p.id}
                className={`pointer-events-none fixed z-50 font-bold animate-float-up ${p.colorClass} drop-shadow-md`}
                style={{ 
                    left: p.x, 
                    top: p.y,
                    transform: `scale(${p.scale}) rotate(${p.rotation}deg)`,
                    fontSize: '1.5rem', // Base size, scaled by transform
                    animationDuration: `${p.duration}s`
                }}
            >
                {p.value}
            </div>
        ))}

        <div className={`mt-12 text-xs tracking-wide ${theme.colors.textDim} opacity-50`}>
            TAP OR CLICK TO GENERATE
        </div>
    </div>
  );
};

export default Clicker;
