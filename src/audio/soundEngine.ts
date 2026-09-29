/**
 * Realm of Crowns - Centralized Audio & Sound Synthesis Engine
 * Orchestrates procedural medieval soundtrack, layered environmental ambience, and responsive SFX.
 * Zero external audio files required — 100% original procedural synthesis via Web Audio API.
 */

import { AudioSettings, loadAudioSettings, saveAudioSettings } from './audioSettings';
import { ProceduralMusicEngine, MusicTrackId } from './proceduralMusic';
import { ProceduralAmbienceEngine, AmbienceType } from './proceduralAmbience';

type SettingsChangeListener = (settings: AudioSettings) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings;
  private listeners: Set<SettingsChangeListener> = new Set();

  // Primary Bus Gains
  private masterGain: GainNode | null = null;
  private musicBusGain: GainNode | null = null;
  private ambientBusGain: GainNode | null = null;
  private sfxBusGain: GainNode | null = null;
  private uiBusGain: GainNode | null = null;

  // Subsystem Engines
  private musicEngine: ProceduralMusicEngine | null = null;
  private ambienceEngine: ProceduralAmbienceEngine | null = null;

  // Throttling & Sound Spam Prevention
  private lastSoundTimes: Map<string, number> = new Map();
  private isUnlocked: boolean = false;

  constructor() {
    this.settings = loadAudioSettings();
    this.setupGestureUnlock();
  }

  /**
   * Browser Autoplay Compliance: Safely unlocks Web Audio on first user interaction
   */
  private setupGestureUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
          this.applyAllGains();
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }
      // Remove listeners once unlocked
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // 1. Master Output Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // 2. Sub-bus Gains
        this.musicBusGain = this.ctx.createGain();
        this.musicBusGain.connect(this.masterGain);

        this.ambientBusGain = this.ctx.createGain();
        this.ambientBusGain.connect(this.masterGain);

        this.sfxBusGain = this.ctx.createGain();
        this.sfxBusGain.connect(this.masterGain);

        this.uiBusGain = this.ctx.createGain();
        this.uiBusGain.connect(this.masterGain);

        // 3. Subsystem Engines
        this.musicEngine = new ProceduralMusicEngine(this.ctx, this.musicBusGain);
        this.ambienceEngine = new ProceduralAmbienceEngine(this.ctx, this.ambientBusGain);

        this.applyAllGains();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private applyAllGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Master
    if (this.masterGain) {
      const vol = this.settings.masterMuted ? 0 : this.settings.masterVolume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(vol, now);
    }

    // Music
    if (this.musicBusGain) {
      const vol = this.settings.musicMuted || this.settings.masterMuted ? 0 : this.settings.musicVolume;
      this.musicBusGain.gain.cancelScheduledValues(now);
      this.musicBusGain.gain.setValueAtTime(vol, now);
    }

    // Ambient
    if (this.ambientBusGain) {
      const vol = this.settings.ambientMuted || this.settings.masterMuted ? 0 : this.settings.ambientVolume;
      this.ambientBusGain.gain.cancelScheduledValues(now);
      this.ambientBusGain.gain.setValueAtTime(vol, now);
    }

    // SFX & UI
    if (this.sfxBusGain) {
      const vol = this.settings.sfxMuted || this.settings.masterMuted ? 0 : this.settings.sfxVolume;
      this.sfxBusGain.gain.cancelScheduledValues(now);
      this.sfxBusGain.gain.setValueAtTime(vol, now);
    }

    if (this.uiBusGain) {
      const vol = this.settings.sfxMuted || this.settings.masterMuted ? 0 : this.settings.sfxVolume * 0.9;
      this.uiBusGain.gain.cancelScheduledValues(now);
      this.uiBusGain.gain.setValueAtTime(vol, now);
    }
  }

  // ==========================================================================
  // SETTINGS & STATE
  // ==========================================================================

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...partial };
    saveAudioSettings(this.settings);
    this.applyAllGains();
    this.notifyListeners();
  }

  public onSettingsChange(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const s = this.getSettings();
    this.listeners.forEach((fn) => fn(s));
  }

  public isEnabled(): boolean {
    return !this.settings.masterMuted && this.settings.masterVolume > 0;
  }

  public toggleSound(): boolean {
    const newMuted = !this.settings.masterMuted;
    this.updateSettings({ masterMuted: newMuted });
    return !newMuted;
  }

  // ==========================================================================
  // SOUND THROTTLING (Anti-Spam)
  // ==========================================================================

  private canPlay(soundId: string, cooldownMs = 60): boolean {
    if (this.settings.masterMuted || this.settings.sfxMuted) return false;
    const now = Date.now();
    const last = this.lastSoundTimes.get(soundId) || 0;
    if (now - last < cooldownMs) return false;
    this.lastSoundTimes.set(soundId, now);
    return true;
  }

  // ==========================================================================
  // MUSIC CONTROLLER
  // ==========================================================================

  public playMusic(track: MusicTrackId, crossfadeSec = 2.0): void {
    this.initContext();
    if (!this.musicEngine) return;
    this.musicEngine.setTrack(track, crossfadeSec);
  }

  public stopMusic(): void {
    if (this.musicEngine) {
      this.musicEngine.stop();
    }
  }

  public getCurrentMusicTrack(): MusicTrackId {
    return this.musicEngine ? this.musicEngine.getTrack() : 'none';
  }

  // ==========================================================================
  // AMBIENT ATMOSPHERE CONTROLLER
  // ==========================================================================

  public setAmbience(env: AmbienceType, crossfadeSec = 1.5): void {
    this.initContext();
    if (!this.ambienceEngine) return;
    this.ambienceEngine.setEnvironment(env, crossfadeSec);
  }

  public stopAmbience(): void {
    if (this.ambienceEngine) {
      this.ambienceEngine.stop();
    }
  }

  public getCurrentAmbience(): AmbienceType {
    return this.ambienceEngine ? this.ambienceEngine.getEnvironment() : 'none';
  }

  // ==========================================================================
  // CORE UI SOUND EFFECTS
  // ==========================================================================

  /**
   * Soft parchment or crisp interface click
   */
  public playClick(): void {
    if (!this.canPlay('ui_click', 50)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.uiBusGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Important primary button confirmation (crisp gold ring)
   */
  public playPrimaryAction(): void {
    if (!this.canPlay('ui_primary', 80)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const notes = [659.25, 987.77]; // E5, B5
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.uiBusGain!);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  /**
   * Modal Open: Smooth ascending wooden whoosh
   */
  public playModalOpen(): void {
    if (!this.canPlay('modal_open', 150)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.uiBusGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Modal Close: Gentle descending whoosh
   */
  public playModalClose(): void {
    if (!this.canPlay('modal_close', 150)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.uiBusGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Tab switch / page turn
   */
  public playTabSwitch(): void {
    if (!this.canPlay('tab_switch', 80)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.uiBusGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Subtle error / blocked action thud
   */
  public playError(): void {
    if (!this.canPlay('ui_error', 120)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.uiBusGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // ==========================================================================
  // KINGDOM CITADEL & BUILDING AUDIO
  // ==========================================================================

  /**
   * Natural hammer striking timber and stone with pitch variation
   */
  public playHammer(): void {
    if (!this.canPlay('hammer', 100)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const pitchMod = 0.9 + Math.random() * 0.2; // Natural pitch variance

    // 1. Heavy thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 * pitchMod, now);
    osc.frequency.exponentialRampToValueAtTime(45 * pitchMod, now + 0.12);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // 2. High metal ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(880 * pitchMod, now + 0.02);
    ping.frequency.exponentialRampToValueAtTime(650 * pitchMod, now + 0.1);

    pingGain.gain.setValueAtTime(0.12, now + 0.02);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    ping.connect(pingGain);
    pingGain.connect(this.sfxBusGain);
    ping.start(now + 0.02);
    ping.stop(now + 0.2);
  }

  /**
   * Sound of construction initiation
   */
  public playConstructionStart(): void {
    if (!this.canPlay('construction_start', 200)) return;
    this.playHammer();
    setTimeout(() => this.playClick(), 120);
  }

  /**
   * Satisfying completion fanfare when building upgrade completes
   */
  public playBuildingUpgradeComplete(): void {
    this.playFanfare();
  }

  /**
   * Barracks troop recruitment & disciplined muster
   */
  public playBarracksTraining(): void {
    if (!this.canPlay('barracks_train', 200)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    // Military horn call
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(293.66, now + 0.15);
    osc.frequency.linearRampToValueAtTime(440, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /**
   * Academy research completion / arcane chime
   */
  public playAcademyResearch(): void {
    this.playChime();
  }

  /**
   * Sparkling chime for gems / boosts / magical completions
   */
  public playChime(): void {
    if (!this.canPlay('chime', 100)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const freqs = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6
    freqs.forEach((f, i) => {
      const t = now + i * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * Royal brass fanfare for level-up, quest completion, major accomplishments
   */
  public playFanfare(): void {
    if (!this.canPlay('fanfare', 300)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const chord = [
      { f: 261.63, time: 0, dur: 0.14 },
      { f: 392.0, time: 0.14, dur: 0.14 },
      { f: 523.25, time: 0.28, dur: 0.18 },
      { f: 659.25, time: 0.46, dur: 0.2 },
      { f: 783.99, time: 0.66, dur: 0.6 },
    ];

    chord.forEach((item) => {
      const t = now + item.time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + item.dur + 0.05);
    });
  }


  public playMarch(): void {
    this.playMarchHorn();
  }

  // ==========================================================================
  // RESOURCE HARVEST & FEEDBACK (Grouped to prevent volume explosions)
  // ==========================================================================

  /**
   * Clinking gold coins
   */
  public playCoins(): void {
    if (!this.canPlay('coins', 100)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  /**
   * Grouped resource collection: Satisfying consolidated feedback
   */
  public playResourceGroupCollect(): void {
    if (!this.canPlay('resource_group', 250)) return;
    this.playCoins();
  }

  public playGoldCollect(): void {
    this.playCoins();
  }

  public playFoodCollect(): void {
    this.playCoins();
  }

  public playWoodCollect(): void {
    this.playHammer();
  }

  public playStoneCollect(): void {
    this.playHammer();
  }

  public playIronCollect(): void {
    this.playCoins();
  }

  // ==========================================================================
  // WORLD MAP INTERACTION & MARCHES
  // ==========================================================================

  /**
   * Selecting a territory / kingdom on the world map
   */
  public playTerritorySelect(): void {
    if (!this.canPlay('territory_select', 80)) return;
    this.playClick();
  }

  /**
   * Selecting a resource node
   */
  public playResourceNodeSelect(): void {
    if (!this.canPlay('resource_node_select', 80)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Selecting a barbarian war camp (low danger brass accent)
   */
  public playCampSelect(): void {
    if (!this.canPlay('camp_select', 100)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(82, now + 0.22);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * Deep war horn blown when a military march departs
   */
  public playMarchHorn(): void {
    if (!this.canPlay('march_horn', 300)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.35);
    osc1.frequency.exponentialRampToValueAtTime(196, now + 0.85);

    osc2.frequency.setValueAtTime(162, now);
    osc2.frequency.exponentialRampToValueAtTime(222, now + 0.35);
    osc2.frequency.exponentialRampToValueAtTime(198, now + 0.85);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxBusGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.05);
    osc2.stop(now + 1.05);
  }

  public playHorn(): void {
    this.playMarchHorn();
  }

  public playMarchDispatch(): void {
    this.playMarchHorn();
  }

  /**
   * March arrives at destination / reaches resource
   */
  public playMarchArrival(): void {
    if (!this.canPlay('march_arrival', 250)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  /**
   * Subtle harvest / axe strike & resource rustle when troops work a node
   */
  public playMarchHarvest(): void {
    if (!this.canPlay('march_harvest', 500)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    // Wood / stone strike
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.12);

    // Subtle glint sparkle
    setTimeout(() => {
      if (!this.ctx || !this.sfxBusGain) return;
      const t = this.ctx.currentTime;
      const glintOsc = this.ctx.createOscillator();
      const glintGain = this.ctx.createGain();
      glintOsc.type = 'sine';
      glintOsc.frequency.setValueAtTime(987.77, t); // B5
      glintGain.gain.setValueAtTime(0.08, t);
      glintGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      glintOsc.connect(glintGain);
      glintGain.connect(this.sfxBusGain);
      glintOsc.start(t);
      glintOsc.stop(t + 0.2);
    }, 90);
  }

  /**
   * Triumphant return cue when an army marches back into the citadel gates
   */
  public playMarchReturn(): void {
    if (!this.canPlay('march_return', 300)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const notes = [329.63, 392.0, 493.88, 659.25]; // E4, G4, B4, E5
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  /**
   * Wind whoosh & chime when dispatching scouts
   */
  public playScoutChime(): void {
    if (!this.canPlay('scout_chime', 200)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const notes = [659.25, 880, 1046.5]; // E5, A5, C6
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  // ==========================================================================
  // COMBAT & BATTLE ACTION SOUNDS
  // ==========================================================================

  /**
   * Battle start cue: Urgent drums & war clash
   */
  public playBattleStart(): void {
    if (!this.canPlay('battle_start', 300)) return;
    this.playMarchHorn();
    setTimeout(() => this.playBattleClash(), 150);
  }

  /**
   * Swords & shields clashing in combat
   */
  public playBattleClash(): void {
    if (!this.canPlay('battle_clash', 90)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    [0, 0.07, 0.16].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(520 + idx * 80, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.11);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  /**
   * Melee sword / axe swing impact
   */
  public playMeleeAttack(): void {
    this.playBattleClash();
  }

  /**
   * Ranged bow release / projectile flight
   */
  public playRangedAttack(): void {
    if (!this.canPlay('ranged_attack', 90)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Heavy shield block
   */
  public playShieldBlock(): void {
    if (!this.canPlay('shield_block', 90)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.14);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Critical strike with ringing metallic resonance
   */
  public playCriticalHit(): void {
    if (!this.canPlay('critical_hit', 120)) return;
    this.playBattleClash();
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Troop loss / casualties taken
   */
  public playTroopLoss(): void {
    if (!this.canPlay('troop_loss', 120)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Decisive Battle Victory fanfare
   */
  public playBattleVictory(): void {
    this.playFanfare();
  }

  /**
   * Somber defeat cue
   */
  public playBattleDefeat(): void {
    if (!this.canPlay('battle_defeat', 300)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const chord = [
      { f: 220, time: 0, dur: 0.25 },
      { f: 196, time: 0.25, dur: 0.3 },
      { f: 174.61, time: 0.55, dur: 0.4 },
      { f: 146.83, time: 0.95, dur: 0.8 },
    ];

    chord.forEach((item) => {
      const t = now + item.time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(t);
      osc.stop(t + item.dur + 0.05);
    });
  }

  /**
   * Loot & spoils reward collection
   */
  public playLootReward(): void {
    this.playCoins();
    setTimeout(() => this.playChime(), 150);
  }

  /**
   * Naval Cannon Fire: deep explosive boom with resonant low rumble & noise burst
   */
  public playCannonFire(): void {
    if (!this.canPlay('cannon_fire', 80)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;

    // 1. Low frequency explosive punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.6);

    // 2. White noise explosive crackle
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.3);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxBusGain);
    noiseSource.start(now);
  }

  /**
   * Cannonball Hull Impact: heavy wood splinter crack and impact thud
   */
  public playCannonHit(): void {
    if (!this.canPlay('cannon_hit', 70)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;

    // Heavy thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.32);

    // Splinter noise burst
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxBusGain);
    noiseSource.start(now);
  }

  /**
   * Ocean Splash: Cannonball splashing into water or waves crashing on bow
   */
  public playOceanSplash(): void {
    if (!this.canPlay('ocean_splash', 100)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.45;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBusGain);
    noiseSource.start(now);
  }

  /**
   * Ship Timber Creak: Straining wooden timbers under wind swell
   */
  public playShipCreak(): void {
    if (!this.canPlay('ship_creak', 800)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.15);
    osc.frequency.linearRampToValueAtTime(75, now + 0.35);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  /**
   * Cutlass Clash: Metallic blade parry and strike during boarding combat
   */
  public playCutlassClash(): void {
    if (!this.canPlay('cutlass_clash', 150)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.2);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(950, now);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxBusGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.22);
    osc2.stop(now + 0.22);
  }

  /**
   * Water Splash: Cannonball plunging into ocean waves
   */
  public playWaterSplash(): void {
    if (!this.canPlay('water_splash', 100)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.3);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBusGain);

    noise.start(now);
    noise.stop(now + 0.32);
  }

  /**
   * Flintlock Pistol Fire: Sharp crack for boarding skirmishes
   */
  public playPistolFire(): void {
    if (!this.canPlay('pistol_fire', 120)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxBusGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Ship Bell: Resonant brass bell tolling on harbor arrival
   */
  public playShipBell(): void {
    if (!this.canPlay('ship_bell', 800)) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBusGain) return;

    const now = ctx.currentTime;
    [1046.5, 2093.0, 3135.9].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.15 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxBusGain!);
      osc.start(now);
      osc.stop(now + 1.25);
    });
  }

  /**
   * Gold Chime: Ascending metallic chime cascade for plunder and trading
   */
  public playGoldChime(): void {
    if (!this.canPlay('gold_chime', 200)) return;
    const ctx = this.initContext();
    if (!ctx || !this.uiBusGain) return;

    const now = ctx.currentTime;
    const notes = [987.77, 1318.51, 1975.53]; // B5, E6, B6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.uiBusGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.42);
    });
  }

  // Active Naval Audio Elements
  private activeNavalAudio: HTMLAudioElement | null = null;
  private currentNavalTrackId: string | null = null;

  /**
   * Play high-seas soundtrack and ambient ocean tracks
   * Uses real naval audio recordings (shanty, waves, battle, tavern, colonies)
   */
  public playNavalTrack(
    track:
      | 'shanty'
      | 'waves'
      | 'battle'
      | 'town_pirates'
      | 'town_england'
      | 'town_france'
      | 'town_holland'
      | 'town_spain'
      | 'theme'
  ): void {
    if (typeof window === 'undefined') return;
    if (this.currentNavalTrackId === track && this.activeNavalAudio && !this.activeNavalAudio.paused) {
      return;
    }

    this.stopNavalTrack();

    try {
      const audio = new Audio(`/assets/audio/naval/${track}.wav`);
      audio.loop = true;
      const vol =
        this.settings.masterVolume *
        (track === 'waves' ? this.settings.ambientVolume * 0.4 : this.settings.musicVolume * 0.5);
      audio.volume = Math.max(0, Math.min(1, vol));

      audio
        .play()
        .then(() => {
          this.activeNavalAudio = audio;
          this.currentNavalTrackId = track;
        })
        .catch((err) => {
          console.warn('Naval audio autoplay waiting for user interaction:', err);
        });
    } catch (e) {
      console.warn('Naval audio playback error:', e);
    }
  }

  /**
   * Stop active naval music or ambience
   */
  public stopNavalTrack(): void {
    if (this.activeNavalAudio) {
      try {
        this.activeNavalAudio.pause();
        this.activeNavalAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.activeNavalAudio = null;
      this.currentNavalTrackId = null;
    }
  }
}

export const soundEngine = new SoundEngine();
export const AudioService = soundEngine; // Convenient alias
