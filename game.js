import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls;
let blocks = [];

const worldSize = 10;
const blockSize = 1;
const playerHeight = 1.8;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = false;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Luz
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Controles (pointer lock)
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

  // Criar mundo simples: chão e alguns blocos
  const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
  const materialDirt = new THREE.MeshLambertMaterial({color: 0x8B4513}); // marrom terra
  const materialGrass = new THREE.MeshLambertMaterial({color: 0x228B22}); // verde grama

  for(let x=0; x<worldSize; x++){
    for(let z=0; z<worldSize; z++){
      // chão (terra)
      let block = new THREE.Mesh(geometry, materialDirt);
      block.position.set(x*blockSize, 0, z*blockSize);
      scene.add(block);
      blocks.push(block);

      // blocos de grama em alguns lugares
      if(Math.random() > 0.7){
        let grassBlock = new THREE.Mesh(geometry, materialGrass);
        grassBlock.position.set(x*blockSize, blockSize, z*blockSize);
        scene.add(grassBlock);
        blocks.push(grassBlock);
      }
    }
  }

  camera.position.set(worldSize/2, playerHeight, worldSize/2);

  // Movimentação
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Mouse clique para colocar/quebrar bloco
  document.addEventListener('mousedown', onMouseDown);

  window.addEventListener('resize', onWindowResize);
}

const move = { forward:false, backward:false, left:false, right:false };

function onKeyDown(event){
  switch(event.code){
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
      if(canJump) velocity.y = 8;
      canJump = false;
      break;
  }
}

function onKeyUp(event){
  switch(event.code){
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

function onMouseDown(event){
  if(!controls.isLocked) return;

  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
  const intersects = raycaster.intersectObjects(blocks);

  if(intersects.length > 0){
    const intersect = intersects[0];
    if(event.shiftKey){
      const normal = intersect.face.normal;
      const pos = intersect.object.position.clone().add(normal);

      if(!blocks.some(b => b.position.equals(pos))){
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        const material = new THREE.MeshLambertMaterial({color: 0x228B22});
        const newBlock = new THREE.Mesh(geometry, material);
        newBlock.position.copy(pos);
        scene.add(newBlock);
        blocks.push(newBlock);
      }
    } else {
      const block = intersect.object;
      scene.remove(block);
      blocks.splice(blocks.indexOf(block), 1);
    }
  }
}

function onWindowResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(){
  requestAnimationFrame(animate);

  if(controls.isLocked){
    const time = performance.now();
    const delta = (time - (animate.prevTime || time)) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 5.0 * delta; // gravidade

    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize();

    if(move.forward || move.backward) velocity.z -= direction.z * 50.0 * delta;
    if(move.left || move.right) velocity.x -= direction.x * 50.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta;

    const minY = 0.5 + playerHeight/2;
    if(controls.getObject().position.y < minY){
      velocity.y = 0;
      controls.getObject().position.y = minY;
      canJump = true;
    }

    animate.prevTime = time;
  }

  renderer.render(scene, camera);
}
