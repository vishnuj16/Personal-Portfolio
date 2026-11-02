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

// ── HSL conversions (h, s, l in 0..1) ─────────────────────────────────────────

export function rgbToHex({ r, g, b }) {
  const h = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0)
  else if (max === G) h = (B - R) / d + 2
  else h = (R - G) / d + 4
  return { h: h / 6, s, l }
}

export function hslToHex(h, s, l) {
  const f = n => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 })
}

// HSV (h, s, v in 0..1) — the model behind the colour picker's square + hue strip
export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex)
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), d = max - Math.min(R, G, B)
  let h = 0
  if (d) {
    if (max === R) h = ((G - B) / d + 6) % 6
    else if (max === G) h = (B - R) / d + 2
    else h = (R - G) / d + 4
  }
  return { h: h / 6, s: max ? d / max : 0, v: max }
}

export function hsvToHex(h, s, v) {
  const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }
  return rgbToHex({ r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 })
}

export const isHex = v => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test((v || '').trim())

export const rgbTriplet = hex => { const { r, g, b } = hexToRgb(hex); return `${r},${g},${b}` }

// ── Author-page theme from one colour ─────────────────────────────────────────
// The night-sky author page takes its palette from the featured book's colour:
// highlights in a bright tint of it, glass and sky in deep shades of it, the
// galaxy's core and arms in pale tints. No colour → the original navy & gold.

export const DEFAULT_AUTHOR_THEME = {
  gold: '#d9b56a', goldLight: '#ecd08f', deep: '#14182e', deeper: '#080a14',
  skyTop: '#090e1f', skyBottom: '#020306', core: '#ffdb99', arm: '#9ebdff', star: '#dfe8ff',
}

export function authorTheme(accent) {
  if (!accent || !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent.trim())) return DEFAULT_AUTHOR_THEME
  const { h, s } = hexToHsl(accent)
  const neutral = s < 0.12                       // greys / near-whites → silver theme
  const hs = neutral ? 0.06 : Math.min(0.78, Math.max(0.42, s))
  return {
    gold:      hslToHex(h, hs, 0.64),
    goldLight: hslToHex(h, hs * 0.85, 0.8),
    deep:      hslToHex(h, neutral ? 0.08 : 0.4, 0.12),
    deeper:    hslToHex(h, neutral ? 0.08 : 0.4, 0.06),
    skyTop:    hslToHex(h, neutral ? 0.1 : 0.5, 0.1),
    skyBottom: hslToHex(h, neutral ? 0.1 : 0.5, 0.02),
    core:      hslToHex(h, neutral ? 0.1 : 0.85, 0.82),
    arm:       hslToHex((h + 0.06) % 1, neutral ? 0.08 : 0.55, 0.8),
    star:      hslToHex(h, neutral ? 0.05 : 0.35, 0.9),
  }
}

// CSS custom properties for the theme (used as var(--au-*, fallback) in styles)
export function authorThemeVars(t) {
  return {
    '--au-gold': t.gold, '--au-gold-rgb': rgbTriplet(t.gold),
    '--au-gold-light': t.goldLight, '--au-gold-light-rgb': rgbTriplet(t.goldLight),
    '--au-deep-rgb': rgbTriplet(t.deep), '--au-deeper-rgb': rgbTriplet(t.deeper),
    '--au-bg': t.skyBottom,
  }
}
