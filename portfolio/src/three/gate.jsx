import { Component } from 'react'

// ── Immersive mode gate ────────────────────────────────────────────────────────
// WebGL scenes for capable browsers; reduced-motion users and browsers without
// WebGL keep the classic pages.
export function canImmerse() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

// If a 3D scene throws (driver bug, lost context…), fall back to the classic page
export class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFail() }
  render() { return this.state.failed ? null : this.props.children }
}
