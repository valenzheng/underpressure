// gameplay.js — Asset loading, patient models, game flow, scenarios, vitals, end screen

function loadAssets() {
  const loader = new GLTFLoader();
  loader.load(
    "er_room.glb",
    (gltf) => {
      erRoom = gltf.scene;
      erRoom.scale.set(1, 1, 1);
      erRoom.position.y = 0;
      erRoom.traverse(c => { if (c.isMesh) { c.receiveShadow = true; c.castShadow = true; } });
      scene.add(erRoom);
      loadPatient();
    },
    (xhr) =>
      console.log(
        `ER Room: ${((xhr.loaded / xhr.total) * 100).toFixed(1)}%`
      ),
    (error) => alert("Failed to load er_room.glb")
  );
}

function loadPatient() {
  const loader = new GLTFLoader();
  loader.load(
    "patient.glb",
    (gltf) => {
      patientModel = gltf.scene;
      patientModel.scale.set(0.022, 0.022, 0.022);
      patientModel.position.set(1.75, 0.75, 1.3);
      patientModel.rotation.y = Math.PI;
      patientModel.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      scene.add(patientModel);
      controls.target.copy(patientModel.position);
      loadPatient2(startGame);
    },
    (xhr) => console.log(`Patient 1: ${((xhr.loaded / xhr.total) * 100).toFixed(1)}%`),
    (error) => alert("Failed to load patient.glb")
  );
}

function loadPatient2(callback) {
  const loader = new GLTFLoader();
  loader.load(
    "patient2.glb",
    (gltf) => {
      patient2Model = gltf.scene;
      // Scale to 0.8 as specified, lay flat on bed
      patient2Model.scale.set(0.8, 0.8, 0.8);
      patient2Model.rotation.order = "YXZ";
      patient2Model.rotation.x = -Math.PI / 2;  // lay standing model flat on back
      patient2Model.rotation.y = Math.PI;         // face same direction as patient 1

      // Compute bounding box after scale+rotation to place on bed surface
      patient2Model.updateMatrixWorld(true);
      const p2box = new THREE.Box3().setFromObject(patient2Model);
      patient2Model.position.set(1.75, 0.75 - p2box.min.y, 1.3);

      patient2Model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      patient2Model.visible = false;
      scene.add(patient2Model);
      console.log("patient2 loaded. scale=0.8, pos.y=", (0.75 - p2box.min.y).toFixed(3));
      if (callback) callback();
    },
    (xhr) => console.log(`Patient 2: ${((xhr.loaded / xhr.total) * 100).toFixed(1)}%`),
    (error) => { console.warn("patient2.glb not found"); if (callback) callback(); }
  );
}

function startGame() {
  gameState.lastVitalUpdate = Date.now();
  assetsReady = true;
  maybeRevealGame();
}

function handleMouseClick() {
  if (
    !patientModel ||
    gameState.firstQuestionTriggered ||
    gameState.isZooming
  )
    return;

  raycaster.setFromCamera(mouse, camera);
  const activeModel = currentPatient === 2 && patient2Model ? patient2Model : patientModel;
  const intersects = activeModel ? raycaster.intersectObject(activeModel, true) : [];

  if (intersects.length > 0) {
    gameState.firstQuestionTriggered = true;
    hoverTooltip.style.display = "none";

    zoomToPatient(() => {
      showScenario(0);
    });
  }
}

function checkPatientHover() {
  if (renderer && renderer.xr && renderer.xr.isPresenting) {
    hoverTooltip.style.display = "none";
    return;
  }

  if (
    !patientModel ||
    gameState.firstQuestionTriggered ||
    gameState.isZooming ||
    choiceWindow.style.display === "block"
  ) {
    hoverTooltip.style.display = "none";
    return;
  }
  raycaster.setFromCamera(mouse, camera);
  const activeModel = currentPatient === 2 && patient2Model ? patient2Model : patientModel;
  const intersects = activeModel ? raycaster.intersectObject(activeModel, true) : [];
  hoverTooltip.style.display = intersects.length > 0 ? "block" : "none";
}

function zoomToPatient(callback) {
  gameState.isZooming = true;
  controls.enabled = false;
  const duration = 1000;
  const startTime = Date.now();
  const originalPos = camera.position.clone();
  const targetPos = new THREE.Vector3(0.5, 1.2, 0.8);

  function animateZoom() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeInOutCubic(progress);
    camera.position.lerpVectors(originalPos, targetPos, easeProgress);

    if (progress < 1) {
      requestAnimationFrame(animateZoom);
    } else {
      gameState.isZooming = false;
      controls.enabled = !(
        renderer &&
        renderer.xr &&
        renderer.xr.isPresenting
      );
      if (callback) callback();
    }
  }
  animateZoom();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getActiveScenarios() {
  return currentPatient === 1 ? scenarios : scenarios2;
}

function showScenario(index) {
  const activeScenarios = getActiveScenarios();
  const scenario = activeScenarios[index];
  choicePrompt.textContent = scenario.prompt;
  choiceOptions.innerHTML = "";

  vitals.bpSystolic = Math.max(
    60,
    vitals.bpSystolic + scenario.bpChange.systolic
  );
  vitals.bpDiastolic = Math.max(
    40,
    vitals.bpDiastolic + scenario.bpChange.diastolic
  );

  scenario.options.forEach((option) => {
    const div = document.createElement("div");
    div.className = "choice-option";
    div.textContent = option.text;
    div.addEventListener("click", () =>
      handleAnswer(index, option.correct, option.pulseChange)
    );
    choiceOptions.appendChild(div);
  });

  updateVitalUI();

  // Q1: show patient condition, hide chart button
  // Q2+: hide patient condition, show chart button
  const chartBtnEl = document.getElementById("chartBtn");
  const condEl = document.getElementById("patientCondition");
  if (chartBtnEl) chartBtnEl.style.display = index >= 1 ? "inline-block" : "none";
  if (condEl) condEl.style.display = index === 0 ? "block" : "none";

  if (renderer.xr.isPresenting) {
    updateVRMenu(index);

    const xrCam = renderer.xr.getCamera(camera);
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    xrCam.getWorldPosition(camPos);
    xrCam.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    vrMenuGroup.position.copy(camPos).add(camDir.multiplyScalar(1.5));
    vrMenuGroup.position.y = 1.6;
    vrMenuGroup.lookAt(camPos.x, vrMenuGroup.position.y, camPos.z);

    vrMenuGroup.visible = true;
  } else {
    choiceWindow.style.display = "block";
  }
;
}

function handleAnswer(scenarioIndex, isCorrect, pulseChange) {
  const activeScenarios = getActiveScenarios();
  const scenario = activeScenarios[scenarioIndex];
  choiceWindow.style.display = "none";

  if (vrMenuGroup) vrMenuGroup.visible = false;

  // Stop heavy breathing after first question is answered
  if (scenarioIndex === 0) {
    audioElements.heavyBreathing.pause();
    audioElements.heavyBreathing.currentTime = 0;
  }

  if (gameState.ivPenaltyActive) {
    pulseChange *= 1.5;
    gameState.penaltyQuestionCount++;

    if (gameState.penaltyQuestionCount >= 2) {
      gameState.ivPenaltyActive = false;
      gameState.penaltyQuestionCount = 0;
    }
  }

  if (isCorrect) {
    window._gameScore.correct++;
    spawnParticles("drip");
    // Correct answers move pulse toward stable target (~110), not raw subtraction.
    // This prevents pulse from bottoming out on a perfect run.
    const STABLE_TARGET = 110;
    const gap = vitals.pulse - STABLE_TARGET;
    // Move 30-50% of the gap toward target (the pulseChange magnitude controls intensity)
    const stabilizeAmount = gap * 0.35;
    vitals.pulse = Math.max(60, Math.min(160, vitals.pulse - stabilizeAmount));
    vitals.consecutiveWrongAnswers = 0;
    feedbackTitle.textContent = "CORRECT";
    feedbackTitle.style.color = "#00ff9d";
    feedbackMessage.textContent = scenario.correctFeedback;
    feedbackPanel.className = "feedback-panel feedback-correct";
  } else {
    vitals.pulse = Math.min(PULSE_MAX, vitals.pulse + pulseChange);
    vitals.consecutiveWrongAnswers++;

    if (scenario.critical && vitals.consecutiveWrongAnswers >= 2) {
      endSimulation(false);
      return;
    }

    if (scenario.final) {
      endSimulation(false);
      return;
    }

    window._gameScore.wrong++;
    window._gameScore.missed.push(scenarioIndex + 1);
    playWrongBuzz();
    spawnParticles("blood");
    feedbackTitle.textContent = "INCORRECT";
    feedbackTitle.style.color = "#ff4444";
    feedbackMessage.textContent = scenario.incorrectFeedback;
    feedbackPanel.className = "feedback-panel feedback-incorrect";

    if (scenario.penalty === "ivPenalty") {
      gameState.ivPenaltyActive = true;
      gameState.penaltyQuestionCount = 0;
    }
  }

  updateVitalUI();

  // Append rationale to feedback
  if (scenario.rationale) {
    const rationaleEl = document.getElementById("feedbackRationale");
    if (rationaleEl) rationaleEl.textContent = "📋 " + scenario.rationale;
  }

  if (renderer.xr.isPresenting) {
    updateVRFeedback(
      isCorrect,
      isCorrect ? scenario.correctFeedback : scenario.incorrectFeedback
    );

    if (vrMenuGroup) {
      vrFeedbackGroup.position.copy(vrMenuGroup.position);
      vrFeedbackGroup.rotation.copy(vrMenuGroup.rotation);
    }
    vrFeedbackGroup.visible = true;
  } else {
    feedbackPanel.style.display = "block";
  }

  if (vitals.pulse >= PULSE_MAX || vitals.pulse <= PULSE_MIN) {
    endSimulation(false);
  }
}

function updateVitalUI() {
  const displayPulse = Math.round(vitals.pulse);

  pulseValueUI.textContent = displayPulse;
  condBpUI.textContent = `${vitals.bpSystolic}/${vitals.bpDiastolic}`;
  condRespUI.textContent = vitals.respirations;
  // Update HUD monitor
  const monBp = document.getElementById("monitorBp");
  const monResp = document.getElementById("monitorResp");
  if (monBp) {
    monBp.textContent = `${vitals.bpSystolic}/${vitals.bpDiastolic}`;
    monBp.style.color = vitals.bpSystolic < 70 ? "#ff4444" : vitals.bpSystolic < 85 ? "#ffff00" : "#ffaa44";
  }
  if (monResp) monResp.textContent = vitals.respirations;

  const animationSpeed = 60 / displayPulse;
  pulseValueUI.style.animationDuration = `${animationSpeed}s`;

  pulseValueUI.classList.remove(
    "pulse-green",
    "pulse-yellow",
    "pulse-red"
  );
  let currentColorClass = "";
  let colorHex = "#00ff9d";
  if (displayPulse >= 100 && displayPulse <= 120) {
    currentColorClass = "pulse-green";
    colorHex = "#00ff9d";
    pulseValueUI.classList.add(currentColorClass);
  } else if (
    (displayPulse > 120 && displayPulse <= 140) ||
    (displayPulse < 100 && displayPulse >= 80)
  ) {
    currentColorClass = "pulse-yellow";
    colorHex = "#ffff00";
    pulseValueUI.classList.add(currentColorClass);
  } else {
    currentColorClass = "pulse-red";
    colorHex = "#ff4444";
    pulseValueUI.classList.add(currentColorClass);
  }

  updateVRPulse(displayPulse, colorHex);

  // Update vitals trend graph
  pushTrend();
  drawTrend();

  if (vrPulseGroup && renderer.xr.isPresenting)
    vrPulseGroup.visible = true;

  playBeatSoundByColor(currentColorClass);

  vitals.lastPulseChange = Date.now();
}

function updateVitals() {
  // Don't tick vitals before the game starts, during feedback reading, or after sim ends
  if (!gameState.firstQuestionTriggered) return;
  if (gameState.simEnded) return;
  if (feedbackPanel.style.display === "block") {
    // Reset the clock while player is reading feedback so the timer doesn't
    // accumulate while the feedback panel is open
    gameState.lastVitalUpdate = Date.now();
    return;
  }

  const now = Date.now();
  const interval = gameState.ivPenaltyActive
    ? gameState.vitalDropInterval / 2  // 7.5s under penalty
    : gameState.vitalDropInterval;

  if (now - gameState.lastVitalUpdate > interval) {
    const pulseDrop = gameState.ivPenaltyActive ? 3 : 1;  // gentle passive decay
    vitals.pulse = Math.min(PULSE_MAX, vitals.pulse + pulseDrop);

    vitals.bpSystolic = Math.max(60, vitals.bpSystolic - 2);
    vitals.bpDiastolic = Math.max(40, vitals.bpDiastolic - 1);
    vitals.respirations = Math.min(40, vitals.respirations + 1);

    updateVitalUI();
    console.log("Vitals worsened | Pulse:", vitals.pulse);

    if (vitals.pulse >= PULSE_MAX || vitals.pulse <= PULSE_MIN) {
      endSimulation(false);
    }
    if (vitals.bpSystolic <= 65) {
      endSimulation(false);
    }

    gameState.lastVitalUpdate = now;
  }
}

function restartPatient1() {
  // Reset vitals to Jordan R.'s initial state
  vitals.pulse = 130;
  vitals.bpSystolic = 88;
  vitals.bpDiastolic = 60;
  vitals.respirations = 28;
  vitals.consecutiveWrongAnswers = 0;
  vitals.lastPulseChange = Date.now();

  currentPatient = 1;
  gameState.simEnded = false;
  gameState.currentScenario = 1;
  gameState.ivPenaltyActive = false;
  gameState.penaltyQuestionCount = 0;
  gameState.firstQuestionTriggered = false;
  gameState.lastVitalUpdate = Date.now();
  gameState.flickerActive = false;
  gameState.flickerTimer = 0;

  window._gameScore = { correct: 0, wrong: 0, missed: [], startTime: Date.now(), endTime: null };

  // Show patient 1, hide patient 2
  if (patientModel) patientModel.visible = true;
  if (patient2Model) patient2Model.visible = false;

  // Reset trend canvas
  const tc = document.getElementById("vitalsTrendCanvas");
  if (tc) tc.style.display = "block";
  trendHistory.length = 0;

  // Reset patientCondition back to Jordan R.
  const condEl1 = document.getElementById("patientCondition");
  condEl1.style.display = "block";  // will be hidden by showScenario from Q2+
  condEl1.innerHTML = `
    <p><strong>Patient: Jordan R., 28</strong></p>
    <p><strong>Mechanism of Injury:</strong> Motorcycle crash</p>
    <p><strong>Current Status:</strong> Pale, cool, clammy skin | Rigid abdomen on palpation</p>
    <p><strong>Vitals:</strong> Pulse <span id="condPulse">130</span> (weak/thready) | BP <span id="condBp">88/60</span> | Respirations <span id="condResp">28</span>/min</p>
    <p><strong>Complaint:</strong> Severe abdominal pain</p>
  `;

  hoverTooltip.textContent = "Click to assess patient";

  // Reset camera to starting position
  camera.position.copy(gameState.originalCameraPos);
  controls.target.set(1.75, 0.75, 1.3);
  controls.update();

  // Resume audio
  audioElements.background.play().catch(() => {});
  audioElements.heavyBreathing.volume = 0.8;
  audioElements.heavyBreathing.currentTime = 0;
  audioElements.heavyBreathing.play().catch(() => {});

  updateVitalUI();
  playBeatSoundByColor("pulse-yellow");
}

function startPatient2() {
  // Reset vitals to Maria Lopez's initial state
  vitals.pulse = 124;
  vitals.bpSystolic = 86;
  vitals.bpDiastolic = 54;
  vitals.respirations = 30;
  vitals.consecutiveWrongAnswers = 0;
  vitals.lastPulseChange = Date.now();

  // Reset game state
  currentPatient = 2;
  gameState.simEnded = false;
  gameState.currentScenario = 1;
  gameState.ivPenaltyActive = false;
  gameState.penaltyQuestionCount = 0;
  gameState.firstQuestionTriggered = false;
  gameState.lastVitalUpdate = Date.now();
  gameState.flickerActive = false;
  gameState.flickerTimer = 0;

  // Reset score for patient 2
  window._gameScore = { correct: 0, wrong: 0, missed: [], startTime: Date.now(), endTime: null };

  // Swap models: hide patient1, show patient2
  if (patientModel) patientModel.visible = false;
  if (patient2Model) patient2Model.visible = true;

  // Update pulse monitor label
  const pulseLabel = document.querySelector(".pulse-label");
  if (pulseLabel) pulseLabel.textContent = "Patient's Pulse (BPM)";

  // Update the static patient condition section
  const condEl2 = document.getElementById("patientCondition");
  condEl2.style.display = "block";  // will be hidden by showScenario from Q2+
  condEl2.innerHTML = `
    <p><strong>Patient: Maria Lopez, 56</strong></p>
    <p><strong>Chief Complaint:</strong> Fever, weakness, confusion</p>
    <p><strong>History:</strong> UTI diagnosed 3 days ago</p>
    <p>
      <strong>Vitals:</strong> Pulse
      <span id="condPulse">124</span> (rapid) | BP
      <span id="condBp">86/54</span> | Resp
      <span id="condResp">30</span>/min | SpO₂ 92%
    </p>
    <p><strong>Status:</strong> Warm flushed skin, confused, lethargic</p>
  `;

  hoverTooltip.textContent = "Click to assess patient";

  // Reset camera to starting position so player sees the patient zoomed out
  camera.position.copy(gameState.originalCameraPos);
  controls.target.set(1.75, 0.75, 1.3);
  controls.update();

  // Reset trend canvas
  const tc2 = document.getElementById("vitalsTrendCanvas");
  if (tc2) tc2.style.display = "block";
  trendHistory.length = 0;

  // Resume audio
  audioElements.background.play().catch(() => {});
  audioElements.heavyBreathing.volume = 0.8;
  audioElements.heavyBreathing.currentTime = 0;
  audioElements.heavyBreathing.play().catch(() => {});

  updateVitalUI();
  playBeatSoundByColor("pulse-yellow");
  // Player must click patient to begin — same as patient 1 start
}

function resetGameToInitialState() {
  // Reset to Patient 1 / Jordan R. from scratch
  currentPatient = 1;
  patient1Success = false;

  vitals.pulse = 130;
  vitals.bpSystolic = 88;
  vitals.bpDiastolic = 60;
  vitals.respirations = 28;
  vitals.consecutiveWrongAnswers = 0;
  vitals.lastPulseChange = Date.now();

  gameState.simEnded = false;
  gameState.currentScenario = 1;
  gameState.ivPenaltyActive = false;
  gameState.penaltyQuestionCount = 0;
  gameState.firstQuestionTriggered = false;
  gameState.lastVitalUpdate = Date.now();
  gameState.flickerActive = false;
  gameState.flickerTimer = 0;
  gameState.isZooming = false;

  window._gameScore = { correct: 0, wrong: 0, missed: [], startTime: Date.now(), endTime: null };

  // Show patient 1, hide patient 2
  if (patientModel) patientModel.visible = true;
  if (patient2Model) patient2Model.visible = false;

  // Reset camera
  if (camera && gameState.originalCameraPos) {
    camera.position.copy(gameState.originalCameraPos);
  }
  if (controls) {
    controls.target.set(1.75, 0.75, 1.3);
    controls.update();
  }

  // Reset UI
  choiceWindow.style.display = "none";
  feedbackPanel.style.display = "none";
  chartOverlay.style.display = "none";

  const tc = document.getElementById("vitalsTrendCanvas");
  if (tc) { tc.style.display = "block"; }
  if (typeof trendHistory !== "undefined") trendHistory.length = 0;

  hoverTooltip.style.display = "none";
  hoverTooltip.textContent = "Click to assess patient";

  // Reset patient condition panel to Jordan R.
  const condEl = document.getElementById("patientCondition");
  if (condEl) {
    condEl.style.display = "none"; // showScenario sets it to block on Q1
    condEl.innerHTML = `
      <p><strong>Patient: Jordan R., 28</strong></p>
      <p><strong>Mechanism of Injury:</strong> Motorcycle crash</p>
      <p><strong>Current Status:</strong> Pale, cool, clammy skin | Rigid abdomen on palpation</p>
      <p><strong>Vitals:</strong> Pulse <span id="condPulse">130</span> (weak/thready) | BP <span id="condBp">88/60</span> | Respirations <span id="condResp">28</span>/min</p>
      <p><strong>Complaint:</strong> Severe abdominal pain</p>
    `;
  }

  // Reset monitor
  const monBp = document.getElementById("monitorBp");
  const monResp = document.getElementById("monitorResp");
  if (monBp) { monBp.textContent = "88/60"; monBp.style.color = "#ffaa44"; }
  if (monResp) monResp.textContent = "28";

  // Stop emergency lights
  if (emergencyLights) emergencyLights.intensity = 0;
  if (ambientLight && gameState.flickerBaseAmbient) ambientLight.intensity = gameState.flickerBaseAmbient;
  if (gameState.ceilingLight1) { gameState.ceilingLight1.intensity = 3.0; }
  if (gameState.ceilingLight2) { gameState.ceilingLight2.intensity = 2.5; }

  updateVitalUI();
}

function endSimulation(isSuccess) {
  window._gameScore.endTime = Date.now();
  gameState.simEnded = true;
  const tc = document.getElementById("vitalsTrendCanvas");
  if (tc) tc.style.display = "none";
  chartOverlay.style.display = "none";
  choiceWindow.style.display = "none";
  feedbackPanel.style.display = "none";
  if (currentPatient === 1) patient1Success = isSuccess;

  audioElements.background.pause();
  stopAllBeatSounds();

  if (!isSuccess) {
    audioElements.flatline.play().catch((err) => {
      console.log("Flatline audio play failed:", err);
    });
  }

  if (renderer.xr.isPresenting) {
    const msg = isSuccess
      ? "Correct prioritization under pressure prevented cardiac arrest."
      : "Delayed or incorrect decisions resulted in patient death.";

    updateVREnd(isSuccess, msg);

    const xrCam = renderer.xr.getCamera(camera);
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    xrCam.getWorldPosition(camPos);
    xrCam.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    vrEndGroup.position.copy(camPos).add(camDir.multiplyScalar(1.5));
    vrEndGroup.position.y = 1.6;
    vrEndGroup.lookAt(camPos.x, vrEndGroup.position.y, camPos.z);

    vrEndGroup.visible = true;

    if (vrPulseGroup) vrPulseGroup.visible = false;
    if (vrMenuGroup) vrMenuGroup.visible = false;
    if (vrFeedbackGroup) vrFeedbackGroup.visible = false;
  }

  const endScreen = document.createElement("div");
  endScreen.style.position = "fixed";
  endScreen.style.top = "0";
  endScreen.style.left = "0";
  endScreen.style.width = "100vw";
  endScreen.style.height = "100vh";
  endScreen.style.backgroundColor = isSuccess
    ? "rgba(0, 0, 0, 0.9)"
    : "rgba(0, 0, 0, 0.95)";
  endScreen.style.display = "flex";
  endScreen.style.flexDirection = "column";
  endScreen.style.justifyContent = "center";
  endScreen.style.alignItems = "center";
  endScreen.style.zIndex = "9999";
  endScreen.style.color = "white";
  endScreen.style.fontFamily = "Arial, sans-serif";
  endScreen.style.textAlign = "center";
  endScreen.style.padding = "2rem";
  endScreen.style.animation = isSuccess
    ? "none"
    : "fadeToBlack 2s forwards";

  if (isSuccess) {
    endScreen.style.background = "rgba(0, 0, 0, 0.7)";
  } else {
    endScreen.style.background = "black";
  }

  const score = window._gameScore;
  const total = score.correct + score.wrong;
  const pct = total > 0 ? Math.round((score.correct / total) * 100) : 0;
  const elapsed = Math.round(((score.endTime || Date.now()) - score.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const endTitle = document.createElement("h2");
  endTitle.style.fontSize = "2.2rem";
  endTitle.style.marginBottom = "0.3rem";
  endTitle.style.color = isSuccess ? "#00ff9d" : "#ff4444";
  if (currentPatient === 1) {
    endTitle.textContent = isSuccess ? "Patient Stabilized Successfully" : "Patient Deteriorated to Cardiac Arrest";
  } else {
    endTitle.textContent = isSuccess ? "Patient Stabilized Successfully" : "Patient Deteriorated to Cardiac Arrest";
  }

  const endMessage = document.createElement("p");
  endMessage.style.fontSize = "1rem";
  endMessage.style.maxWidth = "600px";
  endMessage.style.lineHeight = "1.6";
  endMessage.style.color = "#ccc";
  endMessage.style.marginBottom = "1.5rem";
  if (currentPatient === 1) {
    endMessage.textContent = isSuccess
      ? "Correct prioritization under pressure prevented cardiac arrest. Jordan R. has been stabilized."
      : "Delayed or incorrect decisions resulted in patient death. Jordan R. did not survive.";
  } else {
    endMessage.textContent = isSuccess
      ? "Early recognition and treatment of sepsis prevented organ failure and stabilized the patient."
      : "Delayed recognition and treatment allowed septic shock to progress to multi-organ failure and cardiac arrest.";
  }

  // Debrief card
  const debrief = document.createElement("div");
  debrief.style.cssText = "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:1.2rem 2rem;max-width:480px;width:100%;margin-bottom:1.5rem;text-align:left;font-family:Courier New,monospace;";
  debrief.innerHTML = `
    <div style="font-size:0.75rem;letter-spacing:2px;color:#888;margin-bottom:0.8rem;">SIMULATION DEBRIEF</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div style="text-align:center;">
        <div style="font-size:2rem;font-weight:bold;color:${pct>=70?'#00ff9d':pct>=50?'#ffff00':'#ff4444'}">${pct}%</div>
        <div style="font-size:0.7rem;color:#888;letter-spacing:1px;">ACCURACY</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:2rem;font-weight:bold;color:#aaddff">${score.correct}/${total}</div>
        <div style="font-size:0.7rem;color:#888;letter-spacing:1px;">CORRECT</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:2rem;font-weight:bold;color:#ffaa44">${timeStr}</div>
        <div style="font-size:0.7rem;color:#888;letter-spacing:1px;">TIME</div>
      </div>
    </div>
    ${score.missed.length > 0 ? `<div style="font-size:0.8rem;color:#ff9999;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.8rem;">⚠ Review questions: ${score.missed.map(n=>'Q'+n).join(', ')}</div>` : `<div style="font-size:0.8rem;color:#00ff9d;border-top:1px solid rgba(255,255,255,0.1);padding-top:0.8rem;">✓ Perfect score — no questions missed.</div>`}
  `;

  // Button row
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:1rem;margin-top:0.5rem;flex-wrap:wrap;justify-content:center;";

  const restartButton = document.createElement("button");
  restartButton.style.cssText = "padding:0.9rem 2rem;font-size:1.1rem;font-weight:bold;color:white;background:#cc3333;border:none;border-radius:6px;cursor:pointer;";
  restartButton.textContent = "Restart Case";
  restartButton.addEventListener("click", () => {
    audioElements.flatline.pause();
    document.body.removeChild(endScreen);
    const miniType = currentPatient === 2 ? "restart2" : "restart1";
    showMiniLoading(miniType, () => {
      if (currentPatient === 2) {
        startPatient2();
      } else {
        restartPatient1();
      }
    });
  });

  // Next Patient button — only shown for patient 1 end screens
  if (currentPatient === 1) {
    const nextPatBtn = document.createElement("button");
    const locked = !isSuccess;
    nextPatBtn.style.cssText = locked
      ? "padding:0.9rem 2rem;font-size:1.1rem;font-weight:bold;color:#888;background:#333;border:1px solid #555;border-radius:6px;cursor:pointer;"
      : "padding:0.9rem 2rem;font-size:1.1rem;font-weight:bold;color:white;background:#1a5fa8;border:none;border-radius:6px;cursor:pointer;";
    nextPatBtn.textContent = "Next Patient →";

    if (locked) {
      const lockMsg = document.createElement("div");
      lockMsg.id = "lockMsg";
      lockMsg.style.cssText = "display:none;margin-top:0.8rem;font-size:0.82rem;color:#ff9999;max-width:460px;background:rgba(200,0,0,0.12);border:1px solid rgba(200,0,0,0.3);border-radius:6px;padding:0.6rem 0.9rem;";
      lockMsg.textContent = "Incoming patient unavailable. Jordan R. did not survive. Successfully stabilize the current patient to receive the next assignment.";
      nextPatBtn.addEventListener("click", () => {
        lockMsg.style.display = lockMsg.style.display === "none" ? "block" : "none";
      });
      btnRow.appendChild(restartButton);
      btnRow.appendChild(nextPatBtn);
      endScreen.appendChild(endTitle);
      endScreen.appendChild(endMessage);
      endScreen.appendChild(debrief);
      endScreen.appendChild(btnRow);
      endScreen.appendChild(lockMsg);
    } else {
      nextPatBtn.addEventListener("click", () => {
        document.body.removeChild(endScreen);
        showMiniLoading("patient2", () => { startPatient2(); });
      });
      btnRow.appendChild(restartButton);
      btnRow.appendChild(nextPatBtn);
      endScreen.appendChild(endTitle);
      endScreen.appendChild(endMessage);
      endScreen.appendChild(debrief);
      endScreen.appendChild(btnRow);
    }
  } else {
    // Patient 2 — just restart
    btnRow.appendChild(restartButton);
    endScreen.appendChild(endTitle);
    endScreen.appendChild(endMessage);
    endScreen.appendChild(debrief);
    endScreen.appendChild(btnRow);
  }

  document.body.appendChild(endScreen);

  // Home button — created AFTER endScreen so the closure reference is valid
  const homeBtn = document.createElement("button");
  homeBtn.textContent = "⌂ Home";
  homeBtn.style.cssText = "position:fixed;top:18px;right:18px;z-index:10001;padding:0.5rem 1.2rem;font-size:0.95rem;font-weight:bold;color:#ddd;background:rgba(30,30,30,0.92);border:1px solid rgba(255,255,255,0.25);border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;letter-spacing:1px;box-shadow:0 2px 12px rgba(0,0,0,0.5);";
  homeBtn.addEventListener("mouseenter", () => homeBtn.style.background = "rgba(60,60,60,0.95)");
  homeBtn.addEventListener("mouseleave", () => homeBtn.style.background = "rgba(30,30,30,0.92)");
  homeBtn.addEventListener("click", () => {
    // Clean up audio
    audioElements.flatline.pause();
    audioElements.flatline.currentTime = 0;
    stopAllBeatSounds();
    audioElements.background.pause();
    audioElements.heavyBreathing.pause();

    // Remove end screen overlay and home button
    if (document.body.contains(endScreen)) document.body.removeChild(endScreen);
    if (document.body.contains(homeBtn)) document.body.removeChild(homeBtn);

    // Full game reset so Play starts fresh as Patient 1 Q1
    resetGameToInitialState();

    // Show cover screen
    gameContent.style.visibility = "hidden";
    gameContent.style.display = "none";
    coverScreen.style.display = "flex";
  });
  document.body.appendChild(homeBtn);

  const _removeHomeBtn = () => {
    if (document.body.contains(homeBtn)) document.body.removeChild(homeBtn);
  };
  restartButton.addEventListener("click", _removeHomeBtn, { once: true });
}

const style = document.createElement("style");
style.textContent = `
@keyframes fadeToBlack {
  from { background: rgba(0, 0, 0, 0.5); }
  to { background: #000; }
}`;

document.head.appendChild(style);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}