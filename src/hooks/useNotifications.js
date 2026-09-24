import { useState, useCallback } from 'react'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])

  const notify = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random()
    setNotifications(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), duration)
    }
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return { notify, notifications, dismiss }
}
