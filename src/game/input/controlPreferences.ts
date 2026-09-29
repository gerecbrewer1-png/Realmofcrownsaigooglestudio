/**
 * REALM OF CROWNS — Control Preferences Manager
 * Centralized persistent player settings for adaptive touch / joystick / keyboard controls.
 */

import { ControlMode, ControlPreferences, ControlSize } from './inputTypes';

const STORAGE_KEY = 'realm_of_crowns_control_preferences';

export const DEFAULT_CONTROL_PREFERENCES: ControlPreferences = {
  controlMode: 'AUTO',
  showJoystick: true,
  showActionButtons: true,
  showControlHints: true,
  buttonOpacity: 0.9,
  joystickOpacity: 0.85,
  compactControls: false,
  controlSize: 'medium',
  cleanScreenMode: false,
  compactBattleHud: false,
};

export class ControlPreferencesManager {
  private static instance: ControlPreferencesManager | null = null;
  private preferences: ControlPreferences;
  private listeners: Set<(prefs: ControlPreferences) => void> = new Set();

  private constructor() {
    this.preferences = this.loadPreferences();
  }

  public static getInstance(): ControlPreferencesManager {
    if (!ControlPreferencesManager.instance) {
      ControlPreferencesManager.instance = new ControlPreferencesManager();
    }
    return ControlPreferencesManager.instance;
  }

  private loadPreferences(): ControlPreferences {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_CONTROL_PREFERENCES };
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONTROL_PREFERENCES };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONTROL_PREFERENCES,
        ...parsed,
      };
    } catch (e) {
      console.warn('Failed to load control preferences from localStorage', e);
      return { ...DEFAULT_CONTROL_PREFERENCES };
    }
  }

  public savePreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
      }
    } catch (e) {
      console.warn('Failed to save control preferences to localStorage', e);
    }
  }

  public getPreferences(): ControlPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(partial: Partial<ControlPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...partial,
    };
    this.savePreferences();
    this.notifyListeners();
  }

  public resetToDefaults(): void {
    this.preferences = { ...DEFAULT_CONTROL_PREFERENCES };
    this.savePreferences();
    this.notifyListeners();
  }

  public toggleCleanScreen(): boolean {
    const next = !this.preferences.cleanScreenMode;
    this.updatePreferences({ cleanScreenMode: next });
    return next;
  }

  public toggleJoystick(): boolean {
    const next = !this.preferences.showJoystick;
    this.updatePreferences({ showJoystick: next });
    return next;
  }

  public toggleActionButtons(): boolean {
    const next = !this.preferences.showActionButtons;
    this.updatePreferences({ showActionButtons: next });
    return next;
  }

  public setControlMode(mode: ControlMode): void {
    this.updatePreferences({ controlMode: mode });
  }

  public setButtonOpacity(opacity: number): void {
    const clamped = Math.max(0.1, Math.min(1.0, opacity));
    this.updatePreferences({ buttonOpacity: clamped });
  }

  public setJoystickOpacity(opacity: number): void {
    const clamped = Math.max(0.1, Math.min(1.0, opacity));
    this.updatePreferences({ joystickOpacity: clamped });
  }

  public setControlSize(size: ControlSize): void {
    this.updatePreferences({ controlSize: size });
  }

  /**
   * Evaluates the effective active mode when set to 'AUTO'.
   * On mobile/touch devices: prefers JOYSTICK/touch.
   * On desktop/browser: prefers KEYBOARD.
   */
  public getEffectiveControlMode(): 'JOYSTICK' | 'KEYBOARD' | 'BOTH' {
    if (this.preferences.controlMode !== 'AUTO') {
      return this.preferences.controlMode;
    }
    const hasTouch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
    );
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
    return (hasTouch || isSmallScreen) ? 'BOTH' : 'KEYBOARD';
  }

  /**
   * Returns whether the virtual joystick should be rendered on screen.
   * When false or in cleanScreenMode, joystick is completely absent and leaves no blocking element.
   */
  public shouldRenderJoystick(): boolean {
    if (this.preferences.cleanScreenMode) return false;
    if (!this.preferences.showJoystick) return false;
    const mode = this.getEffectiveControlMode();
    return mode === 'JOYSTICK' || mode === 'BOTH';
  }

  /**
   * Returns whether action buttons should be rendered.
   */
  public shouldRenderActionButtons(): boolean {
    if (this.preferences.cleanScreenMode) return false;
    return this.preferences.showActionButtons;
  }

  public subscribe(listener: (prefs: ControlPreferences) => void): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.getPreferences());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const current = this.getPreferences();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in ControlPreferences listener', err);
      }
    }
  }
}

export const controlPreferences = ControlPreferencesManager.getInstance();
