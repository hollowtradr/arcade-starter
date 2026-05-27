/**
 * src/ui/HUD.ts — Swamp Runner HUD overlay
 *
 * Minimal DOM HUD (the canvas renders the parchment score box inline).
 * This overlay handles the midi balance badge only — score is drawn on canvas.
 */

import { type GameState } from '../game/state.js'

let _el: HTMLElement | null = null
let _midiEl: HTMLElement | null = null

export function initHUD(): void {
  _el = document.getElementById('hud')!
  _el.innerHTML = `
    <div class="hud-midi-badge" id="hud-midi-badge">
      <span class="hud-midi-icon">⚡</span>
      <span class="hud-midi-val" id="hud-midi">—</span>
      <span class="hud-midi-label">midi</span>
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

export function updateHUD(state: GameState | null, midiBalance: number | null): void {
  if (!_midiEl) return
  _midiEl.textContent = midiBalance !== null ? midiBalance.toLocaleString() : '—'
  void state  // state score is rendered on canvas
}
