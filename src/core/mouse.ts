/** Tracks normalized mouse/touch position and velocity with heavy smoothing. */

export interface MouseState {
  /** normalized position [-1, 1] */
  x: number;
  y: number;
  /** smoothed velocity magnitude (0+) */
  speed: number;
  /** time since last significant movement (seconds) */
  stillness: number;
}

/** Frame-rate independent exponential smoothing.
 *  halfLife = seconds for the value to move halfway to the target. */
function smoothExp(current: number, target: number, dt: number, halfLife: number): number {
  if (halfLife <= 0) return target;
  const lambda = 0.6931 / halfLife; // ln(2) / halfLife
  const factor = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * factor;
}

export type ViewportSize = { width: number; height: number };

export class MouseTracker {
  private rawX = 0;
  private rawY = 0;
  private speedAccum = 0;
  private moveCount = 0;

  readonly state: MouseState = { x: 0, y: 0, speed: 0, stillness: 10 };

  constructor(private readonly getViewport?: () => ViewportSize) {
    window.addEventListener("mousemove", (e) => this.onMove(e.clientX, e.clientY));
    window.addEventListener(
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        if (t) this.onMove(t.clientX, t.clientY);
      },
      { passive: true },
    );
    window.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    }, { passive: true });
  }

  private viewport(): ViewportSize {
    const v = this.getViewport?.();
    if (v && v.width > 0 && v.height > 0) return v;
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private onMove(cx: number, cy: number): void {
    const { width, height } = this.viewport();
    const newX = (cx / width) * 2 - 1;
    const newY = -((cy / height) * 2 - 1);
    const dx = newX - this.rawX;
    const dy = newY - this.rawY;
    this.speedAccum += Math.sqrt(dx * dx + dy * dy);
    this.moveCount++;
    this.rawX = newX;
    this.rawY = newY;
  }

  update(dt: number): MouseState {
    // position: smooth with 0.15s half-life (glacial, no jerk)
    this.state.x = smoothExp(this.state.x, this.rawX, dt, 0.15);
    this.state.y = smoothExp(this.state.y, this.rawY, dt, 0.15);

    // speed: average accumulated movement per frame, then smooth heavily
    const rawSpeed = this.moveCount > 0 ? this.speedAccum / this.moveCount : 0;
    this.speedAccum = 0;
    this.moveCount = 0;

    // speed rises with 0.2s half-life, decays with 0.5s half-life
    const speedHalfLife = rawSpeed > this.state.speed ? 0.2 : 0.5;
    this.state.speed = smoothExp(this.state.speed, rawSpeed, dt, speedHalfLife);

    if (this.state.speed < 0.0005) {
      this.state.stillness += dt;
    } else {
      this.state.stillness = 0;
    }

    return this.state;
  }
}
