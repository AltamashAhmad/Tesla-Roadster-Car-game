import React, { useState, useEffect } from 'react';
import {
  CameraMode,
  CarFinish,
  LightingPreset,
  TelemetryState,
  TRIM_SPECS,
  TrimMode,
} from '../types/game';

interface TelemetryHUDProps {
  telemetry: TelemetryState;
  isMuted: boolean;
  onSelectTrim: (trim: TrimMode) => void;
  onToggleSuction: () => void;
  onCycleCamera: () => void;
  onCycleLighting: () => void;
  onSelectFinish: (finish: CarFinish) => void;
  onResetDrag: () => void;
  onWarpToTunnel: () => void;
  onToggleMute: () => void;
  onOpenPause: () => void;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  telemetry,
  isMuted,
  onSelectTrim,
  onToggleSuction,
  onCycleCamera,
  onCycleLighting,
  onSelectFinish,
  onResetDrag,
  onWarpToTunnel,
  onToggleMute,
  onOpenPause,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const trimSpec = TRIM_SPECS[telemetry.trim];
  const isMachHalf = telemetry.speedMph >= 360;
  const psiPct = Math.max(0, Math.min(100, (telemetry.copvPsi / 10000) * 100));

  const formatMs = (ms: number | null) => {
    if (ms === null) return '--.--s';
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-5 select-none">
      {/* =================================================================== */}
      {/* TOP PERIMETER CLUSTER: Spec Badge, Tunnel Suction Status & Drag Box */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4 w-full max-w-[1440px] mx-auto">
        {/* Top-Left: Active Trim & Score Readout */}
        <div className="bg-[#070a12]/90 border border-slate-800/90 rounded-lg px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm tracking-wider text-white whitespace-nowrap">
              {trimSpec.name}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono text-xs text-cyan-400 tabular-nums whitespace-nowrap">
              MAX {trimSpec.topSpeedMph} MPH
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
              {telemetry.distanceKm.toFixed(2)} KM
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs font-mono tabular-nums">
            <span className="text-slate-400">
              SCORE <strong className="text-white font-semibold">{Math.round(telemetry.score).toLocaleString()}</strong>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-semibold">
              {telemetry.multiplier.toFixed(1)}x MULTIPLIER
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              AERO: <strong className="text-slate-200">{telemetry.wingState}</strong>
            </span>
          </div>

          {/* Live Stunt Feed */}
          {telemetry.recentStunts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
              {telemetry.recentStunts.slice(0, 2).map((stunt) => (
                <div key={stunt.id} className="flex items-center justify-between gap-4 text-xs font-mono">
                  <span
                    className={
                      stunt.color === 'amber'
                        ? 'text-amber-400 font-semibold'
                        : stunt.color === 'emerald'
                        ? 'text-emerald-400 font-semibold'
                        : 'text-cyan-400 font-semibold'
                    }
                  >
                    {stunt.label}
                  </span>
                  <span className="text-slate-400">{stunt.detail}</span>
                  <span className="text-white font-bold tabular-nums">+{stunt.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top-Center: Underbody Suction & Cylindrical Tunnel Inversion Status */}
        <div className="bg-[#070a12]/90 border border-slate-800/90 rounded-lg px-4 py-2.5 text-center pointer-events-auto">
          <div className="flex items-center justify-center gap-3 text-xs font-mono">
            <span
              className={
                telemetry.suctionActive
                  ? 'text-emerald-400 font-bold tracking-wider'
                  : 'text-slate-400 font-medium'
              }
            >
              {telemetry.suctionActive
                ? '2.0G VACUUM ACTIVE — INVERT READY'
                : 'SUCTION OFF (PRESS F FOR 2.0G GRIP)'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-300 tabular-nums">
              {telemetry.inTunnel
                ? `IN TUNNEL · WALL ANGLE ${Math.round(Math.abs(telemetry.tunnelAngleDeg))}°`
                : `NEXT TUNNEL: ${telemetry.nextTunnelMeters}M`}
            </span>
          </div>
          {telemetry.inTunnel && (
            <div className="text-[11px] font-mono text-amber-300 mt-0.5">
              {telemetry.isInverted
                ? 'INVERTED CEILING FLIGHT ACTIVE (180°) — KEEP SUCTION [F] ON!'
                : telemetry.suctionActive
                ? 'STEER HARD LEFT/RIGHT (A/D) TO DRIVE UP TUNNEL WALLS TO CEILING!'
                : 'ENABLE SUCTION [F] TO DRIVE ON TUNNEL WALLS & CEILING'}
            </div>
          )}
        </div>

        {/* Top-Right: 0-60 / Quarter-Mile Live Drag Telemetry Strip */}
        <div className="bg-[#070a12]/90 border border-slate-800/90 rounded-lg px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="font-display font-bold text-xs tracking-wider text-slate-200">
              LAUNCH TELEMETRY STRIP
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResetDrag}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                [R] Drag Reset
              </button>
              <button
                type="button"
                onClick={onWarpToTunnel}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                [T] Tunnel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div>
              <div className="text-[10px] text-slate-400">0–60 MPH</div>
              <div className="text-white font-semibold">
                {formatMs(telemetry.dragStats.currentZeroToSixtyMs ?? telemetry.dragStats.bestZeroToSixtyMs)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">0–100 MPH</div>
              <div className="text-white font-semibold">
                {formatMs(telemetry.dragStats.currentZeroToHundredMs ?? telemetry.dragStats.bestZeroToHundredMs)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">1/4 MILE</div>
              <div className="text-white font-semibold">
                {formatMs(telemetry.dragStats.currentQuarterMileMs ?? telemetry.dragStats.bestQuarterMileMs)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">TOP / FLIGHT</div>
              <div className="text-cyan-400 font-semibold">
                {Math.round(telemetry.dragStats.bestTopSpeedMph)} MPH · {Math.round(telemetry.dragStats.longestFlightMeters)}M
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL & TELEMETRY DOCK                 */}
      {/* =================================================================== */}
      <div className="w-full max-w-[960px] mx-auto flex flex-col items-center pointer-events-auto">
        {/* Collapse / Expand Cinema Toggle Button */}
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="px-3.5 py-1 rounded-t-lg bg-[#070a12]/95 border border-b-0 border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          {dockCollapsed ? '▴ Show Telemetry & Controls' : '▾ Hide Controls (Cinema View)'}
        </button>

        {!dockCollapsed && (
          <div className="w-full bg-[#070a12]/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl">
            {/* Row 1: Primary Telemetry Readouts (Speed, G-Force, 10,000 PSI COPV Air Tank, 4680 Battery) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pb-3 border-b border-slate-800/90">
              {/* Speedometer & Mach Readout (4 cols) */}
              <div className="md:col-span-4 flex items-baseline gap-3">
                <div
                  className={`font-display font-bold text-4xl md:text-5xl tracking-tight tabular-nums ${
                    isMachHalf ? 'text-amber-400' : telemetry.rearThrustActive ? 'text-cyan-300' : 'text-white'
                  }`}
                >
                  {Math.round(telemetry.speedMph)}
                </div>
                <div className="flex flex-col font-mono text-xs tabular-nums">
                  <span className="text-slate-300 font-semibold">
                    MPH · {Math.round(telemetry.speedKmh)} KM/H
                  </span>
                  <span className={isMachHalf ? 'text-amber-400 font-bold' : 'text-cyan-400'}>
                    MACH {telemetry.mach.toFixed(3)} {isMachHalf ? '(MACH 0.5 TARGET!)' : ''}
                  </span>
                </div>
              </div>

              {/* Live G-Force & Altitude Readout (3 cols) */}
              <div className="md:col-span-3 flex items-center justify-between bg-[#0c111d] border border-slate-800/80 rounded-lg px-3 py-2 font-mono text-xs tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">LONGITUDINAL G</div>
                  <div
                    className={`text-sm font-bold ${
                      telemetry.longitudinalG >= 3.0
                        ? 'text-amber-400'
                        : telemetry.longitudinalG < -1.0
                        ? 'text-rose-400'
                        : 'text-white'
                    }`}
                  >
                    {telemetry.longitudinalG >= 0 ? '+' : ''}
                    {telemetry.longitudinalG.toFixed(2)}G
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">
                    {telemetry.isAirborne ? 'FLIGHT ALTITUDE' : 'LATERAL GRIP'}
                  </div>
                  <div className="text-sm font-bold text-cyan-300">
                    {telemetry.isAirborne
                      ? `${telemetry.altitudeMeters.toFixed(1)}M AIR`
                      : `${Math.abs(telemetry.lateralG).toFixed(2)}G LAT`}
                  </div>
                </div>
              </div>

              {/* 600L COPV Compressed Air Tank Bar (3 cols) */}
              <div className="md:col-span-3 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-slate-300 font-semibold">COPV AIR TANK</span>
                  <span className={telemetry.copvPsi < 2000 ? 'text-rose-400 font-bold' : 'text-cyan-300 font-bold'}>
                    {Math.round(telemetry.copvPsi).toLocaleString()} PSI ({Math.round(telemetry.copvKg)} KG)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-transform duration-75 origin-left ${
                      telemetry.rearThrustActive || telemetry.liftoffActive
                        ? 'bg-amber-400'
                        : telemetry.compressorRecharging
                        ? 'bg-emerald-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ transform: `scaleX(${psiPct / 100})` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                  <span>
                    {telemetry.rearThrustActive
                      ? 'REAR COLD-GAS FIRING'
                      : telemetry.liftoffActive
                      ? 'VERTICAL LIFTOFF FIRING'
                      : telemetry.compressorRecharging
                      ? 'COMPRESSOR RECHARGING (>60 MPH)'
                      : '10 NOZZLES STANDBY'}
                  </span>
                </div>
              </div>

              {/* 4680 Battery & Megacharger Thermal Gauge (2 cols) */}
              <div className="md:col-span-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-slate-300 font-semibold">4680 PACK</span>
                  <span className={telemetry.megacharging ? 'text-cyan-300 font-bold' : 'text-emerald-400 font-bold'}>
                    {Math.round(telemetry.batteryPct)}% · {Math.round(telemetry.batteryTempC)}°C
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-transform duration-75 origin-left ${
                      telemetry.megacharging ? 'bg-cyan-400' : 'bg-emerald-500'
                    }`}
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, telemetry.batteryPct / 100))})` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {telemetry.megacharging ? '1 MW MEGACHARGER ACTIVE!' : '1 MW DUAL MOTOR READY'}
                </div>
              </div>
            </div>

            {/* Row 2: Consolidated Interactive Controls (Trims, Actuators, Camera, Finish, Lighting, Audio) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-xs font-mono">
              {/* 3 Trim Mode Buttons */}
              <div className="flex items-center gap-1 bg-[#0c111d] p-1 rounded-lg border border-slate-800/80">
                {([1, 2, 3] as TrimMode[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onSelectTrim(t)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                      telemetry.trim === t
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    [{t}] {t === 1 ? 'Perf' : t === 2 ? 'Thrust' : 'Rocket'}
                  </button>
                ))}
              </div>

              {/* Suction Toggle Button */}
              <button
                type="button"
                onClick={onToggleSuction}
                className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  telemetry.suctionActive
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-[#0c111d] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                [F] 2G Suction: {telemetry.suctionActive ? 'ON' : 'OFF'}
              </button>

              {/* Camera Mode Button */}
              <button
                type="button"
                onClick={onCycleCamera}
                className="px-3 py-1.5 rounded-lg bg-[#0c111d] border border-slate-800 text-slate-200 hover:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                [C] Cam: {telemetry.cameraMode.toUpperCase()}
              </button>

              {/* Paint Finish Swatches */}
              <div className="flex items-center gap-1 bg-[#0c111d] px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 mr-1">FINISH</span>
                {(
                  [
                    { id: 'ano-white', label: 'White', bg: 'bg-slate-100' },
                    { id: 'stealth-carbon', label: 'Carbon', bg: 'bg-slate-800' },
                    { id: 'titanium-silver', label: 'Titanium', bg: 'bg-slate-400' },
                    { id: 'mars-crimson', label: 'Crimson', bg: 'bg-red-600' },
                  ] as Array<{ id: CarFinish; label: string; bg: string }>
                ).map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    title={swatch.label}
                    onClick={() => onSelectFinish(swatch.id)}
                    className={`w-4 h-4 rounded-full ${swatch.bg} border cursor-pointer ${
                      telemetry.carFinish === swatch.id ? 'border-cyan-400 scale-110' : 'border-slate-600 opacity-75'
                    }`}
                  />
                ))}
              </div>

              {/* Lighting Time-of-Day Preset */}
              <button
                type="button"
                onClick={onCycleLighting}
                className="px-2.5 py-1.5 rounded-lg bg-[#0c111d] border border-slate-800 text-slate-200 hover:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Sky: {telemetry.lightingPreset.toUpperCase()}
              </button>

              {/* Audio Mute & Pause */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0c111d] border border-slate-800 text-slate-200 hover:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  [M] {isMuted ? 'Muted' : 'Audio On'}
                </button>
                <button
                  type="button"
                  onClick={onOpenPause}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0c111d] border border-slate-800 text-slate-200 hover:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  [Esc] Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
