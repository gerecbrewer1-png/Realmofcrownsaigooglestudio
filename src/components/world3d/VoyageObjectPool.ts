/**
 * Realm of Crowns - Voyage Object Pool & Zero-Allocation Math Buffers (Phase 2.6)
 * 
 * Eliminates garbage collection pressure and per-frame heap allocations during
 * naval broadside battles and water splash effects.
 */

import * as THREE from 'three';

export interface PooledCannonball {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  fromPlayer: boolean;
  damage: number;
  ammoType: 'balls' | 'knippels' | 'grapeshot' | 'bombs';
  active: boolean;
}

export interface PooledParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleGrowth: number;
  active: boolean;
}

export class VoyageObjectPool {
  private static ballPool: PooledCannonball[] = [];
  private static particlePool: PooledParticle[] = [];

  private static ballGeo: THREE.SphereGeometry | null = null;
  private static ballMat: THREE.MeshBasicMaterial | null = null;
  private static particleGeo: THREE.SphereGeometry | null = null;
  private static smokeMat: THREE.MeshBasicMaterial | null = null;

  // Reusable scratch vectors for math without heap allocations
  public static readonly scratchVec1 = new THREE.Vector3();
  public static readonly scratchVec2 = new THREE.Vector3();
  public static readonly scratchVec3 = new THREE.Vector3();

  public static initialize(scene: THREE.Scene, initialBalls = 30, initialParticles = 50) {
    if (!this.ballGeo) {
      this.ballGeo = new THREE.SphereGeometry(0.45, 8, 8);
      this.ballMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
      this.particleGeo = new THREE.SphereGeometry(0.6, 6, 6);
      this.smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.65 });
    }

    // Re-add existing pool objects to the new scene
    this.ballPool.forEach(b => {
      b.active = false;
      b.mesh.visible = false;
      scene.add(b.mesh);
    });
    this.particlePool.forEach(p => {
      p.active = false;
      p.mesh.visible = false;
      scene.add(p.mesh);
    });

    // Determine how many new ones to create
    const ballsToCreate = Math.max(0, initialBalls - this.ballPool.length);
    const particlesToCreate = Math.max(0, initialParticles - this.particlePool.length);

    // Pre-populate cannonballs
    for (let i = 0; i < ballsToCreate; i++) {
      const mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
      mesh.visible = false;
      scene.add(mesh);
      this.ballPool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 2.8,
        fromPlayer: false,
        damage: 40,
        ammoType: 'balls',
        active: false,
      });
    }

    // Pre-populate particles
    for (let i = 0; i < particlesToCreate; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, this.smokeMat.clone());
      mesh.visible = false;
      scene.add(mesh);
      this.particlePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.6,
        scaleGrowth: 1.5,
        active: false,
      });
    }
  }

  public static acquireCannonball(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    fromPlayer: boolean,
    damage: number,
    ammoType: 'balls' | 'knippels' | 'grapeshot' | 'bombs' = 'balls',
    maxLife = 2.8
  ): PooledCannonball | null {
    let item = this.ballPool.find(b => !b.active);
    if (!item) {
      // Expand pool gracefully if needed
      if (!this.ballGeo || !this.ballMat) return null;
      const mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
      item = {
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife,
        fromPlayer,
        damage,
        ammoType,
        active: false,
      };
      this.ballPool.push(item);
    }

    item.active = true;
    item.life = 0;
    item.maxLife = maxLife;
    item.fromPlayer = fromPlayer;
    item.damage = damage;
    item.ammoType = ammoType;
    item.velocity.copy(vel);
    item.mesh.position.copy(pos);
    item.mesh.visible = true;
    return item;
  }

  public static releaseCannonball(ball: PooledCannonball) {
    ball.active = false;
    ball.mesh.visible = false;
  }

  public static acquireParticle(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    maxLife = 0.6,
    scaleGrowth = 1.5
  ): PooledParticle | null {
    let item = this.particlePool.find(p => !p.active);
    if (!item) {
      if (!this.particleGeo || !this.smokeMat) return null;
      const mesh = new THREE.Mesh(this.particleGeo, this.smokeMat.clone());
      item = {
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife,
        scaleGrowth,
        active: false,
      };
      this.particlePool.push(item);
    }

    item.active = true;
    item.life = 0;
    item.maxLife = maxLife;
    item.scaleGrowth = scaleGrowth;
    item.velocity.copy(vel);
    item.mesh.position.copy(pos);
    item.mesh.scale.set(1, 1, 1);
    item.mesh.visible = true;
    return item;
  }

  public static releaseParticle(particle: PooledParticle) {
    particle.active = false;
    particle.mesh.visible = false;
  }

  public static getActiveStats() {
    return {
      activeBalls: this.ballPool.filter(b => b.active).length,
      totalBallsInPool: this.ballPool.length,
      activeParticles: this.particlePool.filter(p => p.active).length,
      totalParticlesInPool: this.particlePool.length,
    };
  }

  public static reset() {
    this.ballPool.forEach(b => {
      b.active = false;
      b.mesh.visible = false;
    });
    this.particlePool.forEach(p => {
      p.active = false;
      p.mesh.visible = false;
    });
  }

  public static dispose() {
    this.ballPool.forEach(b => {
      if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
    });
    this.particlePool.forEach(p => {
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
    });
    
    // We keep the arrays and geometry/materials alive for the next scene 
    // to avoid recompiling shaders, just remove them from the scene graph.
    this.reset();
  }
}
