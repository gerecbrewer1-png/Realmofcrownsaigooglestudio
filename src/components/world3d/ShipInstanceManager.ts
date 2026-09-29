/**
 * Realm of Crowns - Ship & Haven GPU Instancing Manager (Phase 2)
 * 
 * Manages shared Three.js InstancedMesh buffers for repeated decorative and combat geometry:
 * 1. Ship Deck Props: Cargo barrels, rum crates, deck lanterns.
 * 2. Naval Armament: Cannons and gun carriages across fleet vessels.
 * 3. Haven Waterfront: Wharves, market crates, and dock barrels.
 * 
 * Reduces hundreds of individual draw calls into batched GPU instanced draws.
 */

import * as THREE from 'three';

export interface InstancedItemTransform {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

export class ShipInstanceManager {
  // Shared Geometries
  private static barrelGeo: THREE.CylinderGeometry | null = null;
  private static crateGeo: THREE.BoxGeometry | null = null;
  private static lanternGeo: THREE.CylinderGeometry | null = null;
  private static cannonGeo: THREE.CylinderGeometry | null = null;

  // Shared Materials
  private static barrelMat: THREE.MeshStandardMaterial | null = null;
  private static crateMat: THREE.MeshStandardMaterial | null = null;
  private static lanternMat: THREE.MeshStandardMaterial | null = null;
  private static cannonMat: THREE.MeshStandardMaterial | null = null;

  private static dummyMatrix = new THREE.Matrix4();
  private static dummyPosition = new THREE.Vector3();
  private static dummyRotation = new THREE.Quaternion();
  private static dummyScale = new THREE.Vector3(1, 1, 1);

  public static init() {
    if (!this.barrelGeo) {
      this.barrelGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.1, 8);
      this.barrelGeo.computeVertexNormals();

      this.crateGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);

      this.lanternGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.6, 6);

      this.cannonGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6);
      this.cannonGeo.rotateZ(Math.PI * 0.5);

      this.barrelMat = new THREE.MeshStandardMaterial({
        color: 0x54371b,
        roughness: 0.82,
        metalness: 0.1,
      });

      this.crateMat = new THREE.MeshStandardMaterial({
        color: 0x785331,
        roughness: 0.88,
        metalness: 0.05,
      });

      this.lanternMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.35,
        metalness: 0.8,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 0.4,
      });

      this.cannonMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.45,
        metalness: 0.85,
      });
    }
  }

  /**
   * Creates an InstancedMesh for a collection of barrels.
   * Collapses N barrel draw calls into 1 single GPU draw call.
   */
  public static createInstancedBarrels(transforms: InstancedItemTransform[]): THREE.InstancedMesh {
    this.init();
    const count = transforms.length;
    const mesh = new THREE.InstancedMesh(this.barrelGeo!, this.barrelMat!, Math.max(1, count));
    mesh.name = 'instanced-barrels';

    transforms.forEach((t, i) => {
      this.dummyPosition.copy(t.position);
      if (t.rotation) {
        this.dummyRotation.setFromEuler(t.rotation);
      } else {
        this.dummyRotation.identity();
      }
      this.dummyScale.copy(t.scale || new THREE.Vector3(1, 1, 1));

      this.dummyMatrix.compose(this.dummyPosition, this.dummyRotation, this.dummyScale);
      mesh.setMatrixAt(i, this.dummyMatrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false; // Phase 2: exclude small props from dynamic shadows
    mesh.receiveShadow = false;
    return mesh;
  }

  /**
   * Creates an InstancedMesh for a collection of crates.
   */
  public static createInstancedCrates(transforms: InstancedItemTransform[]): THREE.InstancedMesh {
    this.init();
    const count = transforms.length;
    const mesh = new THREE.InstancedMesh(this.crateGeo!, this.crateMat!, Math.max(1, count));
    mesh.name = 'instanced-crates';

    transforms.forEach((t, i) => {
      this.dummyPosition.copy(t.position);
      if (t.rotation) {
        this.dummyRotation.setFromEuler(t.rotation);
      } else {
        this.dummyRotation.identity();
      }
      this.dummyScale.copy(t.scale || new THREE.Vector3(1, 1, 1));

      this.dummyMatrix.compose(this.dummyPosition, this.dummyRotation, this.dummyScale);
      mesh.setMatrixAt(i, this.dummyMatrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  /**
   * Creates an InstancedMesh for ship broadside cannons.
   * Replaces 32+ separate individual cannon meshes on a ship with 1 single InstancedMesh!
   */
  public static createInstancedCannons(transforms: InstancedItemTransform[]): THREE.InstancedMesh {
    this.init();
    const count = transforms.length;
    const mesh = new THREE.InstancedMesh(this.cannonGeo!, this.cannonMat!, Math.max(1, count));
    mesh.name = 'instanced-cannons';

    transforms.forEach((t, i) => {
      this.dummyPosition.copy(t.position);
      if (t.rotation) {
        this.dummyRotation.setFromEuler(t.rotation);
      } else {
        this.dummyRotation.identity();
      }
      this.dummyScale.copy(t.scale || new THREE.Vector3(1, 1, 1));

      this.dummyMatrix.compose(this.dummyPosition, this.dummyRotation, this.dummyScale);
      mesh.setMatrixAt(i, this.dummyMatrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }
}
