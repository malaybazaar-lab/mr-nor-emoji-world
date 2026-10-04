// Decode Missions: server-authoritative emoji guessing rounds.
// A Sender sees a secret phrase and sends emoji-only clues; everyone else picks 1 of 4 options.
const fs = require('fs');
const path = require('path');
const BUILTIN = require('./phrases');

const ROUND_MS = parseInt(process.env.MISSION_SECONDS || '90', 10) * 1000;
const GRACE_MS = parseInt(process.env.MISSION_GRACE_MS || '5000', 10); // after first correct guess, others get a few seconds
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PHRASE_FILE = path.join(DATA_DIR, 'custom-phrases.json');
const MAX_CUSTOM = 200;

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function cleanPhrase(s) {
  if (typeof s !== 'string') return null;
  const t = s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return t.length >= 3 ? t : null;
}

function createMissions({ players, send, broadcast, nearBoard, log = () => {}, sheets = null }) {
  let custom = [], mode = 'mixed';
  try {
    const d = JSON.parse(fs.readFileSync(PHRASE_FILE, 'utf8'));
    if (Array.isArray(d.custom)) custom = d.custom.map(cleanPhrase).filter(Boolean).slice(0, MAX_CUSTOM);
    if (d.mode === 'custom' || d.mode === 'mixed') mode = d.mode;
  } catch {}
  function persist() {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PHRASE_FILE, JSON.stringify({ custom, mode }, null, 2)); return true; }
    catch (e) { log('could not save phrases: ' + e.message); return false; }
  }

  const scores = new Map();          // name -> points (session only)
  let round = null, nextRoundId = 1, lastResult = null;
  const recent = [];                 // recently used phrases, avoid repeats

  const leaderboard = (n = 5) => [...scores.entries()].map(([name, pts]) => ({ name, pts })).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)).slice(0, n);
  function pools() {
    const all = [...new Set([...BUILTIN, ...custom])];
    if (mode === 'custom' && custom.length) return { secret: custom, distract: custom.length >= 4 ? custom : all };
    return { secret: all, distract: all };
  }
  function guessers() { return [...players.values()].filter((p) => round && p.id !== round.senderId); }
  function publicRound(forId) {
    if (!round) return null;
    const g = round.guesses.get(forId);
    const o = { id: round.id, senderId: round.senderId, senderName: round.senderName, options: round.options, left: Math.max(0, round.endsAt - Date.now()),
      duration: round.duration, clues: round.clues.map((c) => c.text), guessed: round.guesses.size, total: guessers().length, grace: !!round.graceTimer,
      yourGuess: g ? g.choice : null };
    if (forId === round.senderId) o.secret = round.phrase;
    return o;
  }
  function sendRoundTo(p) { send(p.ws, { t: 'm_round', r: publicRound(p.id) }); }
  function broadcastProgress() { if (round) broadcast({ t: 'm_progress', guessed: round.guesses.size, total: guessers().length, grace: !!round.graceTimer, left: Math.max(0, round.endsAt - Date.now()) }); }

  function start(sender, duration = ROUND_MS) {
    if (round) return { ok: false, reason: 'a mission is already running' };
    if (!sender) return { ok: false, reason: 'no sender' };
    if (players.size < 2) return { ok: false, reason: 'need at least 2 players' };
    const { secret, distract } = pools();
    let choices = secret.filter((p) => !recent.includes(p)); if (!choices.length) choices = secret;
    const phrase = choices[Math.floor(Math.random() * choices.length)];
    recent.push(phrase); while (recent.length > Math.min(8, Math.floor(secret.length / 2))) recent.shift();
    const options = shuffle([phrase, ...shuffle(distract.filter((p) => p !== phrase)).slice(0, 3)]);
    duration = Math.max(10000, Math.min(300000, duration | 0 || ROUND_MS));
    round = { id: nextRoundId++, phrase, options, correct: options.indexOf(phrase), senderId: sender.id, senderName: sender.name, startedAt: Date.now(),
      endsAt: Date.now() + duration, duration, clues: [], guesses: new Map(), order: [], timer: null, graceTimer: null };
    round.timer = setTimeout(() => end('timeout'), duration);
    for (const p of players.values()) sendRoundTo(p);
    log(`mission ${round.id} start sender=${sender.name}`);
    return { ok: true, id: round.id };
  }

  function end(reason) {
    if (!round) return null;
    const r = round; round = null;
    clearTimeout(r.timer); clearTimeout(r.graceTimer);
    const correct = r.order.filter((id) => r.guesses.get(id).correct).map((id) => r.guesses.get(id));
    const points = [];
    correct.forEach((g, i) => points.push({ name: g.name, pts: i === 0 ? 3 : 1 }));
    if (correct.length) points.push({ name: r.senderName, pts: 2, sender: true });
    for (const { name, pts } of points) scores.set(name, (scores.get(name) || 0) + pts);
    const dist = r.options.map((text, i) => ({ text, correct: i === r.correct, count: 0, names: [] }));
    for (const id of r.order) { const g = r.guesses.get(id); dist[g.choice].count++; dist[g.choice].names.push(g.name); }
    lastResult = { id: r.id, reason, phrase: r.phrase, senderName: r.senderName, clues: r.clues.map((c) => c.text), winner: correct[0] ? correct[0].name : null,
      correctNames: correct.map((g) => g.name), points, dist, guessed: r.order.length, leaderboard: leaderboard(), endedAt: Date.now() };
    broadcast({ t: 'm_end', res: lastResult });
    if (sheets) {
      const total = [...players.values()].filter((p) => p.id !== r.senderId).length;
      sheets.logRound({ timestamp: new Date(r.startedAt).toISOString(), senderName: r.senderName, phrase: r.phrase, clues: lastResult.clues,
        winner: lastResult.winner, correctNames: lastResult.correctNames, totalGuessers: Math.max(total, r.order.length),
        dist: dist.map((d) => ({ text: d.text, correct: d.correct, count: d.count, names: d.names })),
        durationS: Math.round((Date.now() - r.startedAt) / 1000), reason, points,
        participants: [r.senderName, ...r.order.map((id) => r.guesses.get(id).name)] });
    }
    log(`mission ${r.id} end ${reason} winner=${lastResult.winner || '-'}`);
    return lastResult;
  }

  function checkAllGuessed() {
    if (!round) return;
    const gs = guessers();
    if (gs.length && gs.every((p) => round.guesses.has(p.id))) end(round.order.some((id) => round.guesses.get(id).correct) ? 'decoded' : 'all_guessed');
  }

  // ---- player websocket messages; returns true if handled ----
  function onMessage(me, m) {
    const rej = (reason) => send(me.ws, { t: 'reject', reason });
    switch (m.t) {
      case 'm_state': sendRoundTo(me); send(me.ws, { t: 'm_board', top: leaderboard(), last: lastResult }); return true;
      case 'm_board': send(me.ws, { t: 'm_board', top: leaderboard(), last: lastResult }); return true;
      case 'm_sender': {
        if (!nearBoard(me)) return rej('walk up to the Mission Board first'), true;
        const r = start(me);
        if (!r.ok) rej(r.reason);
        return true;
      }
      case 'm_guess': {
        if (!round) return rej('no mission running'), true;
        if (me.id === round.senderId) return rej('the sender cannot guess'), true;
        if (round.guesses.has(me.id)) return rej('you already guessed this round'), true;
        const c = m.choice;
        if (!Number.isInteger(c) || c < 0 || c >= round.options.length) return rej('pick one of the 4 options'), true;
        const g = { name: me.name, choice: c, correct: c === round.correct, at: Date.now() };
        const first = g.correct && !round.order.some((id) => round.guesses.get(id).correct);
        round.guesses.set(me.id, g); round.order.push(me.id);
        send(me.ws, { t: 'm_guessed', choice: c, correct: g.correct });
        if (first && GRACE_MS > 0) {
          clearTimeout(round.timer);
          round.endsAt = Math.min(round.endsAt, Date.now() + GRACE_MS);
          const rid = round.id;
          round.graceTimer = setTimeout(() => { if (round && round.id === rid) end('decoded'); }, Math.max(0, round.endsAt - Date.now()));
        } else if (first) { end('decoded'); return true; }
        broadcastProgress();
        checkAllGuessed();
        return true;
      }
    }
    return false;
  }
  // called after a chat message passed emoji validation
  function onChat(me, text) {
    if (!round || me.id !== round.senderId) return;
    if (round.clues.length >= 30) return;
    round.clues.push({ text, at: Date.now() });
    broadcast({ t: 'm_clue', text, n: round.clues.length });
  }
  function onJoin(p) { sendRoundTo(p); if (round) broadcastProgress(); }
  function onLeave(p) {
    if (!round) return;
    if (p.id === round.senderId) return void end('sender_left');
    broadcastProgress(); checkAllGuessed();
  }

  // ---- teacher API ----
  function teacherState() {
    const r = round && { id: round.id, phrase: round.phrase, options: round.options, correct: round.correct, senderId: round.senderId, senderName: round.senderName,
      left: Math.max(0, round.endsAt - Date.now()), duration: round.duration, clues: round.clues.map((c) => c.text), grace: !!round.graceTimer,
      guessed: round.guesses.size, total: guessers().length,
      dist: round.options.map((text, i) => ({ text, count: [...round.guesses.values()].filter((g) => g.choice === i).length })) };
    return { round: r, last: lastResult, leaderboard: leaderboard(10), custom, mode, builtinCount: BUILTIN.length, roundSeconds: ROUND_MS / 1000,
      players: [...players.values()].map((p) => ({ id: p.id, name: p.name })), ...(sheets ? { sheets: sheets.status() } : {}) };
  }
  function addPhrase(t) {
    const p = cleanPhrase(t); if (!p) return { ok: false, reason: 'phrase must be 3-80 characters' };
    if (custom.length >= MAX_CUSTOM) return { ok: false, reason: 'too many phrases' };
    if (!custom.includes(p)) custom.push(p);
    if (sheets) sheets.addPhrase(p);   // optimistic: local list is already updated, sheet write is queued/retried
    return { ok: true, saved: persist() };
  }
  function removePhrase(t) {
    const i = custom.indexOf(t); if (i < 0) return { ok: false, reason: 'not found' };
    custom.splice(i, 1);
    if (sheets) sheets.removePhrase(t);
    return { ok: true, saved: persist() };
  }
  // replace the custom list with the sheet's active phrases (no-op when the sheet is off or unreachable)
  let syncing = null;
  function syncPhrases() {
    if (!sheets) return Promise.resolve(false);
    if (syncing) return syncing;
    syncing = (async () => {
      try {
        const list = await sheets.fetchPhrases();
        if (!list) return false;
        const next = [...new Set(list.map(cleanPhrase).filter(Boolean))].slice(0, MAX_CUSTOM);
        if (JSON.stringify(next) !== JSON.stringify(custom)) { custom = next; persist(); log(`sheets: ${custom.length} phrases loaded`); }
        return true;
      } catch (e) { log('sheets sync error: ' + e.message); return false; } finally { syncing = null; }
    })();
    return syncing;
  }
  function setMode(m) { if (m !== 'custom' && m !== 'mixed') return { ok: false, reason: 'mode must be custom or mixed' }; mode = m; return { ok: true, saved: persist() }; }
  function teacherStart(senderId, seconds) {
    let s = senderId != null ? players.get(Number(senderId)) : null;
    if (!s) { const list = [...players.values()]; s = list[Math.floor(Math.random() * list.length)]; }
    return start(s, seconds ? seconds * 1000 : ROUND_MS);
  }
  function stop() { return round ? { ok: true, res: end('stopped') } : { ok: false, reason: 'no mission running' }; }
  function resetScores() { scores.clear(); lastResult = null; broadcast({ t: 'm_board', top: [], last: null }); return { ok: true }; }

  return { onMessage, onChat, onJoin, onLeave, teacherState, addPhrase, removePhrase, syncPhrases, setMode, teacherStart, stop, resetScores, get active() { return !!round; } };
}
module.exports = { createMissions, BUILTIN };
