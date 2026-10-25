import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { makeClosedBookTextures, closedEdgeTextures, makeStreakTexture } from './textures'
import { createSketchCoverMaterial } from './sketchCover'
import { darken } from '../utils/color'
import { imgUrl } from '../api'

// ── Author page: "a library among the stars" ───────────────────────────────────
// One fixed canvas behind the HTML (same anchor technique as the book page, but
// no smoke): a night sky that the whole page scrolls through.
//
//   Sky            — deep-space gradient
//   Stars          — thousands of twinkling stars in depth layers, parallax on scroll
//   Galaxy         — a slowly turning spiral of gold and starlight behind the hero
//   ShootingStars  — the occasional meteor
//   Orrery         — the new release at the galaxy's centre, moons of light in orbit
//   FeaturedRing   — featured books on a turntable; the current one turns to the front
//   Shelf          — a real 3D book in every All Works card; turns to face you on hover
//   SoonShelf      — Coming Soon cards: books whose covers are still being drawn
//   Constellations — gold line figures that draw themselves as sections arrive

const FOV = 35
const CAM_Z = 12
const clamp01 = v => Math.max(0, Math.min(1, v))
const smooth = t => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t
const pointer = { x: 0, y: 0 }

export default function AuthorExperience(props) {
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
      camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 120 }}
      dpr={props.isMobile ? 1 : [1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <Scene {...props} />
    </Canvas>
  )
}

// DOM rect → world position on the z = 0 plane
function toWorld(m, x, y) {
  return [(x / m.vw - 0.5) * m.worldW, -(y / m.vh - 0.5) * m.worldH]
}
const onScreen = (m, r, margin = 120) => r && r.bottom > -margin && r.top < m.vh + margin

function Scene({ books, newRelease, featured, anchors, isMobile, onReady }) {
  const { gl, scene } = useThree()
  const m = useRef({ vw: 1, vh: 1, worldW: 1, worldH: 1, px: 1, scroll: 0 }).current
  const [tex, setTex] = useState(null) // book id → closed-book textures

  // Load every book's cover + spine once
  const bookKey = books.map(b => `${b.id}:${b.cover_url}:${b.theme_color}`).join('|')
  useEffect(() => {
    let alive = true
    Promise.all(books.map(b => makeClosedBookTextures({
      id: b.id, title: b.title, accent: b.theme_color || '#c9a84c',
      coverSrc: b.cover_url ? imgUrl(b.cover_url) : null,
    }).then(t => [b.id, t]))).then(entries => { if (alive) setTex(new Map(entries)) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey])
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
    m.scroll = window.scrollY / m.vh
    const rect = r => r.current?.getBoundingClientRect() || null
    m.hero = rect(anchors.hero)
    m.heroBook = rect(anchors.heroBook)
    m.featured = rect(anchors.featuredSlot)
    m.featuredIndex = anchors.featuredIndex.current || 0
    // Shelf slots: one per visible All Works card
    m.shelf = new Map()
    anchors.shelf.current?.querySelectorAll('[data-shelf-id]').forEach(el => {
      m.shelf.set(Number(el.dataset.shelfId), { rect: el.getBoundingClientRect(), hover: el.dataset.hover === '1' })
    })
    m.soon = new Map()
    anchors.soon?.current?.querySelectorAll('[data-soon-id]').forEach(el => {
      m.soon.set(Number(el.dataset.soonId), { rect: el.getBoundingClientRect(), hover: el.dataset.hover === '1' })
    })
  }, -1)

  return (
    <>
      <Sky />
      <Stars m={m} isMobile={isMobile} />
      <Galaxy m={m} isMobile={isMobile} />
      <ShootingStars m={m} />
      <Lights />
      {CONSTELLATIONS.map(c => <Constellation key={c.id} def={c} m={m} isMobile={isMobile} />)}
      {tex && <Orrery tex={tex} center={newRelease} m={m} isMobile={isMobile} />}
      {tex && featured.length > 0 && <FeaturedRing tex={tex} books={featured} m={m} />}
      {tex && <Shelf tex={tex} books={books} m={m} />}
      {tex && <SoonShelf tex={tex} books={books.filter(b => b.coming_soon)} m={m} />}
    </>
  )
}

// ── Sky ────────────────────────────────────────────────────────────────────────

export function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 top = vec3(0.035, 0.055, 0.12);
        vec3 bottom = vec3(0.008, 0.01, 0.025);
        vec3 col = mix(bottom, top, smoothstep(0.0, 1.0, vUv.y));
        float d = length((vUv - vec2(0.5, 0.62)) * vec2(1.6, 1.0));
        col += vec3(0.05, 0.06, 0.11) * smoothstep(0.9, 0.0, d) * 0.6;   // faint glow, not cloud
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [])
  return (
    <mesh frustumCulled={false} renderOrder={-10} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

// ── Stars ──────────────────────────────────────────────────────────────────────

const starVert = /* glsl */ `
  attribute float aSize; attribute float aPhase; attribute vec3 aColor;
  uniform float uTime; uniform float uScroll; uniform float uPR; uniform float uSpan;
  varying vec3 vColor; varying float vTw;
  void main() {
    vec3 p = position;
    // nearer stars drift further with scroll: depth parallax
    float par = 0.5 + (p.z + 40.0) / 40.0 * 1.6;
    p.y = mod(p.y + uScroll * par + uSpan * 0.5, uSpan) - uSpan * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (26.0 / -mv.z);
    vTw = 0.55 + 0.45 * sin(uTime * (0.8 + aPhase * 2.2) + aPhase * 50.0);
    vColor = aColor;
  }
`
const starFrag = /* glsl */ `
  varying vec3 vColor; varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float a = core * core * vTw;
    // a faint cross-flare on the brighter ones
    a += (smoothstep(0.06, 0.0, abs(c.x)) + smoothstep(0.06, 0.0, abs(c.y))) * smoothstep(0.5, 0.1, d) * 0.25 * vTw;
    gl_FragColor = vec4(vColor, a);
  }
`

export function Stars({ m, isMobile }) {
  const { size, viewport } = useThree()
  const count = isMobile ? 1600 : 3800
  const span = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360) * 4

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    const ph = new Float32Array(count)
    const col = new Float32Array(count * 3)
    const palette = [[0.75, 0.82, 1], [1, 1, 1], [1, 0.9, 0.72], [0.85, 0.92, 1]]
    for (let i = 0; i < count; i++) {
      const z = -40 + Math.random() * 38
      const spread = (CAM_Z - z) / CAM_Z
      pos[i * 3] = (Math.random() - 0.5) * span * 0.25 * (size.width / size.height) * spread * 2.2
      pos[i * 3 + 1] = (Math.random() - 0.5) * span
      pos[i * 3 + 2] = z
      sz[i] = 1.2 + Math.pow(Math.random(), 6) * 9
      ph[i] = Math.random()
      const c = palette[Math.floor(Math.random() * palette.length)]
      col.set(c, i * 3)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: starVert, fragmentShader: starFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uPR: { value: 1 }, uSpan: { value: span } },
  }), [span])

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uScroll.value = m.scroll * 3.2
    mat.uniforms.uPR.value = viewport.dpr
  })
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-5} />
}

// ── Galaxy ─────────────────────────────────────────────────────────────────────
// Spiral arms of particles on a tilted disc; inner stars orbit faster.

const galaxyVert = /* glsl */ `
  attribute float aR; attribute float aA; attribute float aH; attribute float aSize; attribute float aMix;
  uniform float uTime; uniform float uPR; uniform float uRadius;
  varying float vMix; varying float vR;
  void main() {
    float a = aA + uTime * (0.08 / (0.25 + aR));
    vec3 p = vec3(cos(a) * aR, aH, sin(a) * aR) * uRadius;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (30.0 / -mv.z);
    vMix = aMix; vR = aR;
  }
`
const galaxyFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vMix; varying float vR;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 core = vec3(1.0, 0.86, 0.6);
    vec3 arm = vec3(0.62, 0.74, 1.0);
    vec3 col = mix(core, arm, smoothstep(0.08, 0.7, vR) * vMix);
    gl_FragColor = vec4(col, a * a * uOpacity * (1.0 - smoothstep(0.75, 1.0, vR)));
  }
`

function Galaxy({ m, isMobile }) {
  const { viewport } = useThree()
  const group = useRef()
  const count = isMobile ? 5000 : 12000
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const at = { aR: [], aA: [], aH: [], aSize: [], aMix: [] }
    const ARMS = 4
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.65)
      const arm = (i % ARMS) / ARMS * Math.PI * 2
      const twist = r * 5.2
      const scatter = (Math.random() - 0.5) * (0.5 + r * 0.6) * (1.2 - r)
      at.aR.push(r)
      at.aA.push(arm + twist + scatter * 1.4)
      at.aH.push((Math.random() - 0.5) * 0.06 * (1.1 - r))
      at.aSize.push(1 + Math.pow(Math.random(), 4) * 5 + (r < 0.14 ? 3.5 : 0))
      at.aMix.push(0.6 + Math.random() * 0.4)
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    for (const [k, v] of Object.entries(at)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(v), 1))
    return g
  }, [count])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: galaxyVert, fragmentShader: galaxyFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uRadius: { value: 8 }, uOpacity: { value: 1 } },
  }), [])
  const core = useRef()
  const coreTex = useMemo(() => glowTexture(), [])

  useFrame(({ clock }) => {
    const g = group.current
    const r = m.heroBook || m.hero
    if (!g) return
    if (!onScreen(m, m.hero, 300)) { g.visible = false; return }
    g.visible = true
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uPR.value = viewport.dpr
    // Sits deep behind the hero's book, scaled up for its distance
    const z = -14
    const k = (CAM_Z - z) / CAM_Z
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    g.position.set(x * k, y * k, z)
    mat.uniforms.uRadius.value = m.worldH * k * (isMobile ? 0.55 : 0.62)
    g.rotation.set(-1.05 + pointer.y * 0.04, 0, 0.35 + pointer.x * 0.04)
    // a warm galactic core glowing behind the book, gently breathing
    if (core.current) {
      const t = clock.elapsedTime
      core.current.position.set(x * k, y * k, z + 0.1)
      const cs = m.worldH * k * (isMobile ? 0.5 : 0.42)
      core.current.scale.set(cs * 1.5, cs, 1)
      core.current.material.opacity = 0.42 + 0.06 * Math.sin(t * 0.8)
    }
  })

  return (
    <>
      <group ref={group}><points geometry={geo} material={mat} frustumCulled={false} renderOrder={-4} /></group>
      <mesh ref={core} renderOrder={-4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={coreTex} color="#ffd9a0" transparent opacity={0.4}
          blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

// ── Shooting stars ─────────────────────────────────────────────────────────────

export function ShootingStars({ m }) {
  const tex = useMemo(() => makeStreakTexture(), [])
  const refs = useRef([])
  const state = useRef([0, 1, 2].map(i => ({ live: false, t: 0, next: 1.5 + i * 2.8 }))).current

  useFrame((_, delta) => {
    state.forEach((s, i) => {
      const mesh = refs.current[i]
      if (!mesh) return
      if (!s.live) {
        s.next -= delta
        mesh.visible = false
        if (s.next <= 0) {
          s.live = true; s.t = 0
          s.dur = 0.7 + Math.random() * 0.6
          s.x0 = (Math.random() * 0.9 - 0.2) * m.worldW * 0.8
          s.y0 = (0.15 + Math.random() * 0.35) * m.worldH
          s.ang = -(0.35 + Math.random() * 0.35)
          s.len = m.worldW * (0.35 + Math.random() * 0.25)
        }
        return
      }
      s.t += delta / s.dur
      if (s.t >= 1) { s.live = false; s.next = 4 + Math.random() * 7; mesh.visible = false; return }
      const travel = s.len * 1.6 * s.t
      mesh.visible = true
      mesh.position.set(s.x0 + Math.cos(s.ang) * travel, s.y0 + Math.sin(s.ang) * travel, -6)
      mesh.rotation.z = s.ang
      mesh.scale.set(s.len * 0.35 * Math.min(1, s.t * 4), 0.05, 1)
      mesh.material.opacity = Math.sin(Math.PI * s.t) * 0.9
    })
  })

  return [0, 1, 2].map(i => (
    <mesh key={i} ref={el => (refs.current[i] = el)} visible={false} renderOrder={-3}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} color="#fff3d6" transparent opacity={0}
        blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  ))
}

// ── Lights ─────────────────────────────────────────────────────────────────────

export function Lights() {
  const sweep = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (sweep.current) sweep.current.position.set(Math.sin(t * 0.3) * 6, 3 + Math.cos(t * 0.23) * 1.5, 4)
  })
  return (
    <>
      <ambientLight intensity={0.95} color="#e8ecff" />
      <directionalLight position={[-4, 5, 8]} intensity={2.1} color="#fff1dc" />
      <directionalLight position={[3, -2, 6]} intensity={0.6} color="#cfd8ff" />
      <pointLight position={[5, 2, -3]} intensity={30} distance={22} color="#7f9cff" />
      <pointLight ref={sweep} intensity={8} distance={16} color="#ffe8c0" />
    </>
  )
}

// ── Closed 3D book ─────────────────────────────────────────────────────────────

function useClosedBook(t, book) {
  return useMemo(() => {
    if (!t) return null
    const edges = closedEdgeTextures()
    const w = 1
    const h = t.aspect
    const T = Math.min(0.26, Math.max(0.09, (book.pages || 220) / 900 + 0.04))
    const accent = book.theme_color || '#c9a84c'
    const std = o => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o })
    const back = std({ color: new THREE.Color(darken(accent, 0.5)), roughness: 0.5 })
    const mats = [
      std({ map: edges.side, roughness: 0.95 }),                      // +x fore-edge
      std({ map: t.spine, roughness: 0.45, envMapIntensity: 0.5 }),    // -x spine
      std({ map: edges.top, roughness: 0.95 }),                        // +y
      std({ map: edges.top, roughness: 0.95 }),                        // -y
      std({ map: t.cover, roughness: 0.55, envMapIntensity: 0.18 }),   // +z cover
      back,                                                            // -z
    ]
    return { geo: new THREE.BoxGeometry(w, h, T), mats, w, h, T }
  }, [t, book.pages, book.theme_color])
}

function ClosedBook({ t, book, innerRef }) {
  const b = useClosedBook(t, book)
  if (!b) return null
  return <mesh ref={innerRef} geometry={b.geo} material={b.mats} />
}

// ── Orrery: the new release at the centre, moons of light in orbit ───────────
// A fixed number of glowing moons on gold rings, so the hero stays uncluttered
// however many books the library holds (the shelf and turntable show the rest).

const MOONS = [
  { radius: 1.0, speed: 0.22, phase: 0.4, tilt: 0.42, size: 1.0, color: '#ffe2a8' },
  { radius: 1.22, speed: -0.15, phase: 2.6, tilt: 0.36, size: 0.75, color: '#bcd0ff' },
  { radius: 1.46, speed: 0.1, phase: 4.4, tilt: 0.47, size: 0.6, color: '#ffd4e0' },
]
const TRAIL = 22

function OrbitMoon({ moon, center, isMobile }) {
  const ring = useRef()
  const head = useRef()
  const trail = useRef()
  const glow = useMemo(() => glowTexture(), [])
  const ringGeo = useMemo(() => {
    const pts = []
    for (let k = 0; k <= 128; k++) { const a = (k / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))) }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  const trailGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3))
    g.setAttribute('aFade', new THREE.BufferAttribute(new Float32Array(Array.from({ length: TRAIL }, (_, i) => 1 - i / TRAIL)), 1))
    return g
  }, [])
  const trailMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(moon.color) }, uSize: { value: 10 } },
    vertexShader: `attribute float aFade; uniform float uSize; varying float vF;
      void main() { vF = aFade; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * aFade; }`,
    fragmentShader: `uniform vec3 uColor; varying float vF;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vF * 0.85); }`,
  }), [moon.color])

  // Position on the tilted orbit for an angle
  const at = (th, c, a) => {
    const x = Math.cos(th) * a, z = Math.sin(th) * a
    return [c.x + x, c.y - z * Math.sin(moon.tilt), z * Math.cos(moon.tilt) * 0.45]
  }

  useFrame(({ clock }) => {
    const c = center.current
    if (!ring.current || !head.current) return
    const show = c.visible
    ring.current.visible = head.current.visible = trail.current.visible = show
    if (!show) return
    const a = c.unit * (isMobile ? 0.52 : 0.58) * moon.radius
    const th = moon.phase + clock.elapsedTime * moon.speed
    const [x, y, z] = at(th, c, a)
    const s = c.unit * 0.2 * moon.size
    head.current.position.set(x, y, z)
    head.current.scale.set(s, s, 1)
    // trail: the last stretch of the orbit behind the moon
    const pos = trailGeo.attributes.position
    for (let i = 0; i < TRAIL; i++) {
      const [tx, ty, tz] = at(th - Math.sign(moon.speed) * i * 0.035, c, a)
      pos.setXYZ(i, tx, ty, tz)
    }
    pos.needsUpdate = true
    trailMat.uniforms.uSize.value = (isMobile ? 10 : 16) * moon.size
    ring.current.position.set(c.x, c.y, 0)
    ring.current.scale.set(a, a, a * 0.45)
    ring.current.rotation.set(moon.tilt, 0, 0)
  })

  return (
    <>
      <line ref={ring} geometry={ringGeo}>
        <lineBasicMaterial color="#d9b56a" transparent opacity={0.18} depthWrite={false} />
      </line>
      <points ref={trail} geometry={trailGeo} material={trailMat} frustumCulled={false} />
      <mesh ref={head}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} color={moon.color} transparent blending={THREE.AdditiveBlending}
          depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

function Orrery({ tex, center, m, isMobile }) {
  const centerBook = useRef()
  const shared = useRef({ visible: false, x: 0, y: 0, unit: 1 })
  const born = useRef(null)
  const ct = center ? tex.get(center.id) : null

  useFrame(({ clock }) => {
    const r = m.heroBook
    const c = shared.current
    c.visible = onScreen(m, m.hero, 200) && !!r
    if (!c.visible) { if (centerBook.current) centerBook.current.visible = false; return }
    if (born.current === null) born.current = clock.elapsedTime
    const intro = smooth(clamp01((clock.elapsedTime - born.current) / 1.6))
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    c.x = x; c.y = y
    c.unit = Math.min(r.height, m.vw * 0.55) * m.px * intro
    const g = centerBook.current
    if (g) {
      const bookScale = (r.height * m.px * 0.82) / (ct?.aspect || 1.5)
      g.visible = true
      g.scale.setScalar(bookScale * (0.6 + 0.4 * intro))
      g.position.set(x, y + Math.sin(clock.elapsedTime * 1.1) * 0.05, 0.5)
      g.rotation.set(-0.05 + pointer.y * 0.14, 0.42 + pointer.x * 0.28, 0.03)
    }
  })

  return (
    <>
      {ct && <group ref={centerBook}><ClosedBook t={ct} book={center} /></group>}
      {MOONS.map((moon, i) => <OrbitMoon key={i} moon={moon} center={shared} isMobile={isMobile} />)}
    </>
  )
}

// ── Featured ring: a turntable of featured books ───────────────────────────────

function FeaturedRing({ tex, books, m }) {
  const group = useRef()
  const items = useRef([])
  const angle = useRef(0)
  const ringGeo = useMemo(() => {
    const pts = []
    for (let k = 0; k <= 128; k++) { const a = (k / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a), 0, Math.cos(a))) }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  const ring = useRef()
  const n = books.length

  useFrame(({ clock }, delta) => {
    const g = group.current
    const r = m.featured
    if (!g) return
    if (!onScreen(m, r)) { g.visible = false; return }
    g.visible = true
    const step = (Math.PI * 2) / n
    // turn the shortest way to the current book
    let target = m.featuredIndex * step
    let diff = ((target - angle.current) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI
    angle.current += diff * Math.min(1, delta * 3.2)

    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    const bookH = r.height * m.px * 0.78
    const R = n > 1 ? r.width * m.px * 0.62 : 0
    g.position.set(x, y, -R)
    g.rotation.set(0.08, 0, 0)
    books.forEach((b, i) => {
      const it = items.current[i]
      const t = tex.get(b.id)
      if (!it || !t) return
      const th = i * step - angle.current
      it.position.set(Math.sin(th) * R, Math.sin(clock.elapsedTime * 1.2 + i) * 0.04, Math.cos(th) * R)
      const front = Math.cos(th)
      it.rotation.set(0, th + (front > 0.9 ? pointer.x * 0.25 : 0) + 0.18, 0)
      it.scale.setScalar((bookH / t.aspect) * (0.78 + 0.22 * Math.max(0, front)))
    })
    if (ring.current) {
      ring.current.visible = n > 1
      ring.current.position.set(0, -bookH * 0.55, 0)
      ring.current.scale.setScalar(R * 1.08)
    }
  })

  return (
    <group ref={group}>
      <line ref={ring} geometry={ringGeo}>
        <lineBasicMaterial color="#d9b56a" transparent opacity={0.3} depthWrite={false} />
      </line>
      {books.map((b, i) => (
        <group key={b.id} ref={el => (items.current[i] = el)}>
          <ClosedBook t={tex.get(b.id)} book={b} />
        </group>
      ))}
    </group>
  )
}

// ── Shelf: a 3D book in every All Works card ───────────────────────────────────

function ShelfBook({ t, book, m }) {
  const ref = useRef()
  const hov = useRef(0)
  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const slot = m.shelf?.get(book.id)
    if (!slot || !onScreen(m, slot.rect, 40)) { g.visible = false; return }
    g.visible = true
    hov.current = lerp(hov.current, slot.hover ? 1 : 0, Math.min(1, delta * 6))
    const h = hov.current
    const r = slot.rect
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    const s = (r.height * m.px * 0.8) / t.aspect
    const tt = clock.elapsedTime + book.id
    g.scale.setScalar(s * (1 + h * 0.06))
    g.position.set(x, y + h * r.height * m.px * 0.04 + Math.sin(tt * 0.9) * 0.01, h * 0.6)
    g.rotation.set(-0.04 + pointer.y * 0.05, lerp(0.5 + Math.sin(tt * 0.4) * 0.06, 0.02 + pointer.x * 0.12, h), 0)
  })
  return <group ref={ref}><ClosedBook t={t} book={book} /></group>
}

function Shelf({ tex, books, m }) {
  return books.map(b => tex.get(b.id) && <ShelfBook key={b.id} t={tex.get(b.id)} book={b} m={m} />)
}

// ── Constellations ─────────────────────────────────────────────────────────────
// Figures in unit space (-1..1), drawn one segment at a time beside a section's title.

const CONSTELLATIONS = [
  {
    id: 'author-all-books', name: 'book',
    pts: [[-1, 0.55], [-0.05, 0.72], [0, 0.6], [0.05, 0.72], [1, 0.55], [1, -0.55], [0.05, -0.4], [0, -0.52], [-0.05, -0.4], [-1, -0.55]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [2, 7]],
  },
  {
    id: 'author-coming-soon', name: 'hourglass',
    pts: [[-0.6, 1], [0.6, 1], [0, 0], [-0.6, -1], [0.6, -1]],
    edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2]],
  },
  {
    id: 'author-announcements', name: 'star',
    pts: Array.from({ length: 5 }, (_, i) => { const a = Math.PI / 2 + i * (Math.PI * 2 / 5); return [Math.cos(a), Math.sin(a)] }),
    edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]],
  },
  {
    id: 'author-about', name: 'quill',
    pts: [[-0.85, -1], [-0.45, -0.45], [-0.05, 0.15], [0.4, 0.62], [0.85, 1], [0.55, 0.3], [0.2, -0.15], [-0.25, -0.55], [-0.6, 0.0], [-0.2, 0.55], [0.3, 0.95]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1], [1, 8], [8, 9], [9, 10], [10, 4]],
  },
  {
    id: 'author-contact', name: 'envelope',
    pts: [[-1, -0.62], [1, -0.62], [1, 0.62], [-1, 0.62], [0, -0.05]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 2]],
  },
]

function Constellation({ def, m, isMobile }) {
  const group = useRef()
  const lines = useRef()
  const dots = useRef()
  const progress = useRef(0)
  const el = useRef(null)

  const { lineGeo, dotGeo } = useMemo(() => {
    const lp = []
    def.edges.forEach(([a, b]) => { lp.push(...def.pts[a], 0, ...def.pts[b], 0) })
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3))
    const dotGeo = new THREE.BufferGeometry()
    dotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(def.pts.flatMap(p => [...p, 0])), 3))
    return { lineGeo, dotGeo }
  }, [def])

  const dotMat = useMemo(() => new THREE.PointsMaterial({
    color: '#fff1cf', size: isMobile ? 5 : 7, sizeAttenuation: false, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, map: dotTexture(),
  }), [isMobile])

  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return
    if (!el.current) el.current = document.getElementById(def.id)
    const r = el.current?.getBoundingClientRect()
    if (!r || !onScreen(m, r, 0)) { g.visible = false; return }
    g.visible = true
    if (r.top < m.vh * 0.7) progress.current = Math.min(1, progress.current + delta * 0.45)
    // beside the section title: upper right on desktop, upper centre on phones
    const size = (isMobile ? 70 : 110) * m.px
    const cx = isMobile ? r.left + r.width * 0.84 : r.left + r.width * 0.86
    const cy = r.top + (isMobile ? 70 : 120)
    const [x, y] = toWorld(m, cx, cy)
    g.position.set(x, y, -1)
    g.scale.setScalar(size)
    g.rotation.z = Math.sin(clock.elapsedTime * 0.2) * 0.05
    const segs = def.edges.length
    lines.current.geometry.setDrawRange(0, Math.floor(progress.current * segs + 0.001) * 2)
    lines.current.material.opacity = 0.45
    dotMat.opacity = progress.current * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 2 + def.pts.length))
  })

  return (
    <group ref={group}>
      <lineSegments ref={lines} geometry={lineGeo}>
        <lineBasicMaterial color="#d9b56a" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <points ref={dots} geometry={dotGeo} material={dotMat} />
    </group>
  )
}

let _glow = null
function glowTexture() {
  if (_glow) return _glow
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.18, 'rgba(255,230,190,0.45)')
  g.addColorStop(0.5, 'rgba(180,170,255,0.1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  _glow = new THREE.CanvasTexture(c)
  return _glow
}

let _dot = null
function dotTexture() {
  if (_dot) return _dot
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,240,200,0.8)')
  g.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  _dot = new THREE.CanvasTexture(c)
  return _dot
}

// ── Coming Soon cards: books still being drawn ─────────────────────────────────

function SoonBook({ t, book, index, m }) {
  const ref = useRef()
  const wire = useRef()
  const hov = useRef(0)
  const parts = useMemo(() => {
    const edges = closedEdgeTextures()
    const accent = book.theme_color || '#c9a84c'
    const T = Math.min(0.26, Math.max(0.1, (book.pages || 260) / 900 + 0.05))
    const std = o => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o })
    const cover = createSketchCoverMaterial({ map: t.cover, accent, offset: index * 3.3 })
    const geo = new THREE.BoxGeometry(1, t.aspect, T)
    return {
      geo, cover, edges: new THREE.EdgesGeometry(geo),
      mats: [
        std({ map: edges.side, roughness: 0.95 }), std({ map: t.spine, roughness: 0.45 }),
        std({ map: edges.top, roughness: 0.95 }), std({ map: edges.top, roughness: 0.95 }),
        cover, std({ color: new THREE.Color(darken(accent, 0.5)) }),
      ],
    }
  }, [t, book.pages, book.theme_color, index])

  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const slot = m.soon?.get(book.id)
    if (!slot || !onScreen(m, slot.rect, 40)) { g.visible = false; return }
    g.visible = true
    const tt = clock.elapsedTime
    parts.cover.uniforms.uTime.value = tt
    hov.current = lerp(hov.current, slot.hover ? 1 : 0, Math.min(1, delta * 6))
    const h = hov.current
    const r = slot.rect
    const [x, y] = toWorld(m, r.left + r.width / 2, r.top + r.height / 2)
    g.scale.setScalar(((r.height * m.px * 0.78) / t.aspect) * (1 + h * 0.05))
    g.position.set(x, y + Math.sin(tt * 0.9 + index) * 0.02, h * 0.5)
    g.rotation.set(-0.04 + pointer.y * 0.05, lerp(0.45 + Math.sin(tt * 0.4 + index) * 0.06, 0.05 + pointer.x * 0.1, h), 0)
    if (wire.current) wire.current.material.opacity = 0.3 + 0.18 * Math.sin(tt * 2.2 + index)
  })

  return (
    <group ref={ref}>
      <mesh geometry={parts.geo} material={parts.mats} />
      <lineSegments ref={wire} geometry={parts.edges} scale={1.015}>
        <lineBasicMaterial color="#f0d08a" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function SoonShelf({ tex, books, m }) {
  return books.map((b, i) => tex.get(b.id) && <SoonBook key={b.id} t={tex.get(b.id)} book={b} index={i} m={m} />)
}
