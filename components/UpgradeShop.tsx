import React from 'react';
import { Upgrade, ThemeConfig, Difficulty } from '../types';
import { UPGRADES, DIFFICULTY_CONFIG } from '../constants';
import { playSound } from '../utils/sound';
import * as Icons from 'lucide-react';

interface UpgradeShopProps {
  points: number;
  purchased: Record<string, number>;
  onBuy: (upgrade: Upgrade) => void;
  theme: ThemeConfig;
  prestigeMultiplier: number;
  difficulty: Difficulty;
}

const UpgradeShop: React.FC<UpgradeShopProps> = ({ points, purchased, onBuy, theme, prestigeMultiplier, difficulty }) => {
  
  const getCost = (upgrade: Upgrade) => {
    const count = purchased[upgrade.id] || 0;
    const base = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, count));
    return Math.floor(base * DIFFICULTY_CONFIG[difficulty].costMult);
  };

  const handleBuy = (upgrade: Upgrade) => {
    playSound('buy');
    onBuy(upgrade);
  };

  const IconComponent = (name: string) => {
    const Icon = (Icons as any)[name] || Icons.HelpCircle;
    return <Icon size={20} />;
  };

  return (
    <div className={`h-full flex flex-col ${theme.colors.panelBg} border-l ${theme.colors.border} backdrop-blur-xl transition-colors duration-300`}>
      <div className={`p-6 border-b ${theme.colors.border}`}>
        <h3 className={`text-xl font-semibold ${theme.colors.text}`}>Upgrades</h3>
        <p className={`text-sm mt-1 ${theme.colors.textDim}`}>Enhance your generation capabilities.</p>
        <div className={`text-xs mt-2 font-mono uppercase ${theme.colors.accent} opacity-80`}>
          Difficulty: {DIFFICULTY_CONFIG[difficulty].label}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {UPGRADES.map(upgrade => {
          const cost = getCost(upgrade);
          const count = purchased[upgrade.id] || 0;
          const canAfford = points >= cost;
          
          return (
            <button
              key={upgrade.id}
              onClick={() => handleBuy(upgrade)}
              disabled={!canAfford}
              className={`
                relative w-full text-left p-4 rounded-xl border transition-all duration-200
                flex items-center justify-between group
                ${canAfford 
                  ? `bg-white/5 ${theme.colors.border} hover:bg-white/10 ${theme.colors.accentHover} hover:translate-x-1` 
                  : `bg-black/20 border-transparent opacity-60 cursor-not-allowed`}
              `}
            >
              {/* Tooltip */}
              <div className={`
                hidden group-hover:block absolute z-50 w-64 p-4 rounded-xl shadow-2xl backdrop-blur-xl border pointer-events-none
                bg-zinc-900/95 border-white/10 
                top-full left-0 mt-2 md:top-0 md:left-auto md:right-[105%] md:mt-0
                animate-slide-in
              `}>
                 <div className="font-bold text-white mb-2 border-b border-white/10 pb-2">{upgrade.name}</div>
                 <div className="text-xs space-y-1.5 text-zinc-400">
                    <div className="flex justify-between">
                        <span>Type</span>
                        <span className="text-zinc-200">{upgrade.type === 'CLICK_POWER' ? 'Active (Click)' : 'Passive (Auto)'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Base Power</span>
                        <span className="text-zinc-200">+{upgrade.basePower}</span>
                    </div>
                    <div className="flex justify-between">
                         <span>Current Level</span>
                         <span className="text-zinc-200">{count}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 mt-1">
                         <span>Total Effect</span>
                         <span className={`font-mono font-bold ${theme.colors.accent}`}>
                            +{new Intl.NumberFormat('en-US').format(count * upgrade.basePower * prestigeMultiplier)} {upgrade.type === 'CLICK_POWER' ? '/ click' : '/ sec'}
                         </span>
                    </div>
                    <div className="text-[10px] italic text-zinc-500 mt-2">
                        Includes {prestigeMultiplier.toFixed(1)}x prestige multiplier
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`
                  p-3 rounded-lg 
                  ${canAfford ? `bg-white/5 ${theme.colors.accent}` : `bg-white/5 ${theme.colors.textDim}`}
                `}>
                  {IconComponent(upgrade.icon)}
                </div>
                <div>
                  <div className={`font-medium ${theme.colors.text}`}>{upgrade.name}</div>
                  <div className={`text-xs ${theme.colors.textDim} mt-0.5`}>
                    {upgrade.description} 
                    {prestigeMultiplier > 1 && <span className="opacity-75"> (x{prestigeMultiplier})</span>}
                  </div>
                  <div className={`text-xs mt-1 font-mono ${theme.colors.textDim} opacity-60`}>
                    Lvl {count}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-mono font-medium ${canAfford ? theme.colors.text : theme.colors.textDim}`}>
                  {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(cost)}
                </div>
                <div className={`text-[10px] uppercase tracking-wider mt-1 ${theme.colors.textDim}`}>Points</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UpgradeShop;