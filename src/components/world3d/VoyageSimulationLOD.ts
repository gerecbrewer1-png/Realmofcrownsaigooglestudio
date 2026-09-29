/**
 * Realm of Crowns - Voyage Simulation LOD System (Phase 2.6)
 * 
 * Distinct from Visual/Graphical LOD:
 * Graphical LOD controls 3D geometry complexity (vertices, textures, draw calls).
 * Simulation LOD controls execution frequency and algorithmic depth of gameplay systems
 * (AI perception, steering, obstacle avoidance, raycasting, physics integration).
 * 
 * Tiers:
 * - SIM0: Immediate / Active Combat (< 140m): 60 Hz (every frame), full reactive AI & broadsides, full wave physics.
 * - SIM1: Nearby (140m – 350m): 30 Hz (every 2 frames, ~33ms), standard steering, reduced target scanning.
 * - SIM2: Regional (350m – 750m): 10 Hz (every 6 frames, ~100ms), coarse waypoint following, simplified collision.
 * - SIM3: Distant (750m – 1500m): 2 Hz (every 30 frames, ~500ms), dead-reckoning course interpolation, zero sensing.
 * - SIM4: Strategic World State (> 1500m / background MMO): 0.2 Hz (every 300 frames, ~5s), pure state, 0 render cost.
 */

export enum SimulationTier {
  SIM0_IMMEDIATE = 0,
  SIM1_NEARBY = 1,
  SIM2_REGIONAL = 2,
  SIM3_DISTANT = 3,
  SIM4_STRATEGIC = 4,
}

export interface SimLODSettings {
  tier: SimulationTier;
  updateIntervalFrames: number;
  updateIntervalMs: number;
  allowCombatSensing: boolean;
  allowBroadsideFiring: boolean;
  useDetailedWavePhysics: boolean;
  useDetailedSteering: boolean;
  allowRaycasting: boolean;
  renderEligible: boolean;
}

export const SIM_TIER_CONFIG: Record<SimulationTier, SimLODSettings> = {
  [SimulationTier.SIM0_IMMEDIATE]: {
    tier: SimulationTier.SIM0_IMMEDIATE,
    updateIntervalFrames: 1, // 60 Hz
    updateIntervalMs: 16.6,
    allowCombatSensing: true,
    allowBroadsideFiring: true,
    useDetailedWavePhysics: true,
    useDetailedSteering: true,
    allowRaycasting: true,
    renderEligible: true,
  },
  [SimulationTier.SIM1_NEARBY]: {
    tier: SimulationTier.SIM1_NEARBY,
    updateIntervalFrames: 2, // 30 Hz
    updateIntervalMs: 33.3,
    allowCombatSensing: true,
    allowBroadsideFiring: false, // Must enter SIM0 to engage broadside combat
    useDetailedWavePhysics: true,
    useDetailedSteering: true,
    allowRaycasting: false, // Use spatial grid pre-filtering instead
    renderEligible: true,
  },
  [SimulationTier.SIM2_REGIONAL]: {
    tier: SimulationTier.SIM2_REGIONAL,
    updateIntervalFrames: 6, // 10 Hz
    updateIntervalMs: 100,
    allowCombatSensing: false,
    allowBroadsideFiring: false,
    useDetailedWavePhysics: false, // Flat sea plane or amortized wave sampling
    useDetailedSteering: false, // Coarse waypoint navigation
    allowRaycasting: false,
    renderEligible: true,
  },
  [SimulationTier.SIM3_DISTANT]: {
    tier: SimulationTier.SIM3_DISTANT,
    updateIntervalFrames: 30, // 2 Hz
    updateIntervalMs: 500,
    allowCombatSensing: false,
    allowBroadsideFiring: false,
    useDetailedWavePhysics: false,
    useDetailedSteering: false,
    allowRaycasting: false,
    renderEligible: true, // Visible as distant silhouette / imposter (LOD3)
  },
  [SimulationTier.SIM4_STRATEGIC]: {
    tier: SimulationTier.SIM4_STRATEGIC,
    updateIntervalFrames: 180, // ~0.33 Hz (every 3 seconds)
    updateIntervalMs: 3000,
    allowCombatSensing: false,
    allowBroadsideFiring: false,
    useDetailedWavePhysics: false,
    useDetailedSteering: false,
    allowRaycasting: false,
    renderEligible: false, // Culled from 3D scene (0 draw calls, 0 Three.js geometry)
  },
};

export class VoyageSimulationLOD {
  // Distance thresholds (meters) with 20m hysteresis buffer
  public static readonly THRESHOLDS = {
    SIM0_TO_SIM1: 140,
    SIM1_TO_SIM0: 120, // Hysteresis entry
    SIM1_TO_SIM2: 350,
    SIM2_TO_SIM1: 330, // Hysteresis entry
    SIM2_TO_SIM3: 750,
    SIM3_TO_SIM2: 720, // Hysteresis entry
    SIM3_TO_SIM4: 1500,
    SIM4_TO_SIM3: 1450, // Hysteresis entry
  };

  /**
   * Evaluates the appropriate Simulation Tier for an entity relative to the player/camera.
   * Includes 20-30m hysteresis buffer to prevent rapid flipping at boundary distances.
   */
  public static evaluateTier(
    currentTier: SimulationTier,
    distToPlayer: number,
    isInActiveCombat = false,
    isHeroPlayer = false
  ): SimulationTier {
    // Player is always SIM0
    if (isHeroPlayer) return SimulationTier.SIM0_IMMEDIATE;

    // Active combat locks entity to SIM0 regardless of minor distance fluctuations
    if (isInActiveCombat && distToPlayer < 180) {
      return SimulationTier.SIM0_IMMEDIATE;
    }

    const T = this.THRESHOLDS;

    // Cascading distance bounds with hysteresis buffers relative to current tier:
    // SIM0: < 140m if already SIM0, < 120m to enter
    const sim0Threshold = currentTier === SimulationTier.SIM0_IMMEDIATE ? T.SIM0_TO_SIM1 : T.SIM1_TO_SIM0;
    if (distToPlayer < sim0Threshold) {
      return SimulationTier.SIM0_IMMEDIATE;
    }

    // SIM1: < 350m if already SIM1, < 330m to enter
    const sim1Threshold = currentTier === SimulationTier.SIM1_NEARBY ? T.SIM1_TO_SIM2 : T.SIM2_TO_SIM1;
    if (distToPlayer < sim1Threshold) {
      return SimulationTier.SIM1_NEARBY;
    }

    // SIM2: < 750m if already SIM2, < 720m to enter
    const sim2Threshold = currentTier === SimulationTier.SIM2_REGIONAL ? T.SIM2_TO_SIM3 : T.SIM3_TO_SIM2;
    if (distToPlayer < sim2Threshold) {
      return SimulationTier.SIM2_REGIONAL;
    }

    // SIM3: < 1500m if already SIM3, < 1450m to enter
    const sim3Threshold = currentTier === SimulationTier.SIM3_DISTANT ? T.SIM3_TO_SIM4 : T.SIM4_TO_SIM3;
    if (distToPlayer < sim3Threshold) {
      return SimulationTier.SIM3_DISTANT;
    }

    return SimulationTier.SIM4_STRATEGIC;
  }

  /**
   * Time-Slicing: determines whether an entity should run its AI/simulation on the current frame.
   * Uses entity hash to spread work evenly across frames, eliminating AI execution spikes.
   */
  public static shouldUpdateOnFrame(tier: SimulationTier, frameCount: number, entityIndex: number): boolean {
    const config = SIM_TIER_CONFIG[tier];
    if (config.updateIntervalFrames <= 1) return true; // SIM0 updates every frame

    // Hash entity index with frame counter to distribute work
    const stride = config.updateIntervalFrames;
    const offset = Math.abs(entityIndex) % stride;
    return (frameCount % stride) === offset;
  }
}
