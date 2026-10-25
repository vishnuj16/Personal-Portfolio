import * as THREE from 'three'
import { darken, hexToRgb } from '../utils/color'

// ── "Cover being drawn" material ───────────────────────────────────────────────
// Gold line-art of the real cover (edge detection) on a dark plate. A scanline
// sweeps down painting in the real colours, holds, then fades back to the sketch.
// Used by the coming-soon book page and the Coming Soon cards on the author page.

const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const frag = /* glsl */ `
  uniform sampler2D uMap; uniform float uTime; uniform float uOffset; uniform vec3 uGold; uniform vec3 uInk;
  varying vec2 vUv;
  float lum(vec2 uv) { return dot(texture2D(uMap, uv).rgb, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec3 color = texture2D(uMap, vUv).rgb;
    vec2 px = vec2(1.0 / 420.0);
    float gx = lum(vUv + vec2(px.x, 0.0)) - lum(vUv - vec2(px.x, 0.0));
    float gy = lum(vUv + vec2(0.0, px.y)) - lum(vUv - vec2(0.0, px.y));
    float edge = clamp(length(vec2(gx, gy)) * 7.0, 0.0, 1.0);
    float hatch = step(0.5, fract((vUv.x + vUv.y) * 90.0)) * (1.0 - lum(vUv)) * 0.12;
    vec3 sketch = uInk + uGold * (edge * 1.1 + hatch);

    // 0 → 1.15: sweep down; 1.15 → 1.45: hold; 1.45 → 1.75: fade back to sketch
    float cyc = mod(uTime + uOffset, 10.0) / 10.0 * 1.75;
    float depth = 1.0 - vUv.y;
    float painted = smoothstep(cyc, cyc - 0.08, depth);
    painted *= 1.0 - smoothstep(1.45, 1.75, cyc);
    vec3 col = mix(sketch, color, painted);
    col += uGold * exp(-abs(depth - cyc) * 70.0) * 1.4 * step(cyc, 1.1);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

const v3 = (r, g, b) => new THREE.Vector3(r / 255, g / 255, b / 255)

export function createSketchCoverMaterial({ map, accent, offset = 0 }) {
  const gold = hexToRgb('#e6c27a')
  const ink = darken(accent, 0.86).match(/\d+/g).map(Number)
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, toneMapped: false,
    uniforms: {
      uMap: { value: map }, uTime: { value: 0 }, uOffset: { value: offset },
      uGold: { value: v3(gold.r, gold.g, gold.b) }, uInk: { value: v3(...ink) },
    },
  })
}
