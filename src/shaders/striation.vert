uniform float uTime;
uniform float uMouseX;
uniform float uMouseY;
uniform float uSpeed;
uniform float uStillness;
uniform float uAspect;
uniform float uClickImpulse;
uniform vec2 uClickPos;
uniform float uDrag;
uniform float uCalm;
uniform float uPressure;
uniform vec2 uTilt;

attribute float aLineIndex;
attribute float aPointIndex;

varying float vAlpha;
varying float vLineIndex;
varying float vField;
varying vec2 vNdc;
varying vec2 vFromMouse;

void main() {
  float totalLines = 120.0;
  float normalizedLine = aLineIndex / totalLines;

  float baseY = (normalizedLine - 0.5) * 2.0;
  float x = (aPointIndex - 0.5) * 2.0 * uAspect;

  float dx = x - uMouseX * uAspect;
  float dy = baseY - uMouseY;
  float dist = sqrt(dx * dx + dy * dy);

  float cdx = x - uClickPos.x * uAspect;
  float cdy = baseY - uClickPos.y;
  float distClick = sqrt(cdx * cdx + cdy * cdy);

  float rPress = (0.32 + uSpeed * 0.55) * (1.0 + uDrag * 0.22);
  float fieldStrength = exp(-dist * dist / (rPress * rPress));
  vField = fieldStrength;

  // Smoother subjective “click” peak (natural ease — works with smoothed uClickImpulse from JS)
  float clickEase = uClickImpulse * uClickImpulse * (3.0 - 2.0 * uClickImpulse);

  // When calm (no strong pointer interaction), global motion slows and idles more faintly
  float tWave = uTime * (1.0 - 0.3 * uCalm);
  float tIdle = uTime * (0.34 + 0.66 * (1.0 - uCalm));
  float quiet = mix(0.26, 1.0, 1.0 - uCalm);

  float phaseDrag = uDrag * 0.28;
  float phaseTilt = uTilt.x * 0.52 + uTilt.y * 0.38 + phaseDrag;

  float wavePointer = sin(dist * 15.5 - tWave * 1.28 + phaseTilt)
                    + 0.22 * sin(dist * 8.8 - tWave * 0.76 + phaseTilt);
  float waveTap = sin(distClick * 15.5 - tWave * 1.28 + phaseTilt)
                 + 0.22 * sin(distClick * 8.8 - tWave * 0.76 + phaseTilt);

  float dragGain = 1.0 + uDrag * 0.72;
  float deepEase = 1.0 - 0.22 * fieldStrength * fieldStrength;
  float ringLive = wavePointer * fieldStrength * 0.019 * dragGain * deepEase;
  float ringTap = waveTap * clickEase * 0.019 * dragGain * mix(1.0, deepEase, 0.55);

  float pressDepth = (0.11 + uSpeed * 0.03) * (1.0 + uDrag * 0.45);
  if (uPressure > 0.001) {
    float pVar = clamp((uPressure - 0.45) / 0.55, 0.0, 1.0);
    pressDepth *= 1.0 + pVar * 0.34;
  }
  float press = -fieldStrength * pressDepth;

  float dentTap =
    -exp(-distClick * distClick / (0.44 * 0.44)) * clickEase * 0.047 * (1.0 + uDrag * 0.35);

  float lateralShift = fieldStrength * dx * -0.042 * (1.0 + uDrag * 0.5)
    * (1.0 - smoothstep(0.0, rPress * 1.8, dist))
    * (1.0 - 0.24 * fieldStrength * fieldStrength);

  float linePhase = normalizedLine * 17.3 + aPointIndex * 5.1;
  float drift = sin(tIdle * 0.012 + linePhase) * 0.0068 * quiet
              + sin(tIdle * 0.022 + normalizedLine * 23.7) * 0.0042 * quiet;

  float breath = sin(tIdle * 0.009 + normalizedLine * 4.0) * 0.0055 * quiet;

  float idleSway =
    sin(tIdle * 0.0046 + linePhase * 0.65 + aLineIndex * 0.31) * 0.0019 * quiet;
  float idleRoll =
    sin(tIdle * 0.0056 + aPointIndex * 4.4 + normalizedLine * 6.2) * 0.0024 * quiet;

  float agitation = uSpeed * 0.08 * fieldStrength * (1.0 - 0.5 * fieldStrength * fieldStrength);
  float jitter =
    sin(aPointIndex * 24.0 + uTime * 0.95 + aLineIndex * 5.2) * agitation;

  float stillFactor = clamp(uStillness * 0.2, 0.0, 1.0);
  float activeScale = 1.0 - stillFactor * 0.7;

  float finalX = x + lateralShift * activeScale + idleSway;
  float finalY = baseY + press + dentTap + ringLive + ringTap + drift + breath + idleRoll + (jitter * activeScale);

  // Tilt: global lean (same inputs as phaseTilt; keeps device motion in the same “language”)
  finalX += -baseY * uTilt.x * 0.044;
  finalY += (x / max(uAspect, 0.4)) * uTilt.y * 0.032;

  float centerFade = 1.0 - abs(normalizedLine - 0.5) * 1.4;
  float edgeFade = 1.0 - abs(aPointIndex - 0.5) * 1.6;
  vAlpha = max(centerFade * edgeFade * 0.25, 0.012);

  float glow =
    fieldStrength * 0.15 * (1.0 + uDrag * 0.35)
    + clickEase * 0.048 * exp(-distClick * distClick / (0.55 * 0.55)) * (1.0 + uDrag * 0.25);
  vAlpha += glow;

  vLineIndex = normalizedLine;
  vNdc = vec2(finalX, finalY);
  vFromMouse = vec2(finalX - uMouseX * uAspect, finalY - uMouseY);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalX, finalY, 0.0, 1.0);
}
