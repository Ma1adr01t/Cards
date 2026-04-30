# Cards Playtest

A browser-playable, no-backend prototype for testing a cooperative run-based card game loop.

## Run locally
- Option 1: open `index.html` directly in a browser.
- Option 2 (recommended): run a static server:
  - `python3 -m http.server 4173`
  - open `http://localhost:4173`

## Deploy to GitHub Pages
1. Push this repo to GitHub.
2. In **Settings → Pages**, set source to **Deploy from branch**.
3. Select branch (usually `main`) and folder `/ (root)`.
4. Save. GitHub Pages serves `index.html`.

## Data editing
All core card/rules data is in `data.js`:
- `RULES` for config toggles (EV gain, enemy cap, item action economy, etc.)
- `ITEMS`, `EQUIPMENT`, `MEMENTOS`, `STATUSES`, `ENEMIES`, `WARDENS`

You can edit names, values, durations, text, and roll tables directly.

## Current scope / limitations
- Many effects are logged instead of fully auto-resolved.
- Manual override buttons are included for HP, status, EV, badges, item duration, and equipment durability.
- Loot assignment/inventory limits are lightweight for fast playtesting.
- Warden reward handling is partly manual (logged for resolution).
