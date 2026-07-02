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