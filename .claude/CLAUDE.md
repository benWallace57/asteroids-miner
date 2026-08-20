# Asteroids Miner

Vector-geometry asteroids-style mining/upgrade game.

## Tech stack

- Single HTML file (`index.html`) with all CSS/JS inline
- Canvas 2D rendering — all entities drawn as geometric line art (strokeStyle, no fills except particles)
- Mobile input: nipplejs from CDN (`https://unpkg.com/nipplejs@latest/dist/nipplejs.min.js`)
- Game loop: requestAnimationFrame
- No build step, no bundler

## Style

- Dark background: `#0d1117`
- Vector/line-art aesthetic — colored stroked geometry, no filled shapes for entities
- Ship is a triangle, rocks are irregular polygons, bullets are line segments
- Starfield parallax background for depth

## Running

```bash
npm start
# or: python3 -m http.server 8000
# Open http://localhost:8000
```

## Testing

Visual tests use Playwright (headless Chromium) to screenshot the game in desktop and mobile viewports.

```bash
npm install                    # first time: installs playwright
npx playwright install chromium  # first time: downloads browser binary
sudo npx playwright install-deps chromium  # first time: system libs (use env PATH="$PATH" if nvm)
npm run test:visual            # takes screenshots, reports page errors
```

Screenshots saved to `tests/screenshots/`. The test script auto-starts the server if port 8000 isn't active.

## Game design

- Fly ship, shoot rocks, collect resources
- Return to home base to sell and buy upgrades
- Further from home = more danger + better rewards
- Fuel and cargo storage limit how far you can push
- Death: lose cargo + downgrade one random upgrade
- Upgrades: stats (fuel, cargo, speed, fire rate, hull), weapons (spread, laser, missiles), abilities (dash, tractor beam, scanner)
- Mobile: virtual joystick (nipplejs), auto-shoot
- Desktop: WASD/arrows + mouse aim or auto-shoot

## Conventions

- All game state in a single `gameState` object
- Entity arrays: `gameState.rocks`, `gameState.bullets`, `gameState.particles`, `gameState.resources`
- Render functions prefixed with `draw` (drawShip, drawRock, drawHUD)
- Update functions prefixed with `update` (updateShip, updateRocks, updateBullets)
