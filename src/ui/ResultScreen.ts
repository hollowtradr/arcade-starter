/**
 * src/ui/ResultScreen.ts — Swamp Runner result screen
 *
 * Shows final score, midi awarded, trophy, rank, and action buttons.
 * Follows the SDK spec: POST /arcade/v0/result with entry_id + proof_of_play_token.
 */

import * as sdk from '../sdk.js'
import { type ResultData } from '../sdk.js'
import { tgHaptic, tgMainButton } from '../tg.js'
import { getGameOverQuote } from '../game/index.js'
import { getSprites } from '../game/assets.js'

let _el: HTMLElement | null = null
let _entryId = ''
let _startTime = 0

export function initResultScreen(): void {
  _el = document.getElementById('result-screen')!
}

export function setEntryContext(entryId: string, startTimeMs: number): void {
  _entryId = entryId
  _startTime = startTimeMs
}

export function showResultScreen(
  score: number,
  outcome: 'win' | 'loss' | 'draw',
  onPlayAgain: () => void,
): void {
  if (!_el) return
  _el.classList.remove('hidden')

  const quote = getGameOverQuote()
  const sprites = getSprites()
  const isWin = outcome === 'win'

  // Choose result sprite
  const spriteEl = sprites.yodaVictory && isWin
    ? `<img src="${sprites.yodaVictory.src}" class="result-sprite" alt="Victory!" />`
    : sprites.yodaDefeat
      ? `<img src="${sprites.yodaDefeat.src}" class="result-sprite" alt="Defeat" />`
      : `<div style="font-size:80px">${isWin ? '🏆' : '💀'}</div>`

  _el.innerHTML = `
    <div class="result-scroll">
      <div class="result-scroll-inner">
        ${spriteEl}

        <div class="result-parchment">
          <div class="result-title-text">${isWin ? 'Run Complete' : 'The Force Fades'}</div>

          <div class="result-quote">"${quote}"</div>

          <div class="result-score-block">
            <div class="result-score-label">Force-paces traveled</div>
            <div class="result-score-value" id="result-score-val">${score.toLocaleString()}</div>
          </div>

          <div class="result-midi-block">
            <div class="result-midi-label">Midi Earned</div>
            <div class="result-midi-value" id="result-midi-val">
              <span class="midi-spinner">…</span>
            </div>
          </div>

          <div class="result-trophy hidden" id="result-trophy"></div>
          <div class="result-rank" id="result-rank"></div>
        </div>

        <div class="result-actions">
          <button class="btn btn-primary swamp-btn" id="result-play-again">
            🌿 Run Again
          </button>
          <button class="btn btn-ghost swamp-btn-ghost" id="result-back">
            ← Back to Arcade
          </button>
          <button class="btn btn-ghost swamp-btn-ghost" id="result-lb" style="margin-top:4px;">
            🏆 Leaderboard
          </button>
        </div>
      </div>
    </div>
  `

  // Bind buttons
  document.getElementById('result-play-again')?.addEventListener('click', () => {
    hideResultScreen()
    onPlayAgain()
  })

  document.getElementById('result-back')?.addEventListener('click', () => {
    // Signal host and close
    sdk.postMessageBridge('GAME_COMPLETE', { entry_id: _entryId })
    window.Telegram?.WebApp?.close?.()
  })

  document.getElementById('result-lb')?.addEventListener('click', () => {
    import('./Leaderboard.js').then(({ showLeaderboard }) => showLeaderboard())
  })

  tgMainButton('Run Again', () => {
    hideResultScreen()
    onPlayAgain()
  })

  // Post result asynchronously
  postGameResult(score, outcome).catch(console.error)
}

export function hideResultScreen(): void {
  _el?.classList.add('hidden')
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function postGameResult(
  score: number,
  outcome: 'win' | 'loss' | 'draw',
): Promise<void> {
  const durationSecs = Math.round((performance.now() - _startTime) / 1000)

  /**
   * REAL SDK CALL — shape:
   * {
   *   entry_id: string,
   *   user_id: string,
   *   score: number,
   *   outcome: 'win' | 'loss' | 'draw',
   *   proof_of_play_token: string,
   *   play_duration_seconds: number,
   *   metadata: { pickups_collected, max_speed_reached, longest_combo }
   * }
   *
   * When no real session token exists (local dev), the API returns an error;
   * we fall through to mock data so the UI is still testable.
   */
  const result = await sdk.postResult(_entryId, {
    score,
    outcome,
    play_duration_seconds: Math.max(1, durationSecs),
    metadata: {
      game: 'swamp_runner',
      pickups_collected: 0,   // TODO: thread from state — phase 2
      max_speed_reached: 0,
      longest_combo: 0,
    },
  })

  renderResultData(result)
}

function renderResultData(result: sdk.SDKResponse<ResultData>): void {
  const midiEl   = document.getElementById('result-midi-val')
  const rankEl   = document.getElementById('result-rank')
  const trophyEl = document.getElementById('result-trophy')

  if (!result.success) {
    if (midiEl) {
      // Mock response for local dev / no session token
      midiEl.innerHTML = `
        <span class="midi-mock">+?? midi</span>
        <div class="midi-note">
          Connect via @stickergalaxybot for real rewards
        </div>
      `
    }
    return
  }

  const data = result.data

  if (midiEl) {
    midiEl.innerHTML = `<span class="midi-earned">+${data.midi_awarded}</span>`
    midiEl.classList.add('animating')
    setTimeout(() => midiEl.classList.remove('animating'), 600)
  }

  tgHaptic(data.midi_awarded > 0 ? 'success' : 'warning')

  if (rankEl && data.leaderboard_rank) {
    rankEl.textContent = `Rank: #${data.leaderboard_rank} this month`
  }

  if (trophyEl && data.trophy_awarded) {
    trophyEl.innerHTML = `🏆 <strong>${data.trophy_awarded.name}</strong><br><small>${data.trophy_awarded.description ?? ''}</small>`
    trophyEl.classList.remove('hidden')
    trophyEl.classList.add('visible')
    tgHaptic('success')
  }
}
