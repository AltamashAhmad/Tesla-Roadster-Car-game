export type TrimMode = 1 | 2 | 3;

export type CameraMode = 'chase' | 'cockpit' | 'bumper' | 'heli';

export type LightingPreset = 'sunset' | 'day' | 'night';

export type CarFinish = 'ano-white' | 'stealth-carbon' | 'titanium-silver' | 'mars-crimson';

export interface TrimSpec {
  id: TrimMode;
  name: string;
  subtitle: string;
  zeroToSixty: string;
  topSpeedMph: number;
  maxG: number;
  rearThrustersUnlocked: boolean;
  liftoffThrustersUnlocked: boolean;
  description: string;
}

export const TRIM_SPECS: Record<TrimMode, TrimSpec> = {
  1: {
    id: 1,
    name: 'Mode 1: Performance Trim',
    subtitle: 'Road Ready · 1 MW Dual Rear-Motor + Suction',
    zeroToSixty: '1.60s',
    topSpeedMph: 230,
    maxG: 1.85,
    rearThrustersUnlocked: false,
    liftoffThrustersUnlocked: false,
    description: '1 MW Dual Rear-Motor electric drive with 2.0G Multi-Mode Underbody Suction System.',
  },
  2: {
    id: 2,
    name: 'Mode 2: Thrust Trim',
    subtitle: 'Race Ready · +4 Rear Cold-Gas Thrusters',
    zeroToSixty: '0.81s',
    topSpeedMph: 330,
    maxG: 3.38,
    rearThrustersUnlocked: true,
    liftoffThrustersUnlocked: false,
    description: 'Unlocks 4 rear cold-gas thrusters for explosive 3.38G longitudinal acceleration.',
  },
  3: {
    id: 3,
    name: 'Mode 3: Rocket Trim',
    subtitle: 'Air Ready · 10 Perimeter Thrusters + Liftoff',
    zeroToSixty: '0.59s',
    topSpeedMph: 383,
    maxG: 4.64,
    rearThrustersUnlocked: true,
    liftoffThrustersUnlocked: true,
    description: 'Unlocks all 10 perimeter cold-gas nozzles, 4.64G launch, Vertical Liftoff, Hover, and Mid-Air Kickflips.',
  },
};

export interface StuntEvent {
  id: number;
  label: string;
  points: number;
  detail: string;
  color: 'cyan' | 'amber' | 'emerald' | 'rose';
}

export interface DragRunStats {
  active: boolean;
  armed: boolean;
  elapsedMs: number;
  distanceMeters: number;
  currentZeroToSixtyMs: number | null;
  currentZeroToHundredMs: number | null;
  currentQuarterMileMs: number | null;
  currentQuarterMileTrapMph: number | null;
  bestZeroToSixtyMs: number | null;
  bestZeroToHundredMs: number | null;
  bestQuarterMileMs: number | null;
  bestTopSpeedMph: number;
  longestFlightMeters: number;
}

export interface TelemetryState {
  speedMph: number;
  speedKmh: number;
  mach: number;
  longitudinalG: number;
  lateralG: number;
  verticalG: number;
  copvPsi: number; // 0 to 10,000 PSI
  copvKg: number; // 0 to 250 kg
  compressorRecharging: boolean;
  batteryPct: number; // 0 to 100%
  batteryTempC: number; // 25 to 95 C
  megacharging: boolean;
  suctionActive: boolean;
  inTunnel: boolean;
  nextTunnelMeters: number;
  tunnelAngleDeg: number; // 0 = floor, 90 = wall, 180 = upside-down ceiling
  isInverted: boolean;
  isAirborne: boolean;
  altitudeMeters: number;
  currentFlightMeters: number;
  rearThrustActive: boolean;
  liftoffActive: boolean;
  wingState: 'FLUSH (LOW DRAG)' | 'HIGH DOWNFORCE' | 'AIRBRAKE 45°';
  trim: TrimMode;
  cameraMode: CameraMode;
  lightingPreset: LightingPreset;
  carFinish: CarFinish;
  score: number;
  multiplier: number;
  distanceKm: number;
  dragStats: DragRunStats;
  recentStunts: StuntEvent[];
}
