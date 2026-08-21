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

  // Bug test: pause button overlapping quest HUD
  await desktopPage.keyboard.press('Escape'); // unpause
  await desktopPage.waitForTimeout(100);
  await desktopPage.evaluate(() => {
    gameState.questTracks.mining.unlocked = true;
    gameState.questTracks.exploration.unlocked = true;
    gameState.questTracks.combat.unlocked = true;
    gameState.questTracks.story.unlocked = true;
  });
  await desktopPage.waitForTimeout(200);
  await desktopPage.screenshot({ path: `${SCREENSHOT_DIR}/quest-hud-overlap.png` });
  console.log('Screenshot saved: tests/screenshots/quest-hud-overlap.png');

  // Bug test: distance quest after prestige
  // Simulate post-prestige state: maxDist is high but quests are reset
  const distQuestResult = await desktopPage.evaluate(() => {
    // Simulate prestige: high maxDist from previous run, but quests reset
    gameState.story.stats.maxDist = 20000;
    gameState.questTracks.exploration.unlocked = true;
    gameState.questTracks.exploration.current = 0; // "First Steps: reach 800"
    gameState.questTracks.exploration.progress = 0;
    // Place ship at 1000m (past the 800m target)
    gameState.ship.x = 1000; gameState.ship.y = 0;
    gameState.camera.x = 1000; gameState.camera.y = 0;
    // Run one game frame — does the quest advance via normal updateShip path?
    gameState.paused = false;
    gameState.lastTime = performance.now() - 16;
    gameLoop(performance.now());
    return {
      shipDist: Math.round(Math.sqrt(gameState.ship.x**2 + gameState.ship.y**2)),
      maxDist: gameState.story.stats.maxDist,
      questProgress: gameState.questTracks.exploration.progress,
      questCurrent: gameState.questTracks.exploration.current,
      questTarget: QUEST_TRACKS.exploration.quests[0].target
    };
  });
  console.log('\n--- Bug test: Distance quest after prestige ---');
  console.log(`  Ship at: ${distQuestResult.shipDist}m (past target of ${distQuestResult.questTarget}m)`);
  console.log(`  maxDist (from prev run): ${distQuestResult.maxDist}m`);
  console.log(`  Quest advanced via normal game loop: ${distQuestResult.questCurrent > 0 ? 'YES ✓' : 'NO ❌ (bug)'}`);

  await desktopPage.waitForTimeout(200);
  await desktopPage.screenshot({ path: `${SCREENSHOT_DIR}/bug-distance-quest-prestige.png` });
  console.log('Screenshot saved: tests/screenshots/bug-distance-quest-prestige.png');
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
