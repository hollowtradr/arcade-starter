/**
 * src/ui/ResultScreen.ts — post-game results UI
 *
 * Shown after the game ends. Calls postResult, displays midi awarded,
 * triggers trophy modal if one was earned.
 */

import * as sdk from '../sdk.js'
import { type ResultData } from '../sdk.js'
import { tgHaptic, tgMainButton } from '../tg.js'

let _el: HTMLElement | null = null
let _entryId = ''
let _startTime = 0  // ms (performance.now())

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

  _el.innerHTML = `
    <div class="result-title">${outcome === 'win' ? '🎉 Win!' : '💀 Game Over'}</div>
    <div class="result-score">Score: <span>${score}</span></div>
    <div class="result-midi" id="result-midi-box">
      <div class="result-midi-label">Midi Earned</div>
      <div class="result-midi-value" id="result-midi-value">…</div>
    </div>
    <div class="result-trophy hidden" id="result-trophy"></div>
    <div class="result-rank" id="result-rank"></div>
    <button class="btn btn-primary" id="result-play-again">Play Again</button>
    <button class="btn btn-ghost" id="result-leaderboard">🏆 Leaderboard</button>
  `

  document.getElementById('result-play-again')?.addEventListener('click', () => {
    hideResultScreen()
    onPlayAgain()
  })

  document.getElementById('result-leaderboard')?.addEventListener('click', () => {
    // Leaderboard.ts exports showLeaderboard() — imported lazily to avoid circular deps
    import('./Leaderboard.js').then(({ showLeaderboard }) => showLeaderboard())
  })

  tgMainButton('Play Again', () => {
    hideResultScreen()
    onPlayAgain()
  })

  // Post result in the background
  postGameResult(score, outcome).catch(console.error)
}

export function hideResultScreen(): void {
  _el?.classList.add('hidden')
}

// ── Internal ─────────────────────────────────────────────────────────────────

async function postGameResult(
  score: number,
  outcome: 'win' | 'loss' | 'draw',
): Promise<void> {
  const durationSecs = Math.round((performance.now() - _startTime) / 1000)

  const result = await sdk.postResult(_entryId, {
    score,
    outcome,
    play_duration_seconds: Math.max(1, durationSecs),
    metadata: {
      game: 'tap_the_sticker',
      placeholder: true,
    },
  })

  renderResultData(result)
}

function renderResultData(result: sdk.SDKResponse<ResultData>): void {
  const midiEl  = document.getElementById('result-midi-value')
  const rankEl  = document.getElementById('result-rank')
  const trophyEl = document.getElementById('result-trophy')

  if (!result.success) {
    if (midiEl) {
      midiEl.textContent = '—'
      midiEl.title = result.error
    }
    if (rankEl) {
      rankEl.textContent = result.error.includes('session_token')
        ? 'Connect via @stickergalaxybot for real midi rewards'
        : `Result: ${result.error}`
    }
    return
  }

  const data = result.data

  // Midi pop animation
  if (midiEl) {
    midiEl.textContent = `+${data.midi_awarded}`
    midiEl.classList.add('animating')
    setTimeout(() => midiEl.classList.remove('animating'), 500)
  }

  tgHaptic(data.midi_awarded > 0 ? 'success' : 'warning')

  if (rankEl && data.leaderboard_rank) {
    rankEl.textContent = `Leaderboard rank: #${data.leaderboard_rank}`
  }

  if (trophyEl && data.trophy_awarded) {
    trophyEl.textContent = `🏆 Trophy earned: ${data.trophy_awarded.name}`
    trophyEl.classList.remove('hidden')
    trophyEl.classList.add('visible')
    tgHaptic('success')
  }
}
