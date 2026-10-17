import React from 'react';
import { TrimMode, TRIM_SPECS } from '../types/game';

interface TitleScreenModalProps {
  isOpen: boolean;
  isPaused: boolean;
  selectedTrim: TrimMode;
  onSelectTrim: (trim: TrimMode) => void;
  onStartGame: () => void;
  onResetDragStrip: () => void;
}

export const TitleScreenModal: React.FC<TitleScreenModalProps> = ({
  isOpen,
  isPaused,
  selectedTrim,
  onSelectTrim,
  onStartGame,
  onResetDragStrip,
}) => {
  if (!isOpen) return null;

  const spec = TRIM_SPECS[selectedTrim];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-auto bg-gradient-to-t from-[#05070c]/95 via-[#05070c]/45 to-[#05070c]/80">
      {/* Top Minimal Brand Lockup */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {/* Bespoke SVG Cyber-Aero Emblem */}
          <svg className="w-9 h-9 text-cyan-400 shrink-0" viewBox="0 0 40 40" fill="none">
            <path
              d="M4 28L20 7L36 28H28.5L20 16.5L11.5 28H4Z"
              fill="currentColor"
            />
            <path
              d="M9 32H31L28 35H12L9 32Z"
              fill="#f59e0b"
            />
          </svg>
          <div>
            <div className="font-display text-lg font-bold tracking-wider text-white">
              AERO-X // 2026 ROCKET ROADSTER
            </div>
            <div className="text-xs text-slate-400 font-mono">
              10-THRUSTER COLD-GAS PROPULSION · 2.0G UNDERBODY VACUUM SUCTION
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-300">
          <span>COPV: 600L @ 10,000 PSI</span>
          <span aria-hidden="true">·</span>
          <span>DRIVE: 1 MW DUAL MOTOR</span>
          <span aria-hidden="true">·</span>
          <span>TARGET: MACH 0.5 (383 MPH)</span>
        </div>
      </div>

      {/* Center Negative Space (35%+ unobstructed view of the live 3D orbiting Rocket Roadster) */}
      <div className="my-auto flex flex-col items-center text-center max-w-3xl mx-auto pointer-events-none select-none py-6">
        {/* Bespoke Inline SVG Title Lockup */}
        <svg
          className="w-full max-w-xl h-auto mb-3 drop-shadow-[0_6px_24px_rgba(6,182,212,0.28)]"
          viewBox="0 0 680 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="aeroTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          {/* Aerodynamic speed lines */}
          <line x1="20" y1="22" x2="195" y2="22" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.6" />
          <line x1="485" y1="22" x2="660" y2="22" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.6" />
          <text
            x="340"
            y="26"
            textAnchor="middle"
            fill="#38bdf8"
            fontFamily="JetBrains Mono, monospace"
            fontSize="12"
            fontWeight="600"
            letterSpacing="5"
          >
            CYBER-AERO HYPERCAR SANDBOX
          </text>
          <text
            x="340"
            y="78"
            textAnchor="middle"
            fill="url(#aeroTitleGrad)"
            fontFamily="Chakra Petch, sans-serif"
            fontStyle="italic"
            fontSize="54"
            fontWeight="700"
            letterSpacing="3"
          >
            ROCKET ROADSTER
          </text>
          <path d="M160 94H520L504 99H176L160 94Z" fill="#f59e0b" />
        </svg>

        <p className="text-sm md:text-base text-slate-300 max-w-xl text-balance leading-relaxed">
          Experience explosive <span className="text-white font-semibold">0–60 mph in 0.59s (4.64G)</span> cold-gas rocket acceleration, vertical highway traffic liftoff, and <span className="text-cyan-300 font-semibold">2.0G underbody vacuum suction</span> to drive upside down on cylindrical tunnel ceilings at 380+ mph.
        </p>
      </div>

      {/* Bottom Launch Console & Trim Selector */}
      <div className="max-w-4xl w-full mx-auto bg-[#090d16]/95 border border-slate-800 rounded-xl p-5 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {([1, 2, 3] as TrimMode[]).map((t) => {
            const item = TRIM_SPECS[t];
            const active = selectedTrim === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onSelectTrim(t)}
                className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 border-cyan-400 text-white'
                    : 'bg-[#0b101b] border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-sm tracking-wide text-white whitespace-nowrap">
                    {item.name}
                  </span>
                  <span className="font-mono text-xs text-cyan-400 tabular-nums">KEY [{t}]</span>
                </div>
                <div className="text-xs text-slate-400 mb-2">{item.subtitle}</div>
                <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-200">
                  <span>0-60: {item.zeroToSixty}</span>
                  <span>·</span>
                  <span>MAX: {item.topSpeedMph} MPH</span>
                  <span>·</span>
                  <span>{item.maxG}G</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
          {/* Single Flat Control-Hint Line */}
          <div className="text-xs font-mono text-slate-300 text-center sm:text-left">
            <span className="text-cyan-400 font-semibold">WASD</span> Drive ·{' '}
            <span className="text-amber-400 font-semibold">Shift</span> Rear Thrusters ·{' '}
            <span className="text-cyan-400 font-semibold">Space</span> Vertical Liftoff ·{' '}
            <span className="text-emerald-400 font-semibold">F</span> 2G Suction ·{' '}
            <span className="text-cyan-400 font-semibold">Q/E</span> Air Flip ·{' '}
            <span className="text-slate-200 font-semibold">R</span> Drag Strip
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isPaused && (
              <button
                type="button"
                onClick={() => {
                  onResetDragStrip();
                  onStartGame();
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                Reset 0-60 Drag Strip (R)
              </button>
            )}
            <button
              type="button"
              onClick={onStartGame}
              className="px-6 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm tracking-wider transition-colors whitespace-nowrap cursor-pointer shadow-lg"
            >
              {isPaused ? 'RESUME FLIGHT (ENTER)' : `LAUNCH ${spec.name.toUpperCase()} (ENTER)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
