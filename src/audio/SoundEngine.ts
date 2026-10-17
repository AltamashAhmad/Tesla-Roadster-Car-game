/**
 * Procedural Web Audio API Synthesizer for the 2026 Rocket Roadster
 * - Dual-motor 1 MW electric inverter whine (pitch & harmonic modulation with speed)
 * - Pressurized 10,000 PSI cold-gas rocket thruster roar/hiss (filtered noise + sub-bass)
 * - 20 kW underbody vacuum suction turbine hum (quad-fan harmonic drone)
 * - Sonic aerodynamic wind shear above 250 mph
 * - Stunt / Megacharger / Drag-strip telemetry cues
 */

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private initialized: boolean = false;

  // Inverter whine nodes
  private motorOsc1: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  // Cold-gas thruster nodes
  private thrusterNoise: AudioBufferSourceNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;
  private thrusterSubOsc: OscillatorNode | null = null;
  private thrusterGain: GainNode | null = null;

  // Underbody suction fan nodes
  private suctionOsc1: OscillatorNode | null = null;
  private suctionOsc2: OscillatorNode | null = null;
  private suctionGain: GainNode | null = null;

  // Sonic wind rush nodes
  private windNoise: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);

      // 1. Dual-Motor 1 MW Electric Inverter Whine
      this.motorOsc1 = this.ctx.createOscillator();
      this.motorOsc2 = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();

      this.motorOsc1.type = 'sawtooth';
      this.motorOsc2.type = 'sine';
      this.motorOsc1.frequency.value = 110;
      this.motorOsc2.frequency.value = 220;

      const motorFilter = this.ctx.createBiquadFilter();
      motorFilter.type = 'bandpass';
      motorFilter.frequency.value = 800;
      motorFilter.Q.value = 2.2;

      this.motorGain.gain.value = 0.0;
      this.motorOsc1.connect(motorFilter);
      this.motorOsc2.connect(motorFilter);
      motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.masterGain);

      this.motorOsc1.start();
      this.motorOsc2.start();

      // Shared white/pink noise buffer (3 seconds looped)
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }

      // 2. Pressurized Cold-Gas Rocket Thruster Roar/Hiss
      this.thrusterNoise = this.ctx.createBufferSource();
      this.thrusterNoise.buffer = noiseBuffer;
      this.thrusterNoise.loop = true;

      this.thrusterFilter = this.ctx.createBiquadFilter();
      this.thrusterFilter.type = 'bandpass';
      this.thrusterFilter.frequency.value = 1400;
      this.thrusterFilter.Q.value = 0.7;

      this.thrusterSubOsc = this.ctx.createOscillator();
      this.thrusterSubOsc.type = 'triangle';
      this.thrusterSubOsc.frequency.value = 58;

      this.thrusterGain = this.ctx.createGain();
      this.thrusterGain.gain.value = 0.0;

      this.thrusterNoise.connect(this.thrusterFilter);
      this.thrusterFilter.connect(this.thrusterGain);
      this.thrusterSubOsc.connect(this.thrusterGain);
      this.thrusterGain.connect(this.masterGain);

      this.thrusterNoise.start();
      this.thrusterSubOsc.start();

      // 3. 20 kW Underbody Vacuum Suction Fans
      this.suctionOsc1 = this.ctx.createOscillator();
      this.suctionOsc2 = this.ctx.createOscillator();
      this.suctionGain = this.ctx.createGain();

      this.suctionOsc1.type = 'sine';
      this.suctionOsc2.type = 'triangle';
      this.suctionOsc1.frequency.value = 145;
      this.suctionOsc2.frequency.value = 290;
      this.suctionGain.gain.value = 0.0;

      const suctionFilter = this.ctx.createBiquadFilter();
      suctionFilter.type = 'lowpass';
      suctionFilter.frequency.value = 420;

      this.suctionOsc1.connect(suctionFilter);
      this.suctionOsc2.connect(suctionFilter);
      suctionFilter.connect(this.suctionGain);
      this.suctionGain.connect(this.masterGain);

      this.suctionOsc1.start();
      this.suctionOsc2.start();

      // 4. Sonic Wind Rush (> 200 mph)
      this.windNoise = this.ctx.createBufferSource();
      this.windNoise.buffer = noiseBuffer;
      this.windNoise.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'highpass';
      this.windFilter.frequency.value = 600;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0;

      this.windNoise.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);

      this.windNoise.start();

      this.initialized = true;
    } catch {
      // Ignore Web Audio errors if blocked by browser autoplay policy
    }
  }

  public update(params: {
    speedMph: number;
    throttle: boolean;
    rearThrust: boolean;
    liftoffThrust: boolean;
    rollThrust: boolean;
    suctionActive: boolean;
    megacharging: boolean;
  }): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') return;

    const now = this.ctx.currentTime;
    const speedNorm = Math.min(params.speedMph / 385, 1.2);

    // 1. Electric Motor Inverter Whine
    if (this.motorOsc1 && this.motorOsc2 && this.motorGain) {
      const baseFreq = 95 + speedNorm * 780 + (params.throttle ? 45 : 0);
      this.motorOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.motorOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.05);
      const targetMotorGain = Math.min(0.18, 0.02 + speedNorm * 0.12 + (params.throttle ? 0.04 : 0));
      this.motorGain.gain.setTargetAtTime(targetMotorGain, now, 0.06);
    }

    // 2. Cold-Gas Thruster Roar / Pressurized Hiss
    if (this.thrusterGain && this.thrusterFilter && this.thrusterSubOsc) {
      const anyThruster = params.rearThrust || params.liftoffThrust || params.rollThrust;
      const intensity = params.rearThrust ? 0.42 : params.liftoffThrust ? 0.35 : params.rollThrust ? 0.25 : 0.0;
      this.thrusterGain.gain.setTargetAtTime(intensity, now, anyThruster ? 0.03 : 0.08);

      const filterFreq = params.rearThrust ? 1850 : params.liftoffThrust ? 1350 : 2200;
      this.thrusterFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);
      this.thrusterSubOsc.frequency.setTargetAtTime(params.rearThrust ? 68 : 52, now, 0.04);
    }

    // 3. 20 kW Underbody Vacuum Suction Turbine Hum
    if (this.suctionGain && this.suctionOsc1 && this.suctionOsc2) {
      const suctionTarget = params.suctionActive ? 0.16 : 0.0;
      this.suctionGain.gain.setTargetAtTime(suctionTarget, now, 0.1);
      const fanPitch = 155 + speedNorm * 65;
      this.suctionOsc1.frequency.setTargetAtTime(fanPitch, now, 0.08);
      this.suctionOsc2.frequency.setTargetAtTime(fanPitch * 1.5, now, 0.08);
    }

    // 4. Sonic Wind Rush (scales up dramatically above 200 mph / Mach 0.5)
    if (this.windGain && this.windFilter) {
      const windFactor = Math.max(0, (params.speedMph - 120) / 265);
      this.windGain.gain.setTargetAtTime(Math.min(0.28, windFactor * windFactor * 0.25), now, 0.08);
      this.windFilter.frequency.setTargetAtTime(450 + windFactor * 1400, now, 0.08);
    }
  }

  public playStuntChime(type: 'stunt' | 'megacharge' | 'drag' | 'mode'): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type === 'megacharge' ? 'sine' : 'triangle';
      const startFreq =
        type === 'stunt' ? 523.25 : type === 'megacharge' ? 440 : type === 'drag' ? 659.25 : 392;
      const endFreq = startFreq * (type === 'stunt' ? 1.5 : 1.25);

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.16);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.04);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
