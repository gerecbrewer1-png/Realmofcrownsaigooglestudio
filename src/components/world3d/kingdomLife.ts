/**
 * Realm of Crowns - Living Medieval Kingdom Ecosystem
 * Implements subtle environmental life:
 * - Rising chimney smoke particle system with soft opacity falloff
 * - Aerodynamic windmill blade rotation
 * - Wind-flutter wave simulation on silk heraldic banners
 * - Circling white doves / birds orbiting the high citadel spires
 * - Citadel sentry guards standing watch on gatehouse & walls
 * - Ambient golden atmospheric dust motes
 */

import * as THREE from 'three';

export interface KingdomLifeSystem {
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

// Procedural soft-edged smoke puff texture (zero square pixels or voxel blocks)
function createSoftSmokeTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.DataTexture(new Uint8Array(64 * 64 * 4), 64, 64);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(235, 242, 250, 0.75)');
  gradient.addColorStop(0.22, 'rgba(215, 225, 238, 0.48)');
  gradient.addColorStop(0.55, 'rgba(175, 190, 208, 0.18)');
  gradient.addColorStop(0.82, 'rgba(135, 150, 170, 0.04)');
  gradient.addColorStop(1, 'rgba(100, 115, 135, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function createKingdomLifeSystem(
  scene: THREE.Scene,
  chimneyPoints: THREE.Vector3[],
  windmillBlades: THREE.Object3D[],
  wavingBanners: THREE.Mesh[],
  armillarySpheres: THREE.Object3D[]
): KingdomLifeSystem {
  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  // 1. Natural Soft Chimney Smoke (Billboarding Puffs with Gradual Expansion & Fade)
  const smokeGroup = new THREE.Group();
  smokeGroup.name = 'natural-chimney-smoke';
  scene.add(smokeGroup);

  const smokeTexture = createSoftSmokeTexture();
  disposables.push(smokeTexture);

  const defaultChimneys = chimneyPoints.length > 0 ? chimneyPoints : [new THREE.Vector3(0, 10, 0)];
  const puffsPerChimney = 8;
  const totalPuffs = defaultChimneys.length * puffsPerChimney;

  interface SmokePuffData {
    sprite: THREE.Sprite;
    material: THREE.SpriteMaterial;
    origin: THREE.Vector3;
    life: number;
    maxLife: number;
    baseSize: number;
    maxSize: number;
    driftAngle: number;
    driftSpeed: number;
    swaySeed: number;
    riseSpeed: number;
  }

  const smokePuffs: SmokePuffData[] = [];

  for (let c = 0; c < defaultChimneys.length; c++) {
    const origin = defaultChimneys[c];
    for (let p = 0; p < puffsPerChimney; p++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTexture,
        color: 0x9fb3c8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      disposables.push(mat);

      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(origin);
      smokeGroup.add(sprite);

      const maxLife = 3.2 + Math.random() * 1.6;
      smokePuffs.push({
        sprite,
        material: mat,
        origin: origin.clone(),
        life: (p / puffsPerChimney) * maxLife, // Stagger initial phase
        maxLife,
        baseSize: 0.5 + Math.random() * 0.2,
        maxSize: 2.2 + Math.random() * 0.8,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.15 + Math.random() * 0.2,
        swaySeed: Math.random() * 100,
        riseSpeed: 0.9 + Math.random() * 0.5,
      });
    }
  }

  // 2. Circling White Doves / Birds above Citadel
  const birdGroup = new THREE.Group();
  birdGroup.name = 'ambient-birds';
  const birdCount = 6;
  const birdWings: { mesh: THREE.Mesh; phase: number }[] = [];

  const birdMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  disposables.push(birdMat);

  for (let b = 0; b < birdCount; b++) {
    const bMesh = new THREE.Group();
    // Wing left and right
    const wingGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      -0.5, 0.1, -0.2,
      -0.4, 0, 0.3,
      0, 0, 0,
      0.5, 0.1, -0.2,
      0.4, 0, 0.3,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const wingMesh = new THREE.Mesh(wingGeo, birdMat);
    bMesh.add(wingMesh);
    disposables.push(wingGeo);

    bMesh.position.set(
      Math.cos((Math.PI * 2 * b) / birdCount) * 16,
      22 + (b % 3) * 1.8,
      Math.sin((Math.PI * 2 * b) / birdCount) * 16
    );

    birdGroup.add(bMesh);
    birdWings.push({ mesh: wingMesh, phase: b * 0.8 });
  }
  scene.add(birdGroup);

  // 3. Citadel Sentry Guards on Battlements
  const sentryGroup = new THREE.Group();
  sentryGroup.name = 'citadel-sentries';
  const guardGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.4, 8);
  const guardArmorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.4 });
  const guardCapeMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
  disposables.push(guardGeo, guardArmorMat, guardCapeMat);

  // Gatehouse sentries & wall guards
  const sentryPositions = [
    { x: -2.8, y: 3.6, z: 20 },
    { x: 2.8, y: 3.6, z: 20 },
    { x: 14, y: 3.6, z: 14 },
    { x: -14, y: 3.6, z: 14 },
  ];

  sentryPositions.forEach((sp) => {
    const s = new THREE.Group();
    const body = new THREE.Mesh(guardGeo, guardArmorMat);
    body.position.y = 0.7;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.08), guardCapeMat);
    cape.position.set(0, 0.65, -0.2);
    // Spear
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), guardArmorMat);
    spear.position.set(0.35, 1.1, 0.1);
    s.add(body, cape, spear);
    s.position.set(sp.x, sp.y, sp.z);
    sentryGroup.add(s);
  });
  scene.add(sentryGroup);

  // 4. Update Loop
  const update = (delta: number, elapsed: number) => {
    // A. Windmill Continuous Rotation
    windmillBlades.forEach((mill) => {
      mill.rotation.z -= delta * 0.9;
    });

    // B. Armillary Sphere Rotation
    armillarySpheres.forEach((sphere) => {
      sphere.rotation.y += delta * 0.4;
      sphere.rotation.x += delta * 0.2;
    });

    // C. Heraldic Banner Wave Simulation (Sine perturbation)
    wavingBanners.forEach((banner, idx) => {
      const posAttr = banner.geometry.attributes.position;
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          const vx = posAttr.getX(i);
          const vy = posAttr.getY(i);
          // Wave amplitude increases toward the fly edge
          const wave = Math.sin(elapsed * 4 + vy * 2 + idx) * 0.12 * (vx + 0.8);
          posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;
      }
    });

    // D. Soft Chimney Smoke Puff Evolution (Growth, Atmospheric Rise & Seamless Fade)
    for (let i = 0; i < smokePuffs.length; i++) {
      const puff = smokePuffs[i];
      puff.life += delta;

      if (puff.life >= puff.maxLife) {
        puff.life = 0;
        puff.sprite.position.copy(puff.origin);
        puff.material.opacity = 0;
        puff.sprite.scale.set(puff.baseSize, puff.baseSize, 1);
      } else {
        const progress = puff.life / puff.maxLife; // 0 -> 1

        // Smooth Opacity Envelope: gentle rise, wide plateau, soft dissipating tail
        let opacity = 0;
        if (progress < 0.18) {
          opacity = (progress / 0.18) * 0.38;
        } else {
          opacity = Math.max(0, 0.38 * (1 - (progress - 0.18) / 0.82));
        }
        puff.material.opacity = opacity;

        // Size expansion as warm air diffuses into the cold atmosphere
        const currentSize = puff.baseSize + (puff.maxSize - puff.baseSize) * Math.sqrt(progress);
        puff.sprite.scale.set(currentSize, currentSize, 1);

        // Sinusoidal wind sway & natural rise
        const swayX = Math.sin(elapsed * 1.2 + puff.swaySeed) * 0.35 * progress;
        const swayZ = Math.cos(elapsed * 0.9 + puff.swaySeed) * 0.35 * progress;
        const rise = puff.riseSpeed * puff.life;

        puff.sprite.position.set(
          puff.origin.x + Math.cos(puff.driftAngle) * (puff.driftSpeed * puff.life) + swayX,
          puff.origin.y + rise,
          puff.origin.z + Math.sin(puff.driftAngle) * (puff.driftSpeed * puff.life) + swayZ
        );
      }
    }

    // E. Circling Doves
    birdWings.forEach((bird, idx) => {
      const bMesh = birdGroup.children[idx];
      if (bMesh) {
        const orbitSpeed = 0.35;
        const angle = elapsed * orbitSpeed + (Math.PI * 2 * idx) / birdCount;
        const rad = 17 + Math.sin(elapsed + idx) * 2;
        bMesh.position.x = Math.cos(angle) * rad;
        bMesh.position.z = Math.sin(angle) * rad;
        bMesh.rotation.y = -angle + Math.PI / 2;

        // Wing flapping
        const flap = Math.sin(elapsed * 12 + bird.phase) * 0.4;
        bird.mesh.rotation.z = flap;
      }
    });
  };

  const dispose = () => {
    scene.remove(smokeGroup);
    scene.remove(birdGroup);
    scene.remove(sentryGroup);
    disposables.forEach((d) => d.dispose());
  };

  return { update, dispose };
}
