import { useEffect } from 'react'

export function useShortcuts({ setView, clearLogs, launchGame } = {}) {
  useEffect(() => {
    const handler = (e) => {
      // Ignore when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

      if (e.ctrlKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setView?.('home'); break
          case '2': e.preventDefault(); setView?.('mods'); break
          case '3': e.preventDefault(); setView?.('accounts'); break
          case '4': e.preventDefault(); setView?.('settings'); break
          case '5': e.preventDefault(); setView?.('console'); break
          case 'l':
          case 'L': e.preventDefault(); clearLogs?.(); break
          case 'Enter': e.preventDefault(); launchGame?.(); break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setView, clearLogs, launchGame])
}
