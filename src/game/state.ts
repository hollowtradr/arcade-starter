/**
 * src/game/state.ts — game state for "Tap-the-Sticker"
 *
 * Module-level state — no framework needed.
 * Studios: delete this file and replace with your own state module.
 */

export const GAME_DURATION_SECONDS = 10

export interface Sticker {
  x: number       // centre-x in canvas pixels
  y: number       // centre-y in canvas pixels
  radius: number  // hit radius
  emoji: string
  visible: boolean
  hitAt: number | null   // performance.now() when tapped, null if not yet tapped
}

export interface GameState {
  phase: 'idle' | 'playing' | 'ended'
  score: number
  timeRemaining: number  // seconds, counts down
  sticker: Sticker | null
  startTime: number      // performance.now() when game started
  endTime: number        // performance.now() when game ended (or 0)
  tapCount: number       // total successful taps
  misses: number
}

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    timeRemaining: GAME_DURATION_SECONDS,
    sticker: null,
    startTime: 0,
    endTime: 0,
    tapCount: 0,
    misses: 0,
  }
}

export const STICKER_EMOJIS = ['⭐', '🌟', '✨', '💫', '🎯', '🎮', '👾', '🚀']

export function randomSticker(canvasW: number, canvasH: number): Sticker {
  const margin = 60
  const emoji = STICKER_EMOJIS[Math.floor(Math.random() * STICKER_EMOJIS.length)]
  return {
    x: margin + Math.random() * (canvasW - margin * 2),
    y: margin + Math.random() * (canvasH - margin * 2),
    radius: 42,
    emoji,
    visible: true,
    hitAt: null,
  }
}
