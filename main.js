// main.js — Under Pressure: An ER Simulation
// Edit individual source files, then update main.js.
// Source files: audio.js | ecg.js | screens.js | scenarios.js | ui.js | game.js | gameplay.js | render.js


// ════════ AUDIO ════════

// audio.js — Audio setup, beat sounds
// Imports are here since this is the module entry point

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// ---------------------------
// AUDIO
// ---------------------------
const audioElements = {
  background: document.getElementById("erBackground"),
  normal: document.getElementById("normalBeep"),
  fast: document.getElementById("fastBeep"),
  worsening: document.getElementById("worseningBeep"),
  flatline: document.getElementById("flatlineBeep"),
  loadingHeartbeat: document.getElementById("loadingHeartbeat"),
  heavyBreathing: document.getElementById("heavyBreathing")
};

let currentBeatSound = null;

function stopAllBeatSounds() {
  Object.values(audioElements).forEach((sound) => {
    if (sound !== audioElements.background && sound !== audioElements.loadingHeartbeat && sound !== audioElements.heavyBreathing) {
      sound.pause();
      sound.currentTime = 0;
    }
  });
  currentBeatSound = null;
}

function playBeatSoundByColor(colorClass) {
  stopAllBeatSounds();

  switch (colorClass) {
    case "pulse-green":
      currentBeatSound = audioElements.normal;
      break;
    case "pulse-yellow":
      currentBeatSound = audioElements.fast;
      break;
    case "pulse-red":
      currentBeatSound = audioElements.worsening;
      break;
    default:
      currentBeatSound = audioElements.normal;
  }

  currentBeatSound.play().catch((err) => {
    console.log("Audio play failed (user interaction required):", err);
    document.addEventListener(
      "click",
      () => {
        currentBeatSound
          .play()
          .catch((err) => console.log("Audio still failed:", err));
      },
      { once: true }
    );
  });
}


// ════════ ECG WAVEFORM ════════

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


// ════════ SCREENS & PLAY BUTTON ════════

// screens.js — Cover/loading screen logic, play button

// DOM Elements for Screens
const coverScreen = document.getElementById("cover-screen");
const playButton = document.getElementById("play-button");
const loadingScreen = document.getElementById("loading-screen");
const typedMessages = document.querySelectorAll(".typed-message");
const finalMessage = document.getElementById("final-message");
const gameContent = document.getElementById("game-content");

let assetsReady = false;
let loadingSequenceDone = false;

function maybeRevealGame() {
  if (!assetsReady || !loadingSequenceDone) return;
  loadingScreen.classList.remove("active");
  setTimeout(() => {
    loadingScreen.style.display = "none";
    gameContent.style.display = "block";
    audioElements.heavyBreathing.volume = 0.8;
    audioElements.heavyBreathing.play().catch(() => {});
    audioElements.background.play().catch(() => {
      document.addEventListener("click", () => audioElements.background.play().catch(() => {}), { once: true });
    });
  }, 500);
}

let gameInitialized = false;

playButton.addEventListener("click", async () => {
  const audios = [
    audioElements.background,
    audioElements.normal,
    audioElements.fast,
    audioElements.worsening,
    audioElements.flatline,
    audioElements.loadingHeartbeat,
    audioElements.heavyBreathing
  ];

  for (const a of audios) {
    if (!a) continue;
    a.muted = false;
    a.volume = 0.5;
    a.currentTime = 0;
    try { await a.play(); a.pause(); a.currentTime = 0; } catch (e) {}
  }

  coverScreen.style.display = "none";

  if (gameInitialized) {
    // Game already running — skip loading screen, go straight to patient 1
    // resetGameToInitialState() was already called by the home button click
    gameContent.style.visibility = "visible";
    gameContent.style.display = "block";
    audioElements.heavyBreathing.volume = 0.8;
    audioElements.heavyBreathing.play().catch(() => {});
    audioElements.background.play().catch(() => {});
    playBeatSoundByColor("pulse-yellow");
    return;
  }

  // First time: show loading screen, init Three.js
  loadingScreen.classList.add("active");
  audioElements.loadingHeartbeat.volume = 0.4;
  audioElements.loadingHeartbeat.play().catch(() => {});

  initECG();
  animateECG();
  startLoadingSequence();
  initGame();
  gameInitialized = true;
});

function startLoadingSequence() {
  typedMessages.forEach((message, index) => {
    const delay = parseInt(message.dataset.delay);
    const nextMessage = typedMessages[index + 1];

    setTimeout(() => {
      const txt = message.dataset.text || message.textContent;
      message.textContent = txt;

      message.style.setProperty("--chars", txt.length);
      message.style.width = "0ch";
      message.classList.remove("hidden");
      message.classList.add("active");

      setTimeout(() => {
        message.classList.remove("active");
        message.classList.add("hidden");

        if (!nextMessage) {
          setTimeout(() => {
            finalMessage.classList.add("active");

            setTimeout(() => {
              audioElements.loadingHeartbeat.pause();
              audioElements.loadingHeartbeat.currentTime = 0;
              loadingSequenceDone = true;
              maybeRevealGame();
            }, 3000);
          }, 500);
        }
      }, 4500);
    }, delay);
  });
}

// Game Variables
let scene, camera, renderer, controls, raycaster, mouse;
let composer, bloomPass, vignettePass;

// VR controller stuff
const tempMatrix = new THREE.Matrix4();
let controller1, controller2, controllerGrip1, controllerGrip2;
const xrControllerModelFactory = new XRControllerModelFactory();

// VR UI Globals
let vrMenuGroup;
let vrUIButtons = [];
let vrPulseGroup;
let vrFeedbackGroup;
let vrFeedbackButtons = [];
let vrEndGroup;
let vrEndButtons = [];

let erRoom, patientModel, patient2Model;
let ambientLight, directionalLight, emergencyLights;
let currentPatient = 1;   // 1 = Jordan R., 2 = Maria Lopez
let patient1Success = false;

let vitals = {
  pulse: 130,
  bpSystolic: 88,
  bpDiastolic: 60,
  respirations: 28,
  consecutiveWrongAnswers: 0,
  lastPulseChange: Date.now(),
};

const PULSE_MIN = 25;    // death threshold (flatline) — low enough correct answers can't hit it
const PULSE_MAX = 190;   // death threshold (fatal tachycardia)

let gameState = {
  simEnded: false,
  currentScenario: 1,
  isPatientStable: false,
  lastVitalUpdate: Date.now(),
  vitalDropInterval: 30000,  // 30s between automatic drops — enough time to read, think, decide
  ivPenaltyActive: false,
  penaltyQuestionCount: 0,
  firstQuestionTriggered: false,
  isZooming: false,

  originalCameraPos: new THREE.Vector3(0, 2, -2),
  targetCameraPos: new THREE.Vector3(0.5, 1.2, 0.8),
};

// DOM Elements
const choiceWindow = document.getElementById("choiceWindow");
const choicePrompt = document.getElementById("choicePrompt");
const patientCondition = document.getElementById("patientCondition");
const choiceOptions = document.getElementById("choiceOptions");

const feedbackPanel = document.getElementById("feedbackPanel");
const feedbackTitle = document.getElementById("feedbackTitle");
const feedbackMessage = document.getElementById("feedbackMessage");
const nextButton = document.getElementById("nextButton");

const hoverTooltip = document.getElementById("hoverTooltip");
const pulseValueUI = document.getElementById("pulseValue");

const condPulseUI = document.getElementById("condPulse");
const condBpUI = document.getElementById("condBp");
const condRespUI = document.getElementById("condResp");

// ── How to Play Modal ─────────────────────────────────────────────────────
const howToPlayModal = document.getElementById("howToPlayModal");
const howToPlayLink  = document.getElementById("howToPlayLink");
const howToPlayClose = document.getElementById("howToPlayClose");

howToPlayLink.addEventListener("click", () => {
  howToPlayModal.style.display = "flex";
});

howToPlayClose.addEventListener("click", () => {
  howToPlayModal.style.display = "none";
});

// Close on backdrop click
howToPlayModal.addEventListener("click", (e) => {
  if (e.target === howToPlayModal) howToPlayModal.style.display = "none";
});


// ════════ SCENARIOS & PATIENT DATA ════════

// scenarios.js — All scenario data for Patient 1 & 2, patient charts
// Answers per design doc: Situation 1: C,B,A,B,C,D,B,B,C,D | Situation 2: C,B,C,B,B,B,A,B,B,C

// ── PATIENT 1 — Jordan R. (Trauma / Hypovolemic Shock) ───────────────────────
const scenarios = [
  {
    // Answer: C
    prompt: "What is your priority intervention?",
    options: [
      { text: "A. Perform a full head-to-toe assessment", correct: false, pulseChange: +8 },
      { text: "B. Request a CT scan",                    correct: false, pulseChange: +10 },
      { text: "C. Begin rapid IV fluid resuscitation",   correct: true,  pulseChange: -8 },
      { text: "D. Ask the patient for their medical history", correct: false, pulseChange: +8 },
    ],
    correctFeedback:  "Correct! The patient shows signs of hypovolemic shock. Rapid IV fluid resuscitation helps restore circulating volume and support perfusion.",
    incorrectFeedback: "Incorrect. The patient is in shock — fluid resuscitation cannot wait. Vital signs will worsen.",
    rationale: "In hypovolemic shock, circulating volume must be restored immediately. Assessment and imaging are secondary until hemodynamic stability is achieved. Every minute of delay worsens tissue perfusion.",
    bpChange: { systolic: 0, diastolic: 0 },
  },
  {
    // Answer: B
    prompt: "Which condition best explains the patient's presentation?",
    options: [
      { text: "A. Pneumothorax",                      correct: false, pulseChange: +10 },
      { text: "B. Internal hemorrhage",               correct: true,  pulseChange: -8  },
      { text: "C. Cardiac tamponade",                 correct: false, pulseChange: +10 },
      { text: "D. Anxiety-induced hyperventilation",  correct: false, pulseChange: +8  },
    ],
    correctFeedback:  "Correct! The mechanism of injury, abdominal rigidity, and signs of shock strongly suggest internal hemorrhage.",
    incorrectFeedback: "Incorrect. Abdominal trauma with a rigid abdomen points to internal bleeding. Vital signs will deteriorate faster.",
    rationale: "Blunt abdominal trauma + rigid abdomen + tachycardia + hypotension = internal hemorrhage until proven otherwise. Pneumothorax presents with breath-sound changes, not rigidity.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    // Answer: A
    prompt: "Which type of shock is most consistent with this presentation?",
    options: [
      { text: "A. Hypovolemic shock",  correct: true,  pulseChange: -7  },
      { text: "B. Cardiogenic shock",  correct: false, pulseChange: +10 },
      { text: "C. Septic shock",       correct: false, pulseChange: +10 },
      { text: "D. Neurogenic shock",   correct: false, pulseChange: +10 },
    ],
    correctFeedback:  "Correct! Blood loss leads to hypovolemic shock — hypotension, tachycardia, and poor tissue perfusion.",
    incorrectFeedback: "Incorrect. This presentation is hypovolemic shock from blood loss. Blood pressure will decline more rapidly.",
    rationale: "Hypovolemic shock: tachycardia, hypotension, pale/clammy skin, trauma mechanism. Septic shock → fever/warmth; cardiogenic → pulmonary edema; neurogenic → bradycardia.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    // Answer: B
    prompt: "Which assessment should guide immediate care?",
    options: [
      { text: "A. Head-to-toe assessment", correct: false, pulseChange: +8 },
      { text: "B. ABCs / Primary survey",  correct: true,  pulseChange: -6 },
      { text: "C. Pain assessment",        correct: false, pulseChange: +8 },
      { text: "D. Secondary survey",       correct: false, pulseChange: +8 },
    ],
    correctFeedback:  "Correct! The primary survey (ABCs) identifies and treats immediate life-threatening conditions first.",
    incorrectFeedback: "Incorrect. Life-threatening problems must be addressed before secondary assessments. Alarms will escalate.",
    rationale: "ABCDE (Airway, Breathing, Circulation, Disability, Exposure) — the primary survey — identifies life threats first. Head-to-toe and pain assessments come only after life-threatening issues are controlled.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    // Answer: C
    prompt: "Which IV access is most appropriate for rapid fluid and blood administration?",
    options: [
      { text: "A. 24-gauge IV in the hand",            correct: false, pulseChange: +12 },
      { text: "B. 20-gauge IV in the wrist",           correct: false, pulseChange: +10 },
      { text: "C. 18-gauge IV in the antecubital vein",correct: true,  pulseChange: -8  },
      { text: "D. No IV — give oral fluids",           correct: false, pulseChange: +18 },
    ],
    correctFeedback:  "Correct! Large-bore IV access allows rapid administration of IV fluids and blood products during trauma resuscitation.",
    incorrectFeedback: "Incorrect. IV too small — fluids infusing too slowly. Heart rate will drop faster for the next two questions.",
    rationale: "An 18-gauge or larger in the antecubital fossa maximizes flow rate. A 24-gauge delivers ~1 mL/min; an 18-gauge delivers ~90 mL/min. In hemorrhagic shock every second of adequate volume delivery matters.",
    bpChange: { systolic: -2, diastolic: -1 },
    penalty: "ivPenalty",
  },
  {
    // Answer: D
    prompt: "Which IV fluid is generally preferred for initial trauma resuscitation?",
    options: [
      { text: "A. D5W",               correct: false, pulseChange: +10 },
      { text: "B. Normal saline",     correct: false, pulseChange: +8  },
      { text: "C. Oral fluids",       correct: false, pulseChange: +14 },
      { text: "D. Lactated Ringer's", correct: true,  pulseChange: -7  },
    ],
    correctFeedback:  "Correct! Lactated Ringer's is commonly used as an initial crystalloid fluid in trauma resuscitation to restore circulating volume.",
    incorrectFeedback: "Incorrect. Minimal improvement in vitals — heart rate remains unstable.",
    rationale: "Lactated Ringer's closely mimics plasma electrolyte composition. D5W is hypotonic and worsens edema; normal saline in large volumes causes hyperchloremic acidosis; oral fluids are contraindicated in surgical emergencies.",
    bpChange: { systolic: +1, diastolic: +1 },
  },
  {
    // Answer: B
    prompt: "The patient's BP continues to decline. What should you do next?",
    options: [
      { text: "A. Increase fluid rate",                    correct: false, pulseChange: +15 },
      { text: "B. Prepare for emergency blood transfusion", correct: true,  pulseChange: -10 },
      { text: "C. Wait for the provider's assessment",     correct: false, pulseChange: +20 },
      { text: "D. Get a CT scan quickly",                  correct: false, pulseChange: +18 },
    ],
    correctFeedback:  "Correct! Persistent hypotension despite IV fluids suggests ongoing hemorrhage and the need for blood transfusion.",
    incorrectFeedback: "Incorrect. Ongoing blood loss requires transfusion, not just more crystalloid. Alarm will become continuous.",
    rationale: "Fluid-refractory hypotension (BP not improving after 1–2 L crystalloid) triggers blood product resuscitation. Waiting or scanning an unstable patient wastes critical time.",
    bpChange: { systolic: -8, diastolic: -5 },
    critical: true,
  },
  {
    // Answer: B
    prompt: "Which intervention is indicated at this time?",
    options: [
      { text: "A. Obtain a CT scan",            correct: false, pulseChange: +14 },
      { text: "B. Prepare for blood transfusion",correct: true,  pulseChange: -10 },
      { text: "C. Wait for laboratory results", correct: false, pulseChange: +14 },
      { text: "D. Continue pain management",    correct: false, pulseChange: +12 },
    ],
    correctFeedback:  "Correct! Blood transfusion is indicated when IV fluids alone fail to restore hemodynamic stability.",
    incorrectFeedback: "Incorrect. Sudden heart rate drop — patient is in near-failure state.",
    rationale: "Damage control resuscitation uses a 1:1:1 ratio of packed RBCs, fresh frozen plasma, and platelets. Waiting for labs or imaging in an actively hemorrhaging patient delays life-saving intervention.",
    bpChange: { systolic: -5, diastolic: -3 },
  },
  {
    // Answer: C
    prompt: "Why is CT imaging not the priority right now?",
    options: [
      { text: "A. CT takes too long to schedule",    correct: false, pulseChange: +10 },
      { text: "B. Imaging worsens bleeding",         correct: false, pulseChange: +10 },
      { text: "C. The patient is hemodynamically unstable", correct: true, pulseChange: -8 },
      { text: "D. CT is only for fractures",         correct: false, pulseChange: +10 },
    ],
    correctFeedback:  "Correct! Hemodynamically unstable patients should be stabilized before undergoing diagnostic imaging.",
    incorrectFeedback: "Incorrect. Heart rhythm becomes irregular — vignette intensifies. One final chance remains.",
    rationale: "CT is diagnostic, not treatment. A hemodynamically unstable patient who arrests in the scanner cannot be resuscitated effectively. Stabilize first — OR or interventional radiology may be needed immediately.",
    bpChange: { systolic: -4, diastolic: -2 },
  },
  {
    // Answer: D
    prompt: "What is your priority action?",
    options: [
      { text: "A. Comfort the patient",                correct: false, pulseChange: +25 },
      { text: "B. Document findings",                  correct: false, pulseChange: +28 },
      { text: "C. Reassess temperature",               correct: false, pulseChange: +25 },
      { text: "D. Notify the trauma team immediately", correct: true,  pulseChange: -12 },
    ],
    correctFeedback:  "Correct! Promptly notifying the trauma team ensures timely evaluation and definitive treatment.",
    incorrectFeedback: "Incorrect. Fatal delay — flatline.",
    rationale: "Trauma team activation triggers coordinated surgical response. Internal hemorrhage often requires emergent operative management — no amount of nursing intervention replaces surgical hemorrhage control.",
    bpChange: { systolic: -10, diastolic: -5 },
    final: true,
  },
];

// ── PATIENT 2 — Maria Lopez (Septic Shock) ───────────────────────────────────
const scenarios2 = [
  {
    // Answer: C
    prompt: "Which finding indicates the greatest immediate threat to the patient's stability?",
    options: [
      { text: "A. Fever of 103.1°F",              correct: false, pulseChange: +8  },
      { text: "B. Elevated respiratory rate",     correct: false, pulseChange: +8  },
      { text: "C. Low blood pressure of 86/54",   correct: true,  pulseChange: -6  },
      { text: "D. Confusion",                     correct: false, pulseChange: +8  },
    ],
    correctFeedback:  "Correct! Hypotension suggests poor tissue perfusion and possible septic shock, requiring immediate intervention.",
    incorrectFeedback: "Incorrect. Low blood pressure is the most life-threatening finding. Monitor alarms will escalate.",
    rationale: "While all findings are concerning, hypotension (86/54) signals hemodynamic instability. Septic shock is defined by persistent hypotension despite fluid resuscitation, requiring vasopressors to maintain perfusion.",
    bpChange: { systolic: 0, diastolic: 0 },
  },
  {
    // Answer: B
    prompt: "Which recent history finding most likely contributed to the patient's condition?",
    options: [
      { text: "A. Mild hypertension",    correct: false, pulseChange: +8  },
      { text: "B. Urinary tract infection", correct: true, pulseChange: -6 },
      { text: "C. Seasonal allergies",   correct: false, pulseChange: +8  },
      { text: "D. Chronic back pain",    correct: false, pulseChange: +8  },
    ],
    correctFeedback:  "Correct! A urinary tract infection is a common source of sepsis, particularly when the infection progresses or is not adequately controlled.",
    incorrectFeedback: "Incorrect. The UTI is the likely source — bacteria entered the bloodstream and triggered a systemic response. Patient becomes more confused.",
    rationale: "Urosepsis accounts for ~25% of all sepsis cases. In elderly patients, atypical presentation (confusion, weakness) is common. A UTI diagnosed 3 days ago without adequate treatment is the clear infection source.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    // Answer: C
    prompt: "Which condition best explains the patient's presentation?",
    options: [
      { text: "A. Stroke",              correct: false, pulseChange: +10 },
      { text: "B. Heart failure",       correct: false, pulseChange: +10 },
      { text: "C. Septic shock",        correct: true,  pulseChange: -8  },
      { text: "D. Asthma exacerbation", correct: false, pulseChange: +10 },
    ],
    correctFeedback:  "Correct! Fever, hypotension, tachycardia, altered mental status, and a recent infection are consistent with septic shock.",
    incorrectFeedback: "Incorrect. Septic shock is defined by the combination of infection, systemic inflammatory response, and organ hypoperfusion. Heart rate increases.",
    rationale: "SIRS criteria: temp >38°C, HR >90, RR >20 + infection + hypotension = septic shock. Stroke → focal neurologic deficits; heart failure → pulmonary congestion.",
    bpChange: { systolic: -3, diastolic: -2 },
  },
  {
    // Answer: B
    prompt: "Which assessment should guide immediate care?",
    options: [
      { text: "A. Complete head-to-toe assessment", correct: false, pulseChange: +8 },
      { text: "B. ABCs / Primary survey",           correct: true,  pulseChange: -6 },
      { text: "C. Pain assessment",                 correct: false, pulseChange: +8 },
      { text: "D. Fall-risk evaluation",            correct: false, pulseChange: +8 },
    ],
    correctFeedback:  "Correct! The primary survey (ABCs) identifies and treats immediate life-threatening conditions before further assessment.",
    incorrectFeedback: "Incorrect. ABCs come first — always. Blood pressure falls more rapidly.",
    rationale: "Primary survey: Airway → Breathing → Circulation → Disability → Exposure. Secondary surveys (fall risk, pain) are performed only once the patient is stabilized.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    // Answer: B
    prompt: "Which intervention should be performed first to improve oxygenation?",
    options: [
      { text: "A. Encourage deep breathing only",      correct: false, pulseChange: +10 },
      { text: "B. Apply supplemental oxygen",          correct: true,  pulseChange: -6  },
      { text: "C. Wait for respiratory therapy",       correct: false, pulseChange: +12 },
      { text: "D. Obtain another temperature reading", correct: false, pulseChange: +8  },
    ],
    correctFeedback:  "Correct! Supplemental oxygen improves oxygen delivery while treatment for septic shock is initiated.",
    incorrectFeedback: "Incorrect. SpO₂ 92% is below the goal of ≥95%. Oxygen saturation drops further.",
    rationale: "Sepsis impairs oxygen delivery through vasodilation and microvascular dysfunction. Supplemental O₂ targets SpO₂ ≥94%. High-flow O₂ via non-rebreather mask may be needed in severe cases.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    // Answer: B
    prompt: "What intervention is most appropriate now?",
    options: [
      { text: "A. Restrict fluids",         correct: false, pulseChange: +14 },
      { text: "B. Begin IV fluid resuscitation", correct: true, pulseChange: -8 },
      { text: "C. Administer insulin",      correct: false, pulseChange: +12 },
      { text: "D. Give oral hydration",     correct: false, pulseChange: +16 },
    ],
    correctFeedback:  "Correct! IV fluid resuscitation helps restore intravascular volume and improve tissue perfusion.",
    incorrectFeedback: "Incorrect. Circulatory support delayed — blood pressure continues falling.",
    rationale: "Sepsis Hour-1 Bundle: 30 mL/kg IV crystalloid for hypotension or lactate ≥4. Early aggressive fluid resuscitation is one of the strongest mortality-reducing interventions in sepsis.",
    bpChange: { systolic: -3, diastolic: -2 },
    penalty: "ivPenalty",
  },
  {
    // Answer: A
    prompt: "Which treatment should be initiated as soon as possible?",
    options: [
      { text: "A. Broad-spectrum antibiotics", correct: true,  pulseChange: -8  },
      { text: "B. Sedatives",                  correct: false, pulseChange: +18 },
      { text: "C. Blood transfusion",          correct: false, pulseChange: +12 },
      { text: "D. Anticoagulants",             correct: false, pulseChange: +12 },
    ],
    correctFeedback:  "Correct! Early administration of broad-spectrum antibiotics is essential to control the source of infection.",
    incorrectFeedback: "Incorrect. Source of infection remains uncontrolled — heart rate indicator turns yellow.",
    rationale: "For every hour of delay in antibiotic administration in septic shock, mortality increases by ~7%. Broad-spectrum coverage is used empirically until culture results guide de-escalation.",
    bpChange: { systolic: -4, diastolic: -2 },
    critical: true,
  },
  {
    // Answer: B
    prompt: "Which laboratory test is especially important in suspected sepsis?",
    options: [
      { text: "A. Pregnancy test",        correct: false, pulseChange: +10 },
      { text: "B. Serum lactate level",   correct: true,  pulseChange: -8  },
      { text: "C. Cholesterol panel",     correct: false, pulseChange: +10 },
      { text: "D. Thyroid function tests",correct: false, pulseChange: +10 },
    ],
    correctFeedback:  "Correct! Elevated serum lactate indicates poor tissue perfusion and helps assess the severity of sepsis.",
    incorrectFeedback: "Incorrect. Lactate ≥2 mmol/L indicates tissue hypoxia. Screen vignette darkens and alarms escalate.",
    rationale: "Lactate is a byproduct of anaerobic metabolism when cells are oxygen-deprived. A lactate ≥4 mmol/L is diagnostic of septic shock. Serial measurements guide resuscitation effectiveness.",
    bpChange: { systolic: -4, diastolic: -2 },
  },
  {
    // Answer: B
    prompt: "The patient's blood pressure remains low despite IV fluids. What should you do next?",
    options: [
      { text: "A. Continue observing",                                      correct: false, pulseChange: +20 },
      { text: "B. Prepare for vasopressor support and notify the sepsis team", correct: true, pulseChange: -10 },
      { text: "C. Focus on fever reduction only",                           correct: false, pulseChange: +18 },
      { text: "D. Schedule discharge planning",                             correct: false, pulseChange: +22 },
    ],
    correctFeedback:  "Correct! Persistent hypotension despite IV fluids may require vasopressor support to maintain adequate organ perfusion.",
    incorrectFeedback: "Incorrect. Fluid-refractory hypotension requires vasopressors. Heart rate indicator turns red.",
    rationale: "When MAP remains <65 mmHg despite adequate fluid resuscitation, vasopressor therapy (norepinephrine first-line) is indicated. Delay leads to prolonged hypoperfusion and organ failure.",
    bpChange: { systolic: -8, diastolic: -5 },
    critical: true,
  },
  {
    // Answer: C
    prompt: "What is your PRIORITY action?",
    options: [
      { text: "A. Document findings",                                                              correct: false, pulseChange: +28 },
      { text: "B. Reassess pain level",                                                            correct: false, pulseChange: +22 },
      { text: "C. Continue aggressive sepsis management and immediately notify the rapid response team", correct: true, pulseChange: -12 },
      { text: "D. Obtain a dietary consultation",                                                  correct: false, pulseChange: +30 },
    ],
    correctFeedback:  "Correct! Prompt escalation and continued sepsis management help prevent organ failure and cardiac arrest.",
    incorrectFeedback: "Incorrect. Multi-organ failure — BP reaches critical levels. Cardiac arrest imminent.",
    rationale: "Septic shock has >40% mortality. Rapid response team activation ensures immediate intensivist involvement. Continued aggressive management — antibiotics, fluids, vasopressors, source control — is the only path to survival.",
    bpChange: { systolic: -10, diastolic: -6 },
    final: true,
  },
];

// ── Patient chart data ────────────────────────────────────────────────────────
const patientCharts = {
  1: {
    name: "Jordan R.", age: 28, case: "Trauma — Motorcycle Crash",
    rows: [
      ["Mechanism",    "Motorcycle crash — blunt abdominal trauma"],
      ["Status",       "Pale, cool, clammy skin"],
      ["Abdomen",      "Rigid on palpation, severe pain"],
      ["Pulse",        "130 BPM (weak, thready)"],
      ["BP",           "88/60 mmHg"],
      ["Respirations", "28/min"],
      ["Complaint",    "Severe abdominal pain"],
      ["Concern",      "Suspected internal hemorrhage / hypovolemic shock"],
    ]
  },
  2: {
    name: "Maria Lopez", age: 56, case: "Sepsis — UTI Source",
    rows: [
      ["Chief Complaint", "Fever, weakness, confusion"],
      ["History",         "UTI diagnosed 3 days ago"],
      ["Family Report",   "Increasingly confused and lethargic since morning"],
      ["Temperature",     "103.1°F (39.5°C)"],
      ["Pulse",           "124 BPM (rapid)"],
      ["BP",              "86/54 mmHg"],
      ["Respirations",    "30/min"],
      ["SpO₂",            "92%"],
      ["Skin",            "Warm, flushed, delayed responses"],
      ["Concern",         "Suspected septic shock from urosepsis"],
    ]
  }
};


// ════════ UI FEATURES ════════

// ui.js — Vitals trend graph, particles, wrong-answer sound, mini loading, patient chart

// ═══════════════════════════════════════════════════════
// FEATURE 1 — VITALS TREND GRAPH (live pulse sparkline)
// ═══════════════════════════════════════════════════════
const trendCanvas = document.getElementById("vitalsTrendCanvas");
const trendCtx = trendCanvas.getContext("2d");
const TREND_MAX = 60;      // data points to keep
const trendHistory = [];   // {pulse, bp} entries

function pushTrend() {
  trendHistory.push({ pulse: vitals.pulse, bp: vitals.bpSystolic });
  if (trendHistory.length > TREND_MAX) trendHistory.shift();
}

function drawTrend() {
  const w = trendCanvas.width, h = trendCanvas.height;
  trendCtx.clearRect(0, 0, w, h);

  // Background grid lines
  trendCtx.strokeStyle = "rgba(255,255,255,0.06)";
  trendCtx.lineWidth = 1;
  for (let y = 0; y < h; y += 18) {
    trendCtx.beginPath(); trendCtx.moveTo(0,y); trendCtx.lineTo(w,y); trendCtx.stroke();
  }

  if (trendHistory.length < 2) return;

  const pMin = 50, pMax = 220;

  function drawLine(key, color, lineW) {
    trendCtx.strokeStyle = color;
    trendCtx.lineWidth = lineW;
    trendCtx.lineJoin = "round";
    trendCtx.beginPath();
    trendHistory.forEach((d, i) => {
      const x = (i / (TREND_MAX - 1)) * w;
      const val = Math.max(pMin, Math.min(pMax, d[key]));
      const y = h - ((val - pMin) / (pMax - pMin)) * h;
      i === 0 ? trendCtx.moveTo(x, y) : trendCtx.lineTo(x, y);
    });
    trendCtx.stroke();
  }

  // Pulse line — green/yellow/red
  const p = vitals.pulse;
  const lineColor = p > 140 || p < 80 ? "#ff4444" : p > 120 || p < 100 ? "#ffff00" : "#00ff9d";
  drawLine("pulse", lineColor, 2);

  // BP systolic — faint blue overlay
  drawLine("bp", "rgba(100,180,255,0.5)", 1.5);

  // Labels
  trendCtx.fillStyle = "rgba(255,255,255,0.55)";
  trendCtx.font = "9px Courier New";
  trendCtx.fillText("HR/BP", 4, 10);
  trendCtx.fillText(Math.round(vitals.pulse) + " bpm", w - 50, 10);
}

// ═══════════════════════════════════════════════════
// FEATURE 4 — PARTICLE SYSTEM (blood/IV drip)
// ═══════════════════════════════════════════════════
const pCanvas = document.getElementById("particleCanvas");
const pCtx = pCanvas.getContext("2d");
let particles = [];

function resizeParticleCanvas() {
  pCanvas.width  = window.innerWidth;
  pCanvas.height = window.innerHeight;
}
resizeParticleCanvas();
window.addEventListener("resize", resizeParticleCanvas);

function spawnParticles(type) {
  // Project patient 3D position to screen
  let sx = window.innerWidth * 0.62, sy = window.innerHeight * 0.55;
  const _activeModel = (currentPatient === 2 && patient2Model) ? patient2Model : patientModel;
  if (scene && camera && _activeModel) {
    const pos3 = new THREE.Vector3();
    _activeModel.getWorldPosition(pos3);
    pos3.project(camera);
    sx = (pos3.x * 0.5 + 0.5) * window.innerWidth;
    sy = (-pos3.y * 0.5 + 0.5) * window.innerHeight;
  }

  const count = type === "blood" ? 28 : 14;
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = type === "blood"
      ? Math.random() * 4.5 + 1.5
      : Math.random() * 1.8 + 0.4;
    particles.push({
      x: sx + (Math.random() - 0.5) * 30,
      y: sy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed * (type === "blood" ? 1 : 0.3),
      vy: type === "blood"
        ? Math.sin(angle) * speed - 1
        : Math.abs(Math.sin(angle)) * speed + 1.5,  // drip falls down
      alpha: 1,
      radius: type === "blood" ? Math.random() * 5 + 2 : Math.random() * 3 + 1,
      color: type === "blood" ? "#cc0000" : "#4488ff",
      decay: type === "blood" ? 0.025 : 0.018,
      gravity: type === "blood" ? 0.18 : 0.08,
      type,
    });
  }
}

function updateParticles() {
  if (particles.length === 0) return;
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles = particles.filter(p => p.alpha > 0.02);
  particles.forEach(p => {
    p.vy += p.gravity;
    p.x += p.vx; p.y += p.vy;
    p.alpha -= p.decay;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    pCtx.fillStyle = p.color;
    pCtx.globalAlpha = Math.max(0, p.alpha);
    pCtx.fill();
  });
  pCtx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════
// FEATURE 5 — WRONG ANSWER SOUND CUE
// ══════════════════════════════════════════════════
function playWrongBuzz() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────
// MINI LOADING SCREEN (restart / patient 2 transitions)
// ─────────────────────────────────────────────────────────
const miniLoadingScreen = document.getElementById("miniLoadingScreen");
const miniLoadingMsg = document.getElementById("miniLoadingMsg");
const miniFinalMsg = document.getElementById("miniFinalMsg");

const MINI_PHRASES = {
  restart1: [
    "RELOADING TRAUMA BAY...",
    "RESETTING PATIENT VITALS...",
    "STANDING BY FOR JORDAN R..."
  ],
  restart2: [
    "RELOADING OBSERVATION ROOM...",
    "RESETTING SEPSIS PROTOCOL...",
    "STANDING BY FOR MARIA LOPEZ..."
  ],
  patient2: [
    "INCOMING PATIENT ALERT...",
    "LOADING PATIENT RECORDS...",
    "PREPARING OBSERVATION BAY..."
  ],
};
const MINI_FINAL = {
  restart1: "PATIENT ARRIVAL IMMINENT — STANDBY.",
  restart2: "PATIENT ARRIVAL IMMINENT — STANDBY.",
  patient2: "NEW PATIENT EN ROUTE — PREPARE BAY.",
};

let miniEcgRenderer = null;

function initMiniECG() {
  const container = document.getElementById("miniEcgContainer");
  if (!container || miniEcgRenderer) return;
  const mScene = new THREE.Scene();
  const mCam = new THREE.OrthographicCamera(-2.5, 2.5, 0.8, -0.2, 0.1, 10);
  mCam.position.z = 5;
  miniEcgRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  miniEcgRenderer.setSize(200, 50);
  container.appendChild(miniEcgRenderer.domElement);
  const pts = [];
  for (let i = 0; i < 100; i++) pts.push(new THREE.Vector3(-2.5 + i * (5/99), 0, 0));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const line = new THREE.Line(geo, mat);
  line.scale.y = 0.4; line.position.y = 0.1;
  mScene.add(line);
  let wIdx = 0;
  function tick() {
    if (!miniLoadingScreen || miniLoadingScreen.style.display === "none") return;
    requestAnimationFrame(tick);
    const pos = geo.attributes.position;
    for (let i = 0; i < 99; i++) pos.setY(i, pos.getY(i+1));
    pos.setY(99, ecgWave[wIdx]); wIdx = (wIdx+1) % ecgWave.length;
    pos.needsUpdate = true;
    miniEcgRenderer.render(mScene, mCam);
  }
  tick();
}

function showMiniLoading(type, onDone) {
  const phrases = MINI_PHRASES[type] || MINI_PHRASES.restart1;
  const finalText = MINI_FINAL[type] || MINI_FINAL.restart1;

  // Remove any stray home buttons
  document.querySelectorAll("button").forEach(b => {
    if (b.textContent.trim().startsWith("⌂")) b.remove();
  });

  // The canvas must stay rendered — show mini screen ON TOP via fixed overlay
  // gameContent stays in DOM but hidden behind the mini screen
  gameContent.style.visibility = "hidden";
  miniLoadingScreen.style.display = "flex";
  miniLoadingMsg.textContent = "";
  miniFinalMsg.style.display = "none";
  miniFinalMsg.textContent = finalText;

  // Start heartbeat
  audioElements.loadingHeartbeat.currentTime = 0;
  audioElements.loadingHeartbeat.volume = 0.3;
  audioElements.loadingHeartbeat.play().catch(() => {});

  initMiniECG();

  let i = 0;
  function showNext() {
    if (i >= phrases.length) {
      miniFinalMsg.style.display = "block";
      setTimeout(() => {
        audioElements.loadingHeartbeat.pause();
        audioElements.loadingHeartbeat.currentTime = 0;
        miniLoadingScreen.style.display = "none";
        gameContent.style.visibility = "visible";
        onDone();
      }, 1400);
      return;
    }
    miniLoadingMsg.textContent = phrases[i];
    i++;
    setTimeout(showNext, 900);
  }
  showNext();
}

// ─────────────────────────────────────────────────────────
// PATIENT CHART OVERLAY LOGIC
// ─────────────────────────────────────────────────────────
const chartOverlay = document.getElementById("patientChartOverlay");
const chartBtn = document.getElementById("chartBtn");
const chartCloseBtn = document.getElementById("chartCloseBtn");
const chartContent = document.getElementById("chartContent");

function openChart() {
  const data = patientCharts[currentPatient];
  chartContent.innerHTML = `
    <div style="font-size:0.9rem;color:#aabbcc;margin-bottom:0.7rem;">
      <strong style="color:#ddeeff">${data.name}</strong>, Age ${data.age} &nbsp;|&nbsp; ${data.case}
    </div>
    ${data.rows.map(([l,v]) => `<div class="chart-row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}
  `;
  choiceWindow.style.display = "none";
  chartOverlay.style.display = "block";
}

function closeChart() {
  chartOverlay.style.display = "none";
  // If a scenario is active, show the choice window again
  const idx = gameState.currentScenario - 1;
  const activeScenarios = currentPatient === 1 ? scenarios : scenarios2;
  if (!gameState.simEnded && idx >= 0 && idx < activeScenarios.length) {
    choiceWindow.style.display = "block";
  }
}

chartBtn.addEventListener("click", openChart);
chartCloseBtn.addEventListener("click", closeChart);


// ════════ GAME INIT & VR SETUP ════════

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


// ════════ GAMEPLAY LOGIC ════════

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
    const STABLE_TARGET = 100;  // center of green zone per design doc (80-120 BPM)
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

    if (scenario.critical && vitals.consecutiveWrongAnswers >= 3) {
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
  // Design doc: Green 80-120 BPM | Yellow 120-140 or rapidly changing | Red <80 BPM
  if (displayPulse >= 80 && displayPulse <= 120) {
    currentColorClass = "pulse-green";
    colorHex = "#00ff9d";
    pulseValueUI.classList.add(currentColorClass);
  } else if (displayPulse > 120 && displayPulse <= 140) {
    currentColorClass = "pulse-yellow";
    colorHex = "#ffff00";
    pulseValueUI.classList.add(currentColorClass);
  } else {
    // < 80 BPM or > 140 BPM — critical
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
    // Passive decay: very gentle upward drift in pulse to create tension
    // but NOT enough to kill on its own — only wrong answers drive death.
    const pulseDrop = gameState.ivPenaltyActive ? 2 : 1;
    vitals.pulse = Math.min(PULSE_MAX, vitals.pulse + pulseDrop);

    // BP and resp drift slowly
    vitals.bpSystolic  = Math.max(65, vitals.bpSystolic  - 1);
    vitals.bpDiastolic = Math.max(42, vitals.bpDiastolic - 1);
    vitals.respirations = Math.min(38, vitals.respirations + 1);

    updateVitalUI();
    console.log("Vitals worsened | Pulse:", vitals.pulse);

    if (vitals.pulse >= PULSE_MAX || vitals.pulse <= PULSE_MIN) {
      endSimulation(false);
    }
    // BP floor is informational only — pulse threshold drives death.

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
    endTitle.textContent = isSuccess ? "Patient Stabilized" : "Patient Deteriorated to Cardiac Arrest";
  } else {
    endTitle.textContent = isSuccess ? "Patient Stabilized" : "Patient Deteriorated to Cardiac Arrest";
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


// ════════ RENDER LOOP ════════

// render.js — Render loop, window resize

function renderLoop() {
  if (pendingRecenter && renderer.xr.isPresenting && patientModel) {
    if (recenterXRToFacePatient()) pendingRecenter = false;
  }

  if (!renderer.xr.isPresenting) {
    controls.update();
  }

  const now_rl = Date.now();
  const pulse_rl = vitals.pulse;
  const inCritical_rl = pulse_rl > 140 || pulse_rl < 80;
  const inWarning_rl = !inCritical_rl && (pulse_rl > 120 || pulse_rl < 100);

  // --- DYNAMIC LIGHTING based on patient state ---
  if (inCritical_rl) {
    // Emergency red light pulses fast with heartbeat
    emergencyLights.intensity = 0.6 + Math.sin(now_rl * 0.008) * 0.4;

    // Ceiling flicker: random stutters to simulate power/stress
    gameState.flickerTimer -= 1;
    if (gameState.flickerTimer <= 0) {
      gameState.flickerActive = !gameState.flickerActive;
      // Flicker faster in critical state
      gameState.flickerTimer = gameState.flickerActive
        ? Math.floor(Math.random() * 4 + 1)   // off for 1–4 frames
        : Math.floor(Math.random() * 20 + 6); // on for 6–25 frames
    }
    const flickerMult = gameState.flickerActive ? 0.15 : 1.0;
    ambientLight.intensity = gameState.flickerBaseAmbient * flickerMult;
    if (gameState.ceilingLight1) {
      gameState.ceilingLight1.intensity = 3.0 * flickerMult;
      gameState.ceilingLight2.intensity = 2.5 * flickerMult;
    }
  } else if (inWarning_rl) {
    // Warning: subtle red glow, no flicker
    emergencyLights.intensity = 0.2 + Math.sin(now_rl * 0.003) * 0.1;
    ambientLight.intensity = gameState.flickerBaseAmbient || 2.2;
    if (gameState.ceilingLight1) {
      gameState.ceilingLight1.intensity = 3.0;
      gameState.ceilingLight2.intensity = 2.5;
    }
    gameState.flickerActive = false;
    gameState.flickerTimer = 0;
  } else {
    // Stable: clean bright hospital light, no red
    emergencyLights.intensity = 0.0;
    ambientLight.intensity = gameState.flickerBaseAmbient || 2.2;
    if (gameState.ceilingLight1) {
      gameState.ceilingLight1.intensity = 3.0;
      gameState.ceilingLight2.intensity = 2.5;
    }
    gameState.flickerActive = false;
    gameState.flickerTimer = 0;
  }

  updateVitals();
  checkPatientHover();

  if (renderer.xr.isPresenting && !gameState.firstQuestionTriggered) {
    if (controller1) updateLaserAndTryHit(controller1);
    if (controller2) updateLaserAndTryHit(controller2);
  }
  if (renderer.xr.isPresenting) {
    placePulseHUD();
  }

  // Update particles
  updateParticles();

  // Post-processing: bloom + vignette tied to vitals
  if (!renderer.xr.isPresenting && composer) {
    if (inCritical_rl) {
      bloomPass.strength = Math.min(1.4, 0.3 + (Math.abs(pulse_rl - 110) / 110) * 1.2);
    } else {
      bloomPass.strength = 0.15;
    }
    const baseVig = inCritical_rl ? 0.55 : inWarning_rl ? 0.15 : 0.0;
    const vigWave = inCritical_rl ? Math.sin(now_rl * 0.004) * 0.18 : 0;
    vignettePass.uniforms.vignetteStrength.value = baseVig + vigWave;
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}
