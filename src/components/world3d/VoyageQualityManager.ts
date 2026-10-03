/**
 * Realm of Crowns - Voyage Quality & Performance Manager (Phase 2)
 * 
 * Provides four distinct quality tiers (LOW, MEDIUM, HIGH, ULTRA) calibrated for
 * mobile devices, laptops, and high-performance desktop rigs.
 * Includes conservative adaptive performance scaling that monitors sustained frame-times
 * over a multi-second evaluation window with cooldowns to prevent quality oscillation.
 */

export type VoyageQualityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface VoyageQualitySettings {
  tier: VoyageQualityTier;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowDistance: number;
  shadowBias: number;
  reflectionEnabled: boolean;
  reflectionUpdateInterval: number; // 1 = every frame, 2 = every 2nd frame, 4 = every 4th frame, 0 = disabled
  reflectionTextureSize: number;
  lodDistanceMultiplier: number; // 0.7 = closer transitions (mobile), 1.0 = standard, 1.3 = farther
  maxVisibleShips: number;
  particleLimit: number;
  wakeQuality: 'low' | 'medium' | 'high';
  riggingDetail: 'minimal' | 'medium' | 'full';
  pixelRatioCap: number;
}

export const QUALITY_PRESETS: Record<VoyageQualityTier, VoyageQualitySettings> = {
  LOW: {
    tier: 'LOW',
    shadowsEnabled: false,
    shadowMapSize: 512,
    shadowDistance: 50,
    shadowBias: -0.001,
    reflectionEnabled: false,
    reflectionUpdateInterval: 0,
    reflectionTextureSize: 256,
    lodDistanceMultiplier: 0.85,
    maxVisibleShips: 100,
    particleLimit: 35,
    wakeQuality: 'low',
    riggingDetail: 'minimal',
    pixelRatioCap: 1.0,
  },
  MEDIUM: {
    tier: 'MEDIUM',
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowDistance: 60,
    shadowBias: -0.0006,
    reflectionEnabled: true,
    reflectionUpdateInterval: 4, // 15 FPS reflection at 60 FPS gameplay
    reflectionTextureSize: 256,
    lodDistanceMultiplier: 0.85,
    maxVisibleShips: 120,
    particleLimit: 50,
    wakeQuality: 'medium',
    riggingDetail: 'medium',
    pixelRatioCap: 1.25,
  },
  HIGH: {
    tier: 'HIGH',
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowDistance: 80,
    shadowBias: -0.0005,
    reflectionEnabled: true,
    reflectionUpdateInterval: 2, // 30 FPS reflection at 60 FPS gameplay
    reflectionTextureSize: 512,
    lodDistanceMultiplier: 1.0,
    maxVisibleShips: 24,
    particleLimit: 90,
    wakeQuality: 'high',
    riggingDetail: 'full',
    pixelRatioCap: 2.0,
  },
  ULTRA: {
    tier: 'ULTRA',
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowDistance: 120,
    shadowBias: -0.0003,
    reflectionEnabled: true,
    reflectionUpdateInterval: 1, // Full 60 FPS reflection
    reflectionTextureSize: 512,
    lodDistanceMultiplier: 1.3,
    maxVisibleShips: 36,
    particleLimit: 140,
    wakeQuality: 'high',
    riggingDetail: 'full',
    pixelRatioCap: 2.0,
  },
};

export class VoyageQualityManager {
  private static detectInitialTier(): VoyageQualityTier {
    if (typeof navigator !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTouch = (typeof window !== 'undefined' && ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0));
      if (isMobile || isTouch) return 'LOW';
    }
    return 'HIGH';
  }

  private static currentTier: VoyageQualityTier = VoyageQualityManager.detectInitialTier();
  private static settings: VoyageQualitySettings = { ...QUALITY_PRESETS[VoyageQualityManager.currentTier] };
  private static adaptiveEnabled = false;

  // Adaptive Performance Monitoring State
  private static frameTimeSamples: number[] = [];
  private static lastAdaptiveCheck = 0;
  private static lastQualityChange = 0;
  private static readonly SAMPLE_WINDOW_SEC = 3.0; // 3-second evaluation window
  private static readonly COOLDOWN_SEC = 6.0; // 6-second cooldown between changes
  private static readonly TARGET_FRAME_TIME_MS = 28.0; // ~35 FPS floor threshold
  private static readonly RECOVERY_FRAME_TIME_MS = 17.5; // ~57 FPS recovery threshold

  private static listeners: Array<(settings: VoyageQualitySettings) => void> = [];

  public static getSettings(): VoyageQualitySettings {
    return this.settings;
  }

  public static getTier(): VoyageQualityTier {
    return this.currentTier;
  }

  public static setTier(tier: VoyageQualityTier) {
    this.currentTier = tier;
    this.settings = { ...QUALITY_PRESETS[tier] };
    this.notifyListeners();
  }

  public static setAdaptive(enabled: boolean) {
    this.adaptiveEnabled = enabled;
  }

  public static isAdaptive(): boolean {
    return this.adaptiveEnabled;
  }

  public static addListener(cb: (settings: VoyageQualitySettings) => void) {
    this.listeners.push(cb);
  }

  public static removeListener(cb: (settings: VoyageQualitySettings) => void) {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }

  private static notifyListeners() {
    this.listeners.forEach((cb) => cb(this.settings));
  }

  /**
   * Called every frame to feed frame duration.
   * Performs conservative hysteresis adjustment to prevent quality thrashing.
   */
  public static updateFrame(dt: number, currentTimeSec: number) {
    if (!this.adaptiveEnabled) return;

    const frameTimeMs = dt * 1000;
    this.frameTimeSamples.push(frameTimeMs);

    if (currentTimeSec - this.lastAdaptiveCheck < this.SAMPLE_WINDOW_SEC) {
      return;
    }

    this.lastAdaptiveCheck = currentTimeSec;

    if (this.frameTimeSamples.length < 15) {
      this.frameTimeSamples = [];
      return;
    }

    // Compute median frame time
    const sorted = [...this.frameTimeSamples].sort((a, b) => a - b);
    const medianMs = sorted[Math.floor(sorted.length / 2)];
    this.frameTimeSamples = [];

    // Honor cooldown
    if (currentTimeSec - this.lastQualityChange < this.COOLDOWN_SEC) {
      return;
    }

    // Step down quality if struggling under sustained load
    if (medianMs > this.TARGET_FRAME_TIME_MS) {
      if (this.currentTier === 'ULTRA') {
        this.setTier('HIGH');
        this.lastQualityChange = currentTimeSec;
      } else if (this.currentTier === 'HIGH') {
        this.setTier('MEDIUM');
        this.lastQualityChange = currentTimeSec;
      } else if (this.currentTier === 'MEDIUM') {
        this.setTier('LOW');
        this.lastQualityChange = currentTimeSec;
      }
    } else if (medianMs < this.RECOVERY_FRAME_TIME_MS) {
      // Step up quality if excess performance is consistently available
      if (this.currentTier === 'LOW') {
        this.setTier('MEDIUM');
        this.lastQualityChange = currentTimeSec;
      } else if (this.currentTier === 'MEDIUM') {
        this.setTier('HIGH');
        this.lastQualityChange = currentTimeSec;
      }
    }
  }
}
