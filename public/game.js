// Mr Nor DnT - School of Design and Technology - Emoji World client
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const PAL = {
  skin: ['#ffdbb5', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'],
  hair: ['#1b1b24', '#5a3825', '#a0522d', '#e6c35c', '#d94c2e', '#7d4cdb', '#3fa7d6', '#e8e8f0'],
  shirt: ['#d63c3c', '#3f7fd9', '#3fae5a', '#ffcf3f', '#ff8a3d', '#9b59d0', '#ff7eb6', '#1d2340', '#ffffff', '#24b5b0'],
  pants: ['#2c4a8f', '#1d2340', '#5a5a66', '#7a4b2a', '#3fae5a', '#c9c9d6'],
  style: ['✂️', '💇', '⚡', '🍡', '🧢'], // short, long, spiky, bun, cap
  acc: ['∅', '👓', '🎀', '🎧', '👑'],
};
const BLOCKED = new Set(['🖕', '🍆', '🍑', '💦', '👅', '🔞']);
let SOLID = new Set([2, 3, 4, 5, 8, 9]);
const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
let RGI; try { RGI = new RegExp('^\\p{RGI_Emoji}$', 'v'); } catch { RGI = /^(\p{Extended_Pictographic}|\p{Regional_Indicator})/u; }
const isEmoji = (g) => (RGI.test(g) || RGI.test(g + '\uFE0F')) && !BLOCKED.has(g.replace(/\uFE0F/g, ''));
const graphemes = (s) => [...seg.segment(s)].map((x) => x.segment);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);
if (isTouch) document.body.classList.add('touch');

// ---------- join screen ----------
const look = JSON.parse(localStorage.getItem('ew_look') || 'null') || { skin: 0, hair: 0, shirt: 1, pants: 0, style: 0, acc: 0 };
for (const k of Object.keys(PAL)) if (!(look[k] >= 0 && look[k] < PAL[k].length)) look[k] = 0;
$('name').value = localStorage.getItem('ew_name') || '';
function buildSwatches() {
  for (const k of Object.keys(PAL)) {
    const box = $('o-' + k); box.innerHTML = '';
    PAL[k].forEach((v, i) => {
      const b = document.createElement('b');
      if (v.startsWith('#')) b.style.background = v; else b.textContent = v;
      if (look[k] === i) b.className = 'on';
      b.onclick = () => { look[k] = i; buildSwatches(); drawPreview(); };
      box.appendChild(b);
    });
  }
}
function drawPreview() {
  const c = $('preview'), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
  x.save(); x.scale(2, 2); drawAvatar(x, 24, 50, look, 0, 0, false); x.restore();
}
$('name').addEventListener('input', () => { const v = $('name').value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 12); if (v !== $('name').value) $('name').value = v; });
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
$('go').onclick = join;

// ---------- avatar drawing (pixel units of 2px, feet at x,y) ----------
function drawAvatar(g, x, y, lk, dir, frame, waving, t = 0) {
  const u = 2, X = Math.round(x), Y = Math.round(y);
  const skin = PAL.skin[lk.skin], hair = PAL.hair[lk.hair], shirt = PAL.shirt[lk.shirt], pants = PAL.pants[lk.pants];
  const parts = [];
  const R = (px, py, w, h, c) => parts.push([px, py, w, h, c]);
  const step = frame ? (frame === 1 ? 1 : -1) : 0;
  // legs + shoes
  R(-4, -6 + (step > 0 ? -1 : 0), 3, 5, pants); R(1, -6 + (step < 0 ? -1 : 0), 3, 5, pants);
  R(-4, -1 + (step > 0 ? -1 : 0), 3, 1, '#2a2a33'); R(1, -1 + (step < 0 ? -1 : 0), 3, 1, '#2a2a33');
  // body
  R(-5, -13, 10, 8, shirt);
  // arms
  const sw = step * 1;
  R(-7, -13 + sw, 2, 6, shirt); R(-7, -7 + sw, 2, 2, skin);
  if (waving) { const wv = Math.floor(t / 180) % 2; R(5, -19 - wv, 2, 7, shirt); R(5 + wv, -21 - wv, 2, 2, skin); }
  else { R(5, -13 - sw, 2, 6, shirt); R(5, -7 - sw, 2, 2, skin); }
  // head
  R(-7, -25, 14, 12, skin);
  // hair
  const st = lk.style;
  if (dir === 3) { R(-7, -26, 14, 10, hair); if (st === 1) R(-7, -16, 14, 4, hair); }
  else {
    R(-7, -26, 14, 4, hair);
    if (dir !== 2) R(-7, -22, 2, st === 1 ? 9 : 4, hair);
    if (dir !== 1) R(5, -22, 2, st === 1 ? 9 : 4, hair);
    if (dir === 1) R(1, -22, 6, 3, hair); if (dir === 2) R(-7, -22, 6, 3, hair);
  }
  if (st === 2) { R(-6, -28, 2, 2, hair); R(-2, -29, 2, 3, hair); R(2, -28, 2, 2, hair); R(5, -27, 2, 1, hair); }
  if (st === 3) R(-3, -30, 6, 4, hair);
  if (st === 4) { R(-8, -28, 16, 4, shirt); if (dir === 0) R(-8, -24, 16, 1, shirt); if (dir === 1) R(-11, -25, 4, 2, shirt); if (dir === 2) R(7, -25, 4, 2, shirt); }
  // outline pass
  g.fillStyle = '#1d2340';
  for (const [px, py, w, h] of parts) g.fillRect(X + (px - 1) * u, Y + (py - 1) * u, (w + 2) * u, (h + 2) * u);
  // shadow behind
  for (const [px, py, w, h, c] of parts) { g.fillStyle = c; g.fillRect(X + px * u, Y + py * u, w * u, h * u); }
  // face
  if (dir !== 3) {
    const ex = dir === 1 ? -3 : dir === 2 ? 1 : 0;
    g.fillStyle = '#1d2340';
    g.fillRect(X + (-4 + ex) * u, Y - 19 * u, u * 2, u * 3); g.fillRect(X + (2 + ex) * u, Y - 19 * u, u * 2, u * 3);
    g.fillStyle = '#fff'; g.fillRect(X + (-4 + ex) * u, Y - 19 * u, u, u); g.fillRect(X + (2 + ex) * u, Y - 19 * u, u, u);
    g.fillStyle = '#ff9a9a'; if (dir === 0) { g.fillRect(X - 6 * u, Y - 16 * u, u * 2, u); g.fillRect(X + 4 * u, Y - 16 * u, u * 2, u); }
    g.fillStyle = '#9c3b3b'; g.fillRect(X + (-1 + ex) * u, Y - 15 * u, u * 2, u);
    const a = lk.acc;
    if (a === 1) { g.fillStyle = '#1d2340'; g.fillRect(X + (-5 + ex) * u, Y - 20 * u, 4 * u, u); g.fillRect(X + (1 + ex) * u, Y - 20 * u, 4 * u, u); g.fillRect(X + (-5 + ex) * u, Y - 20 * u, u, 4 * u); g.fillRect(X + (4 + ex) * u, Y - 20 * u, u, 4 * u); g.fillRect(X + (-2 + ex) * u, Y - 19 * u, 4 * u, u); }
  }
  const a = lk.acc;
  if (a === 2) { g.fillStyle = '#1d2340'; g.fillRect(X + 2 * u, Y - 30 * u, 8 * u, 5 * u); g.fillStyle = '#ff5c9a'; g.fillRect(X + 3 * u, Y - 29 * u, 2 * u, 3 * u); g.fillRect(X + 7 * u, Y - 29 * u, 2 * u, 3 * u); g.fillStyle = '#c8326e'; g.fillRect(X + 5 * u, Y - 28 * u, 2 * u, 2 * u); }
  if (a === 3) { g.fillStyle = '#1d2340'; g.fillRect(X - 8 * u, Y - 28 * u, 16 * u, 2 * u); g.fillRect(X - 9 * u, Y - 22 * u, 3 * u, 5 * u); g.fillRect(X + 6 * u, Y - 22 * u, 3 * u, 5 * u); g.fillStyle = '#3fa7d6'; g.fillRect(X - 8 * u, Y - 21 * u, u, 3 * u); g.fillRect(X + 7 * u, Y - 21 * u, u, 3 * u); }
  if (a === 4) { g.fillStyle = '#1d2340'; g.fillRect(X - 6 * u, Y - 32 * u, 12 * u, 6 * u); g.fillStyle = '#ffcf3f'; g.fillRect(X - 5 * u, Y - 29 * u, 10 * u, 2 * u); g.fillRect(X - 5 * u, Y - 31 * u, 2 * u, 2 * u); g.fillRect(X - u, Y - 31 * u, 2 * u, 2 * u); g.fillRect(X + 3 * u, Y - 31 * u, 2 * u, 2 * u); }
}

// ---------- world rendering ----------
let MAP = null, worldCanvas = null, TILE = 32, SPEED = 170, MAXE = 8;
function tileAt(tx, ty) { if (tx < 0 || ty < 0 || tx >= MAP.w || ty >= MAP.h) return 2; return MAP.tiles[ty * MAP.w + tx]; }
function solidAt(px, py) { return SOLID.has(tileAt(Math.floor(px / TILE), Math.floor(py / TILE))); }
function blocked(x, y) { return solidAt(x - 10, y - 5) || solidAt(x + 10, y - 5) || solidAt(x - 10, y + 5) || solidAt(x + 10, y + 5); }
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
const isGrassy = (v) => v === 1 || v === 4 || v === 6 || v === 3;

function buildWorld() {
  const c = document.createElement('canvas'); c.width = MAP.w * TILE; c.height = MAP.h * TILE;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  // ground
  for (let ty = 0; ty < MAP.h; ty++) for (let tx = 0; tx < MAP.w; tx++) {
    const v = tileAt(tx, ty), X = tx * TILE, Y = ty * TILE;
    const grassy = isGrassy(v) && !(v === 3 && (tx === 0 || tx === MAP.w - 1 || ty === MAP.h - 1) && false);
    if (grassy) {
      g.fillStyle = '#5cb84a'; g.fillRect(X, Y, TILE, TILE);
      for (let i = 0; i < 5; i++) { g.fillStyle = hash(tx * 7 + i, ty) > 0.5 ? '#4ea43e' : '#6fca5b'; g.fillRect(X + Math.floor(hash(tx, ty * 3 + i) * 28), Y + Math.floor(hash(tx * 5 + i, ty * 2) * 28), 4, 2); }
    } else {
      g.fillStyle = '#f2c9a0'; g.fillRect(X, Y, TILE, TILE);
      g.fillStyle = '#e2b182'; g.fillRect(X, Y, TILE, 2); g.fillRect(X, Y + 16, TILE, 2); g.fillRect(X, Y, 2, TILE); g.fillRect(X + 16, Y, 2, TILE);
    }
    if (v === 6) for (let i = 0; i < 4; i++) {
      const fx = X + 4 + Math.floor(hash(tx + i, ty * 9) * 22), fy = Y + 4 + Math.floor(hash(tx * 3, ty + i * 5) * 22);
      g.fillStyle = ['#ff7eb6', '#ffffff', '#ffcf3f', '#c77dff'][i]; g.fillRect(fx, fy, 4, 4); g.fillStyle = '#ffef9a'; g.fillRect(fx + 1, fy + 1, 2, 2);
    }
  }
  // curbs around grass
  g.fillStyle = '#d9dbe6';
  for (let ty = 0; ty < MAP.h; ty++) for (let tx = 0; tx < MAP.w; tx++) {
    if (!isGrassy(tileAt(tx, ty))) continue;
    const X = tx * TILE, Y = ty * TILE, n = (a, b) => { const v = tileAt(a, b); return v === 0; };
    if (n(tx, ty - 1)) g.fillRect(X, Y, TILE, 4); if (n(tx, ty + 1)) g.fillRect(X, Y + TILE - 4, TILE, 4);
    if (n(tx - 1, ty)) g.fillRect(X, Y, 4, TILE); if (n(tx + 1, ty)) g.fillRect(X + TILE - 4, Y, 4, TILE);
  }
  // buildings
  for (const b of MAP.buildings) drawBuilding(g, b);
  // mission board(s): pre-rendered sprite, drawn depth-sorted with players in render()
  sprites = [];
  for (const o of MAP.objects || []) if (o.type === 'mission_board') {
    const sc = document.createElement('canvas'), ow = (o.w || 2) * TILE; sc.width = ow + 16; sc.height = TILE + 52;
    const sg = sc.getContext('2d'); sg.imageSmoothingEnabled = false;
    drawBoard(sg, { ...o, x: 0, y: 0 }, 8, 50);
    sprites.push({ c: sc, x: o.x * TILE - 8, y: o.y * TILE - 50, base: (o.y + (o.h || 1)) * TILE });
  }
  // objects sorted top->bottom
  for (let ty = 0; ty < MAP.h; ty++) for (let tx = 0; tx < MAP.w; tx++) {
    const v = tileAt(tx, ty), X = tx * TILE, Y = ty * TILE;
    if (v === 4) drawBush(g, X, Y, tx, ty);
    else if (v === 3) drawTree(g, X, Y, tx, ty);
    else if (v === 5) drawLamp(g, X, Y);
    else if (v === 8) { g.fillStyle = '#1d2340'; g.fillRect(X, Y + 4, TILE, TILE - 4); g.fillStyle = '#b9785a'; g.fillRect(X + 2, Y + 6, TILE - 4, TILE - 10); }
  }
  worldCanvas = c;
}
function drawBush(g, X, Y, tx, ty) {
  g.fillStyle = '#1d2340'; g.fillRect(X + 2, Y + 4, 28, 26); g.fillRect(X + 6, Y, 20, 32);
  g.fillStyle = '#2f8a3a'; g.fillRect(X + 4, Y + 6, 24, 22); g.fillRect(X + 8, Y + 2, 16, 28);
  g.fillStyle = '#43a84a'; g.fillRect(X + 8, Y + 6, 14, 10); g.fillRect(X + 6, Y + 10, 6, 8);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ff9ad0' : '#ffffff'; g.fillRect(X + 6 + Math.floor(hash(tx * 11 + i, ty) * 18), Y + 6 + Math.floor(hash(tx, ty * 13 + i) * 18), 3, 3); }
}
function drawTree(g, X, Y, tx, ty) {
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X + 2, Y + 24, 28, 8);
  g.fillStyle = '#1d2340'; g.fillRect(X + 10, Y + 8, 12, 24); g.fillStyle = '#9a5a2c'; g.fillRect(X + 12, Y + 10, 8, 20);
  const cy = Y - 18;
  g.fillStyle = '#1d2340'; g.fillRect(X - 6, cy + 6, 44, 26); g.fillRect(X, cy, 32, 38); g.fillRect(X + 4, cy - 4, 24, 4);
  g.fillStyle = '#2e8b35'; g.fillRect(X - 4, cy + 8, 40, 22); g.fillRect(X + 2, cy + 2, 28, 34);
  g.fillStyle = '#48b048'; g.fillRect(X + 2, cy + 4, 20, 14); g.fillRect(X - 2, cy + 12, 10, 10); g.fillRect(X + 18, cy + 18, 12, 8);
  g.fillStyle = '#7ad66a'; g.fillRect(X + 6, cy + 6, 8, 4); g.fillRect(X + 2, cy + 14, 4, 4);
}
function drawLamp(g, X, Y) {
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X + 6, Y + 26, 20, 6);
  g.fillStyle = '#1d2340'; g.fillRect(X + 9, Y + 22, 14, 8); g.fillRect(X + 12, Y - 16, 8, 40); g.fillRect(X + 6, Y - 32, 20, 18);
  g.fillStyle = '#2f5fd0'; g.fillRect(X + 11, Y + 24, 10, 4); g.fillRect(X + 14, Y - 14, 4, 38); g.fillRect(X + 8, Y - 30, 16, 4); g.fillRect(X + 8, Y - 18, 16, 3);
  g.fillStyle = '#ffe36a'; g.fillRect(X + 9, Y - 26, 14, 8); g.fillStyle = '#fff6c0'; g.fillRect(X + 11, Y - 25, 4, 4);
}
let sprites = [];
function drawBoard(g, o, ox = 0, oy = 0) {
  // pixel-art notice board: 2 posts + framed cork board rising above its 1-tile footprint
  const X = o.x * TILE + ox, Y = o.y * TILE + oy, Wd = (o.w || 2) * TILE;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X + 2, Y + 22, Wd - 4, 10);
  g.fillStyle = '#1d2340'; g.fillRect(X + 6, Y - 6, 10, 34); g.fillRect(X + Wd - 16, Y - 6, 10, 34);
  g.fillStyle = '#8a5a2b'; g.fillRect(X + 8, Y - 4, 6, 30); g.fillRect(X + Wd - 14, Y - 4, 6, 30);
  const bx = X - 4, by = Y - 44, bw = Wd + 8, bh = 50;
  g.fillStyle = '#1d2340'; g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#b06a30'; g.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
  g.fillStyle = '#d9a35f'; g.fillRect(bx + 7, by + 15, bw - 14, bh - 22);
  for (let i = 0; i < 18; i++) { g.fillStyle = hash(i, 7) > 0.5 ? '#c98f4c' : '#e6b673'; g.fillRect(bx + 8 + Math.floor(hash(i, 3) * (bw - 18)), by + 16 + Math.floor(hash(3, i) * (bh - 26)), 2, 2); }
  // title strip
  g.fillStyle = '#ffcf3f'; g.fillRect(bx + 5, by + 4, bw - 10, 10);
  g.fillStyle = '#1d2340'; g.font = 'bold 9px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(o.label || 'MISSION BOARD', bx + bw / 2, by + 9.5);
  // pinned notes
  const notes = [['#ffffff', 10, 19], ['#ff9ad0', 30, 22], ['#9fd3ff', 50, 18]];
  for (const [c, nx, ny] of notes) { g.fillStyle = '#1d2340'; g.fillRect(bx + nx - 1, by + ny - 1, 14, 14); g.fillStyle = c; g.fillRect(bx + nx, by + ny, 12, 12); g.fillStyle = '#c0263c'; g.fillRect(bx + nx + 5, by + ny + 1, 2, 2); g.fillStyle = '#8890a8'; g.fillRect(bx + nx + 2, by + ny + 6, 8, 1); g.fillRect(bx + nx + 2, by + ny + 9, 6, 1); }
  g.font = '12px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText('❓', bx + bw - 10, by + 38);
}
const BOARD_REACH = 48;
function nearBoard() {
  if (!MAP || !me) return null;
  for (const o of MAP.objects || []) {
    if (o.type !== 'mission_board') continue;
    const x0 = o.x * TILE, y0 = o.y * TILE, x1 = (o.x + (o.w || 1)) * TILE, y1 = (o.y + (o.h || 1)) * TILE;
    const dx = Math.max(x0 - me.x, 0, me.x - x1), dy = Math.max(y0 - me.y, 0, me.y - y1);
    if (Math.hypot(dx, dy) <= BOARD_REACH - 4) return o;
  }
  return null;
}
function drawBuilding(g, b) {
  const X = b.x * TILE, Y = b.y * TILE, Wd = b.w * TILE, Ht = b.h * TILE;
  g.fillStyle = '#1d2340'; g.fillRect(X, Y, Wd, Ht);
  g.fillStyle = b.wall || '#e8eef7'; g.fillRect(X + 4, Y + 4, Wd - 8, Ht - 8);
  // roof band
  g.fillStyle = b.roof || '#3f7fd9'; g.fillRect(X + 4, Y + 4, Wd - 8, 20);
  g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = X + 8; i < X + Wd - 8; i += 24) g.fillRect(i, Y + 6, 12, 3);
  // windows
  const sx0 = b.signX != null ? b.signX * TILE : X + Wd * 0.2, sw = b.signW != null ? b.signW * TILE : Wd * 0.6;
  for (let wy = Y + 34; wy < Y + Ht - 44; wy += 40) for (let wx = X + 16; wx < X + Wd - 40; wx += 40) {
    if (b.w > 20 && wx + 28 > sx0 - 8 && wx < sx0 + sw + 8) continue;
    g.fillStyle = '#1d2340'; g.fillRect(wx, wy, 28, 26); g.fillStyle = '#5fa8f0'; g.fillRect(wx + 3, wy + 3, 22, 20);
    g.fillStyle = '#a9d6ff'; g.fillRect(wx + 5, wy + 5, 6, 6); g.fillStyle = '#1d2340'; g.fillRect(wx + 13, wy + 3, 2, 20);
  }
  // pillars
  g.fillStyle = b.pillar || '#e0742c';
  const step = Math.max(6, Math.floor(b.w / 8)) * TILE;
  for (let px = X + 8; px < X + Wd - 20; px += step) { g.fillStyle = '#1d2340'; g.fillRect(px - 2, Y + 22, 20, Ht - 26); g.fillStyle = b.pillar || '#e0742c'; g.fillRect(px, Y + 24, 16, Ht - 30); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(px + 2, Y + 24, 3, Ht - 30); }
  // entrance under sign
  const ex = sx0 + sw / 2 - 64, ey = Y + Ht - 60;
  g.fillStyle = '#1d2340'; g.fillRect(ex, ey, 128, 56); g.fillStyle = '#5fa8f0'; g.fillRect(ex + 4, ey + 4, 120, 52);
  g.fillStyle = '#1d2340'; g.fillRect(ex + 62, ey + 4, 4, 52); g.fillStyle = '#a9d6ff'; g.fillRect(ex + 10, ey + 10, 10, 20); g.fillRect(ex + 72, ey + 10, 10, 20);
  // sign (auto-fit text)
  const text = String(b.sign || '');
  if (text) {
    const sh = b.h >= 7 ? 64 : 40;
    const sy = Math.max(Y + 26, ey - sh - 10);
    g.fillStyle = '#1d2340'; g.fillRect(sx0, sy, sw, sh);
    g.fillStyle = '#ffffff'; g.fillRect(sx0 + 4, sy + 4, sw - 8, sh - 8);
    g.fillStyle = '#dbe8ff'; g.fillRect(sx0 + 8, sy + 8, sw - 16, sh - 16);
    let fs = Math.floor(sh * 0.55);
    g.font = `bold ${fs}px "Courier New", monospace`;
    while (g.measureText(text).width > sw - 32 && fs > 8) { fs--; g.font = `bold ${fs}px "Courier New", monospace`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1d2340';
    g.fillText(text, sx0 + sw / 2, sy + sh / 2 + 1);
  }
}

// ---------- state ----------
let ws = null, myId = null, me = null;
const players = new Map();
const keys = new Set();
const pad = { x: 0, y: 0 };
let lastSent = 0, lastSentX = 0, lastSentY = 0, lastMoving = false;

let joinName = '', retries = 0, retryTimer = null, wasFull = false;
const MAX_RETRIES = 40; // ~2 min: Render free instances can take 30-60s to wake
function wakeMsg(t) { $('joinerr').textContent = t; }
function join() {
  const name = $('name').value.trim();
  if (!name) { $('joinerr').textContent = 'Please type a name 🙂'; return; }
  localStorage.setItem('ew_name', name); localStorage.setItem('ew_look', JSON.stringify(look));
  joinName = name; retries = 0; wasFull = false;
  if (window.EWMusic) EWMusic.unlock(); // inside the tap: unlocks audio on iOS/Android (plays once the world appears)
  $('go').disabled = true; wakeMsg('Connecting...');
  connect();
}
function wsSend(d) { if (ws && ws.readyState === 1) ws.send(d); }
function connect() {
  clearTimeout(retryTimer);
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  let opened = false;
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => { opened = true; retries = 0; ws.send(JSON.stringify({ t: 'join', name: joinName, look })); };
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
  ws.onclose = () => {
    if (wasFull) { $('go').disabled = false; return; }
    retries++;
    if (retries > MAX_RETRIES) {
      if (myId) sysLog('Server unreachable. Reload the page to try again.');
      else { $('go').disabled = false; wakeMsg('Could not connect. Try again.'); }
      return;
    }
    const delay = Math.min(1000 * retries, 5000);
    if (myId) sysLog(retries === 1 ? 'Disconnected. Reconnecting...' : '😴 Waking up server... hang on');
    else wakeMsg(retries === 1 && !opened ? '😴 Waking up server... (can take up to a minute)' : `😴 Waking up server... (try ${retries})`);
    retryTimer = setTimeout(connect, delay);
  };
}
// Poke the server on page load so a sleeping free instance starts waking before the player hits Join.
fetch('/health', { cache: 'no-store' }).catch(() => {});
function mkPlayer(p) { return { ...p, rx: p.x, ry: p.y, tx: p.x, ty: p.y, bubble: null, waveUntil: 0, anim: 0 }; }
function onMsg(m) {
  switch (m.t) {
    case 'full': wasFull = true; $('joinerr').textContent = 'World is full (100 players). Try later!'; break;
    case 'welcome': {
      myId = m.id; MAP = m.map; TILE = MAP.tile; SPEED = m.speed; MAXE = m.maxEmojis;
      if (Array.isArray(MAP.solid)) SOLID = new Set(MAP.solid);
      if (MAP.title) document.title = MAP.title;
      buildWorld();
      players.clear();
      for (const p of m.players) players.set(p.id, mkPlayer(p));
      me = mkPlayer(m.you); players.set(myId, me);
      $('join').classList.add('hidden'); $('chat').classList.remove('hidden'); $('hud').classList.remove('hidden');
      if (isTouch) $('pad').classList.remove('hidden');
      $('music').classList.remove('hidden'); document.body.classList.add('playing');
      if (window.EWMusic) EWMusic.start();
      banner(`* ${me.name} joined! *`);
      sysLog(`Welcome ${me.name}! Emojis only 🤐 ➜ 😀`);
      updateCount(); break;
    }
    case 'joined': players.set(m.p.id, mkPlayer(m.p)); banner(`* ${m.p.name} joined! *`); sysLog(`${m.p.name} joined`); updateCount(); break;
    case 'left': players.delete(m.id); banner(`* ${m.name} left *`, true); sysLog(`${m.name} left`); updateCount(); break;
    case 'state':
      for (const [id, x, y, dir, mv] of m.s) {
        const p = players.get(id); if (!p || id === myId) continue;
        p.tx = x; p.ty = y; p.dir = dir; p.moving = !!mv;
      }
      break;
    case 'correct': if (me) { me.x = me.rx = m.x; me.y = me.ry = m.y; } break;
    case 'chat': {
      const p = players.get(m.id);
      if (p) p.bubble = { text: m.text, until: performance.now() + 5000 };
      chatLog(m.name, m.text, m.id === myId); break;
    }
    case 'emote': { const p = players.get(m.id); if (p) { p.waveUntil = performance.now() + 2000; p.bubble = { text: '👋', until: performance.now() + 2000 }; } break; }
    case 'reject': toast('🚫 ' + m.reason); break;
    default: if (m.t && m.t.startsWith('m_')) missionMsg(m);
  }
}
function updateCount() { $('count').textContent = `👥 ${players.size}`; }
function banner(text, left) {
  const b = document.createElement('div'); b.className = 'banner' + (left ? ' left' : ''); b.textContent = text;
  const box = $('banners'); box.appendChild(b); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => b.remove(), 3500);
}
function addLog(el) { const log = $('log'); log.appendChild(el); while (log.children.length > 120) log.firstChild.remove(); log.scrollTop = log.scrollHeight; }
function chatLog(name, text, mine) { const d = document.createElement('div'); const n = document.createElement('span'); n.className = 'n'; n.textContent = name + (mine ? ' (you)' : '') + ': '; d.appendChild(n); d.appendChild(document.createTextNode(text)); addLog(d); }
function sysLog(t) { const d = document.createElement('div'); d.className = 'sys'; d.textContent = t; addLog(d); }
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800); }

// ---------- chat input / picker ----------
const msg = $('msg');
if (isTouch) { msg.readOnly = true; msg.setAttribute('inputmode', 'none'); }
function filterInput() {
  const gs = graphemes(msg.value).filter((g) => isEmoji(g));
  const v = gs.slice(0, MAXE).join('');
  if (v !== msg.value) { if (graphemes(msg.value).some((g) => !isEmoji(g) && !/^\s$/.test(g))) toast('Emojis only! 😉'); msg.value = v; }
}
msg.addEventListener('input', filterInput);
function addEmoji(e) {
  const gs = graphemes(msg.value);
  if (gs.length >= MAXE) { toast(`Max ${MAXE} emojis`); return; }
  msg.value += e;
}
let lastChat = 0;
function sendChat(text) {
  text = text != null ? text : msg.value;
  const gs = graphemes(text).filter((g) => isEmoji(g));
  if (!gs.length || !ws || ws.readyState !== 1) return false;
  if (performance.now() - lastChat < 1000) { toast('Slow down ⏳'); return false; }
  lastChat = performance.now();
  wsSend(JSON.stringify({ t: 'chat', text: gs.join('') }));
  pushRecent(gs);
  if (text === msg.value || msg.value === gs.join('')) msg.value = '';
  return true;
}
const recent = JSON.parse(localStorage.getItem('ew_recent') || '[]').filter((g) => typeof g === 'string' && isEmoji(g));
function pushRecent(gs) { for (const g of gs) { const i = recent.indexOf(g); if (i >= 0) recent.splice(i, 1); recent.unshift(g); } recent.length = Math.min(recent.length, 24); localStorage.setItem('ew_recent', JSON.stringify(recent)); renderQuick(); }
function renderQuick() {
  const q = $('qrow'); q.innerHTML = '';
  const list = recent.length ? recent.slice(0, 10) : ['👋', '😀', '👍', '❤️', '😂', '😮', '🤔', '🎉', '🙏', '👀'];
  for (const e of list) { const s = document.createElement('span'); s.textContent = e; s.onclick = () => { sendChat(e); }; q.appendChild(s); }
}
let curTab = 0;
const CATS = window.EMOJI_CATS.map(([icon, name, str]) => [icon, name, [...new Set(graphemes(str))].filter(isEmoji)]);
function renderTabs() {
  const t = $('tabs'); t.innerHTML = '';
  CATS.forEach(([icon, name], i) => { const b = document.createElement('b'); b.textContent = icon; b.title = name; if (i === curTab) b.className = 'on'; b.onclick = () => { curTab = i; renderTabs(); renderGrid(); }; t.appendChild(b); });
}
function renderGrid() {
  const gr = $('grid'); gr.innerHTML = ''; gr.scrollTop = 0;
  for (const e of CATS[curTab][2]) { const s = document.createElement('span'); s.textContent = e; s.onclick = () => addEmoji(e); gr.appendChild(s); }
}
renderTabs(); renderGrid(); renderQuick();
const picker = $('picker');
const pickerOpen = () => !picker.classList.contains('hidden');
function togglePicker(v) { picker.classList.toggle('hidden', v === undefined ? pickerOpen() : !v); }
$('pick').onclick = () => togglePicker();
$('send').onclick = () => sendChat();
$('back').onclick = () => { const gs = graphemes(msg.value); gs.pop(); msg.value = gs.join(''); };
msg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  else if (e.key === 'Escape') { msg.blur(); togglePicker(false); }
  e.stopPropagation();
});
function pressA() {
  if (!myId) return;
  if (menuOpen()) { menuActivate(); return; }
  if (pickerOpen()) { if (msg.value) sendChat(); togglePicker(false); }
  else if (nearBoard()) openMission('board');
  else togglePicker(true);
}
function pressB() { if (!myId) return; if (menuOpen()) { closeMenu(); return; } if (pickerOpen()) { togglePicker(false); return; } wave(); }
let lastWave = 0;
function wave() {
  if (performance.now() - lastWave < 1500 || !ws || ws.readyState !== 1) return;
  lastWave = performance.now(); wsSend(JSON.stringify({ t: 'emote', k: 'wave' }));
}

// ---------- keyboard ----------
addEventListener('keydown', (e) => {
  if (!myId || e.target === $('name')) return;
  const k = e.key.toLowerCase();
  if (menuOpen()) {
    e.preventDefault();
    if (k === 'z' || k === 'enter' || k === ' ') pressA();
    else if (k === 'x' || k === 'escape') closeMenu();
    else if (k === 'arrowup' || k === 'w' || k === 'arrowleft' || k === 'a') menuMove(-1);
    else if (k === 'arrowdown' || k === 's' || k === 'arrowright' || k === 'd') menuMove(1);
    return;
  }
  if (k === 'z') { pressA(); return; }
  if (k === 'x') { pressB(); return; }
  if (k === 'enter') { msg.focus(); togglePicker(true); e.preventDefault(); return; }
  if (k === 'escape') { togglePicker(false); return; }
  keys.add(k); if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// ---------- Game Boy controller (pointer events, multitouch) ----------
const dpad = $('dpad'), dpadPtr = new Set();
function dpadUpdate(e) {
  const r = dpad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
  if (d < 12) { pad.x = pad.y = 0; } else {
    const a = Math.atan2(dy, dx), s = Math.round(a / (Math.PI / 4)); // 8 directions
    const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    [pad.x, pad.y] = dirs[(s + 8) % 8];
  }
  dpad.querySelector('.u').classList.toggle('on', pad.y < 0); dpad.querySelector('.d').classList.toggle('on', pad.y > 0);
  dpad.querySelector('.l').classList.toggle('on', pad.x < 0); dpad.querySelector('.r').classList.toggle('on', pad.x > 0);
}
dpad.addEventListener('pointerdown', (e) => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); dpadPtr.add(e.pointerId); dpadUpdate(e); });
dpad.addEventListener('pointermove', (e) => { if (dpadPtr.has(e.pointerId)) { e.preventDefault(); dpadUpdate(e); } });
const dpadEnd = (e) => { if (!dpadPtr.delete(e.pointerId)) return; if (!dpadPtr.size) { pad.x = pad.y = 0; dpad.querySelectorAll('i').forEach((i) => i.classList.remove('on')); } };
dpad.addEventListener('pointerup', dpadEnd); dpad.addEventListener('pointercancel', dpadEnd); dpad.addEventListener('lostpointercapture', dpadEnd);
for (const [id, fn] of [['btnA', pressA], ['btnB', pressB]]) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); fn(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('on'));
}
// block page zoom / scroll gestures
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (!e.target.closest('#grid,#log,#tabs,#quick,#join,#mpanel,#mstrip')) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTouchEnd < 300 && !e.target.closest('input,button,#grid,#qrow,#tabs,#music')) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
document.addEventListener('contextmenu', (e) => { if (e.target.closest('#pad,canvas')) e.preventDefault(); });

// ---------- main loop ----------
const cv = $('game'), ctx = cv.getContext('2d');
let dpr = 1, zoom = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.floor(innerWidth * dpr); cv.height = Math.floor(innerHeight * dpr);
  zoom = Math.max(0.75, Math.min(2, Math.min(innerWidth / 820, innerHeight / 560)));
  if (isTouch) zoom = Math.max(0.8, Math.min(1.4, Math.min(innerWidth, innerHeight) / 430));
}
addEventListener('resize', resize); resize();
let last = performance.now();
function update(dt, now) {
  if (!me) return;
  let ix = 0, iy = 0;
  if (menuOpen()) { // D-pad navigates the mission panel instead of walking
    const ny = pad.y || pad.x;
    if (ny && (ny !== padNav.v || now - padNav.t > 350)) { menuMove(ny > 0 ? 1 : -1); padNav.t = now; }
    padNav.v = ny;
    me.moving = false; if (lastMoving && ws && ws.readyState === 1) { wsSend(JSON.stringify({ t: 'move', x: me.x, y: me.y, dir: me.dir, moving: false })); lastMoving = false; }
    return;
  }
  if (document.activeElement !== msg) {
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('w') || keys.has('arrowup')) iy -= 1; if (keys.has('s') || keys.has('arrowdown')) iy += 1;
  }
  ix += pad.x; iy += pad.y; ix = Math.max(-1, Math.min(1, ix)); iy = Math.max(-1, Math.min(1, iy));
  const moving = !!(ix || iy);
  if (moving) {
    const l = Math.hypot(ix, iy), sp = SPEED * dt;
    const nx = me.x + (ix / l) * sp, ny = me.y + (iy / l) * sp;
    if (!blocked(nx, me.y)) me.x = nx;
    if (!blocked(me.x, ny)) me.y = ny;
    me.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 1 : 2) : (iy < 0 ? 3 : 0);
    me.anim += dt;
  }
  me.moving = moving; me.rx = me.x; me.ry = me.y;
  if (ws && ws.readyState === 1 && now - lastSent > 66 && (me.x !== lastSentX || me.y !== lastSentY || moving !== lastMoving)) {
    wsSend(JSON.stringify({ t: 'move', x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, dir: me.dir, moving }));
    lastSent = now; lastSentX = me.x; lastSentY = me.y; lastMoving = moving;
  }
  for (const p of players.values()) {
    if (p === me) continue;
    const k = Math.min(1, dt * 10);
    if (Math.hypot(p.tx - p.rx, p.ty - p.ry) > 300) { p.rx = p.tx; p.ry = p.ty; }
    p.rx += (p.tx - p.rx) * k; p.ry += (p.ty - p.ry) * k;
    if (p.moving) p.anim += dt;
  }
}
function roundRect(g, x, y, w, h, fill, stroke) {
  g.fillStyle = stroke; g.fillRect(x + 2, y - 2, w - 4, h + 4); g.fillRect(x - 2, y + 2, w + 4, h - 4); g.fillRect(x, y, w, h);
  g.fillStyle = fill; g.fillRect(x + 2, y, w - 4, h); g.fillRect(x, y + 2, w, h - 4);
}
function render(now) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#3b8a3a'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!MAP || !me) { if (!myId) drawTitleBg(now); return; }
  const s = dpr * zoom, vw = cv.width / s, vh = cv.height / s;
  const mw = MAP.w * TILE, mh = MAP.h * TILE;
  let camX = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, me.rx - vw / 2));
  let camY = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, me.ry - 40 - vh / 2));
  camX = Math.round(camX * s) / s; camY = Math.round(camY * s) / s;
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(worldCanvas, 0, 0);
  const list = [...players.values()].sort((a, b) => a.ry - b.ry);
  const spr = sprites.slice().sort((a, b) => a.base - b.base); let si = 0;
  const drawSpr = (upto) => { while (si < spr.length && spr[si].base <= upto) { const o = spr[si++]; ctx.drawImage(o.c, o.x, o.y); } };
  for (const p of list) {
    drawSpr(p.ry);
    if (p.rx < camX - 60 || p.rx > camX + vw + 60 || p.ry < camY - 80 || p.ry > camY + vh + 80) continue;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(p.rx - 12, p.ry - 3, 24, 6); ctx.fillRect(p.rx - 9, p.ry - 5, 18, 10);
    const frame = p.moving ? (Math.floor(p.anim * 8) % 2) + 1 : 0;
    drawAvatar(ctx, p.rx, p.ry, p.look, p.dir || 0, frame, now < p.waveUntil, now);
    // name tag
    ctx.font = 'bold 11px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(p.name).width) + 12;
    roundRect(ctx, Math.round(p.rx - tw / 2), Math.round(p.ry + 6), tw, 16, p === me ? '#2f5fd0' : '#1d2340', '#ffffff');
    ctx.fillStyle = '#fff'; ctx.fillText(p.name, Math.round(p.rx), Math.round(p.ry + 14.5));
  }
  drawSpr(Infinity);
  // bubbles on top
  for (const p of list) {
    if (!p.bubble) continue;
    if (now > p.bubble.until) { p.bubble = null; continue; }
    const gs = graphemes(p.bubble.text), rows = [];
    for (let i = 0; i < gs.length; i += 4) rows.push(gs.slice(i, i + 4).join(''));
    ctx.font = '18px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.max(34, ...rows.map((r) => ctx.measureText(r).width)) + 14, h = rows.length * 22 + 8;
    const bx = Math.round(p.rx - w / 2), by = Math.round(p.ry - 66 - h);
    roundRect(ctx, bx, by, w, h, '#ffffff', '#1d2340');
    ctx.fillStyle = '#1d2340'; ctx.fillRect(p.rx - 6, by + h + 2, 12, 2); ctx.fillRect(p.rx - 4, by + h + 4, 8, 2); ctx.fillRect(p.rx - 2, by + h + 6, 4, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(p.rx - 4, by + h, 8, 2); ctx.fillRect(p.rx - 2, by + h + 2, 4, 2);
    ctx.fillStyle = '#000'; rows.forEach((r, i) => ctx.fillText(r, p.rx, by + 4 + 11 + i * 22));
  }
  // "A: Mission" prompt above the board when standing next to it
  const nb = nearBoard();
  $('btnA').querySelector('small').textContent = nb && !pickerOpen() ? '📋' : '😀';
  if (nb && !menuOpen()) {
    const bx = (nb.x + (nb.w || 1) / 2) * TILE, by = nb.y * TILE - 64 - Math.floor(now / 300) % 2 * 2;
    ctx.font = 'bold 13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = 'A: Mission', tw = Math.ceil(ctx.measureText(label).width) + 16;
    roundRect(ctx, Math.round(bx - tw / 2), by - 10, tw, 20, '#ffcf3f', '#1d2340');
    ctx.fillStyle = '#1d2340'; ctx.fillText(label, bx, by + 0.5);
  }
}
function drawTitleBg(now) {
  const t = 32 * dpr;
  for (let y = 0; y < cv.height; y += t) for (let x = 0; x < cv.width; x += t) {
    ctx.fillStyle = ((x + y) / t) % 2 ? '#f2c9a0' : '#ecc093'; ctx.fillRect(x, y, t, t);
  }
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt, now); render(now);
  requestAnimationFrame(loop);
}
// ---------- Decode Missions (client) ----------
const MS = { round: null, endsAt: 0, top: [], last: null, myGuess: null, myCorrect: null, view: 'board', graceShown: 0 };
const padNav = { v: 0, t: 0 };
const mpanel = $('mpanel'), mbody = $('mp-body');
const menuOpen = () => !mpanel.classList.contains('hidden');
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function mbtn(text, fn, cls) { const b = el('button', 'mbtn' + (cls ? ' ' + cls : ''), text); b.onclick = (e) => { e.preventDefault(); fn(); }; return b; }
function menuItems() { return [...mbody.querySelectorAll('.mbtn:not(:disabled)')]; }
let menuIdx = 0;
function menuMove(d) { const it = menuItems(); if (!it.length) return; menuIdx = (menuIdx + d + it.length) % it.length; menuSel(); }
function menuSel() { const it = menuItems(); it.forEach((b, i) => b.classList.toggle('sel', i === menuIdx)); if (it[menuIdx]) it[menuIdx].scrollIntoView({ block: 'nearest' }); }
function menuActivate() { const it = menuItems(); if (it[menuIdx]) it[menuIdx].click(); }
function closeMenu() { mpanel.classList.add('hidden'); }
function openMission(view) {
  togglePicker(false); msg.blur(); keys.clear();
  MS.view = view || 'board'; renderMission(); mpanel.classList.remove('hidden');
  if (view === 'board' || view === 'leader') wsSend(JSON.stringify({ t: 'm_board' }));
}
const amSender = () => MS.round && MS.round.senderId === myId;
const secsLeft = () => Math.max(0, Math.ceil((MS.endsAt - performance.now()) / 1000));
function renderMission(keepIdx) {
  const r = MS.round, v = MS.view; mbody.innerHTML = '';
  const add = (e) => mbody.appendChild(e);
  if (v === 'guess' && r && !amSender()) {
    add(el('h3', '', '🤔 What is ' + r.senderName + ' saying?'));
    const cl = el('div', 'mclue', r.clues.length ? r.clues.join('  ') : '⏳ waiting for emoji clues...'); add(cl);
    if (MS.myGuess != null) add(el('p', '', MS.myCorrect ? '✅ Correct! Wait for the results...' : '❌ Not quite! Wait for the reveal...'));
    r.options.forEach((o, i) => {
      const b = mbtn(String.fromCharCode(65 + i) + ') ' + o, () => guess(i), MS.myGuess === i ? (MS.myCorrect ? 'ok' : 'bad') : '');
      if (MS.myGuess != null) b.disabled = true; add(b);
    });
    add(el('p', '', 'One guess only! Choose carefully. ⏱ ' + secsLeft() + 's'));
    add(mbtn('✖ Close (B)', closeMenu));
  } else if (v === 'result' && MS.last) {
    const L = MS.last;
    add(el('h3', '', L.winner ? `* ${L.winner} decoded it! *` : L.reason === 'stopped' ? '* Mission stopped *' : L.reason === 'sender_left' ? '* Sender left *' : "* Nobody decoded it! *"));
    add(el('p', '', 'The secret message was:')); add(el('div', 'msecret', '"' + L.phrase + '"'));
    add(el('p', '', L.senderName + "'s emoji clues:")); add(el('div', 'mclue', L.clues.length ? L.clues.join('  ') : '(no clues sent)'));
    const max = Math.max(1, ...L.dist.map((d) => d.count));
    for (const d of L.dist) { const row = el('div', 'dist' + (d.correct ? ' c' : '')); const bar = el('b'); bar.style.width = (d.count / max * 80) + 'px'; row.appendChild(bar); row.appendChild(document.createTextNode(`${d.count} ${d.correct ? '✅' : ''} ${d.text}`)); add(row); }
    if (L.points.length) add(el('p', '', '⭐ ' + L.points.map((p) => `${p.name} +${p.pts}`).join(', ')));
    add(el('p', '', '💬 Discuss: which emojis helped? Which were confusing?'));
    add(mbtn('🏆 Leaderboard', () => { MS.view = 'leader'; renderMission(); }));
    add(mbtn('✖ Close (B)', closeMenu));
  } else if (v === 'leader') {
    add(el('h3', '', '🏆 Top Decoders'));
    const t = el('table', 'lb');
    if (!MS.top.length) add(el('p', '', 'No scores yet - play a mission!'));
    MS.top.forEach((s, i) => { const tr = el('tr'); tr.appendChild(el('td', '', ['🥇', '🥈', '🥉', '4.', '5.'][i] + ' ' + s.name)); tr.appendChild(el('td', '', s.pts + ' pts')); t.appendChild(tr); });
    add(t);
    add(el('p', '', 'Decode first: +3 · also correct: +1 · Sender: +2 if anyone decodes'));
    if (MS.last) add(mbtn('📜 Last result', () => { MS.view = 'result'; renderMission(); }));
    add(mbtn('✖ Close (B)', closeMenu));
  } else {
    MS.view = 'board';
    add(el('h3', '', '📋 MISSION BOARD'));
    if (!r) {
      add(el('p', '', '🎤 The Sender gets a secret message and must explain it using ONLY emojis. Everyone else decodes it!'));
      add(mbtn('🎤 Be the Sender', () => { wsSend(JSON.stringify({ t: 'm_sender' })); closeMenu(); }));
    } else if (amSender()) {
      add(el('p', '', '🤫 You are the Sender! Your secret message:')); add(el('div', 'msecret', '"' + r.secret + '"'));
      add(el('p', '', 'Send emoji clues with A (the emoji picker). Do not show anyone your screen! ⏱ ' + secsLeft() + 's'));
      add(mbtn('😀 Send emoji clues', () => { closeMenu(); togglePicker(true); }));
    } else {
      add(el('p', '', `🕵️ ${r.senderName} is sending a secret message. ⏱ ${secsLeft()}s`));
      add(mbtn(MS.myGuess != null ? '✅ You guessed - view' : '🤔 Guess the message', () => { MS.view = 'guess'; menuIdx = 0; renderMission(); menuSel(); }));
    }
    add(mbtn('🏆 Leaderboard', () => { MS.view = 'leader'; menuIdx = 0; renderMission(); menuSel(); }));
    if (MS.last) add(mbtn('📜 Last result', () => { MS.view = 'result'; menuIdx = 0; renderMission(); menuSel(); }));
    add(mbtn('✖ Close (B)', closeMenu));
  }
  if (!keepIdx) menuIdx = 0;
  menuIdx = Math.min(menuIdx, Math.max(0, menuItems().length - 1)); menuSel();
}
function guess(i) { if (MS.myGuess != null) return; wsSend(JSON.stringify({ t: 'm_guess', choice: i })); }
function renderStrip() {
  const r = MS.round, s = $('mstrip');
  document.body.classList.toggle('mission', !!r);
  s.classList.toggle('hidden', !r); if (!r) return;
  $('ms-title').textContent = amSender() ? '🤫 YOU are the Sender!' : `🕵️ MISSION · ${r.senderName} is sending`;
  $('ms-secret').classList.toggle('hidden', !amSender()); if (amSender()) $('ms-secret').textContent = '"' + r.secret + '"';
  const c = $('ms-clues'); c.innerHTML = ''; for (const t of r.clues) c.appendChild(el('i', '', t));
  if (!r.clues.length) c.textContent = '⏳';
  c.parentElement.scrollLeft = 1e6;
  $('ms-prog').textContent = `🗳 ${r.guessed || 0}/${r.total || 0}`;
  const g = $('ms-guess'); g.classList.toggle('hidden', amSender() || MS.myGuess != null);
}
$('ms-guess').onclick = () => openMission('guess');
$('trophy').onclick = () => openMission('leader');
setInterval(() => {
  if (!MS.round) return;
  const t = $('ms-time'), left = secsLeft(); t.textContent = left + 's'; t.classList.toggle('low', left <= 10);
}, 250);
function missionMsg(m) {
  switch (m.t) {
    case 'm_round': {
      const was = MS.round && MS.round.id;
      MS.round = m.r;
      if (!m.r) { renderStrip(); break; }
      MS.endsAt = performance.now() + m.r.left;
      if (was !== m.r.id) {
        MS.myGuess = m.r.yourGuess; MS.myCorrect = null;
        if (m.r.senderId === myId) { banner('* You are the Sender! *'); sysLog('🤫 Your secret: "' + m.r.secret + '" - explain it with emojis only!'); openMission('board'); }
        else { banner(`* ${m.r.senderName} started a mission! *`); sysLog(`🕵️ Mission: decode ${m.r.senderName}'s emojis! Tap 🤔 GUESS`); if (menuOpen()) renderMission(); }
      }
      renderStrip(); break;
    }
    case 'm_clue': if (MS.round) { MS.round.clues.push(m.text); renderStrip(); if (menuOpen() && MS.view === 'guess') renderMission(true); } break;
    case 'm_progress':
      if (MS.round) {
        MS.round.guessed = m.guessed; MS.round.total = m.total; MS.endsAt = performance.now() + m.left;
        if (m.grace && MS.graceShown !== MS.round.id) { MS.graceShown = MS.round.id; banner('* Someone decoded it! Last chance! *'); }
        renderStrip();
      }
      break;
    case 'm_guessed': MS.myGuess = m.choice; MS.myCorrect = m.correct; toast(m.correct ? '✅ Correct!' : '❌ Not quite...'); renderStrip(); if (menuOpen()) renderMission(); break;
    case 'm_end': {
      const L = m.res; MS.round = null; MS.last = L; MS.top = L.leaderboard || MS.top; MS.myGuess = null; renderStrip();
      banner(L.winner ? `* ${L.winner} decoded it! *` : L.reason === 'stopped' ? '* Mission stopped *' : '* Mission over! *');
      sysLog(`📜 The message was "${L.phrase}" (clues: ${L.clues.join(' ') || 'none'})`);
      openMission('result'); break;
    }
    case 'm_board': MS.top = m.top || []; if (m.last !== undefined) MS.last = m.last; if (menuOpen() && (MS.view === 'leader' || MS.view === 'board')) renderMission(true); break;
  }
}
mpanel.addEventListener('pointerdown', (e) => e.stopPropagation());
// ---------- music credit + mute (top-left): never reaches the game controls ----------
const musicBox = $('music');
for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup']) musicBox.addEventListener(ev, (e) => e.stopPropagation());
$('mute').addEventListener('click', (e) => { e.preventDefault(); if (window.EWMusic) EWMusic.toggle(); e.currentTarget.blur(); });
$('music-link').addEventListener('click', (e) => { e.currentTarget.blur(); keys.clear(); pad.x = pad.y = 0; });
if (window.EWMusic) EWMusic.render();

buildSwatches(); drawPreview();
requestAnimationFrame(loop);
window.__ew = { players, get me() { return me; }, sendChat, pressA, pressB, MS, openMission };
})();
