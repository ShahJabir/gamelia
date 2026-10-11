import * as THREE from "three";

/**
 * Procedural canvas textures and materials for zero-asset 3D games.
 */

/**
 * Creates a THREE.CanvasTexture from a 2D canvas drawing function.
 */
export function createCanvasTexture(width, height, drawFn) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  drawFn(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates a clean procedural cyber grid texture.
 */
export function createGridTexture(options = {}) {
  const {
    size = 256,
    gridSize = 32,
    lineColor = "rgba(234, 88, 12, 0.4)",
    bgColor = "#09090b",
    lineWidth = 2,
  } = options;

  return createCanvasTexture(size, size, (ctx, w, h) => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;

    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

/**
 * Generates a gradient texture (e.g. for skybox or backdrop).
 */
export function createGradientTexture(colorTop = "#09090b", colorBottom = "#ea580c") {
  return createCanvasTexture(64, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Curated PBR material presets.
 */
export function createGlowMaterial(color = 0xea580c, intensity = 1.8) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.2,
    metalness: 0.1,
  });
}

export function createGlassMaterial(color = 0x38bdf8, opacity = 0.5) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 0.5,
    reflectivity: 0.8,
  });
}

export function createGlossyMaterial(color = 0x18181b, metalness = 0.8, roughness = 0.2) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
  });
}
