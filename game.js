// game.js — initGame, initBoilerplate, VR setup, VR UI creation

// Initialize Game
function initGame() {
  initBoilerplate();
  loadAssets();
  renderer.setAnimationLoop(renderLoop);
  playBeatSoundByColor("pulse-yellow");
}

function yawFromQuaternion(q) {
  const t3 = 2 * (q.w * q.y + q.z * q.x);
  const t4 = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(t3, t4);
}

function quatFromYaw(yaw) {
  const half = yaw * 0.5;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function recenterXRToFacePatient() {
  if (!renderer || !patientModel) return false;

  const frame = renderer.xr.getFrame?.();
  const refSpace = renderer.xr.getReferenceSpace?.();
  if (!frame || !refSpace) return false;

  const pose = frame.getViewerPose(refSpace);
  if (!pose) return false;

  const p = pose.transform.position;
  const o = pose.transform.orientation;
  const headsetYaw = yawFromQuaternion(o);

  const patientPos = new THREE.Vector3();
  patientModel.getWorldPosition(patientPos);

  const dx = patientPos.x - p.x;
  const dz = patientPos.z - p.z;
  const desiredYaw = Math.atan2(dx, dz);

  const yawTune = Math.PI / 2;
  const correction = desiredYaw - headsetYaw + yawTune;

  const offsetRefSpace = refSpace.getOffsetReferenceSpace(
    new XRRigidTransform({ x: 0, y: 0, z: 0 }, quatFromYaw(correction))
  );

  renderer.xr.setReferenceSpace(offsetRefSpace);
  return true;
}

// Game Setup
function initBoilerplate() {
  scene = new THREE.Scene();

  rig = new THREE.Group();
  scene.add(rig);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.copy(gameState.originalCameraPos);
  rig.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");

  document.body.appendChild(renderer.domElement);

  const vrBtn = VRButton.createButton(renderer, {
    optionalFeatures: ["local-floor", "dom-overlay"],
    domOverlay: { root: document.body },
  });

  vrBtn.style.position = "fixed";
  vrBtn.style.left = "20px";
  vrBtn.style.bottom = "20px";
  vrBtn.style.zIndex = "100000";
  document.body.appendChild(vrBtn);

  // --- POST-PROCESSING SETUP ---
  const vignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      vignetteStrength: { value: 0.0 },
      vignetteColor: { value: new THREE.Color(0.6, 0.0, 0.0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float vignetteStrength;
      uniform vec3 vignetteColor;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec2 uv = vUv * (1.0 - vUv.yx);
        float vignette = uv.x * uv.y * 15.0;
        vignette = clamp(pow(vignette, 0.25), 0.0, 1.0);
        float darkness = (1.0 - vignette) * vignetteStrength;
        gl_FragColor = vec4(mix(texel.rgb, vignetteColor * texel.rgb * 0.3, darkness), texel.a);
      }
    `,
  };
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2, 0.4, 0.85
  );
  composer.addPass(bloomPass);
  vignettePass = new ShaderPass(vignetteShader);
  vignettePass.renderToScreen = true;
  composer.addPass(vignettePass);
  // --- END POST-PROCESSING ---

  renderer.xr.addEventListener("sessionstart", () => {
    pendingRecenter = true;
    controls.enabled = false;

    if (vrPulseGroup) vrPulseGroup.visible = true;
    updateVitalUI();
  });

  renderer.xr.addEventListener("sessionend", () => {
    pendingRecenter = false;

    requestAnimationFrame(() => {
      if (vrPulseGroup) vrPulseGroup.visible = false;

      rig.position.set(0, 0, 0);
      rig.rotation.set(0, 0, 0);
      rig.updateMatrixWorld(true);

      camera.position.set(0, 2, -2);

      camera.quaternion.set(-2.0, 0.85, 0.39, 5.657130561438501e-17);

      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateMatrixWorld(true);

      if (controls) {
        controls.enabled = true;

        const dist = camera.position.distanceTo(new THREE.Vector3(1.75, 0.75, 1.3));
        const fwd = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .normalize();

        controls.target.copy(camera.position).add(fwd.multiplyScalar(dist));
        controls.update();
      }

      gameState.isZooming = false;
    });
  });

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.target.set(1.75, 0.75, 1.3);
  controls.update();

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    hoverTooltip.style.left = `${e.clientX + 10}px`;
    hoverTooltip.style.top = `${e.clientY - 20}px`;
  });

  window.addEventListener("click", () => {
    if (renderer.xr.isPresenting) return;
    handleMouseClick();
  });

  // Lighting — bright hospital fluorescent look
  ambientLight = new THREE.AmbientLight(0xf0f8ff, 2.2);  // cool white, strong fill
  directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
  directionalLight.position.set(5, 8, 3);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 30;

  // Overhead ceiling fill — simulates fluorescent banks
  const ceilingLight1 = new THREE.PointLight(0xe8f4ff, 3.0, 12);
  ceilingLight1.position.set(0, 5, 1);
  const ceilingLight2 = new THREE.PointLight(0xe8f4ff, 2.5, 12);
  ceilingLight2.position.set(3, 5, 3);
  scene.add(ceilingLight1, ceilingLight2);

  emergencyLights = new THREE.PointLight(0xff2222, 0.0, 8);  // starts off
  emergencyLights.position.set(2, 3, 2);
  scene.add(ambientLight, directionalLight, emergencyLights);

  // Store ceiling lights for flicker access
  gameState.ceilingLight1 = ceilingLight1;
  gameState.ceilingLight2 = ceilingLight2;
  gameState.flickerActive = false;
  gameState.flickerTimer = 0;
  gameState.flickerBaseAmbient = 2.2;

  createVRUI();
  setupVRControllers();

  window.addEventListener("resize", onWindowResize);

  nextButton.addEventListener("click", () => {
    feedbackPanel.style.display = "none";
    gameState.currentScenario++;

    const activeScenarios = getActiveScenarios();
    if (gameState.currentScenario > activeScenarios.length) {
      endSimulation(true);
      return;
    }

    showScenario(gameState.currentScenario - 1);
  });
}

function setupVRControllers() {
  controller1 = renderer.xr.getController(0);
  controller2 = renderer.xr.getController(1);

  controller1.addEventListener("selectstart", () =>
    handleVRSelect(controller1)
  );
  controller2.addEventListener("selectstart", () =>
    handleVRSelect(controller2)
  );

  controller1.add(buildLaser());
  controller2.add(buildLaser());

  scene.add(controller1);
  scene.add(controller2);

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip2 = renderer.xr.getControllerGrip(1);

  controllerGrip1.add(
    xrControllerModelFactory.createControllerModel(controllerGrip1)
  );
  controllerGrip2.add(
    xrControllerModelFactory.createControllerModel(controllerGrip2)
  );

  scene.add(controllerGrip1);
  scene.add(controllerGrip2);
}

function handleVRSelect(controller) {
  if (vrEndGroup && vrEndGroup.visible) {
    tryInteractWithMenu(controller);
  } else if (vrFeedbackGroup && vrFeedbackGroup.visible) {
    tryInteractWithMenu(controller);
  } else if (vrMenuGroup && vrMenuGroup.visible) {
    tryInteractWithMenu(controller);
  } else {
    tryActivatePatientFromController(controller);
  }
}

function buildLaser() {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  const line = new THREE.Line(geometry, material);

  line.name = "laser";
  line.scale.z = 5;

  return line;
}

// VR UI Functions
function createVRUI() {
  createVRMenu();
  createVRPulseMonitor();
  createVRFeedbackPanel();
  createVREndScreen();
}

function createVRMenu() {
  vrMenuGroup = new THREE.Group();
  scene.add(vrMenuGroup);
  vrMenuGroup.visible = false;

  const panelGeo = new THREE.PlaneGeometry(1.2, 0.9);
  const panelMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    opacity: 0.8,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const panel = new THREE.Mesh(panelGeo, panelMat);
  vrMenuGroup.add(panel);

  const promptGeo = new THREE.PlaneGeometry(1.1, 0.15);
  const promptMat = new THREE.MeshBasicMaterial({ transparent: true });
  const promptMesh = new THREE.Mesh(promptGeo, promptMat);

  promptMesh.position.set(0, 0.35, 0.01);
  promptMesh.name = "vrPrompt";
  vrMenuGroup.add(promptMesh);

  for (let i = 0; i < 4; i++) {
    const btnGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const btnMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const btn = new THREE.Mesh(btnGeo, btnMat);

    btn.position.set(0, 0.15 - i * 0.15, 0.01);
    btn.userData = { isOption: true, index: i };

    const labelGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const labelMat = new THREE.MeshBasicMaterial({ transparent: true });
    const label = new THREE.Mesh(labelGeo, labelMat);

    label.position.set(0, 0, 0.005);
    btn.add(label);

    vrUIButtons.push(btn);
    vrMenuGroup.add(btn);
  }
}

const _hudPos = new THREE.Vector3();
const _hudDir = new THREE.Vector3();
const _hudRight = new THREE.Vector3();
const _hudUp = new THREE.Vector3();

function placePulseHUD() {
  if (!renderer?.xr?.isPresenting || !vrPulseGroup) return;

  const xrCam = renderer.xr.getCamera(camera);

  xrCam.getWorldPosition(_hudPos);
  xrCam.getWorldDirection(_hudDir).normalize();

  _hudUp.set(0, 1, 0).applyQuaternion(xrCam.quaternion).normalize();
  _hudRight.crossVectors(_hudDir, _hudUp).normalize();

  const forward = 1.0;
  const up = 0.8;
  const right = 0.00;

  vrPulseGroup.position.copy(_hudPos)
    .add(_hudDir.multiplyScalar(forward))
    .add(_hudUp.multiplyScalar(up))
    .add(_hudRight.multiplyScalar(right));

  vrPulseGroup.quaternion.copy(xrCam.quaternion);
}


function createVRPulseMonitor() {
  vrPulseGroup = new THREE.Group();
  scene.add(vrPulseGroup);

  const bgGeo = new THREE.PlaneGeometry(0.6, 0.3);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    opacity: 0.6,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const bg = new THREE.Mesh(bgGeo, bgMat);
  vrPulseGroup.add(bg);

  const textGeo = new THREE.PlaneGeometry(0.55, 0.25);
  const textMat = new THREE.MeshBasicMaterial({ transparent: true });
  const textMesh = new THREE.Mesh(textGeo, textMat);

  textMesh.position.z = 0.01;
  textMesh.name = "pulseText";
  vrPulseGroup.add(textMesh);

  vrPulseGroup.visible = false;
}

function createVRFeedbackPanel() {
  vrFeedbackGroup = new THREE.Group();
  scene.add(vrFeedbackGroup);
  vrFeedbackGroup.visible = false;

  const panelGeo = new THREE.PlaneGeometry(1.0, 0.8);
  const panelMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    opacity: 0.9,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.name = "feedbackBg";
  vrFeedbackGroup.add(panel);

  const titleGeo = new THREE.PlaneGeometry(0.9, 0.15);
  const titleMat = new THREE.MeshBasicMaterial({ transparent: true });
  const title = new THREE.Mesh(titleGeo, titleMat);

  title.position.set(0, 0.25, 0.01);
  title.name = "feedbackTitle";
  vrFeedbackGroup.add(title);

  const msgGeo = new THREE.PlaneGeometry(0.9, 0.3);
  const msgMat = new THREE.MeshBasicMaterial({ transparent: true });
  const msg = new THREE.Mesh(msgGeo, msgMat);

  msg.position.set(0, 0, 0.01);
  msg.name = "feedbackMsg";
  vrFeedbackGroup.add(msg);

  const btnGeo = new THREE.PlaneGeometry(0.4, 0.12);
  const btnMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const btn = new THREE.Mesh(btnGeo, btnMat);

  btn.position.set(0, -0.25, 0.01);
  btn.userData = { isContinue: true };

  const labelGeo = new THREE.PlaneGeometry(0.4, 0.12);
  const labelMat = new THREE.MeshBasicMaterial({ transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);

  label.position.set(0, 0, 0.005);
  label.material.map = createTextTexture("CONTINUE", 256, 64, null, "white", 20);
  label.material.needsUpdate = true;

  btn.add(label);

  vrFeedbackButtons.push(btn);
  vrFeedbackGroup.add(btn);
}

function createVREndScreen() {
  vrEndGroup = new THREE.Group();
  scene.add(vrEndGroup);
  vrEndGroup.visible = false;

  const panelGeo = new THREE.PlaneGeometry(2.0, 1.5);
  const panelMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    opacity: 0.95,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const panel = new THREE.Mesh(panelGeo, panelMat);
  vrEndGroup.add(panel);

  const titleGeo = new THREE.PlaneGeometry(1.5, 0.3);
  const titleMat = new THREE.MeshBasicMaterial({ transparent: true });
  const title = new THREE.Mesh(titleGeo, titleMat);

  title.position.set(0, 0.4, 0.01);
  title.name = "endTitle";
  vrEndGroup.add(title);

  const msgGeo = new THREE.PlaneGeometry(1.5, 0.5);
  const msgMat = new THREE.MeshBasicMaterial({ transparent: true });
  const msg = new THREE.Mesh(msgGeo, msgMat);

  msg.position.set(0, -0.1, 0.01);
  msg.name = "endMsg";
  vrEndGroup.add(msg);

  const btnGeo = new THREE.PlaneGeometry(0.6, 0.15);
  const btnMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const btn = new THREE.Mesh(btnGeo, btnMat);

  btn.position.set(0, -0.5, 0.01);
  btn.userData = { isRestart: true };

  const labelGeo = new THREE.PlaneGeometry(0.6, 0.15);
  const labelMat = new THREE.MeshBasicMaterial({ transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);

  label.position.set(0, 0, 0.005);
  label.material.map = createTextTexture("PLAY AGAIN", 512, 128, null, "white", 40);
  label.material.needsUpdate = true;

  btn.add(label);

  vrEndButtons.push(btn);
  vrEndGroup.add(btn);
}

function createTextTexture(text, width, height, bgColor, textColor, fontSize) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(text, width / 2, height / 2);

  return new THREE.CanvasTexture(canvas);
}

function updateVRPulse(pulse, colorHex) {
  if (!vrPulseGroup) return;

  const textMesh = vrPulseGroup.getObjectByName("pulseText");
  textMesh.material.map = createTextTexture(`PULSE: ${pulse} BPM`, 512, 256, null, colorHex, 60);

  textMesh.material.needsUpdate = true;
}

function updateVRFeedback(isCorrect, message) {
  if (!vrFeedbackGroup) return;

  const titleMesh = vrFeedbackGroup.getObjectByName("feedbackTitle");
  const msgMesh = vrFeedbackGroup.getObjectByName("feedbackMsg");
  const bgMesh = vrFeedbackGroup.getObjectByName("feedbackBg");

  const titleColor = isCorrect ? "#00ff9d" : "#ff4444";
  const titleText = isCorrect ? "CORRECT" : "INCORRECT";

  titleMesh.material.map = createTextTexture(
    titleText,
    512,
    128,
    null,
    titleColor,
    50
  );
  titleMesh.material.needsUpdate = true;

  msgMesh.material.map = createTextTexture(
    message,
    1024,
    256,
    null,
    "white",
    30
  );
  msgMesh.material.needsUpdate = true;

  bgMesh.material.color.setHex(isCorrect ? 0x002200 : 0x220000);
}

function updateVREnd(isSuccess, message) {
  if (!vrEndGroup) return;

  const titleMesh = vrEndGroup.getObjectByName("endTitle");
  const msgMesh = vrEndGroup.getObjectByName("endMsg");

  const titleColor = isSuccess ? "#00ff9d" : "#ff4444";
  const titleText = isSuccess ? "SUCCESS" : "FAILURE";

  titleMesh.material.map = createTextTexture(
    titleText,
    1024,
    256,
    null,
    titleColor,
    80
  );
  titleMesh.material.needsUpdate = true;

  msgMesh.material.map = createTextTexture(
    message,
    1024,
    512,
    null,
    "white",
    40
  );
  msgMesh.material.needsUpdate = true;
}

function updateVRMenu(index) {
  const scenario = scenarios[index];
  const promptMesh = vrMenuGroup.getObjectByName("vrPrompt");
  promptMesh.material.map = createTextTexture(
    scenario.prompt,
    1024,
    128,
    null,
    "#ff4444",
    40
  );
  promptMesh.material.needsUpdate = true;

  scenario.options.forEach((opt, i) => {
    const btn = vrUIButtons[i];
    const label = btn.children[0];

    label.material.map = createTextTexture(opt.text, 1024, 128, null, "white", 35);
    label.material.needsUpdate = true;

    btn.userData.correct = opt.correct;
    btn.userData.pulseChange = opt.pulseChange;
    btn.userData.scenarioIndex = index;

    btn.material.color.setHex(0x333333);
  });
}

function tryInteractWithMenu(controller) {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  if (vrEndGroup && vrEndGroup.visible) {
    const intersects = raycaster.intersectObjects(vrEndButtons, true);
    if (intersects.length > 0) {
      audioElements.flatline.pause();
      location.reload();
    }
    return;
  }

  if (vrFeedbackGroup && vrFeedbackGroup.visible) {
    const intersects = raycaster.intersectObjects(
      vrFeedbackButtons,
      true
    );
    if (intersects.length > 0) {
      vrFeedbackGroup.visible = false;
      gameState.currentScenario++;
      const activeScenarios = getActiveScenarios();
      if (gameState.currentScenario > activeScenarios.length) {
        endSimulation(true);
      } else {
        showScenario(gameState.currentScenario - 1);
      }
    }
    return;
  }

  const intersects = raycaster.intersectObjects(vrUIButtons, true);

  if (intersects.length > 0) {
    let target = intersects[0].object;
    if (target.parent && target.parent.userData.isOption) {
      target = target.parent;
    }

    if (target.userData.isOption) {
      handleAnswer(
        target.userData.scenarioIndex,
        target.userData.correct,
        target.userData.pulseChange
      );
    }
  }
}

function updateLaserAndTryHit(controller) {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  let intersects = [];

  if (vrEndGroup && vrEndGroup.visible) {
    intersects = raycaster.intersectObjects(vrEndButtons, true);
  } else if (vrFeedbackGroup && vrFeedbackGroup.visible) {
    intersects = raycaster.intersectObjects(vrFeedbackButtons, true);
  } else if (vrMenuGroup && vrMenuGroup.visible) {
    intersects = raycaster.intersectObjects(vrUIButtons, true);
  } else if (patientModel) {
    intersects = raycaster.intersectObject(patientModel, true);
  }

  const laser = controller.getObjectByName("laser");
  if (laser) {
    laser.scale.z = intersects.length ? intersects[0].distance : 5;

    if (intersects.length > 0) {
      laser.material.color.setHex(0xff0000);
    } else {
      laser.material.color.setHex(0xffffff);
    }
  }
}

function tryActivatePatientFromController(controller) {
  if (
    !patientModel ||
    gameState.firstQuestionTriggered ||
    gameState.isZooming
  )
    return;

  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const _vrActiveModel = (currentPatient === 2 && patient2Model) ? patient2Model : patientModel;
  const intersects = _vrActiveModel ? raycaster.intersectObject(_vrActiveModel, true) : [];
  if (intersects.length === 0) return;

  gameState.firstQuestionTriggered = true;
  hoverTooltip.style.display = "none";

  if (renderer.xr.isPresenting) {
    showScenario(0);
  } else {
    zoomToPatient(() => {
      showScenario(0);
    });
  }
}