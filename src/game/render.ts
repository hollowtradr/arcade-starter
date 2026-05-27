/**
 * src/game/render.ts — canvas rendering for "Tap-the-Sticker"
 *
 * Studios: delete and replace. The canvas element (#game-canvas) is yours.
 */

import { type GameState } from './state.js'

let _canvas: HTMLCanvasElement | null = null
let _ctx: CanvasRenderingContext2D | null = null

export function initCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  _canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  _ctx = _canvas.getContext('2d')!
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  return { canvas: _canvas, ctx: _ctx }
}

function resizeCanvas(): void {
  if (!_canvas) return
  _canvas.width  = window.innerWidth  * devicePixelRatio
  _canvas.height = window.innerHeight * devicePixelRatio
  _canvas.style.width  = `${window.innerWidth}px`
  _canvas.style.height = `${window.innerHeight}px`
  if (_ctx) _ctx.scale(devicePixelRatio, devicePixelRatio)
}

export function getCanvasSize(): { w: number; h: number } {
  if (!_canvas) return { w: 390, h: 844 }
  return { w: _canvas.width / devicePixelRatio, h: _canvas.height / devicePixelRatio }
}

const BG_GRADIENT_TOP    = '#0f0f23'
const BG_GRADIENT_BOTTOM = '#1a0a2e'

export function renderFrame(state: GameState, _dt: number): void {
  if (!_ctx || !_canvas) return
  const { w, h } = getCanvasSize()

  // Background
  const bg = _ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, BG_GRADIENT_TOP)
  bg.addColorStop(1, BG_GRADIENT_BOTTOM)
  _ctx.fillStyle = bg
  _ctx.fillRect(0, 0, w, h)

  // Subtle star particles (cheap: just fixed dots)
  drawStars(w, h)

  if (state.phase === 'idle') {
    drawIdleScreen(w, h)
    return
  }

  if (state.phase === 'ended') {
    return  // result screen handled by ResultScreen.ts overlay
  }

  // Playing
  if (state.sticker?.visible) {
    drawSticker(state.sticker.x, state.sticker.y, state.sticker.emoji, state.sticker.radius)
  }

  // Hit animation — brief flash ring
  if (state.sticker !== null && state.sticker.hitAt !== null) {
    const elapsed = performance.now() - state.sticker.hitAt
    if (elapsed < 200) {
      drawHitRing(state.sticker.x, state.sticker.y, state.sticker.radius, elapsed / 200)
    }
  }
}

// ── Sub-renders ──────────────────────────────────────────────────────────────

const STARS: Array<[number, number, number]> = Array.from({ length: 60 }, () => [
  Math.random(), Math.random(), 0.5 + Math.random() * 1.5,
])

function drawStars(w: number, h: number): void {
  if (!_ctx) return
  _ctx.save()
  for (const [nx, ny, r] of STARS) {
    _ctx.beginPath()
    _ctx.arc(nx * w, ny * h, r, 0, Math.PI * 2)
    _ctx.fillStyle = 'rgba(255,255,255,0.6)'
    _ctx.fill()
  }
  _ctx.restore()
}

function drawIdleScreen(w: number, h: number): void {
  if (!_ctx) return
  _ctx.save()
  _ctx.fillStyle = 'rgba(241,245,249,0.9)'
  _ctx.font = `bold ${Math.min(w * 0.08, 32)}px -apple-system, sans-serif`
  _ctx.textAlign = 'center'
  _ctx.textBaseline = 'middle'
  _ctx.fillText('Tap the sticker!', w / 2, h / 2 - 24)
  _ctx.font = `${Math.min(w * 0.055, 22)}px -apple-system, sans-serif`
  _ctx.fillStyle = 'rgba(148,163,184,0.8)'
  _ctx.fillText('Press START to begin', w / 2, h / 2 + 18)
  _ctx.restore()
}

function drawSticker(x: number, y: number, emoji: string, radius: number): void {
  if (!_ctx) return
  const size = radius * 1.4
  _ctx.save()

  // Glow
  _ctx.shadowBlur  = 24
  _ctx.shadowColor = '#a855f7'

  // Background circle
  _ctx.beginPath()
  _ctx.arc(x, y, radius, 0, Math.PI * 2)
  _ctx.fillStyle = 'rgba(124,58,237,0.25)'
  _ctx.fill()
  _ctx.strokeStyle = '#7c3aed'
  _ctx.lineWidth = 2
  _ctx.stroke()

  // Emoji
  _ctx.shadowBlur = 0
  _ctx.font = `${size}px serif`
  _ctx.textAlign = 'center'
  _ctx.textBaseline = 'middle'
  _ctx.fillText(emoji, x, y)
  _ctx.restore()
}

function drawHitRing(x: number, y: number, radius: number, progress: number): void {
  if (!_ctx) return
  const r = radius + progress * 40
  _ctx.save()
  _ctx.beginPath()
  _ctx.arc(x, y, r, 0, Math.PI * 2)
  _ctx.strokeStyle = `rgba(168, 85, 247, ${1 - progress})`
  _ctx.lineWidth = 3
  _ctx.stroke()
  _ctx.restore()
}
