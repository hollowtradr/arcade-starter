/**
 * ============================================================
 * src/game/index.ts — "Tap-the-Sticker" placeholder game
 * ============================================================
 * THIS IS A THROWAWAY PLACEHOLDER.
 * Replace this file (and the rest of src/game/) with your real
 * game logic. The only contract with main.ts is:
 *   - Call startGame(canvas, onEnd) to begin
 *   - When the game ends, call onEnd(score, outcome)
 *
 * Keep src/sdk.ts and src/tg.ts unchanged.
 * ============================================================
 *
 * Rules of "Tap-the-Sticker":
 *   - A sticker emoji appears at a random position on the canvas
 *   - Tapping/clicking it scores +100 and moves it to a new position
 *   - Missing (tapping empty space) scores nothing
 *   - Game ends after GAME_DURATION_SECONDS (10 seconds)
 */

import { initCanvas, renderFrame, getCanvasSize } from './render.js'
import {
  createInitialState,
  randomSticker,
  type GameState,
  GAME_DURATION_SECONDS,
} from './state.js'
import { tgHaptic } from '../tg.js'

type GameEndCallback = (score: number, outcome: 'win' | 'loss') => void

// ── Module state ─────────────────────────────────────────────────────────────

let _state: GameState = createInitialState()
let _rafId = 0
let _lastTs = 0
let _onEnd: GameEndCallback | null = null
let _canvas: HTMLCanvasElement | null = null
let _handlePointer: ((e: PointerEvent) => void) | null = null

// ── Public API ───────────────────────────────────────────────────────────────

/** Start the game. canvas is the <canvas> element; onEnd is called when the game finishes. */
export function startGame(onEnd: GameEndCallback): void {
  _onEnd = onEnd
  const { canvas } = initCanvas()
  _canvas = canvas

  _state = createInitialState()
  _state.phase = 'playing'
  _state.startTime = performance.now()
  _state.sticker = randomSticker(getCanvasSize().w, getCanvasSize().h)

  // Input
  _handlePointer = handlePointer
  _canvas.addEventListener('pointerdown', _handlePointer)

  // Kick off render loop
  _lastTs = performance.now()
  _rafId = requestAnimationFrame(loop)
}

export function stopGame(): void {
  cancelAnimationFrame(_rafId)
  if (_canvas && _handlePointer) {
    _canvas.removeEventListener('pointerdown', _handlePointer)
  }
}

export function getGameState(): GameState {
  return _state
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function loop(ts: number): void {
  const dt = (ts - _lastTs) / 1000
  _lastTs = ts

  if (_state.phase === 'playing') {
    _state.timeRemaining = Math.max(
      0,
      GAME_DURATION_SECONDS - (performance.now() - _state.startTime) / 1000,
    )

    if (_state.timeRemaining <= 0) {
      endGame()
      return
    }
  }

  renderFrame(_state, dt)
  _rafId = requestAnimationFrame(loop)
}

// ── Input ─────────────────────────────────────────────────────────────────────

function handlePointer(e: PointerEvent): void {
  if (_state.phase !== 'playing') return

  const rect = (_canvas as HTMLCanvasElement).getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  const sticker = _state.sticker
  if (!sticker || !sticker.visible) return

  const dx = px - sticker.x
  const dy = py - sticker.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist <= sticker.radius * 1.3) {
    // Hit!
    _state.score += 100
    _state.tapCount++
    sticker.hitAt = performance.now()
    tgHaptic('impact_medium')

    // Spawn a new sticker after a short flash delay
    setTimeout(() => {
      if (_state.phase === 'playing') {
        const { w, h } = getCanvasSize()
        _state.sticker = randomSticker(w, h)
      }
    }, 120)
  } else {
    _state.misses++
  }
}

// ── End ───────────────────────────────────────────────────────────────────────

function endGame(): void {
  cancelAnimationFrame(_rafId)
  _state.phase = 'ended'
  _state.endTime = performance.now()

  if (_canvas && _handlePointer) {
    _canvas.removeEventListener('pointerdown', _handlePointer)
  }

  tgHaptic(_state.score > 0 ? 'success' : 'warning')

  // Any score > 0 counts as a win for this placeholder game.
  // Studios: define their own outcome logic.
  const outcome: 'win' | 'loss' = _state.score > 0 ? 'win' : 'loss'
  _onEnd?.(  _state.score, outcome)
}
