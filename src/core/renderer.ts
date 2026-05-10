import * as THREE from "three";

const BG_COLOR = 0x0a0a0c;

export interface RendererContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  clock: THREE.Clock;
  resolution: THREE.Vector2;
}

export function createRenderer(canvas?: HTMLCanvasElement): RendererContext {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(BG_COLOR, 1);

  if (!canvas) {
    document.body.prepend(renderer.domElement);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  // orthographic camera: coordinates in [-1, 1] range
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    -aspect,
    aspect,
    1,
    -1,
    0.1,
    100,
  );
  camera.position.z = 1;

  const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const a = w / h;
    renderer.setSize(w, h);
    camera.left = -a;
    camera.right = a;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
    resolution.set(w, h);
  });

  return { renderer, scene, camera, clock, resolution };
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
