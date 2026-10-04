#!/usr/bin/env bash
# Start (or restart) Emoji World server + Cloudflare quick tunnel in the background.
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
./stop.sh >/dev/null 2>&1
mkdir -p logs
# server with auto-restart loop
nohup bash -c "while true; do PORT=$PORT node server.js; echo 'server exited, restarting in 2s'; sleep 2; done" >> logs/server.log 2>&1 &
echo $! > logs/server.pid
sleep 1
[ "${TUNNEL:-1}" = "0" ] && { echo "server only: http://localhost:$PORT"; exit 0; }
# tunnel (auto-restart loop; URL changes each time it restarts)
CF="$(command -v cloudflared || echo "$HOME/.local/bin/cloudflared")"
: > logs/tunnel.log
nohup bash -c "while true; do '$CF' tunnel --no-autoupdate --protocol http2 --url http://localhost:$PORT; echo 'tunnel exited, restarting in 5s'; sleep 5; done" >> logs/tunnel.log 2>&1 &
echo $! > logs/tunnel.pid
for i in $(seq 1 30); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' logs/tunnel.log | tail -1)
  [ -n "$URL" ] && break; sleep 1
done
echo "${URL:-tunnel URL not found yet - check logs/tunnel.log}" | tee logs/public_url.txt
