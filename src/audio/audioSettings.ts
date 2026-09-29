/**
 * Realm of Crowns - Audio Configuration & Persistence
 * Supports independent volume levels and mute states for Master, Music, Ambient, and SFX.
 */

export interface AudioSettings {
  masterVolume: number; // 0.0 to 1.0
  masterMuted: boolean;
  musicVolume: number;  // 0.0 to 1.0
  musicMuted: boolean;
  ambientVolume: number;// 0.0 to 1.0
  ambientMuted: boolean;
  sfxVolume: number;    // 0.0 to 1.0
  sfxMuted: boolean;
}

const STORAGE_KEY = 'realm_of_crowns_audio_settings_v2';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.85,
  masterMuted: false,
  musicVolume: 0.85,
  musicMuted: false,
  ambientVolume: 0.40,
  ambientMuted: false,
  sfxVolume: 0.75,
  sfxMuted: false,
};

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      masterVolume: typeof parsed.masterVolume === 'number' ? Math.max(0, Math.min(1, parsed.masterVolume)) : DEFAULT_AUDIO_SETTINGS.masterVolume,
      masterMuted: Boolean(parsed.masterMuted),
      // Ensure music is not suppressed by stale low defaults
      musicVolume: typeof parsed.musicVolume === 'number' ? Math.max(0.6, Math.min(1, parsed.musicVolume)) : DEFAULT_AUDIO_SETTINGS.musicVolume,
      musicMuted: Boolean(parsed.musicMuted),
      ambientVolume: typeof parsed.ambientVolume === 'number' ? Math.max(0, Math.min(0.6, parsed.ambientVolume)) : DEFAULT_AUDIO_SETTINGS.ambientVolume,
      ambientMuted: Boolean(parsed.ambientMuted),
      sfxVolume: typeof parsed.sfxVolume === 'number' ? Math.max(0, Math.min(1, parsed.sfxVolume)) : DEFAULT_AUDIO_SETTINGS.sfxVolume,
      sfxMuted: Boolean(parsed.sfxMuted),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[AudioSettings] Failed to save settings to localStorage:', err);
  }
}
