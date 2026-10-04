#!/usr/bin/env bash
cd "$(dirname "$0")"
for f in logs/server.pid logs/tunnel.pid; do [ -f "$f" ] && pkill -P "$(cat $f)" 2>/dev/null; [ -f "$f" ] && kill "$(cat $f)" 2>/dev/null; rm -f "$f"; done
pkill -f "^node server.js" 2>/dev/null; pkill -x cloudflared 2>/dev/null
true
