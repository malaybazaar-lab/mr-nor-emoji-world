// Headless test: node test.js [ws-url]
const WebSocket = require('ws');
const URL = process.argv[2] || 'ws://localhost:8080/ws';
const results = []; const ok = (n, c) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
  b.ws.close(); await wait(400);
  ok('A sees B left', a.msgs.some((m) => m.t === 'left' && m.name === 'Bob'));
  a.ws.close();
  const f = results.filter((r) => !r[1]).length;
  console.log(f ? `${f} FAILED` : 'ALL PASSED'); process.exit(f ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
