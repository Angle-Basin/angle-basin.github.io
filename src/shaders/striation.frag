uniform float uTime;
uniform float uClickImpulse;
uniform float uDrag;
uniform float uCalm;
uniform vec2 uTilt;

varying float vAlpha;
varying float vLineIndex;
varying float vField;
varying vec2 vNdc;
varying vec2 vFromMouse;

void main() {
  // base color: warm grey with subtle purple cast
  vec3 baseColor = vec3(0.78, 0.75, 0.82);

  float purpleShift = sin(vLineIndex * 31.4 + 0.5) * 0.5 + 0.5;
  vec3 purple = vec3(0.35, 0.18, 0.45);
  vec3 color = mix(baseColor, purple, purpleShift * 0.15);

  float t = uTime;
  float tSlow = t * (1.0 - 0.3 * uCalm);
  float quiet = mix(0.3, 1.0, 1.0 - uCalm);
  float clickEase = uClickImpulse * uClickImpulse * (3.0 - 2.0 * uClickImpulse);
  vec2 p = vNdc;

  // --- Grey-only modulation (no hue wash): luminance shifts only

  float linePulse = sin(tSlow * 0.26 + vLineIndex * 17.0) * 0.012 * quiet;

  float rho = length(vFromMouse);
  float phaseT = uTilt.x * 0.52 + uTilt.y * 0.38 + uDrag * 0.28;
  float ring =
    sin(rho * 15.5 - tSlow * 1.28 + phaseT) * 0.78 + sin(rho * 8.8 - tSlow * 0.76 + phaseT) * 0.22;
  float ringGain =
    0.0095 * (0.72 + 0.28 * smoothstep(0.0, 0.35, vField)) * (1.0 + uDrag * 0.65) * mix(0.62, 1.0, 1.0 - uCalm);
  float ringGrey = ring * ringGain;

  float a =
    sin(p.x * 8.1 + tSlow * 0.085) * sin(p.y * 8.1 - tSlow * 0.072);
  float b =
    sin((p.x + p.y * 1.08) * 5.4 + tSlow * 0.055) * sin((p.x * 0.92 - p.y) * 4.6 - tSlow * 0.048);
  float lace = (a + b * 0.65) * 0.0085 * quiet;

  float tide = sin(tSlow * 0.024 + p.x * 1.6) * sin(tSlow * 0.018 - p.y * 1.4) * 0.0032 * quiet
             + sin(tSlow * 0.012 + vLineIndex * 12.0) * 0.0022 * quiet;

  float shift = -linePulse + ringGrey + lace + tide;
  shift = clamp(shift, -0.038, 0.038);
  color *= 1.0 + shift;
  float contactLift =
    pow(max(vField, 0.0), 1.08) * 0.014 * (1.0 + uDrag * 0.55) * mix(0.68, 1.0, 1.0 - uCalm) +
    clickEase * 0.015 + uDrag * 0.012;
  color *= 1.0 + contactLift;

  gl_FragColor = vec4(color, vAlpha);
}
