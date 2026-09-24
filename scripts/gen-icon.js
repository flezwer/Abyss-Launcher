const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2

  ctx.clearRect(0, 0, size, size)

  // ── Clip al círculo ──────────────────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2)
  ctx.clip()

  // Base negra
  ctx.fillStyle = '#06060c'
  ctx.fillRect(0, 0, size, size)

  // Gradiente radial: centro azul marino oscuro → borde morado profundo
  const radial = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, r * 0.92)
  radial.addColorStop(0,   'rgba(10, 12, 50, 0.95)')
  radial.addColorStop(0.5, 'rgba(30, 10, 80, 0.90)')
  radial.addColorStop(1,   'rgba(90, 15, 160, 0.85)')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, size, size)

  // Brillo superior suave (reflexión de luz)
  const topGlow = ctx.createRadialGradient(cx, cy * 0.3, 0, cx, cy * 0.3, r * 0.7)
  topGlow.addColorStop(0,   'rgba(120, 80, 220, 0.25)')
  topGlow.addColorStop(1,   'rgba(120, 80, 220, 0)')
  ctx.fillStyle = topGlow
  ctx.fillRect(0, 0, size, size)

  // Punto de luz central muy sutil
  const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.4)
  centerGlow.addColorStop(0,   'rgba(160, 120, 255, 0.12)')
  centerGlow.addColorStop(1,   'rgba(160, 120, 255, 0)')
  ctx.fillStyle = centerGlow
  ctx.fillRect(0, 0, size, size)

  ctx.restore()

  // ── Borde exterior: glow morado multicapa ────────────────────────────────
  const borderW = r * 0.055

  // Glow externo difuso
  for (const [alpha, width] of [[0.08, 6], [0.14, 4], [0.22, 2.5]]) {
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(148, 60, 240, ${alpha})`
    ctx.lineWidth = borderW * width
    ctx.stroke()
  }

  // Borde nítido principal
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92 - borderW * 0.5, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(160, 80, 255, 0.95)'
  ctx.lineWidth = borderW
  ctx.stroke()

  // Reflejo interno (borde interior más claro en la parte superior)
  const innerGradStroke = ctx.createLinearGradient(cx, 0, cx, size)
  innerGradStroke.addColorStop(0,   'rgba(200, 160, 255, 0.35)')
  innerGradStroke.addColorStop(0.5, 'rgba(160, 80, 255, 0.10)')
  innerGradStroke.addColorStop(1,   'rgba(80,  20, 180, 0.05)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92 - borderW * 1.5, 0, Math.PI * 2)
  ctx.strokeStyle = innerGradStroke
  ctx.lineWidth = borderW * 0.6
  ctx.stroke()

  return canvas
}

function buildIco(pngBuffers, sizes) {
  const n   = sizes.length
  const dir = 6 + 16 * n
  let offset = dir
  const offsets = []

  for (const buf of pngBuffers) {
    offsets.push(offset)
    offset += buf.length
  }

  const total = offset
  const ico   = Buffer.alloc(total)

  // Header
  ico.writeUInt16LE(0, 0)
  ico.writeUInt16LE(1, 2)
  ico.writeUInt16LE(n, 4)

  // Directory
  for (let i = 0; i < n; i++) {
    const base = 6 + i * 16
    const s    = sizes[i]
    ico.writeUInt8(s >= 256 ? 0 : s, base + 0)
    ico.writeUInt8(s >= 256 ? 0 : s, base + 1)
    ico.writeUInt8(0,  base + 2)
    ico.writeUInt8(0,  base + 3)
    ico.writeUInt16LE(1,  base + 4)
    ico.writeUInt16LE(32, base + 6)
    ico.writeUInt32LE(pngBuffers[i].length, base + 8)
    ico.writeUInt32LE(offsets[i],           base + 12)
  }

  let pos = dir
  for (const buf of pngBuffers) {
    buf.copy(ico, pos)
    pos += buf.length
  }

  return ico
}

const outDir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(outDir, { recursive: true })

// PNG 256×256
const canvas256 = drawIcon(256)
fs.writeFileSync(path.join(outDir, 'icon.png'), canvas256.toBuffer('image/png'))
console.log('icon.png generado')

// ICO multi-tamaño
const sizes = [256, 128, 64, 48, 32, 16]
const bufs  = sizes.map(s => drawIcon(s).toBuffer('image/png'))
fs.writeFileSync(path.join(outDir, 'icon.ico'), buildIco(bufs, sizes))
console.log('icon.ico generado')
