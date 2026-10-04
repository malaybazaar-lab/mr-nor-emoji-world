// Mr Nor DnT - School of Design and Technology - Emoji World server
const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS = 100;
const TILE = 32;
const SPEED = 170;               // px per second (client uses same)
const MAX_EMOJIS = 8;

// ---------- world (loaded from world.json - edit that file to change the school) ----------
// tile codes: 0 plaza, 1 grass, 2 building, 3 tree, 4 bush, 5 lamp, 6 flowers(walkable), 8 wall
const SOLID = new Set([2, 3, 4, 5, 8]);
const WORLD = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'world.json'), 'utf8'));
const W = WORLD.width, H = WORLD.height;
const SIGN = (WORLD.buildings[0] && WORLD.buildings[0].sign) || '';
function makeMap() {
  const t = new Array(W * H).fill(WORLD.ground === 'grass' ? 1 : 0);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v; };
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (WORLD.borderTrees) {
    for (let y = 0; y < H; y++) { set(0, y, 3); set(W - 1, y, 3); }
    for (let x = 0; x < W; x++) set(x, H - 1, 3);
  }
  for (const p of WORLD.planters || []) {
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) set(x, y, 1);
    for (let y = p.y + 1; y < p.y + p.h - 1; y++) for (let x = p.x + 1; x < p.x + p.w - 1; x++) {
      const r = rnd();
      if (r < (p.bushes ?? 0.13)) set(x, y, 4); else if (r < (p.bushes ?? 0.13) + (p.flowers ?? 0.19)) set(x, y, 6);
    }
    if (p.tree) set(p.x + 2 + Math.floor(rnd() * (p.w - 4)), p.y + 2 + Math.floor(rnd() * (p.h - 4)), 3);
  }
  for (const b of WORLD.buildings || []) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, 2);
  for (const [x, y] of WORLD.trees || []) set(x, y, 3);
  for (const [x, y] of WORLD.bushes || []) set(x, y, 4);
  for (const [x, y] of WORLD.lamps || []) set(x, y, 5);
  for (const [x, y] of WORLD.flowers || []) set(x, y, 6);
  for (const [x, y] of WORLD.walls || []) set(x, y, 8);
  const sp = WORLD.spawn;
  for (let y = sp.y; y < sp.y + sp.h; y++) for (let x = sp.x; x < sp.x + sp.w; x++) set(x, y, 0);
  return { w: W, h: H, tile: TILE, tiles: t, solid: [...SOLID], buildings: WORLD.buildings || [], title: WORLD.title, sign: SIGN };
}
const MAP = makeMap();
function solidAt(px, py) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
  return SOLID.has(MAP.tiles[ty * W + tx]);
}
// player feet hitbox: 20 x 10 centred on (x,y)
function blocked(x, y) {
  return solidAt(x - 10, y - 5) || solidAt(x + 10, y - 5) || solidAt(x - 10, y + 5) || solidAt(x + 10, y + 5);
}

// ---------- names ----------
const BAD = ['fuck','fuk','fck','shit','bitch','cunt','dick','cock','pussy','penis','vagina','boob','tits','slut','whore','fag','nigg','nigga','retard','rape','porn','sex','bastard','bollock','wank','twat','prick','damn','crap','pukimak','puki','kanina','knn','cheebai','cb','lanjiao','lj','babi','sial','motherf','asshole','arse','jibai','nabei','kimak','pundek','butt','horny','nazi','hitler','kill','die','dumb','stupid','idiot','loser','ugly','fat'];
const BAD_WORD_ONLY = new Set(['ass', 'cb', 'lj', 'knn', 'die', 'fat', 'kill', 'butt', 'sex', 'puki', 'babi', 'sial']);
function norm(s) {
  return s.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/\$/g, 's').replace(/@/g, 'a');
}
function isBadName(name) {
  const n = norm(name);
  const squashed = n.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  const words = n.split(/[^a-z]+/).filter(Boolean);
  for (const b of BAD) {
    if (BAD_WORD_ONLY.has(b)) { if (words.includes(b)) return true; }
    else if (n.replace(/[^a-z]/g, '').includes(b) || squashed.includes(b)) return true;
  }
  if (words.includes('ass')) return true;
  return false;
}
function cleanName(raw) {
  let n = String(raw || '').replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12).trim();
  if (!n || isBadName(n)) n = 'Player' + Math.floor(100 + Math.random() * 900);
  return n;
}

// ---------- emoji validation ----------
const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
const RGI = /^\p{RGI_Emoji}$/v;
const BLOCKED_EMOJI = new Set(['🖕', '🍆', '🍑', '💦', '👅', '🔞', '🖕🏻', '🖕🏼', '🖕🏽', '🖕🏾', '🖕🏿']);
function validateEmoji(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 160) return { ok: false, reason: 'empty or too long' };
  const out = [];
  for (const { segment } of seg.segment(text)) {
    if (/^\s+$/.test(segment)) continue;                 // ignore spaces between emojis
    let g = segment;
    if (!RGI.test(g)) { if (RGI.test(g + '\uFE0F')) g = g + '\uFE0F'; else return { ok: false, reason: 'emoji only!' }; }
    if (BLOCKED_EMOJI.has(g.replace(/\uFE0F/g, ''))) return { ok: false, reason: 'that emoji is not allowed' };
    out.push(g);
  }
  if (!out.length) return { ok: false, reason: 'empty' };
  if (out.length > MAX_EMOJIS) return { ok: false, reason: `max ${MAX_EMOJIS} emojis` };
  return { ok: true, text: out.join('') };
}

// ---------- avatar look ----------
const PAL = { skin: 6, hair: 8, shirt: 10, pants: 6, style: 5, acc: 5 };
function cleanLook(l) {
  const o = {};
  for (const k of Object.keys(PAL)) { const v = Number(l && l[k]); o[k] = Number.isInteger(v) && v >= 0 && v < PAL[k] ? v : 0; }
  return o;
}

// ---------- server ----------
const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m' }));
app.get('/health', (req, res) => res.json({ ok: true, players: players.size }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

const players = new Map(); // id -> player
let nextId = 1;
function pub(p) { return { id: p.id, name: p.name, look: p.look, x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, moving: p.moving }; }
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcast(obj, except) { const s = JSON.stringify(obj); for (const p of players.values()) if (p.ws !== except && p.ws.readyState === 1) p.ws.send(s); }
function spawn() {
  for (let i = 0; i < 50; i++) {
    const sp = WORLD.spawn;
    const x = (sp.x + 1 + Math.random() * (sp.w - 2)) * TILE, y = (sp.y + 1 + Math.random() * (sp.h - 2)) * TILE;
    if (!blocked(x, y)) return { x, y };
  }
  return { x: (WORLD.spawn.x + WORLD.spawn.w / 2) * TILE, y: (WORLD.spawn.y + WORLD.spawn.h / 2) * TILE };
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  let me = null;
  let msgBudget = 40, lastBudget = Date.now();
  ws.on('message', (data) => {
    // generic flood guard: ~40 msgs/sec
    const now = Date.now();
    msgBudget = Math.min(40, msgBudget + (now - lastBudget) * 0.04); lastBudget = now;
    if ((msgBudget -= 1) < 0) return;
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !me) {
      if (players.size >= MAX_PLAYERS) { send(ws, { t: 'full' }); return ws.close(); }
      const s = spawn();
      me = { id: nextId++, ws, name: cleanName(m.name), look: cleanLook(m.look), x: s.x, y: s.y, dir: 0, moving: false, lastMove: now, lastChat: 0 };
      players.set(me.id, me);
      send(ws, { t: 'welcome', id: me.id, you: pub(me), map: MAP, speed: SPEED, maxEmojis: MAX_EMOJIS, players: [...players.values()].filter(p => p !== me).map(pub) });
      broadcast({ t: 'joined', p: pub(me) }, ws);
      console.log(new Date().toISOString(), 'join', me.id, me.name, 'players=', players.size);
      return;
    }
    if (!me) return;
    if (m.t === 'move') {
      const x = Number(m.x), y = Number(m.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const dt = Math.min(1000, now - me.lastMove);
      const maxD = SPEED * dt / 1000 * 1.6 + 16;
      const d = Math.hypot(x - me.x, y - me.y);
      if (d > maxD || blocked(x, y)) { send(ws, { t: 'correct', x: Math.round(me.x), y: Math.round(me.y) }); me.lastMove = now; return; }
      me.x = x; me.y = y; me.lastMove = now;
      me.dir = [0, 1, 2, 3].includes(m.dir) ? m.dir : 0;
      me.moving = !!m.moving;
      return;
    }
    if (m.t === 'emote') {
      if (now - (me.lastEmote || 0) < 1500) return;
      me.lastEmote = now;
      broadcast({ t: 'emote', id: me.id, k: 'wave' });
      return;
    }
    if (m.t === 'chat') {
      if (now - me.lastChat < 1000) return send(ws, { t: 'reject', reason: 'slow down (1 msg/sec)' });
      const v = validateEmoji(m.text);
      if (!v.ok) return send(ws, { t: 'reject', reason: v.reason });
      me.lastChat = now;
      broadcast({ t: 'chat', id: me.id, name: me.name, text: v.text });
      return;
    }
  });
  ws.on('close', () => {
    if (me && players.delete(me.id)) {
      broadcast({ t: 'left', id: me.id, name: me.name });
      console.log(new Date().toISOString(), 'left', me.id, me.name, 'players=', players.size);
    }
  });
  ws.on('error', () => {});
});

// state broadcast 15Hz
setInterval(() => {
  if (!players.size) return;
  const st = [];
  for (const p of players.values()) st.push([p.id, Math.round(p.x), Math.round(p.y), p.dir, p.moving ? 1 : 0]);
  broadcast({ t: 'state', s: st });
}, 66);
// heartbeat
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; try { ws.ping(); } catch {}
  }
}, 15000);

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Emoji World listening on http://${HOST}:${PORT}`));
module.exports = { validateEmoji, cleanName };
