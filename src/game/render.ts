/**
 * src/game/render.ts — Canvas2D renderer for Swamp Runner
 *
 * Draws everything: parallax background, ground, platforms, obstacles,
 * pickups, player, HUD banner. The #game-canvas element is 100% of viewport.
 */

import { type GameState, type Platform, type Obstacle, type Pickup, PLAYER_WIDTH, PLAYER_HEIGHT } from './state.js'
import { type Sprites } from './assets.js'

// ── Canvas setup ──────────────────────────────────────────────────────────────

let _canvas: HTMLCanvasElement | null = null
let _ctx: CanvasRenderingContext2D | null = null
let _dpr = 1

export function initCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  _canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  _ctx = _canvas.getContext('2d')!
  _dpr = window.devicePixelRatio || 1
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  return { canvas: _canvas, ctx: _ctx }
}

function resizeCanvas(): void {
  if (!_canvas || !_ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  _canvas.width  = Math.round(w * _dpr)
  _canvas.height = Math.round(h * _dpr)
  _canvas.style.width  = `${w}px`
  _canvas.style.height = `${h}px`
  _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0)
}

export function getCanvasSize(): { w: number; h: number } {
  if (!_canvas) return { w: 390, h: 844 }
  return { w: _canvas.width / _dpr, h: _canvas.height / _dpr }
}

// ── Parallax layers ───────────────────────────────────────────────────────────

// Pre-generated tree shapes (procedural but deterministic per index)
interface TreeShape { nx: number; nh: number; nw: number }
const BG_TREES: TreeShape[] = Array.from({ length: 12 }, (_, i) => ({
  nx: (i / 12 + 0.04),
  nh: 0.25 + (i * 0.137 % 0.15),
  nw: 0.04 + (i * 0.079 % 0.03),
}))
const FG_TREES: TreeShape[] = Array.from({ length: 8 }, (_, i) => ({
  nx: (i / 8 + 0.02),
  nh: 0.12 + (i * 0.113 % 0.08),
  nw: 0.055 + (i * 0.067 % 0.025),
}))

// ── Main render ───────────────────────────────────────────────────────────────

export function renderFrame(state: GameState, sprites: Sprites, dt: number): void {
  if (!_ctx) return
  const { w, h } = getCanvasSize()
  _ctx.clearRect(0, 0, w, h)

  // Screen flash (Holocron)
  const flashAlpha = Math.max(0, state.screenFlashTimer / 0.4)

  // --- Background ---
  drawBackground(w, h, state.groundY, state.worldOffset)

  // --- Ground ---
  drawGround(w, h, state.groundY, state.worldOffset)

  // --- Platforms ---
  for (const pl of state.platforms) {
    drawPlatform(_ctx, pl)
  }

  // --- Pickups ---
  for (const pk of state.pickups) {
    if (!pk.collected) drawPickup(_ctx, pk, state.gameTime)
  }

  // --- Obstacles ---
  for (const ob of state.obstacles) {
    drawObstacle(_ctx, ob, state.gameTime)
  }

  // --- Player ---
  drawPlayer(_ctx, state, sprites, dt)

  // --- Screen flash overlay ---
  if (flashAlpha > 0) {
    _ctx.save()
    _ctx.fillStyle = `rgba(100, 180, 255, ${flashAlpha * 0.35})`
    _ctx.fillRect(0, 0, w, h)
    _ctx.restore()
  }

  // --- Banner ---
  if (state.banner && state.banner.timer > 0) {
    drawBanner(_ctx, state.banner, w, h)
  }

  // --- Speed boost indicator ---
  if (state.speedBoostActive) {
    drawSpeedBoost(_ctx, state.speedBoostTimer, w)
  }
}

// ── Background ────────────────────────────────────────────────────────────────

function drawBackground(w: number, h: number, groundY: number, worldOffset: number): void {
  if (!_ctx) return

  // Sky gradient — warm daylight Dagobah (Egor whimsy, not noir)
  const sky = _ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, '#c8d898')   // warm hazy dawn sky
  sky.addColorStop(0.4, '#7aaa58') // sunlit canopy
  sky.addColorStop(0.8, '#3a6a2a') // deep forest floor
  sky.addColorStop(1, '#2a5a22')   // ground-level shadow
  _ctx.fillStyle = sky
  _ctx.fillRect(0, 0, w, groundY)

  // Mist layers (semi-transparent horizontal bands)
  for (let i = 0; i < 3; i++) {
    const mistY = groundY * (0.55 + i * 0.12)
    const mistAlpha = 0.04 + i * 0.025
    const mist = _ctx.createLinearGradient(0, mistY - 30, 0, mistY + 30)
    mist.addColorStop(0, `rgba(180, 220, 180, 0)`)
    mist.addColorStop(0.5, `rgba(180, 220, 180, ${mistAlpha})`)
    mist.addColorStop(1, `rgba(180, 220, 180, 0)`)
    _ctx.fillStyle = mist
    _ctx.fillRect(0, mistY - 30, w, 60)
  }

  // Background trees (slow parallax: 20% of scroll)
  const bgOffset = (worldOffset * 0.20) % w
  drawTreeLayer(_ctx, BG_TREES, w, h, groundY, bgOffset, '#2a5a28', 0.38, 0.15)
  drawTreeLayer(_ctx, BG_TREES, w, h, groundY, bgOffset - w, '#2a5a28', 0.38, 0.15)

  // Foreground trees (faster parallax: 55% of scroll)
  const fgOffset = (worldOffset * 0.55) % w
  drawTreeLayer(_ctx, FG_TREES, w, h, groundY, fgOffset, '#1a4a1a', 0.15, 0.12)
  drawTreeLayer(_ctx, FG_TREES, w, h, groundY, fgOffset - w, '#1a4a1a', 0.15, 0.12)

  // Firefly particles (deterministic from worldOffset)
  drawFireflies(_ctx, w, groundY, worldOffset)
}

function drawTreeLayer(
  ctx: CanvasRenderingContext2D,
  trees: TreeShape[],
  w: number,
  _h: number,
  groundY: number,
  offset: number,
  color: string,
  topFrac: number,
  widthFrac: number,
): void {
  ctx.save()
  ctx.fillStyle = color
  for (const t of trees) {
    const tx = t.nx * w - offset
    const tw = t.nw * w * (widthFrac / 0.04)
    const th = t.nh * groundY * (topFrac / 0.38)

    // Simple pine/cypress silhouette: tapered triangle
    ctx.beginPath()
    ctx.moveTo(tx, groundY)
    ctx.lineTo(tx - tw / 2, groundY - th * 0.4)
    ctx.lineTo(tx - tw * 0.3, groundY - th * 0.4)
    ctx.lineTo(tx - tw * 0.5, groundY - th * 0.7)
    ctx.lineTo(tx - tw * 0.2, groundY - th * 0.7)
    ctx.lineTo(tx, groundY - th)
    ctx.lineTo(tx + tw * 0.2, groundY - th * 0.7)
    ctx.lineTo(tx + tw * 0.5, groundY - th * 0.7)
    ctx.lineTo(tx + tw * 0.3, groundY - th * 0.4)
    ctx.lineTo(tx + tw / 2, groundY - th * 0.4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawFireflies(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  worldOffset: number,
): void {
  ctx.save()
  const count = 8
  for (let i = 0; i < count; i++) {
    const phase = worldOffset * 0.005 + i * 1.37
    const x = ((i / count * w * 1.3 + worldOffset * (0.1 + i * 0.03)) % (w + 40)) - 20
    const y = groundY * (0.3 + 0.5 * Math.abs(Math.sin(i * 0.7))) 
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(phase))
    ctx.beginPath()
    ctx.arc(x, y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(180, 255, 120, ${pulse * 0.7})`
    ctx.shadowBlur = 8
    ctx.shadowColor = 'rgba(180, 255, 120, 0.8)'
    ctx.fill()
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

// ── Ground ────────────────────────────────────────────────────────────────────

function drawGround(w: number, h: number, groundY: number, worldOffset: number): void {
  if (!_ctx) return

  // Water / swamp beneath ground
  const water = _ctx.createLinearGradient(0, groundY, 0, h)
  water.addColorStop(0, '#3a7a48')
  water.addColorStop(0.3, '#2a6a38')
  water.addColorStop(1, '#1a4a28')
  _ctx.fillStyle = water
  _ctx.fillRect(0, groundY, w, h - groundY)

  // Water ripple lines
  _ctx.save()
  _ctx.strokeStyle = 'rgba(60, 160, 100, 0.15)'
  _ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const wy = groundY + 10 + i * 14
    const waveOffset = (worldOffset * 0.3 + i * 40) % (w + 60)
    _ctx.beginPath()
    _ctx.moveTo(-waveOffset % w, wy)
    for (let x = 0; x < w + 60; x += 20) {
      _ctx.lineTo(x - (waveOffset % 60), wy + Math.sin(x * 0.05 + i) * 2)
    }
    _ctx.stroke()
  }
  _ctx.restore()

  // Ground strip (mud/moss)
  const groundGrad = _ctx.createLinearGradient(0, groundY - 8, 0, groundY + 16)
  groundGrad.addColorStop(0, '#5a8a38')
  groundGrad.addColorStop(0.4, '#4a7a2a')
  groundGrad.addColorStop(1, '#3a6a28')
  _ctx.fillStyle = groundGrad
  _ctx.fillRect(0, groundY - 8, w, 24)

  // Scrolling grass tufts
  const tufts = 10
  const spacing = w / tufts
  const tuffOffset = (worldOffset * 1.0) % spacing
  _ctx.save()
  _ctx.fillStyle = '#4a7a28'
  for (let i = 0; i < tufts + 2; i++) {
    const tx = i * spacing - tuffOffset
    // Small tuft of grass
    for (let g = -2; g <= 2; g++) {
      _ctx.beginPath()
      _ctx.moveTo(tx + g * 3, groundY - 8)
      _ctx.lineTo(tx + g * 3 - 2, groundY - 18 - Math.abs(g) * 2)
      _ctx.lineTo(tx + g * 3 + 2, groundY - 18 - Math.abs(g) * 2)
      _ctx.closePath()
      _ctx.fill()
    }
  }
  _ctx.restore()
}

// ── Platform ──────────────────────────────────────────────────────────────────

function drawPlatform(ctx: CanvasRenderingContext2D, pl: Platform): void {
  const x = pl.x
  const y = pl.y + pl.sinkOffset
  const w = pl.width
  const h = pl.height

  ctx.save()

  // Log color (brown/bark)
  const logColor = pl.sinking ? '#5a3010' : '#7a4820'
  const barkColor = pl.sinking ? '#4a2808' : '#5c3510'

  ctx.beginPath()
  ctx.roundRect(x, y, w, h, [4, 4, 8, 8])
  ctx.fillStyle = logColor
  ctx.fill()

  // Bark lines
  ctx.strokeStyle = barkColor
  ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const lx = x + (i + 1) * (w / 5)
    ctx.beginPath()
    ctx.moveTo(lx, y + 2)
    ctx.lineTo(lx, y + h - 2)
    ctx.stroke()
  }

  // End rings (circles on log ends)
  ctx.beginPath()
  ctx.ellipse(x + 6, y + h / 2, 4, h / 2 - 2, 0, 0, Math.PI * 2)
  ctx.fillStyle = barkColor
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + w - 6, y + h / 2, 4, h / 2 - 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Sinking log: warning color
  if (pl.sinking) {
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
  }

  ctx.restore()
}

// ── Obstacles ─────────────────────────────────────────────────────────────────

function drawObstacle(ctx: CanvasRenderingContext2D, ob: Obstacle, gameTime: number): void {
  ctx.save()

  if (ob.type === 'slime') {
    drawSlime(ctx, ob.x, ob.y, ob.width, ob.height, gameTime)
  } else if (ob.type === 'mynock') {
    drawMynock(ctx, ob.x, ob.y, ob.width, ob.height, gameTime)
  } else if (ob.type === 'vine') {
    if (ob.dropped || ob.y > -ob.height) {
      drawVine(ctx, ob.x, ob.y, ob.width, ob.height)
    }
  } else if (ob.type === 'vine_shadow') {
    drawVineShadow(ctx, ob.x, ob.y, ob.width, ob.dropCountdown)
  }

  ctx.restore()
}

function drawSlime(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  gameTime: number,
): void {
  const pulse = 1 + 0.08 * Math.sin(gameTime * 4)
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(pulse, pulse)

  // Outer glow
  ctx.shadowBlur = 12
  ctx.shadowColor = 'rgba(80, 200, 50, 0.6)'

  // Slime blob
  ctx.beginPath()
  ctx.ellipse(0, 0, w / 2, h / 2 + 4, 0, 0, Math.PI * 2)
  const grad = ctx.createRadialGradient(0, -2, 0, 0, 0, w / 2)
  grad.addColorStop(0, '#9fea3a')
  grad.addColorStop(0.5, '#5fbb1a')
  grad.addColorStop(1, '#3a7a0a')
  ctx.fillStyle = grad
  ctx.fill()

  // Highlight
  ctx.beginPath()
  ctx.ellipse(-w * 0.15, -h * 0.25, w * 0.15, h * 0.2, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(200, 255, 150, 0.4)'
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.restore()
}

function drawMynock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  gameTime: number,
): void {
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)

  const wingFlap = Math.sin(gameTime * 8 + x * 0.01) * 0.3

  // Body
  ctx.beginPath()
  ctx.ellipse(0, 0, w * 0.25, h * 0.35, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#2a1a3a'
  ctx.fill()

  // Left wing
  ctx.save()
  ctx.rotate(-wingFlap)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-w * 0.5, -h * 0.4 - h * 0.2 * wingFlap)
  ctx.lineTo(-w * 0.35, h * 0.1)
  ctx.closePath()
  ctx.fillStyle = '#3a1a2a'
  ctx.fill()
  ctx.restore()

  // Right wing
  ctx.save()
  ctx.rotate(wingFlap)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(w * 0.5, -h * 0.4 - h * 0.2 * wingFlap)
  ctx.lineTo(w * 0.35, h * 0.1)
  ctx.closePath()
  ctx.fillStyle = '#3a1a2a'
  ctx.fill()
  ctx.restore()

  // Red eyes
  ctx.beginPath()
  ctx.arc(-4, -2, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#ff3030'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(4, -2, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawVine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  ctx.save()
  const grad = ctx.createLinearGradient(x, y, x, y + h)
  grad.addColorStop(0, '#1a3d10')
  grad.addColorStop(1, '#2d5a1a')
  ctx.fillStyle = grad
  ctx.strokeStyle = '#0d2008'
  ctx.lineWidth = 2

  // Main vine body
  ctx.beginPath()
  ctx.roundRect(x + w * 0.3, y, w * 0.4, h, [0, 0, 4, 4])
  ctx.fill()
  ctx.stroke()

  // Leafy bumps along the vine
  for (let i = 0; i < 4; i++) {
    const ly = y + (i + 1) * (h / 5)
    const side = i % 2 === 0 ? -1 : 1
    ctx.beginPath()
    ctx.ellipse(x + w / 2 + side * 8, ly, 7, 4, side * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#4a8a1a'
    ctx.fill()
  }

  ctx.restore()
}

function drawVineShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  countdown: number,
): void {
  // Pulsing shadow warning
  const pulse = countdown <= 0 ? 0 : Math.min(1, countdown)
  const alpha = 0.3 + 0.4 * Math.abs(Math.sin(Date.now() * 0.008))
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + 4, w * 0.8 * pulse, 5 * pulse, 0, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * pulse})`
  ctx.fill()
  ctx.restore()
}

// ── Pickups ───────────────────────────────────────────────────────────────────

function drawPickup(ctx: CanvasRenderingContext2D, pk: Pickup, _gameTime: number): void {
  ctx.save()

  if (pk.type === 'essence') {
    drawEssence(ctx, pk.x, pk.y, pk.glowPhase)
  } else if (pk.type === 'holocron') {
    drawHolocron(ctx, pk.x, pk.y, pk.glowPhase)
  } else if (pk.type === 'bibo') {
    drawBibo(ctx, pk.x, pk.y, pk.glowPhase)
  }

  ctx.restore()
}

function drawEssence(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, phase: number,
): void {
  const glow = 0.6 + 0.4 * Math.sin(phase)
  const r = 7 + 2 * Math.sin(phase * 1.3)

  ctx.shadowBlur = 14
  ctx.shadowColor = `rgba(120, 255, 180, ${glow})`
  ctx.beginPath()
  ctx.arc(x + 7, y + 7, r, 0, Math.PI * 2)
  const g = ctx.createRadialGradient(x + 5, y + 5, 0, x + 7, y + 7, r)
  g.addColorStop(0, 'rgba(200, 255, 220, 0.95)')
  g.addColorStop(0.5, `rgba(120, 220, 160, ${glow})`)
  g.addColorStop(1, `rgba(60, 160, 100, ${glow * 0.5})`)
  ctx.fillStyle = g
  ctx.fill()
  ctx.shadowBlur = 0

  // Sparkle cross
  ctx.strokeStyle = `rgba(220, 255, 230, ${glow * 0.6})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x + 7, y + 2); ctx.lineTo(x + 7, y + 12)
  ctx.moveTo(x + 2, y + 7); ctx.lineTo(x + 12, y + 7)
  ctx.stroke()
}

function drawHolocron(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, phase: number,
): void {
  ctx.save()
  ctx.translate(x + 11, y + 11)
  ctx.rotate(phase * 0.5)

  ctx.shadowBlur = 18
  ctx.shadowColor = 'rgba(80, 160, 255, 0.9)'

  // Cube face (tilted square)
  ctx.beginPath()
  ctx.rect(-9, -9, 18, 18)
  const g = ctx.createLinearGradient(-9, -9, 9, 9)
  g.addColorStop(0, 'rgba(140, 200, 255, 0.95)')
  g.addColorStop(0.5, 'rgba(60, 120, 220, 0.9)')
  g.addColorStop(1, 'rgba(20, 60, 160, 0.8)')
  ctx.fillStyle = g
  ctx.fill()

  // Glow edges
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.9)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Inner glow dot
  ctx.beginPath()
  ctx.arc(0, 0, 4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(220, 240, 255, 0.8)'
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.restore()
}

function drawBibo(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, phase: number,
): void {
  // Tiny mythosaur baby swimming near water level
  ctx.save()
  ctx.translate(x + 20, y + 15)
  const bob = Math.sin(phase * 1.5) * 3

  // Body
  ctx.beginPath()
  ctx.ellipse(0, bob, 18, 10, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#4a6a8a'
  ctx.fill()

  // Head
  ctx.beginPath()
  ctx.ellipse(14, bob - 4, 8, 7, 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#5a7a9a'
  ctx.fill()

  // Eye
  ctx.beginPath()
  ctx.arc(17, bob - 5, 2, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(17, bob - 5, 1, 0, Math.PI * 2)
  ctx.fillStyle = '#222'
  ctx.fill()

  // Fins
  ctx.beginPath()
  ctx.moveTo(-5, bob); ctx.lineTo(-14, bob + 8); ctx.lineTo(-2, bob + 6)
  ctx.fillStyle = '#3a5a7a'
  ctx.fill()

  // Shield glow aura
  ctx.shadowBlur = 16
  ctx.shadowColor = 'rgba(120, 200, 255, 0.8)'
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(5, bob, 26, 18, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.restore()
}

// ── Player ────────────────────────────────────────────────────────────────────

let _runFrame = 0
let _runTimer = 0

export function updatePlayerAnimation(dt: number, running: boolean): void {
  if (running) {
    _runTimer += dt
    if (_runTimer > 0.18) {
      _runFrame = (_runFrame + 1) % 2
      _runTimer = 0
    }
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sprites: Sprites,
  _dt: number,
): void {
  const p = state.player
  const px = p.x - PLAYER_WIDTH / 2
  const py = p.screenY

  ctx.save()

  // Shield bubble
  if (p.shieldActive) {
    const shieldPulse = 0.6 + 0.4 * Math.sin(state.gameTime * 5)
    ctx.shadowBlur = 20
    ctx.shadowColor = `rgba(120, 200, 255, ${shieldPulse})`
    ctx.strokeStyle = `rgba(120, 200, 255, ${shieldPulse * 0.8})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(
      p.x, p.screenY + PLAYER_HEIGHT / 2,
      PLAYER_WIDTH * 0.85, PLAYER_HEIGHT * 0.65,
      0, 0, Math.PI * 2,
    )
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Hit flash: alpha flicker
  if (p.hitFlashTimer > 0) {
    const flashPulse = Math.sin(p.hitFlashTimer * 25)
    ctx.globalAlpha = flashPulse > 0 ? 1 : 0.3
  }

  // Choose sprite based on anim state
  let sprite: HTMLImageElement | null = null
  if (p.anim === 'jumping') sprite = sprites.yodaJump
  else if (p.anim === 'hit')  sprite = sprites.yodaHit
  else if (p.anim === 'dead') sprite = sprites.yodaDefeat
  else sprite = sprites.yodaIdle

  if (sprite) {
    // Running bounce
    let bounceY = 0
    if (p.anim === 'running' && p.grounded) {
      bounceY = Math.abs(Math.sin(_runTimer * 10 * Math.PI)) * -3
    }

    ctx.drawImage(sprite, px, py + bounceY, PLAYER_WIDTH, PLAYER_HEIGHT)
  } else {
    // Fallback: drawn character
    drawFallbackPlayer(ctx, p.x, py, p.anim, state.gameTime)
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

function drawFallbackPlayer(
  ctx: CanvasRenderingContext2D,
  cx: number, y: number,
  anim: string,
  gameTime: number,
): void {
  ctx.save()
  // Simple round body
  const bodyY = y + PLAYER_HEIGHT * 0.35
  const bounce = anim === 'running' ? Math.abs(Math.sin(gameTime * 8)) * 3 : 0

  ctx.fillStyle = anim === 'dead' ? '#888' : anim === 'hit' ? '#ff6666' : '#7ec850'
  ctx.beginPath()
  ctx.ellipse(cx, bodyY - bounce, 18, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  // Head
  ctx.fillStyle = '#c8f080'
  ctx.beginPath()
  ctx.arc(cx, y + 10, 14, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.arc(cx - 5, y + 8, 3, 0, Math.PI * 2)
  ctx.arc(cx + 5, y + 8, 3, 0, Math.PI * 2)
  ctx.fill()

  // Ears (Yoda)
  ctx.fillStyle = '#c8f080'
  ctx.beginPath()
  ctx.moveTo(cx - 14, y + 10)
  ctx.lineTo(cx - 22, y - 5)
  ctx.lineTo(cx - 10, y + 4)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 14, y + 10)
  ctx.lineTo(cx + 22, y - 5)
  ctx.lineTo(cx + 10, y + 4)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// ── Banner ────────────────────────────────────────────────────────────────────

function drawBanner(
  ctx: CanvasRenderingContext2D,
  banner: { text: string; timer: number; maxTime: number },
  w: number,
  _h: number,
): void {
  ctx.save()

  const progress = banner.timer / banner.maxTime
  // Slide in from top, slide out to top
  let slideY: number
  if (progress > 0.85) {
    slideY = (1 - (progress - 0.85) / 0.15) * 80  // slide in
  } else if (progress < 0.2) {
    slideY = (progress / 0.2) * 80  // slide out (banner goes back up)
  } else {
    slideY = 80
  }

  const bannerW = Math.min(w - 40, 360)
  const bannerH = 52
  const bx = (w - bannerW) / 2
  const by = slideY - bannerH - 10

  // Parchment background
  const parchment = ctx.createLinearGradient(bx, by, bx, by + bannerH)
  parchment.addColorStop(0, 'rgba(240, 220, 160, 0.96)')
  parchment.addColorStop(1, 'rgba(210, 185, 120, 0.96)')

  ctx.shadowBlur = 16
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.roundRect(bx, by, bannerW, bannerH, 8)
  ctx.fillStyle = parchment
  ctx.fill()
  ctx.shadowBlur = 0

  // Decorative border
  ctx.strokeStyle = 'rgba(160, 120, 60, 0.8)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Inner line
  ctx.strokeStyle = 'rgba(160, 120, 60, 0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(bx + 4, by + 4, bannerW - 8, bannerH - 8, 4)
  ctx.stroke()

  // Text
  ctx.fillStyle = '#5a3a0a'
  ctx.font = `italic 14px 'IM Fell English', 'Georgia', serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(banner.text, w / 2, by + bannerH / 2)

  ctx.restore()
}

// ── Speed boost indicator ─────────────────────────────────────────────────────

function drawSpeedBoost(
  ctx: CanvasRenderingContext2D,
  timer: number,
  w: number,
): void {
  ctx.save()
  const barW = 100
  const barH = 6
  const bx = (w - barW) / 2
  const by = 56

  // Track
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.roundRect(bx, by, barW, barH, 3)
  ctx.fill()

  // Fill
  const fill = Math.min(1, timer / 2.0)
  const grad = ctx.createLinearGradient(bx, by, bx + barW, by)
  grad.addColorStop(0, '#60b0ff')
  grad.addColorStop(1, '#a060ff')
  ctx.fillStyle = grad
  ctx.shadowBlur = 8
  ctx.shadowColor = 'rgba(100, 160, 255, 0.8)'
  ctx.beginPath()
  ctx.roundRect(bx, by, barW * fill, barH, 3)
  ctx.fill()
  ctx.shadowBlur = 0

  // Label
  ctx.fillStyle = 'rgba(200, 230, 255, 0.9)'
  ctx.font = `bold 9px 'Cinzel Decorative', 'Georgia', serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('FORCE SPEED', w / 2, by + barH + 2)

  ctx.restore()
}

// ── Score HUD on canvas ────────────────────────────────────────────────────────

export function renderScoreHUD(
  state: GameState,
  w: number,
): void {
  if (!_ctx) return
  _ctx.save()

  // Parchment score box (top-left)
  const boxW = 140
  const boxH = 44
  const bx = 12
  const by = 10

  const pg = _ctx.createLinearGradient(bx, by, bx, by + boxH)
  pg.addColorStop(0, 'rgba(240, 220, 160, 0.88)')
  pg.addColorStop(1, 'rgba(210, 185, 120, 0.88)')
  _ctx.fillStyle = pg
  _ctx.beginPath()
  _ctx.roundRect(bx, by, boxW, boxH, 6)
  _ctx.fill()
  _ctx.strokeStyle = 'rgba(160, 120, 60, 0.6)'
  _ctx.lineWidth = 1.5
  _ctx.stroke()

  // Label
  _ctx.fillStyle = 'rgba(90, 58, 10, 0.7)'
  _ctx.font = `9px 'Cinzel Decorative', 'Georgia', serif`
  _ctx.textAlign = 'left'
  _ctx.textBaseline = 'top'
  _ctx.fillText('FORCE-PACES', bx + 8, by + 7)

  // Score number (big, slot-reel style)
  _ctx.fillStyle = '#5a3a0a'
  _ctx.font = `bold 22px 'Cinzel Decorative', 'Georgia', serif`
  _ctx.textBaseline = 'alphabetic'
  _ctx.fillText(state.score.toString(), bx + 8, by + boxH - 8)

  // Time display (top-right)
  const mins = Math.floor(state.gameTime / 60)
  const secs = Math.floor(state.gameTime % 60).toString().padStart(2, '0')
  const timeStr = `${mins}:${secs}`

  _ctx.fillStyle = 'rgba(200, 220, 200, 0.75)'
  _ctx.font = `11px 'Fraunces', 'Georgia', serif`
  _ctx.textAlign = 'right'
  _ctx.textBaseline = 'top'
  _ctx.fillText(timeStr, w - 14, 16)

  _ctx.restore()
}
