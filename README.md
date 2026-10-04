# Mr Nor DnT - School of Design and Technology - Emoji World

Free-to-join browser multiplayer world (no login). Walk around the school and chat **with emojis only** - everyone has to decipher what everyone says.

## Files
- `world.json` - **the school map. Edit this to upgrade the school** (buildings + sign text, planters, trees, bushes, lamps, walls, spawn area, map size). Coordinates are tiles (32px). Restart the server after editing.
  - add a building: `{ "id": "lab", "x": 10, "y": 30, "w": 10, "h": 6, "sign": "ROBOTICS LAB", "wall": "#fff", "roof": "#3f7fd9", "pillar": "#e0742c" }`
  - sign text auto-shrinks to fit; `signX`/`signW` (tiles) set where the sign sits on wide buildings.
- `server.js` - Node (express + ws) server: name filter, emoji-only validation, rate limits, movement validation, 100-player cap, heartbeat.
- `public/` - client (`index.html`, `game.js` engine/renderer, `emojis.js` picker categories, `style.css`).
- `lib/missions.js` - Decode Missions game logic (rounds, guesses, scoring, teacher API helpers); `lib/phrases.js` - built-in phrase bank (42 phrases).
- `public/teacher.html` - teacher page served at `/teacher` (PIN protected).
- `test.js` - headless test (chat, movement + Decode Missions + teacher API): `node test.js [ws://localhost:8080/ws]` (uses `TEACHER_PIN` env or `1234`; set `KEEP_SCORES=1` to skip the score-reset step on a live class server).
- `shot.py` / `shot_mission.py` - Playwright screenshots.

## Decode Missions (communication game)
A pixel-art **MISSION BOARD** stands in the courtyard just south of spawn (`objects` in `world.json`).
1. Walk up to the board - a yellow **A: Mission** prompt appears (the A button shows 📋). Press **A** (Z on keyboard).
2. **Be the Sender**: the server picks a random secret phrase and shows it **only to you**. Explain it using normal emoji chat (A opens the picker). Your emoji messages also appear in the **Mission clue strip** for everyone.
3. Everyone else taps **🤔 GUESS** (strip, or the board) and picks 1 of **4 options** (correct + 3 distractors, shuffled each round). One guess each - no typing, so chat stays emoji-only.
4. A round lasts **90 s**. When someone decodes it, the others get **5 s last chance**, then the round ends (or immediately once everyone has guessed).
5. Results pop up for everyone: who decoded it, the secret phrase, the Sender's emoji clues and how everyone voted - great for class discussion ("which emojis helped? which were confusing?").
- Scoring: first correct **+3**, other correct **+1**, Sender **+2** if anyone decodes it. Session leaderboard (top 5, by name) via the board or the 🏆 button. Scores reset when the server restarts.
- Panels work with the controller: D-pad up/down to choose, **A** = select, **B** = close (desktop: arrows/WASD, Z, X). Tapping also works.

### Teacher page - `/teacher`
Open `https://<your-site>/teacher` and enter the PIN (env var **`TEACHER_PIN`**, default **`1234`** - set your own on Render: Dashboard → service → Environment → add `TEACHER_PIN`).
- Start a round (random or chosen Sender, 60-180 s) / stop a round, reset scores.
- Add/remove your own phrases; choose **Mixed** (built-in + yours) or **My phrases only** (wrong options are borrowed from the built-in bank until you have 4+).
- **📺 Big screen** (or `/teacher?big=1`) for the projector: timer, clues, vote counts, results and leaderboard. The secret phrase is never shown on the big screen until the reveal.
- Custom phrases are saved to `data/custom-phrases.json` (or `$DATA_DIR`). **Render's free plan has an ephemeral disk**: the file is lost on every restart/redeploy (and when the free instance sleeps), so keep a copy of your list. Tunable env: `MISSION_SECONDS` (default 90), `MISSION_GRACE_MS` (default 5000).

## Controls
- Desktop: WASD / arrow keys move, **Z = A** (open picker / send draft), **X = B** (wave / close picker), Enter = open chat.
- Phone: Game Boy-style D-pad (8 directions) bottom-left; **A** = emoji picker (press again to send), **B** = wave 👋. Tap the ⚡ row to instantly send a recent emoji.
- Next to the MISSION BOARD, **A** opens the mission panel instead of the picker (the 😀 button still opens the picker).

## Start / restart / stop
```bash
cd /workspace/emoji-world
./start.sh            # (re)starts server on :8080 + Cloudflare quick tunnel, prints public URL (logs/public_url.txt)
TUNNEL=0 ./start.sh   # server only
./stop.sh             # stop both
tail -f logs/server.log logs/tunnel.log
```
A quick-tunnel URL changes every time the tunnel restarts. Requires `cloudflared` (installed at `~/.local/bin/cloudflared`).

## Run on another computer (e.g. a Mac) to get a public link
```bash
# needs Node 20+ and cloudflared (brew install cloudflared)
npm install && node server.js            # http://localhost:8080
cloudflared tunnel --url http://localhost:8080   # prints https://xxxx.trycloudflare.com
```

## Deploy on Render (free)
This repo includes `render.yaml`. On render.com: sign in with GitHub → **New → Blueprint** → pick this repo → Apply
(or **New → Web Service**: build `npm install`, start `node server.js`, health check `/health`, plan Free).
Server listens on `$PORT` (default 8080) on `0.0.0.0`; websockets are on the same port at `/ws`.
Free instances sleep after ~15 min idle and take ~30-60s to wake; the client shows "Waking up server..." and auto-reconnects.
