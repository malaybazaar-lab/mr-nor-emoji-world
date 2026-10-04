// Google Sheet sync tests: node test/sheets.test.js
// Starts a mock Apps Script (running the real apps-script/Code.gs) and several game servers:
//  1. no SHEETS_* env      -> original test.js must pass unchanged, no sheet features exposed
//  2. sheet via mock       -> phrases load/save, rounds + scores logged, all-time scores; test.js also passes
//  3. sheet unreachable    -> gameplay unaffected (test.js passes), errors reported, writes queued
//  4. wrong secret         -> script refuses, server reports error
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const WebSocket = require('ws');
const { createMock } = require('./mock-apps-script');

const ROOT = path.join(__dirname, '..');
const SECRET = 'test-secret-123';
const PIN = '1234';
const results = []; const ok = (n, c) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = [];

function startServer(port, env) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ew-data-'));
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TEACHER_PIN: PIN, DATA_DIR: dataDir, SHEETS_URL: '', SHEETS_SECRET: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  p.out = ''; p.stdout.on('data', (d) => { p.out += d; }); p.stderr.on('data', (d) => { p.out += d; });
  procs.push(p);
  return new Promise((res, rej) => {
    const t0 = Date.now();
    (async function poll() {
      try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.ok) return res(p); } catch {}
      if (Date.now() - t0 > 8000 || p.exitCode !== null) return rej(new Error('server did not start:\n' + p.out));
      setTimeout(poll, 100);
    })();
  });
}
function runMainTests(port, label) {
  return new Promise((res) => {
    const p = spawn(process.execPath, ['test.js', `ws://127.0.0.1:${port}/ws`], { cwd: ROOT, env: { ...process.env, TEACHER_PIN: PIN }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('exit', (code) => {
      const pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length;
      console.log(`  [${label}] test.js: ${pass} passed, ${fail} failed`);
      if (fail || code) console.log(out.split('\n').filter((l) => /^FAIL|Error/.test(l)).join('\n'));
      res({ code, pass, fail });
    });
  });
}
const tapi = async (port, p, body) => {
  const r = await fetch(`http://127.0.0.1:${port}/teacher/api${p}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-teacher-pin': PIN }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {} return { status: r.status, j };
};
async function until(pred, ms = 5000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await pred(); if (v) return v; await wait(100); } return null; }
function client(port, name) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`); const c = { ws, msgs: [] };
    ws.on('message', (d) => { const m = JSON.parse(d); c.msgs.push(m); if (m.t === 'welcome') { c.me = m.you; res(c); } });
    ws.on('open', () => ws.send(JSON.stringify({ t: 'join', name, look: {} })));
    ws.on('error', rej); setTimeout(() => rej(new Error('ws timeout')), 5000);
  });
}

(async () => {
  // ---------- 1. no sheet configured: behaves exactly as before ----------
  await startServer(18180, {});
  const plain = await runMainTests(18180, 'no sheet');
  ok(`original test.js passes with no SHEETS env (${plain.pass} checks)`, plain.code === 0 && plain.fail === 0 && plain.pass >= 48);
  const st1 = await tapi(18180, '/state');
  ok('no SHEETS env: teacher state has no sheets section', st1.j && !('sheets' in st1.j));
  ok('no SHEETS env: /alltime reports disabled', (await tapi(18180, '/alltime')).j.enabled === false);
  ok('no SHEETS env: /sync is a harmless no-op', (await tapi(18180, '/sync', {})).j.sheets === false);

  // ---------- 2. mock Apps Script ----------
  const mock = createMock({ secret: SECRET, initialPhrases: [['Wash your hands', true], ['Old hidden phrase', false], ['Measure twice cut once', 'TRUE']] });
  const mport = await mock.listen();
  const SURL = `http://127.0.0.1:${mport}/macros/s/MOCK/exec`;
  ok('Code.gs setup() creates Phrases/Rounds/Scores/ReadMe tabs with headers', ['Phrases', 'Rounds', 'Scores', 'ReadMe'].every((t) => mock.tabs.has(t)) && mock.tabs.get('Rounds').rows[0][0] === 'timestamp' && mock.tabs.get('Scores').rows[0][1] === 'total_points');
  const srv = await startServer(18181, { SHEETS_URL: SURL, SHEETS_SECRET: SECRET, SHEETS_SYNC_MS: '1500', SHEETS_RETRY_MS: '300' });
  const s2 = await until(async () => { const s = await tapi(18181, '/state'); return s.j.sheets && s.j.sheets.lastSync && s.j; });
  ok('startup: active phrases loaded from sheet (inactive skipped)', s2 && s2.custom.includes('Wash your hands') && s2.custom.includes('Measure twice cut once') && !s2.custom.includes('Old hidden phrase'));
  ok('GET request carried the secret and followed the 302 redirect', mock.log.some((l) => l.method === 'GET' && l.query.secret === SECRET && l.query.action === 'phrases'));
  await tapi(18181, '/phrase', { text: 'Sand the edges smooth' });
  const added = await until(() => mock.rows('Phrases').find((r) => r[0] === 'Sand the edges smooth' && r[1] === true));
  ok('teacher add phrase -> appended to sheet (active TRUE, added_at)', added && added[2] instanceof Date);
  const post = mock.log.find((l) => l.method === 'POST' && l.body.action === 'addPhrase');
  ok('POST is text/plain JSON with the secret', post && /^text\/plain/.test(post.contentType) && post.body.secret === SECRET && post.body.phrase === 'Sand the edges smooth');
  await tapi(18181, '/phrase/remove', { text: 'Wash your hands' });
  ok('teacher remove phrase -> sheet row set active FALSE', await until(() => (mock.rows('Phrases').find((r) => r[0] === 'Wash your hands') || [])[1] === false));
  ok('removed phrase not in local list', !(await tapi(18181, '/state')).j.custom.includes('Wash your hands'));
  mock.tabs.get('Phrases').appendRow(['Wear safety goggles', true, new Date()]);  // teacher edits the sheet directly
  const sy = await tapi(18181, '/sync', {});
  ok('teacher page /sync pulls phrases edited in the sheet', sy.j.synced && (await tapi(18181, '/state')).j.custom.includes('Wear safety goggles'));
  mock.tabs.get('Phrases').appendRow(['=HYPERLINK("x")', true, new Date()]);
  await tapi(18181, '/phrase', { text: '+danger formula' });
  ok('formula-looking phrase is stored as text in sheet', await until(() => mock.rows('Phrases').some((r) => r[0] === "'+danger formula")));
  // a round: A sends, B decodes, C wrong
  const a = await client(18181, 'Alice'), b = await client(18181, 'Bob'), c = await client(18181, 'Cara');
  await wait(200);
  await tapi(18181, '/start', { senderId: a.me.id, seconds: 60 });
  const st = (await tapi(18181, '/state')).j.round;
  await wait(1100); a.ws.send(JSON.stringify({ t: 'chat', text: '🧤🔨' })); await wait(300);
  b.ws.send(JSON.stringify({ t: 'm_guess', choice: st.correct })); c.ws.send(JSON.stringify({ t: 'm_guess', choice: (st.correct + 1) % 4 }));
  const round = await until(() => mock.rows('Rounds')[0], 9000);
  ok('round logged to Rounds tab after the round', round && round[1] === 'Alice' && String(round[2]).replace(/^'/, '') === st.phrase && round[3] === '🧤🔨' && round[4] === 'Bob' && round[5] === 'Bob' && round[6] === 2 && round[9] === 'decoded');
  const vb = round && JSON.parse(round[7]);
  ok('vote_breakdown_json + duration_s recorded', vb && vb.length === 4 && vb[st.correct].count === 1 && vb[st.correct].correct === true && typeof round[8] === 'number');
  const sc = () => Object.fromEntries(mock.rows('Scores').map((r) => [r[0], r]));
  let S = sc();
  ok('Scores upserted (Bob 3, Alice 2, Cara 0; rounds_played 1)', S.Bob && S.Bob[1] === 3 && S.Alice[1] === 2 && S.Cara[1] === 0 && S.Bob[2] === 1 && S.Cara[3] instanceof Date);
  // second round: totals accumulate (no duplicate rows)
  await tapi(18181, '/start', { senderId: b.me.id, seconds: 60 });
  const st2 = (await tapi(18181, '/state')).j.round;
  a.ws.send(JSON.stringify({ t: 'm_guess', choice: st2.correct })); c.ws.send(JSON.stringify({ t: 'm_guess', choice: st2.correct }));
  await until(() => mock.rows('Rounds').length === 2, 9000);
  S = sc();
  ok('Scores accumulate over rounds (Alice 5/2 rounds, Bob 5, Cara 1)', mock.rows('Scores').length === 3 && S.Alice[1] === 5 && S.Alice[2] === 2 && S.Bob[1] === 5 && S.Cara[1] === 1);
  const at = await tapi(18181, '/alltime');
  ok('/alltime returns all-time totals from sheet, sorted', at.j.enabled && at.j.scores.length === 3 && at.j.scores[2].name === 'Cara' && at.j.scores[0].total_points === 5);
  ok('teacher state reports sheet OK and nothing pending', await until(async () => { const s = (await tapi(18181, '/state')).j.sheets; return s.pending === 0 && !!s.lastOk; }));
  // sheet goes down mid-session -> gameplay continues, writes are queued and retried when back
  await mock.close();
  await tapi(18181, '/phrase', { text: 'Offline phrase' });
  await tapi(18181, '/start', { senderId: c.me.id, seconds: 60 });
  const st3 = (await tapi(18181, '/state')).j.round;
  const k3 = a.msgs.length;
  a.ws.send(JSON.stringify({ t: 'm_guess', choice: st3.correct })); b.ws.send(JSON.stringify({ t: 'm_guess', choice: st3.correct }));
  ok('sheet down: round still plays and ends', !!(await until(() => a.msgs.slice(k3).find((m) => m.t === 'm_end'), 9000)));
  const sd = await until(async () => { const j = (await tapi(18181, '/state')).j; return j.sheets.pending >= 2 && j.sheets.lastError && j; });
  ok('sheet down: writes queued + error shown, local phrase kept', sd && sd.custom.includes('Offline phrase'));
  await tapi(18181, '/sync', {});
  ok('sheet down: sync keeps local phrases (no wipe)', (await tapi(18181, '/state')).j.custom.includes('Offline phrase'));
  mock.server.listen(mport, '127.0.0.1');
  ok('sheet back: queued writes delivered in order', await until(() => mock.rows('Rounds').length === 3 && mock.rows('Phrases').some((r) => r[0] === 'Offline phrase'), 12000));
  ok('sheet back: queue drains', await until(async () => (await tapi(18181, '/state')).j.sheets.pending === 0, 5000));
  a.ws.close(); b.ws.close(); c.ws.close(); await wait(300);
  const full = await runMainTests(18181, 'with sheet');
  ok('original test.js passes with the sheet enabled', full.code === 0 && full.fail === 0);
  ok('server never crashed (sheet mode)', srv.exitCode === null && !/Unhandled|TypeError|ReferenceError/.test(srv.out));

  // ---------- 3. sheet unreachable from the start ----------
  const down = await startServer(18182, { SHEETS_URL: 'http://127.0.0.1:9/macros/s/NOPE/exec', SHEETS_SECRET: SECRET, SHEETS_RETRY_MS: '200', SHEETS_TIMEOUT_MS: '1500' });
  const dn = await runMainTests(18182, 'sheet unreachable');
  ok('unreachable sheet: original test.js still passes', dn.code === 0 && dn.fail === 0);
  const ds = (await tapi(18182, '/state')).j.sheets;
  ok('unreachable sheet: error reported, rounds queued', ds && ds.lastError && ds.pending > 0 && !ds.lastOk);
  const da = await tapi(18182, '/alltime');
  ok('unreachable sheet: /alltime answers with error (no crash)', da.status === 200 && da.j.error && Array.isArray(da.j.scores));
  ok('server never crashed (unreachable)', down.exitCode === null);

  // ---------- 4. wrong secret ----------
  await startServer(18183, { SHEETS_URL: SURL, SHEETS_SECRET: 'wrong-secret', SHEETS_SYNC_MS: '100000' });
  const ws4 = await until(async () => { const s = (await tapi(18183, '/state')).j.sheets; return s.lastError && s; });
  ok('wrong secret rejected by Code.gs and reported', ws4 && /bad secret/.test(ws4.lastError));

  for (const p of procs) p.kill();
  await mock.close().catch(() => {});
  const f = results.filter((r) => !r[1]).length;
  console.log(f ? `${f} FAILED` : `ALL PASSED (${results.length})`); process.exit(f ? 1 : 0);
})().catch((e) => { console.error(e); for (const p of procs) p.kill(); process.exit(1); });
