// ecg.js — ECG waveform animation (loading screen)

// ---------------------------
// ECG WAVEFORM
// ---------------------------
let ecgScene, ecgCamera, ecgRenderer;
let ecgLine, ecgGeometry;
let rig;

let pendingRecenter = false;

const numPoints = 100;
const ecgWave = [
  0, 0, 0, 0, 0.05, 0.1, 0.15, 0.05, 0, -0.15,
  1.3, -0.5, 0.2, 0.1, 0.05, 0, 0, 0, 0, 0,
];

let waveIndex = 0;
let frameCounter = 0;
const framesPerShift = 2;

function initECG() {
  const container = document.getElementById("ecg-container");

  ecgScene = new THREE.Scene();
  ecgCamera = new THREE.OrthographicCamera(-2.5, 2.5, 0.8, -0.2, 0.1, 10);
  ecgCamera.position.z = 5;

  ecgRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  ecgRenderer.setSize(container.clientWidth, container.clientHeight);
  ecgRenderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(ecgRenderer.domElement);

  const points = [];
  const xStart = -2.5;
  const xEnd = 2.5;
  const xStep = (xEnd - xStart) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    points.push(new THREE.Vector3(xStart + i * xStep, 0, 0));
  }

  ecgGeometry = new THREE.BufferGeometry().setFromPoints(points);

  const ecgMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
  });

  ecgLine = new THREE.Line(ecgGeometry, ecgMaterial);
  ecgLine.scale.y = 0.4;
  ecgLine.position.y = 0.1;
  ecgScene.add(ecgLine);

  window.addEventListener("resize", () => {
    ecgRenderer.setPixelRatio(window.devicePixelRatio);
    ecgRenderer.setSize(container.clientWidth, container.clientHeight);
  });
}

function animateECG() {
  requestAnimationFrame(animateECG);

  frameCounter++;
  if (frameCounter < framesPerShift) return;
  frameCounter = 0;

  const pos = ecgGeometry.attributes.position;

  for (let i = 0; i < numPoints - 1; i++) {
    pos.setY(i, pos.getY(i + 1));
  }

  pos.setY(numPoints - 1, ecgWave[waveIndex]);
  waveIndex = (waveIndex + 1) % ecgWave.length;

  pos.needsUpdate = true;
  ecgRenderer.render(ecgScene, ecgCamera);
}