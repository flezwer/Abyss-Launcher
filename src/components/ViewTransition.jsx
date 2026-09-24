import { useState, useEffect, useRef } from 'react'
import './ViewTransition.css'

export default function ViewTransition({ viewKey, children }) {
  const [displayKey, setDisplayKey] = useState(viewKey)
  const [phase, setPhase] = useState('idle') // 'exit' | 'enter' | 'idle'
  const pendingKey = useRef(null)

  useEffect(() => {
    if (viewKey === displayKey) return
    pendingKey.current = viewKey
    setPhase('exit')
  }, [viewKey])

  const handleAnimEnd = () => {
    if (phase === 'exit') {
      setDisplayKey(pendingKey.current)
      setPhase('enter')
    } else if (phase === 'enter') {
      setPhase('idle')
    }
  }

  return (
    <div
      className={`vt-wrap vt-${phase}`}
      onAnimationEnd={handleAnimEnd}
    >
      {children(displayKey)}
    </div>
  )
}
