import * as THREE from 'three';
import { MaterialLibrary } from './materials';

export interface RocketRoadsterController {
  group: THREE.Group;
  chassisGroup: THREE.Group;
  update: (params: {
    dt: number;
    elapsed: number;
    speedMph: number;
    steerInput: number;
    braking: boolean;
    rearThrustActive: boolean;
    liftoffActive: boolean;
    rollActiveDir: number; // -1, 0, 1
    suctionActive: boolean;
    copvPsi: number;
  }) => void;
}

/**
 * Constructs the 12-part composite "Cyber-Aero" 2026 Rocket Roadster:
 * 1. SR-71 / F-35 sculpted aerodynamic wedge body in "Ano White" metallic aerospace finish
 * 2. Carbon-fiber front splitter, side ground-effect skirts & rear Venturi diffuser
 * 3. Single-seat cockpit tub + Steering Yoke + visible Red/Carbon 600L COPV tank on passenger side
 * 4. "Gold-Glazed" spacesuit-visor tinted canopy glass
 * 5. Hidden front cyan-white LED laser slits & continuous full-width glowing red rear taillight bar
 * 6. Dynamically animated Active Rear Wing (Flush low-drag, Raised downforce, 45° Airbrake)
 * 7. 4 Rear Cold-Gas Thruster Titanium Nozzles + Shock-Diamond Plumes
 * 8. 6 Perimeter / Underbody Cold-Gas Thruster Nozzles + Liftoff/Roll Plumes
 * 9. Underbody 20 kW Suction Vortex Ring & Dust Particle Emitter
 * 10. 4 Forged Turbine Aero Wheels with Steer-by-Wire & Ceramic Brake Calipers
 */
export function createRocketRoadster(mats: MaterialLibrary): RocketRoadsterController {
  const group = new THREE.Group();
  // Chassis group tilts/rolls/pitches slightly on suspension and kickflips
  const chassisGroup = new THREE.Group();
  group.add(chassisGroup);

  // Soft Ground Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(2.7, 5.4);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: mats.contactShadowTex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.02;
  group.add(contactShadow);

  // =========================================================================
  // PART 1: SR-71 / F-35 Sculpted Aerodynamic Wedge Body (ExtrudeGeometry)
  // =========================================================================
  const sideProfile = new THREE.Shape();
  // Z goes from -2.35 (front nose) to +2.35 (rear deck), Y from 0.16 to 0.92
  sideProfile.moveTo(-2.35, 0.22); // Sharp F-35 nose tip
  sideProfile.lineTo(-1.55, 0.54); // Front hood slope
  sideProfile.lineTo(-0.55, 0.66); // Base of windshield
  sideProfile.lineTo(0.85, 0.68);  // Rear deck spine
  sideProfile.lineTo(2.22, 0.72);  // High rear tail Kammback
  sideProfile.lineTo(2.32, 0.42);  // Rear thruster recess
  sideProfile.lineTo(2.15, 0.20);  // Lower diffuser exit
  sideProfile.lineTo(-2.15, 0.16); // Flat underbody suction tray
  sideProfile.closePath();

  const bodyExtrude = new THREE.ExtrudeGeometry(sideProfile, {
    steps: 2,
    depth: 1.56,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.14,
    bevelSegments: 4,
  });
  // Extrude is along +Z by default; rotate so profile X->Z (length) and depth->X (width)
  bodyExtrude.rotateY(Math.PI / 2);
  bodyExtrude.translate(-0.78, 0, 0);
  bodyExtrude.computeVertexNormals();

  const mainFuselage = new THREE.Mesh(bodyExtrude, mats.carBody);
  mainFuselage.castShadow = true;
  mainFuselage.receiveShadow = true;
  chassisGroup.add(mainFuselage);

  // Sculpted Wide Aero Fenders / Chines (SR-71 lateral chines)
  const chineGeo = new THREE.BoxGeometry(0.32, 0.24, 4.35);
  const leftChine = new THREE.Mesh(chineGeo, mats.carBody);
  leftChine.position.set(-0.92, 0.44, 0.02);
  leftChine.rotation.z = 0.14;
  leftChine.castShadow = true;

  const rightChine = new THREE.Mesh(chineGeo, mats.carBody);
  rightChine.position.set(0.92, 0.44, 0.02);
  rightChine.rotation.z = -0.14;
  rightChine.castShadow = true;
  chassisGroup.add(leftChine, rightChine);

  // Front Sculpted Nose Cone Wedge
  const noseGeo = new THREE.BoxGeometry(1.75, 0.16, 0.95);
  const noseMesh = new THREE.Mesh(noseGeo, mats.carBody);
  noseMesh.position.set(0, 0.30, -1.95);
  noseMesh.rotation.x = 0.18;
  chassisGroup.add(noseMesh);

  // =========================================================================
  // PART 2: Carbon-Fiber Lower Splitters, Side Skirts & Venturi Diffuser
  // =========================================================================
  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.05, 0.75), mats.carbonFiber);
  frontSplitter.position.set(0, 0.14, -2.12);
  chassisGroup.add(frontSplitter);

  // Side ground-effect carbon skirts (sealing the 2G vacuum suction plenum)
  const skirtGeo = new THREE.BoxGeometry(0.14, 0.12, 3.2);
  const leftSkirt = new THREE.Mesh(skirtGeo, mats.carbonFiber);
  leftSkirt.position.set(-1.04, 0.16, 0.0);
  const rightSkirt = new THREE.Mesh(skirtGeo, mats.carbonFiber);
  rightSkirt.position.set(1.04, 0.16, 0.0);
  chassisGroup.add(leftSkirt, rightSkirt);

  // Rear Venturi Diffuser + 4 Vertical Strakes
  const diffuserBase = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.18, 0.65), mats.carbonFiber);
  diffuserBase.position.set(0, 0.20, 2.12);
  diffuserBase.rotation.x = -0.18;
  chassisGroup.add(diffuserBase);

  for (const sx of [-0.75, -0.26, 0.26, 0.75]) {
    const strake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.65), mats.carbonFiber);
    strake.position.set(sx, 0.18, 2.15);
    chassisGroup.add(strake);
  }

  // =========================================================================
  // PART 3: Cockpit Tub, Yoke & Visible 600L COPV Compressed Air Tanks
  // =========================================================================
  const cockpitTub = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.28, 1.75), mats.carbonFiber);
  cockpitTub.position.set(0, 0.62, -0.05);
  chassisGroup.add(cockpitTub);

  // Driver Seat (Left side) + Steer-by-Wire Yoke
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.55), mats.titanium);
  driverSeat.position.set(-0.32, 0.76, 0.22);
  driverSeat.rotation.x = -0.25;
  chassisGroup.add(driverSeat);

  const steeringYoke = new THREE.Group();
  steeringYoke.position.set(-0.32, 0.82, -0.35);
  const yokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.04), mats.titanium);
  const yokeLeftGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), mats.carbonFiber);
  yokeLeftGrip.position.set(-0.14, 0.03, 0);
  const yokeRightGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), mats.carbonFiber);
  yokeRightGrip.position.set(0.14, 0.03, 0);
  steeringYoke.add(yokeBar, yokeLeftGrip, yokeRightGrip);
  chassisGroup.add(steeringYoke);

  // 600L COPV (Composite Overwrapped Pressure Vessel) Red/Carbon Tanks on Passenger Side!
  const copvGroup = new THREE.Group();
  copvGroup.position.set(0.30, 0.78, 0.05);
  const mainCopvCyl = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.82, 12, 24), mats.copvRedCarbon);
  mainCopvCyl.rotation.x = Math.PI / 2;
  const secondaryCopvCyl = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.72, 10, 20), mats.copvRedCarbon);
  secondaryCopvCyl.rotation.x = Math.PI / 2;
  secondaryCopvCyl.position.set(0.18, -0.04, 0.05);
  // Titanium high-pressure manifold straps & valve head
  for (const sz of [-0.28, 0.28]) {
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 20), mats.titanium);
    strap.rotation.x = Math.PI / 2;
    strap.position.z = sz;
    copvGroup.add(strap);
  }
  const manifoldPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 12), mats.titanium);
  manifoldPipe.rotation.x = Math.PI / 2;
  manifoldPipe.position.set(-0.06, 0.18, 0.25);
  copvGroup.add(mainCopvCyl, secondaryCopvCyl, manifoldPipe);
  chassisGroup.add(copvGroup);

  // =========================================================================
  // PART 4: "Gold-Glazed" Spacesuit-Visor Tinted Canopy Dome
  // =========================================================================
  const canopyGeo = new THREE.SphereGeometry(0.76, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52);
  canopyGeo.scale(0.92, 0.54, 1.55);
  const canopyMesh = new THREE.Mesh(canopyGeo, mats.goldCanopy);
  canopyMesh.position.set(0, 0.67, -0.02);
  canopyMesh.renderOrder = 2;
  chassisGroup.add(canopyMesh);

  // Titanium dorsal spine fin (F-35 / LMP1 aero stabilizer)
  const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 1.35), mats.titanium);
  dorsalFin.position.set(0, 0.90, 1.15);
  dorsalFin.rotation.x = -0.10;
  chassisGroup.add(dorsalFin);

  // =========================================================================
  // PART 5: Hidden Front LED Laser Slits & Full-Width Glowing Rear Taillight Bar
  // =========================================================================
  const leftHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.028, 0.08), mats.ledHeadlight);
  leftHeadlight.position.set(-0.68, 0.37, -2.30);
  leftHeadlight.rotation.y = 0.22;

  const rightHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.028, 0.08), mats.ledHeadlight);
  rightHeadlight.position.set(0.68, 0.37, -2.30);
  rightHeadlight.rotation.y = -0.22;
  chassisGroup.add(leftHeadlight, rightHeadlight);

  // Continuous Full-Width Glowing Red Rear Taillight Bar
  const taillightBarMesh = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.055, 0.08), mats.taillightBar);
  taillightBarMesh.position.set(0, 0.68, 2.34);
  chassisGroup.add(taillightBarMesh);

  // Lower Rear Brake Diffuser LED Strip
  const lowerTaillight = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.025, 0.06), mats.taillightBar);
  lowerTaillight.position.set(0, 0.35, 2.33);
  chassisGroup.add(lowerTaillight);

  // =========================================================================
  // PART 6: Dynamically Animated Active Rear Wing (Flush / Downforce / Airbrake)
  // =========================================================================
  const activeWingGroup = new THREE.Group();
  activeWingGroup.position.set(0, 0.72, 2.05);

  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.045, 0.42), mats.carbonFiber);
  const leftEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.48), mats.titanium);
  leftEndplate.position.set(-1.03, -0.02, 0);
  const rightEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.48), mats.titanium);
  rightEndplate.position.set(1.03, -0.02, 0);

  const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.14), mats.titanium);
  leftPylon.position.set(-0.52, -0.11, 0.05);
  const rightPylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.14), mats.titanium);
  rightPylon.position.set(0.52, -0.11, 0.05);

  activeWingGroup.add(wingBlade, leftEndplate, rightEndplate, leftPylon, rightPylon);
  chassisGroup.add(activeWingGroup);

  // =========================================================================
  // PART 7: 10 Cold-Gas Thruster Nozzles & Shock-Diamond Plumes
  // =========================================================================
  // Plume materials (outer cyan shock cone + inner white mach diamond core)
  const outerPlumeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#38bdf8'),
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const innerDiamondMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // 7A. 4 Rear Cold-Gas Thrusters (under the taillight bar)
  const rearPlumeGroups: THREE.Group[] = [];
  const rearNozzleX = [-0.62, -0.22, 0.22, 0.62];
  for (const nx of rearNozzleX) {
    // Titanium converging-diverging De Laval nozzle bell
    const nozzleBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.125, 0.22, 20, 1, true),
      mats.titanium
    );
    nozzleBell.rotation.x = Math.PI / 2;
    nozzleBell.position.set(nx, 0.52, 2.30);
    chassisGroup.add(nozzleBell);

    // Inner glowing throat
    const throat = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 16),
      new THREE.MeshBasicMaterial({ color: '#7dd3fc' })
    );
    throat.position.set(nx, 0.52, 2.32);
    chassisGroup.add(throat);

    // Shock-diamond plume assembly
    const plumeGroup = new THREE.Group();
    plumeGroup.position.set(nx, 0.52, 2.38);

    const outerCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.8, 16, 1, true), outerPlumeMat);
    outerCone.rotation.x = -Math.PI / 2;
    outerCone.position.z = 1.4;

    const innerCone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.8, 12), innerDiamondMat);
    innerCone.rotation.x = -Math.PI / 2;
    innerCone.position.z = 0.9;

    // 3 distinct Mach shock diamonds along the supersonic jet
    for (let d = 0; d < 3; d++) {
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.075 - d * 0.015, 0), innerDiamondMat);
      diamond.scale.set(1, 1, 2.2);
      diamond.position.z = 0.45 + d * 0.62;
      plumeGroup.add(diamond);
    }

    plumeGroup.add(outerCone, innerCone);
    plumeGroup.visible = false;
    chassisGroup.add(plumeGroup);
    rearPlumeGroups.push(plumeGroup);
  }

  // 7B. 6 Perimeter / Underbody Cold-Gas Thrusters (for Liftoff / Hover / Mid-Air Kickflips)
  const liftoffPlumeGroups: THREE.Group[] = [];
  const perimeterPositions: Array<{ x: number; y: number; z: number; tiltX: number; tiltZ: number }> = [
    { x: -0.82, y: 0.22, z: -1.35, tiltX: 0, tiltZ: -0.15 }, // Front-Left Downward
    { x: 0.82, y: 0.22, z: -1.35, tiltX: 0, tiltZ: 0.15 },   // Front-Right Downward
    { x: -0.88, y: 0.24, z: 0.0, tiltX: 0, tiltZ: -0.35 },   // Mid-Left Lateral/Vertical
    { x: 0.88, y: 0.24, z: 0.0, tiltX: 0, tiltZ: 0.35 },     // Mid-Right Lateral/Vertical
    { x: -0.82, y: 0.22, z: 1.35, tiltX: 0, tiltZ: -0.15 },  // Rear-Left Downward
    { x: 0.82, y: 0.22, z: 1.35, tiltX: 0, tiltZ: 0.15 },    // Rear-Right Downward
  ];

  for (const p of perimeterPositions) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.12, 14), mats.titanium);
    nozzle.position.set(p.x, p.y, p.z);
    chassisGroup.add(nozzle);

    const pGroup = new THREE.Group();
    pGroup.position.set(p.x, p.y - 0.05, p.z);
    pGroup.rotation.set(p.tiltX, 0, p.tiltZ);

    const downCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.65, 12, 1, true), outerPlumeMat);
    downCone.rotation.x = Math.PI; // Pointing downward (-Y)
    downCone.position.y = -0.82;

    const downCore = new THREE.Mesh(new THREE.ConeGeometry(0.075, 1.0, 10), innerDiamondMat);
    downCore.rotation.x = Math.PI;
    downCore.position.y = -0.5;

    pGroup.add(downCone, downCore);
    pGroup.visible = false;
    chassisGroup.add(pGroup);
    liftoffPlumeGroups.push(pGroup);
  }

  // =========================================================================
  // PART 8: Underbody 20 kW Vacuum Suction Vortex Ring
  // =========================================================================
  const suctionGroup = new THREE.Group();
  suctionGroup.position.set(0, 0.06, 0);

  const vortexMat1 = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#06b6d4'),
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const vortexMat2 = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e0f2fe'),
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const outerSuctionRing = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.035, 12, 48), vortexMat1);
  outerSuctionRing.rotation.x = Math.PI / 2;
  outerSuctionRing.scale.set(1.0, 1.65, 1.0);

  const innerSuctionRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.025, 10, 40), vortexMat2);
  innerSuctionRing.rotation.x = Math.PI / 2;
  innerSuctionRing.scale.set(1.0, 1.55, 1.0);

  // Suction dust/air streamlines (16 radial blades spinning fast)
  const suctionBladesGroup = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.015, 0.04), vortexMat2);
    blade.position.set(Math.cos(angle) * 0.95, 0.02, Math.sin(angle) * 1.45);
    blade.rotation.y = -angle + 0.4;
    suctionBladesGroup.add(blade);
  }

  suctionGroup.add(outerSuctionRing, innerSuctionRing, suctionBladesGroup);
  suctionGroup.visible = false;
  chassisGroup.add(suctionGroup);

  // =========================================================================
  // PART 9: 4 Forged Aero Turbine Wheels
  // =========================================================================
  const wheelGroups: THREE.Group[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  const wheelOffsets = [
    { x: -0.96, y: 0.34, z: -1.42, isFront: true },
    { x: 0.96, y: 0.34, z: -1.42, isFront: true },
    { x: -1.00, y: 0.36, z: 1.40, isFront: false },
    { x: 1.00, y: 0.36, z: 1.40, isFront: false },
  ];

  for (const w of wheelOffsets) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(w.x, w.y, w.z);
    chassisGroup.add(steerPivot);
    if (w.isFront) frontWheelPivots.push(steerPivot);

    const spinGroup = new THREE.Group();
    steerPivot.add(spinGroup);
    wheelGroups.push(spinGroup);

    const radius = w.isFront ? 0.34 : 0.36;
    const width = w.isFront ? 0.28 : 0.34;

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), mats.tireRubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width + 0.015, 18),
      mats.titanium
    );
    rim.rotation.z = Math.PI / 2;

    const aeroDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.025, 12),
      mats.carbonFiber
    );
    aeroDisc.rotation.z = Math.PI / 2;

    const centerLock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, width + 0.04, 12),
      mats.copvRedCarbon
    );
    centerLock.rotation.z = Math.PI / 2;

    spinGroup.add(tire, rim, aeroDisc, centerLock);
  }

  // Internal animation state
  let currentWingY = 0.72;
  let currentWingPitch = 0.0;

  const update = (params: {
    dt: number;
    elapsed: number;
    speedMph: number;
    steerInput: number;
    braking: boolean;
    rearThrustActive: boolean;
    liftoffActive: boolean;
    rollActiveDir: number;
    suctionActive: boolean;
    copvPsi: number;
  }) => {
    const { dt, elapsed, speedMph, steerInput, braking, rearThrustActive, liftoffActive, rollActiveDir, suctionActive } =
      params;

    // 1. Wheel rotation & front Steer-by-Wire angle
    const metersPerSec = speedMph * 0.44704;
    const wheelSpinDelta = (metersPerSec * dt) / 0.35;
    for (const wg of wheelGroups) {
      wg.rotation.x -= wheelSpinDelta;
    }
    const targetSteerAngle = -steerInput * 0.38;
    for (const fp of frontWheelPivots) {
      fp.rotation.y = THREE.MathUtils.damp(fp.rotation.y, targetSteerAngle, 14, dt);
    }

    // 2. Active Rear Wing Choreography
    // - Braking -> Airbrake mode (high height + steep 45 deg pitch forward)
    // - Rear Thrust or > 240 mph -> Flush Low-Drag mode
    // - Mid-speed (70 - 240 mph) -> Raised High-Downforce mode
    let targetWingY = 0.73;
    let targetWingPitch = 0.04;

    if (braking && speedMph > 25) {
      targetWingY = 0.90;
      targetWingPitch = 0.72; // Steep Airbrake tilt!
    } else if (rearThrustActive || speedMph > 240) {
      targetWingY = 0.72;
      targetWingPitch = -0.03; // Flush low-drag
    } else if (speedMph > 70) {
      targetWingY = 0.85;
      targetWingPitch = 0.18; // Mid-speed downforce
    }

    currentWingY = THREE.MathUtils.damp(currentWingY, targetWingY, 10, dt);
    currentWingPitch = THREE.MathUtils.damp(currentWingPitch, targetWingPitch, 10, dt);
    activeWingGroup.position.y = currentWingY;
    activeWingGroup.rotation.x = currentWingPitch;

    // 3. Brake / Taillight Glow Modulation
    mats.taillightBar.emissiveIntensity = braking ? 7.5 : rearThrustActive ? 5.0 : 3.0;

    // 4. 4 Rear Cold-Gas Thruster Plumes
    for (let i = 0; i < rearPlumeGroups.length; i++) {
      const pg = rearPlumeGroups[i];
      pg.visible = rearThrustActive;
      if (rearThrustActive) {
        const flicker = 0.88 + Math.sin(elapsed * 85 + i * 2.1) * 0.18;
        pg.scale.set(flicker, flicker, 0.9 + Math.cos(elapsed * 110 + i) * 0.25);
      }
    }

    // 5. 6 Perimeter / Liftoff / Roll Cold-Gas Thruster Plumes
    for (let i = 0; i < liftoffPlumeGroups.length; i++) {
      const lg = liftoffPlumeGroups[i];
      const isLeft = i % 2 === 0;
      const activeForRoll = (rollActiveDir > 0 && isLeft) || (rollActiveDir < 0 && !isLeft);
      const showNozzle = liftoffActive || activeForRoll;
      lg.visible = showNozzle;
      if (showNozzle) {
        const pulse = 0.85 + Math.sin(elapsed * 95 + i * 1.7) * 0.2;
        lg.scale.set(pulse, 0.9 + Math.sin(elapsed * 120 + i) * 0.22, pulse);
      }
    }

    // 6. Underbody 20 kW Suction Vortex Animation
    suctionGroup.visible = suctionActive;
    if (suctionActive) {
      suctionBladesGroup.rotation.y += dt * 18.0;
      const ringScale = 0.97 + Math.sin(elapsed * 24) * 0.04;
      outerSuctionRing.scale.set(ringScale, ringScale * 1.65, 1.0);
    }
  };

  return {
    group,
    chassisGroup,
    update,
  };
}
