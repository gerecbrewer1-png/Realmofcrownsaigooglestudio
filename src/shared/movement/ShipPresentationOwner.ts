/**
 * REALM OF CROWNS — Single Authoritative Transform Presentation Owner
 * Phase 18 Production Movement Architecture
 * 
 * HARD REQUIREMENT:
 * Exactly ONE system is responsible for applying the player ship transform
 * to the Three.js rendering layer.
 * 
 * Competing writers (network callbacks, camera code, input callbacks, physics steps)
 * must NEVER write directly to playerMesh.position or playerMesh.rotation.
 */

import * as THREE from 'three';
import { ShipRenderState } from './ShipMovementTypes';

export class ShipPresentationOwner {
  private latestRenderState: ShipRenderState | null = null;

  /**
   * Applies the render state to the Three.js ship visual mesh and wake effect.
   * 
   * @param shipMesh The Three.js Object3D/Group representing the ship
   * @param wakeMesh Optional wake effect mesh
   * @param state Validated presentation render state
   */
  public applyRenderState(
    shipMesh: THREE.Object3D,
    wakeMesh: THREE.Object3D | null,
    state: ShipRenderState
  ): void {
    if (!shipMesh) return;

    // 1. Guard against non-finite values
    const safeX = Number.isFinite(state.x) ? state.x : shipMesh.position.x;
    const safeY = Number.isFinite(state.y) ? state.y : shipMesh.position.y;
    const safeZ = Number.isFinite(state.z) ? state.z : shipMesh.position.z;

    const safePitch = Number.isFinite(state.pitch) ? state.pitch : shipMesh.rotation.x;
    const safeHeading = Number.isFinite(state.heading) ? state.heading : shipMesh.rotation.y;
    const safeRoll = Number.isFinite(state.roll) ? state.roll : shipMesh.rotation.z;

    // 2. The ONLY place writing to playerMesh position & rotation
    shipMesh.position.set(safeX, safeY, safeZ);
    shipMesh.rotation.set(safePitch, safeHeading, safeRoll);

    // 3. Update wake visuals
    if (wakeMesh) {
      const safeWakeScale = Number.isFinite(state.wakeScale) ? state.wakeScale : 1.0;
      wakeMesh.scale.set(1.0, safeWakeScale, 1.0);
      wakeMesh.visible = Boolean(state.wakeVisible);
    }

    // 4. Cache state for camera and external consumers
    this.latestRenderState = { ...state, x: safeX, y: safeY, z: safeZ, pitch: safePitch, heading: safeHeading, roll: safeRoll };
  }

  /**
   * Returns the current rendered transform state for camera consumption.
   */
  public getLatestRenderState(): ShipRenderState | null {
    return this.latestRenderState;
  }
}
