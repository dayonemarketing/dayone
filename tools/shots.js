// Takes fresh homepage screenshots of client sites for the mockup.
const { chromium } = require('playwright');
const fs = require('fs');
const sites = [
  ['cosmic-cat', 'https://www.cosmiccatarcade.com'],
  ['cafe-on-the-strip', 'https://www.cafeonthestrip.com'],
  ['drais-after-hours', 'https://draisgroup.com'],
  ['drais-bachelorette', 'https://draisgroup.com', 'bachelor'],
  ['tyler-robinson-foundation', 'https://www.tylerrobinsonfoundation.org'],
  ['miracle-hope-foundation', 'https://www.miraclehopefoundation.org'],
  ['booty-thai-kitchen', 'https://bootythai.com'],
  ['peaks-advisory-group', 'https://www.peaksadvisorygroup.com'],
  ['peaks-advisory-group-alt', 'https://peaksadvisory.com'],
];
(async () => {
  fs.mkdirSync('assets/shots', { recursive: true });
  const b = await chromium.launch();
  const report = [];
  for (let [name, url, find] of sites) {
    if (find) {
      const ctx0 = await b.newContext(); const p0 = await ctx0.newPage();
      try {
        await p0.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await p0.waitForTimeout(2500);
        const links = await p0.$$eval('a[href]', as => as.map(a => [a.href, (a.textContent || '').trim()]));
        const hit = links.find(([h, t]) => (h + ' ' + t).toLowerCase().includes(find));
        report.push(`${name} links matching ${find}: ` + JSON.stringify(links.filter(([h, t]) => (h + ' ' + t).toLowerCase().includes(find)).slice(0, 5)));
        if (hit) url = hit[0]; else { report.push(`${name} no link found`); await ctx0.close(); continue; }
      } catch (e) { report.push(`${name} discover FAIL ${e.message.split('\n')[0]}`); await ctx0.close(); continue; }
      await ctx0.close();
    }
    for (const [tag, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
      const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: tag === 'mob' ? 2 : 1 });
      const p = await ctx.newPage();
      try {
        const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await p.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
        await p.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
        await p.waitForTimeout(3000);
        // close common cookie/popup overlays
        for (const t of ['Accept', 'Accept all', 'Got it', 'Close', 'No thanks']) {
          for (const loc of [p.getByRole('button', { name: t, exact: true }), p.getByRole('link', { name: t, exact: true }), p.getByText(t, { exact: true })]) {
            if (await loc.count()) { await loc.first().click({ timeout: 2000 }).catch(() => {}); }
          }
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
