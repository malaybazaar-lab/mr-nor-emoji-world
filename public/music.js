// Background music: "Ghost Dance" by Mr Nor Dnt, looped quietly.
// - Unlocked inside the Join tap (mobile autoplay rules / iOS), playback starts when the world appears.
// - Web Audio (AudioBufferSourceNode, loop=true) so the volume works on iOS (audio.volume is read-only there)
//   and the loop is gapless: leading/trailing digital silence is trimmed via loopStart/loopEnd.
// - Falls back to <audio loop playsinline> if Web Audio is missing or decoding fails.
// - Pauses while the tab is hidden; mute is remembered in localStorage ('ew_music_muted').
(() => {
  'use strict';
  const SRC = 'audio/ghostdance.mp3', VOLUME = 0.22, KEY = 'ew_music_muted';
  const AC = window.AudioContext || window.webkitAudioContext;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }
  let ac = null, gain = null, buf = null, node = null, loopStart = 0, loopEnd = 0;
  let el = null, wanted = false, unlocked = false, fetchP = null, suspendT = 0;

  const desired = () => wanted && !muted && !document.hidden;
  function fetchBuf() { if (!fetchP) fetchP = fetch(SRC).then((r) => { if (!r.ok) throw new Error('music ' + r.status); return r.arrayBuffer(); }); return fetchP; }
  function decode(ab) { // old Safari: callback-only decodeAudioData
    return new Promise((res, rej) => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
  }
  // find first/last audible sample (MP3 has no gapless header: ~0.46s of silence before the fade-in, ~30ms after the fade-out)
  function trim(b) {
    const TH = 0.0005, n = b.length; let first = n, last = 0;
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      let i = 0; while (i < first && Math.abs(d[i]) < TH) i++; first = Math.min(first, i);
      let j = n - 1; while (j > last && Math.abs(d[j]) < TH) j--; last = Math.max(last, j);
    }
    if (last <= first) { loopStart = 0; loopEnd = b.duration; return; }
    const pad = Math.round(0.005 * b.sampleRate);
    loopStart = Math.max(0, first - pad) / b.sampleRate; loopEnd = Math.min(n, last + pad) / b.sampleRate;
  }
  function useElement() {
    if (el) return el;
    el = document.createElement('audio');
    el.src = SRC; el.loop = true; el.preload = 'auto'; el.volume = VOLUME;
    el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', ''); el.playsInline = true;
    el.style.display = 'none'; document.body.appendChild(el);
    return el;
  }
  function apply() {
    const on = desired();
    if (ac && buf) {
      clearTimeout(suspendT);
      if (on) {
        if (ac.state !== 'running' && ac.resume) ac.resume().catch(() => {});
        if (!node) {
          node = ac.createBufferSource(); node.buffer = buf; node.loop = true;
          node.loopStart = loopStart; node.loopEnd = loopEnd; node.connect(gain);
          node.start(0, loopStart);
        }
        gain.gain.cancelScheduledValues(ac.currentTime); gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
        gain.gain.linearRampToValueAtTime(VOLUME, ac.currentTime + 0.4);
      } else if (node) {
        gain.gain.cancelScheduledValues(ac.currentTime); gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.08);
        suspendT = setTimeout(() => { if (!desired() && ac.state === 'running' && ac.suspend) ac.suspend().catch(() => {}); }, document.hidden ? 0 : 150);
      }
    } else if (el) {
      if (on) { if (el.paused) el.play().catch(() => {}); } else if (!el.paused) el.pause();
    }
  }
  // Must be called synchronously inside a user gesture (the Join tap / Enter).
  function unlock() {
    if (unlocked) return; unlocked = true;
    if (AC) { try { ac = new AC(); } catch (e) { ac = null; } }
    if (ac) {
      gain = ac.createGain(); gain.gain.value = 0; gain.connect(ac.destination);
      try { const s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 1, 22050); s.connect(ac.destination); s.start(0); } catch (e) { /* ignore */ }
      if (ac.resume) ac.resume().catch(() => {});
      fetchBuf().then(decode).then((b) => { buf = b; trim(b); apply(); })
        .catch(() => { try { ac.close(); } catch (e) { /* ignore */ } ac = null; useElement(); apply(); });
    } else {
      // <audio> fallback: play+pause inside the gesture unlocks it on iOS
      const a = useElement();
      const p = a.play(); if (p && p.then) p.then(() => { if (!desired()) a.pause(); }, () => {});
    }
  }
  function start() { wanted = true; apply(); }
  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!unlocked && !muted) unlock(); // the mute button tap is a user gesture too
    apply(); render();
  }
  function render() {
    const b = document.getElementById('mute'); if (!b) return;
    b.textContent = muted ? '🔇' : '🔊';
    b.title = muted ? 'Music off - tap to play' : 'Music on - tap to mute';
    b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', String(muted));
  }
  document.addEventListener('visibilitychange', apply);
  addEventListener('pagehide', () => { if (ac && ac.state === 'running' && ac.suspend) ac.suspend().catch(() => {}); if (el) el.pause(); });
  addEventListener('pageshow', apply);
  // iOS can interrupt/suspend the context (calls, Siri, other audio): any later tap/key resumes it.
  const kick = () => { if (!desired()) return; if (ac && buf && ac.state !== 'running') apply(); else if (el && el.paused) el.play().catch(() => {}); };
  addEventListener('pointerdown', kick, true); addEventListener('keydown', kick, true);
  if (!muted) fetchBuf().catch(() => {}); // prefetch (~270 KB) so playback starts right after Join

  window.EWMusic = {
    unlock, start, setMuted, render, toggle: () => setMuted(!muted), get muted() { return muted; },
    get state() { return { engine: ac && buf ? 'webaudio' : el ? 'element' : 'none', ctx: ac && ac.state, playing: ac && buf ? !!node && ac.state === 'running' && !muted : el ? !el.paused : false, volume: VOLUME, loopStart, loopEnd, muted, wanted }; },
  };
})();
