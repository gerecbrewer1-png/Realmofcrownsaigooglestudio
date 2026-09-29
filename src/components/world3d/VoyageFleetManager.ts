/**
 * Realm of Crowns - Large Fleet & Scalable Simulation Engine (Phase 2.6)
 * 
 * Supports fleets scaling from 1 to 250+ concurrent ships.
 * Integrates:
 * - Simulation LOD (SIM0 – SIM4)
 * - Deterministic time-sliced AI updates
 * - 2D Spatial Grid for O(1) proximity queries
 * - Separation of World Existence, Simulation, Network Relevance, and Visuals
 */

import * as THREE from 'three';
import { ShipSpec, SHIP_CATALOG } from './shipVisualService';
import { FactionId } from './SailHeraldryService';
import { SimulationTier, VoyageSimulationLOD } from './VoyageSimulationLOD';
import { VoyageSpatialGrid } from './VoyageSpatialGrid';
import { ShipLODController, ShipLODTier } from './ShipLODController';

export interface FleetEntity {
  id: string;
  name: string;
  spec: ShipSpec;
  faction: FactionId;
  isPirate: boolean;
  mesh?: THREE.Group;
  wake?: THREE.Mesh;
  hull: number;
  hullMax: number;
  sails: number;
  sailsMax: number;
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  turnSpeed: number;
  reloadTimer: number;
  isSinking: boolean;
  sinkTimer: number;
  simTier: SimulationTier;
  lodTier: ShipLODTier;
  inCombat: boolean;
  renderVisible: boolean;
  lastSimUpdateFrame: number;
}

export interface FleetDiagnostics {
  totalShips: number;
  activeShips: number;
  visibleShips: number;
  culledShips: number;
  simTiers: {
    sim0: number;
    sim1: number;
    sim2: number;
    sim3: number;
    sim4: number;
  };
  lodTiers: {
    lod0: number;
    lod1: number;
    lod2: number;
    lod3: number;
    culled: number;
  };
  pirateStats: {
    total: number;
    active: number;
    visible: number;
    culled: number;
    sim0: number;
  };
  aiUpdatesThisFrame: number;
  aiUpdatesPerSec: number;
  spatialGridEntities: number;
}

export class VoyageFleetManager {
  private entities: FleetEntity[] = [];
  private spatialGrid = new VoyageSpatialGrid(150);
  private frameCount = 0;
  private aiUpdatesThisFrame = 0;
  private aiUpdatesAccumulator = 0;
  private lastSecondTime = 0;
  private aiUpdatesPerSec = 0;

  constructor() {
    this.lastSecondTime = performance.now();
  }

  public registerEntity(entity: FleetEntity) {
    this.entities.push(entity);
    this.spatialGrid.updateEntity({
      id: entity.id,
      x: entity.pos.x,
      z: entity.pos.z,
      radius: entity.spec.length * 0.5,
      faction: entity.faction,
      isPirate: entity.isPirate,
    });
  }

  public getEntities(): FleetEntity[] {
    return this.entities;
  }

  public getSpatialGrid(): VoyageSpatialGrid {
    return this.spatialGrid;
  }

  /**
   * Updates Simulation LOD, spatial indexing, and AI time-slicing for all fleet vessels.
   */
  public updateFleetSimulation(
    dt: number,
    globalTime: number,
    playerPos: THREE.Vector3,
    cameraPos: THREE.Vector3,
    cameraFrustum: THREE.Frustum,
    isPlayerInTruce: boolean,
    caveSanctuaryPos: THREE.Vector3,
    getWaveHeight?: (x: number, z: number, t: number) => number,
    onEnemyFire?: (enemy: FleetEntity) => void
  ) {
    this.frameCount++;
    this.aiUpdatesThisFrame = 0;

    const now = performance.now();
    if (now - this.lastSecondTime >= 1000) {
      this.aiUpdatesPerSec = this.aiUpdatesAccumulator;
      this.aiUpdatesAccumulator = 0;
      this.lastSecondTime = now;
    }

    const _sphere = new THREE.Sphere();

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];

      // Ignore sinking / dead vessels
      if (e.isSinking) continue;

      const distToPlayer = e.pos.distanceTo(playerPos);
      const isCloseCombat = distToPlayer < 120 && !isPlayerInTruce && e.isPirate;

      // 1. Evaluate Simulation LOD Tier (with 20m hysteresis buffer)
      const prevSim = e.simTier;
      e.simTier = VoyageSimulationLOD.evaluateTier(e.simTier, distToPlayer, isCloseCombat, false);

      // 2. Time-Sliced AI decision check
      const shouldRunAI = VoyageSimulationLOD.shouldUpdateOnFrame(e.simTier, this.frameCount, i);

      if (shouldRunAI) {
        this.aiUpdatesThisFrame++;
        this.aiUpdatesAccumulator++;
        e.lastSimUpdateFrame = this.frameCount;

        // Execute AI logic based on simulation tier
        if (e.simTier === SimulationTier.SIM0_IMMEDIATE) {
          // Full reactive broadside AI & combat maneuvering
          if (distToPlayer < 140 && !isPlayerInTruce && e.isPirate) {
            const dx = playerPos.x - e.pos.x;
            const dz = playerPos.z - e.pos.z;
            const desiredHeading = Math.atan2(dx, dz) + (Math.PI * 0.5);
            const diff = THREE.MathUtils.euclideanModulo(desiredHeading - e.heading + Math.PI, Math.PI * 2) - Math.PI;
            e.heading += Math.sign(diff) * Math.min(Math.abs(diff), e.turnSpeed * dt * 2.0);

            e.reloadTimer -= dt;
            if (e.reloadTimer <= 0 && distToPlayer < 95 && onEnemyFire) {
              e.reloadTimer = 5.0 + (Math.abs(i * 1.3) % 3.0);
              onEnemyFire(e);
            }
          } else {
            e.heading += e.turnSpeed * 0.25 * dt;
          }
        } else if (e.simTier === SimulationTier.SIM1_NEARBY) {
          // Standard steering toward target / patrol course
          if (e.isPirate && distToPlayer < 280 && !isPlayerInTruce) {
            const dx = playerPos.x - e.pos.x;
            const dz = playerPos.z - e.pos.z;
            const desiredHeading = Math.atan2(dx, dz);
            const diff = THREE.MathUtils.euclideanModulo(desiredHeading - e.heading + Math.PI, Math.PI * 2) - Math.PI;
            e.heading += Math.sign(diff) * Math.min(Math.abs(diff), e.turnSpeed * dt);
          } else {
            e.heading += e.turnSpeed * 0.15 * dt;
          }
        } else if (e.simTier === SimulationTier.SIM2_REGIONAL) {
          // Coarse navigation
          e.heading += e.turnSpeed * 0.1 * dt;
        } else if (e.simTier === SimulationTier.SIM3_DISTANT) {
          // Minimal course variation
          e.heading += e.turnSpeed * 0.05 * dt;
        } else {
          // SIM4: Strategic dead-reckoning
          e.heading += 0;
        }
      }

      // 3. Movement integration (scaled appropriately by tier)
      if (e.simTier !== SimulationTier.SIM4_STRATEGIC) {
        e.pos.x += Math.sin(e.heading) * e.speed * dt;
        e.pos.z += Math.cos(e.heading) * e.speed * dt;
      } else {
        // Coarse strategic movement
        e.pos.x += Math.sin(e.heading) * e.speed * dt;
        e.pos.z += Math.cos(e.heading) * e.speed * dt;
      }

      // 4. Update Spatial Hash Grid (O(1))
      this.spatialGrid.updateEntity({
        id: e.id,
        x: e.pos.x,
        z: e.pos.z,
        radius: e.spec.length * 0.5,
        faction: e.faction,
        isPirate: e.isPirate,
      });

      // 5. Render Visibility & Graphical LOD (Decoupled from Simulation LOD)
      if (e.mesh) {
        if (e.simTier === SimulationTier.SIM4_STRATEGIC || distToPlayer > 1500) {
          // SIM4 entities are culled from 3D rendering to save 100% of GPU/Draw Calls
          e.mesh.visible = false;
          e.renderVisible = false;
          if (e.wake) e.wake.visible = false;
          e.lodTier = 3;
        } else {
          // Update 3D position with ocean wave motion
          const eWaveY = getWaveHeight ? getWaveHeight(e.pos.x, e.pos.z, globalTime) : 0;
          e.mesh.position.set(e.pos.x, eWaveY, e.pos.z);
          e.mesh.rotation.y = e.heading;

          // Frustum Culling test
          const boundRadius = (e.spec.length || 30) * 1.5;
          _sphere.center.set(e.pos.x, eWaveY + 12, e.pos.z);
          _sphere.radius = boundRadius;
          const inFrustum = cameraFrustum.intersectsSphere(_sphere);

          if (!inFrustum) {
            e.mesh.visible = false;
            e.renderVisible = false;
            if (e.wake) e.wake.visible = false;
          } else {
            e.mesh.visible = true;
            e.renderVisible = true;
            const distToCam = e.pos.distanceTo(cameraPos);
            if (e.wake) e.wake.visible = distToCam < 350;

            // Apply visual LOD
            e.lodTier = ShipLODController.updateShipLOD(
              e.mesh,
              distToCam,
              false,
              distToPlayer < 65 && !e.isSinking,
              distToPlayer,
              e.isPirate
            );
          }
        }
      }
    }
  }

  /**
   * Generates a comprehensive real-time diagnostic report across all Simulation & Visual tiers.
   */
  public getDiagnostics(activeVisualShips: number): FleetDiagnostics {
    let sim0 = 0, sim1 = 0, sim2 = 0, sim3 = 0, sim4 = 0;
    let lod0 = 0, lod1 = 0, lod2 = 0, lod3 = 0, culled = 0;
    let pirateTotal = 0, pirateActive = 0, pirateVisible = 0, pirateCulled = 0, pirateSim0 = 0;

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.simTier === SimulationTier.SIM0_IMMEDIATE) sim0++;
      else if (e.simTier === SimulationTier.SIM1_NEARBY) sim1++;
      else if (e.simTier === SimulationTier.SIM2_REGIONAL) sim2++;
      else if (e.simTier === SimulationTier.SIM3_DISTANT) sim3++;
      else sim4++;

      if (e.renderVisible) {
        if (e.lodTier === 0) lod0++;
        else if (e.lodTier === 1) lod1++;
        else if (e.lodTier === 2) lod2++;
        else lod3++;
      } else {
        culled++;
      }

      if (e.isPirate) {
        pirateTotal++;
        if (!e.isSinking) pirateActive++;
        if (e.renderVisible) pirateVisible++;
        else pirateCulled++;
        if (e.simTier === SimulationTier.SIM0_IMMEDIATE) pirateSim0++;
      }
    }

    return {
      totalShips: this.entities.length + 1, // +1 for player flagship
      activeShips: activeVisualShips,
      visibleShips: this.entities.filter(e => e.renderVisible).length + 1,
      culledShips: culled,
      simTiers: { sim0, sim1, sim2, sim3, sim4 },
      lodTiers: { lod0: lod0 + 1, lod1, lod2, lod3, culled }, // +1 LOD0 for Hero player
      pirateStats: {
        total: pirateTotal,
        active: pirateActive,
        visible: pirateVisible,
        culled: pirateCulled,
        sim0: pirateSim0,
      },
      aiUpdatesThisFrame: this.aiUpdatesThisFrame,
      aiUpdatesPerSec: this.aiUpdatesPerSec,
      spatialGridEntities: this.spatialGrid.getEntityCount(),
    };
  }

  public getEntityById(id: string): FleetEntity | undefined {
    return this.entities.find(e => e.id === id);
  }

  public clear() {
    this.entities = [];
    this.spatialGrid.clear();
  }
}
