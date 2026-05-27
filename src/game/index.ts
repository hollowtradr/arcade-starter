/**
 * src/game/index.ts — Swamp Runner game controller
 *
 * Public API:
 *   startGame(onEnd)   — begins a play session
 *   stopGame()         — cancels the loop (e.g., session killed)
 *   getGameState()     — returns current state (for HUD polling)
 */

import { initCanvas, renderFrame, renderScoreHUD, updatePlayerAnimation, getCanvasSize } from './render.js'
import { createInitialState, type GameState, GAME_OVER_QUOTES } from './state.js'
import { updatePhysics, startJump, releaseJump } from './physics.js'
import { loadAllSprites, type Sprites } from './assets.js'
import { tgHaptic } from '../tg.js'

type GameEndCallback = (score: number, outcome: 'win' | 'loss') => void

// ── Module state ──────────────────────────────────────────────────────────────

let _state: GameState | null = null
let _sprites: Sprites | null = null
let _rafId = 0
let _lastTs = 0
let _onEnd: GameEndCallback | null = null
let _canvas: HTMLCanvasElement | null = null
let _pointerDownHandler: ((e: PointerEvent) => void) | null = null
let _pointerUpHandler: ((e: PointerEvent) => void) | null = null

// ── Public API ────────────────────────────────────────────────────────────────

export async function startGame(onEnd: GameEndCallback): Promise<void> {
  _onEnd = onEnd

  // Load sprites (may already be cached)
  _sprites = await loadAllSprites()

  const { canvas } = initCanvas()
  _canvas = canvas
  const { w, h } = getCanvasSize()

  _state = createInitialState(w, h)
  _state.phase = 'playing'

  // Input: tap to jump, hold to charge
  _pointerDownHandler = (e: PointerEvent) => {
    e.preventDefault()
    if (!_state) return
    startJump(_state)
    tgHaptic('impact_light')
  }
  _pointerUpHandler = (e: PointerEvent) => {
    e.preventDefault()
    if (!_state) return
    releaseJump(_state)
  }

  _canvas.addEventListener('pointerdown', _pointerDownHandler, { passive: false })
  _canvas.addEventListener('pointerup',   _pointerUpHandler,   { passive: false })
  // Also handle pointer leave (finger left screen)
  _canvas.addEventListener('pointerleave', _pointerUpHandler,  { passive: false })

  _lastTs = performance.now()
  _rafId = requestAnimationFrame(loop)
}

export function stopGame(): void {
  cancelAnimationFrame(_rafId)
  _rafId = 0
  cleanupInput()
}

export function getGameState(): GameState | null {
  return _state
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function loop(ts: number): void {
  const dt = Math.min((ts - _lastTs) / 1000, 0.05)  // cap at 50ms to prevent spiral
  _lastTs = ts

  if (!_state || !_sprites) return

  const { w, h } = getCanvasSize()

  // Sync groundY to canvas size (handles orientation change)
  const targetGroundY = Math.round(h * 0.74)
  if (Math.abs(_state.groundY - targetGroundY) > 10) {
    _state.groundY = targetGroundY
    // Reposition player if on ground
    if (_state.player.grounded && _state.player.onPlatformId === null) {
      _state.player.screenY = targetGroundY - _state.player.height
    }
  }

  // Physics
  updatePhysics(_state, dt, w, h)
  updatePlayerAnimation(dt, _state.player.anim === 'running')

  // Render
  renderFrame(_state, _sprites, dt)
  renderScoreHUD(_state, w)

  // Check end condition
  if (_state.phase === 'ended') {
    handleGameEnd()
    return
  }

  _rafId = requestAnimationFrame(loop)
}

// ── End ───────────────────────────────────────────────────────────────────────

function handleGameEnd(): void {
  cleanupInput()
  if (!_state) return

  const state = _state
  tgHaptic('error')

  // Short delay so player sees the death frame before result screen
  setTimeout(() => {
    const finalScore = state.score
    // Any score > 0 is a 'win' — the game doesn't have a lose-state score, just death
    const outcome: 'win' | 'loss' = finalScore > 0 ? 'win' : 'loss'
    _onEnd?.(finalScore, outcome)
  }, 800)
}

function cleanupInput(): void {
  if (_canvas && _pointerDownHandler) {
    _canvas.removeEventListener('pointerdown', _pointerDownHandler)
  }
  if (_canvas && _pointerUpHandler) {
    _canvas.removeEventListener('pointerup',   _pointerUpHandler)
    _canvas.removeEventListener('pointerleave', _pointerUpHandler)
  }
  _pointerDownHandler = null
  _pointerUpHandler   = null
}

// ── Export game-over quote helper ─────────────────────────────────────────────

export function getGameOverQuote(): string {
  return GAME_OVER_QUOTES[Math.floor(Math.random() * GAME_OVER_QUOTES.length)]
}
