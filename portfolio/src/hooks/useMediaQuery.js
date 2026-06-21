import { useEffect, useState } from 'react'

export default function useMediaQuery(maxWidth = 768) {
  const getMatch = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= maxWidth
  }

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    const onResize = () => setMatches(getMatch())
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [maxWidth])

  return matches
}
