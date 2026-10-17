import * as THREE from 'three';
import { MaterialLibrary } from './materials';
import { StuntEvent } from '../types/game';

export interface TrafficVehicle {
  group: THREE.Group;
  type: 'sedan' | 'cybertruck' | 'semi';
  laneIndex: number; // 0..5
  x: number;
  z: number; // Relative to player Z (negative = ahead of player)
  speedMph: number;
  length: number;
  width: number;
  height: number;
  passedByPlayer: boolean;
}

export interface MegachargerZone {
  mesh: THREE.Mesh;
  laneIndex: number;
  x: number;
  z: number; // Relative to player Z
  length: number;
}

export interface HighwayWorldController {
  group: THREE.Group;
  update: (params: {
    dt: number;
    elapsed: number;
    playerZ: number; // Total distance traveled forward (meters)
    playerX: number; // World X
    playerY: number; // World Y
    speedMph: number;
    isAirborne: boolean;
    altitudeMeters: number;
    isInverted: boolean;
    tunnelAngleDeg: number;
    rearThrustActive: boolean;
    onStunt: (stunt: Omit<StuntEvent, 'id'>) => void;
    onCollision: () => void;
  }) => {
    inTunnel: boolean;
    nextTunnelMeters: number;
    megacharging: boolean;
  };
  resetTrafficForDrag: () => void;
  warpToTunnelEntrance: (currentPlayerZ: number) => number;
}

export const LANE_X = [-10, -6, -2, 2, 6, 10];
export const TUNNEL_PERIOD = 1800; // Every 1,800 meters
export const TUNNEL_START_OFFSET = 500; // First tunnel starts at 500m
export const TUNNEL_LENGTH = 850; // 850m long cylindrical tunnel
export const TUNNEL_RADIUS = 12.0; // 24m diameter matches 24m highway width

export function createHighwayWorld(mats: MaterialLibrary): HighwayWorldController {
  const group = new THREE.Group();

  // =========================================================================
  // 1. Infinite 6-Lane Highway Surface & Ground Terrain
  // =========================================================================
  const roadLength = 1400;
  const roadGeo = new THREE.PlaneGeometry(24, roadLength, 1, 1);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMesh = new THREE.Mesh(roadGeo, mats.highwayRoad);
  roadMesh.position.set(0, 0, -roadLength * 0.38);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Extended Outer Desert/Aerospace Proving Ground Floor
  const terrainGeo = new THREE.PlaneGeometry(1600, roadLength, 1, 1);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0c1018'),
    roughness: 0.92,
    metalness: 0.05,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(0, -0.06, -roadLength * 0.38);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Side Highway Guardrails & Glowing Edge Strips
  const barrierMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1e293b'),
    metalness: 0.65,
    roughness: 0.35,
  });
  const leftBarrier = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, roadLength), barrierMat);
  leftBarrier.position.set(-12.25, 0.375, -roadLength * 0.38);
  const rightBarrier = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, roadLength), barrierMat);
  rightBarrier.position.set(12.25, 0.375, -roadLength * 0.38);
  group.add(leftBarrier, rightBarrier);

  // =========================================================================
  // 2. Instanced Distant Mesa / Rock Outcrops & Roadside Gantry Pylons
  // =========================================================================
  const rockCount = 80;
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1a2232'),
    roughness: 0.88,
    metalness: 0.1,
  });
  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInstanced.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const rockOffsets: Array<{ x: number; zOffset: number; sx: number; sy: number; sz: number; ry: number }> = [];
  for (let i = 0; i < rockCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (32 + Math.random() * 240);
    const zOffset = -Math.random() * 1100;
    const sx = 6 + Math.random() * 22;
    const sy = 4 + Math.random() * 28;
    const sz = 8 + Math.random() * 24;
    const ry = Math.random() * Math.PI;
    rockOffsets.push({ x, zOffset, sx, sy, sz, ry });

    dummy.position.set(x, sy * 0.35, zOffset);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(i, dummy.matrix);
    rockInstanced.setColorAt(
      i,
      new THREE.Color().setHSL(0.6 + (Math.random() - 0.5) * 0.05, 0.25, 0.12 + Math.random() * 0.08)
    );
  }
  rockInstanced.instanceMatrix.needsUpdate = true;
  if (rockInstanced.instanceColor) rockInstanced.instanceColor.needsUpdate = true;
  group.add(rockInstanced);

  // Overhead Highway Speed Gantries (Pool of 8 spaced every 150m)
  const gantryGroups: THREE.Group[] = [];
  const gantryGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#38bdf8') });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 0.5), barrierMat);
    leftPost.position.set(-12.6, 4.75, 0);
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 0.5), barrierMat);
    rightPost.position.set(12.6, 4.75, 0);
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(25.8, 0.65, 0.65), barrierMat);
    crossBeam.position.set(0, 9.2, 0);
    const ledSign = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.18, 0.72), gantryGlowMat);
    ledSign.position.set(0, 9.0, 0);
    g.add(leftPost, rightPost, crossBeam, ledSign);
    g.position.z = -i * 150;
    group.add(g);
    gantryGroups.push(g);
  }

  // =========================================================================
  // 3. Cylindrical Inverted Highway Tunnel Assembly
  // =========================================================================
  const tunnelGroup = new THREE.Group();
  group.add(tunnelGroup);

  // Outer Cylindrical Glass & Concrete Shell (openEnded = true, radius = 12m, centered at Y = 0)
  // Note: With radius = 12m centered at (0, 0), the bottom of the cylinder would be at Y = -12m if not Careful.
  // Actually, let's think carefully about the tunnel geometry!
  // If the road is flat at Y = 0 and spans X = [-12, +12], and we want the player to drive smoothly from the road onto the curved side walls and upside down onto the ceiling:
  // If the cylinder has radius R = 12m and its axis is at (X = 0, Y = 12m):
  // - At angle theta = 0 (bottom of cylinder): X = 0, Y = 12 - 12*cos(0) = 0!
  // - Wait: at Y = 0, a circle of radius 12m centered at (0, 12) touches Y = 0 at X = 0 and curves upward to (X = ±12, Y = 12) at theta = ±90°, and reaches the top ceiling (X = 0, Y = 24) at theta = 180°!
  // OR even better: a wide stadium/cylindrical tunnel where the flat road is at Y = 0 for the normal AI traffic, and the upper semi-cylinder + curved side transition ramps form a seamless 360-degree aerodynamic tube of radius R = 12m centered at (0, 12m)!
  // Let's build BOTH the visual curved wall transition ramps on the sides AND the full cylindrical rib cage centered at (0, TUNNEL_RADIUS) so when the car drives up the wall with Suction Mode (F), it hugs the cylindrical tunnel shell all the way to the ceiling at Y = 23.2m!

  const cylinderShellGeo = new THREE.CylinderGeometry(
    TUNNEL_RADIUS,
    TUNNEL_RADIUS,
    TUNNEL_LENGTH,
    48,
    1,
    true,
    -Math.PI * 0.82,
    Math.PI * 1.64
  );
  cylinderShellGeo.rotateX(Math.PI / 2);
  // Rotate so the open slot is at the very bottom (hugging the highway road)
  cylinderShellGeo.rotateZ(Math.PI);
  const cylinderShellMesh = new THREE.Mesh(cylinderShellGeo, mats.tunnelWallGlass);
  cylinderShellMesh.position.set(0, TUNNEL_RADIUS, -TUNNEL_LENGTH / 2);
  tunnelGroup.add(cylinderShellMesh);

  // Curved Side Wall Entry Ramps along the tunnel (visual guide on left & right walls)
  const wallRampMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#162032'),
    metalness: 0.4,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const wallArcGeo = new THREE.CylinderGeometry(
    TUNNEL_RADIUS - 0.05,
    TUNNEL_RADIUS - 0.05,
    TUNNEL_LENGTH,
    48,
    1,
    true
  );
  wallArcGeo.rotateX(Math.PI / 2);
  const tunnelTrackMesh = new THREE.Mesh(
    wallArcGeo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#131b2e'),
      roughness: 0.5,
      metalness: 0.3,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    })
  );
  tunnelTrackMesh.position.set(0, TUNNEL_RADIUS, -TUNNEL_LENGTH / 2);
  tunnelGroup.add(tunnelTrackMesh);

  // Structural Concrete/Titanium Ribs + Ceiling Neon Strips every 35m inside the tunnel
  const ribGeo = new THREE.TorusGeometry(TUNNEL_RADIUS + 0.15, 0.32, 10, 48, Math.PI * 1.65);
  ribGeo.rotateZ(-Math.PI * 0.325);
  const ceilingStripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#06b6d4') });
  const amberWallStripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f59e0b') });

  for (let z = 0; z >= -TUNNEL_LENGTH; z -= 35) {
    const rib = new THREE.Mesh(ribGeo, wallRampMat);
    rib.position.set(0, TUNNEL_RADIUS, z);
    tunnelGroup.add(rib);

    // Glowing cyan ceiling track guide (at the top of the tunnel for inverted driving!)
    const ceilingLight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 22), ceilingStripMat);
    ceilingLight.position.set(0, TUNNEL_RADIUS * 2 - 0.2, z - 17);
    tunnelGroup.add(ceilingLight);

    // Left & Right 90-degree wall guide strips
    const leftWallLight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 22), amberWallStripMat);
    leftWallLight.position.set(-TUNNEL_RADIUS + 0.2, TUNNEL_RADIUS, z - 17);
    const rightWallLight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 22), amberWallStripMat);
    rightWallLight.position.set(TUNNEL_RADIUS - 0.2, TUNNEL_RADIUS, z - 17);
    tunnelGroup.add(leftWallLight, rightWallLight);
  }

  // =========================================================================
  // 4. 1 MW Megacharger Lanes (Blue Induction Strips)
  // =========================================================================
  const megachargerZones: MegachargerZone[] = [];
  const mcLength = 120;
  const mcGeo = new THREE.PlaneGeometry(3.4, mcLength);
  mcGeo.rotateX(-Math.PI / 2);

  for (let i = 0; i < 3; i++) {
    const laneIdx = (i * 2 + 1) % 6;
    const mesh = new THREE.Mesh(mcGeo, mats.megachargerStrip);
    const z = -220 - i * 420;
    mesh.position.set(LANE_X[laneIdx], 0.03, z);
    group.add(mesh);
    megachargerZones.push({
      mesh,
      laneIndex: laneIdx,
      x: LANE_X[laneIdx],
      z,
      length: mcLength,
    });
  }

  // =========================================================================
  // 5. Multi-Part Procedural AI Traffic Vehicles (Sedans, Cyber-Trucks, Semis)
  // =========================================================================
  const trafficList: TrafficVehicle[] = [];
  const trafficCount = 16;

  const trafficHeadlightMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const trafficTaillightMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });

  function buildTrafficMesh(type: 'sedan' | 'cybertruck' | 'semi', index: number): {
    group: THREE.Group;
    length: number;
    width: number;
    height: number;
  } {
    const vGroup = new THREE.Group();
    const palette = ['#334155', '#475569', '#1e293b', '#0f172a', '#3f3f46', '#1d4ed8'];
    const bodyColor = palette[index % palette.length];
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyColor),
      metalness: type === 'cybertruck' ? 0.85 : 0.55,
      roughness: type === 'cybertruck' ? 0.25 : 0.35,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#090d16'),
      metalness: 0.8,
      roughness: 0.15,
    });

    if (type === 'sedan') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.65, 4.5), bodyMat);
      hull.position.y = 0.52;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.52, 2.3), glassMat);
      cabin.position.set(0, 1.02, 0.15);
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 0.08), trafficTaillightMat);
      tailBar.position.set(0, 0.64, 2.26);
      const headBar = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.08), trafficHeadlightMat);
      headBar.position.set(0, 0.55, -2.26);
      vGroup.add(hull, cabin, tailBar, headBar);
      return { group: vGroup, length: 4.6, width: 2.0, height: 1.4 };
    } else if (type === 'cybertruck') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.85, 5.6), bodyMat);
      bed.position.y = 0.68;
      const wedgeRoof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 3.6, 4), bodyMat);
      wedgeRoof.rotation.y = Math.PI / 4;
      wedgeRoof.scale.set(1.0, 0.45, 1.5);
      wedgeRoof.position.set(0, 1.35, -0.15);
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.09, 0.08), trafficTaillightMat);
      tailBar.position.set(0, 0.96, 2.81);
      const headBar = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.07, 0.08), trafficHeadlightMat);
      headBar.position.set(0, 0.88, -2.81);
      vGroup.add(bed, wedgeRoof, tailBar, headBar);
      return { group: vGroup, length: 5.7, width: 2.2, height: 1.85 };
    } else {
      // Heavy Aero Semi-Transport
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.8, 3.4), bodyMat);
      cab.position.set(0, 1.65, -4.4);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.95, 0.2), glassMat);
      windshield.position.set(0, 2.3, -6.05);
      const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.55, 3.1, 9.2), bodyMat);
      trailer.position.set(0, 1.9, 2.1);
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.1), trafficTaillightMat);
      tailBar.position.set(0, 0.75, 6.72);
      vGroup.add(cab, windshield, trailer, tailBar);
      return { group: vGroup, length: 12.8, width: 2.6, height: 3.5 };
    }
  }

  for (let i = 0; i < trafficCount; i++) {
    const types: Array<'sedan' | 'cybertruck' | 'semi'> = ['sedan', 'cybertruck', 'sedan', 'semi'];
    const type = types[i % types.length];
    const built = buildTrafficMesh(type, i);
    const laneIndex = i % 6;
    const z = -85 - i * 68 - Math.random() * 25;
    const speedMph = type === 'semi' ? 65 + (i % 3) * 8 : 80 + (i % 5) * 12;

    built.group.position.set(LANE_X[laneIndex], 0, z);
    group.add(built.group);

    trafficList.push({
      group: built.group,
      type,
      laneIndex,
      x: LANE_X[laneIndex],
      z,
      speedMph,
      length: built.length,
      width: built.width,
      height: built.height,
      passedByPlayer: false,
    });
  }

  // =========================================================================
  // 6. Supersonic Motion Blur / Cold-Gas Shock Lines around Viewport
  // =========================================================================
  const speedLinesCount = 48;
  const speedLinesGeo = new THREE.BufferGeometry();
  const linePositions = new Float32Array(speedLinesCount * 6);
  for (let i = 0; i < speedLinesCount; i++) {
    const angle = (i / speedLinesCount) * Math.PI * 2;
    const rad = 3.5 + (i % 4) * 1.8;
    const lx = Math.cos(angle) * rad;
    const ly = Math.max(0.5, 1.8 + Math.sin(angle) * rad * 0.65);
    const lz = -(Math.random() * 45);
    linePositions[i * 6 + 0] = lx;
    linePositions[i * 6 + 1] = ly;
    linePositions[i * 6 + 2] = lz;
    linePositions[i * 6 + 3] = lx;
    linePositions[i * 6 + 4] = ly;
    linePositions[i * 6 + 5] = lz - 9.5;
  }
  speedLinesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const speedLinesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#7dd3fc'),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
  });
  const speedLinesMesh = new THREE.LineSegments(speedLinesGeo, speedLinesMat);
  group.add(speedLinesMesh);

  let collisionCooldown = 0;

  const update = (params: {
    dt: number;
    elapsed: number;
    playerZ: number;
    playerX: number;
    playerY: number;
    speedMph: number;
    isAirborne: boolean;
    altitudeMeters: number;
    isInverted: boolean;
    tunnelAngleDeg: number;
    rearThrustActive: boolean;
    onStunt: (stunt: Omit<StuntEvent, 'id'>) => void;
    onCollision: () => void;
  }) => {
    const {
      dt,
      playerZ,
      playerX,
      speedMph,
      isAirborne,
      altitudeMeters,
      isInverted,
      tunnelAngleDeg,
      rearThrustActive,
      onStunt,
      onCollision,
    } = params;

    if (collisionCooldown > 0) collisionCooldown -= dt;

    const playerMetersPerSec = speedMph * 0.44704;

    // 1. Scroll Highway Road Texture seamlessly
    if (mats.highwayRoad.map) {
      mats.highwayRoad.map.offset.y = -(playerZ * 0.045) % 1;
    }

    // 2. Update Overhead Gantries
    for (let i = 0; i < gantryGroups.length; i++) {
      const g = gantryGroups[i];
      g.position.z += playerMetersPerSec * dt;
      if (g.position.z > 40) {
        g.position.z -= 8 * 150;
      }
    }

    // 3. Update Instanced Rocks
    for (let i = 0; i < rockCount; i++) {
      const ro = rockOffsets[i];
      ro.zOffset += playerMetersPerSec * dt;
      if (ro.zOffset > 80) {
        ro.zOffset -= 1100;
      }
      dummy.position.set(ro.x, ro.sy * 0.35, ro.zOffset);
      dummy.rotation.set(0, ro.ry, 0);
      dummy.scale.set(ro.sx, ro.sy, ro.sz);
      dummy.updateMatrix();
      rockInstanced.setMatrixAt(i, dummy.matrix);
    }
    rockInstanced.instanceMatrix.needsUpdate = true;

    // 4. Cylindrical Inverted Tunnel Positioning
    // Cycle position in [0, TUNNEL_PERIOD)
    const cycleDist = (playerZ + (TUNNEL_PERIOD - TUNNEL_START_OFFSET)) % TUNNEL_PERIOD;
    // Tunnel entrance is at cycleDist == 0, exit at cycleDist == TUNNEL_LENGTH
    // Relative to player (where negative Z is ahead of the car):
    // Entrance Z relative to player = cycleDist (positive when behind player, negative when ahead)
    let entranceRelZ = cycleDist;
    if (entranceRelZ > TUNNEL_LENGTH + 120) {
      entranceRelZ -= TUNNEL_PERIOD;
    }
    tunnelGroup.position.z = entranceRelZ;

    const inTunnel = entranceRelZ >= -4 && entranceRelZ <= TUNNEL_LENGTH + 4;
    const nextTunnelMeters = inTunnel ? 0 : Math.max(0, Math.round(-entranceRelZ));

    // 5. Update 1 MW Megacharger Lanes
    let megacharging = false;
    for (const mc of megachargerZones) {
      mc.z += playerMetersPerSec * dt;
      if (mc.z > 120) {
        mc.z -= 1260;
        mc.laneIndex = (mc.laneIndex + 2) % 6;
        mc.x = LANE_X[mc.laneIndex];
      }
      mc.mesh.position.set(mc.x, 0.03, mc.z);

      // Check if player is driving over the Megacharger strip on the highway floor
      if (
        !isAirborne &&
        Math.abs(tunnelAngleDeg) < 20 &&
        Math.abs(playerX - mc.x) < 2.2 &&
        Math.abs(mc.z) < mc.length * 0.52
      ) {
        megacharging = true;
      }
    }

    // 6. Update Dynamic AI Traffic & Detect Overtake Stunts
    for (const tv of trafficList) {
      const relSpeedMps = (speedMph - tv.speedMph) * 0.44704;
      tv.z += relSpeedMps * dt;

      // Recycle vehicle ahead or behind
      if (tv.z > 65) {
        tv.z = -780 - Math.random() * 280;
        tv.laneIndex = Math.floor(Math.random() * 6);
        tv.x = LANE_X[tv.laneIndex];
        tv.passedByPlayer = false;
      } else if (tv.z < -1150) {
        tv.z = -80 - Math.random() * 120;
        tv.passedByPlayer = false;
      }

      tv.group.position.set(tv.x, 0, tv.z);

      // Check overtake & collision events when vehicle crosses player Z (z = 0)
      const dx = Math.abs(playerX - tv.x);
      const dz = Math.abs(tv.z);
      const halfLen = tv.length * 0.5 + 2.2;
      const halfWid = tv.width * 0.5 + 0.95;

      // Stunt detection right as the player passes the vehicle
      if (!tv.passedByPlayer && tv.z > 1.5 && tv.z < 28) {
        tv.passedByPlayer = true;

        if (isInverted || Math.abs(tunnelAngleDeg) > 105) {
          onStunt({
            label: 'TUNNEL CEILING PASS',
            points: 2500,
            detail: `Inverted 180° at ${Math.round(speedMph)} MPH`,
            color: 'amber',
          });
        } else if (isAirborne && altitudeMeters > 1.6 && dx < 3.6) {
          onStunt({
            label: 'AERIAL LEAPFROG',
            points: 2000,
            detail: `Cold-Gas Flight Over ${tv.type.toUpperCase()}`,
            color: 'cyan',
          });
        } else if (dx < 3.8 && speedMph > 300) {
          onStunt({
            label: 'MACH 0.4+ SUPERSONIC PASS',
            points: 1200,
            detail: `${Math.round(speedMph)} MPH High-Velocity Overtake`,
            color: 'emerald',
          });
        } else if (dx < 3.5 && speedMph > 100) {
          onStunt({
            label: 'HIGH-SPEED NEAR MISS',
            points: 600,
            detail: `Precision Steer-by-Wire Clearance`,
            color: 'cyan',
          });
        }
      }

      // Ground collision check (only if not flying above vehicle height and not high on tunnel wall/ceiling)
      if (
        collisionCooldown <= 0 &&
        Math.abs(tunnelAngleDeg) < 25 &&
        altitudeMeters < tv.height + 0.2 &&
        dz < halfLen * 0.82 &&
        dx < halfWid * 0.85
      ) {
        collisionCooldown = 0.85;
        tv.passedByPlayer = true;
        // Push traffic vehicle slightly forward/aside so player doesn't get stuck
        tv.z -= 14;
        onCollision();
      }
    }

    // 7. Update Supersonic Motion Blur Lines
    const showLines = rearThrustActive || speedMph > 210;
    const targetLineOpacity = rearThrustActive
      ? 0.55
      : speedMph > 210
      ? Math.min(0.45, (speedMph - 210) / 220)
      : 0.0;
    speedLinesMat.opacity = THREE.MathUtils.damp(speedLinesMat.opacity, targetLineOpacity, 8, dt);

    if (showLines) {
      const posAttr = speedLinesGeo.attributes.position as THREE.BufferAttribute;
      const moveZ = Math.max(40, playerMetersPerSec * 1.35) * dt;
      for (let i = 0; i < speedLinesCount; i++) {
        let z0 = posAttr.getZ(i * 2) + moveZ;
        if (z0 > 8) {
          z0 = -45 - Math.random() * 15;
        }
        posAttr.setZ(i * 2, z0);
        posAttr.setZ(i * 2 + 1, z0 - (rearThrustActive ? 13 : 8));
      }
      posAttr.needsUpdate = true;
    }

    return {
      inTunnel,
      nextTunnelMeters,
      megacharging,
    };
  };

  const resetTrafficForDrag = () => {
    // Clear inner lanes for an unobstructed 1/4 mile drag test
    for (let i = 0; i < trafficList.length; i++) {
      const tv = trafficList[i];
      tv.laneIndex = i % 2 === 0 ? 0 : 5; // Move traffic to outermost lanes
      tv.x = LANE_X[tv.laneIndex];
      tv.z = -350 - i * 85;
      tv.passedByPlayer = false;
      tv.group.position.set(tv.x, 0, tv.z);
    }
  };

  const warpToTunnelEntrance = (currentPlayerZ: number): number => {
    // Return a new playerZ right at the entrance of a tunnel (TUNNEL_START_OFFSET - 40)
    const k = Math.ceil(currentPlayerZ / TUNNEL_PERIOD);
    return k * TUNNEL_PERIOD + TUNNEL_START_OFFSET - 35;
  };

  return {
    group,
    update,
    resetTrafficForDrag,
    warpToTunnelEntrance,
  };
}
