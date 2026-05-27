# ⭐ Sticker Galaxy Arcade — Studio Starter Template

**Build a Sticker Galaxy minigame in 60 minutes.**

This is the official scaffold for third-party studios building minigames on the [Sticker Galaxy](https://docs-site-taupe-pi.vercel.app) platform. Clone it, replace the placeholder game, and you have a fully SDK-integrated minigame running inside Telegram.

> **Docs:** [docs-site-taupe-pi.vercel.app](https://docs-site-taupe-pi.vercel.app)  
> **SDK reference:** [/sdk/](https://docs-site-taupe-pi.vercel.app/sdk/)  
> **AI context file:** [llms.txt](https://docs-site-taupe-pi.vercel.app/llms.txt)

---

## Quick Start

```bash
# 1. Clone the template
gh repo clone hollowtradr/arcade-starter my-game && cd my-game

# 2. Install dependencies
npm install

# 3. Set up local dev environment
cp .env.example .env
# Open .env and fill in VITE_ARCADE_SESSION_TOKEN
# (See below for how to get a dev token from Hollow)

# 4. Run the dev server
npm run dev
# → http://localhost:5173
# Resize your browser to 390×844 to simulate the Telegram Mini App viewport.
# The placeholder game ("Tap-the-Sticker") runs immediately in demo mode.

# 5. Replace the game
# Delete src/game/ and write your real game logic.
# Contract: when your game ends, call the onEnd(score, outcome) callback
# that main.ts passes to startGame(). Keep sdk.ts and tg.ts unchanged.

# 6. Update manifest.json
# Fill in name, studio, sector, max_score, play_duration_range_seconds.
# See manifest.json for field-by-field guidance.

# 7. Deploy
# Vercel: `npx vercel --prod`
# Netlify: `netlify deploy --prod --dir=dist`
# Any static host works. Needs HTTPS.

# 8. Submit for review
# Post your manifest.json to the Galactic Council Telegram group:
#   /council propose_minigame { ...your manifest... }
```

---

## Getting a Dev Session Token

Without a session token the game runs in **demo mode** — you see the full UI but SDK calls return gracefully without real midi rewards. That's fine for building.

When you're ready to test the real API round-trip, DM **@hollowtradr** on Telegram. He'll run:

```bash
cd babyyoda-bot
uv run python -c "
from app.api.arcade import issue_session_token
print(issue_session_token(<your_telegram_user_id>, 'starter_dev'))
"
```

Paste the output into `.env` as `VITE_ARCADE_SESSION_TOKEN`. Tokens expire after **60 minutes**.

---

## File Map

| File | What it does |
|------|-------------|
| `src/main.ts` | Entry point. Boots the SDK, runs session auth, starts the game loop, wires up UI. |
| `src/sdk.ts` | **The SDK wrapper.** Every Arcade API call lives here. Do not modify — your game calls it, doesn't own it. |
| `src/tg.ts` | Telegram WebApp helpers (ready/expand, haptics, CloudStorage, MainButton, BackButton). No-ops outside Telegram. |
| `src/game/index.ts` | **Placeholder game: "Tap-the-Sticker".** Delete this entire folder and replace with your game. |
| `src/game/render.ts` | Canvas rendering for the placeholder. Replace with your renderer. |
| `src/game/state.ts` | Game state for the placeholder. Replace with your state model. |
| `src/ui/HUD.ts` | Score + timer + midi balance overlay during gameplay. |
| `src/ui/ResultScreen.ts` | Post-game screen. Calls `sdk.postResult()`, shows midi earned, triggers trophy modal. |
| `src/ui/Leaderboard.ts` | Leaderboard overlay. Calls `sdk.getLeaderboard()`. Toggleable mid-game or from result screen. |
| `src/style.css` | Base styles. Designed for Telegram Mini App viewports (mobile-first, dark theme). |
| `manifest.json` | Your game's manifest. Fill in before review submission. See field comments. |
| `.env.example` | Copy to `.env`. Holds your dev session token and API URL. |
| `index.html` | Minimal HTML shell. Loads the Telegram WebApp SDK script. |
| `vite.config.ts` | Vite config. Targets ES2020, serves on 0.0.0.0 for mobile preview. |

---

## SDK API Quick Reference

```typescript
import * as sdk from './sdk.js'

// Bootstrap — call once before anything else
sdk.initSDK()

// Validate session, get player context
const session = await sdk.initSession()
// session.data: { user_id, display_name, midi_balance, daily_plays_remaining, proof_of_play_token, ... }

// Register a play (entry_fee_midi = 0 for free-to-play)
const entry = await sdk.postEntry(0, 'My game entry')
// entry.data: { entry_id, new_midi_balance }

// Submit result when game ends
const result = await sdk.postResult(entryId, {
  score: 850,
  outcome: 'win',            // 'win' | 'loss' | 'draw'
  play_duration_seconds: 42,
  metadata: { level: 3 },
})
// result.data: { midi_awarded, trophy_awarded, leaderboard_rank }

// Sell a cosmetic (routes through host payment UI)
const purchase = await sdk.purchase('cosmetic_skin', 'my_skin', 0.5, 'TON', 'Cool skin')

// Leaderboard + trophies
const lb       = await sdk.getLeaderboard(20, 0)
const trophies = await sdk.getTrophies()

// postMessage bridge
sdk.postMessageBridge('GAME_COMPLETE', { entry_id: entryId })
sdk.onHostMessage('PURCHASE_CONFIRMED', (data) => { /* unlock item */ })
```

All methods return `{ success: true, data }` or `{ success: false, error }`. They never throw.

---

## Telegram Helpers

```typescript
import { tgReady, tgHaptic, tgCloudGet, tgCloudSet, tgMainButton, tgBackButton } from './tg.js'

tgReady()                            // call once on load; signals Telegram + expands viewport
tgHaptic('impact_medium')            // haptic: impact_light/medium/heavy, success, error, warning, selection
await tgCloudGet('tutorial_seen')    // read from CloudStorage (falls back to localStorage in dev)
await tgCloudSet('tutorial_seen', '1')
tgMainButton('Play Again', () => {}) // native bottom button
tgBackButton(() => saveAndExit())    // handle back navigation
```

All helpers are no-ops when running outside Telegram. Safe for local dev.

---

## What You Can / Cannot Do

| ✅ You own | ❌ You cannot touch |
|-----------|---------------------|
| Game logic, UI, visual design | A player's midi balance directly |
| In-game cosmetics (skins, icons) | Combat stats, equipment, Padawan levels |
| Your own server / storage | The host's DOM (no `window.parent` access) |
| Posting results via `sdk.postResult()` | Real-money payments (use `sdk.purchase()`) |
| Reading player context from `sdk.initSession()` | localStorage/cookies from the host shell |
| Declaring trophies in your manifest | Awarding trophies directly |
| Prompting cosmetic or extra-play purchases | Selling stat boosts or P2W items |

See [SDK §10](https://docs-site-taupe-pi.vercel.app/sdk/#sandbox-runtime-rules) for the full sandbox rules.

---

## Using AI to Build Your Game

Drop this URL into **Cursor**, **Claude**, or any AI assistant:

```
https://docs-site-taupe-pi.vercel.app/llms.txt
```

It's the full SDK contract in one file. Then tell your AI:

> "Replace `src/game/` with [your game idea]. Keep `src/sdk.ts` and `src/tg.ts` unchanged. Use the SDK exactly as documented. When the game ends, call `onEnd(score, outcome)`. Score is an integer, outcome is 'win', 'loss', or 'draw'."

The placeholder game already exercises the full SDK round-trip, so you can see the pattern before erasing it.

---

## Deployment

The build output is a static bundle — deploy anywhere:

```bash
npm run build    # outputs to dist/

# Vercel (recommended — zero config)
npx vercel --prod

# Netlify
netlify deploy --prod --dir=dist

# Any CDN / static host — just point at dist/
```

After deploying, update `manifest.json` with your production `url` and share it with Hollow for sandbox review.

---

## Review Checklist

Before submitting `/council propose_minigame`:

- [ ] `name`, `studio`, `studio_ton_wallet`, `genre`, `sector`, `url` filled in
- [ ] `max_score` is honest — it's the max a real human can score, not `999999`
- [ ] `play_duration_range_seconds` matches actual gameplay
- [ ] No separate login / auth prompt
- [ ] No purchases of type `combat_stat_boost` or `equipment`
- [ ] Game works at 390px width on mobile
- [ ] `tgReady()` called on load
- [ ] `postMessage GAME_COMPLETE` sent when player exits

---

## Contact

- **Platform owner:** @hollowtradr on Telegram
- **Galactic Council group:** submit your manifest with `/council propose_minigame`
- **Docs:** [docs-site-taupe-pi.vercel.app](https://docs-site-taupe-pi.vercel.app)
- **SDK reference:** [/sdk/](https://docs-site-taupe-pi.vercel.app/sdk/)
