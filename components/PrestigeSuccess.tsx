import React, { useEffect, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';

interface PrestigeSuccessProps {
  level: number;
  newMultiplier: number;
  onComplete: () => void;
}

const PrestigeSuccess: React.FC<PrestigeSuccessProps> = ({ level, newMultiplier, onComplete }) => {
  const [particles, setParticles] = useState<{ id: number; style: React.CSSProperties }[]>([]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // OPTIMIZATION: Reduced particle count from 60 to 30 to prevent GPU lag on some devices
    const newParticles = Array.from({ length: 30 }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = 50 + Math.random() * 100; // Percentage distance
      const duration = 1 + Math.random() * 2;
      
      return {
        id: i,
        style: {
          left: '50%',
          top: '50%',
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          backgroundColor: Math.random() > 0.5 ? '#fbbf24' : '#fff', // Amber or White
          transform: `rotate(${angle}deg) translateX(${distance}vmin)`,
          opacity: 0,
          animation: `particle-explode ${duration}s cubic-bezier(0.1, 0.8, 0.2, 1) forwards`,
          animationDelay: `${Math.random() * 0.2}s`
        }
      };
    });
    setParticles(newParticles);

    // Stagger content reveal
    const revealTimer = setTimeout(() => setShowContent(true), 500);

    const completeTimer = setTimeout(onComplete, 5000); 

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col items-center justify-center">
        <style>{`
          @keyframes particle-explode {
            0% { transform: rotate(var(--angle)) translateX(0); opacity: 1; }
            100% { transform: rotate(var(--angle)) translateX(var(--dist)); opacity: 0; }
          }
          @keyframes shockwave {
            0% { transform: scale(0); opacity: 0.8; border-width: 50px; }
            100% { transform: scale(4); opacity: 0; border-width: 0px; }
          }
        `}</style>

        {/* Ambient Space Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#451a03_0%,_#000000_70%)] opacity-80 animate-pulse-slow" />
        
        {/* Shockwave Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vmin] h-[50vmin] rounded-full border-amber-500 box-content animate-[shockwave_2s_ease-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vmin] h-[40vmin] rounded-full border-white/50 box-content animate-[shockwave_2s_ease-out_0.5s_infinite]" />

        {/* Particles */}
        {particles.map(p => (
            <div key={p.id} className="absolute rounded-full" style={p.style} />
        ))}

        {/* Content Container */}
        <div className={`relative z-10 text-center transition-all duration-1000 transform ${showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
            <div className="relative inline-block mb-8">
                {/* Glowing Aura behind Crown */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-400 blur-[60px] opacity-60 animate-pulse" />
                <Crown size={96} className="text-amber-100 relative z-10 drop-shadow-[0_0_25px_rgba(251,191,36,0.8)]" />
                <Sparkles size={48} className="absolute -top-4 -right-8 text-yellow-200 animate-bounce" />
                <Sparkles size={32} className="absolute -bottom-2 -left-8 text-yellow-200 animate-pulse" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500 mb-6 tracking-tight uppercase drop-shadow-sm">
                Ascended
            </h1>
            
            <div className="space-y-4 backdrop-blur-sm bg-black/30 p-8 rounded-2xl border border-white/10 shadow-2xl">
                <p className="text-2xl text-amber-200 font-light tracking-wide">Prestige Level <span className="font-bold text-white">{level}</span></p>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm text-zinc-400 uppercase tracking-widest">New Multiplier</div>
                  <div className="text-5xl font-mono font-bold text-white text-shadow-lg">
                      {newMultiplier.toFixed(1)}x
                  </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default PrestigeSuccess;