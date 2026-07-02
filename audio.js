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