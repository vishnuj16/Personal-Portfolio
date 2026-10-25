import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Sky, Stars, ShootingStars } from './AuthorExperience'

// ── Announcement page: "a letter from the author" ──────────────────────────────
// The author page's night sky, and at the top a 3D envelope closed with a gold
// wax seal: the flap swings open and the letter rises out of it. The letter's
// text itself is HTML below.

const FOV = 35
const CAM_Z = 12
const clamp01 = v => Math.max(0, Math.min(1, v))
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutBack = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const pointer = { x: 0, y: 0 }

export default function LetterExperience(props) {
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

function Scene({ anchors, isMobile, title }) {
  const { gl, scene } = useThree()
  const m = useRef({ vw: 1, vh: 1, worldW: 1, worldH: 1, px: 1, scroll: 0 }).current

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
    m.slot = anchors.envelope.current?.getBoundingClientRect() || null
  }, -1)

  return (
    <>
      <Sky />
      <Stars m={m} isMobile={isMobile} />
      <ShootingStars m={m} />
      <ambientLight intensity={0.9} color="#e8ecff" />
      <directionalLight position={[-3, 4, 8]} intensity={2.2} color="#fff1dc" />
      <pointLight position={[4, -2, 4]} intensity={18} distance={20} color="#ffd9a0" />
      <Envelope m={m} title={title} />
    </>
  )
}

// ── Textures ───────────────────────────────────────────────────────────────────

function paperTexture({ w = 512, h = 340, tint = '#efe4c8', lines = false, heading = '' } = {}) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < (w * h) / 700; i++) {
    ctx.fillStyle = `rgba(120,95,60,${Math.random() * 0.05})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7)
  g.addColorStop(0, 'rgba(255,250,235,0)')
  g.addColorStop(1, 'rgba(120,90,50,0.22)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  if (heading) {
    ctx.fillStyle = 'rgba(60,44,24,0.85)'
    ctx.textAlign = 'center'
    ctx.font = 'italic 400 30px "EB Garamond", Garamond, Georgia, serif'
    ctx.fillText(heading, w / 2, 58)
    ctx.fillStyle = 'rgba(160,120,50,0.8)'
    ctx.fillRect(w / 2 - 40, 74, 80, 2)
  }
  if (lines) {
    ctx.fillStyle = 'rgba(60,44,24,0.14)'
    for (let i = 0; i < 9; i++) ctx.fillRect(60, 110 + i * 24, (w - 120) * (i === 8 ? 0.5 : 0.85 + Math.random() * 0.15), 6)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function sealTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(100, 90, 10, 128, 128, 128)
  g.addColorStop(0, '#f6dc98'); g.addColorStop(0.5, '#c99a48'); g.addColorStop(1, '#7a5418')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(90,60,20,0.6)'
  ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(128, 128, 82, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = 'rgba(90,60,20,0.6)'
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? 26 : 62
    ctx.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r)
  }
  ctx.closePath(); ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,0.8)')
  g.addColorStop(0.3, 'rgba(255,225,170,0.3)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// ── Envelope ───────────────────────────────────────────────────────────────────
// Local units: the envelope is 2 wide × 1.3 tall, centred on the origin.

const W = 2, H = 1.3

function shapeGeo(points) {
  const s = new THREE.Shape()
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  return new THREE.ShapeGeometry(s)
}

function Envelope({ m, title }) {
  const group = useRef()
  const flap = useRef()
  const letter = useRef()
  const glow = useRef()
  const born = useRef(null)

  const parts = useMemo(() => {
    const paper = paperTexture()
    const std = o => new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide, ...o })
    return {
      // inside of the envelope, in shadow
      back: { geo: new THREE.PlaneGeometry(W, H), mat: std({ map: paper, color: '#a8987a' }) },
      // the front pocket: everything below the V where the flap tucks in
      pocket: {
        geo: shapeGeo([[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [0, -0.08], [-W / 2, H / 2]]),
        mat: std({ map: paper, color: '#efe3c6' }),
      },
      // the flap hangs from the top edge (pivot at y = 0 of its group)
      flap: { geo: shapeGeo([[-W / 2, 0], [W / 2, 0], [0, -0.78]]), mat: std({ map: paper, color: '#dfd0ae' }) },
      letter: { geo: new THREE.PlaneGeometry(W * 0.9, H * 0.92), mat: new THREE.MeshStandardMaterial({ map: paperTexture({ w: 512, h: 340, tint: '#fbf5e6', lines: true, heading: title ? 'A letter from the author' : '' }), roughness: 0.95 }) },
      seal: {
        geo: new THREE.CylinderGeometry(0.17, 0.18, 0.05, 40),
        mat: [
          new THREE.MeshStandardMaterial({ color: '#b8873a', metalness: 0.6, roughness: 0.35 }),
          new THREE.MeshStandardMaterial({ map: sealTexture(), metalness: 0.55, roughness: 0.3, envMapIntensity: 1.2 }),
          new THREE.MeshStandardMaterial({ color: '#b8873a', metalness: 0.6, roughness: 0.35 }),
        ],
      },
      trim: new THREE.LineBasicMaterial({ color: '#c9a050', transparent: true, opacity: 0.7 }),
      trimGeo: new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, H)),
      // the pocket's folds: the V the flap tucks into, and the two lower side seams
      foldGeo: new THREE.BufferGeometry().setFromPoints([
        [-W / 2, H / 2], [0, -0.08], [0, -0.08], [W / 2, H / 2],
        [-W / 2, -H / 2], [-0.18, -0.02], [W / 2, -H / 2], [0.18, -0.02],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0))),
      flapEdgeGeo: new THREE.BufferGeometry().setFromPoints([[-W / 2, 0], [0, -0.78], [0, -0.78], [W / 2, 0]].map(([x, y]) => new THREE.Vector3(x, y, 0.002))),
      glowTex: glowTexture(),
    }
  }, [title])

  useFrame(({ clock }) => {
    const g = group.current
    const r = m.slot
    if (!g) return
    if (!r || r.bottom < -100 || r.top > m.vh + 100) { g.visible = false; glow.current.visible = false; return }
    g.visible = glow.current.visible = true
    const t = clock.elapsedTime
    if (born.current === null) born.current = t
    const age = t - born.current

    // 0.5 s pause, flap opens over 1.3 s, then the letter rises over 1.1 s
    const open = easeInOut(clamp01((age - 0.5) / 1.3))
    const rise = easeOutBack(clamp01((age - 1.6) / 1.1))
    // tip lifts toward the viewer, swings over the top, and comes to rest leaning back
    flap.current.rotation.x = -open * Math.PI * 1.06
    letter.current.position.y = -0.04 + rise * 0.62

    const x = ((r.left + r.width / 2) / m.vw - 0.5) * m.worldW
    const y = -((r.top + r.height * 0.62) / m.vh - 0.5) * m.worldH
    const s = (r.width * m.px) / W * 0.82
    g.scale.setScalar(s)
    g.position.set(x, y + Math.sin(t * 1.1) * 0.04, 0)
    g.rotation.set(-0.12 + pointer.y * 0.1, pointer.x * 0.22 + Math.sin(t * 0.4) * 0.04, Math.sin(t * 0.5) * 0.015)

    glow.current.position.set(x, y + s * 0.35, -0.5)
    glow.current.scale.set(s * 4.2, s * 3, 1)
    glow.current.material.opacity = 0.22 + 0.25 * rise
  })

  return (
    <>
      <mesh ref={glow} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={parts.glowTex} color="#ffd9a0" transparent opacity={0}
          blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={group}>
        <mesh geometry={parts.back.geo} material={parts.back.mat} position={[0, 0, -0.02]} />
        <lineSegments geometry={parts.trimGeo} material={parts.trim} position={[0, 0, -0.019]} />
        <mesh ref={letter} geometry={parts.letter.geo} material={parts.letter.mat} position={[0, -0.04, 0]} />
        <mesh geometry={parts.pocket.geo} material={parts.pocket.mat} position={[0, 0, 0.02]} />
        <lineSegments geometry={parts.foldGeo} material={parts.trim} position={[0, 0, 0.022]} />
        <lineSegments geometry={parts.trimGeo} material={parts.trim} position={[0, 0, 0.022]} />
        <group ref={flap} position={[0, H / 2, 0.03]}>
          <mesh geometry={parts.flap.geo} material={parts.flap.mat} />
          <lineSegments geometry={parts.flapEdgeGeo} material={parts.trim} />
          <mesh geometry={parts.seal.geo} material={parts.seal.mat} position={[0, -0.62, 0.03]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
    </>
  )
}
