/**
 * Realm of Crowns — Single-Pass Specular Ocean Material
 * Phase 3: Low-Draw-Call Naval MMO Architecture (Voyage Century / Bounty Bay Pattern)
 * 
 * Replaces complex multi-pass planar mirror water with a lightweight, high-performance
 * single-pass ocean material using:
 * 1. Two counter-scrolling normal maps for dynamic, silky wave motion.
 * 2. Blinn-Phong directional sun specular highlights.
 * 3. Schlick-Fresnel sky color blending without secondary mirrored camera passes.
 * 4. Zero offscreen render target switches (1 draw call, 60 FPS mobile WebGL).
 */

import * as THREE from 'three';

export interface SinglePassOceanOptions {
  normalMap1: THREE.Texture;
  normalMap2: THREE.Texture;
  sunDirection: THREE.Vector3;
  sunColor?: THREE.Color | number;
  deepColor?: THREE.Color | number;
  shallowColor?: THREE.Color | number;
  skyColor?: THREE.Color | number;
}

export class SinglePassOceanMaterial extends THREE.ShaderMaterial {
  constructor(options: SinglePassOceanOptions) {
    const sunCol = options.sunColor instanceof THREE.Color ? options.sunColor : new THREE.Color(options.sunColor ?? 0xfffbeb);
    const deepCol = options.deepColor instanceof THREE.Color ? options.deepColor : new THREE.Color(options.deepColor ?? 0x021729);
    const shallowCol = options.shallowColor instanceof THREE.Color ? options.shallowColor : new THREE.Color(options.shallowColor ?? 0x0d526b);
    const skyCol = options.skyColor instanceof THREE.Color ? options.skyColor : new THREE.Color(options.skyColor ?? 0x38bdf8);

    super({
      uniforms: {
        time: { value: 0 },
        normalMap1: { value: options.normalMap1 },
        normalMap2: { value: options.normalMap2 },
        sunDirection: { value: options.sunDirection.clone().normalize() },
        sunColor: { value: sunCol },
        deepColor: { value: deepCol },
        shallowColor: { value: shallowCol },
        skyColor: { value: skyCol },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vec4 mvPosition = viewMatrix * worldPos;
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform sampler2D normalMap1;
        uniform sampler2D normalMap2;
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 skyColor;

        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
          // Counter-scrolling wave normal coordinates (Voyage Century / Bounty Bay pattern)
          vec2 uv1 = vWorldPosition.xz * 0.006 + vec2(0.04, 0.02) * time;
          vec2 uv2 = vWorldPosition.xz * 0.009 * 1.5 + vec2(-0.02, 0.03) * time;

          vec3 n1 = texture2D(normalMap1, uv1).rgb * 2.0 - 1.0;
          vec3 n2 = texture2D(normalMap2, uv2).rgb * 2.0 - 1.0;
          vec3 normal = normalize(vec3(n1.xy + n2.xy, n1.z * n2.z));

          vec3 viewDir = normalize(vViewPosition);

          // Fresnel factor (Schlick approximation)
          float fresnel = clamp(0.04 + 0.96 * pow(1.0 - max(0.0, dot(viewDir, normal)), 4.0), 0.0, 1.0);

          // Sun specular highlight (Blinn-Phong)
          vec3 halfDir = normalize(sunDirection + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 120.0);
          vec3 specularColor = vec3(1.0, 0.95, 0.8) * spec * 1.5;

          // Foam based on steep normal slopes
          float foamAmount = smoothstep(0.85, 1.0, 1.0 - normal.y);
          vec3 foamColor = vec3(0.87, 0.95, 0.98); // #dff2fa

          // Base colors: deep-sea navy and Caribbean turquoise crest
          vec3 deepNavy = vec3(0.015, 0.07, 0.15);
          vec3 crestTurquoise = vec3(0.06, 0.32, 0.40);
          vec3 baseWater = mix(deepNavy, crestTurquoise, clamp(fresnel * 0.4 + (1.0 - normal.y) * 0.6, 0.0, 1.0));

          // Blend water with sky Fresnel + direct sun specular + foam
          vec3 color = mix(baseWater, skyColor, fresnel * 0.65) + specularColor;
          color = mix(color, foamColor, foamAmount * 0.8);

          // Output solid alpha (0.94) so submerged keels and mountain bases are occluded by water surface
          gl_FragColor = vec4(color, 0.94);
        }
      `,
      transparent: true,
      opacity: 0.94,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
    });
  }

  public updateTime(t: number): void {
    this.uniforms.time.value = t;
  }

  public setSunDirection(dir: THREE.Vector3): void {
    this.uniforms.sunDirection.value.copy(dir).normalize();
  }
}
