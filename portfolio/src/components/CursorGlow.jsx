import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      if (!glowRef.current) return
      glowRef.current.style.left = e.clientX + 'px'
      glowRef.current.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div ref={glowRef} style={{
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: 99999,
      width: '400px',
      height: '400px',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'radial-gradient(circle, rgba(0,229,255,0.07) 0%, rgba(0,229,255,0.03) 30%, transparent 70%)',
      transition: 'left 0.06s ease, top 0.06s ease',
    }} />
  )
}