/**
 * Realm of Crowns - Low-Ground Medieval Fantasy Mist System
 *
 * Provides a dedicated, low-altitude atmospheric mist layer that hovers
 * just above valleys, rivers, and meadows without obscuring the hex terrain,
 * roads, forests, or mountain summits.
 *
 * Visual Characteristics:
 * - Irregular, wispy organic cloud ribbons generated from procedural multi-octave noise.
 * - Sits strictly at low elevation (Y ~ 2.4 and Y ~ 4.2), below mountain peaks and citadel walls.
 * - Subtle neutral cool-gray/white atmospheric tone (no saturated blue or harsh white).
 * - Gentle, natural drift animated purely via texture coordinate scrolling.
 * - Bounded with soft circular edge feathering (no geometric box or hard edges).
 * - High performance: exactly 2 pooled mesh quads with early-out pixel discarding.
 */

import * as THREE from 'three';

let cachedNoiseTexture: THREE.CanvasTexture | null = null;

/**
 * Generates a seamless, organic procedural cloud/mist alpha texture
 */
function getGroundMistNoiseTexture(): THREE.CanvasTexture {
  if (cachedNoiseTexture) return cachedNoiseTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    // Fallback if canvas context is unavailable
    const fallback = new THREE.CanvasTexture(canvas);
    cachedNoiseTexture = fallback;
    return fallback;
  }

  // Base background (black = zero mist)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Accumulate multi-scale soft radial Gaussian cloud puffs with seamless periodic wrap
  const numPuffs = 120;
  for (let i = 0; i < numPuffs; i++) {
    // Deterministic pseudo-random placement
    const seed = i * 19.349 + 7.123;
    const cx = (Math.sin(seed * 1.7) * 0.5 + 0.5) * size;
    const cy = (Math.cos(seed * 2.3) * 0.5 + 0.5) * size;
    const radius = 24 + (Math.sin(seed * 3.1) * 0.5 + 0.5) * 48;
    const intensity = 0.08 + (Math.cos(seed * 4.7) * 0.5 + 0.5) * 0.16;

    // Stamp puff with periodic wrapping for seamless tiling
    for (let ox of [-size, 0, size]) {
      for (let oy of [-size, 0, size]) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) {
          continue;
        }

        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Second octave: smaller wispy ribbons
  const numWisps = 90;
  for (let j = 0; j < numWisps; j++) {
    const seed = j * 43.171 + 13.91;
    const cx = (Math.sin(seed * 2.9) * 0.5 + 0.5) * size;
    const cy = (Math.cos(seed * 3.7) * 0.5 + 0.5) * size;
    const radius = 14 + (Math.sin(seed * 5.3) * 0.5 + 0.5) * 22;
    const intensity = 0.05 + (Math.cos(seed * 6.1) * 0.5 + 0.5) * 0.12;

    for (let ox of [-size, 0, size]) {
      for (let oy of [-size, 0, size]) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) {
          continue;
        }
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  cachedNoiseTexture = texture;
  return texture;
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D uNoiseMap;
  uniform vec2 uOffset1;
  uniform vec2 uOffset2;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uMaxRadius;
  uniform float uRepeat;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Dual layered sampling with counter-drift
    vec2 coord1 = vUv * uRepeat + uOffset1;
    vec2 coord2 = vUv * (uRepeat * 0.73) + uOffset2;

    float n1 = texture2D(uNoiseMap, coord1).r;
    float n2 = texture2D(uNoiseMap, coord2).r;

    // Intersect noise octaves to form soft, organic cloud wisps
    float combined = (n1 * 0.58 + n2 * 0.42);
    // Sparse thresholding: wisps form naturally while leaving majority open to see crisp ground
    float mistDensity = smoothstep(0.42, 0.78, combined);

    // Circular realm edge falloff (eliminates any harsh rectangular boundaries)
    float dist = length(vWorldPos.xz);
    float edgeFade = smoothstep(uMaxRadius, uMaxRadius * 0.5, dist);

    float alpha = mistDensity * uOpacity * edgeFade;

    // Early pixel discard to optimize GPU fill-rate
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

export interface GroundMistSystem {
  group: THREE.Group;
  update: (deltaTime: number, currentZoomTier: 'city' | 'region' | 'world') => void;
  setZoomTier: (tier: 'city' | 'region' | 'world') => void;
  dispose: () => void;
}

/**
 * Creates the low-ground medieval mist system
 */
export function createGroundMistSystem(): GroundMistSystem {
  const group = new THREE.Group();
  group.name = 'ground-mist-system';

  const noiseTexture = getGroundMistNoiseTexture();

  // Subtle neutral morning mist color (natural off-white translucent vapor, NEVER blue or dark gray)
  const mistColor = new THREE.Color(0xf6f5f0);

  // 1. Layer 1: Lowland / River Valley Mist
  // Sits strictly at low altitude (Y=1.45). Low riverbeds (Y=0.4) and valleys (Y=1.0-1.4)
  // have mist resting within them, while rolling hills (Y>=2.0), forests, and mountains
  // naturally pierce through unobstructed.
  const radiusLayer1 = 340;
  const geo1 = new THREE.CircleGeometry(radiusLayer1, 36);
  geo1.rotateX(-Math.PI / 2);

  const mat1 = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uNoiseMap: { value: noiseTexture },
      uOffset1: { value: new THREE.Vector2(0, 0) },
      uOffset2: { value: new THREE.Vector2(0.3, 0.5) },
      uColor: { value: mistColor },
      uOpacity: { value: 0.12 },
      uMaxRadius: { value: radiusLayer1 },
      uRepeat: { value: 6.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh1 = new THREE.Mesh(geo1, mat1);
  mesh1.position.set(0, 1.45, 0); // Sits at Y=1.45: lower valleys have mist, rolling hills rise cleanly above
  mesh1.renderOrder = 2;
  group.add(mesh1);

  // 2. Layer 2: Sparse Drifting Vapor Wisps (soft translucent cloud patches)
  // Sits at Y=2.25 with sparse noise coverage so over 85% is open air
  const radiusLayer2 = 320;
  const geo2 = new THREE.CircleGeometry(radiusLayer2, 36);
  geo2.rotateX(-Math.PI / 2);

  const mat2 = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uNoiseMap: { value: noiseTexture },
      uOffset1: { value: new THREE.Vector2(0.5, 0.2) },
      uOffset2: { value: new THREE.Vector2(0.1, 0.8) },
      uColor: { value: mistColor },
      uOpacity: { value: 0.08 },
      uMaxRadius: { value: radiusLayer2 },
      uRepeat: { value: 4.2 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh2 = new THREE.Mesh(geo2, mat2);
  mesh2.position.set(0, 2.25, 0); // Sits at Y=2.25: hills and mountains rise high above
  mesh2.renderOrder = 3;
  group.add(mesh2);

  // Target opacities by zoom tier (ensures high strategic clarity)
  let targetOpacity1 = 0.12;
  let targetOpacity2 = 0.08;

  const setZoomTier = (tier: 'city' | 'region' | 'world') => {
    if (tier === 'city') {
      targetOpacity1 = 0.14;
      targetOpacity2 = 0.09;
    } else if (tier === 'region') {
      targetOpacity1 = 0.11;
      targetOpacity2 = 0.07;
    } else {
      // Grand World view: ultra-faint so the whole strategic realm is completely clear
      targetOpacity1 = 0.06;
      targetOpacity2 = 0.04;
    }
  };

  let totalTime = 0;

  const update = (deltaTime: number, currentZoomTier: 'city' | 'region' | 'world') => {
    totalTime += deltaTime;

    // Smoothly adapt opacities to target zoom tier
    mat1.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      mat1.uniforms.uOpacity.value,
      targetOpacity1,
      0.08
    );
    mat2.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      mat2.uniforms.uOpacity.value,
      targetOpacity2,
      0.08
    );

    // Subtle drift movement: ~0.003 units per second
    const driftSpeed = currentZoomTier === 'world' ? 0.002 : 0.0035;

    // Layer 1 slow northeast drift
    mat1.uniforms.uOffset1.value.x += deltaTime * driftSpeed * 0.9;
    mat1.uniforms.uOffset1.value.y += deltaTime * driftSpeed * 0.6;
    mat1.uniforms.uOffset2.value.x -= deltaTime * driftSpeed * 0.7;
    mat1.uniforms.uOffset2.value.y += deltaTime * driftSpeed * 0.8;

    // Layer 2 slow northwest drift with slight breathing variance
    const breath = 1.0 + Math.sin(totalTime * 0.2) * 0.15;
    mat2.uniforms.uOffset1.value.x -= deltaTime * driftSpeed * 0.8 * breath;
    mat2.uniforms.uOffset1.value.y += deltaTime * driftSpeed * 0.9 * breath;
    mat2.uniforms.uOffset2.value.x += deltaTime * driftSpeed * 0.6;
    mat2.uniforms.uOffset2.value.y -= deltaTime * driftSpeed * 0.7;
  };

  const dispose = () => {
    geo1.dispose();
    mat1.dispose();
    geo2.dispose();
    mat2.dispose();
  };

  return {
    group,
    update,
    setZoomTier,
    dispose,
  };
}
