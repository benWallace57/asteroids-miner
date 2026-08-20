const { chromium } = require('playwright');
const { execSync } = require('child_process');
const http = require('http');

const PORT = 8000;
const URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = __dirname + '/screenshots';

async function checkServer() {
  return new Promise((resolve) => {
    http.get(URL, (res) => resolve(res.statusCode === 200))
        .on('error', () => resolve(false));
  });
}

async function run() {
  const serverUp = await checkServer();
  if (!serverUp) {
    console.log('Starting server on port', PORT);
    require('child_process').spawn('python3', ['-m', 'http.server', String(PORT)], {
      cwd: __dirname + '/..',
      detached: true,
      stdio: 'ignore'
    }).unref();
    await new Promise(r => setTimeout(r, 1000));
  }

  const browser = await chromium.launch();
  const errors = [];

  // Desktop test
  console.log('\n--- Desktop (1280x720) ---');
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  desktopPage.on('pageerror', e => errors.push('[desktop] ' + e.message));
  await desktopPage.goto(URL);
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: `${SCREENSHOT_DIR}/desktop.png` });
  console.log('Screenshot saved: tests/screenshots/desktop.png');

  // Desktop pause test
  await desktopPage.keyboard.press('Escape');
  await desktopPage.waitForTimeout(300);
  await desktopPage.screenshot({ path: `${SCREENSHOT_DIR}/desktop-paused.png` });
  console.log('Screenshot saved: tests/screenshots/desktop-paused.png');
  await desktopPage.close();

  // Mobile test
  console.log('\n--- Mobile (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', e => errors.push('[mobile] ' + e.message));
  await mobilePage.goto(URL);
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: `${SCREENSHOT_DIR}/mobile.png` });
  console.log('Screenshot saved: tests/screenshots/mobile.png');
  await mobilePage.close();

  await browser.close();

  // Report
  console.log('\n--- Results ---');
  if (errors.length) {
    console.log('Page errors:');
    errors.forEach(e => console.log('  ERROR:', e));
    process.exitCode = 1;
  } else {
    console.log('No page errors detected.');
  }
}

run().catch(err => {
  console.error('Test failed:', err.message);
  process.exitCode = 1;
});
