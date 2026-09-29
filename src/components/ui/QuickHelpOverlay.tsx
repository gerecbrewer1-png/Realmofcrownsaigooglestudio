/**
 * REALM OF CROWNS — Quick Keyboard Reference Overlay (F1)
 * Lightweight, in-game floating cheatsheet derived dynamically from ShortcutManager.
 */

import React from 'react';
import { shortcutManager } from '../../game/input/shortcutManager';
import { InputAction } from '../../game/input/inputTypes';
import { X, Keyboard, Shield, Swords, Move, Users, Layers, Eye } from 'lucide-react';

interface QuickHelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const QuickHelpOverlay: React.FC<QuickHelpOverlayProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  // Listen for Escape key to close modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getBindingDisplay = (action: InputAction): { primary: string; secondary?: string } => {
    const b = shortcutManager.getBinding(action);
    return {
      primary: b?.primaryDisplay || '—',
      secondary: b?.secondaryDisplay !== '—' ? b?.secondaryDisplay : undefined,
    };
  };

  const moveFwd = getBindingDisplay(InputAction.MOVE_FORWARD);
  const moveLeft = getBindingDisplay(InputAction.MOVE_LEFT);
  const moveBack = getBindingDisplay(InputAction.MOVE_BACKWARD);
  const moveRight = getBindingDisplay(InputAction.MOVE_RIGHT);

  const attack = getBindingDisplay(InputAction.ATTACK);
  const attackMove = getBindingDisplay(InputAction.ATTACK_MOVE);
  const moveOrder = getBindingDisplay(InputAction.MOVE_ORDER);
  const follow = getBindingDisplay(InputAction.FOLLOW);
  const defend = getBindingDisplay(InputAction.DEFEND);
  const hold = getBindingDisplay(InputAction.HOLD);
  const stop = getBindingDisplay(InputAction.STOP);
  const retreat = getBindingDisplay(InputAction.RETREAT);
  const charge = getBindingDisplay(InputAction.CHARGE);
  const patrol = getBindingDisplay(InputAction.PATROL);

  const formLine = getBindingDisplay(InputAction.FORMATION_LINE);
  const formWedge = getBindingDisplay(InputAction.FORMATION_WEDGE);
  const formCol = getBindingDisplay(InputAction.FORMATION_COLUMN);
  const formBox = getBindingDisplay(InputAction.FORMATION_BOX);
  const formCircle = getBindingDisplay(InputAction.FORMATION_CIRCLE);
  const formDef = getBindingDisplay(InputAction.FORMATION_DEFENSIVE);

  const selHero = getBindingDisplay(InputAction.SELECT_HERO);
  const selArmy = getBindingDisplay(InputAction.SELECT_ARMY);
  const selInf = getBindingDisplay(InputAction.SELECT_INFANTRY);
  const selArch = getBindingDisplay(InputAction.SELECT_ARCHERS);
  const selCav = getBindingDisplay(InputAction.SELECT_CAVALRY);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none">
      <div className="bg-stone-900 border-2 border-amber-600/80 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-300 uppercase tracking-wide">
                Tactical Battlefield Controls (F1)
              </h2>
              <p className="text-[10px] sm:text-[11px] text-stone-400">
                Authoritative conflict-free RTS shortcuts
              </p>
            </div>
          </div>
          <button
            id="close-quick-help-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center text-xs font-bold transition-all"
            aria-label="Close Help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Section 1: Hero Movement */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase border-b border-stone-800 pb-1">
              <Move className="w-3.5 h-3.5" />
              <span>Hero Movement (Reserved)</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Forward:</span>
                <span className="font-mono font-bold text-amber-300">{moveFwd.primary} / {moveFwd.secondary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Left:</span>
                <span className="font-mono font-bold text-amber-300">{moveLeft.primary} / {moveLeft.secondary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Backward:</span>
                <span className="font-mono font-bold text-amber-300">{moveBack.primary} / {moveBack.secondary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Right:</span>
                <span className="font-mono font-bold text-amber-300">{moveRight.primary} / {moveRight.secondary}</span>
              </div>
            </div>
            <p className="text-[9px] text-stone-500 italic">
              *WASD & Arrows are held for continuous movement. Never trigger commands.
            </p>
          </div>

          {/* Section 2: Unit / Squad Selection */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase border-b border-stone-800 pb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Selection</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Hero:</span>
                <span className="font-mono font-bold text-amber-300">{selHero.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Full Army:</span>
                <span className="font-mono font-bold text-amber-300">{selArmy.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Infantry:</span>
                <span className="font-mono font-bold text-amber-300">{selInf.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Archers:</span>
                <span className="font-mono font-bold text-amber-300">{selArch.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Cavalry:</span>
                <span className="font-mono font-bold text-amber-300">{selCav.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Cycle:</span>
                <span className="font-mono font-bold text-amber-300">Tab</span>
              </div>
            </div>
          </div>

          {/* Section 3: Army Tactical Commands */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase border-b border-stone-800 pb-1">
              <Swords className="w-3.5 h-3.5" />
              <span>Army Commands</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Attack:</span>
                <span className="font-mono font-bold text-amber-300">{attack.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Attack-Move:</span>
                <span className="font-mono font-bold text-amber-300">{attackMove.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Move Order:</span>
                <span className="font-mono font-bold text-amber-300">{moveOrder.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Follow:</span>
                <span className="font-mono font-bold text-amber-300">{follow.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Defend:</span>
                <span className="font-mono font-bold text-amber-300">{defend.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Hold:</span>
                <span className="font-mono font-bold text-amber-300">{hold.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Stop:</span>
                <span className="font-mono font-bold text-amber-300">{stop.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Retreat:</span>
                <span className="font-mono font-bold text-amber-300">{retreat.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Charge:</span>
                <span className="font-mono font-bold text-amber-300">{charge.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Patrol:</span>
                <span className="font-mono font-bold text-amber-300">{patrol.primary}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Tactical Formations */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase border-b border-stone-800 pb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Formations</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Line:</span>
                <span className="font-mono font-bold text-amber-300">{formLine.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Wedge:</span>
                <span className="font-mono font-bold text-amber-300">{formWedge.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Column:</span>
                <span className="font-mono font-bold text-amber-300">{formCol.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Box:</span>
                <span className="font-mono font-bold text-amber-300">{formBox.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Circle:</span>
                <span className="font-mono font-bold text-amber-300">{formCircle.primary}</span>
              </div>
              <div className="flex justify-between bg-stone-900/90 px-2 py-1 rounded">
                <span className="text-stone-400">Defensive:</span>
                <span className="font-mono font-bold text-amber-300">{formDef.primary}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mouse / RTS Controls Summary */}
        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-stone-300">
            <span className="font-bold text-amber-300">Left Click:</span> Select Hero/Squad
          </div>
          <div className="flex items-center gap-1.5 text-stone-300">
            <span className="font-bold text-amber-300">Right Click:</span> Move / Execute Order
          </div>
          <div className="flex items-center gap-1.5 text-stone-300">
            <span className="font-bold text-amber-300">Wheel:</span> Zoom
          </div>
          <div className="flex items-center gap-1.5 text-stone-300">
            <span className="font-bold text-amber-300">F10:</span> Clean Screen
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-stone-800 text-[11px]">
          <span className="text-stone-500">Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-300 font-mono">Esc</kbd> to close</span>
          {onOpenSettings && (
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-black uppercase text-xs shadow transition-all active:scale-95"
            >
              Configure & Remap (F2)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
