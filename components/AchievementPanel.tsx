import React from 'react';
import { ACHIEVEMENTS } from '../constants';
import { ThemeConfig } from '../types';
import * as Icons from 'lucide-react';

interface AchievementPanelProps {
  unlockedIds: string[];
  theme: ThemeConfig;
}

const AchievementPanel: React.FC<AchievementPanelProps> = ({ unlockedIds, theme }) => {
  const unlockedSet = new Set(unlockedIds);

  const IconComponent = (name: string, unlocked: boolean) => {
    const Icon = (Icons as any)[name] || Icons.Trophy;
    return <Icon size={18} className={unlocked ? theme.colors.accent : theme.colors.textDim} />;
  };

  // Sort: Unlocked first
  const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    const aUnlocked = unlockedSet.has(a.id);
    const bUnlocked = unlockedSet.has(b.id);
    if (aUnlocked === bUnlocked) return 0;
    return aUnlocked ? -1 : 1;
  });

  return (
    <div className={`${theme.colors.panelBg} border-t ${theme.colors.border} p-6 md:h-1/3 overflow-y-auto transition-colors duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${theme.colors.text}`}>Achievements</h3>
        <span className={`text-xs font-mono ${theme.colors.textDim}`}>
          {unlockedSet.size} / {ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedAchievements.map(ach => {
            const isUnlocked = unlockedSet.has(ach.id);
            return (
                <div 
                    key={ach.id} 
                    className={`
                        flex items-center gap-3 p-3 rounded-lg border transition-all
                        ${isUnlocked 
                            ? `bg-white/5 ${theme.colors.border}` 
                            : `bg-black/20 border-transparent opacity-50`}
                    `}
                >
                    <div className={`
                        p-2 rounded-full
                        ${isUnlocked ? 'bg-white/5' : 'bg-black/20'}
                    `}>
                        {IconComponent(ach.icon, isUnlocked)}
                    </div>
                    <div>
                        <div className={`text-sm font-medium ${isUnlocked ? theme.colors.text : theme.colors.textDim}`}>
                            {ach.name}
                        </div>
                        <div className={`text-[10px] leading-tight mt-0.5 ${theme.colors.textDim}`}>
                            {ach.description}
                        </div>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default AchievementPanel;
