/**
 * src/tg.ts — Telegram WebApp helpers
 *
 * Thin, idiomatic wrappers around window.Telegram?.WebApp.
 * Every helper no-ops safely when running outside Telegram (local dev, browser).
 *
 * Docs: https://core.telegram.org/bots/webapps
 */

// ── Type augmentation ────────────────────────────────────────────────────────
// Telegram WebApp is injected at runtime via <script> in index.html.
// We declare a minimal subset here; don't invent fields that aren't in the spec.

interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (err: Error | null, success: boolean) => void): void
  getItem(key: string, callback: (err: Error | null, value: string) => void): void
}

interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

interface TelegramMainButton {
  text: string
  isVisible: boolean
  isActive: boolean
  setText(text: string): TelegramMainButton
  show(): TelegramMainButton
  hide(): TelegramMainButton
  enable(): TelegramMainButton
  disable(): TelegramMainButton
  onClick(fn: () => void): TelegramMainButton
  offClick(fn: () => void): TelegramMainButton
}

interface TelegramBackButton {
  isVisible: boolean
  show(): TelegramBackButton
  hide(): TelegramBackButton
  onClick(fn: () => void): TelegramBackButton
  offClick(fn: () => void): TelegramBackButton
}

interface TelegramWebApp {
  ready(): void
  expand(): void
  close(): void
  HapticFeedback: TelegramHapticFeedback
  CloudStorage: TelegramCloudStorage
  MainButton: TelegramMainButton
  BackButton: TelegramBackButton
  initDataUnsafe?: {
    user?: {
      id: number
      first_name: string
      username?: string
    }
  }
  colorScheme?: 'light' | 'dark'
  themeParams?: Record<string, string>
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

// ── Internal accessor ────────────────────────────────────────────────────────

function tg(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Call once on game load.
 * Tells Telegram the iframe is ready and requests full viewport height.
 */
export function tgReady(): void {
  const app = tg()
  if (!app) return
  try {
    app.ready()
    app.expand()
  } catch {
    // Silently ignore if called in a context where expand() is unavailable
  }
}

// ── Haptic ───────────────────────────────────────────────────────────────────

type HapticKind =
  | 'impact_light'
  | 'impact_medium'
  | 'impact_heavy'
  | 'success'
  | 'error'
  | 'warning'
  | 'selection'

/**
 * Fire haptic feedback. No-ops outside Telegram.
 * Use on taps, score events, wins, errors.
 */
export function tgHaptic(kind: HapticKind): void {
  const app = tg()
  if (!app?.HapticFeedback) return
  try {
    switch (kind) {
      case 'impact_light':   app.HapticFeedback.impactOccurred('light');  break
      case 'impact_medium':  app.HapticFeedback.impactOccurred('medium'); break
      case 'impact_heavy':   app.HapticFeedback.impactOccurred('heavy');  break
      case 'success':        app.HapticFeedback.notificationOccurred('success'); break
      case 'error':          app.HapticFeedback.notificationOccurred('error');   break
      case 'warning':        app.HapticFeedback.notificationOccurred('warning'); break
      case 'selection':      app.HapticFeedback.selectionChanged(); break
    }
  } catch { /* ignore */ }
}

// ── CloudStorage ─────────────────────────────────────────────────────────────

/**
 * Read a value from Telegram CloudStorage.
 * Falls back to localStorage for local dev.
 * Returns null if key not found.
 */
export function tgCloudGet(key: string): Promise<string | null> {
  const app = tg()
  if (app?.CloudStorage) {
    return new Promise((resolve) => {
      app.CloudStorage.getItem(key, (err, value) => {
        resolve(err ? null : (value ?? null))
      })
    })
  }
  // Local dev fallback
  return Promise.resolve(localStorage.getItem(key))
}

/**
 * Write a value to Telegram CloudStorage.
 * Falls back to localStorage for local dev.
 */
export function tgCloudSet(key: string, value: string): Promise<boolean> {
  const app = tg()
  if (app?.CloudStorage) {
    return new Promise((resolve) => {
      app.CloudStorage.setItem(key, value, (err, ok) => {
        resolve(!err && ok)
      })
    })
  }
  // Local dev fallback
  try {
    localStorage.setItem(key, value)
    return Promise.resolve(true)
  } catch {
    return Promise.resolve(false)
  }
}

// ── Main Button ───────────────────────────────────────────────────────────────

let _mainButtonHandler: (() => void) | null = null

/**
 * Show Telegram's native bottom button with a label and click handler.
 * Replaces any previous handler.
 * No-ops outside Telegram.
 */
export function tgMainButton(text: string, onClick: () => void): void {
  const app = tg()
  if (!app?.MainButton) {
    // Local dev fallback — do nothing (game uses in-canvas UI or result screen button)
    return
  }
  try {
    if (_mainButtonHandler) {
      app.MainButton.offClick(_mainButtonHandler)
    }
    _mainButtonHandler = onClick
    app.MainButton.setText(text).onClick(onClick).show().enable()
  } catch { /* ignore */ }
}

/** Hide the main button. No-ops outside Telegram. */
export function tgMainButtonHide(): void {
  const app = tg()
  if (!app?.MainButton) return
  try {
    app.MainButton.hide()
  } catch { /* ignore */ }
}

// ── Back Button ───────────────────────────────────────────────────────────────

let _backButtonHandler: (() => void) | null = null

/**
 * Set up the Telegram back button.
 * Call with null to hide it.
 * No-ops outside Telegram.
 */
export function tgBackButton(onClick: (() => void) | null): void {
  const app = tg()
  if (!app?.BackButton) return
  try {
    if (_backButtonHandler) {
      app.BackButton.offClick(_backButtonHandler)
    }
    if (onClick === null) {
      app.BackButton.hide()
      _backButtonHandler = null
    } else {
      _backButtonHandler = onClick
      app.BackButton.onClick(onClick).show()
    }
  } catch { /* ignore */ }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/** Returns 'dark' or 'light'. Defaults to 'dark' outside Telegram. */
export function tgColorScheme(): 'dark' | 'light' {
  return tg()?.colorScheme ?? 'dark'
}
