/**
 * Mr Nor DnT - School of Design and Technology - Emoji World
 * Google Sheet backend for Decode Missions (phrases, round log, all-time scores).
 *
 * ONE-TIME SETUP
 *  1. Open the Google Sheet "Emoji World Data" > Extensions > Apps Script.
 *  2. Delete any code there, paste this whole file, click Save.
 *  3. Change SECRET below to a long random value (the same value goes into Render as SHEETS_SECRET).
 *  4. Select the function "setup" in the toolbar and click Run (allow the permissions). It creates any missing tabs/headers.
 *  5. Deploy > New deployment > type: Web app. Execute as: Me. Who has access: Anyone. Deploy.
 *     Copy the Web app URL ending in /exec  -> put it into Render as SHEETS_URL.
 *  6. After editing this code later: Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy (URL stays the same).
 *
 * API (every request must include the secret)
 *  GET  ?secret=...&action=phrases          -> {ok:true, phrases:[...active phrases]}
 *  GET  ?secret=...&action=scores           -> {ok:true, scores:[{name,total_points,rounds_played,last_seen}]}
 *  POST body (text/plain JSON) {secret, action, ...}
 *       action=addPhrase    {phrase}
 *       action=removePhrase {phrase}        (sets active = FALSE; the row stays so you can re-enable it)
 *       action=logRound     {round:{...}}   (appends to Rounds + adds points to Scores)
 *       action=getScores
 *       action=phrases
 */
var SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';

var TABS = {
  Phrases: ['phrase', 'active', 'added_at'],
  Rounds: ['timestamp', 'sender', 'phrase', 'emoji_clues', 'winner', 'correct_guessers', 'total_guessers', 'vote_breakdown_json', 'duration_s', 'end_reason'],
  Scores: ['name', 'total_points', 'rounds_played', 'last_seen']
};

/* ---------------- setup ---------------- */
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach(function (name) { ensureTab_(ss, name, TABS[name]); });
  var rm = ss.getSheetByName('ReadMe');
  if (!rm) {
    rm = ss.insertSheet('ReadMe');
    rm.getRange(1, 1, 4, 1).setValues([['Emoji World Data - Mr Nor DnT'], ['Phrases: add a row (phrase, TRUE). Set active to FALSE to hide a phrase.'], ['Rounds and Scores are written by the game after every Decode Mission.'], ['Do not rename the tabs or the header row.']]);
  }
  return 'ok';
}
function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var need = headers.some(function (h, i) { return String(first[i] || '') !== h; });
  if (need) {
    if (sh.getLastRow() === 0 || first.every(function (v) { return v === '' || v === null; })) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (String(first[0]) !== headers[0]) {
      sh.insertRowBefore(1); sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      // add any missing trailing headers (e.g. a column added in a newer version)
      for (var i = 0; i < headers.length; i++) if (String(first[i] || '') === '') sh.getRange(1, i + 1).setValue(headers[i]);
    }
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function tab_(name) { return ensureTab_(SpreadsheetApp.getActive(), name, TABS[name]); }

/* ---------------- helpers ---------------- */
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function authOk_(given) {
  if (!SECRET || SECRET === 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET') return false;
  given = String(given || '');
  if (given.length !== SECRET.length) return false;
  var diff = 0;
  for (var i = 0; i < SECRET.length; i++) diff |= given.charCodeAt(i) ^ SECRET.charCodeAt(i);
  return diff === 0;
}
// stop text being interpreted as a formula (=, +, -, @) and limit length
function safe_(s, max) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function cleanPhrase_(s) {
  var t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return t.length >= 3 ? t : null;
}
function isTrue_(v) { return v === true || /^(true|yes|y|1)$/i.test(String(v).trim()); }
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, reason: 'busy, try again' };
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------- actions ---------------- */
function activePhrases_() {
  var sh = tab_('Phrases'), n = sh.getLastRow();
  if (n < 2) return [];
  var rows = sh.getRange(2, 1, n - 1, 2).getValues(), seen = {}, list = [];
  rows.forEach(function (r) {
    var p = cleanPhrase_(String(r[0]).replace(/^'/, ''));
    var active = r[1] === '' || r[1] === null ? true : isTrue_(r[1]); // blank = active
    if (p && active && !seen[p]) { seen[p] = 1; list.push(p); }
  });
  return list;
}
function findPhraseRow_(sh, p) {
  var n = sh.getLastRow(); if (n < 2) return -1;
  var col = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) if (String(col[i][0]).replace(/^'/, '').trim() === p) return i + 2;
  return -1;
}
function addPhrase_(phrase) {
  var p = cleanPhrase_(phrase); if (!p) return { ok: false, reason: 'phrase must be 3-80 characters' };
  return withLock_(function () {
    var sh = tab_('Phrases'), row = findPhraseRow_(sh, p);
    if (row > 0) sh.getRange(row, 2).setValue(true);
    else sh.appendRow([safe_(p, 80), true, new Date()]);
    return { ok: true, phrase: p };
  });
}
function removePhrase_(phrase) {
  var p = cleanPhrase_(phrase); if (!p) return { ok: false, reason: 'bad phrase' };
  return withLock_(function () {
    var sh = tab_('Phrases'), row = findPhraseRow_(sh, p);
    if (row > 0) sh.getRange(row, 2).setValue(false);
    return { ok: true, found: row > 0 };
  });
}
function logRound_(r) {
  if (!r || typeof r !== 'object') return { ok: false, reason: 'missing round' };
  return withLock_(function () {
    var now = new Date();
    var ts = r.timestamp ? new Date(r.timestamp) : now; if (isNaN(ts.getTime())) ts = now;
    var clues = Array.isArray(r.clues) ? r.clues.join(' ') : String(r.clues || '');
    var correct = Array.isArray(r.correctNames) ? r.correctNames : [];
    tab_('Rounds').appendRow([ts, safe_(r.senderName, 40), safe_(r.phrase, 100), safe_(clues, 1000), safe_(r.winner || '', 40),
      safe_(correct.join(', '), 1000), Number(r.totalGuessers) || 0, safe_(JSON.stringify(r.dist || []), 5000), Number(r.durationS) || 0, safe_(r.reason || '', 20)]);
    // upsert Scores: everyone who took part gets rounds_played +1; points added from r.points
    var add = {};
    (Array.isArray(r.participants) ? r.participants : []).forEach(function (n) { n = String(n).slice(0, 40); if (n) add[n] = add[n] || { pts: 0 }; });
    (Array.isArray(r.points) ? r.points : []).forEach(function (p) { var n = String(p.name || '').slice(0, 40); if (!n) return; add[n] = add[n] || { pts: 0 }; add[n].pts += Number(p.pts) || 0; });
    var sh = tab_('Scores'), last = sh.getLastRow();
    var rows = last >= 2 ? sh.getRange(2, 1, last - 1, 4).getValues() : [];
    var idx = {}; rows.forEach(function (row, i) { idx[String(row[0]).replace(/^'/, '')] = i; });
    var appended = [];
    Object.keys(add).forEach(function (n) {
      if (idx.hasOwnProperty(n)) { var row = rows[idx[n]]; row[1] = (Number(row[1]) || 0) + add[n].pts; row[2] = (Number(row[2]) || 0) + 1; row[3] = now; }
      else appended.push([safe_(n, 40), add[n].pts, 1, now]);
    });
    if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
    if (appended.length) sh.getRange(sh.getLastRow() + 1, 1, appended.length, 4).setValues(appended);
    return { ok: true, updated: Object.keys(add).length };
  });
}
function scores_() {
  var sh = tab_('Scores'), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 4).getValues().filter(function (r) { return String(r[0]).trim(); }).map(function (r) {
    return { name: String(r[0]).replace(/^'/, ''), total_points: Number(r[1]) || 0, rounds_played: Number(r[2]) || 0, last_seen: r[3] instanceof Date ? r[3].toISOString() : String(r[3] || '') };
  }).sort(function (a, b) { return b.total_points - a.total_points || a.name.localeCompare(b.name); });
}

/* ---------------- web app entry points ---------------- */
function handle_(action, d) {
  switch (action) {
    case 'phrases': return { ok: true, phrases: activePhrases_() };
    case 'scores': case 'getScores': return { ok: true, scores: scores_() };
    case 'addPhrase': return addPhrase_(d.phrase);
    case 'removePhrase': return removePhrase_(d.phrase);
    case 'logRound': return logRound_(d.round);
    case 'ping': return { ok: true };
    default: return { ok: false, reason: 'unknown action' };
  }
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!authOk_(p.secret)) return out_({ ok: false, reason: 'bad secret' });
  var a = p.action || 'phrases';
  if (['phrases', 'scores', 'getScores', 'ping'].indexOf(a) < 0) return out_({ ok: false, reason: 'use POST for ' + a });
  try { return out_(handle_(a, p)); } catch (err) { return out_({ ok: false, reason: String(err) }); }
}
function doPost(e) {
  var d = {};
  try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out_({ ok: false, reason: 'bad JSON' }); }
  if (!authOk_(d.secret)) return out_({ ok: false, reason: 'bad secret' });
  try { return out_(handle_(d.action, d)); } catch (err) { return out_({ ok: false, reason: String(err) }); }
}
