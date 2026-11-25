# 🎅 Bad Santa — Standalone Browser Party Tracker

A **100% browser-only, zero-dependency** Bad Santa (White Elephant / Dirty Santa) web app designed for a meeting room TV controlled from one laptop.

## How to Run

**No backend or build step required!**

- Simply open `index.html` directly in any browser (double-click it, or drag it into Chrome/Safari/Edge).
- Or serve it locally if you want a `localhost` URL (e.g. `python3 -m http.server 3000`).

## Features

- **Numbers `#1`–`#X`**: Pick total players (2–60) — no rooms, codes, or typing player names.
- **Fast Live Tracking**: Type each unwrapped gift name right in the turn spotlight and press **Enter**; click **😈 Steal** on any open gift card to transfer ownership and call up the robbed player.
- **Automatic Bad Santa Rules**: Configurable max steals per gift with **❄️ Frozen** locks, same-turn steal-back protection, and **Player #1 Final Bonus Turn**.
- **TV Ready**: **⛶ Fullscreen** mode, toggleable play-by-play log, `✏️` gift editing, **⏪ Undo**, synthesized festive sound effects, and end-of-game superlative awards.
- **Auto-Save + Dual-Window Sync**: Automatically saves game progress in `localStorage` (survives refreshes) and stays synced across multiple tabs/windows on the same browser via `BroadcastChannel`.

## Files

- `index.html` — App shell
- `styles.css` — Festive TV-optimized styling
- `engine.js` — Pure Bad Santa rules & state machine
- `app.js` — Browser UI, `localStorage` persistence, and tab sync
- `sound.js` — Synthesized Web Audio festive sound effects
- `test/engine.test.js` — Automated rules tests (`npm test`)
