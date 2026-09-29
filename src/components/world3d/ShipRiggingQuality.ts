/**
 * Realm of Crowns - Ship Rigging Quality & Multi-Tier Rope System (Phase 2)
 * 
 * Provides graduated rigging complexity to prevent hundreds of line/tube draw calls:
 * - LOD0 (Hero/Player): Full authentic 17th-century rigging (shrouds, ratlines, forestays, backstays, halyards).
 * - LOD1 (Near): Major silhouette stays only (1 stay per side, zero micro-ratline rungs).
 * - LOD2 (Fleet): Simplified structural stays only or culled based on quality tier.
 * - LOD3 (Horizon): Fully culled (0 rope draw calls).
 */

import * as THREE from 'three';

export type RiggingTier = 'hero' | 'near' | 'fleet' | 'horizon';

export class ShipRiggingQuality {
  /**
   * Generates Hero (LOD0) Standing & Running Rigging
   * Full authentic standing shrouds, ratlines, and fore/backstays.
   */
  public static createHeroRigging(
    mastsCount: number,
    halfBeam: number,
    hullHeight: number,
    mastStartZ: number,
    mastSpacing: number,
    length: number,
    ropeMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'rigging-hero';

    for (let m = 0; m < mastsCount; m++) {
      const mastZ = mastStartZ + m * mastSpacing;
      const mastHeight = length * (0.65 + (m === 1 ? 0.15 : 0));

      for (let side = -1; side <= 1; side += 2) {
        // Shroud main stay triangle
        const shroudPoints = [
          new THREE.Vector3(side * (halfBeam * 0.9), hullHeight * 0.8, mastZ - 1.5),
          new THREE.Vector3(side * 0.75, hullHeight + mastHeight * 0.64, mastZ),
          new THREE.Vector3(side * (halfBeam * 0.9), hullHeight * 0.8, mastZ + 1.5),
        ];
        const shroudGeo = new THREE.BufferGeometry().setFromPoints(shroudPoints);
        const shroudLine = new THREE.Line(shroudGeo, ropeMat);
        group.add(shroudLine);

        // Horizontal ratline rungs
        for (let r = 1; r <= 6; r++) {
          const frac = r / 7;
          const rx = THREE.MathUtils.lerp(side * (halfBeam * 0.9), side * 0.75, frac);
          const ry = THREE.MathUtils.lerp(hullHeight * 0.8, hullHeight + mastHeight * 0.64, frac);
          const rungGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(rx, ry, mastZ - 1.2 * (1 - frac)),
            new THREE.Vector3(rx, ry, mastZ + 1.2 * (1 - frac)),
          ]);
          const rung = new THREE.Line(rungGeo, ropeMat);
          group.add(rung);
        }
      }

      // Forestay (mast to bow / forward deck)
      const forePoints = [
        new THREE.Vector3(0, hullHeight + mastHeight * 0.75, mastZ),
        new THREE.Vector3(0, hullHeight * 0.85, mastZ + mastSpacing * 0.8 + 2.0),
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(forePoints), ropeMat));
    }

    return group;
  }

  /**
   * Generates Near (LOD1) Simplified Stays
   * Preserves large silhouette stays, culling all 36+ micro ratline rungs.
   */
  public static createNearRigging(
    mastsCount: number,
    halfBeam: number,
    hullHeight: number,
    mastStartZ: number,
    mastSpacing: number,
    length: number,
    ropeMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'rigging-near';

    for (let m = 0; m < mastsCount; m++) {
      const mastZ = mastStartZ + m * mastSpacing;
      const mastHeight = length * (0.65 + (m === 1 ? 0.15 : 0));

      for (let side = -1; side <= 1; side += 2) {
        // Just the single apex stay line per side
        const pts = [
          new THREE.Vector3(side * (halfBeam * 0.85), hullHeight * 0.8, mastZ),
          new THREE.Vector3(side * 0.6, hullHeight + mastHeight * 0.64, mastZ),
        ];
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
      }
    }

    return group;
  }
}
