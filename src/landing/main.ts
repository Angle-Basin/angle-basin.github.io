import * as THREE from "three";
import { createRenderer, startLoop } from "../core/renderer.ts";
import { MotionInput } from "../core/motion-input.ts";
import { MouseTracker } from "../core/mouse.ts";
import vertShader from "../shaders/striation.vert?raw";
import fragShader from "../shaders/striation.frag?raw";

const NUM_LINES = 120;
const POINTS_PER_LINE = 400;

function buildStriationGeometry(aspect: number): THREE.BufferGeometry {
  const totalVerts = NUM_LINES * POINTS_PER_LINE;
  const positions = new Float32Array(totalVerts * 3);
  const lineIndices = new Float32Array(totalVerts);
  const pointIndices = new Float32Array(totalVerts);

  let v = 0;
  for (let line = 0; line < NUM_LINES; line++) {
    const normLine = line / NUM_LINES;
    const y = (normLine - 0.5) * 2.0;
    for (let p = 0; p < POINTS_PER_LINE; p++) {
      const normPoint = p / (POINTS_PER_LINE - 1);
      const x = (normPoint - 0.5) * 2.0 * aspect;
      positions[v * 3] = x;
      positions[v * 3 + 1] = y;
      positions[v * 3 + 2] = 0;
      lineIndices[v] = line;
      pointIndices[v] = normPoint;
      v++;
    }
  }

  // build line segment indices
  const indices: number[] = [];
  for (let line = 0; line < NUM_LINES; line++) {
    const base = line * POINTS_PER_LINE;
    for (let p = 0; p < POINTS_PER_LINE - 1; p++) {
      indices.push(base + p, base + p + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aLineIndex", new THREE.BufferAttribute(lineIndices, 1));
  geo.setAttribute("aPointIndex", new THREE.BufferAttribute(pointIndices, 1));
  geo.setIndex(indices);
  return geo;
}

function init(): void {
  const ctx = createRenderer();
  const mouse = new MouseTracker();
  const motion = new MotionInput(ctx.renderer.domElement);

  const aspect = window.innerWidth / window.innerHeight;

  const uniforms = {
    uTime: { value: 0 },
    uMouseX: { value: 0 },
    uMouseY: { value: 0 },
    uSpeed: { value: 0 },
    uStillness: { value: 10 },
    uAspect: { value: aspect },
    uClickImpulse: { value: 0 },
    uClickPos: { value: new THREE.Vector2(0, 0) },
    uDrag: { value: 0 },
    uCalm: { value: 1 },
    uPressure: { value: 0 },
    uTilt: { value: new THREE.Vector2(0, 0) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: vertShader,
    fragmentShader: fragShader,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const geometry = buildStriationGeometry(aspect);
  const mesh = new THREE.LineSegments(geometry, material);
  ctx.scene.add(mesh);

  // rebuild geometry on resize
  window.addEventListener("resize", () => {
    const a = window.innerWidth / window.innerHeight;
    uniforms.uAspect.value = a;
    const newGeo = buildStriationGeometry(a);
    mesh.geometry.dispose();
    mesh.geometry = newGeo;
  });

  startLoop(ctx, (_dt, elapsed) => {
    const m = mouse.update(_dt);
    motion.update(_dt);
    uniforms.uTime.value = elapsed;
    uniforms.uMouseX.value = m.x;
    uniforms.uMouseY.value = m.y;
    uniforms.uSpeed.value = m.speed;
    uniforms.uStillness.value = m.stillness;
    uniforms.uClickImpulse.value = motion.clickImpulse;
    uniforms.uClickPos.value.set(motion.clickX, motion.clickY);
    uniforms.uDrag.value = motion.drag;
    const activity = Math.min(1, motion.drag * 0.82 + motion.clickImpulse * 0.52 + m.speed * 16);
    const c = 1 - activity;
    uniforms.uCalm.value = c * c;
    uniforms.uPressure.value = motion.pressure;
    uniforms.uTilt.value.set(motion.tiltX, motion.tiltY);
  });
}

init();
