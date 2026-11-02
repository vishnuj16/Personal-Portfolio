import { useState, useEffect, useRef, useCallback } from 'react'
import { hexToRgb, rgbToHex, hexToHsv, hsvToHex, isHex, isLight, authorTheme } from '../utils/color'

// Full colour picker for book theme colours: saturation/brightness square, hue
// strip, hex + RGB fields, presets, colours pulled from the cover, and the
// browser eyedropper where it exists. Value in and out is a "#rrggbb" string.

const PRESETS = [
  '#e63946', '#c1121f', '#e76f51', '#f4a261', '#e9c46a', '#c9a84c', '#2a9d8f', '#52b788',
  '#457b9d', '#264653', '#6a4c93', '#9b5de5', '#f72585', '#b5179e', '#6b4226', '#8b8000',
]

const INK = '#3d2e1a'
const MUTED = '#9a8060'
const EDGE = 'rgba(201,168,76,0.25)'

const field = {
  padding: '7px 8px', background: '#fdf9f3', border: `1px solid ${EDGE}`, borderRadius: 7,
  fontFamily: 'monospace', fontSize: '0.82rem', color: INK, outline: 'none', boxSizing: 'border-box', width: '100%',
}

const clamp01 = v => Math.max(0, Math.min(1, v))

// Most prominent distinct colours in an image: 32×32 sample, 4-bit buckets,
// ranked by count weighted toward saturated tones (covers are mostly dark/white).
export function coverPalette(img, count = 6) {
  const N = 32
  const c = document.createElement('canvas')
  c.width = N; c.height = N
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, N, N)
  const data = ctx.getImageData(0, 0, N, N).data   // throws if the image is cross-origin tainted
  const buckets = new Map()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const key = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4)
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }
    b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]
    buckets.set(key, b)
  }
  const ranked = [...buckets.values()].map(b => {
    const hex = rgbToHex({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n })
    const { s, v } = hexToHsv(hex)
    return { hex, score: b.n * (0.25 + s) * (v < 0.12 ? 0.3 : 1) }
  }).sort((a, b) => b.score - a.score)
  const picked = []
  const far = (a, b) => {
    const A = hexToRgb(a), B = hexToRgb(b)
    return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b) > 48
  }
  for (const { hex } of ranked) {
    if (picked.every(p => far(p, hex))) picked.push(hex)
    if (picked.length === count) break
  }
  return picked
}

function Swatch({ color, active, onPick }) {
  return (
    <button type="button" onClick={() => onPick(color)} title={color} aria-label={color} style={{
      width: 22, height: 22, borderRadius: '50%', padding: 0, cursor: 'pointer', background: color, flexShrink: 0,
      border: active ? `2px solid ${INK}` : '2px solid rgba(255,255,255,0.7)',
      boxShadow: '0 0 0 1px rgba(61,46,26,0.15)',
      transform: active ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.1s',
    }} />
  )
}

// Drag handler for the square and the hue strip: reports pointer position as 0..1 fractions
function useDrag(onMove) {
  const ref = useRef(null)
  const move = useCallback(e => {
    const r = ref.current.getBoundingClientRect()
    onMove(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height))
  }, [onMove])
  const handlers = {
    onPointerDown: e => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); move(e) },
    onPointerMove: e => { if (ref.current.hasPointerCapture(e.pointerId)) move(e) },
  }
  return [ref, handlers]
}

export default function ColorPicker({ value, onChange, coverUrl, fallback = '#c9a84c' }) {
  const hex = isHex(value) ? rgbToHex(hexToRgb(value)) : fallback
  // HSV is kept locally so the hue survives dragging into greys/black
  const [hsv, setHsv] = useState(() => hexToHsv(hex))
  const [hexText, setHexText] = useState(hex)
  const [fromCover, setFromCover] = useState([])
  const [coverNote, setCoverNote] = useState('')

  // Follow outside changes (presets, cover, typing) without clobbering the local hue
  useEffect(() => {
    setHexText(hex)
    setHsv(cur => hsvToHex(cur.h, cur.s, cur.v) === hex ? cur : hexToHsv(hex))
  }, [hex])

  const emit = useCallback(next => {
    setHsv(next)
    onChange(hsvToHex(next.h, next.s, next.v))
  }, [onChange])

  const [svRef, svHandlers] = useDrag(useCallback((x, y) => emit({ ...hsv, s: x, v: 1 - y }), [emit, hsv]))
  const [hueRef, hueHandlers] = useDrag(useCallback(x => emit({ ...hsv, h: Math.min(x, 0.9999) }), [emit, hsv]))

  // Read dominant colours off the cover whenever it changes
  useEffect(() => {
    setFromCover([]); setCoverNote('')
    if (!coverUrl) return
    let alive = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!alive) return
      try { setFromCover(coverPalette(img)) } catch { setCoverNote('Cover colours unavailable for this image') }
    }
    img.onerror = () => alive && setCoverNote('Cover colours unavailable for this image')
    img.src = coverUrl
    return () => { alive = false }
  }, [coverUrl])

  const canEyedrop = typeof window !== 'undefined' && 'EyeDropper' in window
  const eyedrop = async () => {
    try { const { sRGBHex } = await new window.EyeDropper().open(); onChange(rgbToHex(hexToRgb(sRGBHex))) } catch { /* cancelled */ }
  }

  const rgb = hexToRgb(hex)
  const setChannel = (k, raw) => {
    const n = Math.max(0, Math.min(255, parseInt(raw, 10) || 0))
    onChange(rgbToHex({ ...rgb, [k]: n }))
  }

  const hueHex = hsvToHex(hsv.h, 1, 1)
  const night = authorTheme(hex)
  const thumb = {
    position: 'absolute', width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.3)', transform: 'translate(-50%,-50%)', pointerEvents: 'none',
  }
  const caption = { fontFamily: "'Lora', serif", fontSize: '0.66rem', color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }

  return (
    <div>
      {/* Saturation × brightness */}
      <div ref={svRef} {...svHandlers} role="slider" aria-label="Saturation and brightness"
        aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        style={{
          position: 'relative', height: 150, borderRadius: 9, cursor: 'crosshair', touchAction: 'none',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})`,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}>
        <div style={{ ...thumb, left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
      </div>

      {/* Hue */}
      <div ref={hueRef} {...hueHandlers} role="slider" aria-label="Hue" aria-valuemin={0} aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h * 360)}
        style={{
          position: 'relative', height: 14, borderRadius: 7, marginTop: 12, cursor: 'ew-resize', touchAction: 'none',
          background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
        }}>
        <div style={{ ...thumb, left: `${hsv.h * 100}%`, top: '50%', background: hueHex }} />
      </div>

      {/* Hex · R · G · B · eyedropper */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ width: 38, height: 34, borderRadius: 8, background: hex, flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }} />
        <label style={{ flex: '1 1 90px', minWidth: 90 }}>
          <div style={caption}>Hex</div>
          <input value={hexText} spellCheck={false} maxLength={7} style={field}
            onChange={e => {
              const t = e.target.value
              setHexText(t)
              if (isHex(t) && t.replace('#', '').length === 6) onChange(rgbToHex(hexToRgb(t)))
            }}
            onBlur={() => { if (isHex(hexText)) onChange(rgbToHex(hexToRgb(hexText))); else setHexText(hex) }} />
        </label>
        {['r', 'g', 'b'].map(k => (
          <label key={k} style={{ flex: '0 1 58px', minWidth: 50 }}>
            <div style={caption}>{k}</div>
            <input type="number" min={0} max={255} value={rgb[k]} style={field} onChange={e => setChannel(k, e.target.value)} />
          </label>
        ))}
        {canEyedrop && (
          <button type="button" onClick={eyedrop} title="Pick a colour from the screen" style={{
            height: 34, padding: '0 11px', borderRadius: 8, border: `1px solid ${EDGE}`, background: '#fdf9f3',
            color: INK, cursor: 'pointer', fontFamily: "'Lora', serif", fontSize: '0.75rem',
          }}>Eyedropper</button>
        )}
      </div>

      {/* From the cover */}
      {(fromCover.length > 0 || coverNote) && (
        <div style={{ marginTop: 14 }}>
          <div style={caption}>From the cover</div>
          {fromCover.length > 0
            ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{fromCover.map(c => <Swatch key={c} color={c} active={c === hex} onPick={onChange} />)}</div>
            : <div style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', color: MUTED, fontStyle: 'italic' }}>{coverNote}</div>}
        </div>
      )}

      {/* Presets */}
      <div style={{ marginTop: 14 }}>
        <div style={caption}>Presets</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map(c => <Swatch key={c} color={c} active={c === hex} onPick={onChange} />)}
        </div>
      </div>

      {/* What it becomes */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px', padding: '8px 12px', borderRadius: 7, background: hex, fontSize: '0.72rem', fontStyle: 'italic', fontFamily: "'Lora', serif", color: isLight(hex) ? '#1a1410' : '#f5f0e8' }}>
          Book page hero & card accent
        </div>
        <div title="Author page palette when this book is the new release" style={{
          flex: '1 1 160px', padding: '8px 12px', borderRadius: 7, fontSize: '0.72rem', fontStyle: 'italic', fontFamily: "'Lora', serif",
          background: `radial-gradient(circle at 80% 50%, ${night.core}55, transparent 45%), linear-gradient(180deg, ${night.skyTop}, ${night.skyBottom})`,
          color: night.goldLight, border: `1px solid ${night.gold}55`,
        }}>
          ✦ Night sky, if new release
        </div>
      </div>
    </div>
  )
}
