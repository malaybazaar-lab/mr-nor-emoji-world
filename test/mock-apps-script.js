// Mock of a deployed Apps Script Web app: runs the REAL apps-script/Code.gs inside a Node vm
// with a tiny in-memory fake of SpreadsheetApp / LockService / ContentService, and mimics Google's
// behaviour of answering /exec with a 302 redirect to a googleusercontent-style "echo" URL.
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function fakeSheet(name) {
  const rows = [];
  const cell = (r, c) => (rows[r - 1] && rows[r - 1][c - 1] !== undefined ? rows[r - 1][c - 1] : '');
  const put = (r, c, v) => { while (rows.length < r) rows.push([]); rows[r - 1][c - 1] = v; };
  const sh = {
    name, rows,
    getLastRow: () => { for (let i = rows.length; i > 0; i--) if (rows[i - 1].some((v) => v !== '' && v != null)) return i; return 0; },
    appendRow: (vals) => { const r = sh.getLastRow() + 1; vals.forEach((v, i) => put(r, i + 1, v)); },
    insertRowBefore: (r) => { rows.splice(r - 1, 0, []); },
    setFrozenRows: () => {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r + i, c + j))),
      setValues: (v) => { v.forEach((row, i) => row.forEach((x, j) => put(r + i, c + j, x))); },
      setValue: (x) => put(r, c, x),
      setFontWeight: () => {},
    }),
  };
  return sh;
}

function createMock({ secret, initialPhrases = [] } = {}) {
  const tabs = new Map();
  const ss = { getSheetByName: (n) => tabs.get(n) || null, insertSheet: (n) => { const s = fakeSheet(n); tabs.set(n, s); return s; } };
  const ctx = {
    SpreadsheetApp: { getActive: () => ss },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    Date, JSON, String, Number, Array, Object, isNaN, Math,
  };
  let code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  code = code.replace(/var SECRET = '[^']*';/, `var SECRET = ${JSON.stringify(secret)};`);
  vm.createContext(ctx); vm.runInContext(code, ctx);
  ctx.setup();
  for (const [p, a] of initialPhrases) tabs.get('Phrases').appendRow([p, a, new Date()]);

  const log = [];             // every request the "script" received
  const echoes = new Map(); let n = 0;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/echo') {   // like script.googleusercontent.com/macros/echo?user_content_key=...
      const body = echoes.get(u.searchParams.get('k')); echoes.delete(u.searchParams.get('k'));
      if (!body) { res.writeHead(404); return res.end('gone'); }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); return res.end(body);
    }
    if (u.pathname !== '/macros/s/MOCK/exec') { res.writeHead(404); return res.end('not found'); }
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      let out;
      if (req.method === 'POST') {
        log.push({ method: 'POST', contentType: req.headers['content-type'], body: (() => { try { return JSON.parse(raw); } catch { return raw; } })() });
        out = ctx.doPost({ postData: { contents: raw, type: req.headers['content-type'] } });
      } else {
        const parameter = Object.fromEntries(u.searchParams);
        log.push({ method: 'GET', query: parameter });
        out = ctx.doGet({ parameter });
      }
      const k = String(++n); echoes.set(k, out.text);
      res.writeHead(302, { location: `/echo?k=${k}` }); res.end();
    });
  });
  return {
    server, log, tabs, ctx,
    listen: (port = 0) => new Promise((r) => server.listen(port, '127.0.0.1', () => r(server.address().port))),
    close: () => new Promise((r) => server.close(r)),
    rows: (tab) => { const s = tabs.get(tab); return s.rows.slice(1, s.getLastRow()); },
  };
}
module.exports = { createMock };
