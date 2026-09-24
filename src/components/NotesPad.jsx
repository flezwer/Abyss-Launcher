import { useState, useEffect, useRef } from 'react'
import './NotesPad.css'

export default function NotesPad({ open, onClose }) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(true)
  const saveTimer = useRef(null)

  useEffect(() => {
    if (open) {
      window.eclipse.loadNotes().then(r => setNotes(r.notes || '')).catch(() => {})
    }
  }, [open])

  const handleChange = (val) => {
    setNotes(val)
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.eclipse.saveNotes(val)
      setSaved(true)
    }, 800)
  }

  if (!open) return null

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <span style={{display:'flex',alignItems:'center',gap:5}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Notas
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="notes-saved">{saved ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:2}}><polyline points="20 6 9 17 4 12"/></svg>Guardado</> : '...'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      </div>
      <textarea
        className="notes-area"
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder={"Anota IPs de servidores, coordenadas,\nrecordatorios o cualquier cosa...\n\nEj:\n• Servidor survival: play.example.com\n• Diamantes: X=42, Y=12, Z=-88"}
      />
    </div>
  )
}
