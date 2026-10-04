import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/'
async def join(ctx, name, clicks):
    p = await ctx.new_page()
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto(URL); await p.fill('#name', name)
    for sel in clicks: await p.click(sel)
    await p.click('#go'); await p.wait_for_selector('#chat:not(.hidden)', timeout=8000)
    return p, errs
async def main():
    async with async_playwright() as pw:
        try: b = await pw.chromium.launch(channel='chrome')
        except Exception: b = await pw.chromium.launch()
        c1 = await b.new_context(viewport={'width': 1100, 'height': 700})
        c2 = await b.new_context(viewport={'width': 390, 'height': 780}, is_mobile=True, has_touch=True, device_scale_factor=2)
        a, ea = await join(c1, 'Mateen', ['#o-shirt b:nth-child(1)', '#o-acc b:nth-child(2)'])
        await a.screenshot(path='/tmp/s_a0.png')
        m, em = await join(c2, 'Soara', ['#o-hair b:nth-child(4)', '#o-shirt b:nth-child(5)', '#o-style b:nth-child(2)', '#o-acc b:nth-child(3)'])
        # move A right a bit with keyboard
        await a.keyboard.down('d'); await a.wait_for_timeout(500); await a.keyboard.up('d')
        await a.keyboard.down('w'); await a.wait_for_timeout(200); await a.keyboard.up('w')
        # Mobile: press A, choose emojis, press A to send
        await m.tap('#btnA'); await m.wait_for_timeout(200)
        for i in (1, 6, 30): await m.tap(f'#grid span:nth-child({i})')
        await m.tap('#btnA'); await m.wait_for_timeout(1200)
        await a.evaluate("window.__ew.sendChat('👋😀🏫')")
        await m.tap('#btnB')
        await a.wait_for_timeout(700)
        await a.screenshot(path='screenshot.png')
        await m.tap('#btnA'); await m.wait_for_timeout(300)
        await m.screenshot(path='screenshot-mobile.png')
        log = await a.inner_text('#log')
        print('LOG:', log.replace('\n', ' | '))
        print('players seen by A:', await a.evaluate('window.__ew.players.size'))
        print('errors:', ea + em)
        await b.close()
asyncio.run(main())
