import * as THREE from "three";

/**
 * Creates and initializes the 3D game engine.
 * Handles scene, camera, renderer, lighting, game loop, responsive resize, screen shake, and particles.
 */
export function createEngine(options = {}) {
  const {
    fov = 60,
    near = 0.1,
    far = 1000,
    cameraPos = [0, 8, 14],
    cameraLookAt = [0, 0, 0],
    background = 0x09090b,
    fog = true,
    fogColor = 0x09090b,
    fogNear = 20,
    fogFar = 80,
    shadows = true,
    container = document.body,
  } = options;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) {
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    near,
    far,
  );
  camera.position.set(...cameraPos);
  camera.lookAt(...cameraLookAt);

  // Base camera anchor for shake
  const cameraBasePos = camera.position.clone();

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  container.appendChild(renderer.domElement);

  // Default lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
  sunLight.position.set(15, 25, 15);
  if (shadows) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
  }
  scene.add(sunLight);

  // Secondary soft colored fill light
  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x18181b, 0.5);
  scene.add(hemiLight);

  // Resize handler
  function handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener("resize", handleResize);

  // Shake state
  let shakeIntensity = 0;
  let shakeDecay = 1;

  function shake(intensity = 0.6, duration = 0.3) {
    shakeIntensity = intensity;
    shakeDecay = intensity / Math.max(duration, 0.05);
  }

  // Particle pool
  const maxParticles = 300;
  const particleGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
  const particleMesh = new THREE.InstancedMesh(
    particleGeo,
    particleMat,
    maxParticles,
  );
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(particleMesh);

  const particles = Array.from({ length: maxParticles }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 1,
    scale: 1,
    color: new THREE.Color(1, 1, 1),
  }));

  const dummy = new THREE.Object3D();
  let nextParticleIdx = 0;

  function spawnParticles(opts = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      count = 20,
      color = 0xff7700,
      speed = 4,
      spread = 1,
      lifetime = 0.6,
      gravity = -8,
      size = 1,
    } = opts;

    const baseColor = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const p = particles[nextParticleIdx];
      nextParticleIdx = (nextParticleIdx + 1) % maxParticles;

      p.active = true;
      p.x = position.x + (Math.random() - 0.5) * 0.2;
      p.y = position.y + (Math.random() - 0.5) * 0.2;
      p.z = position.z + (Math.random() - 0.5) * 0.2;

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const spd = speed * (0.5 + Math.random() * 0.8);
      p.vx = Math.cos(phi) * Math.cos(theta) * spd * spread;
      p.vy = (Math.sin(phi) * 0.5 + 0.5) * spd + 1;
      p.vz = Math.cos(phi) * Math.sin(theta) * spd * spread;

      p.life = 0;
      p.maxLife = lifetime * (0.6 + Math.random() * 0.8);
      p.scale = size * (0.7 + Math.random() * 0.6);
      p.color.copy(baseColor);
    }
  }

  function updateParticles(dt) {
    let activeCount = 0;
    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      if (!p.active) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        particleMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        particleMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      activeCount++;
      p.vy += -9.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const progress = p.life / p.maxLife;
      const s = p.scale * (1 - progress);

      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      particleMesh.setMatrixAt(i, dummy.matrix);
      particleMesh.setColorAt(i, p.color);
    }
    particleMesh.instanceMatrix.needsUpdate = true;
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  }

  // Floating HTML texts overlay
  const textContainer = document.createElement("div");
  textContainer.style.position = "fixed";
  textContainer.style.top = "0";
  textContainer.style.left = "0";
  textContainer.style.width = "100%";
  textContainer.style.height = "100%";
  textContainer.style.pointerEvents = "none";
  textContainer.style.overflow = "hidden";
  textContainer.style.zIndex = "50";
  container.appendChild(textContainer);

  function spawnFloatingText(text, worldPos, opts = {}) {
    const {
      color = "#ea580c",
      fontSize = "18px",
      duration = 0.9,
      prefix = "",
    } = opts;

    const el = document.createElement("div");
    el.textContent = `${prefix}${text}`;
    el.style.position = "absolute";
    el.style.color = color;
    el.style.fontSize = fontSize;
    el.style.fontWeight = "bold";
    el.style.fontFamily = "system-ui, sans-serif";
    el.style.textShadow = "0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)";
    el.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-in`;
    el.style.transform = "translate(-50%, -50%) scale(1)";
    el.style.opacity = "1";
    textContainer.appendChild(el);

    const pos = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    pos.project(camera);
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    requestAnimationFrame(() => {
      el.style.transform = "translate(-50%, -80px) scale(1.2)";
      el.style.opacity = "0";
    });

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration * 1000);
  }

  // Update hooks
  const updateCallbacks = [];
  const clock = new THREE.Clock();
  let animationFrameId = null;
  let isRunning = true;

  function onUpdate(fn) {
    updateCallbacks.push(fn);
  }

  function loop() {
    if (!isRunning) return;
    animationFrameId = requestAnimationFrame(loop);

    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // Camera shake calculation
    if (shakeIntensity > 0) {
      shakeIntensity = Math.max(0, shakeIntensity - shakeDecay * dt);
      const ox = (Math.random() - 0.5) * 2 * shakeIntensity;
      const oy = (Math.random() - 0.5) * 2 * shakeIntensity;
      const oz = (Math.random() - 0.5) * 2 * shakeIntensity;
      camera.position.set(
        cameraBasePos.x + ox,
        cameraBasePos.y + oy,
        cameraBasePos.z + oz,
      );
    }

    // Call update listeners
    for (let i = 0; i < updateCallbacks.length; i++) {
      try {
        updateCallbacks[i](dt, elapsed);
      } catch (err) {
        console.error("[Engine Update Error]", err);
      }
    }

    // Update particle simulations
    updateParticles(dt);

    // Render scene
    renderer.render(scene, camera);
  }

  // Start loop
  clock.start();
  loop();

  return {
    scene,
    camera,
    renderer,
    sunLight,
    ambientLight,
    clock,
    onUpdate,
    shake,
    spawnParticles,
    spawnFloatingText,
    setCameraBase(x, y, z) {
      cameraBasePos.set(x, y, z);
    },
    stop() {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    },
  };
}
