/**
 * Realm of Crowns - 3D Level-Up & Progression Celebration Effects
 *
 * Spawns an authoritative visual celebration when a building or hero completes an upgrade:
 * 1. Expanding golden shockwave ring at the structure's base
 * 2. Rising golden/amber motes and celebratory sparkle particles
 * 3. Ascending 3D billboard text ("LEVEL UP! Lv.X") that floats upward and fades
 * 4. Automatic memory and buffer cleanup
 */

import * as THREE from 'three';

interface ActiveCelebration {
  group: THREE.Group;
  particles: THREE.Points;
  particleVelocities: { x: number; y: number; z: number }[];
  shockRing: THREE.Mesh;
  billboardSprite: THREE.Sprite;
  elapsed: number;
  duration: number;
}

export class CelebrationEffectManager {
  private activeCelebrations: ActiveCelebration[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawns a celebratory 3D burst at a world position
   */
  public spawnCelebration(
    position: THREE.Vector3,
    title: string,
    level: number,
    colorHex: number = 0xf59e0b
  ): void {
    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    // 1. Expanding Golden Ground Shockwave
    const shockGeo = new THREE.RingGeometry(0.3, 0.6, 32);
    shockGeo.rotateX(-Math.PI / 2);
    const shockMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockRing = new THREE.Mesh(shockGeo, shockMat);
    shockRing.position.y = 0.05;
    group.add(shockRing);

    // 2. Rising Sparkle Particles
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.random() * 1.2;
      positions[i * 3] = Math.cos(angle) * rad;
      positions[i * 3 + 1] = 0.2 + Math.random() * 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * rad;

      velocities.push({
        x: (Math.random() - 0.5) * 1.5,
        y: 1.8 + Math.random() * 2.2,
        z: (Math.random() - 0.5) * 1.5,
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.35,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    group.add(particles);

    // 3. Floating 3D Billboard Sprite: "LEVEL UP! Lv.X"
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Golden framed pill background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(16, 16, 352, 96, 24);
      ctx.fill();
      ctx.stroke();

      // Heading: "✨ LEVEL UP! ✨"
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('✨ LEVEL UP! ✨', 192, 54);

      // Subtitle: "${title} Lv.${level}"
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${title} • Lv.${level}`, 192, 92);
    }

    const spriteTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: spriteTex,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
    });
    const billboardSprite = new THREE.Sprite(spriteMat);
    billboardSprite.scale.set(4.2, 1.4, 1);
    billboardSprite.position.set(0, 2.5, 0);
    group.add(billboardSprite);

    this.activeCelebrations.push({
      group,
      particles,
      particleVelocities: velocities,
      shockRing,
      billboardSprite,
      elapsed: 0,
      duration: 3.2,
    });
  }

  /**
   * Updates and animates all active celebrations in the frame render loop
   */
  public update(delta: number): void {
    for (let i = this.activeCelebrations.length - 1; i >= 0; i--) {
      const cel = this.activeCelebrations[i];
      cel.elapsed += delta;
      const progress = cel.elapsed / cel.duration; // 0 to 1

      // Animate shockwave expanding and fading
      const ringScale = 1.0 + progress * 5.5;
      cel.shockRing.scale.set(ringScale, ringScale, ringScale);
      (cel.shockRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 * (1.0 - progress));

      // Animate particles rising and dispersing
      const posAttr = cel.particles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let p = 0; p < cel.particleVelocities.length; p++) {
        const vel = cel.particleVelocities[p];
        arr[p * 3] += vel.x * delta;
        arr[p * 3 + 1] += vel.y * delta;
        arr[p * 3 + 2] += vel.z * delta;
      }
      posAttr.needsUpdate = true;
      (cel.particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1.0 - progress * 1.2);

      // Animate billboard floating upward and fading
      cel.billboardSprite.position.y += delta * 0.85;
      (cel.billboardSprite.material as THREE.SpriteMaterial).opacity = Math.max(
        0,
        progress < 0.7 ? 1.0 : (1.0 - progress) / 0.3
      );

      // If expired, dispose and remove
      if (progress >= 1.0) {
        this.scene.remove(cel.group);
        cel.shockRing.geometry.dispose();
        (cel.shockRing.material as THREE.Material).dispose();
        cel.particles.geometry.dispose();
        (cel.particles.material as THREE.Material).dispose();
        cel.billboardSprite.material.map?.dispose();
        cel.billboardSprite.material.dispose();
        this.activeCelebrations.splice(i, 1);
      }
    }
  }

  /**
   * Disposes of all active effects
   */
  public dispose(): void {
    for (const cel of this.activeCelebrations) {
      this.scene.remove(cel.group);
      cel.shockRing.geometry.dispose();
      (cel.shockRing.material as THREE.Material).dispose();
      cel.particles.geometry.dispose();
      (cel.particles.material as THREE.Material).dispose();
      cel.billboardSprite.material.map?.dispose();
      cel.billboardSprite.material.dispose();
    }
    this.activeCelebrations.length = 0;
  }
}
