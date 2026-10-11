import * as THREE from "three";
import {
  createEngine,
  sound,
  squashAndStretch,
  updateTweens,
  createGround,
} from "./engine/index.js";

// Initialize engine with dark sleek background and soft fog
const engine = createEngine({
  background: 0x09090b,
  fog: true,
  fogColor: 0x09090b,
  fogNear: 10,
  fogFar: 45,
  cameraPos: [0, 2.5, 7],
  cameraLookAt: [0, 0.5, 0],
});

// Ground grid with dark styling
const ground = createGround({
  size: 60,
  divisions: 30,
  color: 0x0c0a09,
  gridColor: 0x1c1917,
});
engine.scene.add(ground);

// Point light with warm orange illumination matching logo
const orangeLight = new THREE.PointLight(0xea580c, 8, 15);
orangeLight.position.set(0, 2, 2);
engine.scene.add(orangeLight);

// Group holding the logo cube assembly
const cubePivot = new THREE.Group();
cubePivot.position.set(0, 1.2, 0);
engine.scene.add(cubePivot);

// Materials inspired by public/logo.svg:
// #EA580C orange base, glossy white top/side facets, and warm specular sheen
const materials = [
  // Right (+X)
  new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.2,
    metalness: 0.3,
  }),
  // Left (-X)
  new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.3,
    metalness: 0.2,
  }),
  // Top (+Y) - Glossy translucent white sheen like the logo top face
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.1,
    emissive: 0xf97316,
    emissiveIntensity: 0.25,
  }),
  // Bottom (-Y)
  new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.4,
    metalness: 0.4,
  }),
  // Front (+Z)
  new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.2,
    metalness: 0.3,
  }),
  // Back (-Z)
  new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.3,
    metalness: 0.3,
  }),
];

// Main Cube Mesh
const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
const cubeMesh = new THREE.Mesh(boxGeo, materials);
cubeMesh.castShadow = true;
cubeMesh.receiveShadow = true;
cubePivot.add(cubeMesh);

// Sleek luminous wireframe / edge accents matching logo bevels
const edgesGeo = new THREE.EdgesGeometry(boxGeo);
const edgesMat = new THREE.LineBasicMaterial({
  color: 0xffedd5,
  linewidth: 2,
  transparent: true,
  opacity: 0.85,
});
const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
cubePivot.add(wireframe);

// Floating subtle orbital halo ring
const ringGeo = new THREE.TorusGeometry(1.7, 0.025, 8, 48);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xea580c,
  transparent: true,
  opacity: 0.4,
});
const haloRing = new THREE.Mesh(ringGeo, ringMat);
haloRing.rotation.x = Math.PI / 2.3;
cubePivot.add(haloRing);

// Hover & Click interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isHovered = false;

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("pointerdown", () => {
  raycaster.setFromCamera(mouse, engine.camera);
  const intersects = raycaster.intersectObject(cubeMesh);

  if (intersects.length > 0) {
    sound.powerup();
    squashAndStretch(cubePivot, { scaleY: 0.75, scaleXZ: 1.25, duration: 0.3 });
    engine.spawnParticles({
      position: cubePivot.position,
      count: 35,
      color: 0xea580c,
      speed: 5,
      spread: 1.2,
      lifetime: 0.8,
    });
    engine.spawnFloatingText("✨ 3D Engine Ready!", cubePivot.position, {
      color: "#f97316",
      fontSize: "18px",
    });
  }
});

// Overlay UI Banner
const banner = document.createElement("div");
banner.style.position = "fixed";
banner.style.bottom = "28px";
banner.style.left = "50%";
banner.style.transform = "translateX(-50%)";
banner.style.display = "flex";
banner.style.flexDirection = "column";
banner.style.alignItems = "center";
banner.style.gap = "8px";
banner.style.pointerEvents = "none";
banner.style.userSelect = "none";
banner.style.fontFamily = "system-ui, -apple-system, sans-serif";
banner.style.zIndex = "20";
banner.style.textAlign = "center";

banner.innerHTML = `
  <div style="display:flex;align-items:center;gap:8px;background:rgba(24,24,27,0.85);backdrop-filter:blur(8px);border:1px solid rgba(234,88,12,0.3);padding:6px 16px;border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
    <span style="width:8px;height:8px;border-radius:50%;background:#ea580c;box-shadow:0 0 8px #ea580c;"></span>
    <span style="color:#f4f4f5;font-weight:700;font-size:12px;letter-spacing:0.06em;">GAMELIA ENGINE ONLINE</span>
  </div>
  <p style="color:#a1a1aa;font-size:13px;margin:0;text-shadow:0 2px 4px rgba(0,0,0,0.8);">
    Describe your game in chat to start creating. Click the cube to test audio & particles!
  </p>
`;
document.body.appendChild(banner);

// Main animation loop
engine.onUpdate((dt, elapsed) => {
  updateTweens(dt);

  // Smooth floating motion
  cubePivot.position.y = 1.2 + Math.sin(elapsed * 1.8) * 0.15;

  // Gentle tumble rotation
  cubePivot.rotation.x = Math.sin(elapsed * 0.6) * 0.15 + 0.2;
  cubePivot.rotation.y += 0.8 * dt;

  // Spin halo ring counter-clockwise
  haloRing.rotation.z += 0.5 * dt;

  // Light pulsation
  orangeLight.intensity = 6 + Math.sin(elapsed * 3) * 2;

  // Mouse raycast hover check
  raycaster.setFromCamera(mouse, engine.camera);
  const hits = raycaster.intersectObject(cubeMesh);
  if (hits.length > 0) {
    if (!isHovered) {
      isHovered = true;
      document.body.style.cursor = "pointer";
    }
  } else if (isHovered) {
    isHovered = false;
    document.body.style.cursor = "default";
  }
});
