import { useState, useEffect } from 'react'

export default function TerminalTyper({ lines, speed = 50, className = '' }) {
  const [displayed, setDisplayed] = useState([])
  const [currentLine, setCurrentLine] = useState(0)
  const [currentChar, setCurrentChar] = useState(0)

  useEffect(() => {
    if (currentLine >= lines.length) return
    const line = lines[currentLine]
    if (currentChar < line.length) {
      const t = setTimeout(() => setCurrentChar(c => c + 1), speed)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => {
        setDisplayed(d => [...d, line])
        setCurrentLine(l => l + 1)
        setCurrentChar(0)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [currentLine, currentChar, lines, speed])

  const currentText = currentLine < lines.length ? lines[currentLine].slice(0, currentChar) : ''

  return (
    <div className={className} style={{ fontFamily: 'var(--font-mono)' }}>
      {displayed.map((line, i) => (
        <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.8' }}>
          <span style={{ color: 'var(--cyan)', opacity: 0.7 }}>❯ </span>{line}
        </div>
      ))}
      {currentLine < lines.length && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.8' }}>
          <span style={{ color: 'var(--cyan)', opacity: 0.7 }}>❯ </span>
          {currentText}
          <span style={{ animation: 'blink 1s infinite', color: 'var(--cyan)' }}>█</span>
        </div>
      )}
    </div>
  )
}
