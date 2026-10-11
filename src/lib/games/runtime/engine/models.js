import * as THREE from "three";

/**
 * Procedural 3D model generator for browser games.
 * Generates stylized characters, spaceships, enemies, pickups, and environment props
 * without needing external 3D asset files.
 */

// Shared materials for reuse and performance
const materials = {
  playerBody: new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.3,
    metalness: 0.4,
  }),
  playerVisor: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.5,
    metalness: 0.8,
  }),
  orangeAccent: new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.2,
    metalness: 0.5,
  }),
  thrusterGlow: new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
  }),
  enemyBody: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
    metalness: 0.6,
  }),
  enemyEye: new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1.5,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0xca8a04,
    emissiveIntensity: 0.3,
  }),
  gem: new THREE.MeshPhysicalMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 0.5,
  }),
  wood: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }),
  foliage: new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.6,
    flatShading: true,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.9,
    flatShading: true,
  }),
};

function enableShadows(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return obj;
}

/**
 * Creates an animated-ready humanoid player character with limbs.
 */
export function createCharacter(options = {}) {
  const { color = 0x3b82f6, accentColor = 0xea580c } = options;

  const group = new THREE.Group();
  group.name = "Character";

  const bodyMat = materials.playerBody.clone();
  bodyMat.color.set(color);

  const accentMat = materials.orangeAccent.clone();
  accentMat.color.set(accentColor);

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.position.y = 1.3;
  group.add(torso);

  // Head
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.y = 2.15;
  group.add(head);

  // Visor
  const visorGeo = new THREE.BoxGeometry(0.5, 0.22, 0.2);
  const visor = new THREE.Mesh(visorGeo, materials.playerVisor);
  visor.position.set(0, 2.18, 0.26);
  group.add(visor);

  // Backpack / Jetpack
  const jetpackGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
  const jetpack = new THREE.Mesh(jetpackGeo, accentMat);
  jetpack.position.set(0, 1.35, -0.35);
  group.add(jetpack);

  // Thruster nozzels
  const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8);
  const nozzleLeft = new THREE.Mesh(nozzleGeo, materials.darkMetal);
  nozzleLeft.position.set(-0.16, 0.95, -0.35);
  group.add(nozzleLeft);

  const nozzleRight = nozzleLeft.clone();
  nozzleRight.position.x = 0.16;
  group.add(nozzleRight);

  // Limbs with pivot points
  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.55, 1.7, 0);
  const armGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
  const leftArmMesh = new THREE.Mesh(armGeo, bodyMat);
  leftArmMesh.position.y = -0.4;
  leftArmGroup.add(leftArmMesh);
  group.add(leftArmGroup);

  // Right Arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.55, 1.7, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, bodyMat);
  rightArmMesh.position.y = -0.4;
  rightArmGroup.add(rightArmMesh);
  group.add(rightArmGroup);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.24, 0.8, 0);
  const legGeo = new THREE.BoxGeometry(0.28, 0.8, 0.28);
  const leftLegMesh = new THREE.Mesh(legGeo, materials.darkMetal);
  leftLegMesh.position.y = -0.4;
  leftLegGroup.add(leftLegMesh);
  group.add(leftLegGroup);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.24, 0.8, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, materials.darkMetal);
  rightLegMesh.position.y = -0.4;
  rightLegGroup.add(rightLegMesh);
  group.add(rightLegGroup);

  group.userData = {
    head,
    torso,
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    leftLeg: leftLegGroup,
    rightLeg: rightLegGroup,
  };

  return enableShadows(group);
}

/**
 * Creates a sci-fi spaceship or fighter craft.
 */
export function createSpaceship(options = {}) {
  const { color = 0xea580c } = options;
  const group = new THREE.Group();
  group.name = "Spaceship";

  const hullMat = materials.orangeAccent.clone();
  hullMat.color.set(color);

  // Cockpit / Fuselage
  const hullGeo = new THREE.ConeGeometry(0.8, 3.2, 5);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.rotation.y = Math.PI;
  group.add(hull);

  // Canopy
  const canopyGeo = new THREE.BoxGeometry(0.4, 0.35, 1.0);
  const canopy = new THREE.Mesh(canopyGeo, materials.playerVisor);
  canopy.position.set(0, 0.3, -0.2);
  group.add(canopy);

  // Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(2.2, -1.0);
  wingShape.lineTo(2.0, -1.8);
  wingShape.lineTo(0, -0.8);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.1,
    bevelEnabled: false,
  });
  const wingMesh = new THREE.Mesh(wingExtrude, materials.darkMetal);
  wingMesh.rotation.x = Math.PI / 2;
  wingMesh.position.set(0, 0, 0.2);
  group.add(wingMesh);

  const leftWing = wingMesh.clone();
  leftWing.scale.x = -1;
  group.add(leftWing);

  // Engine Thruster
  const thrusterGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.4, 8);
  const thruster = new THREE.Mesh(thrusterGeo, materials.darkMetal);
  thruster.rotation.x = Math.PI / 2;
  thruster.position.set(0, 0, 1.6);
  group.add(thruster);

  const glowGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.2, 8);
  const glow = new THREE.Mesh(glowGeo, materials.thrusterGlow);
  glow.rotation.x = Math.PI / 2;
  glow.position.set(0, 0, 1.7);
  group.add(glow);

  return enableShadows(group);
}

/**
 * Creates an enemy drone, crawler, or turret.
 */
export function createEnemy(type = "drone", options = {}) {
  const group = new THREE.Group();
  group.name = `Enemy_${type}`;

  if (type === "drone") {
    // Floating sphere with ring and eye
    const bodyGeo = new THREE.SphereGeometry(0.65, 12, 12);
    const body = new THREE.Mesh(bodyGeo, materials.enemyBody);
    group.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const eye = new THREE.Mesh(eyeGeo, materials.enemyEye);
    eye.position.set(0, 0, 0.55);
    group.add(eye);

    const ringGeo = new THREE.TorusGeometry(0.9, 0.08, 6, 18);
    const ring = new THREE.Mesh(ringGeo, materials.darkMetal);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    group.userData.ring = ring;
  } else if (type === "turret") {
    const baseGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.5, 8);
    const base = new THREE.Mesh(baseGeo, materials.darkMetal);
    group.add(base);

    const headGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const head = new THREE.Mesh(headGeo, materials.enemyBody);
    head.position.y = 0.6;
    group.add(head);

    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8);
    const barrel = new THREE.Mesh(barrelGeo, materials.darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.6, 0.7);
    group.add(barrel);
    group.userData.head = head;
  } else {
    // Crawler box monster
    const bodyGeo = new THREE.BoxGeometry(1.0, 0.7, 1.0);
    const body = new THREE.Mesh(bodyGeo, materials.enemyBody);
    body.position.y = 0.6;
    group.add(body);

    const eyeGeo = new THREE.BoxGeometry(0.7, 0.15, 0.1);
    const eye = new THREE.Mesh(eyeGeo, materials.enemyEye);
    eye.position.set(0, 0.7, 0.52);
    group.add(eye);
  }

  return enableShadows(group);
}

/**
 * Creates collectible items: coin, gem, star, or heart.
 */
export function createPickup(type = "coin") {
  const group = new THREE.Group();
  group.name = `Pickup_${type}`;

  if (type === "coin") {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const mesh = new THREE.Mesh(geo, materials.gold);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
  } else if (type === "gem") {
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const mesh = new THREE.Mesh(geo, materials.gem);
    group.add(mesh);
  } else if (type === "heart") {
    const mat = materials.enemyEye.clone();
    const geo = new THREE.DodecahedronGeometry(0.35, 0);
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  }

  group.userData.isPickup = true;
  group.userData.pickupType = type;
  return enableShadows(group);
}

/**
 * Creates environment props: tree, rock, crate, or portal.
 */
export function createProp(type = "tree") {
  const group = new THREE.Group();
  group.name = `Prop_${type}`;

  if (type === "tree") {
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.2, 6);
    const trunk = new THREE.Mesh(trunkGeo, materials.wood);
    trunk.position.y = 0.6;
    group.add(trunk);

    const folGeo1 = new THREE.ConeGeometry(1.4, 1.8, 6);
    const fol1 = new THREE.Mesh(folGeo1, materials.foliage);
    fol1.position.y = 2.0;
    group.add(fol1);

    const folGeo2 = new THREE.ConeGeometry(1.0, 1.4, 6);
    const fol2 = new THREE.Mesh(folGeo2, materials.foliage);
    fol2.position.y = 2.8;
    group.add(fol2);
  } else if (type === "rock") {
    const geo = new THREE.DodecahedronGeometry(0.9, 0);
    const rock = new THREE.Mesh(geo, materials.stone);
    rock.position.y = 0.6;
    rock.scale.set(1.2, 0.8, 1.0);
    group.add(rock);
  } else if (type === "crate") {
    const geo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const crate = new THREE.Mesh(geo, materials.wood);
    crate.position.y = 0.5;
    group.add(crate);

    const trimGeo = new THREE.BoxGeometry(1.04, 0.2, 1.04);
    const trim = new THREE.Mesh(trimGeo, materials.darkMetal);
    trim.position.y = 0.5;
    group.add(trim);
  } else if (type === "portal") {
    const ringGeo = new THREE.TorusGeometry(1.6, 0.2, 8, 24);
    const ring = new THREE.Mesh(ringGeo, materials.darkMetal);
    ring.position.y = 1.8;
    group.add(ring);

    const gateGeo = new THREE.CircleGeometry(1.4, 24);
    const gateMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.y = 1.8;
    group.add(gate);
    group.userData.gate = gate;
  }

  return enableShadows(group);
}

/**
 * Creates a stylish grid ground plane with shadows.
 */
export function createGround(options = {}) {
  const { size = 100, divisions = 50, color = 0x18181b, gridColor = 0x27272a } = options;

  const group = new THREE.Group();
  const planeGeo = new THREE.PlaneGeometry(size, size);
  const planeMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.1,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  group.add(plane);

  const grid = new THREE.GridHelper(size, divisions, gridColor, gridColor);
  grid.position.y = 0.01;
  group.add(grid);

  return group;
}
