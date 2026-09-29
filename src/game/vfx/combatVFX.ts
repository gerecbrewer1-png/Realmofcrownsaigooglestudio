/**
 * REALM OF CROWNS — Combat Visual Effects (VFX) System
 * High-performance procedural combat effects:
 * 1. Heavy Strike & Stomp: Expanding ground shockwave with dust particles
 * 2. Rally the Vanguard: Golden ascending light pillar and divine halo
 * 3. Shield Guard: Translucent gilded aegis barrier around the hero
 * 4. Hit Sparks: Weapon clash impact particle bursts
 */

import * as pc from 'playcanvas';

interface ActiveEffect {
  entity: pc.Entity;
  lifetime: number;
  maxLifetime: number;
  onUpdate: (progress: number, delta: number) => void;
  onDestroy?: () => void;
}

export class CombatVFXSystem {
  private app: pc.Application;
  private vfxRoot: pc.Entity;
  private activeEffects: ActiveEffect[] = [];

  // Shield Aegis persistent entity
  private shieldAegisEntity?: pc.Entity;
  private shieldAegisMaterial?: pc.StandardMaterial;
  private shieldPulse = 0;

  constructor(app: pc.Application) {
    this.app = app;
    this.vfxRoot = new pc.Entity('CombatVFXRoot');
    this.app.root.addChild(this.vfxRoot);
  }

  /**
   * Spawns an expanding golden shockwave ring on the ground.
   */
  public spawnShockwave(x: number, y: number, z: number, maxRadius: number = 6.0, duration: number = 0.55): void {
    const shockEntity = new pc.Entity('ShockwaveRing');
    shockEntity.setPosition(x, y + 0.05, z);

    // Shockwave ring material (Additive gold emissive)
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(1.0, 0.75, 0.2);
    mat.emissive = new pc.Color(1.0, 0.82, 0.25);
    mat.emissiveIntensity = 2.2;
    mat.blendType = pc.BLEND_ADDITIVE;
    mat.opacity = 0.85;
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();

    shockEntity.addComponent('render', { type: 'cylinder', material: mat });
    shockEntity.setLocalScale(0.4, 0.04, 0.4);
    this.vfxRoot.addChild(shockEntity);

    // Inner flash disk
    const innerDisk = new pc.Entity('ShockFlash');
    const diskMat = new pc.StandardMaterial();
    diskMat.diffuse = new pc.Color(1.0, 0.95, 0.8);
    diskMat.emissive = new pc.Color(1.0, 0.9, 0.7);
    diskMat.emissiveIntensity = 3.0;
    diskMat.blendType = pc.BLEND_ADDITIVE;
    diskMat.opacity = 0.9;
    diskMat.depthWrite = false;
    diskMat.update();
    innerDisk.addComponent('render', { type: 'cylinder', material: diskMat });
    innerDisk.setLocalScale(0.8, 0.03, 0.8);
    shockEntity.addChild(innerDisk);

    // Dust ring particles around the rim
    const dustCount = 8;
    const dustParticles: Array<{ entity: pc.Entity; angle: number; speed: number; y: number }> = [];
    for (let i = 0; i < dustCount; i++) {
      const angle = (i / dustCount) * Math.PI * 2;
      const dust = new pc.Entity('DustPuff');
      const dustMat = new pc.StandardMaterial();
      dustMat.diffuse = new pc.Color(0.72, 0.65, 0.5);
      dustMat.opacity = 0.6;
      dustMat.blendType = pc.BLEND_NORMAL;
      dustMat.update();

      dust.addComponent('render', { type: 'sphere', material: dustMat });
      dust.setLocalScale(0.25, 0.25, 0.25);
      dust.setPosition(x, y + 0.1, z);
      this.vfxRoot.addChild(dust);
      dustParticles.push({
        entity: dust,
        angle,
        speed: maxRadius / duration,
        y: y + 0.1
      });
    }

    this.activeEffects.push({
      entity: shockEntity,
      lifetime: 0,
      maxLifetime: duration,
      onUpdate: (progress, delta) => {
        // Expand ring outward
        const currentRadius = 0.5 + progress * (maxRadius - 0.5);
        shockEntity.setLocalScale(currentRadius * 2, 0.04, currentRadius * 2);

        // Fade ring opacity
        mat.opacity = Math.max(0, 0.85 * (1 - progress * progress));
        mat.update();

        // Inner disk shrinks and disappears quickly
        const innerProgress = Math.min(1, progress * 2.5);
        innerDisk.setLocalScale(
          (0.8 + innerProgress * 1.5) * (1 - innerProgress),
          0.03,
          (0.8 + innerProgress * 1.5) * (1 - innerProgress)
        );
        diskMat.opacity = Math.max(0, 0.9 * (1 - innerProgress));
        diskMat.update();

        // Expand dust puffs
        for (const dp of dustParticles) {
          const r = currentRadius * 0.95;
          const px = x + Math.cos(dp.angle) * r;
          const pz = z + Math.sin(dp.angle) * r;
          const py = y + 0.1 + Math.sin(progress * Math.PI) * 0.45;
          dp.entity.setPosition(px, py, pz);
          const s = 0.25 + progress * 0.35;
          dp.entity.setLocalScale(s, s, s);
        }
      },
      onDestroy: () => {
        mat.destroy();
        diskMat.destroy();
        for (const dp of dustParticles) {
          dp.entity.destroy();
        }
      }
    });
  }

  /**
   * Spawns a divine ascending golden light pillar and halo for Rally the Vanguard.
   */
  public spawnRallyAura(x: number, y: number, z: number, duration: number = 0.85): void {
    const rallyEntity = new pc.Entity('RallyAura');
    rallyEntity.setPosition(x, y, z);

    // Light pillar material (Additive Gilded Light)
    const pillarMat = new pc.StandardMaterial();
    pillarMat.diffuse = new pc.Color(1.0, 0.85, 0.3);
    pillarMat.emissive = new pc.Color(1.0, 0.88, 0.35);
    pillarMat.emissiveIntensity = 2.5;
    pillarMat.blendType = pc.BLEND_ADDITIVE;
    pillarMat.opacity = 0.7;
    pillarMat.depthWrite = false;
    pillarMat.cull = pc.CULLFACE_NONE;
    pillarMat.update();

    const pillar = new pc.Entity('AuraPillar');
    pillar.addComponent('render', { type: 'cylinder', material: pillarMat });
    pillar.setLocalScale(1.8, 5.0, 1.8);
    pillar.setLocalPosition(0, 2.5, 0);
    rallyEntity.addChild(pillar);

    // Overhead Crown Halo
    const haloMat = new pc.StandardMaterial();
    haloMat.diffuse = new pc.Color(1.0, 0.95, 0.5);
    haloMat.emissive = new pc.Color(1.0, 0.92, 0.45);
    haloMat.emissiveIntensity = 3.0;
    haloMat.blendType = pc.BLEND_ADDITIVE;
    haloMat.opacity = 0.9;
    haloMat.update();

    const halo = new pc.Entity('AuraHalo');
    halo.addComponent('render', { type: 'cylinder', material: haloMat });
    halo.setLocalScale(2.2, 0.08, 2.2);
    halo.setLocalPosition(0, 3.8, 0);
    rallyEntity.addChild(halo);

    this.vfxRoot.addChild(rallyEntity);

    this.activeEffects.push({
      entity: rallyEntity,
      lifetime: 0,
      maxLifetime: duration,
      onUpdate: (progress, delta) => {
        // Ascend and expand
        const scaleX = 1.8 + progress * 1.2;
        pillar.setLocalScale(scaleX, 5.0 + progress * 2.0, scaleX);
        pillar.setLocalPosition(0, 2.5 + progress * 1.5, 0);

        halo.setLocalScale(2.2 + progress * 1.5, 0.08, 2.2 + progress * 1.5);
        halo.setLocalPosition(0, 3.8 + progress * 2.0, 0);
        halo.rotateLocal(0, 180 * delta, 0);

        pillarMat.opacity = Math.max(0, 0.7 * (1 - progress));
        haloMat.opacity = Math.max(0, 0.9 * (1 - progress));
        pillarMat.update();
        haloMat.update();
      },
      onDestroy: () => {
        pillarMat.destroy();
        haloMat.destroy();
      }
    });
  }

  /**
   * Toggles or updates the persistent Shield Guard Aegis around the Hero entity.
   */
  public setShieldAegis(parentEntity: pc.Entity, active: boolean): void {
    if (!active) {
      if (this.shieldAegisEntity) {
        this.shieldAegisEntity.enabled = false;
      }
      return;
    }

    if (!this.shieldAegisEntity) {
      this.shieldAegisMaterial = new pc.StandardMaterial();
      this.shieldAegisMaterial.diffuse = new pc.Color(0.3, 0.7, 1.0);
      this.shieldAegisMaterial.emissive = new pc.Color(0.4, 0.8, 1.0);
      this.shieldAegisMaterial.emissiveIntensity = 1.8;
      this.shieldAegisMaterial.blendType = pc.BLEND_ADDITIVE;
      this.shieldAegisMaterial.opacity = 0.55;
      this.shieldAegisMaterial.depthWrite = false;
      this.shieldAegisMaterial.cull = pc.CULLFACE_NONE;
      this.shieldAegisMaterial.update();

      this.shieldAegisEntity = new pc.Entity('ShieldAegisBarrier');
      this.shieldAegisEntity.addComponent('render', {
        type: 'sphere',
        material: this.shieldAegisMaterial
      });
      this.shieldAegisEntity.setLocalScale(1.8, 2.2, 1.8);
      this.shieldAegisEntity.setLocalPosition(0, 1.1, 0.1);
      parentEntity.addChild(this.shieldAegisEntity);
    } else {
      if (this.shieldAegisEntity.parent !== parentEntity) {
        parentEntity.addChild(this.shieldAegisEntity);
      }
      this.shieldAegisEntity.enabled = true;
    }
  }

  /**
   * Spawns weapon clash hit sparks when melee hits connect.
   */
  public spawnHitSparks(x: number, y: number, z: number, sparkColor?: pc.Color): void {
    const count = 5;
    const sparksRoot = new pc.Entity('HitSparks');
    sparksRoot.setPosition(x, y + 1.2, z);

    const sparkMat = new pc.StandardMaterial();
    sparkMat.diffuse = sparkColor ?? new pc.Color(1.0, 0.9, 0.4);
    sparkMat.emissive = sparkMat.diffuse;
    sparkMat.emissiveIntensity = 2.8;
    sparkMat.blendType = pc.BLEND_ADDITIVE;
    sparkMat.opacity = 1.0;
    sparkMat.depthWrite = false;
    sparkMat.update();

    const particles: Array<{ entity: pc.Entity; vx: number; vy: number; vz: number }> = [];
    for (let i = 0; i < count; i++) {
      const p = new pc.Entity(`Spark_${i}`);
      p.addComponent('render', { type: 'sphere', material: sparkMat });
      p.setLocalScale(0.08, 0.08, 0.08);
      sparksRoot.addChild(p);

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.2) * Math.PI;
      const speed = 2.8 + Math.random() * 2.2;
      particles.push({
        entity: p,
        vx: Math.cos(theta) * Math.cos(phi) * speed,
        vy: Math.sin(phi) * speed + 1.5,
        vz: Math.sin(theta) * Math.cos(phi) * speed
      });
    }

    this.vfxRoot.addChild(sparksRoot);

    this.activeEffects.push({
      entity: sparksRoot,
      lifetime: 0,
      maxLifetime: 0.28,
      onUpdate: (progress, delta) => {
        sparkMat.opacity = Math.max(0, 1.0 - progress);
        sparkMat.update();

        for (const pt of particles) {
          pt.vy -= 9.8 * delta; // Gravity
          const pos = pt.entity.getLocalPosition();
          pt.entity.setLocalPosition(
            pos.x + pt.vx * delta,
            pos.y + pt.vy * delta,
            pos.z + pt.vz * delta
          );
        }
      },
      onDestroy: () => {
        sparkMat.destroy();
      }
    });
  }

  /**
   * Main per-frame tick for active effects and aegis pulse.
   */
  public update(delta: number): void {
    // Shield Aegis subtle pulsation
    if (this.shieldAegisEntity && this.shieldAegisEntity.enabled && this.shieldAegisMaterial) {
      this.shieldPulse += delta * 5.0;
      const s = 1.8 + Math.sin(this.shieldPulse) * 0.08;
      this.shieldAegisEntity.setLocalScale(s, 2.2 + Math.sin(this.shieldPulse) * 0.1, s);
      this.shieldAegisMaterial.opacity = 0.45 + Math.sin(this.shieldPulse * 1.5) * 0.15;
      this.shieldAegisMaterial.update();
    }

    // Update active effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      fx.lifetime += delta;
      const progress = Math.min(1.0, fx.lifetime / fx.maxLifetime);

      fx.onUpdate(progress, delta);

      if (progress >= 1.0) {
        if (fx.onDestroy) fx.onDestroy();
        fx.entity.destroy();
        this.activeEffects.splice(i, 1);
      }
    }
  }

  public destroy(): void {
    for (const fx of this.activeEffects) {
      if (fx.onDestroy) fx.onDestroy();
      fx.entity.destroy();
    }
    this.activeEffects = [];
    if (this.shieldAegisEntity) {
      this.shieldAegisEntity.destroy();
    }
    if (this.shieldAegisMaterial) {
      this.shieldAegisMaterial.destroy();
    }
    this.vfxRoot.destroy();
  }
}
