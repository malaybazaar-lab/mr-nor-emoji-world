// Mr Nor DnT - School of Design and Technology - client (public chat world + D&T stations)
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
const DT = window.DT;
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
  // corner rooms: floors (walls are tile 8, drawn below with the room colour)
  for (const r of MAP.rooms || []) drawRoomFloor(g, r);
  // buildings
  for (const b of MAP.buildings) drawBuilding(g, b);
  // stations / boards: pre-rendered sprites, drawn depth-sorted with players in render()
  sprites = [];
  for (const o of MAP.objects || []) {
    const up = SPR_UP[o.type] || 40, ow = (o.w || 2) * TILE, oh = (o.h || 1) * TILE;
    const sc = document.createElement('canvas'); sc.width = ow + 16; sc.height = oh + up + 4;
    const sg = sc.getContext('2d'); sg.imageSmoothingEnabled = false;
    if (o.type === 'mission_board') drawBoard(sg, { ...o, x: 0, y: 0 }, 8, up);
    else drawStation(sg, o, 8, up, ow, oh);
    sprites.push({ c: sc, x: o.x * TILE - 8, y: o.y * TILE - up, base: (o.y + (o.h || 1)) * TILE - 2 });
  }
  // objects sorted top->bottom
  for (let ty = 0; ty < MAP.h; ty++) for (let tx = 0; tx < MAP.w; tx++) {
    const v = tileAt(tx, ty), X = tx * TILE, Y = ty * TILE;
    if (v === 4) drawBush(g, X, Y, tx, ty);
    else if (v === 3) drawTree(g, X, Y, tx, ty);
    else if (v === 5) drawLamp(g, X, Y);
    else if (v === 8) drawWall(g, X, Y, tx, ty);
  }
  for (const r of MAP.rooms || []) drawRoomSign(g, r);
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
      myId = m.id; MAP = m.map; TILE = MAP.tile; SPEED = m.speed; MAXE = m.maxEmojis; if (m.maxLen) msg.maxLength = m.maxLen;
      if (Array.isArray(MAP.solid)) SOLID = new Set(MAP.solid);
      if (MAP.title) document.title = MAP.title;
      if (MAP.npc) npc.x = npc.hx = (MAP.npc.x + 0.5) * TILE, npc.y = (MAP.npc.y + 0.5) * TILE;
      buildWorld();
      players.clear();
      for (const p of m.players) players.set(p.id, mkPlayer(p));
      me = mkPlayer(m.you); players.set(myId, me);
      $('join').classList.add('hidden'); $('chat').classList.remove('hidden'); $('hud').classList.remove('hidden');
      if (isTouch) $('pad').classList.remove('hidden');
      $('music').classList.remove('hidden'); document.body.classList.add('playing');
      if (window.EWMusic) EWMusic.start();
      banner(`* ${me.name} joined! *`);
      sysLog(`Welcome ${me.name}! This is a public chat - be kind and stay safe. Tap 💬 to chat.`);
      if (m.chatPaused) sysLog('Chat is paused by the teacher.');
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
      chatLog(m.name, m.text, m.id === myId, m.mid); break;
    }
    case 'emote': { const p = players.get(m.id); if (p) { p.waveUntil = performance.now() + 2000; p.bubble = { text: '👋', until: performance.now() + 2000 }; } break; }
    case 'reject': toast('🚫 ' + m.reason); break;
    case 'sys': sysLog('📢 ' + m.text); if (m.paused !== undefined) banner(m.paused ? '* Chat paused *' : '* Chat open *'); break;
    case 'kicked': wasFull = true; myId = null; me = null; MAP = null; alert(m.reason || 'Removed by the teacher.'); location.reload(); break;
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
function chatLog(name, text, mine, mid) {
  const d = document.createElement('div'); const n = document.createElement('span'); n.className = 'n' + (mine ? ' me' : ''); n.textContent = name + (mine ? ' (you)' : '') + ': ';
  d.appendChild(n); d.appendChild(document.createTextNode(text));
  if (!mine && mid) {
    const r = document.createElement('button'); r.className = 'rep'; r.type = 'button'; r.textContent = '⚑'; r.title = 'Report this message to the teacher'; r.setAttribute('aria-label', 'Report message');
    r.onclick = (e) => { e.stopPropagation(); if (confirm('Report this message to the teacher?\n\n' + name + ': ' + text)) { wsSend(JSON.stringify({ t: 'report', mid })); r.disabled = true; r.textContent = '✔'; } };
    d.appendChild(r);
  }
  addLog(d);
}
function sysLog(t) { const d = document.createElement('div'); d.className = 'sys'; d.textContent = t; addLog(d); }
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }

// ---------- chat input (free text, public room) ----------
const msg = $('msg');
const chatOpen = () => document.body.classList.contains('typing');
function openChat() {
  if (!myId) return;
  closeMenu(); keys.clear(); pad.x = pad.y = 0;
  document.body.classList.add('typing'); msg.focus({ preventScroll: true });
}
function closeChat() { document.body.classList.remove('typing'); msg.blur(); }
msg.addEventListener('focus', () => document.body.classList.add('typing'));
msg.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== msg) document.body.classList.remove('typing'); }, 150));
msg.addEventListener('input', () => {
  const v = msg.value.replace(/[\u0000-\u001F\u007F]/g, '');
  if (v !== msg.value) msg.value = v;
  $('cnt').textContent = msg.value.length > 100 ? (msg.maxLength - msg.value.length) : '';
  if (MS.round && amSender() && msg.value && graphemes(msg.value).some((g) => !isEmoji(g) && !/^\s$/.test(g))) $('cnt').textContent = '🤫 emojis only!';
});
let lastChat = 0;
function sendChat(text) {
  text = (text != null ? text : msg.value).replace(/\s+/g, ' ').trim();
  if (!text || !ws || ws.readyState !== 1) return false;
  if (performance.now() - lastChat < 1500) { toast('Slow down a little ⏳'); return false; }
  if (/(https?:\/\/|www\.)/i.test(text)) { toast('🚫 Links are not allowed in chat'); return false; }
  lastChat = performance.now();
  wsSend(JSON.stringify({ t: 'chat', text }));
  if (text === msg.value.replace(/\s+/g, ' ').trim()) msg.value = '';
  $('cnt').textContent = '';
  return true;
}
$('chatbtn').addEventListener('click', (e) => { e.preventDefault(); if (chatOpen()) closeChat(); else openChat(); });
$('send').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open on phones
$('send').onclick = () => { sendChat(); msg.focus({ preventScroll: true }); };
$('chatx').addEventListener('pointerdown', (e) => e.preventDefault());
$('chatx').onclick = () => closeChat();
msg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  else if (e.key === 'Escape') closeChat();
  e.stopPropagation();
});
function pressA() {
  if (!myId) return;
  if (overlayOpen()) return;
  if (menuOpen()) { if (ST.hold) { holdA(true); return; } menuActivate(); return; }
  const n = nearThing();
  if (n) interact(n); else openChat();
}
function pressB() { if (!myId) return; if (tvOpen()) { closeTV(); return; } if (menuOpen()) { closeMenu(); return; } if (chatOpen()) { closeChat(); return; } wave(); }
let lastWave = 0;
function wave() {
  if (performance.now() - lastWave < 1500 || !ws || ws.readyState !== 1) return;
  lastWave = performance.now(); wsSend(JSON.stringify({ t: 'emote', k: 'wave' }));
}

// ---------- keyboard ----------
addEventListener('keydown', (e) => {
  if (!myId || e.target === $('name')) return;
  const k = e.key.toLowerCase();
  if (tvOpen()) { if (k === 'escape' || k === 'x') closeTV(); return; }
  if (menuOpen()) {
    e.preventDefault();
    if (e.repeat && (k === 'z' || k === ' ')) return;
    if (k === 'z' || k === 'enter' || k === ' ') pressA();
    else if (k === 'x' || k === 'escape') closeMenu();
    else if (k === 'arrowup' || k === 'w' || k === 'arrowleft' || k === 'a') menuMove(-1);
    else if (k === 'arrowdown' || k === 's' || k === 'arrowright' || k === 'd') menuMove(1);
    return;
  }
  if (k === 'z') { pressA(); return; }
  if (k === 'x') { pressB(); return; }
  if (k === 'enter' || k === 't') { openChat(); e.preventDefault(); return; }
  if (k === 'escape') { closeChat(); return; }
  keys.add(k); if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === 'z' || k === ' ' || k === 'enter') holdA(false); });
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
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { b.classList.remove('on'); if (id === 'btnA') holdA(false); });
}
// block page zoom / scroll gestures
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (!e.target.closest('#log,#join,#mpanel,#mstrip,#tvov')) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTouchEnd < 300 && !e.target.closest('input,button,a,#log,#music,#mpanel,#tvov')) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
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
  if (menuOpen() || tvOpen()) { // D-pad navigates the panel instead of walking
    const ny = pad.y || pad.x;
    if (ny && (ny !== padNav.v || now - padNav.t > 350)) { menuMove(ny > 0 ? 1 : -1); padNav.t = now; }
    padNav.v = ny;
    me.moving = false; if (lastMoving && ws && ws.readyState === 1) { wsSend(JSON.stringify({ t: 'move', x: me.x, y: me.y, dir: me.dir, moving: false })); lastMoving = false; }
    return;
  }
  if (document.activeElement !== msg && !chatOpen()) {
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
  const list = [...players.values(), ...allNpcs()];
  list.sort((a, b) => a.ry - b.ry);
  const spr = sprites.slice().sort((a, b) => a.base - b.base); let si = 0;
  const drawSpr = (upto) => { while (si < spr.length && spr[si].base <= upto) { const o = spr[si++]; ctx.drawImage(o.c, o.x, o.y); } };
  for (const p of list) {
    drawSpr(p.ry);
    if (p.rx < camX - 60 || p.rx > camX + vw + 60 || p.ry < camY - 80 || p.ry > camY + vh + 80) continue;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(p.rx - 12, p.ry - 3, 24, 6); ctx.fillRect(p.rx - 9, p.ry - 5, 18, 10);
    const frame = p.moving ? (Math.floor(p.anim * 8) % 2) + 1 : 0;
    const isN = p.id < 0;
    if (isN) drawTeacher(ctx, p, frame, now);
    else drawAvatar(ctx, p.rx, p.ry, p.look, p.dir || 0, frame, now < p.waveUntil, now);
    // name tag
    ctx.font = 'bold 12px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(p.name).width) + 12;
    roundRect(ctx, Math.round(p.rx - tw / 2), Math.round(p.ry + 6), tw, 17, isN ? '#ffcf3f' : p === me ? '#2f5fd0' : '#1d2340', isN ? '#1d2340' : '#ffffff');
    ctx.fillStyle = isN ? '#1d2340' : '#fff'; ctx.fillText(p.name, Math.round(p.rx), Math.round(p.ry + 15));
  }
  drawSpr(Infinity);
  // bubbles on top
  for (const p of list) {
    if (!p.bubble || p.id < 0) continue;
    if (now > p.bubble.until) { p.bubble = null; continue; }
    ctx.font = 'bold 13px system-ui,-apple-system,"Segoe UI",Roboto,"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rows = wrapText(ctx, p.bubble.text, 170, 4);
    const w = Math.max(34, ...rows.map((r) => ctx.measureText(r).width)) + 16, h = rows.length * 17 + 10;
    const bx = Math.round(p.rx - w / 2), by = Math.round(p.ry - 64 - h);
    roundRect(ctx, bx, by, w, h, '#ffffff', '#1d2340');
    ctx.fillStyle = '#1d2340'; ctx.fillRect(p.rx - 6, by + h + 2, 12, 2); ctx.fillRect(p.rx - 4, by + h + 4, 8, 2); ctx.fillRect(p.rx - 2, by + h + 6, 4, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(p.rx - 4, by + h, 8, 2); ctx.fillRect(p.rx - 2, by + h + 2, 4, 2);
    ctx.fillStyle = '#1d2340'; rows.forEach((r, i) => ctx.fillText(r, p.rx, by + 5 + 9 + i * 17));
  }
  // "A: ..." prompt above the nearest station / NPC
  const nb = nearThing();
  $('btnA').querySelector('small').textContent = nb ? '👆' : '💬';
  if (nb && !menuOpen()) {
    const isN = nb.id < 0;
    const bx = isN ? nb.rx : (nb.x + (nb.w || 1) / 2) * TILE;
    const by = (isN ? nb.ry - 92 : nb.y * TILE - (SPR_UP[nb.type] || 40) - 16) - Math.floor(now / 300) % 2 * 2;
    ctx.font = 'bold 14px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = promptFor(nb), tw = Math.ceil(ctx.measureText(label).width) + 16;
    roundRect(ctx, Math.round(bx - tw / 2), by - 11, tw, 22, '#ffcf3f', '#1d2340');
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
  update(dt, now); npcTick(dt, now); render(now);
  requestAnimationFrame(loop);
}
// ---------- Decode Missions (client) ----------
const ST = { hold: false, holding: false, timer: 0, anim: null, npc: null, view: '' };
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
function closeMenu() { mpanel.classList.add('hidden'); mpanel.classList.remove('wide'); ST.hold = false; ST.holding = false; if (ST.timer) clearInterval(ST.timer); ST.timer = 0; ST.anim = null; ST.npc = null; }
function openMission(view) {
  closeChat(); keys.clear(); P('mission'); openPanel();
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
      add(el('p', '', 'Type your clues in the chat - during your round you may use EMOJIS ONLY (use the emoji keyboard 😀). Do not show anyone your screen! ⏱ ' + secsLeft() + 's'));
      add(mbtn('💬 Send emoji clues', () => { closeMenu(); openChat(); }));
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
        if (m.r.senderId === myId) { banner('* You are the Sender! *'); sysLog('🤫 Your secret: "' + m.r.secret + '" - explain it with emojis only (this round)!'); openMission('board'); }
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
// ---------- music mute (top-left): never reaches the game controls ----------
const musicBox = $('music');
for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup']) musicBox.addEventListener(ev, (e) => e.stopPropagation());
$('mute').addEventListener('click', (e) => { e.preventDefault(); if (window.EWMusic) EWMusic.toggle(); e.currentTarget.blur(); });
if (window.EWMusic) EWMusic.render();
// ===================== D&T stations, NPCs, TV, panels =====================
const SPR_UP = { mission_board: 50, notice: 60, machine: 58, material: 26, joint: 26, jig: 26, quiz: 44, computers: 40, tv: 132, poster: 54, bench: 14 };
const SITE_URL = 'https://sites.google.com/moe.edu.sg/mrnordnt/home';
const LINKTREE_URL = 'https://linktr.ee/mrnor?utm_source=linktree_profile_share&ltsid=2943eb65-ab0a-402c-a17a-dd01642e3848';
const YT_ID = '3z_QWqI6vpA';
const OL = '#1d2340';
function wrapText(g, text, maxW, maxRows) {
  const words = String(text).split(' '), rows = []; let cur = '';
  for (let w of words) {
    while (g.measureText(w).width > maxW) { // very long word: hard split
      let i = w.length; while (i > 1 && g.measureText(w.slice(0, i)).width > maxW) i--;
      if (cur) { rows.push(cur); cur = ''; } rows.push(w.slice(0, i)); w = w.slice(i);
    }
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > maxW && cur) { rows.push(cur); cur = w; } else cur = t;
  }
  if (cur) rows.push(cur);
  if (rows.length > maxRows) { rows.length = maxRows; rows[maxRows - 1] = rows[maxRows - 1].replace(/.{0,2}$/, '…'); }
  return rows;
}
function box(g, x, y, w, h, fill) { g.fillStyle = OL; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = fill; g.fillRect(x, y, w, h); }
// ---------- rooms ----------
function roomAt(tx, ty) { for (const r of MAP.rooms || []) if (tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h) return r; return null; }
function drawRoomFloor(g, r) {
  for (let ty = r.y + 1; ty < r.y + r.h - 1; ty++) for (let tx = r.x + 1; tx < r.x + r.w - 1; tx++) {
    const X = tx * TILE, Y = ty * TILE;
    g.fillStyle = r.floor; g.fillRect(X, Y, TILE, TILE);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(X, Y, TILE, 1); g.fillRect(X, Y, 1, TILE);
    if (r.id === 'materials' || r.id === 'forming') { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(X, Y + 16, TILE, 1); }
    if (hash(tx, ty) > 0.93) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(X + 6, Y + 8, 6, 2); }
  }
  // safety lines around workshop machines
  if (r.id === 'workshop') for (const o of MAP.objects) if (o.type === 'machine' && roomAt(o.x, o.y) === r) {
    const X = (o.x - 1) * TILE + 8, Y = (o.y - 1) * TILE + 8, w = (o.w + 2) * TILE - 16, h = (o.h + 2) * TILE - 16;
    for (let i = 0; i < w; i += 16) { g.fillStyle = (i / 16) % 2 ? OL : '#ffcf3f'; g.fillRect(X + i, Y, 8, 4); g.fillRect(X + i, Y + h - 4, 8, 4); }
    for (let i = 0; i < h; i += 16) { g.fillStyle = (i / 16) % 2 ? OL : '#ffcf3f'; g.fillRect(X, Y + i, 4, 8); g.fillRect(X + w - 4, Y + i, 4, 8); }
  }
}
function drawWall(g, X, Y, tx, ty) {
  const r = roomAt(tx, ty), acc = r ? r.accent : '#b9785a';
  g.fillStyle = OL; g.fillRect(X, Y, TILE, TILE);
  g.fillStyle = '#e8eef7'; g.fillRect(X + 1, Y + 1, TILE - 2, TILE - 12);
  g.fillStyle = acc; g.fillRect(X + 1, Y + TILE - 11, TILE - 2, 8);
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(X + 1, Y + 10, TILE - 2, 1);
}
function drawRoomSign(g, r) {
  const text = r.label, cx = (r.x + r.w / 2) * TILE, y = r.y * TILE - 6;
  g.font = 'bold 20px "Courier New", monospace'; const w = g.measureText(text).width + 28;
  box(g, cx - w / 2, y, w, 40, '#fff'); g.fillStyle = r.accent; g.fillRect(cx - w / 2 + 4, y + 4, w - 8, 32);
  g.fillStyle = '#fff'; g.fillRect(cx - w / 2 + 6, y + 6, w - 12, 28);
  g.fillStyle = OL; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cx, y + 21);
}
// ---------- station sprites (origin ox,oy = footprint top-left) ----------
function legs(g, x, y, w, h, c) { box(g, x + 4, y + h - 14, 6, 12, c); box(g, x + w - 10, y + h - 14, 6, 12, c); }
function drawStation(g, o, ox, oy, W, H) {
  const X = ox, Y = oy, k = o.kind;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X + 2, Y + H - 8, W - 4, 8);
  if (o.type === 'machine') {
    if (k === 'scrollsaw') {
      box(g, X + 10, Y + 20, W - 20, H - 26, '#2f7d4f'); // stand
      box(g, X + 4, Y + 8, W - 8, 12, '#c9ced6'); // table
      box(g, X + 14, Y - 40, 14, 50, '#3fae5a'); box(g, X + 14, Y - 44, W - 34, 12, '#3fae5a'); // C-arm
      box(g, X + W - 26, Y - 36, 8, 10, '#3fae5a');
      g.fillStyle = '#e14b4b'; g.fillRect(X + W - 23, Y - 26, 2, 34); // blade
      box(g, X + 40, Y + 24, 26, 18, '#1d2340'); g.fillStyle = '#ffcf3f'; g.fillRect(X + 44, Y + 28, 6, 6);
      g.fillStyle = '#e2b97a'; g.fillRect(X + W - 46, Y + 10, 30, 6);
    } else if (k === 'drill') {
      box(g, X + 16, Y + H - 18, W - 32, 12, '#3a4a7a'); // base
      box(g, X + 42, Y - 46, 10, H + 34, '#c9ced6'); // column
      box(g, X + 22, Y - 52, 54, 26, '#3f7fd9'); box(g, X + 64, Y - 58, 16, 14, '#2f5fd0'); // head + motor
      g.fillStyle = '#c9ced6'; g.fillRect(X + 34, Y - 26, 6, 10); g.fillStyle = '#8890a8'; g.fillRect(X + 36, Y - 16, 2, 14); // chuck+bit
      box(g, X + 22, Y + 4, 36, 8, '#5a6a9a'); // table
      g.fillStyle = OL; g.fillRect(X + 76, Y - 36, 16, 3); g.fillRect(X + 84, Y - 44, 3, 18); // feed handle
      g.fillStyle = '#e14b4b'; g.fillRect(X + 26, Y - 46, 6, 6); // e-stop
    } else if (k === 'sander') {
      box(g, X + 8, Y + 4, W - 16, H - 12, '#5a6a9a');
      g.fillStyle = OL; g.beginPath(); g.arc(X + 30, Y - 10, 26, 0, 7); g.fill();
      g.fillStyle = '#d9a35f'; g.beginPath(); g.arc(X + 30, Y - 10, 22, 0, 7); g.fill();
      g.fillStyle = '#b07a3a'; g.beginPath(); g.arc(X + 30, Y - 10, 6, 0, 7); g.fill();
      box(g, X + 58, Y - 44, 20, 50, '#c9ced6'); g.fillStyle = '#b07a3a'; g.fillRect(X + 61, Y - 41, 14, 44);
      box(g, X + 10, Y + 12, 40, 6, '#c9ced6');
      g.fillStyle = '#e14b4b'; g.fillRect(X + W - 22, Y + 12, 8, 8);
    } else if (k === 'vacuum') {
      box(g, X + 6, Y - 2, W - 12, H - 6, '#d9534f'); // cabinet
      box(g, X + 10, Y - 50, W - 20, 22, '#7d848f'); g.fillStyle = '#ff7a3d'; for (let i = 0; i < 5; i++) g.fillRect(X + 18 + i * 20, Y - 34, 12, 3); // heater
      box(g, X + 14, Y - 22, W - 28, 14, '#c9ced6'); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(X + 18, Y - 20, W - 36, 10); // frame + sheet
      box(g, X + 40, Y - 6, 48, 10, '#a87a40'); // mould
      box(g, X + 16, Y + 14, 40, 18, OL); g.fillStyle = '#3fae5a'; g.fillRect(X + 20, Y + 18, 6, 6); g.fillStyle = '#ffcf3f'; g.fillRect(X + 30, Y + 18, 6, 6); g.fillStyle = '#e14b4b'; g.fillRect(X + 40, Y + 18, 6, 6);
      g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('VACUUM', X + W - 36, Y + 26);
    }
    return;
  }
  if (o.type === 'material' || o.type === 'joint' || o.type === 'jig') {
    box(g, X + 4, Y + 2, W - 8, 10, '#8a5a2b'); legs(g, X + 2, Y, W - 4, H, '#6b4420'); // display stand
    const cx = X + W / 2, top = Y - 20;
    if (o.type === 'material') {
      const m = DT.materials[k]; box(g, cx - 18, top, 36, 20, m.color);
      g.fillStyle = m.grain; if (m.shiny || m.clear) { g.fillRect(cx - 14, top + 3, 10, 3); g.fillRect(cx - 10, top + 8, 6, 2); } else for (let i = 0; i < 4; i++) g.fillRect(cx - 16, top + 3 + i * 5, 32, 1);
      if (k === 'plywood') { g.fillStyle = '#8a5a2b'; g.fillRect(cx - 18, top + 6, 36, 1); g.fillRect(cx - 18, top + 13, 36, 1); }
      if (k === 'pvc') { g.fillStyle = '#c9ced6'; g.fillRect(cx - 18, top + 8, 36, 4); }
    } else if (o.type === 'joint') drawJointIcon(g, k, cx, top + 10, 1);
    else drawJigIcon(g, k, cx, top + 10);
    return;
  }
  if (o.type === 'quiz') {
    box(g, X + W / 2 - 3, Y - 10, 6, H, '#8a5a2b');
    box(g, X + 4, Y - 40, W - 8, 30, '#ffcf3f'); g.fillStyle = OL; g.font = 'bold 22px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', X + W / 2, Y - 24);
    return;
  }
  if (o.type === 'poster') {
    box(g, X + 4, Y - 50, W - 8, 46, '#3fae5a'); g.fillStyle = '#fff'; g.fillRect(X + 8, Y - 46, W - 16, 38);
    g.fillStyle = OL; g.fillRect(X + 14, Y - 38, 36, 8); g.fillStyle = '#9fd3ff'; g.fillRect(X + 16, Y - 36, 13, 4); g.fillRect(X + 35, Y - 36, 13, 4); // goggles
    g.fillStyle = '#3fae5a'; g.fillRect(X + 26, Y - 26, 12, 12); g.fillStyle = '#fff'; g.fillRect(X + 31, Y - 24, 2, 8); g.fillRect(X + 28, Y - 21, 8, 2);
    box(g, X + W / 2 - 3, Y - 4, 6, H, '#8890a8');
    return;
  }
  if (o.type === 'bench') {
    box(g, X + 2, Y - 8, W - 4, 18, '#c98f4c'); g.fillStyle = '#e6b673'; g.fillRect(X + 4, Y - 6, W - 8, 4);
    box(g, X + 6, Y + 12, W - 12, H - 22, '#8a5a2b'); box(g, X + W - 26, Y - 18, 16, 10, '#7d848f'); // vice
    g.fillStyle = '#7d848f'; g.fillRect(X + 20, Y - 12, 18, 3); g.fillStyle = '#c0263c'; g.fillRect(X + 20, Y - 14, 6, 6); // tools
    return;
  }
  if (o.type === 'computers') {
    box(g, X + 2, Y - 2, W - 4, 12, '#c98f4c'); legs(g, X, Y, W, H, '#8a5a2b');
    for (const mx of [X + 18, X + W - 58]) {
      box(g, mx, Y - 36, 40, 28, '#2a2a33'); g.fillStyle = '#3f7fd9'; g.fillRect(mx + 3, Y - 33, 34, 22);
      g.fillStyle = '#fff'; g.fillRect(mx + 6, Y - 30, 20, 3); g.fillRect(mx + 6, Y - 25, 26, 2); g.fillRect(mx + 6, Y - 21, 14, 2);
      g.fillStyle = '#ffcf3f'; g.fillRect(mx + 28, Y - 30, 6, 6);
      g.fillStyle = OL; g.fillRect(mx + 17, Y - 8, 6, 6); g.fillRect(mx + 6, Y + 2, 28, 4);
    }
    return;
  }
  if (o.type === 'tv') {
    box(g, X + W / 2 - 8, Y - 20, 16, 26, '#2a2a33'); box(g, X + 20, Y + 4, W - 40, 10, '#2a2a33');
    box(g, X, Y - 128, W, 110, '#2a2a33'); g.fillStyle = '#123'; g.fillRect(X + 8, Y - 120, W - 16, 94);
    const grd = g.createLinearGradient(0, Y - 120, 0, Y - 26); grd.addColorStop(0, '#3f7fd9'); grd.addColorStop(1, '#9b59d0');
    g.fillStyle = grd; g.fillRect(X + 10, Y - 118, W - 20, 90);
    g.fillStyle = '#e14b4b'; g.fillRect(X + W / 2 - 22, Y - 92, 44, 30); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(X + W / 2 - 6, Y - 85); g.lineTo(X + W / 2 + 10, Y - 77); g.lineTo(X + W / 2 - 6, Y - 69); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 14px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MR NOR DNT TV', X + W / 2, Y - 106); g.font = 'bold 11px "Courier New", monospace'; g.fillText('PRESS A TO WATCH', X + W / 2, Y - 46);
    g.fillStyle = '#3fae5a'; g.fillRect(X + W - 14, Y - 26, 4, 4);
    return;
  }
  if (o.type === 'notice') {
    box(g, X + 8, Y - 10, 8, H + 4, '#8a5a2b'); box(g, X + W - 16, Y - 10, 8, H + 4, '#8a5a2b');
    const bx = X - 4, by = Y - 58, bw = W + 8, bh = 54;
    box(g, bx, by, bw, bh, '#b06a30'); g.fillStyle = '#d9a35f'; g.fillRect(bx + 4, by + 14, bw - 8, bh - 18);
    g.fillStyle = '#ffcf3f'; g.fillRect(bx + 3, by + 2, bw - 6, 11); g.fillStyle = OL; g.font = 'bold 9px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOTICE BOARD', bx + bw / 2, by + 8);
    const notes = [['#fff', 'STUDY HARD', 'FOR YOUR D&T'], ['#ff9ad0', 'FAREWELL', 'HILLGROVE'], ['#9fd3ff', 'MY', 'LINKTREE']];
    notes.forEach(([c, a, b2], i) => { const nx = bx + 6 + i * 34, ny = by + 17; box(g, nx, ny, 30, 32, c); g.fillStyle = '#c0263c'; g.fillRect(nx + 13, ny + 1, 4, 3); g.fillStyle = OL; g.font = 'bold 6px monospace'; g.fillText(a, nx + 15, ny + 13); g.fillText(b2, nx + 15, ny + 22); });
  }
}
function drawJointIcon(g, k, cx, cy, s) {
  const A = '#e6b673', B = '#c98f4c';
  const r = (x, y, w, h, c) => box(g, cx + x * s, cy + y * s, w * s, h * s, c);
  switch (k) {
    case 'butt': r(-16, -2, 16, 8, A); r(0, -10, 8, 16, B); break;
    case 'screw': r(-16, -2, 16, 8, A); r(0, -10, 8, 16, B); g.fillStyle = '#8890a8'; g.fillRect(cx - 2 * s, cy, 12 * s, 2 * s); break;
    case 'nail': r(-16, -2, 16, 8, A); r(0, -10, 8, 16, B); g.fillStyle = '#5f6670'; g.fillRect(cx - 4 * s, cy - 1, 14 * s, 1 * s + 1); g.fillRect(cx - 4 * s, cy + 4 * s, 14 * s, 1 * s + 1); break;
    case 'dowel': r(-18, -2, 14, 8, A); r(4, -2, 14, 8, B); g.fillStyle = '#fff3c0'; g.fillRect(cx - 6 * s, cy, 12 * s, 2 * s); g.fillRect(cx - 6 * s, cy + 3 * s, 12 * s, 2 * s); break;
    case 'lap': r(-16, -4, 20, 6, A); r(-4, 2, 20, 6, B); break;
    case 'halving': r(-16, -3, 32, 6, A); r(-3, -10, 6, 20, B); break;
    case 'mitre': g.fillStyle = OL; g.beginPath(); g.moveTo(cx - 16 * s, cy - 8 * s); g.lineTo(cx + 8 * s, cy - 8 * s); g.lineTo(cx + 16 * s, cy); g.lineTo(cx + 16 * s, cy + 10 * s); g.lineTo(cx + 8 * s, cy + 10 * s); g.lineTo(cx + 8 * s, cy); g.lineTo(cx - 16 * s, cy); g.fill();
      g.fillStyle = A; g.fillRect(cx - 15 * s, cy - 7 * s, 22 * s, 6 * s); g.fillStyle = B; g.fillRect(cx + 9 * s, cy + 1 * s, 6 * s, 8 * s); break;
    case 'finger': for (let i = 0; i < 4; i++) { r(-12 + i * 6, -8, 6, i % 2 ? 10 : 14, i % 2 ? B : A); } r(-12, 4, 24, 6, B); break;
    case 'dovetail': r(-14, -2, 28, 10, B); g.fillStyle = A; for (let i = 0; i < 2; i++) { g.beginPath(); const x = cx + (-10 + i * 12) * s; g.moveTo(x, cy - 2 * s); g.lineTo(x + 8 * s, cy - 2 * s); g.lineTo(x + 6 * s, cy - 10 * s); g.lineTo(x + 2 * s, cy - 10 * s); g.fill(); } break;
    case 'mortise': r(-16, -6, 32, 12, B); r(-4, -14, 8, 10, A); g.fillStyle = OL; g.fillRect(cx - 4 * s, cy - 6 * s, 8 * s, 3 * s); break;
    case 'bridle': r(-16, -2, 32, 8, B); r(-5, -14, 4, 14, A); r(1, -14, 4, 14, A); break;
    case 'housing': r(-16, 2, 32, 6, A); r(-3, -12, 6, 16, B); break;
    case 'biscuit': r(-18, -4, 16, 10, A); r(2, -4, 16, 10, B); g.fillStyle = '#fff3c0'; g.beginPath(); g.ellipse(cx, cy + 1 * s, 7 * s, 3 * s, 0, 0, 7); g.fill(); break;
    case 'kd': r(-16, -2, 16, 8, A); r(0, -10, 8, 16, B); r(-8, 6, 8, 4, '#c9ced6'); g.fillStyle = '#7d848f'; g.beginPath(); g.arc(cx - 4 * s, cy + 2 * s, 3 * s, 0, 7); g.fill(); break;
  }
}
function drawJigIcon(g, k, cx, cy) {
  const r = (x, y, w, h, c) => box(g, cx + x, cy + y, w, h, c);
  switch (k) {
    case 'bending': r(-16, -6, 32, 14, '#c98f4c'); g.fillStyle = '#ff5c7a'; g.fillRect(cx - 14, cy - 10, 4, 6); g.fillRect(cx - 14, cy - 10, 28, 3); g.fillStyle = '#7d848f'; g.fillRect(cx + 6, cy - 6, 4, 4); break;
    case 'strip': r(-18, -2, 36, 8, '#7d848f'); g.fillStyle = '#ff7a3d'; g.fillRect(cx - 16, cy - 3, 32, 2); r(-12, -12, 24, 4, '#ff5c7a'); break;
    case 'laminate': g.fillStyle = OL; g.fillRect(cx - 18, cy - 4, 36, 14); g.fillStyle = '#c98f4c'; g.fillRect(cx - 16, cy - 2, 32, 10); g.fillStyle = '#e6b673'; for (let i = 0; i < 3; i++) g.fillRect(cx - 16, cy - 10 + i * 2, 32, 1); break;
    case 'sandmould': r(-16, -8, 32, 16, '#d9c08a'); g.fillStyle = '#8890a8'; g.fillRect(cx - 8, cy - 4, 16, 6); break;
    case 'drape': r(-16, 2, 32, 6, '#c98f4c'); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy + 2, 12, Math.PI, 0); g.fill(); g.strokeStyle = OL; g.stroke(); break;
    case 'template': r(-12, -8, 24, 16, '#9fd3ff'); g.fillStyle = OL; g.fillRect(cx - 6, cy - 4, 12, 2); g.fillRect(cx - 6, cy + 2, 8, 2); break;
    case 'drilljig': r(-16, -6, 32, 12, '#3f7fd9'); g.fillStyle = OL; g.fillRect(cx - 9, cy - 2, 4, 4); g.fillRect(cx + 5, cy - 2, 4, 4); break;
    case 'cutjig': r(-16, -2, 32, 10, '#c98f4c'); g.fillStyle = OL; g.fillRect(cx - 8, cy - 6, 2, 14); g.fillRect(cx + 6, cy - 6, 2, 14); break;
  }
}
// ---------- NPCs ----------
const npc = { id: -1, name: 'Mr Nor Dnt', x: 0, y: 0, hx: 0, rx: 0, ry: 0, dir: 0, moving: false, anim: 0, wait: 2, tx: 0, kind: 'nor', helper: false };
const NPC_LOOKS = {
  nor: { look: { skin: 2, hair: 0, shirt: 7, pants: 2, style: 0, acc: 1 }, lanyard: '#e14b4b' },
  rahim: { look: { skin: 3, hair: 0, shirt: 0, pants: 0, style: 4, acc: 0 }, overalls: '#2c4a8f', hat: '#ffcf3f', goggles: true },
  salihin: { look: { skin: 2, hair: 1, shirt: 4, pants: 2, style: 0, acc: 0 }, overalls: '#3a6b3a', hat: '#ff8a3d', goggles: true, beard: true },
  azmi: { look: { skin: 3, hair: 0, shirt: 2, pants: 1, style: 0, acc: 1 }, lanyard: '#3f7fd9', song: true },
  huang: { look: { skin: 1, hair: 0, shirt: 8, pants: 1, style: 2, acc: 0 }, lanyard: '#3fae5a', tie: '#3f7fd9' },
  lau: { look: { skin: 0, hair: 1, shirt: 5, pants: 2, style: 0, acc: 1 }, lanyard: '#ffcf3f', tablet: true },
};
let KB = null, helpers = [];
fetch('npc-knowledge.json').then((r) => r.json()).then((j) => { KB = j; setupHelpers(); }).catch(() => {});
function setupHelpers() {
  if (!KB || !MAP) return;
  helpers = (MAP.helpers || []).map((h) => {
    const info = KB.npcs.find((n) => n.id === h.id) || { name: h.id, role: '', topics: [] };
    return { id: -100 - helpers.length, kind: h.id, helper: true, name: info.name, role: info.role, topics: info.topics, x: (h.x + 0.5) * TILE, y: (h.y + 0.5) * TILE + 12, rx: (h.x + 0.5) * TILE, ry: (h.y + 0.5) * TILE + 12, dir: 0, moving: false, anim: 0 };
  });
}
function allNpcs() { return MAP && MAP.npc ? [npc, ...helpers] : helpers; }
function npcTick(dt, now) {
  if (!MAP || !MAP.npc) return;
  if (!helpers.length && KB) setupHelpers();
  const [x0, x1] = MAP.npc.range || [MAP.npc.x - 3, MAP.npc.x + 3];
  const talking = menuOpen() && ST.npc === npc;
  if (talking) { npc.moving = false; npc.dir = 0; }
  else if (npc.wait > 0) { npc.wait -= dt; npc.moving = false; if (npc.wait <= 0) npc.tx = (x0 + 0.5 + Math.random() * (x1 - x0)) * TILE; }
  else {
    const d = npc.tx - npc.x; if (Math.abs(d) < 2) { npc.wait = 1.5 + Math.random() * 3; npc.dir = 0; npc.moving = false; }
    else { npc.x += Math.sign(d) * Math.min(Math.abs(d), 60 * dt); npc.dir = d < 0 ? 1 : 2; npc.moving = true; npc.anim += dt; }
  }
  npc.rx = npc.x; npc.ry = npc.y;
  for (const h of helpers) { h.dir = Math.floor(now / 2500 + h.kind.length) % 5 === 0 ? (h.kind.length % 2 ? 1 : 2) : 0; }
}
function drawTeacher(g, p, frame, now) {
  const L = NPC_LOOKS[p.kind] || NPC_LOOKS.nor, bob = p.moving ? 0 : Math.floor(now / 600 + p.id) % 2;
  const X = Math.round(p.rx), Y = Math.round(p.ry) - bob;
  drawAvatar(g, X, Y, L.look, p.dir, frame, false, now);
  const u = 2;
  if (L.overalls) { g.fillStyle = L.overalls; g.fillRect(X - 5 * u, Y - 10 * u, 10 * u, 5 * u); g.fillRect(X - 4 * u, Y - 13 * u, 2 * u, 3 * u); g.fillRect(X + 2 * u, Y - 13 * u, 2 * u, 3 * u); g.fillStyle = '#ffcf3f'; g.fillRect(X - 4 * u, Y - 9 * u, u, u); g.fillRect(X + 3 * u, Y - 9 * u, u, u); }
  if (L.hat) { g.fillStyle = OL; g.fillRect(X - 9 * u, Y - 30 * u, 18 * u, 7 * u); g.fillStyle = L.hat; g.fillRect(X - 8 * u, Y - 29 * u, 16 * u, 4 * u); g.fillRect(X - 9 * u, Y - 25 * u, 18 * u, u); g.fillStyle = '#fff6c0'; g.fillRect(X - 5 * u, Y - 28 * u, 3 * u, u); }
  if (L.goggles) { g.fillStyle = OL; g.fillRect(X - 7 * u, Y - 24 * u, 14 * u, 2 * u); g.fillStyle = '#9fd3ff'; g.fillRect(X - 5 * u, Y - 24 * u, 3 * u, u); g.fillRect(X + 2 * u, Y - 24 * u, 3 * u, u); }
  if (L.beard && p.dir !== 3) { g.fillStyle = '#1b1b24'; g.fillRect(X - 5 * u, Y - 15 * u, 10 * u, 2 * u); }
  if (L.lanyard && p.dir !== 3) { g.fillStyle = L.lanyard; g.fillRect(X - 3 * u, Y - 13 * u, u, 5 * u); g.fillRect(X + 2 * u, Y - 13 * u, u, 5 * u); g.fillRect(X - 2 * u, Y - 8 * u, 4 * u, u); g.fillStyle = '#fff'; g.fillRect(X - 2 * u, Y - 7 * u, 4 * u, 3 * u); }
  if (L.tie && p.dir === 0) { g.fillStyle = L.tie; g.fillRect(X - u / 2, Y - 13 * u, u, 4 * u); }
  if (L.song && p.dir !== 3) { g.fillStyle = '#1b1b24'; g.fillRect(X - 6 * u, Y - 28 * u, 12 * u, 3 * u); } // songkok
  if (L.tablet) { g.fillStyle = OL; g.fillRect(X + 4 * u, Y - 12 * u, 6 * u, 8 * u); g.fillStyle = '#9fd3ff'; g.fillRect(X + 5 * u, Y - 11 * u, 4 * u, 6 * u); }
  if (!menuOpen() && Math.floor(now / 700) % 3 === 0 && p === npc) { g.font = 'bold 16px "Courier New", monospace'; g.fillStyle = '#ffcf3f'; g.textAlign = 'center'; g.fillText('!', X, Y - 64); }
}
// ---------- interaction ----------
const REACH = 46;
function nearThing() {
  if (!MAP || !me) return null;
  for (const n of allNpcs()) if (Math.hypot(n.rx - me.x, n.ry - me.y) < 52) return n;
  let best = null, bd = 1e9;
  for (const o of MAP.objects || []) {
    if (o.type === 'bench') continue;
    const x0 = o.x * TILE, y0 = o.y * TILE, x1 = (o.x + (o.w || 1)) * TILE, y1 = (o.y + (o.h || 1)) * TILE;
    const d = Math.hypot(Math.max(x0 - me.x, 0, me.x - x1), Math.max(y0 - me.y, 0, me.y - y1));
    if (d <= REACH && d < bd) { bd = d; best = o; }
  }
  return best;
}
function thingName(o) {
  if (o.helper || o === npc) return o.name;
  if (o.type === 'material') return DT.materials[o.kind].name.split(' (')[0];
  if (o.type === 'joint') return DT.joints[o.kind].name;
  if (o.type === 'jig') return DT.jigs[o.kind].name.split(' (')[0];
  if (o.type === 'machine') return DT.machines[o.kind].title.split(' (')[0];
  return { notice: 'Notice Board', computers: 'Computers', tv: 'TV', quiz: 'Quiz', poster: 'Safety Rules', mission_board: 'Mission' }[o.type] || o.label;
}
function promptFor(o) {
  if (o.helper || o === npc) return 'A: Talk to ' + o.name;
  const v = { machine: 'Use', material: 'Look', joint: 'Look', jig: 'Look', quiz: 'Play', notice: 'Read', computers: 'Open', tv: 'Watch', poster: 'Read', mission_board: 'Mission' }[o.type] || 'Use';
  return o.type === 'mission_board' ? 'A: Mission' : `A: ${v} ${thingName(o)}`;
}
function openPanel(wide) { closeChat(); keys.clear(); pad.x = pad.y = 0; mpanel.classList.remove('hidden'); mpanel.classList.toggle('wide', !!wide); mbody.scrollTop = 0; }
function P(view) { ST.hold = false; ST.view = view; mbody.innerHTML = ''; if (ST.timer) { clearInterval(ST.timer); ST.timer = 0; } ST.anim = null; }
const add = (e) => { mbody.appendChild(e); return e; };
function list(items, cls) { const u = el('ul', cls || 'plist'); for (const t of items) u.appendChild(el('li', '', t)); return u; }
function finishMenu() { menuIdx = 0; menuSel(); mbody.scrollTop = 0; }
function openLink(url) { const w = window.open(url, '_blank', 'noopener,noreferrer'); if (w) try { w.opener = null; } catch (e) { /* ignore */ } }
function interact(o) {
  if (o.helper) return helperTalk(o);
  if (o === npc) return npcTalk('intro');
  ST.npc = null;
  switch (o.type) {
    case 'mission_board': return openMission('board');
    case 'machine': return machineInfo(o.kind);
    case 'material': return materialView(o.kind);
    case 'joint': return jointView(o.kind);
    case 'jig': return jigView(o.kind);
    case 'quiz': return quizStart(DT.quizzes[o.kind], { materials: '🧪 Material ID Challenge', joints: '🔗 Joint Quiz', forming: '♨️ Forming Quiz' }[o.kind]);
    case 'poster': P('ppe'); add(el('h3', '', DT.ppe.icon + ' ' + DT.ppe.title)); add(list(DT.ppe.lines)); add(mbtn('✖ Close (B)', closeMenu)); openPanel(); return finishMenu();
    case 'computers': P('pc');
      add(el('h3', '', '💻 Mr Nor DnT Website')); add(el('p', '', "Notes, worksheets, project guides and more on Mr Nor DnT's website. It opens in a new tab."));
      add(mbtn('🌐 Open Mr Nor DnT website', () => openLink(SITE_URL), 'go')); add(mbtn('✖ Close (B)', closeMenu)); openPanel(); return finishMenu();
    case 'notice': return noticeView();
    case 'tv': return openTV();
  }
}
function noticeView() {
  P('notice'); add(el('h3', '', '📌 NOTICE BOARD'));
  const n = add(el('div', 'notes'));
  n.appendChild(el('div', 'note n1', 'Study Hard for Your D&T')); n.appendChild(el('div', 'note n2', 'Farewell Hillgrove'));
  n.appendChild(el('div', 'note n3', 'Check my linktree channel'));
  add(mbtn('🔗 Open Linktree', () => openLink(LINKTREE_URL), 'go'));
  add(mbtn('📋 Mission Board', () => openMission('board')));
  add(mbtn('✖ Close (B)', closeMenu)); openPanel(); finishMenu();
}
// ---------- machines ----------
function machineInfo(k) {
  const m = DT.machines[k]; P('machine');
  add(el('h3', '', m.icon + ' ' + m.title)); add(el('p', '', m.purpose));
  add(el('h4', '', '🦺 Wear (PPE)')); add(list(m.ppe));
  add(el('h4', '', '✅ Safe use')); const ol = el('ol', 'plist'); m.steps.forEach((t) => ol.appendChild(el('li', '', t))); add(ol);
  add(mbtn(k === 'vacuum' ? '▶ Try vacuum forming' : '▶ Use the machine', () => machineRun(k), 'go'));
  add(mbtn('✖ Close (B)', closeMenu)); openPanel(true); finishMenu();
}
function machineRun(k) {
  const m = DT.machines[k]; P('run');
  add(el('h3', '', m.icon + ' ' + m.title));
  const cvs = add(el('canvas', 'mcanvas')); cvs.width = 320; cvs.height = 160;
  const bar = add(el('div', 'pbar')); const fill = el('b'); bar.appendChild(fill);
  const info = add(el('p', 'big', m.action));
  const A = { k, prog: 0, step: 0, parts: [], done: false, t: 0 };
  ST.anim = A;
  if (k === 'vacuum') {
    info.textContent = 'Step 1: ' + m.seq[0];
    add(mbtn('▶ Next step (A)', () => {
      if (A.done) return;
      A.step++; A.prog = A.step / (m.seq.length - 1);
      if (A.step >= m.seq.length - 1) { A.done = true; info.textContent = m.seq[m.seq.length - 1] + ' ' + m.done; setTimeout(() => ST.anim === A && machineQuiz(k), 1500); }
      else info.textContent = `Step ${A.step + 1}: ` + m.seq[A.step];
    }, 'go'));
  } else {
    ST.hold = true;
    const hb = add(el('button', 'mbtn go holdbtn', '✋ HOLD here (or hold A)'));
    hb.addEventListener('pointerdown', (e) => { e.preventDefault(); holdA(true); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) hb.addEventListener(ev, () => holdA(false));
  }
  add(mbtn('✖ Stop & close (B)', closeMenu));
  let lastT = performance.now();
  ST.timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; A.t += dt;
    if (k !== 'vacuum' && !A.done && ST.holding) { A.prog = Math.min(1, A.prog + dt / 3); for (let i = 0; i < 3; i++) A.parts.push({ x: 160 + (Math.random() - 0.5) * 10, y: 80, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 90, life: 0.8 }); }
    if (k !== 'vacuum' && A.prog >= 1 && !A.done) { A.done = true; ST.hold = false; ST.holding = false; info.textContent = m.done; setTimeout(() => ST.anim === A && machineQuiz(k), 1200); }
    for (const p of A.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }
    A.parts = A.parts.filter((p) => p.life > 0);
    fill.style.width = Math.round(A.prog * 100) + '%';
    drawRun(cvs.getContext('2d'), A, m);
  }, 33);
  openPanel(true); finishMenu();
}
function drawRun(g, A, m) {
  g.imageSmoothingEnabled = false; g.fillStyle = '#dbe8ff'; g.fillRect(0, 0, 320, 160);
  g.fillStyle = '#9aa3ad'; g.fillRect(0, 130, 320, 30);
  const on = ST.holding && !A.done, jit = on ? (Math.floor(A.t * 30) % 2) : 0;
  if (A.k === 'scrollsaw') {
    box(g, 40, 92, 240, 10, '#c9ced6'); box(g, 60, 102, 200, 28, '#2f7d4f');
    box(g, 60, 10, 20, 82, '#3fae5a'); box(g, 60, 10, 110, 16, '#3fae5a');
    g.fillStyle = '#e14b4b'; g.fillRect(158, 26 + jit * 3, 3, 66);
    box(g, 70 + 80 * A.prog, 80, 120, 12, '#e2b97a'); g.fillStyle = OL; g.fillRect(100, 84, 60, 1);
  } else if (A.k === 'drill') {
    box(g, 150, 4, 14, 126, '#c9ced6'); box(g, 100, 10, 110, 34, '#3f7fd9');
    g.fillStyle = '#8890a8'; const d = 44 + A.prog * 36; g.fillRect(126, 44, 12, 10); g.fillRect(130, 54, 4, d - 44 + 16 + jit);
    box(g, 80, 96, 110, 10, '#5a6a9a'); box(g, 90, 84, 80, 12, '#c9ced6');
  } else if (A.k === 'sander') {
    g.fillStyle = OL; g.beginPath(); g.arc(120, 70, 52, 0, 7); g.fill(); g.fillStyle = '#d9a35f'; g.beginPath(); g.arc(120, 70, 47, 0, 7); g.fill();
    g.save(); g.translate(120, 70); g.rotate(on ? A.t * 20 : 0); g.fillStyle = '#b07a3a'; g.fillRect(-3, -45, 6, 90); g.restore();
    box(g, 60, 110, 140, 8, '#c9ced6'); box(g, 170 - A.prog * 4, 92, 70, 18, '#e2b97a');
  } else {
    const st = A.step; box(g, 60, 112, 200, 18, '#d9534f');
    if (st >= 1) { g.fillStyle = st >= 3 ? '#ffd0a0' : '#ff7a3d'; for (let i = 0; i < 6; i++) g.fillRect(70 + i * 32, 10, 20, 4); box(g, 64, 4, 192, 6, '#7d848f'); }
    const mh = st >= 2 ? 40 : 10; box(g, 130, 112 - mh, 60, mh, '#a87a40');
    g.fillStyle = 'rgba(255,255,255,.85)'; g.strokeStyle = OL; g.lineWidth = 2;
    if (st < 3) { const sag = st >= 1 ? 12 : 0; g.beginPath(); g.moveTo(70, 60); g.quadraticCurveTo(160, 60 + sag * 2, 250, 60); g.lineTo(250, 66); g.quadraticCurveTo(160, 66 + sag * 2, 70, 66); g.fill(); g.stroke(); }
    else if (st < 5) { g.beginPath(); g.moveTo(70, 72); g.lineTo(126, 72); g.lineTo(126, 68); g.lineTo(194, 68); g.lineTo(194, 72); g.lineTo(250, 72); g.lineTo(250, 76); g.lineTo(196, 76); g.lineTo(196, 112); g.lineTo(124, 112); g.lineTo(124, 76); g.lineTo(70, 76); g.closePath(); g.fill(); g.stroke(); }
    else { g.beginPath(); g.rect(124, 66, 72, 46); g.fill(); g.stroke(); }
    if (st === 3) { g.fillStyle = '#3f7fd9'; for (let i = 0; i < 6; i++) g.fillRect(90 + i * 26, 118 + (Math.floor(A.t * 8 + i) % 3) * 3, 4, 4); }
  }
  for (const p of A.parts) { g.fillStyle = m.particle; g.fillRect(p.x, p.y, 3, 3); }
}
function holdA(v) { if (!ST.hold && v) return; ST.holding = !!v && ST.hold; const hb = mbody.querySelector('.holdbtn'); if (hb) hb.classList.toggle('sel', ST.holding); }
function machineQuiz(k) { const m = DT.machines[k]; quizStart([m.quiz], '🧠 Safety check: ' + m.title, () => machineInfo(k)); }
// ---------- materials / joints / jigs ----------
function materialView(k) {
  const m = DT.materials[k]; P('mat');
  add(el('h3', '', m.name)); add(el('p', 'tag', m.group));
  const sw = add(el('div', 'swatch')); sw.style.background = m.clear ? `linear-gradient(135deg, ${m.color}cc, ${m.grain}aa)` : m.shiny ? `linear-gradient(135deg, ${m.grain}, ${m.color} 60%, ${m.grain})` : `repeating-linear-gradient(0deg, ${m.color} 0 8px, ${m.grain} 8px 10px)`;
  add(el('h4', '', '🛡 Resistance'));
  const t = add(el('table', 'res'));
  for (const [kk, v] of Object.entries(m.resist)) { const tr = el('tr'); tr.appendChild(el('td', '', kk)); const td = el('td'); const b = el('span', 'rbar r' + v); b.textContent = '■'.repeat(v + 1) + '□'.repeat(3 - v); td.appendChild(b); td.appendChild(document.createTextNode(' ' + DT.resistLabels[v])); tr.appendChild(td); t.appendChild(tr); }
  add(el('h4', '', '📋 Properties')); add(list(m.props));
  add(el('p', '', '🔧 Uses: ' + m.uses));
  add(mbtn('🧪 Material ID Challenge', () => quizStart(DT.quizzes.materials, '🧪 Material ID Challenge')));
  add(mbtn('✖ Close (B)', closeMenu)); openPanel(true); finishMenu();
}
function jointView(k) {
  const j = DT.joints[k]; P('joint');
  add(el('h3', '', '🔗 ' + j.name)); add(el('p', 'tag', j.type + ' · Strength ' + '★'.repeat(j.str) + '☆'.repeat(3 - j.str)));
  const c = add(el('canvas', 'mcanvas')); c.width = 160; c.height = 80; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#fff'; g.fillRect(0, 0, 160, 80); drawJointIcon(g, k, 80, 44, 3);
  add(el('p', '', j.desc)); add(el('p', '', '🔧 Used for: ' + j.uses));
  add(mbtn('🔗 Joint Quiz', () => quizStart(DT.quizzes.joints, '🔗 Joint Quiz'))); add(mbtn('✖ Close (B)', closeMenu)); openPanel(true); finishMenu();
}
function jigView(k) {
  const j = DT.jigs[k]; P('jig');
  add(el('h3', '', '📐 ' + j.name));
  const c = add(el('canvas', 'mcanvas')); c.width = 120; c.height = 60; const g = c.getContext('2d'); g.save(); g.fillStyle = '#fff'; g.fillRect(0, 0, 120, 60); g.translate(60, 30); g.scale(2, 2); drawJigIcon(g, k, 0, 2); g.restore();
  add(el('p', '', j.desc)); add(el('p', 'tip', '💡 ' + j.tip));
  add(mbtn('♨️ Forming Quiz', () => quizStart(DT.quizzes.forming, '♨️ Forming Quiz'))); add(mbtn('✖ Close (B)', closeMenu)); openPanel(true); finishMenu();
}
// ---------- quizzes (options shuffled) ----------
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function quizStart(qs, title, after) {
  const Q = shuffle(qs).slice(0, 5); let i = 0, score = 0;
  const show = () => {
    P('quiz'); add(el('h3', '', title));
    if (i >= Q.length) {
      add(el('p', 'big', `Score: ${score} / ${Q.length} ${score === Q.length ? '🏆 Perfect!' : score >= Q.length / 2 ? '👍 Well done!' : '💪 Keep learning!'}`));
      if (after) add(mbtn('↩ Back', after)); add(mbtn('🔁 Play again', () => quizStart(qs, title, after))); add(mbtn('✖ Close (B)', closeMenu)); return finishMenu();
    }
    const q = Q[i]; add(el('p', 'tag', `Question ${i + 1} of ${Q.length}`)); add(el('p', 'big', q.q));
    const opts = shuffle(q.a.map((t, n) => ({ t, ok: n === q.c })));
    for (const o of opts) add(mbtn(o.t, () => {
      for (const b of mbody.querySelectorAll('.mbtn')) b.disabled = true;
      if (o.ok) score++;
      const fb = add(el('p', 'big', o.ok ? '✅ Correct!' : '❌ Answer: ' + q.a[q.c]));
      setTimeout(() => { if (ST.view === 'quiz' && mbody.contains(fb)) { i++; show(); } }, o.ok ? 900 : 1900);
    }));
    add(mbtn('✖ Close (B)', closeMenu)); finishMenu();
  };
  show(); openPanel(true); finishMenu();
}
// ---------- Mr Nor Dnt dialogue (typewriter) ----------
function typeLines(lines, done) {
  let li = 0; P('talk'); ST.npc = npc;
  add(el('h3', '', '👓 Mr Nor Dnt'));
  const t = add(el('p', 'say big')); let ci = 0, full = '';
  const next = add(mbtn('▶ Next (A)', () => {
    if (ci < full.length) { ci = full.length; t.textContent = full; return; }
    li++; if (li >= lines.length) { done(); return; } start();
  }, 'go'));
  add(mbtn('✖ Close (B)', closeMenu));
  function start() { full = lines[li]; ci = 0; t.textContent = ''; next.textContent = li === lines.length - 1 ? '▶ OK (A)' : '▶ Next (A)'; }
  start();
  ST.timer = setInterval(() => { if (ci < full.length) { ci = Math.min(full.length, ci + 2); t.textContent = full.slice(0, ci); } }, 30);
  openPanel(true); finishMenu(); ST.npc = npc;
}
function npcTalk(what) {
  ST.npc = npc;
  if (what === 'intro') return typeLines(DT.npc.intro, () => npcTalk('menu'));
  if (DT.npc.topics[what]) return typeLines(DT.npc.topics[what], () => npcTalk('menu'));
  P('npcmenu'); ST.npc = npc; add(el('h3', '', '👓 Mr Nor Dnt'));
  add(el('p', '', 'What would you like to learn about?'));
  for (const k of Object.keys(DT.npc.topics)) add(mbtn('📘 ' + k, () => npcTalk(k)));
  const day = Math.floor(Date.now() / 86400000);
  add(mbtn('💡 Tip of the day', () => typeLines(['💡 Tip of the day: ' + DT.npc.tips[day % DT.npc.tips.length]], () => npcTalk('menu'))));
  add(mbtn("🧠 Mr Nor's quiz", () => quizStart(DT.npc.quiz, "🧠 Mr Nor's D&T Quiz", () => npcTalk('menu'))));
  add(mbtn('❓ Ask me a question', () => askView({ ...npc, kind: 'nor', topics: KB ? KB.topics.map((x) => x.topic) : [] })));
  add(mbtn('✖ Close (B)', closeMenu)); openPanel(true); finishMenu(); ST.npc = npc;
}
// ---------- Q&A NPCs (knowledge base, matched in the browser) ----------
const STOP = new Set('a an the is are was what why how do does did i you me my to of in on for and or it its can should which who when where with be this that there make use used about tell please'.split(' '));
const toks = (s) => String(s).toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => w.replace(/(ing|es|s)$/, '') || w);
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
function wmatch(a, b) { if (a === b) return 1; if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.8; if (a.length >= 4 && b.length >= 4 && lev(a, b) <= (a.length >= 7 ? 2 : 1)) return 0.7; return 0; }
function matchQuestion(text, who) {
  if (!KB) return { best: null, score: 0 };
  const qt = toks(text); if (!qt.length) return { best: null, score: 0 };
  let best = null, bs = 0;
  for (const e of KB.entries) {
    const kw = e.keywords.flatMap(toks), et = toks(e.q + ' ' + e.a);
    let s = 0;
    for (const w of qt) {
      let mk = 0; for (const k of kw) mk = Math.max(mk, wmatch(w, k));
      let mq = 0; for (const k of toks(e.q)) mq = Math.max(mq, wmatch(w, k));
      let ma = 0; for (const k of et) ma = Math.max(ma, wmatch(w, k));
      s += mk * 2 + mq * 1.5 + ma * 0.5;
    }
    s /= Math.sqrt(qt.length);
    if (who && who.topics && who.topics.includes(e.topic)) s *= 1.25;
    if (s > bs) { bs = s; best = e; }
  }
  return { best, score: bs };
}
function fallbackLine(who) { return who.kind === 'nor' ? "Good question - let's research it together in class!" : 'Great question - ask Mr Nor!'; }
const intro = (who) => who.kind === 'nor' ? "I'm Mr Nor Dnt. Ask me anything about D&T!" : `I'm ${who.name}${who.role ? ' (' + who.role + ')' : ''}. Ask me about ${who.topics.slice(0, 3).join(', ').toLowerCase()}!`;
function helperTalk(who) {
  ST.npc = who; P('helper'); add(el('h3', '', '🧑‍🏫 ' + who.name)); add(el('p', 'say big', intro(who)));
  if (!KB) add(el('p', '', 'Loading...'));
  for (const t of who.topics) add(mbtn('📘 ' + t, () => topicQs(who, t)));
  add(mbtn('❓ Type a question', () => askView(who), 'go'));
  add(mbtn('✖ Close (B)', closeMenu)); openPanel(true); finishMenu();
}
function topicQs(who, t) {
  P('topic'); add(el('h3', '', '📘 ' + t));
  for (const e of KB.entries.filter((x) => x.topic === t)) add(mbtn('❓ ' + e.q, () => answerView(who, e, () => topicQs(who, t))));
  add(mbtn('↩ Back', () => (who === npc || who.kind === 'nor' ? npcTalk('menu') : helperTalk(who)))); add(mbtn('✖ Close (B)', closeMenu)); finishMenu();
}
function answerView(who, e, back) {
  P('answer'); add(el('h3', '', '🧑‍🏫 ' + who.name)); add(el('p', 'tag', e.q)); add(el('p', 'say big', e.a));
  add(mbtn('↩ Back', back)); add(mbtn('✖ Close (B)', closeMenu)); finishMenu();
}
function askView(who) {
  P('ask'); ST.npc = who; add(el('h3', '', '❓ Ask ' + who.name));
  const f = add(el('form', 'askf')); const inp = el('input'); inp.id = 'askq'; inp.maxLength = 120; inp.placeholder = 'e.g. what does a cam do?'; inp.autocomplete = 'off'; inp.enterKeyHint = 'send';
  const go = el('button', 'btn', 'Ask'); go.type = 'submit'; f.appendChild(inp); f.appendChild(go);
  const out = add(el('div', 'askout'));
  inp.addEventListener('keydown', (e) => e.stopPropagation());
  f.onsubmit = (e) => {
    e.preventDefault(); const q = inp.value.replace(/\s+/g, ' ').trim(); if (!q) return;
    out.innerHTML = '';
    if (window.ChatFilter && ChatFilter.hasProfanity(q)) { out.appendChild(el('p', 'say big', 'Please ask kindly - let\'s keep it respectful. 🙂')); return; }
    const r = matchQuestion(q, who);
    if (r.best && r.score >= 1.8) { out.appendChild(el('p', 'tag', r.best.q)); out.appendChild(el('p', 'say big', r.best.a)); }
    else {
      out.appendChild(el('p', 'say big', fallbackLine(who))); out.appendChild(el('p', '', 'Try one of these:'));
      const pool = KB ? KB.entries.filter((x) => who.topics.includes(x.topic)) : [];
      for (const e2 of shuffle(pool).slice(0, 3)) out.appendChild(mbtn('❓ ' + e2.q, () => answerView(who, e2, () => askView(who))));
    }
    menuIdx = 0; menuSel();
  };
  add(mbtn('↩ Back', () => (who.kind === 'nor' ? npcTalk('menu') : helperTalk(who)))); add(mbtn('✖ Close (B)', closeMenu));
  openPanel(true); finishMenu(); setTimeout(() => inp.focus(), 50);
}
window.__ask = (q, id) => { const who = id === 'nor' ? { kind: 'nor', topics: KB.topics.map((x) => x.topic) } : helpers.find((h) => h.kind === id); const r = matchQuestion(q, who); return { q: r.best && r.best.q, topic: r.best && r.best.topic, score: r.score, answer: r.best && r.score >= 1.8 ? r.best.a : fallbackLine(who || { kind: id }) }; };
// ---------- TV overlay ----------
const tvov = $('tvov');
const tvOpen = () => !tvov.classList.contains('hidden');
const overlayOpen = tvOpen;
function openTV() {
  closeMenu(); closeChat(); keys.clear(); pad.x = pad.y = 0;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${YT_ID}?rel=0&playsinline=1&modestbranding=1`;
  f.title = 'Mr Nor Dnt TV'; f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
  $('tvframe').innerHTML = ''; $('tvframe').appendChild(f);
  tvov.classList.remove('hidden'); if (window.EWMusic) EWMusic.duck(true);
}
function closeTV() { $('tvframe').innerHTML = ''; tvov.classList.add('hidden'); if (window.EWMusic) EWMusic.duck(false); }
$('tvclose').onclick = closeTV;
$('tvyt').onclick = () => openLink('https://youtu.be/' + YT_ID);
for (const ev of ['pointerdown', 'touchstart', 'keydown']) tvov.addEventListener(ev, (e) => e.stopPropagation());

buildSwatches(); drawPreview();
requestAnimationFrame(loop);
function overview(sc, x0 = 0, y0 = 0, w = MAP.w * TILE, h = MAP.h * TILE) {
  const c = document.createElement('canvas'); c.width = Math.round(w * sc); c.height = Math.round(h * sc);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(sc, sc); g.translate(-x0, -y0);
  g.drawImage(worldCanvas, 0, 0);
  const items = [...sprites.map((o) => ({ y: o.base, f: () => g.drawImage(o.c, o.x, o.y) })), ...[...players.values(), ...allNpcs()].map((p) => ({ y: p.ry, f: () => {
    if (p.id < 0) drawTeacher(g, p, 0, 0); else drawAvatar(g, p.rx, p.ry, p.look, p.dir || 0, 0, false);
    g.font = 'bold 12px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(p.name).width + 12;
    roundRect(g, Math.round(p.rx - tw / 2), Math.round(p.ry + 6), tw, 17, p.id < 0 ? '#ffcf3f' : '#2f5fd0', p.id < 0 ? '#1d2340' : '#fff'); g.fillStyle = p.id < 0 ? '#1d2340' : '#fff'; g.fillText(p.name, p.rx, p.ry + 15); } }))];
  items.sort((a, b) => a.y - b.y).forEach((i) => i.f());
  return c.toDataURL('image/png');
}
window.__ew = { overview, players, get me() { return me; }, sendChat, pressA, pressB, MS, ST, openMission, interact, nearThing, npc, get helpers() { return helpers; }, openChat, closeChat, openTV, closeTV, objects: () => MAP && MAP.objects, teleport: (x, y) => { me.x = me.rx = x; me.y = me.ry = y; wsSend(JSON.stringify({ t: 'move', x, y, dir: 0, moving: false })); } };
})();
