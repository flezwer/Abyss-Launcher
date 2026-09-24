import { useState } from 'react'
import './PlayerAvatar.css'

/**
 * PlayerAvatar — muestra la cabeza de la skin del jugador.
 * Usa Crafatar. Si falla, muestra la inicial del nombre.
 */
export default function PlayerAvatar({ account, size = 38, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!account) return null

  // Crafatar acepta username directamente para cuentas offline
  const identifier = account.uuid || account.username
  const url = `https://crafatar.com/avatars/${encodeURIComponent(identifier)}?size=${size}&overlay`

  const initial = account.username?.[0]?.toUpperCase() ?? '?'

  return failed ? (
    <div
      className={`player-avatar player-avatar--fallback ${className}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  ) : (
    <img
      src={url}
      alt={account.username}
      className={`player-avatar player-avatar--img ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  )
}
