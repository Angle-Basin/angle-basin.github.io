/**
 * Click impulse, pointer drag, and device orientation for the shader field.
 * iOS 13+ requires permission after a user gesture — requested on first pointerdown.
 */

function smoothToward(current: number, target: number, dt: number, halfLifeSec: number): number {
  if (halfLifeSec <= 0) return target;
  const lambda = 0.6931 / halfLifeSec;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export class MotionInput {
  /** 0 … 1, smooth attack/decay (feels less “digital” than an instant spike) */
  clickImpulse = 0;
  clickX = 0;
  clickY = 0;
  private clickTarget = 0;

  /** 0 … 1 — press+drag: motion and sustained hold, smoothed (same “contact” model as waves) */
  drag = 0;

  /** Normalized roughly −1 … 1 from device tilt */
  tiltX = 0;
  tiltY = 0;

  /** PointerEvent.pressure (touch / stylus), smoothed — 0 means “no extra” (mouse) */
  pressure = 0;

  private rawGamma = 0;
  private rawBeta = 0;
  private baseGamma: number | null = null;
  private baseBeta: number | null = null;
  private orientationAttached = false;

  private held = false;
  private moveAccum = 0;
  private lastClientX: number | null = null;
  private lastClientY: number | null = null;
  private pressureTarget = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    canvas.addEventListener("pointermove", this.onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", this.onPointerUp, { passive: true });
    canvas.addEventListener("pointercancel", this.onPointerUp, { passive: true });
  }

  private onPointerDown = (e: PointerEvent): void => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    this.clickX = nx;
    this.clickY = ny;
    this.clickTarget = 1;
    this.held = true;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    this.applyPressureSample(e);

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* no capture in older environments */
    }

    void this.ensureOrientationPermissionAndListen();
  };

  private applyPressureSample(e: PointerEvent): void {
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      this.pressureTarget = e.pressure > 0 && e.pressure <= 1 ? e.pressure : 0.5;
    } else {
      this.pressureTarget = 0;
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.held) return;
    this.applyPressureSample(e);

    let mx = e.movementX;
    let my = e.movementY;
    if ((mx === 0 && my === 0) || (Math.abs(mx) < 1e-6 && Math.abs(my) < 1e-6)) {
      if (this.lastClientX !== null && this.lastClientY !== null) {
        mx = e.clientX - this.lastClientX;
        my = e.clientY - this.lastClientY;
      }
    }
    this.moveAccum += Math.hypot(mx, my);
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.held = false;
    this.lastClientX = null;
    this.lastClientY = null;
    this.pressureTarget = 0;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  /** Safari iOS needs permission; must run in gesture handler (we chain from pointerdown). */
  private async ensureOrientationPermissionAndListen(): Promise<void> {
    const DO = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState>;
    };
    if (typeof DO.requestPermission === "function") {
      try {
        const state = await DO.requestPermission();
        if (state !== "granted") return;
      } catch {
        return;
      }
    }
    this.attachOrientationListener();
  }

  private attachOrientationListener(): void {
    if (this.orientationAttached) return;
    this.orientationAttached = true;
    window.addEventListener(
      "deviceorientation",
      (e: DeviceOrientationEvent) => {
        if (e.gamma == null || e.beta == null) return;
        this.rawGamma = e.gamma;
        this.rawBeta = e.beta;
        if (this.baseGamma === null) {
          this.baseGamma = e.gamma;
          this.baseBeta = e.beta;
        }
      },
      true,
    );
  }

  update(dt: number): void {
    this.clickTarget *= Math.exp(-dt * 1.85);
    if (this.clickTarget < 0.004) this.clickTarget = 0;
    this.clickImpulse = smoothToward(this.clickImpulse, this.clickTarget, dt, 0.05);

    // Drag signal: movement while held + small floor while pressed (coherent with sustained contact)
    let dragTarget = 0;
    if (this.held) {
      const movePart = Math.min(1, this.moveAccum * 0.045);
      dragTarget = Math.min(1, movePart + 0.09);
    }
    this.drag = smoothToward(this.drag, dragTarget, dt, this.held ? 0.065 : 0.12);
    this.moveAccum = 0;

    const pGoal = this.held ? this.pressureTarget : 0;
    this.pressure = smoothToward(this.pressure, pGoal, dt, this.held ? 0.055 : 0.1);

    if (this.baseGamma != null && this.baseBeta != null) {
      const relG = this.rawGamma - this.baseGamma;
      const relB = this.rawBeta - this.baseBeta;
      const targetTx = Math.max(-1, Math.min(1, relG / 28));
      const targetTy = Math.max(-1, Math.min(1, relB / 28));
      this.tiltX = smoothToward(this.tiltX, targetTx, dt, 0.14);
      this.tiltY = smoothToward(this.tiltY, targetTy, dt, 0.14);
    }
  }

  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
