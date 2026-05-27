/**
 * src/game/assets.ts — Sprite loader
 *
 * Loads all sprites asynchronously. Game renders drawn shapes as fallback
 * when sprites aren't available (e.g., Vercel preview before sprites deploy).
 */

export interface Sprites {
  yodaIdle: HTMLImageElement | null
  yodaJump: HTMLImageElement | null
  yodaHit: HTMLImageElement | null
  yodaVictory: HTMLImageElement | null
  yodaDefeat: HTMLImageElement | null
  babyYodaTitle: HTMLImageElement | null
}

const _sprites: Sprites = {
  yodaIdle: null,
  yodaJump: null,
  yodaHit: null,
  yodaVictory: null,
  yodaDefeat: null,
  babyYodaTitle: null,
}

let _loaded = false

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function loadAllSprites(): Promise<Sprites> {
  if (_loaded) return _sprites

  const [idle, jump, hit, victory, defeat, title] = await Promise.all([
    loadImage('/sprites/yoda_idle.png'),
    loadImage('/sprites/yoda_jump.png'),
    loadImage('/sprites/yoda_hit.png'),
    loadImage('/sprites/yoda_victory.png'),
    loadImage('/sprites/yoda_defeat.png'),
    loadImage('/sprites/baby_yoda_title.png'),
  ])

  _sprites.yodaIdle     = idle
  _sprites.yodaJump     = jump
  _sprites.yodaHit      = hit
  _sprites.yodaVictory  = victory
  _sprites.yodaDefeat   = defeat
  _sprites.babyYodaTitle = title
  _loaded = true

  return _sprites
}

export function getSprites(): Sprites {
  return _sprites
}
