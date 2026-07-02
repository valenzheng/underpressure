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
  vitalDropInterval: 15000,  // 15s between automatic drops — enough time to read questions
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
