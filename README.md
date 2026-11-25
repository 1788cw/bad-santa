# Bad Santa — Standalone Browser Party Tracker

A **100% browser-only, zero-dependency** Bad Santa (White Elephant / Dirty Santa) web app designed for a meeting room TV controlled from one laptop, featuring **custom inline SVG vector graphics** and **4 switchable themes**.

## How to Run

**No backend or build step required!**

- Open `index.html` directly in any browser (double-click it, or drag it into Chrome/Safari/Edge).
- Or serve it locally for a `localhost` URL (e.g. `python3 -m http.server 3000`).

## Themes (Switch Live Anytime)

- **Velvet Lodge** — Classic deep pine green, velvet crimson, and champagne gold
- **Midnight Frost** — Modern arctic navy, glacier cyan, and berry accents
- **Naughty Neon** — High-contrast game-show charcoal plum, electric magenta, and laser gold
- **Scandi Craft** — Bright alabaster paper, Nordic pine, and holly red (ideal for brightly lit meeting rooms!)

## Features

- **100% Custom Vector Graphics** (`icons.js`) — Crisp SVG brand mark, illustrations, status emblems, and 16 selectable multi-tone gift category vectors (zero emojis).
- **Numbers `1`–`X`**: Pick total players (2–60) — no rooms, codes, or typing player names. Includes 30-up printable cut-out number cards.
- **Fast Live Tracking**: Type each unwrapped gift name right in the turn spotlight and press **Enter**; click **Steal** on any open gift card to transfer ownership and call up the robbed player.
- **Automatic Bad Santa Rules**: Configurable max steals per gift with **Frozen** locks, same-turn steal-back protection, and **Player 1 Final Bonus Turn**.
- **Built-In Live Holiday Jazz Quartet (~90 min)** (`jazz-charts.js`, `jazz-engine.js`, `music.js`): 24 classic Christmas standards recomposed into live jazz arrangements (Swing, 3/4 Jazz Waltz, Bossa Nova, Latin Minor Jazz, Cocktail Ballad, Gospel Soul-Jazz, Cool Modal) with full club form (*Intro → Head → Rhodes Solo → Vibes Solo → Bass Feature → Quartet Jam → Head Out*) — synthesized live in-browser via Web Audio (Fender Rhodes, jazz vibraphone, plucked upright bass, brushed drums, warm room reverb) with zero audio files, live section/chord readout, shuffle, seek bar, saved volume, and automatic SFX ducking.
- **TV Ready**: **Fullscreen** mode, toggleable play-by-play log, inline gift editing, **Undo**, synthesized festive sound effects, and end-of-game superlative awards.
- **Auto-Save + Dual-Window Sync**: Saves progress, theme, and music settings in `localStorage` and syncs across browser windows via `BroadcastChannel`.

## Files

- `index.html` — App shell
- `styles.css` — 4 theme token palettes & TV layout styles
- `icons.js` — Custom inline SVG vector library & theme definitions
- `engine.js` — Pure Bad Santa rules & state machine
- `app.js` — Browser UI, theme switcher, `localStorage` persistence, and tab sync
- `sound.js` — Synthesized Web Audio festive sound effects
- `music.js` — Holiday Jazz Trio playback controller (shuffle, volume persistence, SFX ducking)
- `jazz-charts.js` & `jazz-engine.js` — Recomposed classic Christmas jazz charts & live Web Audio Jazz Trio synthesizer
- `test/engine.test.js` — Automated rules, icons, and jazz chart tests (`npm test`)
