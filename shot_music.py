# Playwright check of the music credit / mute overlay: python3 shot_music.py [http://localhost:8080]
# Saves screenshot-music.png (phone, portrait) and prints overlap checks + audio state.
import asyncio, sys, json, urllib.request
from playwright.async_api import async_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080').rstrip('/')
def tapi(path, body=None):
    req = urllib.request.Request(BASE + '/teacher/api' + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'content-type': 'application/json', 'x-teacher-pin': '1234'}, method='POST' if body is not None else 'GET')
    return json.load(urllib.request.urlopen(req))
BOXES = """() => { const r = {}; for (const id of ['music','music-link','mute','hud','count','trophy','chat','mstrip','dpad','ab','banners']) {
  const e = document.getElementById(id); if (!e || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue;
  const b = e.getBoundingClientRect(); if (b.width && b.height) r[id] = [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; } return r; }"""
def overlaps(bx):
    mine = ['music', 'hud']; out = []
    for a in mine:
        for k, b in bx.items():
            if k in ('music-link', 'mute', 'count', 'trophy') or k == a or (a, k) == ('hud', 'music'): continue
            A = bx.get(a)
            if A and A[0] < b[2] and b[0] < A[2] and A[1] < b[3] and b[1] < A[3]: out.append(f'{a}x{k}')
    return out
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=['--autoplay-policy=user-gesture-required'])
        fails = []
        bc = await b.new_context(viewport={'width': 800, 'height': 600}); bp = await bc.new_page()  # 2nd player so missions can start
        await bp.goto(BASE + '/'); await bp.fill('#name', 'Buddy'); await bp.click('#go'); await bp.wait_for_selector('#chat:not(.hidden)')
        for name, vp, mob in [('phone', (390, 844), True), ('small-phone', (360, 640), True), ('landscape', (844, 390), True), ('desktop', (1100, 700), False), ('desktop-narrow', (900, 700), False)]:
            c = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
            p = await c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
            await p.goto(BASE + '/'); await p.fill('#name', 'Nor' + name[:3]); await p.click('#go')
            await p.wait_for_selector('#chat:not(.hidden)', timeout=15000); await p.wait_for_timeout(1200)
            st = await p.evaluate('EWMusic.state'); txt = await p.inner_text('#music-link')
            link = await p.evaluate("(() => { const a = document.getElementById('music-link'); return [a.textContent, a.href, a.target, a.rel]; })()")
            bx = await p.evaluate(BOXES); ov = overlaps(bx)
            print(f'[{name}] audio={st} link={link} overlaps={ov} boxes={bx} errors={errs}')
            if link[0] != '🎵 Ghost Dance by Mr Nor Dnt': fails.append(name + ' text')
            if ov: fails.append(name + ' overlap ' + ','.join(ov))
            if not st['playing'] or st['engine'] != 'webaudio': fails.append(name + ' not playing')
            if errs: fails.append(name + ' errors')
            if name == 'phone':
                await p.screenshot(path='screenshot-music.png')
                pos0 = await p.evaluate('[__ew.me.x, __ew.me.y]')
                await p.tap('#mute'); await p.wait_for_timeout(400)
                s1 = await p.evaluate('[EWMusic.state, localStorage.getItem("ew_music_muted"), document.getElementById("mute").textContent, document.getElementById("picker").classList.contains("hidden"), [__ew.me.x, __ew.me.y]]')
                print('after mute tap:', s1)
                if s1[0]['playing'] or s1[1] != '1' or s1[2] != '🔇' or not s1[3] or s1[4] != pos0: fails.append('mute')
                await p.reload(); await p.fill('#name', 'Norpho'); await p.click('#go'); await p.wait_for_selector('#chat:not(.hidden)'); await p.wait_for_timeout(800)
                s2 = await p.evaluate('[EWMusic.state.playing, EWMusic.muted, document.getElementById("mute").textContent]')
                print('after reload (muted remembered):', s2)
                if s2 != [False, True, '🔇']: fails.append('mute persist')
                await p.tap('#mute'); await p.wait_for_timeout(600)
                s3 = await p.evaluate('EWMusic.state'); print('after unmute:', s3)
                if not s3['playing']: fails.append('unmute')
                # tab hidden -> paused, visible -> resumed
                await p.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(400)
                h = await p.evaluate('EWMusic.state.ctx')
                await p.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(400)
                v = await p.evaluate('EWMusic.state.ctx'); print('hidden ->', h, ' visible ->', v)
                if h != 'suspended' or v != 'running': fails.append('visibility')
                # tapping the link opens a new tab, no picker / movement
                async with c.expect_page() as np: await p.tap('#music-link')
                newp = await np.value; print('link opened:', newp.url)
                s4 = await p.evaluate('document.getElementById("picker").classList.contains("hidden")')
                if not s4: fails.append('link triggered picker')
            if name in ('phone', 'desktop-narrow', 'landscape'):
                # mission strip visible too
                pid = None
                try:
                    print('start:', tapi('/start', {'seconds': 60})); await p.wait_for_timeout(700)
                    bx = await p.evaluate(BOXES); ov = overlaps(bx); print(f'[{name} +mission] overlaps={ov} mstrip={bx.get("mstrip")}')
                    if ov: fails.append(name + ' mission overlap ' + ','.join(ov))
                    if name == 'phone': await p.screenshot(path='/tmp/music-phone-mission.png')
                    else: await p.screenshot(path=f'/tmp/music-{name}-mission.png')
                finally:
                    try: tapi('/stop', {})
                    except Exception as e: print('stop', e)
            await p.screenshot(path=f'/tmp/music-{name}.png')
            await c.close()
        print('FAILS:', fails or 'none')
        await b.close()
asyncio.run(main())
