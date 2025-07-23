import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls;
let blocks = [];
const blockSize = 1;
const worldSize = 10;
const playerHeight = 1.8;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = false;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Luz
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Texturas pixel art estilo Minecraft simples
  const loader = new THREE.TextureLoader();

  const grassTexture = loader.load('https://i.imgur.com/dfKYu85.png');
  grassTexture.magFilter = THREE.NearestFilter;
  grassTexture.minFilter = THREE.NearestFilter;

  const dirtTexture = loader.load('https://i.imgur.com/8X8QwpY.png');
  dirtTexture.magFilter = THREE.NearestFilter;
  dirtTexture.minFilter = THREE.NearestFilter;

  const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

  // Criar chão
  for (let x = 0; x < worldSize; x++) {
    for (let z = 0; z < worldSize; z++) {
      // terra (parte inferior)
      const dirtMat = new THREE.MeshBasicMaterial({ map: dirtTexture });
      const dirtBlock = new THREE.Mesh(geometry, dirtMat);
      dirtBlock.position.set(x * blockSize, 0, z * blockSize);
      scene.add(dirtBlock);
      blocks.push(dirtBlock);

      // grama (topo)
      const grassMat = new THREE.MeshBasicMaterial({ map: grassTexture });
      const grassBlock = new THREE.Mesh(geometry, grassMat);
      grassBlock.position.set(x * blockSize, blockSize, z * blockSize);
      scene.add(grassBlock);
      blocks.push(grassBlock);
    }
  }

  camera.position.set(worldSize / 2, playerHeight, worldSize / 2);

  controls = new PointerLockControls(camera, document.body);

  const instructions = document.getElementById('instructions');
  instructions.addEventListener('click', () => {
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    instructions.style.display = '';
  });

  scene.add(controls.getObject());

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);
  window.addEventListener('resize', onWindowResize);
}

const move = { forward: false, backward: false, left: false, right: false };

function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      move.forward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      move.left = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      move.backward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      move.right = true;
      break;
    case 'Space':
      if (canJump) velocity.y = 8;
      canJump = false;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      move.forward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      move.left = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      move.backward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      move.right = false;
      break;
  }
}

const raycaster = new THREE.Raycaster();

function onMouseDown(event) {
  if (!controls.isLocked) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(blocks);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    if (event.shiftKey) {
      // colocar bloco no lado do bloco clicado
      const normal = intersect.face.normal;
      const pos = intersect.object.position.clone().add(normal);

      if (!blocks.some(b => b.position.equals(pos))) {
        const loader = new THREE.TextureLoader();
        const grassTexture = loader.load('https://i.imgur.com/dfKYu85.png');
        grassTexture.magFilter = THREE.NearestFilter;
        grassTexture.minFilter = THREE.NearestFilter;
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        const material = new THREE.MeshBasicMaterial({ map: grassTexture });
        const newBlock = new THREE.Mesh(geometry, material);
        newBlock.position.copy(pos);
        scene.add(newBlock);
        blocks.push(newBlock);
      }
    } else {
      // quebrar bloco
      const block = intersect.object;
      scene.remove(block);
      blocks.splice(blocks.indexOf(block), 1);
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (controls.isLocked) {
    const time = performance.now();
    const delta = (time - (animate.prevTime || time)) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 5.0 * delta;

    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize();

    if (move.forward || move.backward) velocity.z -= direction.z * 50.0 * delta;
    if (move.left || move.right) velocity.x -= direction.x * 50.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta;

    const minY = blockSize / 2 + playerHeight / 2;
    if (controls.getObject().position.y < minY) {
      velocity.y = 0;
      controls.getObject().position.y = minY;
      canJump = true;
    }

    animate.prevTime = time;
  }

  renderer.render(scene, camera);
}
