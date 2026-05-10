import * as THREE from "three";

const BG_COLOR = 0x0a0a0c;

export interface RendererContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  clock: THREE.Clock;
  resolution: THREE.Vector2;
}

/** Fallback when the canvas has not been laid out yet (first paint on some mobile browsers). */
function fallbackViewportCss(): { w: number; h: number } {
  const el = document.documentElement;
  const vv = window.visualViewport;
  const w = Math.max(
    1,
    Math.round(vv?.width ?? el.clientWidth ?? window.innerWidth),
  );
  const h = Math.max(
    1,
    Math.round(vv?.height ?? el.clientHeight ?? window.innerHeight),
  );
  return { w, h };
}

/** Match drawing buffer and ortho frustum to the canvas’s laid-out CSS size (fixes mobile “narrow strip” bugs). */
export function resizeRendererToCanvas(ctx: RendererContext): void {
  const { renderer, camera, resolution } = ctx;
  const canvas = renderer.domElement;
  let w = Math.max(1, Math.round(canvas.clientWidth));
  let h = Math.max(1, Math.round(canvas.clientHeight));
  if (w <= 1 || h <= 1) {
    const fb = fallbackViewportCss();
    w = fb.w;
    h = fb.h;
  }
  const a = w / h;
  renderer.setSize(w, h, false);
  camera.left = -a;
  camera.right = a;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();
  resolution.set(w, h);
}

export function createRenderer(canvas?: HTMLCanvasElement): RendererContext {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BG_COLOR, 1);

  if (!canvas) {
    document.body.prepend(renderer.domElement);
  }
  renderer.domElement.style.zIndex = "0";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 1;

  const resolution = new THREE.Vector2(1, 1);
  const clock = new THREE.Clock();

  const ctx: RendererContext = { renderer, scene, camera, clock, resolution };

  function onViewportChanged(): void {
    resizeRendererToCanvas(ctx);
  }

  window.addEventListener("resize", onViewportChanged);
  window.addEventListener("orientationchange", onViewportChanged);

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", onViewportChanged);
    vv.addEventListener("scroll", onViewportChanged);
  }

  const ro = new ResizeObserver(onViewportChanged);
  ro.observe(renderer.domElement);

  onViewportChanged();
  requestAnimationFrame(() => {
    onViewportChanged();
    requestAnimationFrame(onViewportChanged);
  });

  return ctx;
}

export function startLoop(
  ctx: RendererContext,
  update: (dt: number, elapsed: number) => void,
): void {
  const { renderer, scene, camera, clock } = ctx;
  function frame() {
    requestAnimationFrame(frame);
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    update(dt, elapsed);
    renderer.render(scene, camera);
  }
  frame();
}
