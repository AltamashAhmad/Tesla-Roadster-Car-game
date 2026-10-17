import * as THREE from 'three';
import { CarFinish } from '../types/game';

export interface MaterialLibrary {
  carBody: THREE.MeshPhysicalMaterial;
  carbonFiber: THREE.MeshPhysicalMaterial;
  titanium: THREE.MeshPhysicalMaterial;
  goldCanopy: THREE.MeshPhysicalMaterial;
  copvRedCarbon: THREE.MeshPhysicalMaterial;
  ledHeadlight: THREE.MeshStandardMaterial;
  taillightBar: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  highwayRoad: THREE.MeshStandardMaterial;
  tunnelWallGlass: THREE.MeshPhysicalMaterial;
  megachargerStrip: THREE.MeshStandardMaterial;
  contactShadowTex: THREE.CanvasTexture;
  setCarFinish: (finish: CarFinish) => void;
  dispose: () => void;
}

export function createMaterialLibrary(maxAnisotropy: number): MaterialLibrary {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  // 1. Carbon Fiber Weave Procedural CanvasTexture
  const cfCanvas = document.createElement('canvas');
  cfCanvas.width = 128;
  cfCanvas.height = 128;
  const cfCtx = cfCanvas.getContext('2d')!;
  cfCtx.fillStyle = '#11141a';
  cfCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const isAlt = ((x + y) / 8) % 2 === 0;
      cfCtx.fillStyle = isAlt ? '#1e2430' : '#0b0e13';
      cfCtx.fillRect(x, y, 7, 7);
      cfCtx.fillStyle = isAlt ? '#283040' : '#151922';
      cfCtx.fillRect(x + 1, y + 1, 5, 2);
    }
  }
  const carbonTex = new THREE.CanvasTexture(cfCanvas);
  carbonTex.wrapS = THREE.RepeatWrapping;
  carbonTex.wrapT = THREE.RepeatWrapping;
  carbonTex.repeat.set(16, 16);
  carbonTex.colorSpace = THREE.SRGBColorSpace;
  carbonTex.anisotropy = maxAnisotropy;
  textures.push(carbonTex);

  // 2. 6-Lane Futuristic Highway Asphalt Texture with Glowing Lane Dividers
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 1024;
  roadCanvas.height = 1024;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = '#10141d';
  rCtx.fillRect(0, 0, 1024, 1024);

  // Fine asphalt aggregate noise
  for (let i = 0; i < 18000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    const shade = 14 + Math.floor(Math.random() * 18);
    rCtx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 9})`;
    rCtx.fillRect(rx, ry, 2, 3);
  }

  // Subtle tire wear tracks in the 6 lanes
  for (let lane = 0; lane < 6; lane++) {
    const laneCenterX = ((lane + 0.5) / 6) * 1024;
    const grad = rCtx.createLinearGradient(laneCenterX - 60, 0, laneCenterX + 60, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(5, 8, 14, 0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    rCtx.fillStyle = grad;
    rCtx.fillRect(laneCenterX - 60, 0, 120, 1024);
  }

  // Outer shoulder solid lines (amber/white)
  rCtx.fillStyle = '#38bdf8';
  rCtx.fillRect(14, 0, 8, 1024);
  rCtx.fillRect(1002, 0, 8, 1024);

  // 5 internal lane dividers (dashed glowing cyan-white + twin center amber divider)
  for (let i = 1; i < 6; i++) {
    const x = Math.round((i / 6) * 1024);
    if (i === 3) {
      // Center divider between left 3 and right 3 lanes
      rCtx.fillStyle = '#f59e0b';
      rCtx.fillRect(x - 6, 0, 4, 1024);
      rCtx.fillRect(x + 2, 0, 4, 1024);
    } else {
      rCtx.fillStyle = '#94a3b8';
      for (let dashY = 0; dashY < 1024; dashY += 128) {
        rCtx.fillRect(x - 3, dashY + 16, 6, 72);
      }
    }
  }

  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 20);
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.anisotropy = maxAnisotropy;
  textures.push(roadTex);

  // 3. Soft Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 512;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 256, 20, 128, 256, 124);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  sGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.45)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 512);
  const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
  contactShadowTex.colorSpace = THREE.SRGBColorSpace;
  textures.push(contactShadowTex);

  // 4. PBR Materials
  // "Ano White" Metallic Aerospace Finish (Default)
  const carBody = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eef2f7'),
    metalness: 0.62,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 0.95,
    anisotropy: 0.35,
  });

  const carbonFiber = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1c222d'),
    map: carbonTex,
    metalness: 0.3,
    roughness: 0.44,
    clearcoat: 0.75,
    clearcoatRoughness: 0.15,
  });

  const titanium = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9aa5b4'),
    metalness: 0.92,
    roughness: 0.22,
    anisotropy: 0.8,
    anisotropyRotation: Math.PI / 4,
    clearcoat: 0.3,
  });

  // "Gold-Glazed" Spacesuit-Visor Tinted Canopy Glass
  const goldCanopy = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffcf56'),
    emissive: new THREE.Color('#422502'),
    emissiveIntensity: 0.25,
    metalness: 0.25,
    roughness: 0.05,
    transmission: 0.78,
    ior: 1.65,
    thickness: 0.8,
    attenuationColor: new THREE.Color('#f59e0b'),
    attenuationDistance: 1.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  // 600L COPV Filament-Wound Red/Carbon Tank Material
  const copvRedCarbon = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dc2626'),
    map: carbonTex,
    metalness: 0.45,
    roughness: 0.28,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
  });

  const ledHeadlight = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e0f2fe'),
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 3.5,
    roughness: 0.1,
  });

  const taillightBar = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff2a2a'),
    emissive: new THREE.Color('#ef4444'),
    emissiveIntensity: 3.2,
    roughness: 0.15,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#12151c'),
    roughness: 0.82,
    metalness: 0.08,
  });

  const highwayRoad = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.62,
    metalness: 0.18,
  });

  const tunnelWallGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1e293b'),
    metalness: 0.2,
    roughness: 0.12,
    transmission: 0.65,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const megachargerStrip = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0284c7'),
    emissive: new THREE.Color('#06b6d4'),
    emissiveIntensity: 2.4,
    roughness: 0.2,
    metalness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  materials.push(
    carBody,
    carbonFiber,
    titanium,
    goldCanopy,
    copvRedCarbon,
    ledHeadlight,
    taillightBar,
    tireRubber,
    highwayRoad,
    tunnelWallGlass,
    megachargerStrip
  );

  const setCarFinish = (finish: CarFinish) => {
    switch (finish) {
      case 'ano-white':
        carBody.color.set('#eef2f7');
        carBody.metalness = 0.62;
        carBody.roughness = 0.18;
        carBody.clearcoat = 1.0;
        break;
      case 'stealth-carbon':
        carBody.color.set('#181c24');
        carBody.metalness = 0.45;
        carBody.roughness = 0.28;
        carBody.clearcoat = 0.85;
        break;
      case 'titanium-silver':
        carBody.color.set('#94a3b8');
        carBody.metalness = 0.88;
        carBody.roughness = 0.16;
        carBody.clearcoat = 1.0;
        break;
      case 'mars-crimson':
        carBody.color.set('#b91c1c');
        carBody.metalness = 0.72;
        carBody.roughness = 0.15;
        carBody.clearcoat = 1.0;
        break;
    }
  };

  const dispose = () => {
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
  };

  return {
    carBody,
    carbonFiber,
    titanium,
    goldCanopy,
    copvRedCarbon,
    ledHeadlight,
    taillightBar,
    tireRubber,
    highwayRoad,
    tunnelWallGlass,
    megachargerStrip,
    contactShadowTex,
    setCarFinish,
    dispose,
  };
}
