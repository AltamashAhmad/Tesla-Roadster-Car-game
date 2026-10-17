/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  CameraMode,
  CarFinish,
  LightingPreset,
  StuntEvent,
  TelemetryState,
  TRIM_SPECS,
  TrimMode,
} from './types/game';
import { SoundEngine } from './audio/SoundEngine';
import { createMaterialLibrary, MaterialLibrary } from './three/materials';
import { createRocketRoadster } from './three/RocketRoadsterMesh';
import { createHighwayWorld, TUNNEL_RADIUS } from './three/HighwayWorld';
import { TitleScreenModal } from './components/TitleScreenModal';
import { TelemetryHUD } from './components/TelemetryHUD';

// Pre-allocated math helpers outside animation loop (Zero GC in render tick)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _carUpVec = new THREE.Vector3();

const INITIAL_TELEMETRY: TelemetryState = {
  speedMph: 0,
  speedKmh: 0,
  mach: 0,
  longitudinalG: 0,
  lateralG: 0,
  verticalG: 1.0,
  copvPsi: 10000,
  copvKg: 250,
  compressorRecharging: false,
  batteryPct: 92,
  batteryTempC: 34,
  megacharging: false,
  suctionActive: true,
  inTunnel: false,
  nextTunnelMeters: 500,
  tunnelAngleDeg: 0,
  isInverted: false,
  isAirborne: false,
  altitudeMeters: 0,
  currentFlightMeters: 0,
  rearThrustActive: false,
  liftoffActive: false,
  wingState: 'FLUSH (LOW DRAG)',
  trim: 3, // Mode 3: Rocket Trim (Air Ready - Default)
  cameraMode: 'chase',
  lightingPreset: 'sunset',
  carFinish: 'ano-white',
  score: 0,
  multiplier: 1.0,
  distanceKm: 0,
  dragStats: {
    active: false,
    armed: true,
    elapsedMs: 0,
    distanceMeters: 0,
    currentZeroToSixtyMs: null,
    currentZeroToHundredMs: null,
    currentQuarterMileMs: null,
    currentQuarterMileTrapMph: null,
    bestZeroToSixtyMs: null,
    bestZeroToHundredMs: null,
    bestQuarterMileMs: null,
    bestTopSpeedMph: 0,
    longestFlightMeters: 0,
  },
  recentStunts: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const soundEngineRef = useRef<SoundEngine | null>(null);
  const matLibRef = useRef<MaterialLibrary | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>('title');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [webglLost, setWebglLost] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryState>(INITIAL_TELEMETRY);

  // Mutable simulation state stored in ref so 60fps loop never causes React re-mounts
  const simRef = useRef({
    gameState: 'title' as 'title' | 'playing' | 'paused',
    trim: 3 as TrimMode,
    cameraMode: 'chase' as CameraMode,
    lightingPreset: 'sunset' as LightingPreset,
    carFinish: 'ano-white' as CarFinish,

    // Kinematics
    speedMph: 0,
    playerX: 2.0, // Right-of-center lane
    playerY: 0.0,
    playerZ: 0.0, // Total forward distance in meters
    verticalVel: 0.0,
    altitudeMeters: 0.0,
    hoverSustainedTime: 0.0,
    currentFlightStartZ: 0.0,

    // Cylindrical Tunnel Wall / Ceiling Driving State
    inTunnel: false,
    nextTunnelMeters: 500,
    tunnelThetaRad: 0.0, // 0 = road floor, +-PI/2 = walls, +-PI = upside-down ceiling
    tunnelAngularVel: 0.0,

    // Mid-Air Kickflip / Barrel Roll State
    kickflipAngleRad: 0.0,
    kickflipAngularVel: 0.0,
    bodyRollRad: 0.0,
    bodyPitchRad: 0.0,
    cameraShake: 0.0,
    hitstopTimer: 0.0,

    // Resources
    copvPsi: 10000,
    batteryPct: 92.0,
    batteryTempC: 34.0,
    suctionActive: true,
    megacharging: false,

    // Score & Stunts
    score: 0,
    multiplier: 1.0,
    stuntCounter: 1,
    recentStunts: [] as StuntEvent[],

    // Drag Strip Timer
    dragStats: { ...INITIAL_TELEMETRY.dragStats },

    // Action hooks into Three.js world
    resetDragRequested: false,
    warpTunnelRequested: false,
    lightingUpdateRequested: true,
  });

  // Held & Edge-triggered Input state
  const keysRef = useRef<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    shift: boolean;
    space: boolean;
    q: boolean;
    e: boolean;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
    shift: false,
    space: false,
    q: false,
    e: false,
  });

  // Action Handlers
  const handleSelectTrim = useCallback((trim: TrimMode) => {
    simRef.current.trim = trim;
    soundEngineRef.current?.playStuntChime('mode');
    setTelemetry((prev) => ({ ...prev, trim }));
  }, []);

  const handleToggleSuction = useCallback(() => {
    simRef.current.suctionActive = !simRef.current.suctionActive;
    soundEngineRef.current?.playStuntChime('mode');
    setTelemetry((prev) => ({ ...prev, suctionActive: simRef.current.suctionActive }));
  }, []);

  const handleCycleCamera = useCallback(() => {
    const order: CameraMode[] = ['chase', 'cockpit', 'bumper', 'heli'];
    const next = order[(order.indexOf(simRef.current.cameraMode) + 1) % order.length];
    simRef.current.cameraMode = next;
    setTelemetry((prev) => ({ ...prev, cameraMode: next }));
  }, []);

  const handleCycleLighting = useCallback(() => {
    const order: LightingPreset[] = ['sunset', 'day', 'night'];
    const next = order[(order.indexOf(simRef.current.lightingPreset) + 1) % order.length];
    simRef.current.lightingPreset = next;
    simRef.current.lightingUpdateRequested = true;
    setTelemetry((prev) => ({ ...prev, lightingPreset: next }));
  }, []);

  const handleSelectFinish = useCallback((finish: CarFinish) => {
    simRef.current.carFinish = finish;
    matLibRef.current?.setCarFinish(finish);
    setTelemetry((prev) => ({ ...prev, carFinish: finish }));
  }, []);

  const handleResetDrag = useCallback(() => {
    simRef.current.resetDragRequested = true;
    soundEngineRef.current?.playStuntChime('drag');
  }, []);

  const handleWarpToTunnel = useCallback(() => {
    simRef.current.warpTunnelRequested = true;
    soundEngineRef.current?.playStuntChime('mode');
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleStartGame = useCallback(() => {
    soundEngineRef.current?.init();
    simRef.current.gameState = 'playing';
    setGameState('playing');
  }, []);

  const handleOpenPause = useCallback(() => {
    simRef.current.gameState = 'paused';
    setGameState('paused');
  }, []);

  // Main WebGL & 60fps Physics Loop Initialization
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const soundEngine = new SoundEngine();
    soundEngineRef.current = soundEngine;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d18');
    scene.fog = new THREE.FogExp2('#090d18', 0.0022);

    const camera = new THREE.PerspectiveCamera(
      68,
      window.innerWidth / window.innerHeight,
      0.15,
      1100
    );
    camera.position.set(0, 2.5, 6.8);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL Context Loss Resilience
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // 2. Studio Environment Map Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. 3-Point Studio & Highway Lighting Rig + Softbox RectAreaLight
    RectAreaLightUniformsLib.init();

    const hemiLight = new THREE.HemisphereLight('#7dd3fc', '#0f172a', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#ffedd5', 2.4);
    keyLight.position.set(28, 45, 30);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 140;
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.35);
    rimLight.position.set(-20, 14, -28);
    scene.add(rimLight);

    // Overhead Automotive Softbox following the car for crisp clearcoat highlights
    const carSoftbox = new THREE.RectAreaLight('#ffffff', 3.2, 3.5, 6.0);
    carSoftbox.position.set(0, 4.2, 0);
    carSoftbox.lookAt(0, 0, 0);
    scene.add(carSoftbox);

    // 4. Create PBR Material Library, 12-Part Rocket Roadster, and Endless Highway World
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const mats = createMaterialLibrary(maxAnisotropy);
    matLibRef.current = mats;

    const roadster = createRocketRoadster(mats);
    scene.add(roadster.group);

    const highway = createHighwayWorld(mats);
    scene.add(highway.group);

    // Pre-warm shaders
    renderer.compile(scene, camera);

    // Helper to add a stunt notification
    const pushStunt = (stunt: Omit<StuntEvent, 'id'>) => {
      const s = simRef.current;
      const newEvent: StuntEvent = {
        ...stunt,
        id: s.stuntCounter++,
      };
      s.multiplier = Math.min(5.0, +(s.multiplier + 0.2).toFixed(1));
      s.score += stunt.points * s.multiplier;
      s.recentStunts = [newEvent, ...s.recentStunts.slice(0, 3)];
      soundEngine.playStuntChime('stunt');
    };

    // 5. Keyboard Input Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const k = keysRef.current;

      if (code === 'KeyW' || code === 'ArrowUp') k.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') k.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') k.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') k.right = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') k.shift = true;
      if (code === 'Space') {
        if (simRef.current.gameState !== 'playing') {
          e.preventDefault();
          soundEngine.init();
          simRef.current.gameState = 'playing';
          setGameState('playing');
          return;
        }
        e.preventDefault();
        k.space = true;
      }
      if (code === 'KeyQ') {
        k.q = true;
        // Edge-trigger 360° Mid-Air Left Kickflip if airborne and Rocket Trim
        if (
          simRef.current.altitudeMeters > 0.6 &&
          TRIM_SPECS[simRef.current.trim].liftoffThrustersUnlocked &&
          simRef.current.copvPsi >= 250 &&
          Math.abs(simRef.current.kickflipAngularVel) < 1.0
        ) {
          simRef.current.kickflipAngularVel = Math.PI * 3.6; // Full 360 roll
          simRef.current.copvPsi = Math.max(0, simRef.current.copvPsi - 320);
          pushStunt({
            label: '360° COLD-GAS KICKFLIP',
            points: 1800,
            detail: 'Micro-Actuator Mid-Air Roll',
            color: 'cyan',
          });
        }
      }
      if (code === 'KeyE') {
        k.e = true;
        // Edge-trigger 360° Mid-Air Right Kickflip if airborne and Rocket Trim
        if (
          simRef.current.altitudeMeters > 0.6 &&
          TRIM_SPECS[simRef.current.trim].liftoffThrustersUnlocked &&
          simRef.current.copvPsi >= 250 &&
          Math.abs(simRef.current.kickflipAngularVel) < 1.0
        ) {
          simRef.current.kickflipAngularVel = -Math.PI * 3.6;
          simRef.current.copvPsi = Math.max(0, simRef.current.copvPsi - 320);
          pushStunt({
            label: '360° COLD-GAS BARREL ROLL',
            points: 1800,
            detail: 'Micro-Actuator Mid-Air Roll',
            color: 'cyan',
          });
        }
      }

      // Mode & Utility Shortcuts
      if (code === 'Enter' && simRef.current.gameState !== 'playing') {
        soundEngine.init();
        simRef.current.gameState = 'playing';
        setGameState('playing');
      } else if (code === 'Escape') {
        if (simRef.current.gameState === 'playing') {
          simRef.current.gameState = 'paused';
          setGameState('paused');
        } else if (simRef.current.gameState === 'paused') {
          simRef.current.gameState = 'playing';
          setGameState('playing');
        }
      } else if (code === 'Digit1') {
        handleSelectTrim(1);
      } else if (code === 'Digit2') {
        handleSelectTrim(2);
      } else if (code === 'Digit3') {
        handleSelectTrim(3);
      } else if (code === 'KeyF') {
        handleToggleSuction();
      } else if (code === 'KeyC') {
        handleCycleCamera();
      } else if (code === 'KeyR') {
        handleResetDrag();
      } else if (code === 'KeyT') {
        handleWarpToTunnel();
      } else if (code === 'KeyM') {
        handleToggleMute();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const k = keysRef.current;
      if (code === 'KeyW' || code === 'ArrowUp') k.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') k.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') k.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') k.right = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') k.shift = false;
      if (code === 'Space') k.space = false;
      if (code === 'KeyQ') k.q = false;
      if (code === 'KeyE') k.e = false;
    };

    const onWindowBlur = () => {
      keysRef.current = {
        up: false,
        down: false,
        left: false,
        right: false,
        shift: false,
        space: false,
        q: false,
        e: false,
      };
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onResize);

    // 6. 60fps Simulation & Render Loop
    const clock = new THREE.Clock();
    let hudUpdateAccum = 0;
    let animFrameId = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();
      const s = simRef.current;
      const k = keysRef.current;
      const spec = TRIM_SPECS[s.trim];

      // Apply Lighting Preset updates if requested
      if (s.lightingUpdateRequested) {
        s.lightingUpdateRequested = false;
        if (s.lightingPreset === 'sunset') {
          scene.background = new THREE.Color('#0c1020');
          scene.fog = new THREE.FogExp2('#0c1020', 0.0021);
          keyLight.color.set('#fb923c');
          keyLight.intensity = 2.6;
          hemiLight.color.set('#38bdf8');
          hemiLight.groundColor.set('#1e1b4b');
        } else if (s.lightingPreset === 'day') {
          scene.background = new THREE.Color('#1e293b');
          scene.fog = new THREE.FogExp2('#1e293b', 0.0018);
          keyLight.color.set('#ffffff');
          keyLight.intensity = 3.0;
          hemiLight.color.set('#bae6fd');
          hemiLight.groundColor.set('#334155');
        } else {
          // Night mode
          scene.background = new THREE.Color('#04060b');
          scene.fog = new THREE.FogExp2('#04060b', 0.0025);
          keyLight.color.set('#38bdf8');
          keyLight.intensity = 1.4;
          hemiLight.color.set('#1e3a8a');
          hemiLight.groundColor.set('#020617');
        }
      }

      // Handle Drag Strip Reset Request (`R`)
      if (s.resetDragRequested) {
        s.resetDragRequested = false;
        s.speedMph = 0;
        s.playerX = 2.0;
        s.playerY = 0.0;
        s.altitudeMeters = 0.0;
        s.verticalVel = 0.0;
        s.tunnelThetaRad = 0.0;
        s.tunnelAngularVel = 0.0;
        s.kickflipAngleRad = 0.0;
        s.kickflipAngularVel = 0.0;
        s.copvPsi = 10000;
        s.dragStats.active = false;
        s.dragStats.armed = true;
        s.dragStats.elapsedMs = 0;
        s.dragStats.distanceMeters = 0;
        s.dragStats.currentZeroToSixtyMs = null;
        s.dragStats.currentZeroToHundredMs = null;
        s.dragStats.currentQuarterMileMs = null;
        s.dragStats.currentQuarterMileTrapMph = null;
        highway.resetTrafficForDrag();
      }

      // Handle Warp to Tunnel Entrance Request (`T`)
      if (s.warpTunnelRequested) {
        s.warpTunnelRequested = false;
        s.playerZ = highway.warpToTunnelEntrance(s.playerZ);
        s.suctionActive = true;
        if (s.speedMph < 180) s.speedMph = 220;
      }

      // Title Screen Live Demo Camera Mode
      if (s.gameState === 'title') {
        const demoSpeed = 145;
        s.playerZ += demoSpeed * 0.44704 * dt;

        highway.update({
          dt,
          elapsed,
          playerZ: s.playerZ,
          playerX: 0,
          playerY: 0,
          speedMph: demoSpeed,
          isAirborne: false,
          altitudeMeters: 0,
          isInverted: false,
          tunnelAngleDeg: 0,
          rearThrustActive: false,
          onStunt: () => {},
          onCollision: () => {},
        });

        roadster.group.position.set(0, 0, 0);
        roadster.group.rotation.set(0, 0, 0);
        roadster.update({
          dt,
          elapsed,
          speedMph: demoSpeed,
          steerInput: Math.sin(elapsed * 0.6) * 0.15,
          braking: false,
          rearThrustActive: Math.sin(elapsed * 1.4) > 0.55,
          liftoffActive: false,
          rollActiveDir: 0,
          suctionActive: true,
          copvPsi: 10000,
        });

        // Cinematic low-orbit camera around the Rocket Roadster
        const orbitAngle = elapsed * 0.32;
        camera.position.set(
          Math.sin(orbitAngle) * 5.6,
          1.75 + Math.sin(elapsed * 0.7) * 0.35,
          Math.cos(orbitAngle) * 5.6
        );
        camera.lookAt(0, 0.65, 0);
        renderer.render(scene, camera);
        return;
      }

      if (s.gameState === 'paused') {
        renderer.render(scene, camera);
        return;
      }

      // Hitstop brief pause on heavy scrape
      if (s.hitstopTimer > 0) {
        s.hitstopTimer -= dt;
        renderer.render(scene, camera);
        return;
      }

      // =====================================================================
      // CORE PHYSICS & PROPULSION SIMULATION (Mode 1, Mode 2, Mode 3)
      // =====================================================================
      const prevSpeedMph = s.speedMph;

      // Check active cold-gas thrusters
      const rearThrustActive =
        k.shift && spec.rearThrustersUnlocked && s.copvPsi > 40;
      const liftoffActive =
        k.space &&
        spec.liftoffThrustersUnlocked &&
        s.copvPsi > 40 &&
        s.hoverSustainedTime < 4.5;

      // 1. Longitudinal Acceleration (MPH per second)
      // - Mode 1 (1 MW Electric): 0-60 in 1.60s -> ~37.5 mph/s launch
      // - Mode 2 (+4 Rear Thrusters): 0-60 in 0.81s (3.38G) -> ~74.1 mph/s launch
      // - Mode 3 (Rocket 10 Thrusters): 0-60 in 0.59s (4.64G) -> ~101.7 mph/s launch
      const maxSpeedForState = rearThrustActive
        ? spec.topSpeedMph
        : s.trim === 1
        ? 230
        : 255;

      let accelMphPerSec = 0;
      if (k.up || rearThrustActive) {
        const speedRatio = Math.min(1, s.speedMph / maxSpeedForState);
        // Electric drive curve
        const electricAccel = 38.5 * (1 - Math.pow(speedRatio, 1.85));
        // Cold-gas rocket thrust bypasses tire traction and pushes all the way to Mach 0.5 (383 mph)!
        let rocketBoost = 0;
        if (rearThrustActive) {
          rocketBoost = s.trim === 3 ? 65.0 : 38.0;
        }
        accelMphPerSec = (electricAccel + rocketBoost) * (1 - Math.pow(s.speedMph / (spec.topSpeedMph + 8), 4));
      }

      // Aerodynamic drag & rolling resistance
      const dragDecel = 2.2 + (s.speedMph * s.speedMph) * 0.00016;
      // Ceramic + Regenerative Braking + 45° Active Aero Airbrake
      const brakeDecel = k.down ? 54.0 + s.speedMph * 0.08 : 0;

      if (k.up || rearThrustActive) {
        s.speedMph = Math.min(spec.topSpeedMph, s.speedMph + accelMphPerSec * dt);
      } else {
        s.speedMph = Math.max(0, s.speedMph - dragDecel * dt);
      }

      if (k.down) {
        s.speedMph = Math.max(0, s.speedMph - brakeDecel * dt);
      }

      // Calculate exact Longitudinal G-Force (1G = 21.95 mph/s)
      const rawAccelMphS = (s.speedMph - prevSpeedMph) / Math.max(dt, 0.001);
      const longitudinalG = THREE.MathUtils.clamp(rawAccelMphS / 21.95, -2.6, 4.64);

      const speedMps = s.speedMph * 0.44704;
      s.playerZ += speedMps * dt;
      s.score += speedMps * dt * 0.45 * s.multiplier;

      if (s.speedMph > s.dragStats.bestTopSpeedMph) {
        s.dragStats.bestTopSpeedMph = s.speedMph;
      }

      // =====================================================================
      // 2. LIVE DRAG STRIP TELEMETRY TIMER (0-60, 0-100, 1/4 Mile)
      // =====================================================================
      if (s.speedMph < 1.0 && !k.up && !rearThrustActive) {
        s.dragStats.armed = true;
        s.dragStats.active = false;
      }
      if (s.dragStats.armed && (k.up || rearThrustActive) && s.speedMph > 0.5) {
        s.dragStats.armed = false;
        s.dragStats.active = true;
        s.dragStats.elapsedMs = 0;
        s.dragStats.distanceMeters = 0;
        s.dragStats.currentZeroToSixtyMs = null;
        s.dragStats.currentZeroToHundredMs = null;
        s.dragStats.currentQuarterMileMs = null;
      }
      if (s.dragStats.active) {
        s.dragStats.elapsedMs += dt * 1000;
        s.dragStats.distanceMeters += speedMps * dt;

        if (s.dragStats.currentZeroToSixtyMs === null && s.speedMph >= 60) {
          s.dragStats.currentZeroToSixtyMs = s.dragStats.elapsedMs;
          if (
            s.dragStats.bestZeroToSixtyMs === null ||
            s.dragStats.elapsedMs < s.dragStats.bestZeroToSixtyMs
          ) {
            s.dragStats.bestZeroToSixtyMs = s.dragStats.elapsedMs;
          }
          soundEngine.playStuntChime('drag');
        }
        if (s.dragStats.currentZeroToHundredMs === null && s.speedMph >= 100) {
          s.dragStats.currentZeroToHundredMs = s.dragStats.elapsedMs;
          if (
            s.dragStats.bestZeroToHundredMs === null ||
            s.dragStats.elapsedMs < s.dragStats.bestZeroToHundredMs
          ) {
            s.dragStats.bestZeroToHundredMs = s.dragStats.elapsedMs;
          }
        }
        // Quarter-mile = 402.336 meters
        if (s.dragStats.currentQuarterMileMs === null && s.dragStats.distanceMeters >= 402.336) {
          s.dragStats.currentQuarterMileMs = s.dragStats.elapsedMs;
          s.dragStats.currentQuarterMileTrapMph = s.speedMph;
          if (
            s.dragStats.bestQuarterMileMs === null ||
            s.dragStats.elapsedMs < s.dragStats.bestQuarterMileMs
          ) {
            s.dragStats.bestQuarterMileMs = s.dragStats.elapsedMs;
          }
          s.dragStats.active = false;
          pushStunt({
            label: '1/4 MILE TELEMETRY COMPLETE',
            points: 1500,
            detail: `${(s.dragStats.elapsedMs / 1000).toFixed(2)}s @ ${Math.round(s.speedMph)} MPH`,
            color: 'emerald',
          });
        }
      }

      // =====================================================================
      // 3. 600L COPV AIR TANK (10,000 PSI) & ONBOARD ELECTRIC COMPRESSOR
      // =====================================================================
      let psiDrainRate = 0;
      if (rearThrustActive) psiDrainRate += 1150; // ~8.5 seconds of full rear rocket thrust
      if (liftoffActive) psiDrainRate += 1350;

      let compressorRecharging = false;
      if (psiDrainRate > 0) {
        s.copvPsi = Math.max(0, s.copvPsi - psiDrainRate * dt);
      } else if (s.speedMph > 60 && s.copvPsi < 10000 && s.batteryPct > 5) {
        // Onboard Electric Compressor automatically refills COPV tank above 60 mph!
        compressorRecharging = true;
        const rechargeRate = 680 + (s.speedMph / 383) * 520;
        s.copvPsi = Math.min(10000, s.copvPsi + rechargeRate * dt);
      }

      // 4680 Battery & Thermal Management
      if (s.megacharging) {
        s.batteryPct = Math.min(98, s.batteryPct + 28 * dt);
        s.batteryTempC = THREE.MathUtils.damp(s.batteryTempC, 32, 3, dt);
      } else {
        const drain =
          (k.up ? 0.32 : 0.05) +
          (compressorRecharging ? 0.25 : 0) +
          (s.suctionActive ? 0.14 : 0);
        s.batteryPct = Math.max(8, s.batteryPct - drain * dt);
        const targetTemp = 34 + (s.speedMph / 383) * 32 + (rearThrustActive ? 14 : 0);
        s.batteryTempC = THREE.MathUtils.damp(s.batteryTempC, targetTemp, 1.5, dt);
      }

      // =====================================================================
      // 4. STEER-BY-WIRE, CYLINDRICAL TUNNEL INVERSION & VERTICAL LIFTOFF
      // =====================================================================
      const steerInput = (k.left ? -1 : 0) + (k.right ? 1 : 0);
      const gripMultiplier = s.suctionActive ? 1.65 : 1.0;

      // Vertical Liftoff & Hover (`Spacebar`)
      const wasAirborne = s.altitudeMeters > 0.08;
      if (liftoffActive) {
        s.hoverSustainedTime += dt;
        const targetLiftVel = s.altitudeMeters < 5.8 ? 9.5 : 1.2;
        s.verticalVel = THREE.MathUtils.damp(s.verticalVel, targetLiftVel, 6, dt);
      } else {
        if (!wasAirborne) {
          s.hoverSustainedTime = Math.max(0, s.hoverSustainedTime - dt * 2.0);
        }
        // Apply gravity when airborne
        if (s.altitudeMeters > 0) {
          const downforceGravity = s.suctionActive ? 18.5 : 13.5;
          s.verticalVel -= downforceGravity * dt;
        }
      }

      s.altitudeMeters = Math.max(0, Math.min(8.5, s.altitudeMeters + s.verticalVel * dt));
      const isAirborne = s.altitudeMeters > 0.08;

      if (!wasAirborne && isAirborne) {
        s.currentFlightStartZ = s.playerZ;
      } else if (wasAirborne && !isAirborne) {
        s.verticalVel = 0;
        const flightDist = s.playerZ - s.currentFlightStartZ;
        if (flightDist > s.dragStats.longestFlightMeters) {
          s.dragStats.longestFlightMeters = flightDist;
        }
      }
      const currentFlightMeters = isAirborne ? Math.max(0, s.playerZ - s.currentFlightStartZ) : 0;

      // Cylindrical Tunnel Wall & Ceiling Inversion Physics
      // When inside a tunnel and Suction Mode (`F`) is active, steering past the outer lanes
      // or while already on the tunnel wall rotates `tunnelThetaRad` smoothly up the walls (90°) and onto the ceiling (180°)!
      if (s.inTunnel && s.suctionActive && !isAirborne) {
        const nearWallOrOnWall =
          Math.abs(s.tunnelThetaRad) > 0.05 ||
          (s.playerX < -8.2 && steerInput < 0) ||
          (s.playerX > 8.2 && steerInput > 0);

        if (nearWallOrOnWall) {
          // Sync initial angle from playerX if entering wall from highway floor
          if (Math.abs(s.tunnelThetaRad) <= 0.05) {
            s.tunnelThetaRad = s.playerX > 0 ? 0.25 : -0.25;
          }
          s.tunnelThetaRad += steerInput * 1.85 * dt;
          // Wrap angle in [-PI, PI]
          if (s.tunnelThetaRad > Math.PI) s.tunnelThetaRad -= Math.PI * 2;
          if (s.tunnelThetaRad < -Math.PI) s.tunnelThetaRad += Math.PI * 2;

          // Position car along cylindrical tunnel shell of radius R = TUNNEL_RADIUS - 0.55
          const effR = TUNNEL_RADIUS - 0.55;
          s.playerX = Math.sin(s.tunnelThetaRad) * effR;
          s.playerY = effR - Math.cos(s.tunnelThetaRad) * effR;

          // Return to flat road if angle comes back near 0
          if (Math.abs(s.tunnelThetaRad) < 0.14 && steerInput === 0) {
            s.tunnelThetaRad = 0;
            s.playerY = 0;
          }
        } else {
          // Normal horizontal lane carving on tunnel floor
          const lateralSpeed = (14.5 + (s.speedMph / 383) * 10.0) * gripMultiplier;
          s.playerX = THREE.MathUtils.clamp(s.playerX + steerInput * lateralSpeed * dt, -10.8, 10.8);
          s.playerY = 0;
          s.tunnelThetaRad = 0;
        }
      } else {
        // If Suction Mode is turned off while on the tunnel ceiling/wall OR when exiting the tunnel:
        // Gravity detaches the car from the ceiling/wall and drops it into airborne flight back to the road!
        if (Math.abs(s.tunnelThetaRad) > 0.08) {
          if (s.playerY > 0.2) {
            s.altitudeMeters = s.playerY;
            s.verticalVel = -2.5;
          }
          s.tunnelThetaRad = THREE.MathUtils.damp(s.tunnelThetaRad, 0, 6, dt);
          if (Math.abs(s.tunnelThetaRad) < 0.05) s.tunnelThetaRad = 0;
        }

        // Standard 6-lane highway steering
        const lateralSpeed = (14.5 + (s.speedMph / 383) * 10.0) * gripMultiplier;
        s.playerX = THREE.MathUtils.clamp(s.playerX + steerInput * lateralSpeed * dt, -11.0, 11.0);
        s.playerY = s.altitudeMeters;
      }

      // Mid-Air Kickflip / Barrel Roll Kinematics
      if (isAirborne) {
        if (Math.abs(s.kickflipAngularVel) > 0.05) {
          s.kickflipAngleRad += s.kickflipAngularVel * dt;
          if (Math.abs(s.kickflipAngleRad) >= Math.PI * 2) {
            s.kickflipAngleRad = 0;
            s.kickflipAngularVel = 0;
          }
        } else {
          s.kickflipAngleRad = THREE.MathUtils.damp(s.kickflipAngleRad, 0, 10, dt);
        }
      } else {
        s.kickflipAngleRad = 0;
        s.kickflipAngularVel = 0;
      }

      const tunnelAngleDeg = THREE.MathUtils.radToDeg(s.tunnelThetaRad);
      const isInverted = Math.abs(tunnelAngleDeg) > 115;
      const lateralG = steerInput * (0.65 + (s.speedMph / 240) * 1.25) * gripMultiplier;

      // =====================================================================
      // 5. UPDATE 3D WORLD, ROADSTER MESH, CAMERA & PROCEDURAL AUDIO
      // =====================================================================
      const prevMegacharging = s.megacharging;
      const worldStatus = highway.update({
        dt,
        elapsed,
        playerZ: s.playerZ,
        playerX: s.playerX,
        playerY: s.playerY,
        speedMph: s.speedMph,
        isAirborne,
        altitudeMeters: s.altitudeMeters,
        isInverted,
        tunnelAngleDeg,
        rearThrustActive,
        onStunt: pushStunt,
        onCollision: () => {
          s.speedMph = Math.max(40, s.speedMph * 0.72);
          s.multiplier = 1.0;
          s.cameraShake = 0.45;
          s.hitstopTimer = 0.04; // 40ms impact hitstop
        },
      });

      s.inTunnel = worldStatus.inTunnel;
      s.nextTunnelMeters = worldStatus.nextTunnelMeters;
      s.megacharging = worldStatus.megacharging;

      if (!prevMegacharging && s.megacharging) {
        soundEngine.playStuntChime('megacharge');
      }

      // Position & orient the Rocket Roadster in 3D space
      roadster.group.position.set(s.playerX, s.playerY, 0);
      // Tunnel wall/ceiling rotation around Z axis (positive playerX on right wall tilts +Z counterclockwise so roof points inward toward tunnel center)
      roadster.group.rotation.set(0, -steerInput * 0.08, s.tunnelThetaRad);

      // Chassis suspension pitch, torque-vectoring roll, and mid-air 360° kickflip
      const targetPitch =
        rearThrustActive ? -0.045 : k.down && s.speedMph > 20 ? 0.055 : liftoffActive ? -0.06 : 0;
      const targetRoll = -steerInput * (s.suctionActive ? 0.035 : 0.075);
      s.bodyPitchRad = THREE.MathUtils.damp(s.bodyPitchRad, targetPitch, 10, dt);
      s.bodyRollRad = THREE.MathUtils.damp(s.bodyRollRad, targetRoll, 10, dt);

      roadster.chassisGroup.rotation.set(
        s.bodyPitchRad,
        0,
        s.bodyRollRad + s.kickflipAngleRad
      );

      roadster.update({
        dt,
        elapsed,
        speedMph: s.speedMph,
        steerInput,
        braking: k.down,
        rearThrustActive,
        liftoffActive,
        rollActiveDir: k.q ? 1 : k.e ? -1 : 0,
        suctionActive: s.suctionActive,
        copvPsi: s.copvPsi,
      });

      // Keep studio softbox above the car
      carSoftbox.position.set(s.playerX, s.playerY + 4.2, 0);
      carSoftbox.lookAt(s.playerX, s.playerY, 0);

      // Camera Choreography & Dynamic FOV Warp
      const targetFov =
        s.cameraMode === 'cockpit'
          ? 76 + (s.speedMph / 383) * 14
          : 64 + (s.speedMph / 383) * 24 + (rearThrustActive ? 9 : 0);
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
      camera.updateProjectionMatrix();

      if (s.cameraShake > 0) {
        s.cameraShake = Math.max(0, s.cameraShake - dt * 1.8);
      }
      const shakeX = (Math.random() - 0.5) * s.cameraShake;
      const shakeY = (Math.random() - 0.5) * s.cameraShake;

      // Up vector normal to the car's current tunnel wall/ceiling orientation
      _carUpVec.set(-Math.sin(s.tunnelThetaRad), Math.cos(s.tunnelThetaRad), 0);

      if (s.cameraMode === 'chase') {
        _camTargetPos
          .set(s.playerX, s.playerY, 6.2 + (rearThrustActive ? 0.65 : 0))
          .addScaledVector(_carUpVec, 2.05);
        _camLookTarget
          .set(s.playerX * 0.92, s.playerY, -12.0)
          .addScaledVector(_carUpVec, 0.75);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-12 * dt));
        camera.position.x += shakeX;
        camera.position.y += shakeY;
        camera.up.lerp(_carUpVec, 1 - Math.exp(-10 * dt));
        camera.lookAt(_camLookTarget);
      } else if (s.cameraMode === 'cockpit') {
        _camTargetPos
          .set(s.playerX, s.playerY, -0.15)
          .addScaledVector(_carUpVec, 1.05);
        _camLookTarget
          .set(s.playerX - steerInput * 1.8, s.playerY, -30.0)
          .addScaledVector(_carUpVec, 0.9);
        camera.position.copy(_camTargetPos);
        camera.up.copy(_carUpVec);
        camera.lookAt(_camLookTarget);
      } else if (s.cameraMode === 'bumper') {
        _camTargetPos
          .set(s.playerX, s.playerY, -2.35)
          .addScaledVector(_carUpVec, 0.48);
        _camLookTarget
          .set(s.playerX, s.playerY, -40.0)
          .addScaledVector(_carUpVec, 0.45);
        camera.position.copy(_camTargetPos);
        camera.up.copy(_carUpVec);
        camera.lookAt(_camLookTarget);
      } else {
        // Helicopter Side-Tracking Cam
        _camTargetPos.set(s.playerX + 7.5, s.playerY + 3.2, 3.8);
        _camLookTarget.set(s.playerX, s.playerY + 0.7, -2.5);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
        camera.up.set(0, 1, 0);
        camera.lookAt(_camLookTarget);
      }

      // Update Procedural Web Audio Engine
      soundEngine.update({
        speedMph: s.speedMph,
        throttle: k.up,
        rearThrust: rearThrustActive,
        liftoffThrust: liftoffActive,
        rollThrust: Math.abs(s.kickflipAngularVel) > 0.1,
        suctionActive: s.suctionActive,
        megacharging: s.megacharging,
      });

      renderer.render(scene, camera);

      // Sync React Telemetry HUD at ~20Hz so UI stays crisp without overhead
      hudUpdateAccum += dt;
      if (hudUpdateAccum >= 0.05) {
        hudUpdateAccum = 0;
        const wingState =
          k.down && s.speedMph > 25
            ? 'AIRBRAKE 45°'
            : rearThrustActive || s.speedMph > 240
            ? 'FLUSH (LOW DRAG)'
            : s.speedMph > 70
            ? 'HIGH DOWNFORCE'
            : 'FLUSH (LOW DRAG)';

        setTelemetry({
          speedMph: s.speedMph,
          speedKmh: s.speedMph * 1.60934,
          mach: s.speedMph / 767.269,
          longitudinalG,
          lateralG,
          verticalG: isAirborne ? 0.2 : s.suctionActive ? 2.0 : 1.0,
          copvPsi: s.copvPsi,
          copvKg: (s.copvPsi / 10000) * 250,
          compressorRecharging,
          batteryPct: s.batteryPct,
          batteryTempC: s.batteryTempC,
          megacharging: s.megacharging,
          suctionActive: s.suctionActive,
          inTunnel: s.inTunnel,
          nextTunnelMeters: s.nextTunnelMeters,
          tunnelAngleDeg,
          isInverted,
          isAirborne,
          altitudeMeters: s.altitudeMeters,
          currentFlightMeters,
          rearThrustActive,
          liftoffActive,
          wingState,
          trim: s.trim,
          cameraMode: s.cameraMode,
          lightingPreset: s.lightingPreset,
          carFinish: s.carFinish,
          score: s.score,
          multiplier: s.multiplier,
          distanceKm: s.playerZ / 1000,
          dragStats: { ...s.dragStats },
          recentStunts: s.recentStunts,
        });
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      soundEngine.dispose();
      mats.dispose();
      renderer.dispose();
    };
  }, [
    handleSelectTrim,
    handleToggleSuction,
    handleCycleCamera,
    handleResetDrag,
    handleWarpToTunnel,
    handleToggleMute,
  ]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#06080d] select-none">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Graceful Fallback if WebGL Context is Interrupted */}
      {webglLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="max-w-md space-y-2">
            <h2 className="font-display text-xl font-bold">WebGL Graphics Context Paused</h2>
            <p className="text-sm text-slate-400">
              Restoring 3D hardware acceleration for the 2026 Rocket Roadster simulation...
            </p>
          </div>
        </div>
      )}

      {/* Live Telemetry HUD & Unified Collapsible Bottom Dock */}
      {gameState !== 'title' && (
        <TelemetryHUD
          telemetry={telemetry}
          isMuted={isMuted}
          onSelectTrim={handleSelectTrim}
          onToggleSuction={handleToggleSuction}
          onCycleCamera={handleCycleCamera}
          onCycleLighting={handleCycleLighting}
          onSelectFinish={handleSelectFinish}
          onResetDrag={handleResetDrag}
          onWarpToTunnel={handleWarpToTunnel}
          onToggleMute={handleToggleMute}
          onOpenPause={handleOpenPause}
        />
      )}

      {/* Title Screen & Pause Modal Shell */}
      <TitleScreenModal
        isOpen={gameState === 'title' || gameState === 'paused'}
        isPaused={gameState === 'paused'}
        selectedTrim={telemetry.trim}
        onSelectTrim={handleSelectTrim}
        onStartGame={handleStartGame}
        onResetDragStrip={handleResetDrag}
      />
    </main>
  );
}
