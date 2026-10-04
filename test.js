// Headless test: node test.js [ws-url]
const WebSocket = require('ws');
const URL = process.argv[2] || 'ws://localhost:8080/ws';
const results = []; const ok = (n, c) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HTTP = URL.replace(/^ws/, 'http').replace(/\/ws$/, '');
const PIN = process.env.TEACHER_PIN || '1234';
async function tapi(path, body, pin = PIN) {
  const r = await fetch(HTTP + '/teacher/api' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-teacher-pin': pin }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
}
async function waitFor(c, pred, ms = 3000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = c.msgs.find(pred); if (m) return m; await wait(50); } return null; }
const last = (c, t) => c.msgs.filter((m) => m.t === t).pop();
// walk in small legal steps (server validates speed + collisions)
async function walkTo(c, x, y) {
  let { x: cx, y: cy } = c.pos || c.me;
  for (let i = 0; i < 80; i++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy); if (d < 1) break;
    const s = Math.min(24, d); cx += dx / d * s; cy += dy / d * s;
    c.ws.send(JSON.stringify({ t: 'move', x: cx, y: cy, dir: 0, moving: true })); await wait(75);
  }
  c.ws.send(JSON.stringify({ t: 'move', x: cx, y: cy, dir: 0, moving: false })); c.pos = { x: cx, y: cy }; await wait(100);
}
function client(name) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(URL); const c = { ws, msgs: [] };
    ws.on('message', (d) => { const m = JSON.parse(d); c.msgs.push(m); if (m.t === 'welcome') { c.me = m.you; res(c); } });
    ws.on('open', () => ws.send(JSON.stringify({ t: 'join', name, look: { shirt: 2 } })));
    ws.on('error', rej); setTimeout(() => rej(new Error('timeout')), 8000);
  });
}
(async () => {
  const a = await client('Alice!!@');
  ok('A joins, name sanitized', a.me.name === 'Alice');
  const b = await client('Bob');
  await wait(300);
  ok('A sees B joined', a.msgs.some((m) => m.t === 'joined' && m.p.name === 'Bob'));
  const bad = await client('fuck');
  ok('swear name replaced', /^Player\d+$/.test(bad.me.name)); bad.ws.close();
  // movement
  for (let i = 1; i <= 6; i++) { a.ws.send(JSON.stringify({ t: 'move', x: a.me.x + i * 8, y: a.me.y, dir: 2, moving: true })); await wait(70); }
  await wait(250);
  const st = b.msgs.filter((m) => m.t === 'state').pop();
  const row = st && st.s.find((r) => r[0] === a.me.id);
  ok('B receives A movement', row && Math.abs(row[1] - (a.me.x + 48)) <= 1);
  a.ws.send(JSON.stringify({ t: 'move', x: a.me.x + 2000, y: a.me.y, dir: 2, moving: true })); await wait(200);
  ok('teleport rejected with correction', a.msgs.some((m) => m.t === 'correct'));
  // chat
  await wait(1100);
  a.ws.send(JSON.stringify({ t: 'chat', text: '😀👍🏽🇸🇬' })); await wait(300);
  ok('emoji message accepted & broadcast', b.msgs.some((m) => m.t === 'chat' && m.text === '😀👍🏽🇸🇬'));
  for (const [txt, label] of [['hello', 'text'], ['😀hi', 'mixed'], ['123', 'digits'], ['!!', 'punctuation'], ['😀😀😀😀😀😀😀😀😀', '>8 emojis'], ['🖕', 'blocked emoji']]) {
    await wait(1100); const n = b.msgs.filter((m) => m.t === 'chat').length, k = a.msgs.length;
    a.ws.send(JSON.stringify({ t: 'chat', text: txt })); await wait(300);
    ok(`${label} rejected`, b.msgs.filter((m) => m.t === 'chat').length === n && a.msgs.slice(k).some((m) => m.t === 'reject'));
  }
  await wait(1100);
  a.ws.send(JSON.stringify({ t: 'chat', text: '🎉' })); a.ws.send(JSON.stringify({ t: 'chat', text: '🎉🎉' })); await wait(300);
  ok('rate limit (2nd msg within 1s rejected)', b.msgs.filter((m) => m.t === 'chat' && m.text.startsWith('🎉')).length === 1);
  a.ws.send(JSON.stringify({ t: 'emote', k: 'wave' })); await wait(300);
  ok('wave emote broadcast', b.msgs.some((m) => m.t === 'emote' && m.id === a.me.id));

  // ---------------- Decode Missions ----------------
  a.pos = { x: a.me.x + 48, y: a.me.y };
  const c = await client('Cara');
  await wait(300);
  const st0 = await tapi('/state');
  if (st0.j && st0.j.round) await tapi('/stop', {}); // live server: clear any running round
  await wait(200);
  ok('teacher page /teacher returns 200', (await fetch(HTTP + '/teacher')).status === 200);
  ok('teacher API rejects wrong PIN (401)', (await tapi('/state', null, 'wrong-pin')).status === 401);
  ok('teacher API accepts correct PIN', st0.status === 200 && Array.isArray(st0.j.custom));
  const W0 = a.msgs.find((m) => m.t === 'welcome'), board = (W0.map.objects || []).find((o) => o.type === 'mission_board');
  ok('mission board object in map + solid', board && W0.map.tiles[board.y * W0.map.w + board.x] === 9);
  let k = b.msgs.length;
  b.ws.send(JSON.stringify({ t: 'm_sender' })); await wait(300);
  ok('sender request away from board rejected', b.msgs.slice(k).some((m) => m.t === 'reject') && !b.msgs.slice(k).some((m) => m.t === 'm_round' && m.r));
  // A walks to just above the board (feet in the row above it)
  await walkTo(a, (board.x + 1) * 32, board.y * 32 - 18);
  const ka = a.msgs.length, kb = b.msgs.length, kc = c.msgs.length;
  a.ws.send(JSON.stringify({ t: 'm_sender' }));
  const ra = await waitFor(a, (m) => m.t === 'm_round' && m.r && a.msgs.indexOf(m) >= ka);
  const rb = await waitFor(b, (m) => m.t === 'm_round' && m.r && b.msgs.indexOf(m) >= kb);
  const rc = await waitFor(c, (m) => m.t === 'm_round' && m.r && c.msgs.indexOf(m) >= kc);
  ok('A at board starts round as Sender', ra && ra.r.senderId === a.me.id);
  ok('only sender gets the secret phrase', ra && typeof ra.r.secret === 'string' && rb && !('secret' in rb.r) && rc && !('secret' in rc.r) && !JSON.stringify(b.msgs.slice(kb)).includes('"secret"'));
  ok('guessers get 4 distinct options incl. the secret', rb && rb.r.options.length === 4 && new Set(rb.r.options).size === 4 && rb.r.options.includes(ra.r.secret));
  ok('round duration 90s', rb && rb.r.duration === 90000 && rb.r.left > 80000);
  const correct1 = rb.r.options.indexOf(ra.r.secret), wrong1 = (correct1 + 1) % 4;
  k = a.msgs.length; a.ws.send(JSON.stringify({ t: 'm_sender' })); await wait(300);
  ok('second sender request while active rejected', a.msgs.slice(k).some((m) => m.t === 'reject'));
  k = a.msgs.length; a.ws.send(JSON.stringify({ t: 'm_guess', choice: correct1 })); await wait(300);
  ok('sender cannot guess', a.msgs.slice(k).some((m) => m.t === 'reject'));
  await wait(1000);
  a.ws.send(JSON.stringify({ t: 'chat', text: '🏫🔧🍱' }));
  ok('sender emoji chat appears as mission clue for all', !!(await waitFor(b, (m) => m.t === 'm_clue' && m.text === '🏫🔧🍱')) && !!(await waitFor(c, (m) => m.t === 'm_clue' && m.text === '🏫🔧🍱')));
  await wait(1100);
  k = a.msgs.length; const nclue = b.msgs.filter((m) => m.t === 'm_clue').length;
  a.ws.send(JSON.stringify({ t: 'chat', text: ra.r.secret })); await wait(300);
  ok('sender free-text (the answer) rejected, not a clue', a.msgs.slice(k).some((m) => m.t === 'reject') && b.msgs.filter((m) => m.t === 'm_clue').length === nclue);
  k = b.msgs.length;
  b.ws.send(JSON.stringify({ t: 'm_guess', choice: ra.r.secret })); b.ws.send(JSON.stringify({ t: 'm_guess', choice: 'hello' })); b.ws.send(JSON.stringify({ t: 'm_guess', choice: 7 })); b.ws.send(JSON.stringify({ t: 'm_guess', text: 'answer' }));
  await wait(400);
  ok('free-text / invalid guesses rejected', b.msgs.slice(k).filter((m) => m.t === 'reject').length === 4 && !b.msgs.slice(k).some((m) => m.t === 'm_guessed'));
  c.ws.send(JSON.stringify({ t: 'm_guess', choice: wrong1 }));
  const gc = await waitFor(c, (m) => m.t === 'm_guessed');
  ok('wrong guess acknowledged privately as wrong', gc && gc.correct === false);
  k = c.msgs.length; c.ws.send(JSON.stringify({ t: 'm_guess', choice: correct1 })); await wait(300);
  ok('one guess per player (2nd guess rejected)', c.msgs.slice(k).some((m) => m.t === 'reject' && /already/.test(m.reason)) && c.msgs.filter((m) => m.t === 'm_guessed').length === 1);
  const others = (st0.j ? st0.j.players.length : 0) - 3; // live server: real players may be online
  b.ws.send(JSON.stringify({ t: 'm_guess', choice: correct1 }));
  const e1 = await waitFor(c, (m) => m.t === 'm_end', others > 0 ? 8000 : 2000);
  ok('round ends when all have guessed; winner announced', e1 && e1.res.winner === 'Bob' && e1.res.phrase === ra.r.secret && (others > 0 || e1.res.reason === 'decoded'));
  ok('results reveal sender clues + distribution', e1 && e1.res.clues[0] === '🏫🔧🍱' && e1.res.dist.length === 4 && e1.res.dist[correct1].count === 1 && e1.res.dist[wrong1].count === 1);
  const pts = (res, n) => (res.points.filter((p) => p.name === n).reduce((s2, p) => s2 + p.pts, 0));
  ok('scoring: first correct +3, sender +2, wrong 0', e1 && pts(e1.res, 'Bob') === 3 && pts(e1.res, 'Alice') === 2 && pts(e1.res, 'Cara') === 0);
  // round 2 started by teacher with a chosen sender: first correct +3, other correct +1
  const kk = [b.msgs.length, c.msgs.length];
  const s2 = await tapi('/start', { senderId: a.me.id, seconds: 90 });
  ok('teacher starts round with chosen sender', s2.status === 200 && s2.j.ok);
  const tstate = await tapi('/state');
  const r2b = await waitFor(b, (m) => m.t === 'm_round' && m.r && b.msgs.indexOf(m) >= kk[0]);
  const corr2 = r2b && r2b.r.options.indexOf(tstate.j.round.phrase);
  ok('teacher state shows the secret + matches options', tstate.j.round && corr2 >= 0 && tstate.j.round.senderName === 'Alice');
  b.ws.send(JSON.stringify({ t: 'm_guess', choice: corr2 }));
  ok('first correct guess triggers last-chance grace', !!(await waitFor(c, (m) => m.t === 'm_progress' && m.grace && c.msgs.indexOf(m) >= kk[1])));
  c.ws.send(JSON.stringify({ t: 'm_guess', choice: corr2 }));
  const e2 = await waitFor(c, (m) => m.t === 'm_end' && m.res !== e1.res && c.msgs.indexOf(m) >= kk[1], 8000);
  ok('scoring: 2nd correct +1, first +3, sender +2', e2 && pts(e2.res, 'Bob') === 3 && pts(e2.res, 'Cara') === 1 && pts(e2.res, 'Alice') === 2);
  ok('leaderboard totals (Bob 6, Alice 4, Cara 1)', e2 && (() => { const L = Object.fromEntries(e2.res.leaderboard.map((x) => [x.name, x.pts])); return L.Bob >= 6 && L.Alice >= 4 && L.Cara >= 1; })());
  k = b.msgs.length; b.ws.send(JSON.stringify({ t: 'm_board' }));
  const bd = await waitFor(b, (m) => m.t === 'm_board' && b.msgs.indexOf(m) >= k);
  ok('leaderboard request returns top <=5', bd && Array.isArray(bd.top) && bd.top.length <= 5 && bd.top.length >= 1);
  // custom phrases + custom-only mode
  const before = st0.j.mode, mine = ['Zz test phrase one', 'Zz test phrase two', 'Zz test phrase three', 'Zz test phrase four'];
  for (const t of mine) await tapi('/phrase', { text: t });
  await tapi('/mode', { mode: 'custom' });
  const pin401 = await tapi('/phrase', { text: 'hacker phrase' }, '0000');
  ok('adding phrase without PIN rejected', pin401.status === 401);
  const kc3 = c.msgs.length;
  await tapi('/start', { senderId: a.me.id, seconds: 10 });
  const r3 = await waitFor(c, (m) => m.t === 'm_round' && m.r && c.msgs.indexOf(m) >= kc3);
  const st3 = await tapi('/state');
  ok('custom-only mode uses teacher phrases', r3 && r3.r.options.every((o) => st3.j.custom.includes(o)) && st3.j.custom.includes(st3.j.round.phrase));
  const e3 = await waitFor(c, (m) => m.t === 'm_end' && c.msgs.indexOf(m) >= kc3, 13000);
  ok('round times out (10s round) with no winner', e3 && e3.res.reason === 'timeout' && !e3.res.winner && e3.res.points.length === 0);
  for (const t of mine) await tapi('/phrase/remove', { text: t });
  await tapi('/mode', { mode: before });
  const st4 = await tapi('/state');
  ok('teacher removes phrases + restores mode', mine.every((t) => !st4.j.custom.includes(t)) && st4.j.mode === before);
  const kc5 = c.msgs.length;
  await tapi('/start', { senderId: a.me.id });
  await waitFor(c, (m) => m.t === 'm_round' && m.r && c.msgs.indexOf(m) >= kc5);
  const sp = await tapi('/stop', {});
  const e5 = await waitFor(c, (m) => m.t === 'm_end' && c.msgs.indexOf(m) >= kc5);
  ok('teacher stops round', sp.status === 200 && e5 && e5.res.reason === 'stopped');
  if (!process.env.KEEP_SCORES) {
    await tapi('/reset', {});
    ok('teacher reset scores', (await tapi('/state')).j.leaderboard.length === 0);
  }
  // sender leaving ends the round
  const kb6 = b.msgs.length;
  await tapi('/start', { senderId: c.me.id });
  await waitFor(b, (m) => m.t === 'm_round' && m.r && b.msgs.indexOf(m) >= kb6);
  c.ws.close();
  const e6 = await waitFor(b, (m) => m.t === 'm_end' && b.msgs.indexOf(m) >= kb6);
  ok('sender leaving ends round', e6 && e6.res.reason === 'sender_left');
  await wait(1100);
  k = b.msgs.length; const ka7 = a.msgs.length; a.ws.send(JSON.stringify({ t: 'chat', text: 'still text?' })); await wait(300);
  ok('free text still rejected after missions', a.msgs.slice(ka7).some((m) => m.t === 'reject') && !b.msgs.slice(k).some((m) => m.t === 'chat'));

  b.ws.close(); await wait(400);
  ok('A sees B left', a.msgs.some((m) => m.t === 'left' && m.name === 'Bob'));
  a.ws.close();
  const f = results.filter((r) => !r[1]).length;
  console.log(f ? `${f} FAILED` : 'ALL PASSED'); process.exit(f ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
