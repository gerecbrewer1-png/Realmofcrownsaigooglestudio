/**
 * Realm of Crowns - Royal Court: Hero & Class Commander Modal
 * Supports all 5 distinct Hero Classes (Warlord, Guardian, Ranger, Steward, Strategist),
 * Role Assignment (Citadel Garrison, Field March, Treasury Overseer, Logistics Minister, Master of Arms),
 * Talent Branches, Core Class Stat breakdowns, and Skill trees.
 */

import React, { useState } from 'react';
import {
  X,
  Shield,
  Award,
  Zap,
  Star,
  Swords,
  Compass,
  Target,
  Scale,
  Sparkles,
  TrendingUp,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Package,
  BookOpen,
  ArrowUpCircle,
  Crown,
} from 'lucide-react';
import { Commander, HeroClass, HeroRole } from '../types';
import { clientApi } from '../api/clientApi';
import { soundEngine } from '../audio/soundEngine';
import { Hero3DPreview } from './world3d/Hero3DPreview';
import {
  getHeroPowerTier,
  getHeroTierName,
  CLASS_AURA_PALETTES,
} from './world3d/heroAuraSystem';

interface CommanderModalProps {
  commander: Commander | null;
  commanders?: Record<string, Commander>;
  onClose: () => void;
  onCommanderUpdated?: (cmd: Commander, all: Record<string, Commander>) => void;
}

const CLASS_THEMES: Record<
  HeroClass,
  {
    name: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    accentColor: string;
    icon: React.ReactNode;
    tagline: string;
    combatNiche: string;
  }
> = {
  warlord: {
    name: 'Warlord',
    badgeBg: 'bg-rose-950/80',
    badgeBorder: 'border-rose-600/50',
    badgeText: 'text-rose-300',
    accentColor: '#f43f5e',
    icon: <Swords className="w-3.5 h-3.5" />,
    tagline: 'Offensive Breaker & Shock Assault',
    combatNiche: 'Boosts army attack by +18–25% and breaks enemy lines during Frontline Clash. Gains massive PvE bonuses against Barbarian Camps.',
  },
  guardian: {
    name: 'Guardian',
    badgeBg: 'bg-sky-950/80',
    badgeBorder: 'border-sky-600/50',
    badgeText: 'text-sky-300',
    accentColor: '#38bdf8',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    tagline: 'Citadel Bastion & Casualty Protection',
    combatNiche: 'Bolsters army defense (+20–30%) and health. Converts up to 88% of casualties into hospital wounded, shielding your army from permanent death.',
  },
  ranger: {
    name: 'Ranger',
    badgeBg: 'bg-emerald-950/80',
    badgeBorder: 'border-emerald-600/50',
    badgeText: 'text-emerald-300',
    accentColor: '#34d399',
    icon: <Target className="w-3.5 h-3.5" />,
    tagline: 'Swift Velocity & First Strike Volley',
    combatNiche: 'Marches 30–35% faster across the realm and fires high-velocity arrow volleys during Round 1 Skirmish. Superior for scouting and distant strikes.',
  },
  steward: {
    name: 'Steward',
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-600/50',
    badgeText: 'text-amber-300',
    accentColor: '#fbbf24',
    icon: <Scale className="w-3.5 h-3.5" />,
    tagline: 'Baggage Logistics & Realm Economy',
    combatNiche: 'Increases army resource payload by +40% and boosts extraction rates on world nodes. Enhances kingdom treasury storage and taxation.',
  },
  strategist: {
    name: 'Strategist',
    badgeBg: 'bg-purple-950/80',
    badgeBorder: 'border-purple-600/50',
    badgeText: 'text-purple-300',
    accentColor: '#c084fc',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    tagline: 'Grand Tactician & Army Capacity',
    combatNiche: 'Commands outsized army formations (+2,500+ troops) and executes flank re-formations during battle, exploiting unit counter-advantages.',
  },
};

const ROLES: { id: HeroRole | 'unassigned'; name: string; description: string; icon: string }[] = [
  {
    id: 'citadel_garrison',
    name: 'Citadel Garrison',
    description: 'Commands the fortress battlements, repelling incoming enemy siege armies.',
    icon: '🏰',
  },
  {
    id: 'field_march',
    name: 'Field Expedition',
    description: 'Leads active army divisions on world map expeditions, raids, and patrols.',
    icon: '⚔️',
  },
  {
    id: 'treasury_overseer',
    name: 'Treasury Overseer',
    description: 'Oversees tax collection, boosting kingdom gold and resource production.',
    icon: '🪙',
  },
  {
    id: 'logistics_minister',
    name: 'Logistics Minister',
    description: 'Coordinates baggage trains, improving army resource payload capacity.',
    icon: '📦',
  },
  {
    id: 'master_of_arms',
    name: 'Master of Arms',
    description: 'Supervises military academies and drills, accelerating troop training speed.',
    icon: '🎯',
  },
  {
    id: 'unassigned',
    name: 'Reserve Retinue',
    description: 'Standing by in the royal barracks awaiting royal deployment orders.',
    icon: '🛡️',
  },
];

export const CommanderModal: React.FC<CommanderModalProps> = ({
  commander,
  commanders: initialCommanders,
  onClose,
  onCommanderUpdated,
}) => {
  const [activeClassFilter, setActiveClassFilter] = useState<'all' | HeroClass>('all');
  const [commandersMap, setCommandersMap] = useState<Record<string, Commander>>(
    initialCommanders || (commander ? { [commander.id]: commander } : {})
  );
  const [selectedCommanderId, setSelectedCommanderId] = useState<string>(
    commander?.id || 'alden_valiant'
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'talents' | 'skills'>('overview');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const currentCmd = commandersMap[selectedCommanderId] || commander;

  if (!currentCmd) return null;

  const currentClass: HeroClass = currentCmd.heroClass || 'guardian';
  const theme = CLASS_THEMES[currentClass] || CLASS_THEMES.guardian;

  const commanderList: Commander[] = Object.values(commandersMap) as Commander[];
  const filteredCommanders =
    activeClassFilter === 'all'
      ? commanderList
      : commanderList.filter((c) => c.heroClass === activeClassFilter);

  const handleRoleChange = async (role: HeroRole | 'unassigned') => {
    soundEngine.playClick();
    setIsUpdating(true);
    try {
      const res = await clientApi.assignCommanderRole(currentCmd.id, role);
      if (res.success) {
        setCommandersMap(res.commanders);
        if (onCommanderUpdated) {
          onCommanderUpdated(res.commander, res.commanders);
        }
        setActionNotice(`Assigned to ${role === 'unassigned' ? 'Reserve' : role.replace('_', ' ')}!`);
        setTimeout(() => setActionNotice(null), 2500);
      }
    } catch (err: any) {
      setActionNotice(err.message || 'Failed to assign role');
      setTimeout(() => setActionNotice(null), 2500);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLevelUp = async () => {
    soundEngine.playFanfare();
    setIsUpdating(true);
    try {
      const res = await clientApi.levelUpCommander(currentCmd.id);
      if (res.success) {
        setCommandersMap(res.commanders);
        if (onCommanderUpdated) {
          onCommanderUpdated(res.commander, res.commanders);
        }
        setActionNotice(`Level up! Reached Lv.${res.commander.level}!`);
        setTimeout(() => setActionNotice(null), 2500);
      }
    } catch (err: any) {
      setActionNotice(err.message || 'Level up failed');
      setTimeout(() => setActionNotice(null), 2500);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpgradeTalent = async (branchId: string, talentId: string) => {
    soundEngine.playChime();
    setIsUpdating(true);
    try {
      const res = await clientApi.upgradeCommanderTalent(currentCmd.id, branchId, talentId);
      if (res.success) {
        setCommandersMap(res.commanders);
        if (onCommanderUpdated) {
          onCommanderUpdated(res.commander, res.commanders);
        }
        setActionNotice('Talent rank upgraded!');
        setTimeout(() => setActionNotice(null), 2500);
      }
    } catch (err: any) {
      setActionNotice(err.message || 'Talent upgrade failed');
      setTimeout(() => setActionNotice(null), 2500);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-200">Royal Court: Heroes & Classes</h2>
                <span className="text-[11px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                  {commanderList.length} Sovereigns
                </span>
              </div>
              <p className="text-xs text-slate-400">
                5 distinct combat & civil classes with unique strategic identities and role assignments.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold text-center shadow animate-in fade-in">
            {actionNotice}
          </div>
        )}

        {/* Class Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveClassFilter('all');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
              activeClassFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Classes ({commanderList.length})
          </button>
          {(['warlord', 'guardian', 'ranger', 'steward', 'strategist'] as HeroClass[]).map((cls) => {
            const th = CLASS_THEMES[cls];
            const isSelected = activeClassFilter === cls;
            return (
              <button
                key={cls}
                onClick={() => {
                  soundEngine.playClick();
                  setActiveClassFilter(cls);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? `${th.badgeBg} ${th.badgeBorder} ${th.badgeText} shadow-md`
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {th.icon}
                <span>{th.name}</span>
              </button>
            );
          })}
        </div>

        {/* Commander Selection Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {filteredCommanders.map((cmd) => {
            const isCurrent = cmd.id === currentCmd.id;
            const cmdClass = cmd.heroClass || 'guardian';
            const cTheme = CLASS_THEMES[cmdClass];
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedCommanderId(cmd.id);
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl border text-left shrink-0 transition cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-800 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-xl shrink-0">
                  {cmdClass === 'warlord' && '⚔️'}
                  {cmdClass === 'guardian' && '🛡️'}
                  {cmdClass === 'ranger' && '🏹'}
                  {cmdClass === 'steward' && '📜'}
                  {cmdClass === 'strategist' && '♟️'}
                  {cmd.assignedRole && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                  )}
                </div>
                <div className="min-w-[110px]">
                  <div className="text-xs font-bold text-amber-200 truncate">{cmd.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${cTheme.badgeBg} ${cTheme.badgeText}`}>
                      {cTheme.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Lv.{cmd.level}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Commander Hero Card */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center md:items-start gap-5 shadow-xl">
          {/* Avatar & Class Crest */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Hero3DPreview
              heroClass={currentClass}
              rarity={currentCmd.rarity}
              level={currentCmd.level}
              commander={currentCmd}
              onTriggerAbility={() => {
                soundEngine.playFanfare();
              }}
            />

            {/* Class Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
              {theme.icon}
              <span>Class: {theme.name}</span>
            </div>
          </div>

          {/* Core Info & Role Assignment */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-amber-100">{currentCmd.name}</h3>
              <span className="bg-indigo-950 text-indigo-300 font-bold text-xs px-2 py-0.5 rounded border border-indigo-800 uppercase">
                {currentCmd.archetype} Specialist
              </span>
            </div>
            <p className="text-xs text-amber-300 italic mt-0.5">{currentCmd.title}</p>

            {/* Stars & Level */}
            <div className="flex items-center justify-center md:justify-start gap-1 my-2 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < currentCmd.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                  }`}
                />
              ))}
              <span className="text-xs font-mono ml-2 text-slate-300">
                Lv.{currentCmd.level} • {currentCmd.power.toLocaleString()} Power
              </span>
            </div>

            {/* Visual Power Progression & Aura Tag */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Power Tier {getHeroPowerTier(currentCmd.level)}: {getHeroTierName(getHeroPowerTier(currentCmd.level))}
              </span>
              <span className="text-[11px] text-slate-400">
                Aura: <strong className="text-amber-200">{CLASS_AURA_PALETTES[currentClass]?.name}</strong>
              </span>
            </div>

            {/* Class Strategic Identity Description */}
            <div className={`p-2.5 rounded-xl border text-xs leading-relaxed my-2.5 ${theme.badgeBg} ${theme.badgeBorder}`}>
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Class Identity: {theme.tagline}</span>
              </div>
              <p className="text-slate-300 text-[11px]">{theme.combatNiche}</p>
            </div>

            {/* Assigned Role Selector */}
            <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Royal Duty:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => {
                  const isAssigned =
                    (r.id === 'unassigned' && !currentCmd.assignedRole) ||
                    currentCmd.assignedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      disabled={isUpdating}
                      onClick={() => handleRoleChange(r.id)}
                      title={r.description}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                        isAssigned
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow font-extrabold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Level Up & EXP Box */}
          <div className="flex flex-col gap-2 w-full md:w-48 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Experience</span>
              <span className="font-mono text-amber-300">
                {currentCmd.exp} / {currentCmd.maxExp}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((currentCmd.exp / Math.max(1, currentCmd.maxExp)) * 100))}%`,
                }}
              />
            </div>
            <button
              disabled={isUpdating}
              onClick={handleLevelUp}
              className="mt-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Train Commander</span>
            </button>
            <div className="text-[10px] text-center text-slate-400">
              Talent Points Available: <span className="text-amber-300 font-bold">{currentCmd.talentPoints || 0}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Overview Stats / Talent Branches / Skills */}
        <div className="flex items-center gap-2 border-b border-amber-900/40 pb-2">
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('overview');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Class Attributes</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('talents');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'talents'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Talent Branches ({currentCmd.talentBranches?.length || 0})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('skills');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'skills'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Active & Passive Skills ({currentCmd.skills?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: Core Class Attributes */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              {theme.name} Operational Modifiers
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">Army Attack</span>
                <span className="text-sm font-bold text-rose-300 font-mono">
                  +{Math.round((currentCmd.stats?.armyAttack || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Increases all unit damage output</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">Army Defense</span>
                <span className="text-sm font-bold text-sky-300 font-mono">
                  +{Math.round((currentCmd.stats?.armyDefense || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Reduces damage taken in battle</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">Casualty Protection</span>
                <span className="text-sm font-bold text-emerald-300 font-mono">
                  +{Math.round((currentCmd.stats?.casualtyProtection || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Saves wounded troops to hospital</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">March Velocity</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  +{Math.round((currentCmd.stats?.marchSpeed || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Reduces travel time per hex tile</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">Army Capacity</span>
                <span className="text-sm font-bold text-purple-300 font-mono">
                  +{currentCmd.stats?.armyCapacityBonus?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Extra battalion deployment cap</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">Payload Capacity</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  +{Math.round((currentCmd.stats?.payloadMultiplier || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Increases resource hauling load</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">PvE Strike Bonus</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  +{Math.round((currentCmd.stats?.pveDamageBonus || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Lethality vs Barbarian camps</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
                <span className="text-[10px] text-slate-400">Resource Gathering</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  +{Math.round((currentCmd.stats?.gatheringSpeedBonus || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Mining rate on world nodes</span>
              </div>
            </div>

            {/* Lore Biography */}
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed mt-2">
              <span className="font-bold text-amber-300 block mb-1">Commander Biography & Lineage</span>
              {currentCmd.bio}
            </div>
          </div>
        )}

        {/* TAB 2: Talent Branches */}
        {activeTab === 'talents' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Specialization Talent Branches
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select a path to specialize this commander’s strategic role.
                </p>
              </div>
              <div className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-lg text-amber-300 border border-slate-700">
                Talent Points: <span className="font-bold">{currentCmd.talentPoints || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentCmd.talentBranches?.map((branch, bIdx) => {
                const branchKey = branch.id || branch.branchId || `branch_${bIdx}`;
                const talentList = branch.talents || branch.nodes || [];
                return (
                  <div
                    key={branchKey}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <h5 className="text-xs font-bold text-amber-200">{branch.name}</h5>
                        <p className="text-[10px] text-slate-400">{branch.description}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-900 font-mono">
                        {branch.investedPoints || 0} Points
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {talentList.map((talent, tIdx) => {
                        const talentKey = talent.id || talent.nodeId || `talent_${tIdx}`;
                        const currentRank = talent.currentRank ?? talent.pointsAllocated ?? talent.currentPoints ?? 0;
                        const maxRank = talent.maxRank ?? talent.maxPoints ?? 3;
                        const isMax = currentRank >= maxRank;
                        const canUpgrade = (currentCmd.talentPoints || 0) > 0 && !isMax;
                        return (
                          <div
                            key={talentKey}
                            className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between gap-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-200">{talent.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({currentRank}/{maxRank})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                                {talent.description}
                              </p>
                            </div>
                            <button
                              disabled={!canUpgrade || isUpdating}
                              onClick={() => handleUpgradeTalent(branchKey, talentKey)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition shrink-0 cursor-pointer ${
                                isMax
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default'
                                  : canUpgrade
                                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              }`}
                            >
                              {isMax ? 'Mastered' : 'Rank Up'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Active & Passive Skills */}
        {activeTab === 'skills' && (
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Combat Skills & Tactical Doctrines
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentCmd.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-200">{skill.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {skill.type && (
                        <span className="text-[9px] font-bold uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                          {skill.type.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900">
                        Rank {skill.level}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
