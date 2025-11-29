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
    // OPTIMIZATION: Use fewer particles (20) to ensure smooth performance on mobile/low-end GPUs
    const newParticles = Array.from({ length: 20 }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = 40 + Math.random() * 60; // Reduced distance range
      const duration = 0.8 + Math.random() * 1.2;
      
      return {
        id: i,
        style: {
          left: '50%',
          top: '50%',
          width: `${3 + Math.random() * 3}px`,
          height: `${3 + Math.random() * 3}px`,
          backgroundColor: Math.random() > 0.5 ? '#fbbf24' : '#ffffff',
          transform: `rotate(${angle}deg) translateX(${distance}vmin)`,
          opacity: 0,
          // Use standard CSS animation for better performance
          animation: `particle-explode ${duration}s cubic-bezier(0.1, 0.8, 0.2, 1) forwards`,
        }
      };
    });
    setParticles(newParticles);

    // Reveal content
    const revealTimer = setTimeout(() => setShowContent(true), 300);
    const completeTimer = setTimeout(onComplete, 4500); 

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center overscroll-none touch-none">
        <style>{`
          @keyframes particle-explode {
            0% { transform: rotate(var(--angle)) translateX(0); opacity: 1; }
            100% { transform: rotate(var(--angle)) translateX(var(--dist)); opacity: 0; }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>

        {/* Simplified Background - No expensive blurs */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#451a03_0%,_#09090b_80%)] opacity-50" />
        
        {/* Optimized Pulse Rings (CSS Transform only) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-amber-500/30 rounded-full animate-[pulse-ring_3s_ease-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/10 rounded-full animate-[pulse-ring_3s_ease-out_1s_infinite]" />

        {/* Particles */}
        {particles.map(p => (
            <div key={p.id} className="absolute rounded-full pointer-events-none" style={p.style} />
        ))}

        {/* Content Container - Removed backdrop-blur to fix lag */}
        <div className={`relative z-10 text-center transition-all duration-700 transform ${showContent ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <div className="relative inline-block mb-8">
                <Crown size={80} className="text-amber-100 relative z-10 drop-shadow-lg" />
                <Sparkles size={32} className="absolute -top-4 -right-6 text-yellow-200 animate-bounce" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight uppercase">
                Ascended
            </h1>
            
            <div className="bg-zinc-900/80 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-xs mx-auto">
                <p className="text-xl text-amber-200/80 font-medium mb-1">Prestige Level <span className="text-white">{level}</span></p>
                
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">New Multiplier</div>
                  <div className="text-4xl font-mono font-bold text-amber-400">
                      {newMultiplier.toFixed(1)}x
                  </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default PrestigeSuccess;