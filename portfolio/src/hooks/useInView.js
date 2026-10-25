import { useCallback, useRef, useState } from 'react'

// Returns [ref, inView]. Flips to true once the element scrolls into view and stays true.
// `ref` is a callback ref, so it works for elements that mount after the first render.
// With prefers-reduced-motion it starts as true so nothing waits to animate.
//
// The observer is only disconnected from the ref callback itself (React calls it with
// null on unmount). A mount-only cleanup effect would also run during StrictMode's
// simulated remount in dev, killing the observer for good and leaving content invisible.
export default function useInView(threshold = 0.25) {
  const observer = useRef(null)
  const [inView, setInView] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window))
  )

  const ref = useCallback((node) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node || inView) return
    observer.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.current?.disconnect() }
    }, { threshold })
    observer.current.observe(node)
  }, [inView, threshold])

  return [ref, inView]
}
