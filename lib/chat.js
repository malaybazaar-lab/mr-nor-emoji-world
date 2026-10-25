// Public text chat: cleaning + safety filter (profanity incl. Singlish/Malay + leetspeak/spacing, links, phone numbers, emails).
(function () {
'use strict';
const MAX_LEN = 140;
// whole-word (after normalisation) bad words
const WORD = ['ass','arse','cb','ccb','lj','knn','kns','nb','fk','fuk','fck','fcuk','wtf','stfu','gay','homo','lesbo','sex','sexy','nude','nudes','boobs','tits','dick','cock','puki','babi','sial','bodoh','pantat','lancau','butoh','bangsat','anjing','celaka','sohai','diu','hamsup','cibai','chibai','kanasai','pundek','pukimak','kepala bapak','die','kys','kill','loser','idiot','stupid','dumb','ugly','fatso','retard','retarded','noob','bitch','slut','whore','hoe','bastard','twat','prick','wank','wanker','porn','horny','rape','nazi','hitler','shut up'];
// substrings (safe to match inside words / after removing spaces)
const SUB = ['fuck','fuk','fck','shit','bitch','cunt','pussy','penis','vagina','nigg','fagg','faggot','retard','asshole','motherf','pukimak','kanina','kannina','cheebai','chibai','jibai','lanjiao','lanjio','nabei','kimak','pundek','butoh','lancau','bangsat','porn','whore','slut','dickhead','wanker','killyourself','gotodie','godie','kepalabapak','bodoh','sohai','cibai'];
// short substrings must not be checked against squashed text (would hit "class", "scunthorpe"...): handled via WORD list
const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g', '+': 't', '(': 'c', '¢': 'c', '€': 'e' };
function norm(s) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[0-9!|@$+(¢€]/g, (c) => LEET[c] || c);
}
const ZW = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u00AD]/g;
const CTRL = /[\u0000-\u001F\u007F-\u009F]/g;
function clean(raw) {
  let s = String(raw == null ? '' : raw).replace(CTRL, ' ').replace(ZW, '');
  s = s.replace(/\s+/g, ' ').trim();
  // collapse silly repeats (aaaaaaa -> aaa, !!!!!! -> !!!)
  s = s.replace(/(.)\1{3,}/gu, '$1$1$1');
  return s;
}
function hasProfanity(text) {
  const n = norm(text);
  const words = n.split(/[^a-z]+/).filter(Boolean);
  const wordsSq = words.map((w) => w.replace(/(.)\1+/g, '$1'));
  const joined = ' ' + words.join(' ') + ' ';
  for (const w of WORD) {
    if (w.includes(' ')) { if (joined.includes(' ' + w + ' ')) return true; continue; }
    if (words.includes(w) || wordsSq.includes(w)) return true;
  }
  const letters = n.replace(/[^a-z]/g, ''), sq = letters.replace(/(.)\1+/g, '$1');
  // spaced-out letters: "f u c k" -> join runs of single letters
  const singles = n.split(/[^a-z]+/).filter(Boolean).reduce((acc, w) => { if (w.length === 1) acc[acc.length - 1] += w; else acc.push(w, ''); return acc; }, ['']).filter((x) => x.length >= 2);
  for (const b of SUB) if (letters.includes(b) || sq.includes(b)) return true;
  for (const sgl of singles) for (const w of WORD) if (sgl === w) return true;
  return false;
}
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\s*(\.|\(dot\)|\[dot\]| dot )\s*(com|net|org|sg|io|me|ly|gg|co|tv|xyz|app|link|info|edu|gov|tk|be|to|in|my|site|online|shop|club|page|ee)\b|\b(bit\.ly|t\.me|wa\.me|discord\.gg|tinyurl|linktr\.ee)\b)/i;
const EMAIL_RE = /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\s*\.\s*[a-z]{2,}/i;
function hasPhone(s) {
  const digits = s.replace(/[\s\-().+]/g, '');
  if (/\d{7,}/.test(digits)) return true;           // 8-digit SG numbers, +65 ...
  return /(\d[\s\-.]?){8,}/.test(s);
}
const SPELLED = /\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/gi;
function check(raw) {
  const pre = String(raw == null ? '' : raw).replace(CTRL, ' ').replace(ZW, '').replace(/\s+/g, ' ').trim();
  if ([...pre].length > MAX_LEN) return { ok: false, reason: `max ${MAX_LEN} characters` };
  const text = clean(raw);
  if (!text) return { ok: false, reason: 'empty message' };
  if ([...text].length > MAX_LEN) return { ok: false, reason: `max ${MAX_LEN} characters` };
  if (URL_RE.test(text)) return { ok: false, reason: 'links are not allowed in chat' };
  if (EMAIL_RE.test(text)) return { ok: false, reason: 'no email addresses please (stay safe!)' };
  if (hasPhone(text) || (text.match(SPELLED) || []).length >= 7) return { ok: false, reason: 'no phone numbers please (stay safe!)' };
  if (hasProfanity(text)) return { ok: false, reason: 'please be kind - that word is not allowed', bad: true };
  return { ok: true, text };
}
const api = { check, clean, hasProfanity, MAX_LEN };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.ChatFilter = api;
})();
