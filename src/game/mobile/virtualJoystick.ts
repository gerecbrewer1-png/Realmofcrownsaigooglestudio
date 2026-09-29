/**
 * REALM OF CROWNS — Mobile Virtual Analog Joystick
 * Ultra-responsive touch drag controller with dynamic/fixed origin and deadzone.
 */

export interface JoystickVector {
  x: number; // -1.0 (left) to 1.0 (right)
  y: number; // -1.0 (up/forward) to 1.0 (down/backward)
  angle: number; // radians
  distance: number; // 0.0 to 1.0
  isActive: boolean;
}

export class VirtualJoystick {
  private baseRadius: number;
  private maxRadius: number;
  private deadzone: number;

  private originX = 0;
  private originY = 0;
  private currentX = 0;
  private currentY = 0;
  private activeTouchId: number | null = null;
  private isActive = false;

  constructor(options?: { baseRadius?: number; maxRadius?: number; deadzone?: number }) {
    this.baseRadius = options?.baseRadius ?? 60;
    this.maxRadius = options?.maxRadius ?? 60;
    this.deadzone = options?.deadzone ?? 0.12;
  }

  public handleTouchStart(touchId: number, pageX: number, pageY: number): void {
    if (this.isActive) return;
    this.activeTouchId = touchId;
    this.originX = pageX;
    this.originY = pageY;
    this.currentX = pageX;
    this.currentY = pageY;
    this.isActive = true;
  }

  public handleTouchMove(touchId: number, pageX: number, pageY: number): void {
    if (!this.isActive || this.activeTouchId !== touchId) return;
    this.currentX = pageX;
    this.currentY = pageY;
  }

  public handleTouchEnd(touchId: number): void {
    if (this.activeTouchId === touchId) {
      this.reset();
    }
  }

  public reset(): void {
    this.isActive = false;
    this.activeTouchId = null;
    this.currentX = this.originX;
    this.currentY = this.originY;
  }

  public getVector(): JoystickVector {
    if (!this.isActive) {
      return { x: 0, y: 0, angle: 0, distance: 0, isActive: false };
    }

    const dx = this.currentX - this.originX;
    const dy = this.currentY - this.originY;
    const rawDist = Math.sqrt(dx * dx + dy * dy);

    if (rawDist <= 0.001) {
      return { x: 0, y: 0, angle: 0, distance: 0, isActive: true };
    }

    const clampedDist = Math.min(rawDist, this.maxRadius);
    const normalizedDist = clampedDist / this.maxRadius;

    if (normalizedDist < this.deadzone) {
      return { x: 0, y: 0, angle: 0, distance: 0, isActive: true };
    }

    // Remap distance outside deadzone to 0..1
    const remappedDist = (normalizedDist - this.deadzone) / (1 - this.deadzone);
    const angle = Math.atan2(dy, dx);

    const normX = (dx / rawDist) * remappedDist;
    const normY = (dy / rawDist) * remappedDist;

    return {
      x: normX,
      y: normY,
      angle,
      distance: remappedDist,
      isActive: true
    };
  }

  public getVisualState() {
    const dx = this.currentX - this.originX;
    const dy = this.currentY - this.originY;
    const rawDist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(rawDist, this.maxRadius);

    const thumbX = rawDist > 0 ? (dx / rawDist) * clampedDist : 0;
    const thumbY = rawDist > 0 ? (dy / rawDist) * clampedDist : 0;

    return {
      isActive: this.isActive,
      originX: this.originX,
      originY: this.originY,
      thumbX,
      thumbY,
      baseRadius: this.baseRadius
    };
  }
}
