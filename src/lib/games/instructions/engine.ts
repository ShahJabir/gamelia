export const engineInstructions: string = `# The Gamelia 3D Game Engine Toolkit

The sandbox includes a pre-built 3D game engine under \`./engine/\`.
Never re-implement basic Three.js scene setup, input parsing, Web Audio SFX, or HUD overlays from scratch. Always import from \`./engine/index.js\`.

\`\`\`javascript
import {
  createEngine,
  createInput,
  createHUD,
  sound,
  createCharacter,
  createSpaceship,
  createEnemy,
  createPickup,
  createProp,
  createGround,
  createCharacterController,
  animateWalkCycle,
  animateFloating,
  squashAndStretch,
  tween,
  updateTweens,
  checkSphereCollision,
  checkAABBCollision,
} from "./engine/index.js";
\`\`\`

## 1. Engine Core (\`createEngine\`)

Creates the Three.js scene, camera, renderer with shadows, lighting, responsive resize, particle engine, and game loop.

\`\`\`javascript
const engine = createEngine({
  background: 0x09090b,
  fog: true,
  fogColor: 0x09090b,
  fogNear: 15,
  fogFar: 60,
  cameraPos: [0, 8, 14],
  cameraLookAt: [0, 0, 0],
});

// Register update callbacks (runs every frame)
engine.onUpdate((dt, elapsed) => {
  // dt is clamped delta time, elapsed is total seconds
});

// Screen shake on hit or explosion
engine.shake(0.5, 0.25); // (intensity, duration)

// High-performance particle bursts
engine.spawnParticles({
  position: { x: 0, y: 1, z: 0 },
  count: 25,
  color: 0xea580c,
  speed: 4,
  lifetime: 0.6,
});

// Floating damage/score popup numbers
engine.spawnFloatingText("+100", { x: 0, y: 2, z: 0 }, { color: "#facc15" });
\`\`\`

## 2. Controls & Input (\`createInput\`)

Cross-platform input manager supporting WASD, arrow keys, mouse pointer with ground raycasting, and automatic on-screen virtual touch joystick + action button on mobile devices.

\`\`\`javascript
const input = createInput();

engine.onUpdate((dt) => {
  // Movement vector (normalized { x, y } combining WASD, arrows, and mobile touch joystick)
  const move = input.getVector();

  // Action queries (combines Space key, touch ACTION button, and custom keys)
  if (input.justPressed("space") || input.justPressed("action")) {
    // Jump or shoot
  }

  // Mouse raycasting to ground plane (0, 1, 0)
  const targetPoint = input.getGroundIntersection(engine.camera);

  // Clear single-frame press buffers at end of frame
  input.update();
});
\`\`\`

## 3. HUD & UI (\`createHUD\`)

Complete DOM overlay matching Gamelia's dark & orange theme. Handles health bar, score counter, timer, objective banner, toast notifications, and game over/win modals.

\`\`\`javascript
const hud = createHUD({
  title: "CRYSTAL RUNNER",
  maxHealth: 100,
  showHealth: true,
  showScore: true,
  showTimer: true,
});

hud.addScore(10);
hud.damage(15); // Automatically triggers gameOver({ victory: false }) when HP reaches 0
hud.setObjective("Collect 5 power crystals");
hud.toast("Powerup Activated!", 2.0);

// Custom victory or defeat screen
hud.gameOver({
  victory: true,
  title: "SECTOR CLEARED!",
  score: hud.getScore(),
  onRestart: () => window.location.reload(),
});
\`\`\`

## 4. Procedural Audio (\`sound\`)

Zero-asset Web Audio API procedural synthesizer. Zero external mp3/wav files needed.

\`\`\`javascript
sound.shoot();      // Laser / blaster / projectile
sound.jump();       // Jump chirp
sound.coin();       // Pickup / coin / chime
sound.hit();        // Punch / thud / impact
sound.explosion();  // Explosion / bomb rumble
sound.powerup();    // Multi-tone ascending arpeggio
sound.startBGM();   // Looping procedural ambient cyber synth bass & arp
sound.stopBGM();
\`\`\`

## 5. Procedural 3D Models (\`models\`)

Zero-asset procedural 3D models with materials, shadows, and hierarchical limb rigs:

\`\`\`javascript
// Player with animated limbs (leftArm, rightArm, leftLeg, rightLeg, head)
const player = createCharacter({ color: 0x3b82f6, accentColor: 0xea580c });
engine.scene.add(player);

// Spaceship / speeder
const ship = createSpaceship({ color: 0xea580c });

// Enemies
const drone = createEnemy("drone");
const crawler = createEnemy("crawler");
const turret = createEnemy("turret");

// Pickups (coins, gems, hearts)
const coin = createPickup("coin");
const gem = createPickup("gem");

// Props (trees, rocks, crates, portals)
const tree = createProp("tree");
const rock = createProp("rock");
const crate = createProp("crate");
const portal = createProp("portal");

// Stylized ground grid
const ground = createGround({ size: 80, divisions: 40 });
engine.scene.add(ground);
\`\`\`

## 6. Animations & Physics

\`\`\`javascript
// Smooth arcade character physics (velocity, gravity, jumping, turning)
const controller = createCharacterController(player, {
  speed: 9,
  jumpForce: 13,
  gravity: -30,
});

engine.onUpdate((dt, time) => {
  const move = input.getVector();
  controller.move(move, dt);

  if (input.justPressed("space")) {
    if (controller.jump()) {
      sound.jump();
      squashAndStretch(player);
    }
  }

  // Walk cycle for limbs
  const isMoving = move.x !== 0 || move.y !== 0;
  animateWalkCycle(player, isMoving, dt, time);

  // Floating & spinning animation for pickups
  animateFloating(gem, time);

  // Update active tweens
  updateTweens(dt);
});

// Collision check
if (checkSphereCollision(player, 0.8, gem, 0.5)) {
  sound.coin();
  hud.addScore(100);
  engine.spawnParticles({ position: gem.position, count: 15, color: 0xfacc15 });
  gem.position.set(-999, -999, -999); // Consume pickup
}
\`\`\`
`;
