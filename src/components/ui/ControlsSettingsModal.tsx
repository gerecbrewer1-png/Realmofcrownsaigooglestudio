/**
 * REALM OF CROWNS — Comprehensive Adaptive Controls & Key Remapping Screen
 * Centralized settings modal with real-time preference toggles, authoritative key reference table,
 * and conflict-safe remapping with replacement confirmation.
 */

import React, { useState, useEffect } from 'react';
import { controlPreferences } from '../../game/input/controlPreferences';
import { shortcutManager, ShortcutManager, RESERVED_MOVEMENT_KEYS } from '../../game/input/shortcutManager';
import {
  ControlMode,
  ControlPreferences,
  ControlSize,
  InputAction,
  KeyBinding,
  KeyConflict,
  ActionCategory,
} from '../../game/input/inputTypes';
import {
  X,
  Sliders,
  Keyboard,
  Smartphone,
  Eye,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';

interface ControlsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsSettingsModal: React.FC<ControlsSettingsModalProps> = ({ isOpen, onClose }) => {
  const [prefs, setPrefs] = useState<ControlPreferences>(controlPreferences.getPreferences());
  const [bindings, setBindings] = useState<KeyBinding[]>(shortcutManager.getBindings());
  const [activeTab, setActiveTab] = useState<'PREFERENCES' | 'KEYBOARD'>('PREFERENCES');

  // Remapping state
  const [remappingAction, setRemappingAction] = useState<{
    action: InputAction;
    isSecondary: boolean;
    actionName: string;
  } | null>(null);

  // Conflict state
  const [pendingConflict, setPendingConflict] = useState<{
    conflict: KeyConflict;
    targetAction: InputAction;
    key: string;
    isSecondary: boolean;
  } | null>(null);

  // Collapsed categories for keyboard table
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubPrefs = controlPreferences.subscribe(p => setPrefs(p));
    const unsubKeys = shortcutManager.onBindingChange(b => setBindings(b));
    return () => {
      unsubPrefs();
      unsubKeys();
    };
  }, []);

  // Listen for keydown when actively remapping
  useEffect(() => {
    if (!remappingAction) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rawKey = e.code;
      if (rawKey === 'Escape') {
        setRemappingAction(null);
        return;
      }

      const res = shortcutManager.remapKey(
        remappingAction.action,
        rawKey,
        remappingAction.isSecondary,
        false // Do not force replace immediately; prompt on conflict
      );

      if (res.success) {
        setRemappingAction(null);
      } else if (res.conflict) {
        setPendingConflict({
          conflict: res.conflict,
          targetAction: remappingAction.action,
          key: rawKey,
          isSecondary: remappingAction.isSecondary,
        });
        setRemappingAction(null);
      } else if (res.reason) {
        alert(res.reason);
        setRemappingAction(null);
      }
    };

    window.addEventListener('keydown', handleKeyCapture, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyCapture, { capture: true });
    };
  }, [remappingAction]);

  // Listen for Escape key to close modal when not remapping
  useEffect(() => {
    if (!isOpen || remappingAction !== null || pendingConflict !== null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, remappingAction, pendingConflict, onClose]);

  if (!isOpen) return null;

  const handleModeChange = (mode: ControlMode) => {
    controlPreferences.setControlMode(mode);
  };

  const handleConfirmConflictReplace = () => {
    if (!pendingConflict) return;
    shortcutManager.remapKey(
      pendingConflict.targetAction,
      pendingConflict.key,
      pendingConflict.isSecondary,
      true // Force replace
    );
    setPendingConflict(null);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories: ActionCategory[] = [
    'MOVEMENT',
    'ARMY_COMMANDS',
    'SELECTION',
    'FORMATIONS',
    'CAMERA',
    'SYSTEM',
  ];

  const categoryLabels: Record<ActionCategory, string> = {
    MOVEMENT: 'Movement & Hero Control (Reserved)',
    ARMY_COMMANDS: 'Army Commands & Tactics',
    SELECTION: 'Unit & Squad Selection',
    FORMATIONS: 'Tactical Formations',
    CAMERA: 'Camera & Zoom Controls',
    SYSTEM: 'Game & Interface Shortcuts',
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in">
      <div className="bg-stone-900 border-2 border-amber-600/80 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 border border-amber-500/50 flex items-center justify-center text-stone-950">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-300 uppercase tracking-wide">
                Controls & Adaptive Input Preferences
              </h2>
              <p className="text-[10px] sm:text-[11px] text-stone-400">
                Customize touch, joystick, keyboard, and RTS bindings
              </p>
            </div>
          </div>
          <button
            id="close-controls-settings-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center text-xs font-bold transition-all"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-4 sm:px-6 gap-2">
          <button
            onClick={() => setActiveTab('PREFERENCES')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'PREFERENCES'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Control Preferences
          </button>
          <button
            onClick={() => setActiveTab('KEYBOARD')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'KEYBOARD'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Keyboard Reference & Remapping
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {activeTab === 'PREFERENCES' && (
            <div className="space-y-4">
              {/* Control Mode Selector */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 sm:p-4 space-y-2">
                <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                  Input Control Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['AUTO', 'JOYSTICK', 'KEYBOARD', 'BOTH'] as ControlMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleModeChange(mode)}
                      className={`py-2 px-3 rounded-lg font-bold border transition-all text-center ${
                        prefs.controlMode === mode
                          ? 'bg-amber-600 border-amber-400 text-stone-950 font-black shadow'
                          : 'bg-stone-850 border-stone-700 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-stone-400 italic">
                  {prefs.controlMode === 'AUTO' && '• Auto determines touch/joystick on mobile and keyboard/mouse on desktop.'}
                  {prefs.controlMode === 'JOYSTICK' && '• Touch analog joystick is the primary movement input.'}
                  {prefs.controlMode === 'KEYBOARD' && '• WASD / Arrow keys are primary; joystick is hidden for pure desktop view.'}
                  {prefs.controlMode === 'BOTH' && '• Both joystick and keyboard movement operate simultaneously.'}
                </p>
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Show Joystick */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-stone-200">Show Virtual Joystick</div>
                    <div className="text-[10px] text-stone-400">
                      When OFF, joystick disappears completely with zero touch-blocking.
                    </div>
                  </div>
                  <button
                    onClick={() => controlPreferences.toggleJoystick()}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      prefs.showJoystick ? 'bg-amber-600' : 'bg-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        prefs.showJoystick ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Action Buttons */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-stone-200">Show Action Combat Buttons</div>
                    <div className="text-[10px] text-stone-400">
                      Strike, Guard, Rally, and Stomp mobile buttons.
                    </div>
                  </div>
                  <button
                    onClick={() => controlPreferences.toggleActionButtons()}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      prefs.showActionButtons ? 'bg-amber-600' : 'bg-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        prefs.showActionButtons ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Clean Screen Mode Toggle */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-stone-200">Clean Screen Mode (F10)</div>
                    <div className="text-[10px] text-stone-400">
                      Hides joystick and non-essential HUD to maximize battlefield visibility.
                    </div>
                  </div>
                  <button
                    onClick={() => controlPreferences.toggleCleanScreen()}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      prefs.cleanScreenMode ? 'bg-amber-600' : 'bg-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        prefs.cleanScreenMode ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Compact Battle HUD */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-stone-200">Compact Battle HUD</div>
                    <div className="text-[10px] text-stone-400">
                      Scales down UI panels for smaller mobile viewports.
                    </div>
                  </div>
                  <button
                    onClick={() => controlPreferences.updatePreferences({ compactBattleHud: !prefs.compactBattleHud })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      prefs.compactBattleHud ? 'bg-amber-600' : 'bg-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        prefs.compactBattleHud ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sliders / Sizing Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Control Size */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
                  <label className="text-[11px] font-bold text-amber-300 uppercase">Control Size</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['small', 'medium', 'large'] as ControlSize[]).map(size => (
                      <button
                        key={size}
                        onClick={() => controlPreferences.setControlSize(size)}
                        className={`py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                          prefs.controlSize === size
                            ? 'bg-amber-600 text-stone-950 font-black'
                            : 'bg-stone-850 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Joystick Opacity */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-amber-300 uppercase">Joystick Opacity</span>
                    <span className="text-stone-400">{Math.round(prefs.joystickOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={prefs.joystickOpacity}
                    onChange={e => controlPreferences.setJoystickOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Button Opacity */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-amber-300 uppercase">Button Opacity</span>
                    <span className="text-stone-400">{Math.round(prefs.buttonOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={prefs.buttonOpacity}
                    onChange={e => controlPreferences.setButtonOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Reset Controls Button */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => controlPreferences.resetToDefaults()}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Default Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'KEYBOARD' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Authoritative Dynamic Shortcut System:</strong> Every shortcut is synchronized across the input pipeline. Click <strong>[Change]</strong> to remap a key. Duplicate keys are automatically intercepted and checked for conflicts.
                </div>
              </div>

              {/* Grouped Accordion Reference Table */}
              <div className="space-y-3">
                {categories.map(cat => {
                  const catBindings = bindings.filter(b => b.category === cat);
                  if (catBindings.length === 0) return null;
                  const isCollapsed = !!collapsedCategories[cat];

                  return (
                    <div key={cat} className="bg-stone-950/80 border border-stone-800 rounded-xl overflow-hidden">
                      {/* Accordion Category Header */}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full px-3.5 py-2.5 bg-stone-900/90 hover:bg-stone-850 flex items-center justify-between text-left transition-colors border-b border-stone-800"
                      >
                        <span className="font-extrabold text-amber-300 text-xs tracking-wide uppercase">
                          {categoryLabels[cat]} ({catBindings.length})
                        </span>
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        )}
                      </button>

                      {!isCollapsed && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-stone-950 text-[10px] text-stone-400 uppercase border-b border-stone-850 font-mono">
                                <th className="py-2 px-3 font-semibold">Action</th>
                                <th className="py-2 px-3 font-semibold">Primary</th>
                                <th className="py-2 px-3 font-semibold">Secondary</th>
                                <th className="py-2 px-3 font-semibold text-right">Customize</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-850 text-[11px]">
                              {catBindings.map(b => (
                                <tr key={b.action} className="hover:bg-stone-900/50 transition-colors">
                                  <td className="py-2 px-3 font-medium text-stone-200">
                                    {b.name}
                                    {b.isReservedMovement && (
                                      <span className="ml-1.5 text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800">
                                        Reserved
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono">
                                    <span className="px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-bold border border-stone-700">
                                      {b.primaryDisplay || '—'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-mono">
                                    <span className="px-2 py-0.5 rounded bg-stone-850 text-stone-400 border border-stone-750">
                                      {b.secondaryDisplay || '—'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() =>
                                          setRemappingAction({
                                            action: b.action,
                                            isSecondary: false,
                                            actionName: b.name,
                                          })
                                        }
                                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-[10px] transition-all"
                                      >
                                        Change Primary
                                      </button>
                                      <button
                                        onClick={() =>
                                          setRemappingAction({
                                            action: b.action,
                                            isSecondary: true,
                                            actionName: b.name,
                                          })
                                        }
                                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-bold text-[10px] transition-all"
                                      >
                                        Change Alt
                                      </button>
                                      <button
                                        onClick={() => shortcutManager.resetKey(b.action)}
                                        className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
                                        title="Reset to default"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reset All Keybindings */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => {
                    if (confirm('Reset all keyboard shortcuts to factory RTS defaults?')) {
                      shortcutManager.resetAllKeys();
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Bindings to Defaults
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remapping Capture Modal Backdrop */}
        {remappingAction && (
          <div className="absolute inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-amber-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 mx-auto text-xl animate-pulse">
                ⌨️
              </div>
              <h3 className="font-extrabold text-amber-300 text-sm uppercase">
                Assign Key for {remappingAction.actionName} ({remappingAction.isSecondary ? 'Secondary' : 'Primary'})
              </h3>
              <p className="text-xs text-stone-300">
                Press any key on your keyboard to bind. Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded font-mono">Esc</kbd> to cancel.
              </p>
              <button
                onClick={() => setRemappingAction(null)}
                className="w-full py-2 bg-stone-800 hover:bg-stone-700 rounded-xl font-bold text-xs text-stone-300"
              >
                Cancel Remapping
              </button>
            </div>
          </div>
        )}

        {/* Conflict Warning Dialog */}
        {pendingConflict && (
          <div className="absolute inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-red-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-2.5 text-red-400 font-extrabold text-sm uppercase border-b border-stone-800 pb-2">
                <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
                Key Conflict Detected
              </div>
              <p className="text-xs text-stone-200">
                Key <strong className="text-amber-300 font-mono">"{ShortcutManager.formatKeyDisplay(pendingConflict.key)}"</strong> is already assigned to:
              </p>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs font-mono text-amber-300">
                {pendingConflict.conflict.action1Name} ({pendingConflict.conflict.type1})
              </div>
              <p className="text-[11px] text-stone-400">
                Do you wish to replace the existing binding with this new action?
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmConflictReplace}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase shadow transition-all active:scale-95"
                >
                  Replace Existing
                </button>
                <button
                  onClick={() => setPendingConflict(null)}
                  className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
