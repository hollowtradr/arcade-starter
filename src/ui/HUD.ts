/**
 * src/ui/HUD.ts — Swamp Runner HUD overlay
 *
 * Minimal DOM HUD (the canvas renders the parchment score box inline).
 * This overlay handles the midi balance badge only — score is drawn on canvas.
 */

import { type GameState } from '../game/state.js'

let _el: HTMLElement | null = null
let _midiEl: HTMLElement | null = null

// Game's declared max_score in our backend manifest (used to project midi this run).
// Backend mints midi via: round(score / max_score * 1000), capped at 1000/play.
const MAX_SCORE = 99_999
const MIDI_CAP_PER_PLAY = 1_000

export function initHUD(): void {
  _el = document.getElementById('hud')!
  _el.innerHTML = `
    <div class="hud-midi-badge" id="hud-midi-badge">
      <span class="hud-midi-icon">✨</span>
      <span class="hud-midi-val" id="hud-midi">+0</span>
      <span class="hud-midi-label">this run</span>
    </div>
  `
  _midiEl = document.getElementById('hud-midi')
}

export function showHUD(): void {
  _el?.classList.remove('hidden')
}

export function hideHUD(): void {
  _el?.classList.add('hidden')
}

export function updateHUD(state: GameState | null, _midiBalance: number | null): void {
  if (!_midiEl) return
  if (!state) {
    _midiEl.textContent = '+0'
    return
  }
  // Projected midi for current score (matches backend mint formula).
  // Capped at MIDI_CAP_PER_PLAY (1000) per spec §5.
  const projected = Math.min(
    Math.floor((state.score / MAX_SCORE) * MIDI_CAP_PER_PLAY),
    MIDI_CAP_PER_PLAY,
  )
  _midiEl.textContent = `+${projected}`
}
