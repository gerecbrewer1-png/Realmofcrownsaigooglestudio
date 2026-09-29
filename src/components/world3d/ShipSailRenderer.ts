/**
 * Realm of Crowns - Ship Sail Visual Renderer (Phase 2)
 * 
 * Decouples authoritative gameplay sailing physics from visual deformation:
 * 1. Gameplay State: Wind direction, wind speed, sail setting (0%, 50%, 100%), ship velocity, damage.
 * 2. Visual Deformation: Pre-calculated parametric billowing geometries and GPU-driven
 *    transformations that eliminate per-frame CPU vertex allocations and array allocations.
 * 3. LOD Scalability:
 *    - LOD0: Multi-harmonic billowing canvas with heraldic crests and corner clew lines.
 *    - LOD1: Single-curve curved canvas.
 *    - LOD2: Flat quadrilateral sail plane with baked curvature normal cues.
 *    - LOD3: Minimal low-poly sail silhouette.
 */

import * as THREE from 'three';

export interface SailVisualState {
  sailSetting: number;  // 0.0 (furled), 0.5 (battle sails), 1.0 (full sails)
  windFromDeg: number;
  shipHeadingDeg: number;
  windStrengthKnots: number;
  damagePct: number;    // 0 = pristine, 100 = shredded
}

export class ShipSailRenderer {
  /**
   * Builds parametric billowing square sail geometry with aerodynamic curvature.
   * Constructed once at asset creation time — zero per-frame CPU re-allocations.
   */
  public static createBillowingSailGeometry(
    width: number,
    height: number,
    billowDepth = 0.65,
    segmentsX = 8,
    segmentsY = 6
  ): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    const pos = geo.attributes.position;

    // Apply natural aerodynamic belly camber: max billow in the center, tapering to yardarms and corners
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / (width * 0.5)); // -1 to +1
      const v = (pos.getY(i) / (height * 0.5)); // -1 to +1

      const horizontalFactor = 1.0 - u * u;
      const verticalFactor = (1.0 - v) * 0.5 * (1.0 + Math.cos(v * Math.PI * 0.5) * 0.5);

      const zOffset = billowDepth * horizontalFactor * verticalFactor;
      pos.setZ(i, zOffset);
    }

    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Builds simplified LOD1/LOD2 sail geometry with reduced tessellation (saves triangles).
   */
  public static createSimplifiedSailGeometry(
    width: number,
    height: number,
    billowDepth = 0.4
  ): THREE.BufferGeometry {
    return this.createBillowingSailGeometry(width, height, billowDepth, 4, 3);
  }

  /**
   * Builds flat LOD3 sail geometry (minimal 2 triangles).
   */
  public static createHorizonSailGeometry(width: number, height: number): THREE.BufferGeometry {
    return new THREE.PlaneGeometry(width, height, 1, 1);
  }

  /**
   * Updates sail visual scale and subtle motion based on current sail setting.
   * Uses fast transform updates (no CPU vertex manipulation).
   */
  public static updateSailTransforms(
    sailsNode: THREE.Object3D,
    sailSetting: number,
    globalTime: number
  ) {
    if (!sailsNode) return;

    // Adjust visual height based on sail deployment
    const targetScaleY = sailSetting === 0 ? 0.12 : sailSetting === 0.5 ? 0.72 : 1.0;
    sailsNode.scale.y = THREE.MathUtils.lerp(sailsNode.scale.y || 1.0, targetScaleY, 0.08);

    // Subtle gentle canvas breathing (micro-flutter without per-vertex allocations)
    const flutter = Math.sin(globalTime * 3.5) * 0.015;
    sailsNode.rotation.y = flutter;
  }
}
