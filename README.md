# Mr Nor School of Engineering - Emoji World

Free-to-join browser multiplayer world (no login). Walk around the school and chat **with emojis only** - everyone has to decipher what everyone says.

## Files
- `world.json` - **the school map. Edit this to upgrade the school** (buildings + sign text, planters, trees, bushes, lamps, walls, spawn area, map size). Coordinates are tiles (32px). Restart the server after editing.
  - add a building: `{ "id": "lab", "x": 10, "y": 30, "w": 10, "h": 6, "sign": "ROBOTICS LAB", "wall": "#fff", "roof": "#3f7fd9", "pillar": "#e0742c" }`
  - sign text auto-shrinks to fit; `signX`/`signW` (tiles) set where the sign sits on wide buildings.
- `server.js` - Node (express + ws) server: name filter, emoji-only validation, rate limits, movement validation, 100-player cap, heartbeat.
- `public/` - client (`index.html`, `game.js` engine/renderer, `emojis.js` picker categories, `style.css`).
- `test.js` - headless 2-client test: `node test.js [ws://localhost:8080/ws]`; `shot.py` - Playwright screenshots.

## Controls
- Desktop: WASD / arrow keys move, **Z = A** (open picker / send draft), **X = B** (wave / close picker), Enter = open chat.
- Phone: Game Boy-style D-pad (8 directions) bottom-left; **A** = emoji picker (press again to send), **B** = wave 👋. Tap the ⚡ row to instantly send a recent emoji.

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
