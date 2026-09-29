/**
 * Mobile-Friendly RTS 3D Camera Controller
 * Supports drag-to-pan, pinch-to-zoom, two-finger rotate/pitch, smooth tweening,
 * LOD zoom tiers, and arrow-key continuous glide navigation with momentum.
 */

import * as THREE from 'three';

export interface CameraState {
  target: THREE.Vector3;
  radius: number; // distance from target
  pitch: number;  // polar angle in radians (vertical tilt)
  yaw: number;    // azimuthal angle in radians (horizontal rotation)
}

export type ZoomLevel = 'city' | 'region' | 'world';

export const CAMERA_PRESETS = {
  city: { radius: 36, pitch: 0.85, yaw: 0.4 },      // Close-up detailed city
  region: { radius: 105, pitch: 0.95, yaw: 0.3 },   // Tactical neighborhood view
  world: { radius: 280, pitch: 1.15, yaw: 0.15 },   // Grand strategic realm overview
};

export class RTSCameraController {
  public camera: THREE.PerspectiveCamera;
  public state: CameraState;
  public targetState: CameraState;
  private isTweening = false;
  private tweenStartTime = 0;
  private tweenDuration = 800;
  private tweenStartValues!: CameraState;

  // Glide & Momentum navigation
  private glideInput = new THREE.Vector2(0, 0);
  private glideVelocity = new THREE.Vector2(0, 0); // World units per second

  // Constraints
  public minRadius = 24;
  public maxRadius = 360;
  public minPitch = 0.55; // ~31 degrees (high tilt)
  public maxPitch = 1.35; // ~77 degrees (top-down view)
  public worldBounds = { minX: -820, maxX: 820, minZ: -820, maxZ: 820 };

  constructor(camera: THREE.PerspectiveCamera, initialTarget = new THREE.Vector3(0, 0, 0)) {
    this.camera = camera;
    this.state = {
      target: initialTarget.clone(),
      radius: CAMERA_PRESETS.region.radius,
      pitch: CAMERA_PRESETS.region.pitch,
      yaw: CAMERA_PRESETS.region.yaw,
    };
    this.targetState = {
      target: initialTarget.clone(),
      radius: this.state.radius,
      pitch: this.state.pitch,
      yaw: this.state.yaw,
    };
    this.updateCameraTransform();
  }

  /**
   * Set continuous directional input from keyboard arrow keys or virtual stick
   * @param x Left (-1) to Right (+1)
   * @param z Backward (-1) to Forward (+1)
   */
  public setGlideInput(x: number, z: number) {
    const len = Math.hypot(x, z);
    if (len > 1) {
      this.glideInput.set(x / len, z / len);
    } else {
      this.glideInput.set(x, z);
    }
  }

  public panBy(deltaX: number, deltaZ: number) {
    if (this.isTweening) this.isTweening = false;

    // Pan relative to camera yaw rotation
    const cosYaw = Math.cos(this.state.yaw);
    const sinYaw = Math.sin(this.state.yaw);

    const worldDX = deltaX * cosYaw - deltaZ * sinYaw;
    const worldDZ = deltaX * sinYaw + deltaZ * cosYaw;

    this.targetState.target.x = THREE.MathUtils.clamp(
      this.targetState.target.x + worldDX,
      this.worldBounds.minX,
      this.worldBounds.maxX
    );
    this.targetState.target.z = THREE.MathUtils.clamp(
      this.targetState.target.z + worldDZ,
      this.worldBounds.minZ,
      this.worldBounds.maxZ
    );
  }

  public rotateBy(deltaYaw: number, deltaPitch = 0) {
    if (this.isTweening) this.isTweening = false;
    this.targetState.yaw += deltaYaw;
    this.targetState.pitch = THREE.MathUtils.clamp(
      this.targetState.pitch + deltaPitch,
      this.minPitch,
      this.maxPitch
    );
  }

  public zoomBy(factor: number) {
    if (this.isTweening) this.isTweening = false;
    this.targetState.radius = THREE.MathUtils.clamp(
      this.targetState.radius * factor,
      this.minRadius,
      this.maxRadius
    );
  }

  public zoomIn(factor = 0.85) {
    this.zoomBy(factor);
  }

  public zoomOut(factor = 1.18) {
    this.zoomBy(factor);
  }

  public toggleTilt() {
    if (this.isTweening) this.isTweening = false;
    const current = this.targetState.pitch;
    // Toggle between top-down strategic angle and dramatic low-tilt perspective
    this.targetState.pitch = current > 1.05 ? 0.72 : 1.25;
  }

  public rotateClockwise(step = 0.45) {
    this.rotateBy(step);
  }

  public rotateCounterClockwise(step = -0.45) {
    this.rotateBy(step);
  }

  public focusOn(
    worldX: number,
    worldZ: number,
    preset?: ZoomLevel,
    durationMs = 900
  ) {
    const p = preset ? CAMERA_PRESETS[preset] : { radius: this.state.radius, pitch: this.state.pitch, yaw: this.state.yaw };

    this.isTweening = true;
    this.tweenStartTime = performance.now();
    this.tweenDuration = durationMs;
    this.tweenStartValues = {
      target: this.state.target.clone(),
      radius: this.state.radius,
      pitch: this.state.pitch,
      yaw: this.state.yaw,
    };

    this.targetState.target.set(worldX, 0, worldZ);
    this.targetState.radius = p.radius;
    this.targetState.pitch = p.pitch;
    this.targetState.yaw = p.yaw;
  }

  public getCurrentZoomLevel(): ZoomLevel {
    if (this.state.radius < 55) return 'city';
    if (this.state.radius < 140) return 'region';
    return 'world';
  }

  public update(deltaTime = 0.016) {
    // 1. Process Arrow Key Glide Physics with Smooth Momentum
    if (!this.isTweening) {
      const isInputActive = this.glideInput.lengthSq() > 0.01;
      const speed = Math.max(40, this.state.radius * 0.92); // Scales smoothly with zoom height

      if (isInputActive) {
        // Forward vector projected onto ground plane (XZ)
        const forwardX = -Math.sin(this.state.yaw);
        const forwardZ = -Math.cos(this.state.yaw);
        // Right vector projected onto ground plane (XZ)
        const rightX = Math.cos(this.state.yaw);
        const rightZ = -Math.sin(this.state.yaw);

        // Desired velocity in world coordinates
        const targetVelX = (rightX * this.glideInput.x + forwardX * this.glideInput.y) * speed;
        const targetVelZ = (rightZ * this.glideInput.x + forwardZ * this.glideInput.y) * speed;

        // Smooth acceleration
        const accelRate = 1 - Math.exp(-14 * deltaTime);
        this.glideVelocity.x = THREE.MathUtils.lerp(this.glideVelocity.x, targetVelX, accelRate);
        this.glideVelocity.y = THREE.MathUtils.lerp(this.glideVelocity.y, targetVelZ, accelRate);
      } else {
        // Smooth deceleration / momentum glide
        const friction = Math.exp(-8 * deltaTime);
        this.glideVelocity.multiplyScalar(friction);
        if (this.glideVelocity.lengthSq() < 0.01) {
          this.glideVelocity.set(0, 0);
        }
      }

      // Apply glide displacement
      if (this.glideVelocity.lengthSq() > 0.001) {
        this.targetState.target.x = THREE.MathUtils.clamp(
          this.targetState.target.x + this.glideVelocity.x * deltaTime,
          this.worldBounds.minX,
          this.worldBounds.maxX
        );
        this.targetState.target.z = THREE.MathUtils.clamp(
          this.targetState.target.z + this.glideVelocity.y * deltaTime,
          this.worldBounds.minZ,
          this.worldBounds.maxZ
        );
      }
    }

    // 2. Camera Transform Interpolation
    if (this.isTweening) {
      const now = performance.now();
      const elapsed = now - this.tweenStartTime;
      const progress = Math.min(1, elapsed / this.tweenDuration);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      this.state.target.lerpVectors(this.tweenStartValues.target, this.targetState.target, ease);
      this.state.radius = THREE.MathUtils.lerp(this.tweenStartValues.radius, this.targetState.radius, ease);
      this.state.pitch = THREE.MathUtils.lerp(this.tweenStartValues.pitch, this.targetState.pitch, ease);
      this.state.yaw = THREE.MathUtils.lerp(this.tweenStartValues.yaw, this.targetState.yaw, ease);

      if (progress >= 1) {
        this.isTweening = false;
      }
    } else {
      // Responsive Damping towards targetState (crisp, immediate responsiveness without sluggish rubber-banding)
      const damp = 1 - Math.exp(-24 * deltaTime);
      this.state.target.lerp(this.targetState.target, damp);
      this.state.radius = THREE.MathUtils.lerp(this.state.radius, this.targetState.radius, damp);
      this.state.pitch = THREE.MathUtils.lerp(this.state.pitch, this.targetState.pitch, damp);
      this.state.yaw = THREE.MathUtils.lerp(this.state.yaw, this.targetState.yaw, damp);
    }

    this.updateCameraTransform();
  }

  private updateCameraTransform() {
    const { target, radius, pitch, yaw } = this.state;

    // Spherical coordinates around target point
    const y = target.y + radius * Math.cos(pitch);
    const horizontalDist = radius * Math.sin(pitch);
    const x = target.x + horizontalDist * Math.sin(yaw);
    const z = target.z + horizontalDist * Math.cos(yaw);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(target.x, target.y + 1, target.z);
  }
}
