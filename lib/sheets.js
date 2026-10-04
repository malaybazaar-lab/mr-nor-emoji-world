// Optional Google Sheet sync via an Apps Script Web app (see apps-script/Code.gs).
// Enabled only when SHEETS_URL and SHEETS_SECRET are set. Never throws, never blocks gameplay:
// reads are best-effort, writes go into a small in-memory queue that is retried in the background.
const TIMEOUT_MS = parseInt(process.env.SHEETS_TIMEOUT_MS || '15000', 10);
const RETRY_MS = parseInt(process.env.SHEETS_RETRY_MS || '20000', 10);
const MAX_QUEUE = 500, MAX_TRIES = 30;

function createSheets({ url, secret, log = () => {} } = {}) {
  if (!url || !secret) return null;
  const queue = [];                 // pending writes, processed in order
  let busy = false, retryTimer = null, writeSeq = 0;
  const status = { enabled: true, lastSync: null, lastOk: null, lastError: null, lastErrorAt: null, phrases: null };

  function fail(where, e) { status.lastError = `${where}: ${e && e.message ? e.message : e}`; status.lastErrorAt = Date.now(); log('sheets ' + status.lastError); }
  async function readJson(r) {
    const text = await r.text();
    if (!r.ok) throw new Error('HTTP ' + r.status);
    let j; try { j = JSON.parse(text); } catch { throw new Error('not JSON (is the Web app deployed with access "Anyone"?)'); }
    if (!j || j.ok === false) throw new Error((j && j.reason) || 'error');
    return j;
  }
  async function get(action) {
    const u = new URL(url); u.searchParams.set('action', action); u.searchParams.set('secret', secret);
    return readJson(await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } }));
  }
  async function post(action, data) {
    // text/plain avoids a CORS preflight and is what Apps Script doPost expects; Apps Script answers
    // with a 302 to script.googleusercontent.com which fetch follows (as a GET).
    return readJson(await fetch(url, { method: 'POST', redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'content-type': 'text/plain;charset=utf-8', accept: 'application/json' }, body: JSON.stringify({ ...data, action, secret }) }));
  }

  async function fetchPhrases(attempt = 0) {
    const seq = writeSeq;
    try {
      const j = await get('phrases');
      if (!Array.isArray(j.phrases)) throw new Error('bad phrases response');
      status.lastSync = status.lastOk = Date.now(); status.phrases = j.phrases.length;
      if (seq !== writeSeq) return attempt < 2 ? fetchPhrases(attempt + 1) : null; // a write finished meanwhile: re-read
      // apply writes that are still queued (optimistic local changes) on top of the sheet's list
      let list = j.phrases.filter((p) => typeof p === 'string');
      for (const q of queue) {
        if (q.action === 'addPhrase' && !list.includes(q.data.phrase)) list.push(q.data.phrase);
        if (q.action === 'removePhrase') list = list.filter((p) => p !== q.data.phrase);
      }
      return list;
    } catch (e) { fail('read phrases', e); return null; }
  }
  async function getScores() {
    try { const j = await get('scores'); status.lastOk = Date.now(); return Array.isArray(j.scores) ? j.scores : []; }
    catch (e) { fail('read scores', e); return null; }
  }

  function enqueue(action, data) {
    if (queue.length >= MAX_QUEUE) { const d = queue.shift(); log('sheets queue full, dropped ' + d.action); }
    queue.push({ action, data, tries: 0 });
    pump();
  }
  async function pump() {
    if (busy || !queue.length) return;
    busy = true; clearTimeout(retryTimer); retryTimer = null;
    try {
      while (queue.length) {
        const q = queue[0];
        try { await post(q.action, q.data); queue.shift(); writeSeq++; status.lastOk = Date.now(); }
        catch (e) {
          q.tries++; fail(q.action + ' (try ' + q.tries + ')', e);
          // a definite "no" from the script (bad secret / bad data) will not get better: drop after a few tries
          if (q.tries >= MAX_TRIES) { queue.shift(); log('sheets gave up on ' + q.action); continue; }
          retryTimer = setTimeout(pump, Math.min(RETRY_MS * q.tries, 5 * 60000)); retryTimer.unref && retryTimer.unref();
          break;
        }
      }
    } finally { busy = false; }
  }

  return {
    status: () => ({ ...status, pending: queue.length }),
    fetchPhrases, getScores,
    addPhrase: (phrase) => enqueue('addPhrase', { phrase }),
    removePhrase: (phrase) => enqueue('removePhrase', { phrase }),
    logRound: (round) => enqueue('logRound', { round }),
    flush: pump,
    get pending() { return queue.length; },
  };
}
module.exports = { createSheets };
