// Takes fresh homepage screenshots of client sites for the mockup.
const { chromium } = require('playwright');
const fs = require('fs');
const sites = [
  ['cosmic-cat', 'https://www.cosmiccatarcade.com'],
  ['cafe-on-the-strip', 'https://www.cafeonthestrip.com'],
  ['drais-after-hours', 'https://draisgroup.com'],
  ['drais-bachelorette', 'https://draisgroup.com', 'bachelor'],
  ['miracle-hope-foundation', 'https://www.miraclehopefoundation.org'],
  ['booty-thai-kitchen', 'https://bootythai.com'],
  ['peaks-advisory-group', 'https://www.peaksadvisorygroup.com'],
  ['peaks-advisory-group-alt', 'https://peaksadvisory.com'],
];
(async () => {
  fs.mkdirSync('assets/shots', { recursive: true });
  const b = await chromium.launch();
  // Full Chrome plays MP4 hero videos; Playwright's bundled Chromium does not.
  let chrome;
  try { chrome = await chromium.launch({ channel: 'chrome' }); } catch (e) { chrome = b; }
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
        await p.addStyleTag({ content: '[class*=cookie i],[id*=cookie i],[class*=consent i],[id*=consent i],[class*=gdpr i]{display:none!important}' }).catch(() => {});
        await p.waitForTimeout(800);
        await p.screenshot({ path: `assets/shots/${name}-${tag}.jpg`, type: 'jpeg', quality: 82 });
        report.push(`${name} ${tag} ok ${r && r.status()} ${p.url()}`);
      } catch (e) { report.push(`${name} ${tag} FAIL ${e.message.split('\n')[0]}`); }
      await ctx.close();
    }
  }
  // Pages with a background video: wait until the video is playing, hide review UI.
  const videoSites = [['tyler-robinson-foundation', 'https://dayonemarketing.github.io/trf/']];
  for (const [name, url] of videoSites) {
    for (const [tag, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
      const ctx = await chrome.newContext({ viewport: vp, deviceScaleFactor: tag === 'mob' ? 2 : 1 });
      const p = await ctx.newPage();
      try {
        await p.goto(url, { waitUntil: 'load', timeout: 60000 });
        await p.evaluate(() => { document.body.classList.remove('show-rn'); try { localStorage.setItem('trf-show-rn', '0'); } catch (e) {} });
        await p.addStyleTag({ content: '.rn,.rn-toggle,.gala-pop{display:none!important}' });
        const ok = await p.waitForFunction(() => { const v = document.querySelector('video'); return v && v.readyState >= 3 && v.currentTime > 2.5; }, null, { timeout: 30000 }).then(() => true).catch(() => false);
        await p.waitForTimeout(500);
        await p.screenshot({ path: `assets/shots/${name}-${tag}.jpg`, type: 'jpeg', quality: 82 });
        report.push(`${name} ${tag} ok video-playing=${ok} ${p.url()}`);
      } catch (e) { report.push(`${name} ${tag} FAIL ${e.message.split('\n')[0]}`); }
      await ctx.close();
    }
  }
  if (chrome !== b) await chrome.close();
  await b.close();
  for (const id of ['rsA987OG8cg']) {
    try { const r = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`); report.push(`yt ${id} oembed ${r.status} ${r.ok ? (await r.text()) : ''}`); } catch (e) { report.push(`yt ${id} oembed FAIL ${e.message}`); }
    try { const r = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`); report.push(`yt ${id} thumb ${r.status} ${(await r.arrayBuffer()).byteLength}`); } catch (e) { report.push(`yt ${id} thumb FAIL ${e.message}`); }
  }
  fs.writeFileSync('assets/shots/report.txt', report.join('\n') + '\n');
  console.log(report.join('\n'));
})();
