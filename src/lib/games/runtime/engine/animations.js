/**
 * Procedural animation and tweening toolkit for browser games.
 * Provides tweening, easing curves, character walk/idle cycles, and squash/stretch juice.
 */

export const Easing = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutBack: (t) => {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const activeTweens = [];

/**
 * Creates and starts a property tween.
 */
export function tween(target, props, duration, options = {}) {
  const {
    easing = Easing.easeOutQuad,
    onComplete = null,
    onUpdate = null,
  } = options;

  const startProps = {};
  for (const key in props) {
    if (typeof target[key] === "number") {
      startProps[key] = target[key];
    }
  }

  const tw = {
    target,
    props,
    startProps,
    duration: Math.max(duration, 0.001),
    elapsed: 0,
    easing,
    onComplete,
    onUpdate,
    done: false,
  };

  activeTweens.push(tw);
  return tw;
}

/**
 * Updates all active tweens. Call in the engine update loop.
 */
export function updateTweens(dt) {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    const tw = activeTweens[i];
    tw.elapsed += dt;
    const progress = Math.min(tw.elapsed / tw.duration, 1);
    const easeVal = tw.easing(progress);

    for (const key in tw.startProps) {
      const start = tw.startProps[key];
      const end = tw.props[key];
      tw.target[key] = start + (end - start) * easeVal;
    }

    if (tw.onUpdate) tw.onUpdate(tw.target);

    if (progress >= 1) {
      tw.done = true;
      if (tw.onComplete) tw.onComplete(tw.target);
      activeTweens.splice(i, 1);
    }
  }
}

/**
 * Animates a humanoid character's limbs in a walk cycle based on movement speed.
 */
export function animateWalkCycle(character, isMoving, dt, time) {
  if (!character || !character.userData) return;
  const { leftArm, rightArm, leftLeg, rightLeg, head } = character.userData;
  if (!leftArm || !rightArm || !leftLeg || !rightLeg) return;

  if (isMoving) {
    const walkSpeed = 12;
    const swingAngle = Math.sin(time * walkSpeed) * 0.6;

    leftArm.rotation.x = swingAngle;
    rightArm.rotation.x = -swingAngle;
    leftLeg.rotation.x = -swingAngle;
    rightLeg.rotation.x = swingAngle;

    if (head) {
      head.rotation.y = Math.sin(time * (walkSpeed / 2)) * 0.08;
    }
  } else {
    // Return limbs to resting pose smoothly
    leftArm.rotation.x *= Math.max(0, 1 - dt * 10);
    rightArm.rotation.x *= Math.max(0, 1 - dt * 10);
    leftLeg.rotation.x *= Math.max(0, 1 - dt * 10);
    rightLeg.rotation.x *= Math.max(0, 1 - dt * 10);

    if (head) {
      head.rotation.y *= Math.max(0, 1 - dt * 10);
    }
  }
}

/**
 * Procedural floating / hover effect for collectibles, drones, or powerups.
 */
export function animateFloating(object, time, options = {}) {
  if (!object) return;
  const {
    baseY = object.position.y,
    amplitude = 0.15,
    speed = 2.5,
    rotateSpeed = 1.2,
  } = options;

  object.position.y = baseY + Math.sin(time * speed) * amplitude;
  object.rotation.y += rotateSpeed * 0.016;
}

/**
 * Squash and stretch feedback on impact, jump, or landing.
 */
export function squashAndStretch(mesh, options = {}) {
  if (!mesh) return;
  const {
    scaleY = 0.7,
    scaleXZ = 1.3,
    duration = 0.25,
  } = options;

  const originalScale = {
    x: mesh.scale.x,
    y: mesh.scale.y,
    z: mesh.scale.z,
  };

  mesh.scale.set(
    originalScale.x * scaleXZ,
    originalScale.y * scaleY,
    originalScale.z * scaleXZ,
  );

  tween(
    mesh.scale,
    { x: originalScale.x, y: originalScale.y, z: originalScale.z },
    duration,
    { easing: Easing.easeOutBounce },
  );
}
