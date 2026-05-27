#!/usr/bin/env python3
"""
register_in_arcade.py — One-shot Arcade DB registration for Swamp Runner

DO NOT RUN THIS in the current session.
Run it once the game is deployed to production and manifest.json has
been updated with real URLs. Hollow will run this when wiring staging.

Usage:
    DB_PATH=/path/to/babyyoda.db python3 scripts/register_in_arcade.py

Requires:
    - Python 3.8+
    - The babyyoda.db SQLite database path set via DB_PATH env var
    - manifest.json to have real 'url' and 'sandbox_url' values (not 'TBD-...')

This script inserts a row into the arcade_games table using the shape
established by PR #545. It reads manifest.json from the repo root and
validates required fields before writing.
"""

import json
import os
import sys
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

# ── Config ────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
MANIFEST_PATH = REPO_ROOT / "manifest.json"
DB_PATH = os.environ.get("DB_PATH", "")

GAME_ID = "swamp_runner"

# ── Validation ────────────────────────────────────────────────────────────────

def load_manifest() -> dict:
    with open(MANIFEST_PATH) as f:
        return json.load(f)

def validate_manifest(m: dict) -> None:
    required = ["name", "studio", "genre", "sector", "url", "sandbox_url",
                "max_score", "play_duration_range_seconds"]
    for field in required:
        if not m.get(field):
            raise ValueError(f"manifest.json missing required field: {field}")
    if m["url"].startswith("TBD"):
        raise ValueError("manifest.json url must be a real deployed URL, not TBD")
    if m["sandbox_url"].startswith("TBD"):
        raise ValueError("manifest.json sandbox_url must be a real deployed URL, not TBD")

# ── DB write ──────────────────────────────────────────────────────────────────

INSERT_SQL = """
INSERT INTO arcade_games (
    game_id,
    name,
    studio,
    studio_ton_wallet,
    genre,
    sector,
    description,
    url,
    sandbox_url,
    wager_enabled,
    trophy_enabled,
    max_score,
    perfect_score_achievable,
    play_duration_min_seconds,
    play_duration_max_seconds,
    manifest_json,
    registered_at,
    status
) VALUES (
    :game_id,
    :name,
    :studio,
    :studio_ton_wallet,
    :genre,
    :sector,
    :description,
    :url,
    :sandbox_url,
    :wager_enabled,
    :trophy_enabled,
    :max_score,
    :perfect_score_achievable,
    :play_duration_min_seconds,
    :play_duration_max_seconds,
    :manifest_json,
    :registered_at,
    :status
)
ON CONFLICT(game_id) DO UPDATE SET
    name = excluded.name,
    studio = excluded.studio,
    url = excluded.url,
    sandbox_url = excluded.sandbox_url,
    manifest_json = excluded.manifest_json,
    registered_at = excluded.registered_at,
    status = excluded.status;
"""

def register(m: dict) -> None:
    if not DB_PATH:
        raise RuntimeError("DB_PATH environment variable not set")
    
    conn = sqlite3.connect(DB_PATH)
    try:
        duration = m["play_duration_range_seconds"]
        row = {
            "game_id": GAME_ID,
            "name": m["name"],
            "studio": m["studio"],
            "studio_ton_wallet": m.get("studio_ton_wallet", ""),
            "genre": m["genre"],
            "sector": m["sector"],
            "description": m.get("description", ""),
            "url": m["url"],
            "sandbox_url": m["sandbox_url"],
            "wager_enabled": 1 if m.get("wager_enabled") else 0,
            "trophy_enabled": 1 if m.get("trophy_enabled") else 0,
            "max_score": m["max_score"],
            "perfect_score_achievable": 1 if m.get("perfect_score_achievable") else 0,
            "play_duration_min_seconds": duration[0],
            "play_duration_max_seconds": duration[1],
            "manifest_json": json.dumps(m, indent=2),
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending_review",  # Hollow moves to 'active' after review
        }

        with conn:
            conn.execute(INSERT_SQL, row)

        print(f"✅ Registered game_id='{GAME_ID}' in arcade_games (status=pending_review)")
        print(f"   URL: {m['url']}")
        print(f"   Sandbox: {m['sandbox_url']}")
        print(f"\nNext step: Hollow changes status to 'active' after council review.")
    finally:
        conn.close()

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        manifest = load_manifest()
        validate_manifest(manifest)
        register(manifest)
    except Exception as e:
        print(f"❌ Registration failed: {e}", file=sys.stderr)
        sys.exit(1)
