# Swamp Runner 🌿

**A Sticker Galaxy Arcade first-party endless runner**

> *"Hop across the Dagobah swamp. Gather Force essence. Dodge mynocks. Train under Master Yoda's watch."*

---

## Lore Frame

The Dagobah trials have begun. Baby Yoda, freshly arrived on the swamp planet, must prove their Force sensitivity by navigating the treacherous wetlands. Floating logs shift and sink. Mynocks circle overhead. Force essence — the shimmering residue left by Jedi who trained here — drifts through the misty air.

Run far enough and Master Yoda himself will acknowledge your progress.

---

## How to Play

| Input | Action |
|-------|--------|
| **Tap** | Jump |
| **Hold tap** | Higher jump (release to launch) |

**Obstacles to avoid:**
- 🟢 **Slime puddles** — on the ground, jump over them
- 🦇 **Mynocks** — swooping creatures at mid-height
- 🌿 **Falling vines** — telegraphed by a ground shadow 1s before drop
- 🪵 **Sinking logs** — stable platforms that sink after 1.5s of standing

**Pickups to collect:**
- ✨ **Force essence** — small glowing motes, +1 Force-pace each
- 🔷 **Holocrons** — rare blue cubes, +10 + 2s speed boost + screen flash
- 🐟 **Bibo cameo** — baby mythosaur, grants 3s shield to absorb one collision

**Milestones — Yoda speaks:**
- 100 Force-paces: *"Strong with the Force, you are."*
- 500 Force-paces: *"Hmm. Surprised, I am."*
- 1000 Force-paces: *"A Jedi craves not these things, but impressive this is."*

---

## Scoring

Score is measured in **Force-paces** — the distance traveled across Dagobah, plus pickup bonuses. The further you run and the more you collect, the higher your rank on the monthly leaderboard.

---

## Built with the Sticker Galaxy Arcade SDK

Swamp Runner dogfoods the [Sticker Galaxy Arcade SDK v0](https://docs.stickergalaxy.io) and is the reference implementation for first-party games.

It is forked from the [arcade-starter template](https://github.com/hollowtradr/arcade-starter) and demonstrates:

- SDK auth handshake (`GET /arcade/v0/session`)
- Free-to-play entry (`POST /arcade/v0/entry` with `entry_fee_midi: 0`)
- Result submission (`POST /arcade/v0/result` with score + metadata)
- Leaderboard display (`GET /arcade/v0/leaderboard`)
- Trophy eligibility (`studio_trophies` in manifest)
- Telegram WebApp integration (`tg.ready()`, `tg.expand()`, `tg.BackButton`, `tg.HapticFeedback`)

---

## Development

```bash
npm install
npm run dev
# → http://localhost:5173
```

For SDK calls to work, you need a session token from the host:

```
http://localhost:5173/?session_token=<token>&user_id=<uid>&game_id=swamp_runner
```

Without a token, the game runs in **demo mode** — full gameplay, but no real midi rewards.

### Environment variables (`.env.local`)

```
VITE_ARCADE_API_URL=https://babyyoda-bot.vercel.app
VITE_ARCADE_SESSION_TOKEN=dev   # for local testing (bypasses ?session_token= URL param)
VITE_ARCADE_GAME_ID=swamp_runner
```

---

## Build & Deploy

```bash
npm run build   # TypeScript compile + Vite bundle → dist/
npm run preview # Preview the production build locally
```

Deploy to Vercel:

```bash
npx vercel deploy --prod --yes
```

Update `manifest.json` with the deployed URL, then submit to the Galactic Council.

---

## Stack

| Layer | Choice |
|-------|--------|
| Bundler | Vite 5 |
| Language | TypeScript |
| Renderer | Canvas 2D (no game framework) |
| Fonts | Cinzel Decorative · Fraunces · IM Fell English (Google Fonts) |
| Sprites | Egor's Baby Yoda art pack (CC0 for Sticker Galaxy) |
| SDK | Sticker Galaxy Arcade SDK v0 (bundled in `src/sdk.ts`) |

---

## Registering in the Arcade DB

See `scripts/register_in_arcade.py`. **Do not run this script** until the game URL is deployed and `manifest.json` is finalized. Hollow will run it when wiring staging.

---

## Trophies

| Trophy | Condition |
|--------|-----------|
| 🌿 **Rookie Swampling** | Completed first run |
| ⚡ **Force Acolyte** | Scored 1000+ Force-paces |
| 🎓 **Padawan Initiate** | Played 50 runs |

---

*Part of the Sticker Galaxy Arcade — sector: yodalon-prime-swamp*
