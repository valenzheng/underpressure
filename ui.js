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