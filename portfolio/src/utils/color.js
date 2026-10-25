// Colour helpers for book theme colours (hex strings like "#c9a84c").
// Invalid or short input falls back to the default gold so styles never get NaN.

const FALLBACK = { r: 201, g: 168, b: 76 }

export function hexToRgb(hex) {
  let h = (hex || '').trim().replace('#', '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return FALLBACK
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function isLight(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// Darken by percent (0–1)
export function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const d = v => Math.max(0, Math.floor(v * (1 - amt)))
  return `rgb(${d(r)},${d(g)},${d(b)})`
}

// Lighten by percent (0–1)
export function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const l = v => Math.min(255, Math.floor(v + (255 - v) * amt))
  return `rgb(${l(r)},${l(g)},${l(b)})`
}
