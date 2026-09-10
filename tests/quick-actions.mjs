import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.html': 'text/html' };
const server = createServer(async (req, res) => { try { const name = req.url.split('?')[0]; const file = path.join(process.cwd(), 'dist', name === '/' ? 'index.html' : name); res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(await readFile(file)); } catch { res.statusCode = 404; res.end(); } });
await new Promise(resolve => server.listen(4180, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const filenames = [
  'KamuiHY_X_Jann49224729_ZAKEmuscle_SIHCqBJwu1PENjS___.mp4',
  'lp_puppy_1783063467550___.mp4',
  'yangmoyum_K0cGCSlRIn9RhPv___.mp4',
  'mianjiaqishi_Mianqi520_xiangwangshijie_oFAjXNlp2CFjBDN___.mp4',
  'inbedwithrowie_make1ovenotfri_2 (83)___.mp4',
  'mystery_file',
];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 960 }, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.fulfill({ status: 200, contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/javascript', body: '' }));
    await page.goto('http://127.0.0.1:4180', { waitUntil: 'networkidle' });
    const nav = async name => {
      if (mobile) await page.getByRole('button', { name: '打开导航菜单' }).click();
      await page.locator('.main-nav').getByRole('button', { name, exact: typeof name === 'string' }).click();
    };
    await page.locator('input[type=file]').setInputFiles({ name: 'new-examples.txt', mimeType: 'text/plain', buffer: Buffer.from(filenames.join(', ')) });
    await page.waitForFunction(() => document.querySelector('.stat-value')?.textContent === '6份');
    assert.ok((await page.locator('.unparsed-summary').textContent()).includes('无法识别 1 份'));
    await page.locator('.unparsed-summary').click();
    assert.equal(await page.locator('.review-item').count(), 1);
    await page.getByRole('button', { name: '确认归属', exact: true }).click();
    await page.getByRole('button', { name: '候选归属 mystery', exact: true }).click();
    await page.getByRole('button', { name: '候选归属 file', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 2);
    await page.getByRole('button', { name: '候选归属 mystery_file', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 1);
    await page.getByRole('button', { name: '移除归属 mystery_file', exact: true }).click();
    await page.getByRole('textbox', { name: '搜索或补充归属用户名' }).fill('yang');
    await page.locator('.autocomplete-authors').getByRole('button', { name: 'yangmoyum', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 1);
    await page.getByRole('button', { name: '确认并更新统计' }).click();
    assert.ok((await page.locator('.review-count-note').textContent()).includes('无法识别 0 份'));
    await page.getByRole('button', { name: /^归属存疑/ }).click();
    await page.locator('.review-item').filter({ hasText: 'KamuiHY_X' }).getByRole('button', { name: '确认归属' }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 3);
    await page.getByRole('button', { name: '按下划线拆开', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 4);
    await page.getByRole('button', { name: '候选归属 KamuiHY_X', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 3);
    await page.getByRole('button', { name: '合成一个用户名', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 1);
    await page.getByRole('button', { name: '恢复推测', exact: true }).click();
    assert.equal(await page.locator('.chosen-authors button').count(), 3);
    if (mobile) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: 'tests/quick-attribution-mobile.png' });
    }
    await page.getByRole('button', { name: '确认并更新统计' }).click();
    await nav('分析概览');
    const similar = ['Alice123', 'alice123', 'ALICE123', 'Bobby789', 'bobby789', 'Lemon456', 'lemon456'].map((name, i) => `${name}_${2089930283558801756n + BigInt(i)}_1___.mp4`).join('\n');
    await page.locator('input[type=file]').setInputFiles({ name: 'similar.txt', mimeType: 'text/plain', buffer: Buffer.from(similar) });
    await page.waitForFunction(() => document.querySelector('.stat-value')?.textContent === '7份');
    await page.locator('.users-panel').getByRole('button', { name: '合并用户', exact: true }).click();
    assert.equal(await page.locator('.quick-group').count(), 3);
    if (mobile) {
      assert.equal(await page.getByRole('dialog').evaluate(element => element.scrollWidth > element.clientWidth), false);
      await page.screenshot({ path: 'tests/quick-merge-mobile.png' });
    }
    await page.locator('.quick-group').first().getByRole('button', { name: /^确认合并相似组/ }).click();
    assert.equal(await page.locator('.quick-group').count(), 2);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('guiji-session-v1')).history.length), 1);
    await page.getByRole('button', { name: '撤销上次', exact: true }).click();
    assert.equal(await page.locator('.quick-group').count(), 3);
    await page.getByRole('button', { name: '全选相似组', exact: true }).click();
    await page.getByRole('button', { name: '合并所选 3 组', exact: true }).click();
    assert.equal(await page.locator('.quick-group').count(), 0);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('guiji-session-v1')).history.length), 3);
    const targets = await page.evaluate(() => JSON.parse(localStorage.getItem('guiji-session-v1')).history.map(entry => entry.target));
    assert.equal(new Set(targets).size, 3);
    await page.getByRole('textbox', { name: /手动多选/ }).fill('alice');
    await page.getByRole('button', { name: '选择搜索结果 (1)' }).click();
    assert.ok((await page.getByRole('textbox', { name: /合并后的统一用户名/ }).inputValue()).toLowerCase().includes('alice'));
    await page.getByRole('textbox', { name: /手动多选/ }).fill('bobby');
    await page.getByRole('button', { name: '选择搜索结果 (1)' }).click();
    assert.equal(await page.locator('.selected-merge-chips button').count(), 2);
    await page.locator('.target-options button').last().click();
    assert.ok((await page.getByRole('textbox', { name: /合并后的统一用户名/ }).inputValue()).toLowerCase().includes('bobby'));
    await page.getByRole('button', { name: '确认合并 (2)', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await nav('合并记录');
    assert.equal(await page.locator('.history-item').count(), 4);
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    assert.equal(await page.locator('.history-item').count(), 3);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('guiji-session-v1')).history.length), 3);
    assert.deepEqual(errors, []);
    console.log(`PASS (${mobile ? 'mobile' : 'desktop'}): new examples, unknown counter, clickable attribution chips, split/join, autocomplete, one-click merge, independent batch merge, automatic target, multiselect, undo and persistence.`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
