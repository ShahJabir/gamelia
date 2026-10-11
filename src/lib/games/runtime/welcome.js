import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.IcosahedronGeometry(1.5, 0);
const material = new THREE.MeshStandardMaterial({
  color: 0x6366f1,
  wireframe: true,
  roughness: 0.2,
  metalness: 0.8,
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 1.5));

function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.005;
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
