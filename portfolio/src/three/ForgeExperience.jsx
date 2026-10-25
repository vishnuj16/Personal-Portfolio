import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { makeClosedBookTextures, closedEdgeTextures, makeGlyphAtlas, GLYPH_COUNT } from './textures'
import { createSketchCoverMaterial } from './sketchCover'
import { darken } from '../utils/color'

// ── Coming-soon book page: "a story taking shape" ──────────────────────────────
// Same technique as the other scenes (one fixed canvas tracking DOM anchors), with
// its own mood — unfinished and alive:
//
//   Backdrop   — dark field with a soft glow in the book's colour
//   Astrolabe  — a drafting instrument of counter-rotating gold rings and ticks
//   Book       — its cover is a gold line sketch that a scanline keeps colouring in
//   Vortex     — gold letters spiralling in and being absorbed into the book
//   Hourglass  — glass and gold, sand running down; flips itself when it empties

const FOV = 35
const CAM_Z = 12
const clamp01 = v => Math.max(0, Math.min(1, v))
const smooth = t => t * t * (3 - 2 * t)
const pointer = { x: 0, y: 0 }

export default function ForgeExperience(props) {
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

const toWorld = (m, x, y) => [(x / m.vw - 0.5) * m.worldW, -(y / m.vh - 0.5) * m.worldH]
const onScreen = (m, r, margin = 120) => r && r.bottom > -margin && r.top < m.vh + margin
const rgbStr01 = str => { const v = str.match(/\d+/g).map(Number); return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255) }

function Scene({ book, accent, coverSrc, anchors, isMobile, onReady }) {
  const { gl, scene } = useThree()
  const m = useRef({ vw: 1, vh: 1, worldW: 1, worldH: 1, px: 1 }).current
  const [tex, setTex] = useState(null)

  useEffect(() => {
    let alive = true
    makeClosedBookTextures({ id: book.id, title: book.title, accent, coverSrc }).then(t => { if (alive) setTex(t) })
    return () => { alive = false }
  }, [book.id, book.title, accent, coverSrc])
  useEffect(() => { if (tex) onReady?.() }, [tex, onReady])

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => { scene.environment = null; env.dispose(); pmrem.dispose() }
  }, [gl, scene])

  useFrame(({ size }) => {
    m.vw = size.width
    m.vh = size.height
    m.worldH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)
    m.worldW = (m.worldH * m.vw) / m.vh
    m.px = m.worldH / m.vh
    m.book = anchors.cover.current?.getBoundingClientRect() || null
    m.glass = anchors.hourglass.current?.getBoundingClientRect() || null
  }, -1)

  return (
    <>
      <Backdrop accent={accent} m={m} />
      <ambientLight intensity={0.8} color="#fff4e6" />
      <directionalLight position={[-4, 5, 8]} intensity={2} color="#fff0d8" />
      <pointLight position={[4, 2, -2]} intensity={30} distance={20} color={accent} />
      <Astrolabe m={m} isMobile={isMobile} />
      <Vortex m={m} isMobile={isMobile} />
      {tex && <SketchBook t={tex} book={book} accent={accent} m={m} />}
      <Hourglass accent={accent} m={m} />
    </>
  )
}

// ── Backdrop ───────────────────────────────────────────────────────────────────

function Backdrop({ accent, m }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uGlow: { value: rgbStr01(darken(accent, 0.55)) },
      uFocus: { value: new THREE.Vector2(0.65, 0.5) },
      uAspect: { value: 1.6 },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: `
      uniform vec3 uGlow; uniform vec2 uFocus; uniform float uAspect; varying vec2 vUv;
      void main() {
        vec3 base = vec3(0.025, 0.022, 0.03);
        float d = length((vUv - uFocus) * vec2(uAspect, 1.0));
        vec3 col = base + uGlow * 0.55 * smoothstep(0.85, 0.0, d);
        col *= mix(1.0, 0.55, smoothstep(0.5, 1.2, length((vUv - 0.5) * vec2(uAspect, 1.0))));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [accent])
  useFrame(() => {
    const r = m.book
    mat.uniforms.uAspect.value = m.vw / m.vh
    if (r) mat.uniforms.uFocus.value.set((r.left + r.width / 2) / m.vw, 1 - (r.top + r.height / 2) / m.vh)
  })
  return <mesh frustumCulled={false} renderOrder={-10} material={mat}><planeGeometry args={[2, 2]} /></mesh>
}

// ── Astrolabe ──────────────────────────────────────────────────────────────────

function ringGeometry(segments = 160) {
  const pts = []
  for (let k = 0; k <= segments; k++) { const a = (k / segments) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)) }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

function ticksGeometry(count, inner, outer, majorEvery, majorInner) {
  const pts = []
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2
    const r0 = k % majorEvery === 0 ? majorInner : inner
    pts.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * outer, Math.sin(a) * outer, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
  return g
}

function Astrolabe({ m, isMobile }) {
  const group = useRef()
  const parts = useRef([])
  const born = useRef(null)
  const geos = useMemo(() => ({
    ring: ringGeometry(),
    ticks: ticksGeometry(120, 0.93, 0.97, 10, 0.88),
    fine: ticksGeometry(240, 0.705, 0.72, 20, 0.68),
    spokes: ticksGeometry(12, 0.18, 0.62, 3, 0.1),
  }), [])
  const gold = op => new THREE.LineBasicMaterial({ color: '#d9b56a', transparent: true, opacity: op, depthWrite: false })
  const mats = useMemo(() => [gold(0.32), gold(0.22), gold(0.3), gold(0.16), gold(0.12), gold(0.2)], [])

  useFrame(({ clock }) => {
    const g = group.current
    const r = m.book
    if (!g) return
    if (!onScreen(m, r, 300)) { g.visible = false; return }
    g.visible = true
    const t = clock.elapsedTime
    if (born.current === null) born.current = t
    const intro = smooth(clamp01((t - born.current) / 2))
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    const k = (CAM_Z + 3) / CAM_Z
    g.position.set(x * k, y * k, -3)
    const R = Math.min(r.height * (isMobile ? 0.75 : 0.95), m.vw * 0.48) * m.px * k * (0.7 + 0.3 * intro)
    g.scale.setScalar(R)
    g.rotation.set(-0.25 + pointer.y * 0.06, 0.18 + pointer.x * 0.1, 0)
    const [outer, ticks, fine, spokes, inner, mid] = parts.current
    if (outer) outer.rotation.z = t * 0.02
    if (ticks) ticks.rotation.z = -t * 0.035
    if (fine) fine.rotation.z = t * 0.05
    if (spokes) spokes.rotation.z = -t * 0.015
    if (inner) inner.rotation.z = t * 0.08
    if (mid) mid.rotation.z = -t * 0.025
    mats.forEach((mt, i) => { mt.opacity = [0.32, 0.22, 0.3, 0.16, 0.12, 0.2][i] * intro })
  })

  return (
    <group ref={group}>
      <line ref={el => (parts.current[0] = el)} geometry={geos.ring} material={mats[0]} />
      <lineSegments ref={el => (parts.current[1] = el)} geometry={geos.ticks} material={mats[1]} />
      <lineSegments ref={el => (parts.current[2] = el)} geometry={geos.fine} material={mats[2]} />
      <lineSegments ref={el => (parts.current[3] = el)} geometry={geos.spokes} material={mats[3]} />
      <line ref={el => (parts.current[4] = el)} geometry={geos.ring} material={mats[4]} scale={0.42} />
      <line ref={el => (parts.current[5] = el)} geometry={geos.ring} material={mats[5]} scale={0.84} />
    </group>
  )
}

// ── The book being drawn (cover material: ./sketchCover) ───────────────────────

function SketchBook({ t, book, accent, m }) {
  const group = useRef()
  const wire = useRef()
  const parts = useMemo(() => {
    const edges = closedEdgeTextures()
    const w = 1
    const h = t.aspect
    const T = Math.min(0.26, Math.max(0.1, (book.pages || 260) / 900 + 0.05))
    const std = o => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o })
    const cover = createSketchCoverMaterial({ map: t.cover, accent })
    const geo = new THREE.BoxGeometry(w, h, T)
    return {
      geo, h,
      mats: [
        std({ map: edges.side, roughness: 0.95 }),
        std({ map: t.spine, roughness: 0.45 }),
        std({ map: edges.top, roughness: 0.95 }),
        std({ map: edges.top, roughness: 0.95 }),
        cover,
        std({ color: new THREE.Color(darken(accent, 0.5)) }),
      ],
      edges: new THREE.EdgesGeometry(geo),
      cover,
    }
  }, [t, book.pages, accent])

  useFrame(({ clock }) => {
    const g = group.current
    const r = m.book
    if (!g) return
    if (!onScreen(m, r)) { g.visible = false; return }
    g.visible = true
    const tt = clock.elapsedTime
    parts.cover.uniforms.uTime.value = tt
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    g.scale.setScalar((r.height * m.px * 0.88) / parts.h)
    g.position.set(x, y + Math.sin(tt * 1.1) * 0.05, 0.5)
    g.rotation.set(-0.05 + pointer.y * 0.14, 0.35 + pointer.x * 0.28, 0.02)
    if (wire.current) wire.current.material.opacity = 0.35 + 0.2 * Math.sin(tt * 2.2)
  })

  return (
    <group ref={group}>
      <mesh geometry={parts.geo} material={parts.mats} />
      <lineSegments ref={wire} geometry={parts.edges} scale={1.015}>
        <lineBasicMaterial color="#f0d08a" transparent opacity={0.4} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

// ── Vortex of letters being drawn into the book ────────────────────────────────

const vortexVert = /* glsl */ `
  attribute float aR0; attribute float aPhase; attribute float aSpeed; attribute float aGlyph; attribute float aSize; attribute float aH;
  uniform float uTime; uniform float uPR; uniform float uRadius;
  varying float vGlyph; varying float vAngle; varying float vAlpha;
  void main() {
    float life = fract(uTime * aSpeed + aPhase);
    float r = mix(aR0, 0.1, pow(life, 1.3));
    float a = aPhase * 6.2831 + life * 6.5;
    vec3 p = vec3(cos(a) * r, aH * (1.0 - life), sin(a) * r) * uRadius;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (1.0 - life * 0.65) * (90.0 / -mv.z);
    vGlyph = aGlyph;
    vAngle = aPhase * 12.0 + life * 9.0;
    vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.82, 1.0, life));
  }
`
const vortexFrag = /* glsl */ `
  uniform sampler2D uAtlas; uniform float uCols; uniform vec3 uColor; uniform float uOpacity;
  varying float vGlyph; varying float vAngle; varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vAngle), k = cos(vAngle);
    c = mat2(k, -s, s, k) * c + 0.5;
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) discard;
    float col = mod(vGlyph, uCols), row = floor(vGlyph / uCols);
    float a = texture2D(uAtlas, vec2((col + c.x) / uCols, 1.0 - (row + c.y) / uCols)).a * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

function Vortex({ m, isMobile }) {
  const { viewport } = useThree()
  const group = useRef()
  const [atlas, setAtlas] = useState(null)
  useEffect(() => { let alive = true; makeGlyphAtlas().then(a => { if (alive) setAtlas(a) }); return () => { alive = false } }, [])
  const count = isMobile ? 90 : 220
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const at = { aR0: [], aPhase: [], aSpeed: [], aGlyph: [], aSize: [], aH: [] }
    for (let i = 0; i < count; i++) {
      at.aR0.push(0.65 + Math.random() * 0.45)
      at.aPhase.push(Math.random())
      at.aSpeed.push(0.05 + Math.random() * 0.06)
      at.aGlyph.push(Math.floor(Math.random() * GLYPH_COUNT))
      at.aSize.push(2.2 + Math.pow(Math.random(), 2) * 4)
      at.aH.push((Math.random() - 0.5) * 0.5)
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    for (const [k, v] of Object.entries(at)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(v), 1))
    return g
  }, [count])
  const mat = useMemo(() => atlas && new THREE.ShaderMaterial({
    vertexShader: vortexVert, fragmentShader: vortexFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uPR: { value: 1 }, uRadius: { value: 4 },
      uAtlas: { value: atlas.texture }, uCols: { value: atlas.cols },
      uColor: { value: new THREE.Color('#ecd08f') }, uOpacity: { value: 0.85 },
    },
  }), [atlas])

  useFrame(({ clock }) => {
    const g = group.current
    const r = m.book
    if (!g || !mat) return
    if (!onScreen(m, r)) { g.visible = false; return }
    g.visible = true
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uPR.value = viewport.dpr
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    g.position.set(x, y, 0)
    mat.uniforms.uRadius.value = Math.min(r.height * (isMobile ? 0.8 : 1.05), m.vw * 0.5) * m.px
    g.rotation.set(-1.15 + pointer.y * 0.05, 0, 0.18)
  })

  if (!mat) return null
  return <group ref={group}><points geometry={geo} material={mat} frustumCulled={false} renderOrder={5} /></group>
}

// ── Hourglass ──────────────────────────────────────────────────────────────────

const SAND = 180
const FALL = 15     // seconds for the top bulb to empty
const FLIP = 2      // seconds to turn over

function Hourglass({ accent, m }) {
  const group = useRef()
  const body = useRef()
  const topPile = useRef()
  const bottomPile = useRef()
  const stream = useRef()
  const cycle = useRef(0)

  const geo = useMemo(() => {
    // glass: two bulbs meeting at a narrow neck
    const prof = []
    for (let i = 0; i <= 40; i++) {
      const y = -0.78 + (i / 40) * 1.56
      const k = Math.abs(y) / 0.78
      const r = 0.045 + 0.4 * Math.sin(Math.min(1, k * 1.08) * Math.PI * 0.5) * (1 - Math.pow(k, 8) * 0.35)
      prof.push(new THREE.Vector2(r, y))
    }
    const streamGeo = new THREE.BufferGeometry()
    streamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SAND * 3), 3))
    return {
      glass: new THREE.LatheGeometry(prof, 48),
      cap: new THREE.CylinderGeometry(0.56, 0.56, 0.07, 48),
      pillar: new THREE.CylinderGeometry(0.025, 0.025, 1.62, 12),
      pile: new THREE.ConeGeometry(0.34, 0.36, 40, 1, true),
      stream: streamGeo,
      seeds: Array.from({ length: SAND }, () => Math.random()),
    }
  }, [])
  const mats = useMemo(() => ({
    gold: new THREE.MeshStandardMaterial({ color: '#c9a050', metalness: 0.9, roughness: 0.32, envMapIntensity: 1.2 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#dfe8ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1,
      envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false,
    }),
    sand: new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).lerp(new THREE.Color('#e8c98a'), 0.6), roughness: 0.9, side: THREE.DoubleSide }),
    grains: new THREE.PointsMaterial({ color: '#f0d49a', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false }),
  }), [accent])

  useFrame(({ clock }, delta) => {
    const g = group.current
    const r = m.glass
    if (!g) return
    if (!onScreen(m, r)) { g.visible = false; return }
    g.visible = true
    cycle.current = (cycle.current + delta) % (FALL + FLIP)
    const c = cycle.current
    const t = clock.elapsedTime
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    g.position.set(x, y, 0)
    g.scale.setScalar((r.height * m.px) / 1.9)
    g.rotation.set(pointer.y * 0.1, t * 0.25, 0)

    // sand: the top drains into the bottom; then the whole glass turns over
    const left = c < FALL ? 1 - c / FALL : 0
    const flipping = c >= FALL
    body.current.rotation.z = flipping ? smooth((c - FALL) / FLIP) * Math.PI : 0
    const topH = Math.max(0.001, Math.pow(left, 0.7))
    const botH = Math.max(0.001, Math.pow(1 - left, 0.7))
    topPile.current.scale.set(0.35 + 0.65 * topH, topH, 0.35 + 0.65 * topH)
    topPile.current.position.y = 0.06 + 0.2 * topH
    bottomPile.current.scale.set(0.35 + 0.65 * botH, botH, 0.35 + 0.65 * botH)
    bottomPile.current.position.y = -0.74 + 0.18 * botH

    // falling grains from the neck down to the pile
    stream.current.visible = !flipping && left > 0.01
    const pos = geo.stream.attributes.position
    const floor = -0.74 + 0.36 * botH
    for (let i = 0; i < SAND; i++) {
      const s = geo.seeds[i]
      const f = (t * 1.4 + s) % 1
      const yy = -0.02 - f * (0.02 - floor + 0.02)
      pos.setXYZ(i, (s - 0.5) * 0.02 * f, yy, ((s * 7.3) % 1 - 0.5) * 0.02 * f)
    }
    pos.needsUpdate = true
  })

  return (
    <group ref={group}>
      <group ref={body}>
        <mesh geometry={geo.cap} material={mats.gold} position={[0, 0.82, 0]} />
        <mesh geometry={geo.cap} material={mats.gold} position={[0, -0.82, 0]} />
        {[0, 1, 2].map(i => {
          const a = (i / 3) * Math.PI * 2
          return <mesh key={i} geometry={geo.pillar} material={mats.gold} position={[Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]} />
        })}
        {/* top pile is an inverted cone hanging from the glass; bottom pile a mound */}
        <mesh ref={topPile} geometry={geo.pile} material={mats.sand} rotation={[Math.PI, 0, 0]} />
        <mesh ref={bottomPile} geometry={geo.pile} material={mats.sand} />
        <points ref={stream} geometry={geo.stream} material={mats.grains} frustumCulled={false} />
        <mesh geometry={geo.glass} material={mats.glass} renderOrder={2} />
      </group>
    </group>
  )
}
