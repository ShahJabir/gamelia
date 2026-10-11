import * as THREE from "three";

/**
 * High-performance, cross-platform input manager.
 * Supports keyboard (WASD/Arrows), mouse, pointer raycasting,
 * and mobile virtual on-screen touch joystick + action buttons.
 */
export function createInput(options = {}) {
  const { touchControls = true } = options;

  const keys = new Map();
  const justPressedKeys = new Set();
  const justReleasedKeys = new Set();

  function onKeyDown(e) {
    const code = e.code.toLowerCase();
    if (!keys.get(code)) {
      justPressedKeys.add(code);
    }
    keys.set(code, true);
  }

  function onKeyUp(e) {
    const code = e.code.toLowerCase();
    keys.set(code, false);
    justReleasedKeys.add(code);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // Mouse & Pointer
  const mouse = {
    x: 0,
    y: 0,
    isDown: false,
    justClicked: false,
  };

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectPoint = new THREE.Vector3();

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function onMouseDown() {
    mouse.isDown = true;
    mouse.justClicked = true;
  }

  function onMouseUp() {
    mouse.isDown = false;
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);

  // Virtual touch controls for mobile/tablet
  let touchVector = { x: 0, y: 0 };
  let touchAction = false;
  let hasTouch = false;

  if (touchControls && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
    hasTouch = true;
    const touchOverlay = document.createElement("div");
    touchOverlay.id = "gamelia-touch-overlay";
    touchOverlay.style.position = "fixed";
    touchOverlay.style.bottom = "0";
    touchOverlay.style.left = "0";
    touchOverlay.style.width = "100%";
    touchOverlay.style.height = "160px";
    touchOverlay.style.pointerEvents = "none";
    touchOverlay.style.zIndex = "40";
    touchOverlay.style.display = "flex";
    touchOverlay.style.justifyContent = "space-between";
    touchOverlay.style.alignItems = "center";
    touchOverlay.style.padding = "0 24px";
    document.body.appendChild(touchOverlay);

    // Joystick Base
    const joyBase = document.createElement("div");
    joyBase.style.width = "100px";
    joyBase.style.height = "100px";
    joyBase.style.borderRadius = "50%";
    joyBase.style.background = "rgba(255,255,255,0.1)";
    joyBase.style.border = "2px solid rgba(255,255,255,0.2)";
    joyBase.style.position = "relative";
    joyBase.style.pointerEvents = "auto";
    joyBase.style.touchAction = "none";
    touchOverlay.appendChild(joyBase);

    // Joystick Thumb
    const joyThumb = document.createElement("div");
    joyThumb.style.width = "40px";
    joyThumb.style.height = "40px";
    joyThumb.style.borderRadius = "50%";
    joyThumb.style.background = "#ea580c";
    joyThumb.style.boxShadow = "0 0 12px rgba(234,88,12,0.8)";
    joyThumb.style.position = "absolute";
    joyThumb.style.top = "30px";
    joyThumb.style.left = "30px";
    joyThumb.style.transition = "transform 0.05s ease";
    joyBase.appendChild(joyThumb);

    // Action Button
    const actionBtn = document.createElement("div");
    actionBtn.style.width = "72px";
    actionBtn.style.height = "72px";
    actionBtn.style.borderRadius = "50%";
    actionBtn.style.background = "#ea580c";
    actionBtn.style.color = "#ffffff";
    actionBtn.style.display = "flex";
    actionBtn.style.alignItems = "center";
    actionBtn.style.justifyContent = "center";
    actionBtn.style.fontWeight = "bold";
    actionBtn.style.fontSize = "16px";
    actionBtn.style.boxShadow = "0 0 16px rgba(234,88,12,0.6)";
    actionBtn.style.pointerEvents = "auto";
    actionBtn.style.userSelect = "none";
    actionBtn.innerText = "ACTION";
    touchOverlay.appendChild(actionBtn);

    let joyTouchId = null;
    let baseRect = null;

    joyBase.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      baseRect = joyBase.getBoundingClientRect();
      handleJoyMove(t.clientX, t.clientY);
    });

    window.addEventListener("touchmove", (e) => {
      if (joyTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joyTouchId) {
          handleJoyMove(t.clientX, t.clientY);
          break;
        }
      }
    });

    const endJoy = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          joyTouchId = null;
          touchVector.x = 0;
          touchVector.y = 0;
          joyThumb.style.transform = "translate(0px, 0px)";
          break;
        }
      }
    };
    window.addEventListener("touchend", endJoy);
    window.addEventListener("touchcancel", endJoy);

    function handleJoyMove(cx, cy) {
      if (!baseRect) return;
      const centerX = baseRect.left + baseRect.width / 2;
      const centerY = baseRect.top + baseRect.height / 2;
      const dx = cx - centerX;
      const dy = cy - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 35;
      const clamped = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);

      const nx = Math.cos(angle) * (clamped / maxDist);
      const ny = Math.sin(angle) * (clamped / maxDist);
      touchVector.x = nx;
      touchVector.y = ny;

      const px = Math.cos(angle) * clamped;
      const py = Math.sin(angle) * clamped;
      joyThumb.style.transform = `translate(${px}px, ${py}px)`;
    }

    actionBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      touchAction = true;
      keys.set("space", true);
      justPressedKeys.add("space");
    });
    actionBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      touchAction = false;
      keys.set("space", false);
      justReleasedKeys.add("space");
    });
  }

  function isDown(code) {
    const c = code.toLowerCase();
    if (c === "action") return isDown("space") || touchAction;
    return Boolean(keys.get(c));
  }

  function justPressed(code) {
    const c = code.toLowerCase();
    if (c === "action") return justPressed("space") || touchAction;
    return justPressedKeys.has(c);
  }

  function getVector() {
    let x = 0;
    let y = 0;

    if (isDown("keyd") || isDown("arrowright")) x += 1;
    if (isDown("keya") || isDown("arrowleft")) x -= 1;
    if (isDown("keyw") || isDown("arrowup")) y += 1;
    if (isDown("keys") || isDown("arrowdown")) y -= 1;

    // Combine with touch controls
    if (touchVector.x !== 0 || touchVector.y !== 0) {
      x += touchVector.x;
      y += -touchVector.y; // Invert Y for forward
    }

    const len = Math.sqrt(x * x + y * y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  function getGroundIntersection(camera) {
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    return hit ? intersectPoint.clone() : null;
  }

  function update() {
    justPressedKeys.clear();
    justReleasedKeys.clear();
    mouse.justClicked = false;
  }

  return {
    isDown,
    justPressed,
    getVector,
    mouse,
    getGroundIntersection,
    update,
  };
}

/**
 * Creates a smooth camera follow controller.
 */
export function createCameraFollow(camera, target, options = {}) {
  const {
    offset = new THREE.Vector3(0, 8, 12),
    lookOffset = new THREE.Vector3(0, 1, 0),
    smoothness = 0.08,
  } = options;

  const currentLookAt = new THREE.Vector3();

  return function updateCameraFollow() {
    if (!target) return;

    const targetPos = target.position.clone().add(offset);
    camera.position.lerp(targetPos, smoothness);

    const desiredLook = target.position.clone().add(lookOffset);
    currentLookAt.lerp(desiredLook, smoothness * 1.5);
    camera.lookAt(currentLookAt);
  };
}
