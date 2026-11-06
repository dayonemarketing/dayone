// Takes fresh homepage screenshots of client sites for the mockup.
const { chromium } = require('playwright');
const fs = require('fs');
const sites = [
  ['cosmic-cat', 'https://www.cosmiccatarcade.com'],
  ['cafe-on-the-strip', 'https://www.cafeonthestrip.com'],
  ['drais-after-hours', 'https://draisgroup.com'],
  ['tyler-robinson-foundation', 'https://tylerrobinsonfoundation.org'],
  ['miracle-hope-foundation', 'https://www.miraclehopefoundation.org'],
  ['booty-thai-kitchen', 'https://bootythai.com'],
];
(async () => {
  fs.mkdirSync('assets/shots', { recursive: true });
  const b = await chromium.launch();
  const report = [];
  for (const [name, url] of sites) {
    for (const [tag, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
      const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: tag === 'mob' ? 2 : 1 });
      const p = await ctx.newPage();
      try {
        const r = await p.goto(url, { waitUntil: 'load', timeout: 60000 });
        await p.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
        await p.waitForTimeout(3000);
        // close common cookie/popup overlays
        for (const t of ['Accept', 'Accept all', 'Got it', 'Close', 'No thanks']) {
          const btn = p.getByRole('button', { name: t, exact: true });
          if (await btn.count()) { await btn.first().click().catch(() => {}); }
        }
        await p.waitForTimeout(800);
        await p.screenshot({ path: `assets/shots/${name}-${tag}.jpg`, type: 'jpeg', quality: 82 });
        report.push(`${name} ${tag} ok ${r && r.status()} ${p.url()}`);
      } catch (e) { report.push(`${name} ${tag} FAIL ${e.message.split('\n')[0]}`); }
      await ctx.close();
    }
  }
  await b.close();
  fs.writeFileSync('assets/shots/report.txt', report.join('\n') + '\n');
  console.log(report.join('\n'));
})();
