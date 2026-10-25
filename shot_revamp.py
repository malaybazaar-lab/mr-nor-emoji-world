# Playwright QA of the revamp (server must run with TEST_TELEPORT=1): python3 shot_revamp.py [http://localhost:8080]
import asyncio, sys, json
from playwright.async_api import async_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080').rstrip('/')
BAD = ['youtube.com', 'youtube-nocookie', 'youtu.be', 'linktr.ee', 'sites.google', 'spotify', 'http', 'www.']
fails = []
def F(m): print('FAIL', m); fails.append(m)
def P(m): print('PASS', m)
OVL = """() => { const box = (id) => { const e = document.getElementById(id); if (!e || getComputedStyle(e).display === 'none' || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') return null; const b = e.getBoundingClientRect(); return b.width && b.height ? b : null; };
  const hit = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; const out = [];
  for (const a of ['mpanel', 'chat', 'tl', 'mstrip']) for (const b of ['dpad', 'btnA', 'btnB']) if (hit(box(a), box(b))) out.push(a + 'x' + b);
  if (hit(box('tl'), box('chat'))) out.push('tlxchat'); return out; }"""
async def visible_text(p): return (await p.evaluate("document.body.innerText")).lower()
async def goto(p, x, y): await p.evaluate(f'__ew.teleport({x},{y})'); await p.wait_for_timeout(250)
async def near_obj(p, oid):
    o = await p.evaluate(f"__ew.objects().find(o => o.id === '{oid}')")
    await goto(p, (o['x'] + o['w'] / 2) * 32, (o['y'] + o['h']) * 32 + 16); return o
async def join(b, name, vp, mob):
    c = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
    p = await c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e))); p.on('popup', lambda pp: None)
    await p.goto(BASE + '/'); await p.fill('#name', name); await p.click('#go'); await p.wait_for_selector('#chat:not(.hidden)', timeout=20000); await p.wait_for_timeout(1500)
    return c, p, errs
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for label, vp, mob in [('phone', (390, 844), True), ('desktop', (1280, 800), False), ('landscape', (844, 390), True)]:
            c, p, errs = await join(b, 'QA' + label[:4], vp, mob)
            ov = await p.evaluate(OVL); (F if ov else P)(f'[{label}] HUD/chat do not overlap controls {ov}')
            stations = ['scrollsaw', 'drill', 'sander', 'vacuum', 'ppe', 'mat_pine', 'mat_aluminium', 'joint_dowel', 'joint_mortise', 'jig_bending', 'mat_quiz', 'computers', 'notice', 'board']
            for sid in stations:
                await near_obj(p, sid); await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(250)
                vis = await p.evaluate("!document.getElementById('mpanel').classList.contains('hidden')")
                ov = await p.evaluate(OVL); txt = await visible_text(p)
                bad = [w for w in BAD if w in txt]
                if not vis: F(f'[{label}] {sid} panel opens')
                elif ov or bad: F(f'[{label}] {sid} overlap={ov} url-text={bad}')
                if label == 'phone' and sid in ('scrollsaw', 'mat_pine', 'notice'):
                    if sid == 'scrollsaw':
                        await p.evaluate("[...document.querySelectorAll('#mp-body .mbtn')].find(b => /Use the machine/.test(b.textContent)).click()"); await p.wait_for_timeout(200)
                        await p.evaluate("__ew.pressA()"); await p.wait_for_timeout(1500)
                        prog = await p.evaluate("document.querySelector('.pbar b').style.width"); (P if prog not in ('0%', '') else F)(f'hold A runs scroll saw ({prog})')
                        await p.screenshot(path='screenshot-workshop-panel.png')
                        await p.evaluate("__ew.pressB()"); await p.wait_for_timeout(100)
                        await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(200)
                    if sid == 'mat_pine': await p.screenshot(path='screenshot-materials.png')
                await p.evaluate('__ew.pressB()'); await p.wait_for_timeout(150)
                if await p.evaluate("!document.getElementById('mpanel').classList.contains('hidden')"): F(f'[{label}] {sid} closes with B')
            P(f'[{label}] {len(stations)} station panels checked')
            # notice board linktree opens new tab
            await near_obj(p, 'notice'); await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(200)
            async with c.expect_page() as pg:
                await p.evaluate("[...document.querySelectorAll('#mp-body .mbtn')].find(b => /Open Linktree/.test(b.textContent)).click()")
            np = await pg.value; u = np.url; await np.close()
            (P if 'linktr.ee/mrnor' in u else F)(f'[{label}] Linktree button opens new tab ({u[:40]})')
            await p.evaluate('__ew.pressB()')
            # TV
            await near_obj(p, 'tv'); await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(2500)
            tv = await p.evaluate("[!document.getElementById('tvov').classList.contains('hidden'), (document.querySelector('#tvframe iframe')||{}).src, EWMusic.state.playing]")
            txt = await visible_text(p); bad = [w for w in BAD if w in txt]
            (P if tv[0] and 'youtube-nocookie.com/embed/3z_QWqI6vpA' in (tv[1] or '') and not tv[2] and not bad else F)(f'[{label}] TV overlay opens, music paused, no URL text {tv} {bad}')
            if label == 'phone': await p.screenshot(path='screenshot-tv.png')
            await p.click('#tvclose'); await p.wait_for_timeout(500)
            st = await p.evaluate("[document.getElementById('tvov').classList.contains('hidden'), EWMusic.state.playing, !!document.querySelector('#tvframe iframe')]")
            (P if st[0] and not st[2] else F)(f'[{label}] TV closes + iframe removed, music back={st[1]}')
            # NPC Mr Nor
            await p.evaluate("(() => { const n = __ew.npc; __ew.teleport(n.x, n.y + 34); })()"); await p.wait_for_timeout(300)
            await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(1500)
            nt = await p.inner_text('#mp-body'); (P if 'Mr Nor Dnt' in nt and 'Hello' in nt else F)(f'[{label}] Mr Nor dialogue')
            if label == 'phone': await p.screenshot(path='screenshot-npc.png')
            for _ in range(12):
                if 'Tip of the day' in await p.inner_text('#mp-body'): break
                await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(150)
            nt = await p.inner_text('#mp-body'); (P if 'Tip of the day' in nt else F)(f'[{label}] Mr Nor topic menu')
            await p.evaluate('__ew.pressB()')
            # Q&A NPCs
            hs = await p.evaluate("__ew.helpers.map(h => [h.kind, h.name, h.x, h.y])")
            (P if [h[1] for h in hs] == ['Mr Rahim', 'Mr Salihin', 'Mr Azmi', 'Mr Huang', 'Mr Lau'] else F)(f'[{label}] 5 staff NPCs {hs}')
            for kind, name, x, y in hs:
                await goto(p, x, y + 30); await p.evaluate('__ew.pressA()'); await p.wait_for_timeout(250)
                t = await p.inner_text('#mp-body')
                if f"I'm {name}" not in t: F(f'{name} intro: {t[:80]}')
                await p.evaluate("[...document.querySelectorAll('#mp-body .mbtn')].find(b => /Type a question/.test(b.textContent)).click()"); await p.wait_for_timeout(200)
                await p.fill('#askq', {'rahim': 'how do i use the bench drill safely', 'salihin': 'how do I reduce the number of parts', 'azmi': 'what is a mortise and tenon', 'huang': 'what does a resistor do', 'lau': 'what is anthropometry'}[kind])
                await p.press('#askq', 'Enter'); await p.wait_for_timeout(200)
                a = await p.inner_text('.askout'); print(f'  {name}: {a[:110]!r}')
                if 'Great question' in a: F(f'{name} could not answer own topic')
                if kind == 'huang' and label == 'phone': await p.screenshot(path='screenshot-npcs.png')
                await p.fill('#askq', 'who won the football match yesterday'); await p.press('#askq', 'Enter'); await p.wait_for_timeout(150)
                a = await p.inner_text('.askout'); ('Great question - ask Mr Nor!' in a and a.count('❓') == 3) or F(f'{name} fallback {a[:100]}')
                await p.fill('#askq', 'you are stupid'); await p.press('#askq', 'Enter'); await p.wait_for_timeout(100)
                a = await p.inner_text('.askout'); ('respectful' in a) or F(f'{name} profanity filter {a}')
                await p.evaluate('__ew.pressB()'); await p.wait_for_timeout(100)
            P(f'[{label}] Q&A NPC dialogue + matching + fallback + filter checked')
            # chat keyboard
            if mob:
                await p.tap('#chatbtn'); await p.wait_for_timeout(300)
                foc = await p.evaluate("document.activeElement.id"); (P if foc == 'msg' else F)(f'[{label}] chat button focuses text field ({foc})')
                await p.keyboard.type('Hello everyone, see you at the workshop!'); await p.tap('#send'); await p.wait_for_timeout(500)
            else:
                await p.keyboard.press('Enter'); await p.keyboard.type('Hello everyone, see you at the workshop!'); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
            lg = await p.inner_text('#log'); (P if 'Hello everyone, see you at the workshop!' in lg else F)(f'[{label}] text chat sent')
            ov = await p.evaluate(OVL); (F if [o for o in ov if 'tl' not in o] else P)(f'[{label}] typing overlap {ov}')
            if label == 'phone':
                await p.screenshot(path='screenshot-chat.png')
                await p.evaluate('__ew.closeChat()')
                await goto(p, 45 * 32, 34 * 32); await p.evaluate("document.body.style.zoom=1"); await p.wait_for_timeout(300); await p.screenshot(path='screenshot-revamp-map-phone.png')
            if label == 'desktop':
                await p.evaluate('__ew.closeChat()')
                # overview: zoom out canvas temporarily
                await p.set_viewport_size({'width': 1440, 'height': 1024}); await goto(p, 45 * 32, 30 * 32); await p.wait_for_timeout(400)
                await p.screenshot(path='screenshot-revamp-desktop.png')
                import base64
                for fn, args in [('screenshot-revamp-map.png', '0.42'), ('screenshot-workshop.png', '1, 0, 260, 30*32, 22*32'), ('screenshot-materials-room.png', '1, 60*32, 260, 30*32, 22*32'), ('screenshot-joints-forming.png', '0.6, 0, 37*32, 90*32, 27*32')]:
                    d = await p.evaluate(f'__ew.overview({args})'); open(fn, 'wb').write(base64.b64decode(d.split(',')[1]))
            txt = await visible_text(p); bad = [w for w in BAD if w in txt]; (F if bad else P)(f'[{label}] no URL text visible {bad}')
            (F if errs else P)(f'[{label}] no page errors {errs}')
            await c.close()
        await b.close()
    print('FAILS:', fails if fails else 'none'); sys.exit(1 if fails else 0)
asyncio.run(main())
