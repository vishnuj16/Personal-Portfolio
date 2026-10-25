import * as THREE from 'three'
import { hexToRgb, darken } from '../utils/color'

// Procedural canvas textures for the 3D book and the loose pages.
// Everything is drawn at runtime so the scene needs no extra assets.

const PAPER = '#f4ecda'
const INK = '#2a2118'

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function toTexture(canvas, { repeat } = {}) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}

// Seeded random so textures look the same on every visit
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function paper(ctx, w, h, seed = 7) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  const r = rng(seed)
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.fillStyle = `rgba(110,85,50,${r() * 0.05})`
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2)
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, 'rgba(255,250,235,0)')
  g.addColorStop(1, 'rgba(120,90,50,0.22)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

// Darkening toward the spine side of a page
function gutter(ctx, w, h, side) {
  const x0 = side === 'left' ? 0 : w
  const g = ctx.createLinearGradient(x0, 0, side === 'left' ? w * 0.14 : w * 0.86, 0)
  g.addColorStop(0, 'rgba(60,40,20,0.35)')
  g.addColorStop(1, 'rgba(60,40,20,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function spaced(ctx, text, x, y, spacing) {
  // canvas letterSpacing isn't everywhere yet — draw glyph by glyph, centred on x
  const chars = [...text]
  const total = chars.reduce((s, ch) => s + ctx.measureText(ch).width + spacing, -spacing)
  let cx = x - total / 2
  for (const ch of chars) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
}

// Faint grey bars that read as "more text" at a glance
function textLines(ctx, x, y, w, count, lineH, seed) {
  const r = rng(seed)
  ctx.fillStyle = 'rgba(42,33,24,0.09)'
  for (let i = 0; i < count; i++) {
    const len = i === count - 1 ? w * (0.3 + r() * 0.3) : w * (0.82 + r() * 0.18)
    const indent = i === 0 ? w * 0.06 : 0
    ctx.fillRect(x + indent, y + i * lineH, len - indent, lineH * 0.28)
  }
}

function ornament(ctx, x, y, color, width = 220) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - width / 2, y)
  ctx.lineTo(x - 16, y)
  ctx.moveTo(x + 16, y)
  ctx.lineTo(x + width / 2, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y - 9)
  ctx.lineTo(x + 9, y)
  ctx.lineTo(x, y + 9)
  ctx.lineTo(x - 9, y)
  ctx.closePath()
  ctx.fill()
}

async function fontsReady() {
  if (!document.fonts?.load) return
  const want = [
    '700 64px "Playfair Display"',
    'italic 400 64px "Playfair Display"',
    'italic 400 64px "EB Garamond"',
    '400 30px "EB Garamond"',
    'italic 400 30px "Lora"',
    '400 30px "Lora"',
  ]
  await Promise.race([
    Promise.all(want.map(f => document.fonts.load(f))).catch(() => {}),
    new Promise(r => setTimeout(r, 2500)),
  ])
}

function loadImageTexture(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null)
    new THREE.TextureLoader().load(
      src,
      t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; resolve(t) },
      undefined,
      () => resolve(null),
    )
  })
}

function fallbackCover(title, accent) {
  const [c, ctx] = makeCanvas(1024, 1536)
  const g = ctx.createLinearGradient(0, 0, 1024, 1536)
  g.addColorStop(0, darken(accent, 0.35))
  g.addColorStop(1, darken(accent, 0.7))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 1536)
  ctx.fillStyle = '#f5f0e8'
  ctx.textAlign = 'center'
  ctx.font = '700 96px "Playfair Display", Georgia, serif'
  wrap(ctx, title, 820).forEach((l, i) => ctx.fillText(l, 512, 620 + i * 112))
  ornament(ctx, 512, 520, 'rgba(245,240,232,0.7)', 360)
  return toTexture(c)
}

function spineTexture(title, accent) {
  const [c, ctx] = makeCanvas(128, 1536)
  const g = ctx.createLinearGradient(0, 0, 128, 0)
  g.addColorStop(0, darken(accent, 0.6))
  g.addColorStop(0.5, darken(accent, 0.35))
  g.addColorStop(1, darken(accent, 0.6))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 1536)
  // gilt bands
  ctx.fillStyle = 'rgba(214,180,100,0.75)'
  for (const y of [70, 84, 1452, 1466]) ctx.fillRect(10, y, 108, 4)
  ctx.save()
  ctx.translate(64, 768)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = 'rgba(245,236,214,0.92)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 54
  ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`
  while (ctx.measureText(title).width > 1200 && size > 24) {
    size -= 2
    ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`
  }
  ctx.fillText(title, 0, 0)
  ctx.restore()
  return toTexture(c)
}

// Page edges: stripes run along the page stack
function edgeTexture(vertical) {
  const [c, ctx] = makeCanvas(vertical ? 256 : 16, vertical ? 16 : 256)
  ctx.fillStyle = '#efe5cf'
  ctx.fillRect(0, 0, c.width, c.height)
  const r = rng(3)
  for (let i = 0; i < 256; i += 2) {
    ctx.fillStyle = `rgba(150,120,80,${0.12 + r() * 0.18})`
    if (vertical) ctx.fillRect(i, 0, 1, 16)
    else ctx.fillRect(0, i, 16, 1)
  }
  return toTexture(c)
}

function fitText(ctx, text, fontFor, maxW, maxH, lhMul, start, min) {
  let size = start
  let lines
  for (;;) {
    ctx.font = fontFor(size)
    lines = wrap(ctx, text, maxW)
    if (lines.length * size * lhMul <= maxH || size <= min) break
    size -= 2
  }
  return { size, lines, lh: size * lhMul }
}

// Right-hand page. Returns the printed page *without* its main text, plus an
// "ink order" map: every glyph drawn in a grey level equal to its position in
// the text (alpha = glyph coverage). A shader uses it to write the line
// letter by letter with fresh, glowing ink.
function rightPage({ label, text, attribution, accent }) {
  const W = 1024, H = 1536
  const cx = W / 2 + 20
  const { r, g, b } = hexToRgb(accent)
  const tone = `rgb(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)})`

  const [oc, octx] = makeCanvas(W, H)
  const quoteFont = s => `italic 400 ${s}px "EB Garamond", Garamond, Georgia, serif`
  const q = fitText(octx, text, quoteFont, 760, 820, 1.3, 92, 36)
  const attrFont = '400 32px "EB Garamond", Garamond, Georgia, serif'
  const attr = attribution ? `— ${attribution}` : ''
  // Centre the text block on the page (slightly above middle, like a chapter opening)
  const blockH = (q.lines.length - 1) * q.lh + (attr ? 70 : 0)
  const top = Math.max(360, H * 0.45 - blockH / 2)
  const total = q.lines.reduce((n, l) => n + l.length, 0) + attr.length
  let index = 0
  const ink = (ch, x, y) => {
    const v = 1 + Math.floor((index++ / Math.max(1, total - 1)) * 254)
    octx.fillStyle = `rgb(${v},${v},${v})`
    octx.fillText(ch, x, y)
    return octx.measureText(ch).width
  }
  octx.textBaseline = 'alphabetic'
  octx.font = quoteFont(q.size)
  q.lines.forEach((line, i) => {
    let x = cx - octx.measureText(line).width / 2
    for (const ch of line) x += ink(ch, x, top + i * q.lh)
  })
  let y = top + (q.lines.length - 1) * q.lh
  if (attr) {
    octx.font = attrFont
    y += 70
    let x = cx - octx.measureText(attr).width / 2
    for (const ch of attr) x += ink(ch, x, y)
  }
  const order = new THREE.CanvasTexture(oc) // data, not colour: no sRGB decode
  order.anisotropy = 8
  // Premultiplied, so filtering at glyph edges keeps order/alpha exact (shader divides by alpha)
  order.premultiplyAlpha = true

  const [c, ctx] = makeCanvas(W, H)
  paper(ctx, W, H, 11)
  gutter(ctx, W, H, 'left')
  if (label) {
    ctx.fillStyle = tone
    ctx.font = 'italic 400 30px "Lora", Georgia, serif'
    spaced(ctx, label, cx, top - q.size - 70, 7)
    ornament(ctx, cx, top - q.size - 22, tone, 260)
  }
  ornament(ctx, cx, y + 110, 'rgba(42,33,24,0.35)', 90)
  ctx.fillStyle = 'rgba(42,33,24,0.45)'
  ctx.textAlign = 'center'
  ctx.font = 'italic 400 28px "Lora", Georgia, serif'
  ctx.fillText('1', cx, H - 90)

  return { base: toTexture(c), order, chars: total }
}


function titlePage({ title, subtitle, accent }) {
  const W = 1024, H = 1536
  const [c, ctx] = makeCanvas(W, H)
  paper(ctx, W, H, 23)
  gutter(ctx, W, H, 'right')
  const { r, g, b } = hexToRgb(accent)
  const tone = `rgb(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)})`
  const cx = W / 2 - 20

  ornament(ctx, cx, 470, tone, 300)
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  let size = 80
  let lines
  do {
    ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`
    lines = wrap(ctx, title, 760)
    size -= 4
  } while (lines.length > 4 && size > 40)
  const lh = (size + 4) * 1.18
  lines.forEach((l, i) => ctx.fillText(l, cx, 600 + i * lh))
  let y = 600 + lines.length * lh + 20
  if (subtitle) {
    ctx.fillStyle = 'rgba(42,33,24,0.62)'
    ctx.font = 'italic 400 38px "Playfair Display", Georgia, serif'
    wrap(ctx, subtitle, 700).forEach(l => { ctx.fillText(l, cx, y + 20); y += 52 })
  }
  ornament(ctx, cx, y + 70, tone, 120)

  ctx.fillStyle = tone
  ctx.font = '400 26px "Lora", Georgia, serif'
  spaced(ctx, 'STORIES BY VYAS', cx, H - 170, 8)
  return toTexture(c)
}

// Blank-ish page with faint text, for flipping sheets and the drifting pages
function textSheet(seed, withText = true) {
  const W = 512, H = 768
  const [c, ctx] = makeCanvas(W, H)
  paper(ctx, W, H, seed)
  if (withText) textLines(ctx, 60, 90, W - 120, 24, 25, seed + 1)
  return toTexture(c)
}

function shadowTexture() {
  const [c, ctx] = makeCanvas(256, 256)
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
  g.addColorStop(0, 'rgba(0,0,0,0.75)')
  g.addColorStop(0.6, 'rgba(0,0,0,0.3)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

export async function makeBookTextures({ title, subtitle, page, accent, coverSrc }) {
  const [cover] = await Promise.all([loadImageTexture(coverSrc), fontsReady()])
  const coverTex = cover || fallbackCover(title, accent)
  const img = coverTex.image
  const aspect = img?.width && img?.height ? Math.min(1.8, Math.max(1.1, img.height / img.width)) : 1.5

  return {
    aspect,
    cover: coverTex,
    spine: spineTexture(title, accent),
    edgeTop: edgeTexture(false),
    edgeSide: edgeTexture(true),
    page: rightPage({ ...page, accent }),
    title: titlePage({ title, subtitle, accent }),
    sheet: textSheet(31, false),
    shadow: shadowTexture(),
  }
}

// Glyph atlas for the drifting letters: an 8×8 grid of EB Garamond italics
const GLYPHS = 'aeionrstdlhcumwfgypbvkAEIRSTMNLOVWBGQ&¶§†‡?!;:“”æœß'.split('')
export const GLYPH_COUNT = GLYPHS.length

export async function makeGlyphAtlas() {
  await fontsReady()
  const cols = 8
  const cell = 128
  const [c, ctx] = makeCanvas(cols * cell, cols * cell)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'italic 400 96px "EB Garamond", Garamond, Georgia, serif'
  GLYPHS.forEach((g, i) => {
    ctx.fillText(g, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2 + 6)
  })
  const texture = new THREE.CanvasTexture(c)
  texture.anisotropy = 4
  return { texture, cols }
}

// Soft warm glow sprite (light rising off the open book's pages)
export function makeGlowTexture() {
  const [c, ctx] = makeCanvas(256, 256)
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// ── Engraved gold plaque with the book's details ───────────────────────────────
// Colour map: brushed gold with dark engraved lettering. Bump map: the same
// lettering sunk into a mid-grey plate so light catches the engraving.
export const PLAQUE_RATIO = 1.3 // height / width

export async function makePlaqueTextures({ title, rows, stamp }) {
  await fontsReady()
  const W = 1024, H = Math.round(1024 * PLAQUE_RATIO)
  const [c, ctx] = makeCanvas(W, H)
  const [bc, bctx] = makeCanvas(W, H)

  // brushed gold
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#b8893a')
  g.addColorStop(0.3, '#e9cd8a')
  g.addColorStop(0.55, '#c99a48')
  g.addColorStop(0.8, '#f0d897')
  g.addColorStop(1, '#a87a30')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const r = rng(9)
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(255,240,200,${r() * 0.12})` : `rgba(90,60,20,${r() * 0.1})`
    ctx.fillRect(0, r() * H, W, 1)
  }
  bctx.fillStyle = '#808080'
  bctx.fillRect(0, 0, W, H)

  // Engrave on both canvases: dark sunk strokes, plus a thin light lip below on the colour map
  const engrave = (draw) => {
    ctx.save(); ctx.translate(0, 2); ctx.fillStyle = ctx.strokeStyle = 'rgba(255,244,214,0.55)'; draw(ctx); ctx.restore()
    ctx.save(); ctx.fillStyle = ctx.strokeStyle = '#3a2810'; draw(ctx); ctx.restore()
    bctx.save(); bctx.fillStyle = bctx.strokeStyle = '#000'; draw(bctx); bctx.restore()
  }

  // double border + corner screws
  engrave(k => { k.lineWidth = 4; k.strokeRect(46, 46, W - 92, H - 92); k.lineWidth = 2; k.strokeRect(64, 64, W - 128, H - 128) })
  for (const [x, y] of [[100, 100], [W - 100, 100], [100, H - 100], [W - 100, H - 100]]) {
    const sg = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 18)
    sg.addColorStop(0, '#fff1c8'); sg.addColorStop(1, '#7a5520')
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill()
    engrave(k => { k.lineWidth = 3; k.beginPath(); k.moveTo(x - 9, y - 9); k.lineTo(x + 9, y + 9); k.stroke() })
  }

  const cx = W / 2
  engrave(k => { k.font = '400 30px "Lora", Georgia, serif'; k.textAlign = 'left'; spaced(k, 'STORIES BY VYAS', cx, 175, 9) })
  engrave(k => ornament(k, cx, 215, k.fillStyle, 300))

  // title
  const t = fitText(ctx, title, s => `700 ${s}px "Playfair Display", Georgia, serif`, 760, 260, 1.15, 76, 44)
  let y = 300 + t.size
  engrave(k => {
    k.font = `700 ${t.size}px "Playfair Display", Georgia, serif`; k.textAlign = 'center'
    t.lines.forEach((l, i) => k.fillText(l, cx, y + i * t.lh))
  })
  y += (t.lines.length - 1) * t.lh + 70
  engrave(k => ornament(k, cx, y, k.fillStyle, 160))
  y += 90

  // details: label ...... value
  const rowH = Math.min(104, (H - 230 - y) / Math.max(1, rows.length))
  rows.forEach(([label, value], i) => {
    const ry = y + i * rowH
    engrave(k => {
      k.textAlign = 'left'; k.font = 'italic 500 48px "EB Garamond", Garamond, Georgia, serif'
      k.fillText(label, 140, ry)
      const lw = k.measureText(label).width
      k.textAlign = 'right'; k.font = '700 46px "Playfair Display", Georgia, serif'
      k.fillText(value, W - 140, ry)
      const vw = k.measureText(value).width
      k.textAlign = 'left'
      for (let x = 140 + lw + 18; x < W - 140 - vw - 18; x += 16) k.fillRect(x, ry - 9, 4, 4)
    })
  })

  if (stamp) engrave(k => { k.font = 'italic 500 46px "EB Garamond", Garamond, Georgia, serif'; k.textAlign = 'center'; k.fillText(stamp, cx, H - 140) })

  const map = toTexture(c)
  const bump = new THREE.CanvasTexture(bc)
  bump.anisotropy = 8
  return { map, bump }
}

// ── Closed books (author page: orrery, featured ring, shelf) ──────────────────
// Only what a closed book shows: cover, spine, page edges. Cached per book so the
// same book in several places loads once.
const closedCache = new Map()
let sharedEdges = null

export function closedEdgeTextures() {
  if (!sharedEdges) sharedEdges = { top: edgeTexture(false), side: edgeTexture(true) }
  return sharedEdges
}

export function makeClosedBookTextures({ id, title, accent, coverSrc }) {
  const key = `${id}|${coverSrc}|${accent}|${title}`
  if (!closedCache.has(key)) {
    closedCache.set(key, (async () => {
      const [cover] = await Promise.all([loadImageTexture(coverSrc), fontsReady()])
      const coverTex = cover || fallbackCover(title, accent)
      const img = coverTex.image
      const aspect = img?.width && img?.height ? Math.min(1.8, Math.max(1.1, img.height / img.width)) : 1.5
      return { cover: coverTex, spine: spineTexture(title, accent), aspect }
    })())
  }
  return closedCache.get(key)
}

// Soft streak for shooting stars: bright head on the right, fading tail to the left
export function makeStreakTexture() {
  const [c, ctx] = makeCanvas(256, 16)
  const g = ctx.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.85, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = g
  ctx.fillRect(0, 6, 256, 4)
  return new THREE.CanvasTexture(c)
}
