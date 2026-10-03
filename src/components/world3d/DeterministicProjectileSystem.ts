/**
 * Realm of Crowns — Deterministic Analytical Projectile System (Phase 2.9 / Wall 3 Solution)
 * 
 * Replaces expensive per-frame Euler raycasts and heap allocations for 300-800 concurrent cannonballs with:
 * 1. Flat Float32Array typed buffer (zero garbage collection).
 * 2. Purely analytical trajectory math (x(t), y(t), z(t)) with zero numerical drift.
 * 3. Exact impact time calculation: hit detection checked ONLY at t_impact (0ms physics during flight).
 * 4. Batched THREE.InstancedMesh rendering (all cannonballs render in 1 single GPU draw call).
 */

import * as THREE from 'three';

export interface FireCannonParams {
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  fireTimestampSec: number;
  damage: number;
  fromPlayer: boolean;
  sourceEntityId?: string;
  targetEntityId?: string;
  targetPos?: THREE.Vector3;
  ammoType?: string;
}

export interface ProjectileImpactEvent {
  projectileIndex: number;
  impactPos: THREE.Vector3;
  isHit: boolean;
  targetEntityId?: string;
  damage: number;
  fromPlayer: boolean;
  ammoType?: string;
}

export class DeterministicProjectileSystem {
  public static readonly MAX_PROJECTILES = 1024;
  private static readonly STRIDE = 12;
  private static readonly GRAVITY = 9.8; // m/s^2

  // Flat Float32Array: 1024 * 12 floats = 49 KB buffer in L1/L2 cache
  // Stride layout:
  // 0: originX, 1: originY, 2: originZ
  // 3: velX,    4: velY,    5: velZ
  // 6: fireTimeSec, 7: impactTimeSec
  // 8: targetX, 9: targetZ
  // 10: damage, 11: flags (bit 0: active, bit 1: fromPlayer)
  private buffer: Float32Array;
  private targetEntityIds: (string | null)[];
  private sourceEntityIds: (string | null)[];
  private ammoTypes: (string | null)[];
  private freeIndices: number[] = [];
  private activeCount = 0;

  // Single GPU InstancedMesh for all cannonballs (1 draw call!)
  public instancedMesh: THREE.InstancedMesh;
  private static dummyMatrix = new THREE.Matrix4();
  private static dummyPosition = new THREE.Vector3();
  private static dummyQuaternion = new THREE.Quaternion();
  private static dummyScale = new THREE.Vector3(1, 1, 1);
  private static hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  // Scratch vector for impact dispatch
  private scratchImpactPos = new THREE.Vector3();

  constructor() {
    this.buffer = new Float32Array(DeterministicProjectileSystem.MAX_PROJECTILES * DeterministicProjectileSystem.STRIDE);
    this.targetEntityIds = new Array(DeterministicProjectileSystem.MAX_PROJECTILES).fill(null);
    this.sourceEntityIds = new Array(DeterministicProjectileSystem.MAX_PROJECTILES).fill(null);
    this.ammoTypes = new Array(DeterministicProjectileSystem.MAX_PROJECTILES).fill(null);

    // Initialize free stack
    for (let i = DeterministicProjectileSystem.MAX_PROJECTILES - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    // Initialize shared InstancedMesh for visual rendering
    const geo = new THREE.SphereGeometry(0.24, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.35,
      metalness: 0.9,
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, DeterministicProjectileSystem.MAX_PROJECTILES);
    this.instancedMesh.name = 'instanced-cannonballs';
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = false;

    for (let i = 0; i < DeterministicProjectileSystem.MAX_PROJECTILES; i++) {
      this.instancedMesh.setMatrixAt(i, DeterministicProjectileSystem.hiddenMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.count = 0;
  }

  /**
   * Fires a cannonball with an analytically computed ballistic arc.
   */
  public fire(params: FireCannonParams): number {
    if (this.freeIndices.length === 0) {
      return -1; // buffer full
    }

    const idx = this.freeIndices.pop()!;
    const offset = idx * DeterministicProjectileSystem.STRIDE;

    const ox = params.origin.x;
    const oy = Math.max(0.5, params.origin.y);
    const oz = params.origin.z;

    const vx = params.velocity.x;
    const vy = params.velocity.y;
    const vz = params.velocity.z;

    // Calculate analytical time of flight to water surface (y = 0):
    // y(t) = y0 + vy*t - 0.5*g*t^2 = 0
    // Solving quadratic formula: t = (vy + sqrt(vy^2 + 2*g*y0)) / g
    const g = DeterministicProjectileSystem.GRAVITY;
    const discriminant = vy * vy + 2 * g * oy;
    const tFlight = (vy + Math.sqrt(Math.max(0, discriminant))) / g;
    const impactTimeSec = params.fireTimestampSec + Math.max(0.3, tFlight);

    // Store in flat typed buffer
    this.buffer[offset + 0] = ox;
    this.buffer[offset + 1] = oy;
    this.buffer[offset + 2] = oz;

    this.buffer[offset + 3] = vx;
    this.buffer[offset + 4] = vy;
    this.buffer[offset + 5] = vz;

    this.buffer[offset + 6] = params.fireTimestampSec;
    this.buffer[offset + 7] = impactTimeSec;

    this.buffer[offset + 8] = params.targetPos ? params.targetPos.x : ox + vx * tFlight;
    this.buffer[offset + 9] = params.targetPos ? params.targetPos.z : oz + vz * tFlight;

    this.buffer[offset + 10] = params.damage;

    let flags = 1; // bit 0 = active
    if (params.fromPlayer) flags |= 2; // bit 1 = fromPlayer
    this.buffer[offset + 11] = flags;

    this.targetEntityIds[idx] = params.targetEntityId || null;
    this.sourceEntityIds[idx] = params.sourceEntityId || null;
    this.ammoTypes[idx] = params.ammoType || 'balls';

    this.activeCount++;
    return idx;
  }

  /**
   * Updates analytical projectile positions and checks impacts solely at t_impact.
   * Zero per-frame raycasting!
   */
  public update(
    currentTimeSec: number,
    onImpact?: (event: ProjectileImpactEvent) => void
  ): void {
    const g = DeterministicProjectileSystem.GRAVITY;
    let renderedCount = 0;

    for (let i = 0; i < DeterministicProjectileSystem.MAX_PROJECTILES; i++) {
      const offset = i * DeterministicProjectileSystem.STRIDE;
      const flags = this.buffer[offset + 11];
      if ((flags & 1) === 0) continue; // inactive

      const fireTime = this.buffer[offset + 6];
      const impactTime = this.buffer[offset + 7];
      const dt = currentTimeSec - fireTime;

      if (currentTimeSec >= impactTime || dt < 0) {
        // Projectile reached destination / water level! Resolve impact.
        const ox = this.buffer[offset + 0];
        const oz = this.buffer[offset + 2];
        const vx = this.buffer[offset + 3];
        const vz = this.buffer[offset + 5];
        const totalDt = impactTime - fireTime;

        this.scratchImpactPos.set(
          ox + vx * totalDt,
          0,
          oz + vz * totalDt
        );

        const fromPlayer = (flags & 2) !== 0;
        const damage = this.buffer[offset + 10];
        const targetEntityId = this.targetEntityIds[i] || undefined;

        if (onImpact) {
          onImpact({
            projectileIndex: i,
            impactPos: this.scratchImpactPos,
            isHit: targetEntityId !== undefined,
            targetEntityId,
            damage,
            fromPlayer,
            ammoType: this.ammoTypes[i] || 'balls',
          });
        }

        // Deactivate and recycle slot
        this.buffer[offset + 11] = 0;
        this.targetEntityIds[i] = null;
        this.sourceEntityIds[i] = null;
        this.ammoTypes[i] = null;
        this.freeIndices.push(i);
        this.activeCount--;

        // Hide instance in GPU buffer
        this.instancedMesh.setMatrixAt(i, DeterministicProjectileSystem.hiddenMatrix);
        continue;
      }

      // In flight: purely analytical position assignment
      const ox = this.buffer[offset + 0];
      const oy = this.buffer[offset + 1];
      const oz = this.buffer[offset + 2];

      const vx = this.buffer[offset + 3];
      const vy = this.buffer[offset + 4];
      const vz = this.buffer[offset + 5];

      const curX = ox + vx * dt;
      const curY = Math.max(0, oy + vy * dt - 0.5 * g * dt * dt);
      const curZ = oz + vz * dt;

      DeterministicProjectileSystem.dummyPosition.set(curX, curY, curZ);
      DeterministicProjectileSystem.dummyMatrix.compose(
        DeterministicProjectileSystem.dummyPosition,
        DeterministicProjectileSystem.dummyQuaternion,
        DeterministicProjectileSystem.dummyScale
      );

      this.instancedMesh.setMatrixAt(i, DeterministicProjectileSystem.dummyMatrix);
      renderedCount++;
    }

    this.instancedMesh.count = DeterministicProjectileSystem.MAX_PROJECTILES;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
  }
}
