import './DownloadQueue.css'

function fmtEta(s) {
  if (!s || s <= 0) return ''
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.round(s / 60)}m`
}

export default function DownloadQueue({ queue }) {
  if (queue.length === 0) return null
  return (
    <div className="dq-panel">
      <div className="dq-header">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5}}>
          <polyline points="8 17 12 21 16 17"/><line x1="12" y1="21" x2="12" y2="3"/>
        </svg>
        Descargas ({queue.length})
      </div>
      {queue.map(item => (
        <div key={item.id} className={`dq-item dq-item--${item.status}`}>
          <div className="dq-row1">
            <span className="dq-name">{item.name}</span>
            <span className="dq-status">
              {item.status === 'downloading' && <span className="dq-spinner" />}
              {item.status === 'done' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              {item.status === 'error' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            </span>
          </div>
          {item.status === 'downloading' && (item.totalBytes > 0 || item.progress > 0) && (
            <div className="dq-progress-bar">
              <div className="dq-progress-fill" style={{ width: `${Math.min(item.progress, 100)}%` }} />
            </div>
          )}
          {item.status === 'downloading' && item.totalBytes > 0 && (
            <div className="dq-meta">
              <span>{item.speed > 0 ? `${item.speed.toFixed(1)} MB/s` : ''}</span>
              <span>{item.eta > 0 ? `ETA ${fmtEta(item.eta)}` : `${item.progress}%`}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
