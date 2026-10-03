/**
 * Realm of Crowns - Hierarchical Ship LOD Controller (Phase 2)
 * 
 * Implements a 4-tier visual hierarchy with 15m hysteresis:
 * - LOD0 (Hero / Player / Boarding): Full PBR, deck props, authentic rigging, brass cannons, shadows.
 * - LOD1 (Near 60–160m): Major hull & masts, sails, simplified stays, batched cannons, no micro-props.
 * - LOD2 (Fleet 160–350m): Silhouette hull, masts, major sails, basic wake, zero rigging, zero cannons, zero shadows.
 * - LOD3 (Horizon >350m): Minimal wedge hull, mast sticks, flat sail, flag. Culled > 750m.
 * 
 * Controls independent sub-group quality: Hull, Deck, Rig, Sails, Armament, Props, Interior, Effects.
 */

import * as THREE from 'three';
import { VoyageQualityManager } from './VoyageQualityManager';
import { VoyageDebugManager } from './VoyageDebugManager';

export type ShipLODTier = 0 | 1 | 2 | 3;

export interface ShipHierarchyGroups {
  hull?: THREE.Object3D;
  deck?: THREE.Object3D;
  rig?: THREE.Object3D;
  sails?: THREE.Object3D;
  armament?: THREE.Object3D;
  props?: THREE.Object3D;
  interior?: THREE.Object3D;
  effects?: THREE.Object3D;
}

export class ShipLODController {
  /**
   * Evaluates and updates the hierarchical LOD of a ship group.
   * Uses generous distance thresholds relative to the player/camera so enemies in combat
   * are rendered in full Hero LOD0 quality (authentic rigging, brass cannons, ratlines, flags).
   */
  public static updateShipLOD(
    shipGroup: THREE.Group,
    distToCamera: number,
    isHeroPlayer = false,
    isBoardingTarget = false,
    distToPlayer?: number,
    isPirate = false
  ): ShipLODTier {
    const ud = shipGroup.userData;
    if (!ud || !ud.lodLevels) return 0;

    // Check debug overrides
    const debugSwitches = VoyageDebugManager.getSwitches();
    if (!debugSwitches.shipLODEnabled || (debugSwitches.forceLOD0OnAllPirates && isPirate)) {
      const lod0 = ud.lodLevels ? ud.lodLevels[0] : null;
      if (ud.currentLOD !== 0 || !shipGroup.visible || (lod0 && !lod0.visible)) {
        this.applyLOD(shipGroup, 0, isHeroPlayer);
      }
      return 0;
    }

    // Hero player ship is ALWAYS locked to LOD0 (100% full visual fidelity)
    if (isHeroPlayer) {
      const lod0 = ud.lodLevels ? ud.lodLevels[0] : null;
      if (ud.currentLOD !== 0 || !shipGroup.visible || (lod0 && !lod0.visible)) {
        this.applyLOD(shipGroup, 0, true);
      }
      return 0;
    }

    // Boarding targets maintain full Hero LOD0 quality
    if (isBoardingTarget) {
      if (ud.currentLOD !== 0) {
        this.applyLOD(shipGroup, 0, false);
      }
      return 0;
    }

    const currentLOD: ShipLODTier = ud.currentLOD ?? 0;
    let targetLOD: ShipLODTier = currentLOD;

    // Evaluate distance: prefer distance to player ship if provided, since 3rd person camera is 88m away
    const effectiveDist = distToPlayer !== undefined ? distToPlayer : Math.max(0, distToCamera - 50);

    // Scale thresholds based on mobile quality tier
    const mult = VoyageQualityManager.getSettings().lodDistanceMultiplier;
    // Fleet & Mobile Optimization (Wall 2):
    // Combat (< 40m): Hero / Full LOD0
    // Mid fleet (40m - 75m): LOD1
    // Outer fleet (75m - 100m): LOD2
    // Distant (> 100m): Swaps directly to low-poly billboard / impostor LOD3
    const t0to1 = 40 * mult;
    const t1to0 = 35 * mult;
    const t1to2 = 75 * mult;
    const t2to1 = 65 * mult;
    const t2to3 = 100 * mult;
    const t3to2 = 90 * mult;

    if (currentLOD === 0) {
      if (effectiveDist > t2to3) targetLOD = 3;
      else if (effectiveDist > t1to2) targetLOD = 2;
      else if (effectiveDist > t0to1) targetLOD = 1;
    } else if (currentLOD === 1) {
      if (effectiveDist < t1to0) targetLOD = 0;
      else if (effectiveDist > t2to3) targetLOD = 3;
      else if (effectiveDist > t1to2) targetLOD = 2;
    } else if (currentLOD === 2) {
      if (effectiveDist < t1to0) targetLOD = 0;
      else if (effectiveDist < t2to1) targetLOD = 1;
      else if (effectiveDist > t2to3) targetLOD = 3;
    } else if (currentLOD === 3) {
      if (effectiveDist < t1to0) targetLOD = 0;
      else if (effectiveDist < t2to1) targetLOD = 1;
      else if (effectiveDist < t3to2) targetLOD = 2;
    }

    if (targetLOD !== currentLOD) {
      this.applyLOD(shipGroup, targetLOD, false);
    }

    return targetLOD;
  }

  /**
   * Applies the target LOD tier and configures shadow rules and sub-group visibility.
   */
  private static applyLOD(shipGroup: THREE.Group, targetLOD: ShipLODTier, isHero: boolean) {
    shipGroup.visible = true;
    const ud = shipGroup.userData;
    ud.currentLOD = targetLOD;

    const lods: THREE.Group[] = ud.lodLevels || [];
    for (let i = 0; i < lods.length; i++) {
      if (lods[i] && lods[i] !== shipGroup) {
        lods[i].visible = (i === targetLOD);
      }
    }
    shipGroup.visible = true;

    const activeLOD = lods[targetLOD];
    if (activeLOD?.userData?.flagNode) {
      ud.flagNode = activeLOD.userData.flagNode;
    }
    if (activeLOD?.userData?.pennantNode) {
      ud.pennantNode = activeLOD.userData.pennantNode;
    }

    // Shadow rules per LOD tier:
    // LOD0: Full shadows on hull, masts, sails.
    // LOD1: Major hull only if within 45m.
    // LOD2 & LOD3: Dynamic shadows completely disabled.
    const shouldCastShadow = isHero || targetLOD === 0;
    shipGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = shouldCastShadow;
      }
    });

    // Interior culling: Remote ship interiors are never rendered
    if (ud.interiorNode) {
      ud.interiorNode.visible = isHero && targetLOD === 0;
    }
  }
}
