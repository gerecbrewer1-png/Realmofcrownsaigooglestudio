/**
 * Realm of Crowns — Fleet GPU Instancer (Phase 2.9 / Wall 2 Mobile GPU Draw Call Solution)
 * 
 * Replaces hundreds of individual fleet ship draw calls with batched THREE.InstancedMesh calls.
 * 150 ships across 3 hull archetypes (Small, Medium, Large) are rendered in only 3 to 6 draw calls,
 * protecting mobile GPUs from draw call and alpha overdraw budget exhaustion.
 */

import * as THREE from 'three';
import { ShipSpec } from './shipVisualService';

export type HullArchetype = 'small' | 'medium' | 'large';

export interface FleetInstanceEntry {
  archetype: HullArchetype;
  position: THREE.Vector3;
  heading: number;
  pitch?: number;
  roll?: number;
  scale?: number;
  visible: boolean;
}

export class FleetGPUInstancer {
  private static readonly MAX_INSTANCES_PER_ARCHETYPE = 150;

  // Root group added to the Three.js scene
  public group: THREE.Group;

  // Instanced Meshes for Hulls (3 draw calls total)
  private hullInstancedMeshes: Map<HullArchetype, THREE.InstancedMesh> = new Map();

  // Instanced Meshes for Masts & Sails (3 draw calls total)
  private sailInstancedMeshes: Map<HullArchetype, THREE.InstancedMesh> = new Map();

  // Active instance counters for this frame
  private activeCounts: Record<HullArchetype, number> = {
    small: 0,
    medium: 0,
    large: 0,
  };

  private static dummyMatrix = new THREE.Matrix4();
  private static dummyPosition = new THREE.Vector3();
  private static dummyRotation = new THREE.Euler();
  private static dummyQuaternion = new THREE.Quaternion();
  private static dummyScale = new THREE.Vector3();

  // Hidden off-screen matrix for unused instances
  private static hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'fleet-gpu-instancer';
    this.group.visible = false; // Disabled to prevent duplicate untextured ghost boxes in the scene
    this.initGeometriesAndMaterials();
  }

  /**
   * Maps a ShipSpec to one of the 3 canonical hull archetypes.
   */
  public static getArchetype(spec: ShipSpec): HullArchetype {
    if (spec.length < 18 || spec.cannons <= 8) {
      return 'small';
    } else if (spec.length < 32 || spec.cannons <= 24) {
      return 'medium';
    } else {
      return 'large';
    }
  }

  private initGeometriesAndMaterials(): void {
    const maxCount = FleetGPUInstancer.MAX_INSTANCES_PER_ARCHETYPE;

    // --- MATERIALS (Shared across instances) ---
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x47301c,
      roughness: 0.85,
      metalness: 0.1,
    });

    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf5eee1,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // --- ARCHETYPE 0: SMALL (Sloop / Tartane) ---
    {
      const hullGeo = new THREE.BoxGeometry(4.2, 2.4, 15.0);
      hullGeo.computeVertexNormals();
      const hullMesh = new THREE.InstancedMesh(hullGeo, hullMat, maxCount);
      hullMesh.name = 'instanced-hull-small';
      hullMesh.castShadow = false;
      hullMesh.receiveShadow = false;
      this.hullInstancedMeshes.set('small', hullMesh);
      this.group.add(hullMesh);

      // Mast & Sail combined geometry
      const mastGeo = new THREE.CylinderGeometry(0.2, 0.25, 12, 6);
      mastGeo.translate(0, 7.0, 1.0);
      const sailGeo = new THREE.PlaneGeometry(6.5, 9.0);
      sailGeo.translate(0, 7.5, 1.2);
      
      // Combine mast & sail or use sail plane
      const combinedGeo = sailGeo; // Plane sail
      const sailMesh = new THREE.InstancedMesh(combinedGeo, sailMat, maxCount);
      sailMesh.name = 'instanced-sail-small';
      sailMesh.castShadow = false;
      sailMesh.receiveShadow = false;
      this.sailInstancedMeshes.set('small', sailMesh);
      this.group.add(sailMesh);
    }

    // --- ARCHETYPE 1: MEDIUM (Brig / Frigate) ---
    {
      const hullGeo = new THREE.BoxGeometry(6.0, 3.2, 26.0);
      hullGeo.computeVertexNormals();
      const hullMesh = new THREE.InstancedMesh(hullGeo, hullMat, maxCount);
      hullMesh.name = 'instanced-hull-medium';
      hullMesh.castShadow = false;
      hullMesh.receiveShadow = false;
      this.hullInstancedMeshes.set('medium', hullMesh);
      this.group.add(hullMesh);

      const sailGeo = new THREE.PlaneGeometry(9.0, 13.0);
      sailGeo.translate(0, 9.5, 0);
      const sailMesh = new THREE.InstancedMesh(sailGeo, sailMat, maxCount);
      sailMesh.name = 'instanced-sail-medium';
      sailMesh.castShadow = false;
      sailMesh.receiveShadow = false;
      this.sailInstancedMeshes.set('medium', sailMesh);
      this.group.add(sailMesh);
    }

    // --- ARCHETYPE 2: LARGE (Galleon / War Junk / Galleass) ---
    {
      const hullGeo = new THREE.BoxGeometry(8.5, 4.8, 38.0);
      hullGeo.computeVertexNormals();
      const hullMesh = new THREE.InstancedMesh(hullGeo, hullMat, maxCount);
      hullMesh.name = 'instanced-hull-large';
      hullMesh.castShadow = false;
      hullMesh.receiveShadow = false;
      this.hullInstancedMeshes.set('large', hullMesh);
      this.group.add(hullMesh);

      const sailGeo = new THREE.PlaneGeometry(13.0, 18.0);
      sailGeo.translate(0, 12.0, 0);
      const sailMesh = new THREE.InstancedMesh(sailGeo, sailMat, maxCount);
      sailMesh.name = 'instanced-sail-large';
      sailMesh.castShadow = false;
      sailMesh.receiveShadow = false;
      this.sailInstancedMeshes.set('large', sailMesh);
      this.group.add(sailMesh);
    }

    // Initialize all matrices to hidden
    this.resetAll();
  }

  /**
   * Resets active instance counters at the beginning of each frame.
   */
  public beginFrame(): void {
    this.activeCounts.small = 0;
    this.activeCounts.medium = 0;
    this.activeCounts.large = 0;
  }

  /**
   * Allocates an instanced slot and writes transform for an instanced fleet vessel.
   */
  public addShipInstance(
    archetype: HullArchetype,
    x: number,
    y: number,
    z: number,
    heading: number,
    pitch = 0,
    roll = 0,
    scale = 1.0
  ): boolean {
    const idx = this.activeCounts[archetype];
    if (idx >= FleetGPUInstancer.MAX_INSTANCES_PER_ARCHETYPE) {
      return false; // budget cap reached
    }

    const hullMesh = this.hullInstancedMeshes.get(archetype);
    const sailMesh = this.sailInstancedMeshes.get(archetype);
    if (!hullMesh || !sailMesh) return false;

    // Compose transform matrix
    FleetGPUInstancer.dummyPosition.set(x, y + 1.2, z);
    FleetGPUInstancer.dummyRotation.set(pitch, heading, roll, 'YXZ');
    FleetGPUInstancer.dummyQuaternion.setFromEuler(FleetGPUInstancer.dummyRotation);
    FleetGPUInstancer.dummyScale.set(scale, scale, scale);

    FleetGPUInstancer.dummyMatrix.compose(
      FleetGPUInstancer.dummyPosition,
      FleetGPUInstancer.dummyQuaternion,
      FleetGPUInstancer.dummyScale
    );

    hullMesh.setMatrixAt(idx, FleetGPUInstancer.dummyMatrix);
    sailMesh.setMatrixAt(idx, FleetGPUInstancer.dummyMatrix);

    this.activeCounts[archetype]++;
    return true;
  }

  /**
   * Flushes instance matrix buffers to GPU at end of frame.
   * Collapses unused instance slots so they don't render.
   */
  public endFrame(): void {
    const archetypes: HullArchetype[] = ['small', 'medium', 'large'];

    for (const arch of archetypes) {
      const activeCount = this.activeCounts[arch];
      const hullMesh = this.hullInstancedMeshes.get(arch);
      const sailMesh = this.sailInstancedMeshes.get(arch);
      if (!hullMesh || !sailMesh) continue;

      // Hide remaining unused slots
      for (let i = activeCount; i < FleetGPUInstancer.MAX_INSTANCES_PER_ARCHETYPE; i++) {
        hullMesh.setMatrixAt(i, FleetGPUInstancer.hiddenMatrix);
        sailMesh.setMatrixAt(i, FleetGPUInstancer.hiddenMatrix);
      }

      hullMesh.count = activeCount;
      sailMesh.count = activeCount;
      hullMesh.instanceMatrix.needsUpdate = true;
      sailMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private resetAll(): void {
    const archetypes: HullArchetype[] = ['small', 'medium', 'large'];
    for (const arch of archetypes) {
      const hullMesh = this.hullInstancedMeshes.get(arch);
      const sailMesh = this.sailInstancedMeshes.get(arch);
      if (!hullMesh || !sailMesh) continue;

      for (let i = 0; i < FleetGPUInstancer.MAX_INSTANCES_PER_ARCHETYPE; i++) {
        hullMesh.setMatrixAt(i, FleetGPUInstancer.hiddenMatrix);
        sailMesh.setMatrixAt(i, FleetGPUInstancer.hiddenMatrix);
      }
      hullMesh.count = 0;
      sailMesh.count = 0;
      hullMesh.instanceMatrix.needsUpdate = true;
      sailMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getDrawCallCount(): number {
    let calls = 0;
    for (const count of Object.values(this.activeCounts)) {
      if (count > 0) calls += 2; // 1 hull + 1 sail
    }
    return calls;
  }

  public getActiveCount(): number {
    return this.activeCounts.small + this.activeCounts.medium + this.activeCounts.large;
  }

  public getActiveInstanceCount(archetype: HullArchetype): number {
    return this.activeCounts[archetype] || 0;
  }

  public dispose(): void {
    for (const mesh of this.hullInstancedMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const mesh of this.sailInstancedMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.hullInstancedMeshes.clear();
    this.sailInstancedMeshes.clear();
  }
}
