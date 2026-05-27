/**
 * src/ui/HUD.ts — Score + timer + midi balance overlay
 *
 * Renders into #hud. Shown during gameplay, hidden otherwise.
 */

import { type GameState, GAME_DURATION_SECONDS } from '../game/state.js'

let _el: HTMLElement | null = null
let _scoreEl: HTMLElement | null = null
let _timerEl: HTMLElement | null = null
let _midiEl: HTMLElement | null = null

export function initHUD(): void {
  _el = document.getElementById('hud')!
  _el.innerHTML = `
    <div class="hud-stat">
      <span class="hud-label">Score</span>
      <span class="hud-value" id="hud-score">0</span>
    </div>
    <div class="hud-stat">
      <span class="hud-label">Time</span>
      <span class="hud-value timer" id="hud-timer">${GAME_DURATION_SECONDS}</span>
    </div>
    <div class="hud-stat">
      <span class="hud-label">Midi</span>
      <span class="hud-value midi" id="hud-midi">—</span>
    </div>
  `
  _scoreEl = document.getElementById('hud-score')
  _timerEl = document.getElementById('hud-timer')
  _midiEl  = document.getElementById('hud-midi')
}

export function showHUD(): void {
  _el?.classList.remove('hidden')
}

export function hideHUD(): void {
  _el?.classList.add('hidden')
}

export function updateHUD(state: GameState, midiBalance: number | null): void {
  if (!_scoreEl || !_timerEl || !_midiEl) return

  _scoreEl.textContent = String(state.score)

  const secs = Math.ceil(state.timeRemaining)
  _timerEl.textContent = String(secs)
  if (secs <= 3) {
    _timerEl.classList.add('warning')
  } else {
    _timerEl.classList.remove('warning')
  }

  _midiEl.textContent = midiBalance !== null ? String(midiBalance) : '—'
}
