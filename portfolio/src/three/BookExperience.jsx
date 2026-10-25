import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  makeBookTextures, makeGlyphAtlas, GLYPH_COUNT,
  makeGlowTexture, makePlaqueTextures, PLAQUE_RATIO,
} from './textures'
import { hexToRgb, darken } from '../utils/color'

// ── Immersive book page scene ──────────────────────────────────────────────────
// One fixed, full-screen canvas behind the HTML. Every frame it measures a few
// DOM anchors (hero cover slot, the pinned "stage", the blurb, the buy section)
// and places 3D objects to match, so layout stays in HTML and the 3D follows it.
//
//   Smoke   — slow domain-warped noise in the book's colour (the backdrop)
//   Embers  — additive glowing motes drifting upward, parallax with scroll
//   Reader  — the same book lying open under the blurb, pages glowing
//   Glyphs  — gold letters rising out of that book in a fountain, into the margins
//   Plaque  — engraved brushed-gold plate with the book's details
//   Wreath  — gold laurel wreath that grows in behind each pull quote, and the
//             festival-style laurels framing the top review in the hero
//   Lantern — a warm, flickering glow in the smoke behind the blurb's text column
//   Book    — real 3D book: hinged cover + flipping sheets. Glides from the hero
//             to the pinned stage, then opens on scroll to the opening line.
//   Copy    — a small turning copy beside the buy buttons

const FOV = 35
const CAM_Z = 12
const clamp01 = v => Math.max(0, Math.min(1, v))
const smooth = t => t * t * (3 - 2 * t)
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a, b, t) => a + (b - a) * t
const range = (v, a, b) => clamp01((v - a) / (b - a))

const pointer = { x: 0, y: 0 } // -1..1, updated by a window listener

const vec3 = hex => {
  const { r, g, b } = hexToRgb(hex)
  return new THREE.Vector3(r / 255, g / 255, b / 255)
}
const rgbStr = str => {
  const m = str.match(/\d+/g).map(Number)
  return new THREE.Vector3(m[0] / 255, m[1] / 255, m[2] / 255)
}

export default function BookExperience(props) {
  useEffect(() => {
    const onMove = e => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <Canvas
      camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 80 }}
      dpr={props.isMobile ? 1 : [1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <Scene {...props} />
    </Canvas>
  )
}

// The book starts opening while it is still gliding in (stage top at 45% of the
// viewport) and is fully open one viewport of scrolling later; the rest is a hold.
const OPEN_LEAD = 0.45

function Scene({ book, accent, coverSrc, page, plaque, anchors, isMobile, onReady }) {
  const { gl, scene } = useThree()
  const [assets, setAssets] = useState(null)
  const m = useRef({ vw: 1, vh: 1, worldW: 1, worldH: 1, px: 1, scroll: 0, tIn: 0, open: 0, aboutFocus: 0 }).current

  useEffect(() => {
    let alive = true
    makeBookTextures({ title: book.title, subtitle: book.subtitle, page, accent, coverSrc })
      .then(a => { if (alive) setAssets(a) })
    return () => { alive = false }
    // page is rebuilt each render; compare by content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.title, book.subtitle, JSON.stringify(page), accent, coverSrc])

  useEffect(() => { if (assets) onReady?.() }, [assets, onReady])

  // Soft studio reflections without downloading an HDR
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => { scene.environment = null; env.dispose(); pmrem.dispose() }
  }, [gl, scene])

  // Measure DOM anchors once per frame, before everything else updates
  useFrame(({ size }) => {
    m.vw = size.width
    m.vh = size.height
    m.worldH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)
    m.worldW = (m.worldH * m.vw) / m.vh
    m.px = m.worldH / m.vh
    const rect = r => r.current?.getBoundingClientRect() || null
    m.hero = rect(anchors.heroSlot)
    m.stage = rect(anchors.stage)
    m.stageInner = rect(anchors.stageInner)
    m.about = rect(anchors.about)
    m.copy = rect(anchors.copySlot)
    m.plaque = rect(anchors.plaque)
    m.pulls = [rect(anchors.pull0)]
    m.heroQuote = rect(anchors.heroQuote)
    m.blurb = rect(anchors.blurbText)
    m.scroll = window.scrollY / m.vh
    m.tIn = m.stage ? clamp01(1 - m.stage.top / m.vh) : 0
    m.open = m.stage ? clamp01((OPEN_LEAD * m.vh - m.stage.top) / m.vh) : 0
    m.callouts = anchors.callouts?.current || null
    const blurb = rect(anchors.blurbText)
    if (blurb) {
      // The lamp hangs at the middle of the screen while the text scrolls past it
      const cy = Math.min(Math.max(m.vh * 0.5, blurb.top + 120), Math.max(blurb.top + 120, blurb.bottom - 120))
      m.focusX = (blurb.left + blurb.width / 2) / m.vw
      m.focusY = 1 - cy / m.vh
      m.focusAmt = m.aboutFocus
      // Text column in uv space (y up), padded a little, for keeping it calm and legible
      const pad = 28
      m.textRect = [
        (blurb.left - pad) / m.vw, 1 - (blurb.bottom + pad) / m.vh,
        (blurb.right + pad) / m.vw, 1 - (blurb.top - pad) / m.vh,
      ]
    } else { m.focusAmt = 0; m.textRect = null }
    m.aboutFocus = m.about
      ? clamp01(1 - Math.abs(m.about.top + m.about.height / 2 - m.vh / 2) / (m.about.height / 2 + m.vh * 0.5))
      : 0
    if (anchors.stage.current) anchors.stage.current.style.setProperty('--book-open', m.open.toFixed(3))
  }, -1)

  return (
    <>
      <color attach="background" args={['#070605']} />
      <fog attach="fog" args={['#070605', 11, 30]} />
      <Smoke accent={accent} m={m} isMobile={isMobile} />
      <Embers accent={accent} m={m} isMobile={isMobile} />
      <Lights accent={accent} />
      <Glyphs m={m} isMobile={isMobile} />
      {assets && <HeroBook assets={assets} accent={accent} pages={book.pages} m={m} isMobile={isMobile} />}
      {assets && <CopyBook assets={assets} accent={accent} pages={book.pages} m={m} />}
      {assets && <ReaderBook assets={assets} accent={accent} pages={book.pages} m={m} isMobile={isMobile} />}
      {plaque && <Plaque data={plaque} m={m} />}
      <Wreath shape={PULL_WREATH} getRect={pullRect0} m={m} isMobile={isMobile} />
      <Wreath shape={HERO_LAURELS} getRect={heroQuoteRect} m={m} isMobile={isMobile} />
    </>
  )
}

// ── Smoke backdrop ─────────────────────────────────────────────────────────────

const smokeVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`
const smokeFrag = /* glsl */ `
  precision highp float;
  uniform float uTime; uniform vec2 uRes; uniform float uScroll; uniform vec2 uMouse; uniform float uGlow;
  uniform vec3 uDeep; uniform vec3 uTint; uniform vec3 uGold;
  uniform vec2 uFocus; uniform float uFocusAmt; uniform vec4 uRect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 p = (vUv - 0.5) * asp * 2.4;
    p.y -= uScroll * 0.45;
    float t = uTime * 0.03;
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.4 + uMouse * 0.25),
                  fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
    float f = fbm(p + 2.6 * r);
    vec3 col = uDeep;
    col = mix(col, uTint, smoothstep(0.32, 0.95, f) * 0.62);
    col += uGold * pow(smoothstep(0.5, 1.0, f * (0.6 + length(r) * 0.6)), 2.0) * 0.42;
    float d = length((vUv - 0.5) * asp);
    col += uTint * uGlow * 0.55 * smoothstep(0.75, 0.0, d);
    col += uGold * uGlow * 0.12 * smoothstep(0.35, 0.0, d);
    // Lantern behind the blurb: warm, soft, with a slow candle flicker
    float fd = length((vUv - uFocus) * asp);
    float flicker = 0.92 + 0.05 * sin(uTime * 6.3) * sin(uTime * 2.7) + 0.03 * sin(uTime * 13.1);
    col += uGold * uFocusAmt * 0.2 * flicker * smoothstep(0.55, 0.0, fd);
    col += uTint * uFocusAmt * 0.22 * smoothstep(1.0, 0.1, fd);
    // Calm, darker water behind the text itself; the glow stays as a halo around it
    vec2 outR = max(max(uRect.xy - vUv, vUv - uRect.zw), 0.0) * asp;
    float inText = 1.0 - smoothstep(0.0, 0.09, length(outR));
    col *= 1.0 - inText * uFocusAmt * 0.5;
    col *= mix(1.0, 0.42, smoothstep(0.3, 1.05, d) * (1.0 - uFocusAmt * 0.35));
    col += (hash(vUv * uRes + fract(uTime)) - 0.5) * 0.022;
    gl_FragColor = vec4(col, 1.0);
  }
`

function Smoke({ accent, m, isMobile }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: smokeVert,
    fragmentShader: smokeFrag,
    defines: { OCTAVES: isMobile ? 4 : 5 },
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2() }, uGlow: { value: 0 },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uFocusAmt: { value: 0 },
      uRect: { value: new THREE.Vector4(2, 2, 3, 3) },
      uDeep: { value: rgbStr(darken(accent, 0.9)) },
      uTint: { value: rgbStr(darken(accent, 0.45)) },
      uGold: { value: vec3('#d9b56a') },
    },
  }), [accent, isMobile])

  useFrame(({ clock, size }) => {
    const u = mat.uniforms
    u.uTime.value = clock.elapsedTime
    u.uRes.value.set(size.width, size.height)
    u.uScroll.value = m.scroll
    u.uMouse.value.x = lerp(u.uMouse.value.x, pointer.x, 0.03)
    u.uMouse.value.y = lerp(u.uMouse.value.y, -pointer.y, 0.03)
    const target = 0.18 + m.tIn * 0.35 + Math.sin(Math.PI * m.open) * 0.45 * m.tIn
    u.uGlow.value = lerp(u.uGlow.value, target, 0.06)
    if (m.focusAmt > 0) u.uFocus.value.set(lerp(u.uFocus.value.x, m.focusX, 0.1), lerp(u.uFocus.value.y, m.focusY, 0.1))
    u.uFocusAmt.value = lerp(u.uFocusAmt.value, m.focusAmt || 0, 0.06)
    if (m.textRect) u.uRect.value.set(...m.textRect)
  })

  return (
    <mesh frustumCulled={false} renderOrder={-10} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

// ── Embers ─────────────────────────────────────────────────────────────────────

const emberVert = /* glsl */ `
  attribute float aSize; attribute float aPhase; attribute float aSpeed;
  uniform float uTime; uniform float uScroll; uniform float uPR; uniform float uHeight;
  varying float vAlpha; varying float vMix;
  void main() {
    vec3 p = position;
    float y = p.y + uTime * aSpeed + uScroll * (0.9 + (p.z + 6.0) * 0.16);
    p.y = mod(y + uHeight * 0.5, uHeight) - uHeight * 0.5;
    p.x += sin(uTime * 0.35 + aPhase * 6.2831) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (60.0 / -mv.z);
    vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.7 + aPhase * 40.0));
    vMix = aPhase;
  }
`
const emberFrag = /* glsl */ `
  uniform vec3 uColA; uniform vec3 uColB;
  varying float vAlpha; varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(mix(uColA, uColB, vMix), a * vAlpha * 0.85);
  }
`

function Embers({ accent, m, isMobile }) {
  const { size, viewport } = useThree()
  const count = isMobile ? 220 : 520
  const height = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360) * 1.7

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const sizeA = new Float32Array(count)
    const phase = new Float32Array(count)
    const speed = new Float32Array(count)
    const halfW = (height / 1.7) * (size.width / size.height) * 0.75
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * halfW
      pos[i * 3 + 1] = (Math.random() - 0.5) * height
      pos[i * 3 + 2] = -6 + Math.random() * 10
      sizeA[i] = 0.8 + Math.pow(Math.random(), 3) * 3
      phase[i] = Math.random()
      speed[i] = 0.08 + Math.random() * 0.22
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: emberVert,
    fragmentShader: emberFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uScroll: { value: 0 }, uPR: { value: 1 }, uHeight: { value: height },
      uColA: { value: vec3('#e8c27a') },
      uColB: { value: vec3(accent) },
    },
  }), [accent, height])

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uScroll.value = m.scroll
    mat.uniforms.uPR.value = viewport.dpr
  })

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
}

// ── Lights ─────────────────────────────────────────────────────────────────────

function Lights({ accent }) {
  const sweep = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Off to the side and high, so it glints across the cover instead of glaring head-on
    if (sweep.current) sweep.current.position.set(Math.sin(t * 0.35) * 6, 3 + Math.cos(t * 0.27) * 1.5, 3)
  })
  return (
    <>
      <ambientLight intensity={0.45} color="#ffe9cc" />
      <directionalLight position={[-4, 5, 8]} intensity={1.45} color="#fff0d8" />
      <pointLight position={[4.5, 3, -2]} intensity={40} distance={22} color={accent} />
      <pointLight ref={sweep} intensity={7} distance={16} color="#fff4e0" />
    </>
  )
}

// ── Loose letters ──────────────────────────────────────────────────────────────
// Gold Garamond glyphs drifting off the page around the blurb. One draw call:
// points sample a glyph atlas, each rotated in the fragment shader.

// position.x = start across the open pages (-0.5..0.5 of the spread), position.z = depth jitter
const glyphVert = /* glsl */ `
  attribute float aSize; attribute float aPhase; attribute float aSpeed; attribute float aGlyph; attribute float aSpin;
  uniform float uTime; uniform float uPR; uniform vec4 uAvoid;
  uniform vec3 uOrigin; uniform float uBookW; uniform float uRise; uniform float uSpread;
  varying float vGlyph; varying float vAngle; varying float vDepth; varying float vAvoid; varying float vLife;
  void main() {
    float y = mod(uTime * aSpeed + aPhase * uRise, uRise);
    float k = y / uRise;
    float side = position.x < 0.0 ? -1.0 : 1.0;
    vec3 p = uOrigin + vec3(
      position.x * uBookW + side * pow(k, 0.75) * uSpread + sin(uTime * 0.5 + aPhase * 6.2831) * 0.3 * k,
      y,
      position.z - k * 1.2);
    vLife = smoothstep(0.0, 0.06, k) * (1.0 - smoothstep(0.65, 1.0, k));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (90.0 / -mv.z);
    vGlyph = aGlyph;
    vAngle = aPhase * 6.2831 + uTime * aSpin;
    vDepth = clamp(1.15 - (-mv.z - 8.0) / 12.0, 0.25, 1.0);
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 out2 = max(max(uAvoid.xy - ndc, ndc - uAvoid.zw), 0.0);
    vAvoid = smoothstep(0.0, 0.14, length(out2));   // 0 behind the text, 1 clear of it
  }
`
const glyphFrag = /* glsl */ `
  uniform sampler2D uAtlas; uniform float uOpacity; uniform vec3 uColor; uniform float uCols;
  varying float vGlyph; varying float vAngle; varying float vDepth; varying float vAvoid; varying float vLife;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vAngle), k = cos(vAngle);
    c = mat2(k, -s, s, k) * c + 0.5;
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) discard;
    float col = mod(vGlyph, uCols), row = floor(vGlyph / uCols);
    vec2 uv = vec2((col + c.x) / uCols, 1.0 - (row + c.y) / uCols);
    float a = texture2D(uAtlas, uv).a * uOpacity * vDepth * vLife * mix(0.06, 1.0, vAvoid);
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * (0.8 + 0.4 * vDepth), a);
  }
`

function Glyphs({ m, isMobile }) {
  const [atlas, setAtlas] = useState(null)
  useEffect(() => {
    let alive = true
    makeGlyphAtlas().then(t => { if (alive) setAtlas(t) })
    return () => { alive = false }
  }, [])

  const count = isMobile ? 60 : 140
  const { viewport } = useThree()

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const attrs = { aSize: [], aPhase: [], aSpeed: [], aGlyph: [], aSpin: [] }
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) || 0.01
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.2
      attrs.aSize.push(2 + Math.pow(Math.random(), 2.2) * 5.5)
      attrs.aPhase.push(Math.random())
      attrs.aSpeed.push(0.45 + Math.random() * 0.75)
      attrs.aGlyph.push(Math.floor(Math.random() * GLYPH_COUNT))
      attrs.aSpin.push((Math.random() - 0.5) * 0.5)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(v), 1))
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  const mat = useMemo(() => atlas && new THREE.ShaderMaterial({
    vertexShader: glyphVert,
    fragmentShader: glyphFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uPR: { value: 1 },
      uOrigin: { value: new THREE.Vector3(0, -99, 0) }, uBookW: { value: 2 }, uRise: { value: 9 }, uSpread: { value: 4 },
      uAtlas: { value: atlas.texture }, uCols: { value: atlas.cols },
      uOpacity: { value: 0 }, uColor: { value: vec3('#e8c98a') },
      uAvoid: { value: new THREE.Vector4(2, 2, 3, 3) },
    },
  }), [atlas])

  useFrame(({ clock }) => {
    if (!mat) return
    const u = mat.uniforms
    u.uTime.value = clock.elapsedTime
    u.uPR.value = viewport.dpr
    u.uOpacity.value = lerp(u.uOpacity.value, 0.75 * (m.readerShown || 0), 0.05)
    if (m.reader) {
      u.uOrigin.value.copy(m.reader.origin)
      u.uBookW.value = m.reader.width
      u.uRise.value = m.worldH * 1.05
      u.uSpread.value = m.worldW * 0.3
    }
    if (m.textRect) {
      const [x0, y0, x1, y1] = m.textRect
      u.uAvoid.value.set(x0 * 2 - 1, y0 * 2 - 1, x1 * 2 - 1, y1 * 2 - 1)
    }
  })

  if (!mat) return null
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />
}

// ── The book ───────────────────────────────────────────────────────────────────

const inkVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
// uOrder.r = when this glyph gets written (0..1), uOrder.a = glyph coverage
const inkFrag = /* glsl */ `
  uniform sampler2D uBase; uniform sampler2D uOrder; uniform float uProgress;
  uniform vec3 uTint; uniform vec3 uInk; uniform vec3 uGlow;
  varying vec2 vUv;
  void main() {
    vec3 col = texture2D(uBase, vUv).rgb * uTint;
    vec4 o = texture2D(uOrder, vUv);
    float ord = o.a > 0.002 ? o.r / o.a : 1.0;       // un-premultiply: true write order at edges too
    float written = smoothstep(ord - 0.012, ord, uProgress);
    float age = uProgress - ord;                      // how long ago this letter was written
    float fresh = written * (1.0 - smoothstep(0.0, 0.2, age));
    col = mix(col, uInk, o.a * written * (1.0 - fresh * 0.85));
    col += uGlow * o.a * fresh * 1.4;                 // wet, glowing ink
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

const SHEETS = 2

function useBookParts(assets, accent, pages) {
  return useMemo(() => {
    const w = 1
    const h = assets.aspect
    const c = 0.024
    const t = Math.min(0.24, Math.max(0.06, (pages || 220) / 900))
    const T = t + 2 * c

    const std = o => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o })
    const plain = std({ color: new THREE.Color(darken(accent, 0.5)), roughness: 0.5 })
    const endpaper = std({ color: new THREE.Color(darken(accent, 0.62)), roughness: 0.85 })
    const front = std({ map: assets.cover, roughness: 0.62, envMapIntensity: 0.12 })
    const spine = std({ map: assets.spine, roughness: 0.45, envMapIntensity: 0.5 })
    const top = std({ map: assets.edgeTop, roughness: 0.95 })
    const side = std({ map: assets.edgeSide, roughness: 0.95 })
    // Printed pages are unlit and skip tone mapping so paper and ink keep their true colours;
    // the gutter shading is painted into the texture
    const page = map => new THREE.MeshBasicMaterial({ map, color: '#ece4d2', toneMapped: false })
    const sheet = page(assets.sheet)
    const titleP = page(assets.title)
    const shadow = new THREE.MeshBasicMaterial({ map: assets.shadow, transparent: true, depthWrite: false, opacity: 0.7 })

    // Right page: the main text is "written" by a shader from the ink-order map
    const ink = new THREE.ShaderMaterial({
      uniforms: {
        uBase: { value: assets.page.base },
        uOrder: { value: assets.page.order },
        uProgress: { value: 0 },
        uTint: { value: new THREE.Color('#ece4d2') },
        uInk: { value: new THREE.Color('#2a2118') },
        uGlow: { value: new THREE.Color('#ffb54a') },
      },
      vertexShader: inkVert,
      fragmentShader: inkFrag,
      toneMapped: false,
    })

    // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
    return {
      w, h, c, t, T,
      geo: {
        cover: new THREE.BoxGeometry(w, h, c),
        spine: new THREE.BoxGeometry(c, h, T),
        block: new THREE.BoxGeometry(w - 0.03, h - 0.04, t),
        sheet: new THREE.BoxGeometry(w - 0.04, h - 0.05, 0.002),
        shadow: new THREE.PlaneGeometry(w * 2.2, h * 1.5),
      },
      inkUniforms: ink.uniforms,
      inkChars: assets.page.chars,
      mat: {
        back: [plain, plain, plain, plain, endpaper, plain],
        front: [plain, plain, plain, plain, front, endpaper],
        spine: [plain, spine, plain, plain, plain, plain],
        block: [side, side, top, top, ink, sheet],
        sheet: [sheet, sheet, sheet, sheet, sheet, sheet],
        lastSheet: [sheet, sheet, sheet, sheet, sheet, titleP],
        shadow,
      },
    }
  }, [assets, accent, pages])
}

function BookModel({ parts, driver }) {
  const { w, h, c, T, geo, mat } = parts
  const blockTop = T / 2 - c
  const coverPivot = useRef()
  const sheetPivots = useRef([])

  useFrame(() => {
    const o = driver.open
    const coverA = easeInOut(range(o, 0.0, 0.38))
    if (coverPivot.current) coverPivot.current.rotation.y = -coverA * Math.PI * 0.99
    sheetPivots.current.forEach((p, i) => {
      if (!p) return
      const start = 0.22 + i * 0.12
      const a = easeInOut(range(o, start, start + 0.26))
      p.rotation.y = -a * Math.PI * (0.985 - i * 0.02)
      // Lift the hinge as the page turns so it lands on top of the open cover, not under it
      p.position.z = lerp(blockTop - 0.0015 - i * 0.003, T / 2 + 0.004 + i * 0.003, a)
      // a page bends up as it lifts — fake it with a little lift on x
      p.rotation.x = Math.sin(a * Math.PI) * 0.06
    })
  })

  return (
    <group>
      <mesh geometry={geo.shadow} material={mat.shadow} position={[0.12, -0.12, -T / 2 - 0.06]} />
      <mesh geometry={geo.cover} material={mat.back} position={[0, 0, -T / 2 + c / 2]} />
      <mesh geometry={geo.spine} material={mat.spine} position={[-w / 2 - c / 2, 0, 0]} />
      <mesh geometry={geo.block} material={mat.block} position={[-0.015, 0, 0]} />
      {Array.from({ length: SHEETS }, (_, i) => (
        <group key={i} ref={el => (sheetPivots.current[i] = el)} position={[-w / 2 + 0.004, 0, blockTop - 0.0015 - i * 0.003]}>
          <mesh
            geometry={geo.sheet}
            material={i === SHEETS - 1 ? mat.lastSheet : mat.sheet}
            position={[(w - 0.04) / 2, 0, 0]}
          />
        </group>
      ))}
      <group ref={coverPivot} position={[-w / 2, 0, T / 2 - c / 2]}>
        <mesh geometry={geo.cover} material={mat.front} position={[w / 2, 0, 0]} />
      </group>
    </group>
  )
}

const CALLOUT_ANCHORS = (w, h, T) => [
  new THREE.Vector3(w / 2, h / 2, T / 2),   // top fore-edge corner
  new THREE.Vector3(w / 2, h * 0.05, 0),    // middle of the page edges
  new THREE.Vector3(w / 2, -h * 0.22, 0),   // lower fore-edge
]
const tmp = new THREE.Vector3()

function HeroBook({ assets, accent, pages, m, isMobile }) {
  const parts = useBookParts(assets, accent, pages)
  const root = useRef()
  const driver = useRef({ open: 0, reveal: 0 }).current
  const smoothOpen = useRef(0)
  const born = useRef(null)
  const { camera } = useThree()
  const anchorPts = useMemo(() => CALLOUT_ANCHORS(parts.w, parts.h, parts.T), [parts])

  useFrame(({ clock }, delta) => {
    const g = root.current
    if (!g || (!m.hero && !m.stageInner)) return
    const { w, h } = parts
    const toX = px => (px / m.vw - 0.5) * m.worldW
    const toY = py => -(py / m.vh - 0.5) * m.worldH

    const hero = m.hero
    const hx = hero ? toX(hero.left + hero.width / 2) : 0
    const hy = hero ? toY(hero.top + hero.height / 2) : m.worldH
    const heroScale = hero ? (hero.height * m.px * 0.9) / h : 1

    const st = m.stageInner
    const sx = st ? toX(st.left + st.width / 2) : 0
    const sy = st ? toY(st.top + st.height * 0.47) : -m.worldH
    const stageScale = Math.min((m.worldH * 0.66) / h, (m.worldW * (isMobile ? 0.9 : 0.6)) / (2 * w))

    const k = smooth(m.tIn)
    smoothOpen.current = lerp(smoothOpen.current, m.open, 0.16)
    driver.open = smoothOpen.current
    const spread = easeInOut(range(driver.open, 0, 0.38))

    // On phones the spread is small, so finish by pushing in on the right page (the opening line)
    const focus = isMobile ? easeInOut(range(driver.open, 0.58, 0.82)) : 0
    const s = lerp(heroScale, stageScale, k) * (1 + 0.8 * focus)
    const bob = Math.sin(clock.elapsedTime * 1.1) * 0.035 * s * (1 - spread)
    g.scale.setScalar(s)
    g.position.set(lerp(hx, sx, k) + (w / 2) * s * spread * (1 - focus), lerp(hy, sy, k) + bob, 0)

    const follow = 1 - k * 0.6
    g.rotation.y = lerp(0.42, 0, k) + pointer.x * 0.28 * follow
    g.rotation.x = lerp(-0.05, -0.16, k) + pointer.y * 0.14 * follow
    g.rotation.z = lerp(0.03, 0, k)

    const screenY = (-g.position.y / m.worldH + 0.5) * m.vh
    g.visible = screenY > -m.vh * 0.9 && screenY < m.vh * 1.9

    // Ink: once the book has settled open (and, on phones, pushed in), write the line
    const settled = driver.open > (isMobile ? 0.84 : 0.62)
    // The whole line in ~1–2 s, however long it is
    const speed = 1 / Math.min(1.8, Math.max(0.8, parts.inkChars / 45))
    driver.reveal = settled ? Math.min(1.08, driver.reveal + delta * speed) : Math.max(0, driver.reveal - delta * 1.5)
    parts.inkUniforms.uProgress.value = driver.reveal

    // Museum-style callouts: project anchor points on the book to the screen
    const el = m.callouts
    if (el) {
      if (born.current === null) born.current = clock.elapsedTime
      const fade = smooth(clamp01((clock.elapsedTime - born.current - 0.9) / 1.2)) * (1 - smooth(clamp01(m.tIn * 6)))
      el.style.opacity = fade.toFixed(3)
      if (fade > 0) {
        g.updateMatrixWorld(true)
        const lines = el.querySelectorAll('line')
        const dots = el.querySelectorAll('circle')
        const labels = el.querySelectorAll('[data-label]')
        const pts = anchorPts.map(p => {
          tmp.copy(p).applyMatrix4(g.matrixWorld).project(camera)
          return [(tmp.x + 1) / 2 * m.vw, (1 - tmp.y) / 2 * m.vh]
        })
        const labelX = Math.max(...pts.map(p => p[0])) + 70
        labels.forEach((lab, i) => {
          const [ax, ay] = pts[i] || pts[0]
          const ly = ay - 14
          lab.style.transform = `translate(${labelX}px, ${ly}px)`
          lines[i]?.setAttribute('x1', ax); lines[i]?.setAttribute('y1', ay)
          lines[i]?.setAttribute('x2', labelX - 10); lines[i]?.setAttribute('y2', ay)
          dots[i]?.setAttribute('cx', ax); dots[i]?.setAttribute('cy', ay)
        })
      }
    }
  })

  return <group ref={root}><BookModel parts={parts} driver={driver} /></group>
}

function CopyBook({ assets, accent, pages, m }) {
  const parts = useBookParts(assets, accent, pages)
  const root = useRef()
  const driver = useRef({ open: 0 }).current

  useFrame(({ clock }) => {
    const g = root.current
    const r = m.copy
    if (!g) return
    if (!r || r.bottom < -100 || r.top > m.vh + 100) { g.visible = false; return }
    g.visible = true
    const t = clock.elapsedTime
    const s = (r.height * m.px * 0.86) / parts.h
    g.scale.setScalar(s)
    g.position.set(
      ((r.left + r.width / 2) / m.vw - 0.5) * m.worldW,
      -((r.top + r.height / 2) / m.vh - 0.5) * m.worldH + Math.sin(t * 1.3) * 0.03 * s,
      0,
    )
    g.rotation.set(-0.08 + pointer.y * 0.1, 0.55 + Math.sin(t * 0.55) * 0.4 + pointer.x * 0.2, 0.02)
  })

  return <group ref={root}><BookModel parts={parts} driver={driver} /></group>
}

// ── Reader: the book lying open under the blurb ────────────────────────────────
// Sits at the foot of the screen while the blurb is in view, pages glowing, and
// is the source of the rising letters (it publishes its position on `m.reader`).

const readerOrigin = new THREE.Vector3()

function ReaderBook({ assets, accent, pages, m, isMobile }) {
  const parts = useBookParts(assets, accent, pages)
  const root = useRef()
  const glow = useRef()
  const driver = useRef({ open: 1 }).current
  const glowTex = useMemo(() => makeGlowTexture(), [])
  const shown = useRef(0)

  // Its first page is already written; pages dimmed so they glow softly under the text
  useEffect(() => {
    parts.inkUniforms.uProgress.value = 1.2
    parts.inkUniforms.uTint.value.set('#8f8674')
    parts.mat.sheet[0].color.set('#8f8674')
    parts.mat.lastSheet[5].color.set('#8f8674')
  }, [parts])

  useFrame(({ clock }) => {
    const g = root.current
    if (!g || !glow.current) return
    const b = m.blurb
    // Only while the blurb's text fills the middle of the screen
    const reading = b && b.top < m.vh * 0.5 && b.bottom > m.vh * 0.55
    shown.current = lerp(shown.current, reading ? 1 : 0, 0.05)
    m.readerShown = shown.current
    if (!b || shown.current < 0.01) {
      g.visible = glow.current.visible = false
      m.reader = null
      return
    }
    g.visible = glow.current.visible = true
    const { w, h } = parts
    const t = clock.elapsedTime
    const s = Math.min(b.width * m.px * 0.95, m.worldW * (isMobile ? 0.9 : 0.55)) / (2 * w)
    const cx = ((b.left + b.width / 2) / m.vw - 0.5) * m.worldW
    // Lies just below the foot of the screen with only its top edge showing; rises in on arrival
    const y = -m.worldH / 2 - h * s * 0.2 - (1 - shown.current) * h * s * 0.8

    g.scale.setScalar(s)
    g.position.set(cx + (w / 2) * s, y, 0)
    g.rotation.set(-1.12 + Math.sin(t * 0.4) * 0.02, Math.sin(t * 0.25) * 0.05 + pointer.x * 0.06, 0)

    glow.current.position.set(cx, y + h * s * 0.32, 0.4)
    glow.current.scale.set(2 * w * s * 1.6, h * s * 1.2, 1)
    glow.current.material.opacity = 0.32 * shown.current * (0.92 + 0.08 * Math.sin(t * 5.3) * Math.sin(t * 2.1))

    m.reader = { origin: readerOrigin.set(cx, y + h * s * 0.15, -0.6), width: 2 * w * s * 0.8 }
  })

  return (
    <>
      <group ref={root}><BookModel parts={parts} driver={driver} /></group>
      <mesh ref={glow} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} color="#ffcf7a" transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

// ── Engraved gold plaque ───────────────────────────────────────────────────────

function Plaque({ data, m }) {
  const [tex, setTex] = useState(null)
  const key = JSON.stringify(data)
  useEffect(() => {
    let alive = true
    makePlaqueTextures(data).then(t => { if (alive) setTex(t) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const geo = useMemo(() => new THREE.BoxGeometry(1, PLAQUE_RATIO, 0.045), [])
  const mats = useMemo(() => {
    if (!tex) return null
    const gold = new THREE.MeshStandardMaterial({ color: '#c99a48', metalness: 1, roughness: 0.32, envMapIntensity: 1.1 })
    const face = new THREE.MeshStandardMaterial({
      map: tex.map, bumpMap: tex.bump, bumpScale: 2.5,
      metalness: 0.85, roughness: 0.36, envMapIntensity: 1.0,
    })
    return [gold, gold, gold, gold, face, gold]
  }, [tex])
  const ref = useRef()

  useFrame(({ clock }) => {
    const g = ref.current
    const r = m.plaque
    if (!g) return
    if (!r || r.bottom < -80 || r.top > m.vh + 80) { g.visible = false; return }
    g.visible = true
    const t = clock.elapsedTime
    g.scale.setScalar((r.height * m.px) / PLAQUE_RATIO * 0.97)
    g.position.set(((r.left + r.width / 2) / m.vw - 0.5) * m.worldW, -((r.top + r.height / 2) / m.vh - 0.5) * m.worldH, 0)
    g.rotation.set(-pointer.y * 0.12 + Math.sin(t * 0.5) * 0.02, pointer.x * 0.2 + Math.sin(t * 0.35) * 0.06, 0)
  })

  if (!mats) return null
  return <mesh ref={ref} geometry={geo} material={mats} />
}

// ── Laurel wreath behind a pull quote ──────────────────────────────────────────
// Two branches of polished gold leaves on an ellipse around the quote, open at
// the top. Leaves grow in from the base when the quote arrives; the wreath sways.

// Angles run from the bottom of the ellipse (0) up each side; > π/2 curls inward at the top
const PULL_WREATH = {
  steps: 20, theta0: 0.06, theta1: 2.7, berries: true,
  rx: (r, mob) => Math.min(r.width * (mob ? 0.48 : 0.34), 470),
  ry: r => Math.max(r.height * 0.4, 150),
  leaf: (rx, ry, mob) => Math.min(rx, ry) * (mob ? 0.13 : 0.24),
}
// Film-festival laurels: two tall branches either side of the text, open top and bottom
const HERO_LAURELS = {
  steps: 11, theta0: 0.6, theta1: 2.45, berries: false,
  rx: r => r.width * 0.5,
  ry: r => r.height * 0.66,
  leaf: (rx, ry) => ry * 0.3,
}
const pullRect0 = m => m.pulls?.[0]
const heroQuoteRect = m => m.heroQuote
const wreathDummy = new THREE.Object3D()

function Wreath({ shape, getRect, m, isMobile }) {
  const { steps: STEPS, theta0: THETA0, theta1: THETA1 } = shape
  const group = useRef()
  const leavesRef = useRef()
  const berriesRef = useRef()
  const stems = useRef()
  const grow = useRef(0)

  const leafGeo = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(0, 0)
    sh.quadraticCurveTo(0.38, 0.42, 0, 1)
    sh.quadraticCurveTo(-0.38, 0.42, 0, 0)
    return new THREE.ShapeGeometry(sh, 10)
  }, [])
  const gold = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c79c4c', metalness: 0.8, roughness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.7,
  }), [])
  // Stems: the two branch curves on a unit ellipse (scaled to rx/ry at runtime)
  const stemGeos = useMemo(() => [-1, 1].map(side => {
    const pts = []
    for (let i = 0; i <= 40; i++) {
      const th = THETA0 + (i / 40) * (THETA1 - THETA0 + 0.08)
      pts.push(new THREE.Vector3(side * Math.sin(th), -Math.cos(th), 0))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.008, 6, false)
  }), [THETA0, THETA1])
  const berryGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 10), [])

  const leaves = useMemo(() => {
    const out = []
    for (const side of [-1, 1]) {
      for (let i = 0; i < STEPS; i++) {
        const f = i / (STEPS - 1)
        for (const alt of [-1, 1]) out.push({ side, f, theta: THETA0 + f * (THETA1 - THETA0), alt, size: 1 - f * 0.45 })
      }
    }
    return out
  }, [STEPS, THETA0, THETA1])
  const berries = useMemo(() => {
    const out = []
    if (shape.berries) for (const side of [-1, 1]) for (const f of [0.18, 0.42, 0.66]) out.push({ side, f, theta: THETA0 + f * (THETA1 - THETA0) })
    return out
  }, [shape.berries, THETA0, THETA1])

  useFrame(({ clock }, delta) => {
    const g = group.current
    const r = getRect(m)
    if (!g) return
    if (!r || r.bottom < -100 || r.top > m.vh + 100) { g.visible = false; return }
    g.visible = true
    if (r.top < m.vh * 0.72) grow.current = Math.min(1, grow.current + delta * 0.5)

    const t = clock.elapsedTime
    const rx = shape.rx(r, isMobile) * m.px
    const ry = shape.ry(r, isMobile) * m.px
    const leaf = shape.leaf(rx, ry, isMobile)
    g.position.set(((r.left + r.width / 2) / m.vw - 0.5) * m.worldW, -((r.top + r.height / 2) / m.vh - 0.5) * m.worldH, -0.4)
    g.rotation.set(Math.sin(t * 0.3) * 0.07, Math.sin(t * 0.22) * 0.2 + pointer.x * 0.15, 0)

    // stems draw on with the growth
    stems.current.scale.set(rx, ry, 1)
    stems.current.children.forEach(st => { st.geometry.setDrawRange(0, Math.floor(st.geometry.index.count * grow.current / 6) * 6) })

    const place = (th, side) => {
      const x = side * rx * Math.sin(th), y = -ry * Math.cos(th)
      const tx = side * rx * Math.cos(th), ty = ry * Math.sin(th)
      const len = Math.hypot(tx, ty) || 1
      return { x, y, tx: tx / len, ty: ty / len }
    }

    leaves.forEach((L, i) => {
      const P = place(L.theta, L.side)
      const k = smooth(clamp01((grow.current * 1.12 - L.f) * 6))
      const sc = leaf * L.size * k
      const nx = -P.ty, ny = P.tx
      wreathDummy.position.set(P.x + L.alt * nx * leaf * 0.06, P.y + L.alt * ny * leaf * 0.06, L.alt * 0.02)
      // each pair splays out either side of the stem, pointing along the growth
      wreathDummy.rotation.set(L.alt * 0.3, 0, Math.atan2(P.ty, P.tx) - Math.PI / 2 + L.alt * 0.72)
      wreathDummy.scale.set(sc, sc, sc)
      wreathDummy.updateMatrix()
      leavesRef.current.setMatrixAt(i, wreathDummy.matrix)
    })
    leavesRef.current.instanceMatrix.needsUpdate = true

    berries.forEach((B, i) => {
      const P = place(B.theta, B.side)
      const k = smooth(clamp01((grow.current * 1.12 - B.f - 0.1) * 6))
      wreathDummy.position.set(P.x - B.side * P.ty * leaf * 0.35, P.y + B.side * P.tx * leaf * 0.35, 0.03)
      wreathDummy.rotation.set(0, 0, 0)
      wreathDummy.scale.setScalar(leaf * 0.09 * k)
      wreathDummy.updateMatrix()
      berriesRef.current.setMatrixAt(i, wreathDummy.matrix)
    })
    if (berries.length) berriesRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group}>
      <group ref={stems}>
        {stemGeos.map((sg, i) => <mesh key={i} geometry={sg} material={gold} />)}
      </group>
      <instancedMesh ref={leavesRef} args={[leafGeo, gold, leaves.length]} frustumCulled={false} />
      {berries.length > 0 && <instancedMesh ref={berriesRef} args={[berryGeo, gold, berries.length]} frustumCulled={false} />}
    </group>
  )
}
