import * as THREE from "three";

/**
 * Lightweight physics, collision, and character controller for 3D arcade games.
 */

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = (a.z ?? a.y) - (b.z ?? b.y);
  return Math.sqrt(dx * dx + dz * dz);
}

export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function checkSphereCollision(objA, radiusA, objB, radiusB) {
  const posA = objA.position || objA;
  const posB = objB.position || objB;
  const distSq =
    (posA.x - posB.x) ** 2 + (posA.y - posB.y) ** 2 + (posA.z - posB.z) ** 2;
  const radiusSum = radiusA + radiusB;
  return distSq <= radiusSum * radiusSum;
}

export function checkAABBCollision(meshA, meshB) {
  const boxA = new THREE.Box3().setFromObject(meshA);
  const boxB = new THREE.Box3().setFromObject(meshB);
  return boxA.intersectsBox(boxB);
}

/**
 * Creates a responsive arcade character controller with gravity, jumping, and rotation.
 */
export function createCharacterController(mesh, options = {}) {
  const {
    speed = 8,
    jumpForce = 12,
    gravity = -28,
    groundY = 0,
    turnSpeed = 14,
  } = options;

  const velocity = new THREE.Vector3();
  let isGrounded = true;

  function move(inputVector, dt) {
    if (!mesh) return;

    // Horizontal movement
    velocity.x = inputVector.x * speed;
    velocity.z = -inputVector.y * speed;

    // Rotate mesh towards movement direction
    if (inputVector.x !== 0 || inputVector.y !== 0) {
      const targetAngle = Math.atan2(inputVector.x, -inputVector.y);
      let diff = targetAngle - mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      mesh.rotation.y += diff * Math.min(turnSpeed * dt, 1);
    }

    // Apply gravity
    velocity.y += gravity * dt;

    // Apply position changes
    mesh.position.x += velocity.x * dt;
    mesh.position.z += velocity.z * dt;
    mesh.position.y += velocity.y * dt;

    // Ground check
    if (mesh.position.y <= groundY) {
      mesh.position.y = groundY;
      velocity.y = 0;
      isGrounded = true;
    } else {
      isGrounded = false;
    }
  }

  function jump() {
    if (isGrounded) {
      velocity.y = jumpForce;
      isGrounded = false;
      return true;
    }
    return false;
  }

  return {
    velocity,
    isGrounded: () => isGrounded,
    move,
    jump,
  };
}
