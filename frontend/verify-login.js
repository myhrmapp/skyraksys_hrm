const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  console.log('1. On login page:', page.url());

  await page.getByLabel(/email/i).fill('admin@skyraksys.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(3000);
  console.log('2. After login:', page.url());

  const cookies = await context.cookies();
  console.log('3. Cookies:', cookies.map(c => c.name).join(', ') || 'NONE');

  await page.goto('http://localhost:3000/employees');
  await page.waitForTimeout(2000);
  console.log('4. After /employees:', page.url());

  const table = await page.locator('table').count();
  console.log('5. Table count:', table);

  // Check what's actually on the page
  const muiTable = await page.locator('.MuiTable-root, .MuiDataGrid-root, [data-testid]').count();
  console.log('6. MUI table/grid/testid count:', muiTable);
  
  // Check for any data-testid elements
  const testids = await page.locator('[data-testid]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')));
  console.log('7. data-testids:', testids.join(', '));

  // Check for employee-table specifically
  const empTable = await page.locator('[data-testid="employee-table"]').count();
  console.log('8. employee-table:', empTable);

  await browser.close();
  process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
