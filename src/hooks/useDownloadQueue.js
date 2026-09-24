import { useState, useCallback } from 'react'

export function useDownloadQueue() {
  const [queue, setQueue] = useState([]) // [{id, name, status, progress, speed, eta, totalBytes, _t0, _received}]

  const addToQueue = useCallback((id, name, totalBytes = 0) => {
    setQueue(prev => [...prev, { id, name, status: 'downloading', progress: 0, speed: 0, eta: 0, totalBytes, _t0: Date.now(), _received: 0 }])
  }, [])

  const updateQueue = useCallback((id, patch) => {
    setQueue(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item
        const update = typeof patch === 'string' ? { status: patch } : patch
        const merged = { ...item, ...update }
        // compute speed + ETA when bytes are reported
        if (update.received != null && item.totalBytes > 0) {
          const elapsed = Math.max((Date.now() - item._t0) / 1000, 0.1)
          merged.speed = update.received / elapsed / 1048576  // MB/s
          merged.progress = Math.round(update.received / item.totalBytes * 100)
          merged.eta = merged.speed > 0 ? (item.totalBytes - update.received) / (merged.speed * 1048576) : 0
          merged._received = update.received
        } else if (update.progress != null) {
          merged.progress = update.progress
        }
        return merged
      })
      return next
    })
    const statusVal = typeof patch === 'string' ? patch : patch?.status
    if (statusVal === 'done' || statusVal === 'error') {
      setTimeout(() => setQueue(prev => prev.filter(item => item.id !== id)), 3000)
    }
  }, [])

  const clearQueue = useCallback(() => setQueue([]), [])

  return { queue, addToQueue, updateQueue, clearQueue }
}
