# Playwright screenshots of Decode Missions: python3 shot_mission.py [http://localhost:8080]
import asyncio, sys, json, urllib.request
from playwright.async_api import async_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080').rstrip('/')
PIN = '1234'
def tapi(path, body=None):
    req = urllib.request.Request(BASE + '/teacher/api' + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'content-type': 'application/json', 'x-teacher-pin': PIN}, method='POST' if body is not None else 'GET')
    return json.load(urllib.request.urlopen(req))
async def join(ctx, name):
    p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto(BASE + '/'); await p.fill('#name', name); await p.click('#go')
    await p.wait_for_selector('#chat:not(.hidden)', timeout=15000); await p.wait_for_timeout(300)
    return p, errs
async def walk_to_board(p, dx_off=0):
    # board footprint from the map; walk with keys to just above it
    for _ in range(3):
        st = await p.evaluate("""() => { const m = window.__ew.me; return { x: m.x, y: m.y }; }""")
        tx, ty = 32 * 32 + DX, (16 * 32 - 20) if DY < 0 else (17 * 32 + 22)
        dx, dy = tx - st['x'], ty - st['y']
        if abs(dx) > 3:
            k = 'd' if dx > 0 else 'a'; await p.keyboard.down(k); await p.wait_for_timeout(abs(dx) / 170 * 1000); await p.keyboard.up(k)
        if abs(dy) > 3:
            k = 's' if dy > 0 else 'w'; await p.keyboard.down(k); await p.wait_for_timeout(abs(dy) / 170 * 1000); await p.keyboard.up(k)
        await p.wait_for_timeout(150)
DX = 0
DY = -1
async def main():
    global DX, DY
    async with async_playwright() as pw:
        try: b = await pw.chromium.launch(channel='chrome')
        except Exception: b = await pw.chromium.launch()
        desk = await b.new_context(viewport={'width': 1100, 'height': 700})
        mob = await b.new_context(viewport={'width': 390, 'height': 780}, is_mobile=True, has_touch=True, device_scale_factor=2)
        s, es = await join(desk, 'Mateen')
        m, em = await join(mob, 'Aisyah')
        DX = -20; await walk_to_board(s)
        await s.keyboard.press('z'); await s.wait_for_timeout(300)   # A at board -> mission panel
        await s.screenshot(path='/tmp/desk_board.png')
        await s.click('#mp-body .mbtn'); await s.wait_for_timeout(500)  # Be the Sender
        await s.keyboard.press('x'); await s.wait_for_timeout(200)
        for clue in ['🏫🛠️', '🍱⏰', '👉👈🙏']:
            await s.evaluate(f"window.__ew.sendChat('{clue}')"); await s.wait_for_timeout(1150)
        DX = 10; DY = 1; await walk_to_board(m)
        await m.wait_for_timeout(400)
        await m.screenshot(path='screenshot-mission-board.png')       # board + 'A: Mission' prompt + clue strip
        await m.tap('#btnA'); await m.wait_for_timeout(300)            # A -> mission panel
        await m.screenshot(path='/tmp/mob_panel.png')
        await m.tap('#mp-body .mbtn'); await m.wait_for_timeout(300)   # Guess the message
        await m.screenshot(path='screenshot-mission.png')
        # teacher page (mobile) during the round
        t = await mob.new_page(); await t.goto(BASE + '/teacher'); await t.fill('#pin', PIN); await t.click('#loginbtn')
        await t.wait_for_selector('#app:not(.hidden)'); await t.wait_for_timeout(1500)
        await t.screenshot(path='screenshot-teacher.png', full_page=True)
        big = await (await b.new_context(viewport={'width': 1280, 'height': 720})).new_page()
        await big.goto(BASE + '/teacher?big=1'); await big.fill('#pin', PIN); await big.click('#loginbtn'); await big.wait_for_timeout(1500)
        await big.screenshot(path='screenshot-teacher-big.png')
        # mobile guesses -> results
        await m.tap('#mp-body .mbtn'); await m.wait_for_timeout(1500)
        await m.screenshot(path='screenshot-mission-result.png')
        await big.wait_for_timeout(1200); await big.screenshot(path='/tmp/big_result.png')
        st = await m.evaluate('window.__ew.MS.last && window.__ew.MS.last.reason')
        print('result reason:', st, 'errors:', es + em)
        await b.close()
asyncio.run(main())
