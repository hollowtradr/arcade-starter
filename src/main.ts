/**
 * src/main.ts — entry point
 *
 * Order of operations:
 *   1. tgReady()          — signal Telegram we're loaded, expand to full screen
 *   2. initSDK()          — read session_token / game_id from URL params
 *   3. initSession()      — validate token with the host API
 *   4. postEntry(0)       — register a play session (0 midi = free-to-play)
 *   5. startGame()        — run the game loop
 *   6. endGame(score)     → postResult() via ResultScreen
 *
 * Replace src/game/ with your real game. Keep this file and sdk.ts/tg.ts.
 */

import './style.css'
import * as sdk from './sdk.js'
import { tgReady, tgBackButton } from './tg.js'
import { startGame, stopGame } from './game/index.js'
import { initHUD, showHUD, hideHUD, updateHUD } from './ui/HUD.js'
import {
  initResultScreen,
  setEntryContext,
  showResultScreen,
  hideResultScreen,
} from './ui/ResultScreen.js'
import { onHostMessage, postMessageBridge } from './sdk.js'
import { type GameState } from './game/state.js'
import { getGameState } from './game/index.js'

// ── Init ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Tell Telegram we're alive and want full-screen
  tgReady()

  // 2. Bootstrap SDK (reads URL params / .env)
  sdk.initSDK()

  // 3. Set up UI singletons
  initHUD()
  initResultScreen()

  // 4. Handle host→game messages
  onHostMessage('SESSION_EXPIRING', () => {
    // Save important state here before the session dies
    console.warn('[arcade] Session expiring in 5 min — save state!')
  })
  onHostMessage('SESSION_KILLED', () => {
    stopGame()
  })
  onHostMessage('PURCHASE_CONFIRMED', (data) => {
    console.log('[arcade] Purchase confirmed:', data)
  })

  // 5. Back button — save state and signal host
  tgBackButton(() => {
    stopGame()
    postMessageBridge('GAME_COMPLETE', { entry_id: '' })
  })

  // 6. Signal host that we're ready
  postMessageBridge('GAME_READY')

  // 7. Validate session
  setLoadingMessage('Connecting to Sticker Galaxy…')
  const sessionResult = await sdk.initSession()

  if (!sessionResult.success) {
    setLoadingMessage(
      sdk.hasToken()
        ? `Connection error: ${sessionResult.error}`
        : 'Connect to Sticker Galaxy via @stickergalaxybot to play for real.\n\nFor local dev: add ?session_token=... to the URL.',
      true,
    )
    // Still show the game in "demo mode" — let them see the UI
    setTimeout(() => showStartScreen(null), 1500)
    return
  }

  const session = sessionResult.data
  hideLoading()
  showStartScreen(session)
}

// ── Start screen ──────────────────────────────────────────────────────────────

interface SessionData {
  display_name: string
  midi_balance: number
  daily_plays_remaining: number
}

function showStartScreen(session: SessionData | null): void {
  const app = document.getElementById('app')!
  // Inject a simple start screen into the canvas container
  const startEl = document.createElement('div')
  startEl.id = 'start-screen'
  startEl.style.cssText = `
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:16px;
    background:rgba(15,15,35,0.92);z-index:25;padding:24px;text-align:center;
  `

  const playsLeft = session?.daily_plays_remaining ?? '∞'
  const midiBalance = session?.midi_balance ?? '—'
  const displayName = session?.display_name ?? 'Guest'
  const isDemoMode = session === null

  startEl.innerHTML = `
    <div style="font-size:48px">⭐</div>
    <h1 style="font-size:26px;font-weight:800;color:#f1f5f9">Tap-the-Sticker</h1>
    <p style="font-size:14px;color:#94a3b8;max-width:260px;line-height:1.5">
      ${isDemoMode
        ? '⚠️ Demo mode — no real midi rewards.<br>Launch from @stickergalaxybot for the real thing.'
        : `Welcome, ${displayName}! Tap every sticker you see.<br>You have <strong>${playsLeft}</strong> play(s) left today.`
      }
    </p>
    ${!isDemoMode ? `
    <div style="background:#1a1a3e;border:1px solid #fbbf24;border-radius:12px;padding:12px 24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8">Midi Balance</div>
      <div style="font-size:28px;font-weight:700;color:#fbbf24">${midiBalance}</div>
    </div>` : ''}
    <button id="start-btn" class="btn btn-primary" style="margin-top:8px;font-size:18px;padding:16px 40px;">
      ▶ Start (10s)
    </button>
    <button id="lb-btn" class="btn btn-ghost" style="font-size:14px;">🏆 Leaderboard</button>
  `
  app.appendChild(startEl)

  document.getElementById('start-btn')?.addEventListener('click', () => {
    startEl.remove()
    beginGame(session)
  })
  document.getElementById('lb-btn')?.addEventListener('click', () => {
    import('./ui/Leaderboard.js').then(({ showLeaderboard }) => showLeaderboard())
  })
}

// ── Game flow ─────────────────────────────────────────────────────────────────

let _midiBalance: number | null = null

async function beginGame(session: SessionData | null): Promise<void> {
  _midiBalance = session?.midi_balance ?? null

  // Post entry (free-to-play = 0 midi)
  const entryResult = await sdk.postEntry(0, 'Tap-the-Sticker round')
  let entryId = ''

  if (entryResult.success) {
    entryId = entryResult.data.entry_id
    _midiBalance = entryResult.data.new_midi_balance
  } else {
    console.warn('[arcade] postEntry failed (demo mode):', entryResult.error)
  }

  const gameStartTime = performance.now()
  setEntryContext(entryId, gameStartTime)

  showHUD()
  startGame(onGameEnd)

  // HUD update loop
  const hudInterval = setInterval(() => {
    const state: GameState = getGameState()
    updateHUD(state, _midiBalance)
    if (state.phase === 'ended') clearInterval(hudInterval)
  }, 100)
}

function onGameEnd(score: number, outcome: 'win' | 'loss'): void {
  hideHUD()
  showResultScreen(score, outcome, () => {
    // Play again
    hideResultScreen()
    showStartScreen(
      _midiBalance !== null
        ? { display_name: '', midi_balance: _midiBalance, daily_plays_remaining: 0 }
        : null,
    )
  })
}

// ── Loading helpers ───────────────────────────────────────────────────────────

function setLoadingMessage(msg: string, isError = false): void {
  const el = document.getElementById('loading-message')
  if (!el) return
  el.innerHTML = msg.replace(/\n/g, '<br>')
  if (isError) {
    el.style.color = '#ef4444'
    const spinner = document.querySelector('.spinner') as HTMLElement | null
    if (spinner) spinner.style.display = 'none'
  }
}

function hideLoading(): void {
  const el = document.getElementById('loading-screen')
  el?.classList.add('hidden')
}

// ── Boot ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('[arcade] Fatal error:', err)
  setLoadingMessage(`Fatal error: ${(err as Error).message}`, true)
})
