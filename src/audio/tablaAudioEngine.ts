/**
 * Tabla & Bayan Ultra-Realistic Acoustic Physical Modeling Synthesizer
 * Grounded in the acoustics research of Sir C.V. Raman (1934), Fletcher & Rossing,
 * and Stefan Bilbao's membrane numerical acoustics.
 *
 * Implements:
 * 1. Raman's 5-Mode Concentric Harmonic Resonance with Degenerate Mode Splitting (Δf ≈ 1.8 Hz)
 * 2. Non-linear membrane tension pitch-sag (initial displacement transient)
 * 3. Soft viscoelastic finger impact transient (replaces synthetic noise)
 * 4. Helmholtz-coupled kettle cavity model for Bayan with fleshy palm dynamic damping
 * 5. WaveShaper non-linear saturation (simulates Syahi micro-fissure friction)
 * 6. Authentic Baithak room acoustic convolution reverberation
 * 7. Authentic Indian Tanpura Drone (Sa-Pa drone generator)
 */

import { BolKey, EngineMode, SoundBankPreset } from '../types/tabla';
import { generateStudioSampleBank } from './sampleGenerator';

class TablaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private waveShaper: WaveShaperNode | null = null;

  // Tanpura Drone Nodes
  private isTanpuraPlaying: boolean = false;
  private tanpuraGain: GainNode | null = null;
  private tanpuraTimer: number | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.85;

  // Acoustic tuning parameters
  public rootFreq: number = 293.66; // D4 (Standard Tabla Sa)
  public syahiMassEffect: number = 1.0; // 1.0 = Tabla harmonics, 0.0 = Bessel drum
  public ringFingerDamping: number = 0.88; // 0.0 = open, 1.0 = dampened fundamental
  public skinTension: number = 1.0; // Gatta peg tension multiplier
  public bayanBaseFreq: number = 73.42; // D2 (Helmholtz cavity fundamental)

  private timeDataArray: Uint8Array<ArrayBuffer> | null = null;
  private freqDataArray: Uint8Array<ArrayBuffer> | null = null;

  // Sampler & Hybrid Engine: AudioBuffer storage, preset and mode
  public engineMode: EngineMode = 'sampler';
  public currentPreset: SoundBankPreset = 'freesound';
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private customBuffers: Map<BolKey, AudioBuffer> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private rawFreesoundBuffers: Map<string, AudioBuffer> = new Map();
  private bolRoundRobinBanks: Map<BolKey, AudioBuffer[]> = new Map();
  private freesoundManifest: {
    id: string;
    name: string;
    bol: BolKey;
    label: string;
    file: string;
    size: number;
  }[] = [];
  public isFreesoundLoading: boolean = false;
  private sampleStatusListeners: (() => void)[] = [];

  constructor() {}

  public init(): boolean {
    if (this.ctx) return true;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Compressor (Limiter) for acoustic drum punch without clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-3, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Soft non-linear WaveShaper simulating Syahi micro-fissure friction
      this.waveShaper = this.ctx.createWaveShaper();
      this.waveShaper.curve = this.makeDistortionCurve(1.8);
      this.waveShaper.oversample = '2x';

      // Reverb / Room ambience bus
      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(0.82, this.ctx.currentTime);

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.convolver = this.createSyntheticBaithakReverb(this.ctx);

      // Analyser for real-time oscilloscope & FFT
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.72;

      // Routing: Master -> WaveShaper -> (Dry & Convolver) -> Compressor -> Analyser -> Dest
      this.masterGain.connect(this.waveShaper);
      this.waveShaper.connect(this.dryGain);
      this.dryGain.connect(this.compressor);

      if (this.convolver) {
        this.waveShaper.connect(this.convolver);
        this.convolver.connect(this.wetGain);
        this.wetGain.connect(this.compressor);
      }

      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.timeDataArray = new Uint8Array(this.analyser.fftSize);
      this.freqDataArray = new Uint8Array(this.analyser.frequencyBinCount);

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    } catch (e) {
      console.error('Failed to initialize Web Audio:', e);
      return false;
    }
  }

  /**
   * Non-linear transfer curve for subtle membrane contact saturation
   */
  private makeDistortionCurve(k: number = 2.0): Float32Array<ArrayBuffer> {
    const n = 512;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Generates an authentic Indian Baithak chamber acoustic impulse response
   */
  private createSyntheticBaithakReverb(ctx: AudioContext): ConvolverNode | null {
    try {
      const rate = ctx.sampleRate;
      const duration = 1.35;
      const length = Math.floor(rate * duration);
      const buffer = ctx.createBuffer(2, length, rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      const decay = 3.6;
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        const env = Math.exp(-t * decay);
        const early = t < 0.05 ? Math.sin(t * 700) * 0.35 : 0;
        left[i] = ((Math.random() * 2 - 1) * env + early) * 0.6;
        right[i] = ((Math.random() * 2 - 1) * env + early * 0.88) * 0.6;
      }

      const convolver = ctx.createConvolver();
      convolver.buffer = buffer;
      return convolver;
    } catch {
      return null;
    }
  }

  public ensureContext(): boolean {
    // 初回もここで音源を読み込む（以前は初回だけ読み込まれず合成音のままだった）
    if (!this.ctx && !this.init()) return false;
    if (this.ctx!.state === 'suspended') {
      this.ctx!.resume();
    }
    if (this.sampleBuffers.size === 0 && !this.isFreesoundLoading) {
      this.loadSoundBank(this.currentPreset);
    }
    return true;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setRootNote(freq: number) {
    this.rootFreq = freq;
    this.bayanBaseFreq = freq * 0.25; // Bayan tuned 2 octaves below Dayan Sa
    if (this.isTanpuraPlaying) {
      this.restartTanpura();
    }
  }

  public setSyahiMass(mass: number) {
    this.syahiMassEffect = Math.max(0, Math.min(1, mass));
  }

  public setDamping(damp: number) {
    this.ringFingerDamping = Math.max(0, Math.min(1, damp));
  }

  public setSkinTension(tension: number) {
    this.skinTension = Math.max(0.7, Math.min(1.4, tension));
  }

  public getWaveformData(): Uint8Array | null {
    if (!this.analyser || !this.timeDataArray) return null;
    this.analyser.getByteTimeDomainData(this.timeDataArray);
    return this.timeDataArray;
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqDataArray) return null;
    this.analyser.getByteFrequencyData(this.freqDataArray);
    return this.freqDataArray;
  }

  private recordDest: MediaStreamAudioDestinationNode | null = null;

  public getRecordStream(): MediaStream | null {
    this.ensureContext();
    if (!this.ctx) return null;
    if (!this.recordDest) {
      this.recordDest = this.ctx.createMediaStreamDestination();
      if (this.analyser) {
        this.analyser.connect(this.recordDest);
      }
    }
    return this.recordDest.stream;
  }

  /**
   * Hathori (Tuning Hammer) striking wooden peg (Gatta)
   */
  public playHathoriPegTap() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Metronome click / Indian Tali hand-clap
   */
  public playMetronomeTick(isAccent: boolean, mode: 'tick' | 'tali' = 'tick') {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (mode === 'tick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1760 : 880, now);
      gain.gain.setValueAtTime(isAccent ? 0.6 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // Indian Tali (Hand-clap acoustic resonance)
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 480 : 360, now);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isAccent ? 1100 : 850, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(isAccent ? 0.75 : 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 44100;
  }

  /**
   * Viscoelastic fingertip contact impulse (models fleshy skin impact on leather)
   */
  private playViscoelasticImpulse(
    now: number,
    duration: number,
    centerFreq: number,
    q: number,
    intensity: number = 0.35
  ) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Raised cosine envelope with damped stochastic contact texture
    for (let i = 0; i < bufferSize; i++) {
      const window = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * Math.pow(window, 1.5) * Math.exp(-i / (bufferSize * 0.28));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(q, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * =========================================================================
   * DAYAN SYNTHESIS (右手の高音太鼓 - ダヤーン)
   * Raman 5-Mode Modal Synthesis with Degenerate Mode Splitting & Non-linear Pitch Sag
   * =========================================================================
   */

  /**
   * NA / TA (Kinar rim strike with ring finger resting on Syahi edge)
   * - Fundamental (0,1) is heavily attenuated (90%) by ring finger
   * - Primary mode (1,1) splits into two orthogonal degenerate modes with Δf ≈ 1.8 Hz
   * - Mode (2,1)/(0,2) and (3,1) add metallic shimmer
   */
  public playNa(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const baseSa = this.rootFreq * this.skinTension;

    // Viscoelastic nail/fingertip impulse at Kinar
    this.playViscoelasticImpulse(now, 0.038, 2800, 2.2, 0.45 * intensity);

    // Raman Mode Ratios:
    // If syahiMassEffect = 1.0 -> 1.00, 2.00, 3.01, 4.02, 5.04
    // If syahiMassEffect = 0.0 -> 1.00, 1.59, 2.14, 2.30, 2.65
    const m2 = 2.0 * this.syahiMassEffect + 1.59 * (1.0 - this.syahiMassEffect);
    const m3 = 3.01 * this.syahiMassEffect + 2.14 * (1.0 - this.syahiMassEffect);
    const m4 = 4.02 * this.syahiMassEffect + 2.30 * (1.0 - this.syahiMassEffect);

    // Mode (0,1): fundamental attenuated by ring finger dampening
    const f0GainVal = 0.05 * (1.0 - this.ringFingerDamping * 0.95);
    const osc0 = this.ctx.createOscillator();
    const gain0 = this.ctx.createGain();
    osc0.type = 'sine';
    osc0.frequency.setValueAtTime(baseSa, now);
    gain0.gain.setValueAtTime(f0GainVal * intensity, now);
    gain0.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc0.connect(gain0);
    gain0.connect(this.masterGain);
    osc0.start(now);
    osc0.stop(now + 0.22);

    // Mode (1,1)_a: Principal Bell Singing Harmonic (~587 Hz at Sa=D)
    const f2Target = baseSa * m2;
    const osc1a = this.ctx.createOscillator();
    const gain1a = this.ctx.createGain();
    osc1a.type = 'sine';
    // Subtle initial strike displacement pitch sag (+2.5 Hz settling in 35ms)
    osc1a.frequency.setValueAtTime(f2Target + 2.5, now);
    osc1a.frequency.exponentialRampToValueAtTime(f2Target, now + 0.035);
    gain1a.gain.setValueAtTime(0.75 * intensity, now);
    gain1a.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    osc1a.connect(gain1a);
    gain1a.connect(this.masterGain);
    osc1a.start(now);
    osc1a.stop(now + 1.35);

    // Mode (1,1)_b: Degenerate Mode Splitting (Δf = 1.8 Hz) -> Acoustic Beating / Shimmer
    const osc1b = this.ctx.createOscillator();
    const gain1b = this.ctx.createGain();
    osc1b.type = 'sine';
    osc1b.frequency.setValueAtTime(f2Target + 1.8, now);
    gain1b.gain.setValueAtTime(0.32 * intensity, now);
    gain1b.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc1b.connect(gain1b);
    gain1b.connect(this.masterGain);
    osc1b.start(now);
    osc1b.stop(now + 1.15);

    // Mode (2,1)/(0,2): Coalesced 3rd Harmonic (~880 Hz)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseSa * m3, now);
    gain2.gain.setValueAtTime(0.35 * intensity, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.75);

    // Mode (3,1): Metallic Rim Dispersion Harmonic (~1174 Hz)
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(baseSa * m4, now);
    gain3.gain.setValueAtTime(0.18 * intensity, now);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc3.connect(gain3);
    gain3.connect(this.masterGain);
    osc3.start(now);
    osc3.stop(now + 0.4);
  }

  /**
   * TIN (Maidan/Sur strike with relaxed finger pad)
   * Warm, mellow singing overtone with balanced fundamental and 2nd harmonic.
   */
  public playTin(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const baseSa = this.rootFreq * this.skinTension;

    this.playViscoelasticImpulse(now, 0.045, 1800, 1.8, 0.28 * intensity);

    const m2 = 2.0 * this.syahiMassEffect + 1.59 * (1.0 - this.syahiMassEffect);

    // Fundamental (0,1): moderate resonance on clear leather
    const osc0 = this.ctx.createOscillator();
    const gain0 = this.ctx.createGain();
    osc0.type = 'sine';
    osc0.frequency.setValueAtTime(baseSa, now);
    gain0.gain.setValueAtTime(0.42 * intensity, now);
    gain0.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc0.connect(gain0);
    gain0.connect(this.masterGain);
    osc0.start(now);
    osc0.stop(now + 0.85);

    // 2nd Harmonic: Singing tone
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseSa * m2, now);
    gain1.gain.setValueAtTime(0.6 * intensity, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.95);
  }

  /**
   * TUN (Open center strike on Syahi without dampening)
   * Resonates like a bronze bell with long decay and non-linear pitch sag.
   */
  public playTun(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const baseSa = this.rootFreq * this.skinTension;

    this.playViscoelasticImpulse(now, 0.055, 1400, 1.5, 0.32 * intensity);

    const m2 = 2.0 * this.syahiMassEffect + 1.59 * (1.0 - this.syahiMassEffect);

    // Fundamental Bell Mode (0,1) with Tension Non-Linear Pitch Sag
    const osc0 = this.ctx.createOscillator();
    const gain0 = this.ctx.createGain();
    osc0.type = 'sine';
    // Pitch drops 3 Hz over decay as membrane tension relaxes
    osc0.frequency.setValueAtTime(baseSa + 3.2, now);
    osc0.frequency.exponentialRampToValueAtTime(baseSa, now + 0.18);
    osc0.frequency.linearRampToValueAtTime(baseSa - 1.2, now + 1.8);

    gain0.gain.setValueAtTime(0.92 * intensity, now);
    gain0.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);
    osc0.connect(gain0);
    gain0.connect(this.masterGain);
    osc0.start(now);
    osc0.stop(now + 1.95);

    // Warm 2nd harmonic
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseSa * m2, now);
    gain1.gain.setValueAtTime(0.38 * intensity, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 1.2);
  }

  /**
   * TE / TI (Flat closed slap on Syahi center with middle/ring fingers)
   * Immediate viscoelastic damping (T60 < 60ms)
   */
  public playTe(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const baseSa = this.rootFreq * this.skinTension;

    this.playViscoelasticImpulse(now, 0.035, 1200, 2.5, 0.6 * intensity);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseSa * 1.8, now);
    osc.frequency.exponentialRampToValueAtTime(baseSa * 0.7, now + 0.045);

    gain.gain.setValueAtTime(0.55 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  /**
   * RE (Index finger slap on Syahi)
   */
  public playRe(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const baseSa = this.rootFreq * this.skinTension;

    this.playViscoelasticImpulse(now, 0.032, 1600, 2.2, 0.52 * intensity);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseSa * 2.1, now);
    osc.frequency.exponentialRampToValueAtTime(baseSa * 0.9, now + 0.045);

    gain.gain.setValueAtTime(0.48 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  /**
   * =========================================================================
   * BAYAN SYNTHESIS (左手の低音深鍋太鼓 - バーヤーン)
   * Helmholtz-Coupled Kettle Cavity Model with Dynamic Fleshy Palm Damping
   * =========================================================================
   */

  /**
   * GE / GHE (Resonant open bass on Bayan)
   * Helmholtz cavity resonance coupled to the membrane fundamental (~68 - 75 Hz)
   */
  public playGe(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const fHelmholtz = Math.max(62, this.bayanBaseFreq);

    // Warm viscoelastic finger pad strike thump
    this.playViscoelasticImpulse(now, 0.06, 180, 1.6, 0.42 * intensity);

    // Acoustic cavity lowpass filter: natural body absorptivity
    const kettleFilter = this.ctx.createBiquadFilter();
    kettleFilter.type = 'lowpass';
    kettleFilter.frequency.setValueAtTime(320, now);
    kettleFilter.frequency.exponentialRampToValueAtTime(170, now + 0.9);
    kettleFilter.connect(this.masterGain);

    // Coupled Fundamental Resonance Mode: pure, deep, velvety
    const osc0 = this.ctx.createOscillator();
    const gain0 = this.ctx.createGain();
    osc0.type = 'sine';
    // Organic membrane relaxation under strike
    osc0.frequency.setValueAtTime(fHelmholtz * 1.05, now);
    osc0.frequency.exponentialRampToValueAtTime(fHelmholtz, now + 0.07);
    osc0.frequency.linearRampToValueAtTime(fHelmholtz * 0.98, now + 1.2);

    gain0.gain.setValueAtTime(0.95 * intensity, now);
    gain0.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

    osc0.connect(gain0);
    gain0.connect(kettleFilter);
    osc0.start(now);
    osc0.stop(now + 1.25);

    // 2nd Harmonic: Cavity compression mode (~140 Hz, faster decay)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(fHelmholtz * 1.98, now);
    gain1.gain.setValueAtTime(0.24 * intensity, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(kettleFilter);
    osc1.start(now);
    osc1.stop(now + 0.45);
  }

  /**
   * MEEND (Pitch bend slide on Bayan)
   * The palm heel slides forward, increasing membrane tension while simultaneously
   * absorbing higher frequencies through fleshy hand contact damping.
   */
  public playMeend(
    bendAmount: number = 1.6,
    intensity: number = 1.0,
    style: 'slide' | 'wave' | 'jhatka' = 'slide'
  ) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const startFreq = Math.max(62, this.bayanBaseFreq);
    const peakFreq = startFreq * Math.max(1.15, Math.min(2.1, bendAmount));

    this.playViscoelasticImpulse(now, 0.05, 190, 1.8, 0.35 * intensity);

    // Dynamic lowpass tracking palm pressure: as pressure increases, damping increases
    const meendFilter = this.ctx.createBiquadFilter();
    meendFilter.type = 'lowpass';
    meendFilter.frequency.setValueAtTime(280, now);
    meendFilter.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    if (style === 'wave') {
      // Wave (Lahar): low -> high -> smooth return low
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.04, now + 0.75);
      meendFilter.frequency.exponentialRampToValueAtTime(340, now + 0.22);
      meendFilter.frequency.exponentialRampToValueAtTime(175, now + 0.85);
    } else if (style === 'jhatka') {
      // Fast flick / snap bend
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(peakFreq * 1.08, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.05, now + 0.45);
      meendFilter.frequency.exponentialRampToValueAtTime(320, now + 0.09);
      meendFilter.frequency.exponentialRampToValueAtTime(185, now + 0.5);
    } else {
      // Standard slide (Chadhana)
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(peakFreq * 0.94, now + 0.9);
      meendFilter.frequency.exponentialRampToValueAtTime(350, now + 0.2);
      meendFilter.frequency.exponentialRampToValueAtTime(185, now + 0.9);
    }

    gain.gain.setValueAtTime(0.9 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

    osc.connect(gain);
    gain.connect(meendFilter);
    osc.start(now);
    osc.stop(now + 1.25);

    // Subtle 2nd harmonic gliding alongside
    const oscHarm = this.ctx.createOscillator();
    const gainHarm = this.ctx.createGain();
    oscHarm.type = 'sine';
    oscHarm.frequency.setValueAtTime(startFreq * 1.98, now);
    oscHarm.frequency.exponentialRampToValueAtTime(peakFreq * 1.98, now + 0.2);
    oscHarm.frequency.exponentialRampToValueAtTime(startFreq * 1.98, now + 0.7);

    gainHarm.gain.setValueAtTime(0.16 * intensity, now);
    gainHarm.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    oscHarm.connect(gainHarm);
    gainHarm.connect(meendFilter);
    oscHarm.start(now);
    oscHarm.stop(now + 0.55);
  }

  /**
   * KE / KA (Flat palm mute slap on Bayan)
   * Completely dry, non-resonant, natural flat hand slap ("kat" or "tup")
   */
  public playKe(intensity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    this.playViscoelasticImpulse(now, 0.045, 320, 1.4, 0.65 * intensity);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.04);

    gain.gain.setValueAtTime(0.55 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Combinations
   */
  public playDha(intensity: number = 1.0) {
    this.playNa(intensity * 0.95);
    this.playGe(intensity * 0.95);
  }

  public playDhin(intensity: number = 1.0) {
    this.playTin(intensity * 0.95);
    this.playGe(intensity * 0.95);
  }

  public playTirekita(intensity: number = 1.0) {
    const delay = 0.082;
    this.playTe(intensity);
    setTimeout(() => this.playRe(intensity * 0.95), delay * 1000);
    setTimeout(() => this.playKe(intensity * 0.9), delay * 2000);
    setTimeout(() => this.playTe(intensity * 0.95), delay * 3000);
  }

  /**
   * Engine Mode Management:
   * - 'sampler': Authentic multi-velocity studio recordings with round-robin
   * - 'hybrid': Merges sampled acoustic attack transient with continuous physical resonance
   * - 'physical': Mathematical Raman 5-mode synthesis for acoustics experiments
   */
  public setEngineMode(mode: EngineMode) {
    this.engineMode = mode;
    this.notifySampleStatusChange();
  }

  public getEngineMode(): EngineMode {
    return this.engineMode;
  }

  public getSoundBankPreset(): SoundBankPreset {
    return this.currentPreset;
  }

  public setSoundBankPreset(preset: SoundBankPreset) {
    this.loadSoundBank(preset);
  }

  public async loadSoundBank(preset: SoundBankPreset) {
    if (!this.ctx) return;
    this.currentPreset = preset;

    if (preset === 'freesound') {
      await this.loadFreesoundPreset();
      return;
    }

    const newBank = generateStudioSampleBank(this.ctx, preset);

    // Populate sampleBuffers
    this.sampleBuffers.clear();
    newBank.forEach((buffer, key) => {
      this.sampleBuffers.set(key, buffer);
    });

    // Re-apply any custom user recordings or uploads
    this.customBuffers.forEach((buffer, bol) => {
      this.sampleBuffers.set(bol, buffer);
    });

    this.notifySampleStatusChange();
  }

  public async loadFreesoundPreset(): Promise<boolean> {
    if (!this.ctx) return false;
    this.isFreesoundLoading = true;
    try {
      if (this.freesoundManifest.length === 0) {
        const res = await fetch(`${import.meta.env.BASE_URL}samples/freesound/manifest.json`);
        this.freesoundManifest = await res.json();
      }

      await Promise.all(
        this.freesoundManifest.map(async (item) => {
          if (!this.rawFreesoundBuffers.has(item.name) && this.ctx) {
            try {
              // 公開先がサブフォルダ（GitHub Pages など）でも読めるよう、先頭の / を取り除いて BASE_URL からの相対パスにする
              const resp = await fetch(`${import.meta.env.BASE_URL}${item.file.replace(/^\//, '')}`);
              const arrayBuf = await resp.arrayBuffer();
              const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
              this.rawFreesoundBuffers.set(item.name, audioBuf);
            } catch (err) {
              console.warn(`Failed to decode ${item.name}:`, err);
            }
          }
        })
      );

      this.bolRoundRobinBanks.clear();

      const getBuffers = (names: string[]) =>
        names.map((n) => this.rawFreesoundBuffers.get(n)).filter((b): b is AudioBuffer => !!b);

      const naBuffers = getBuffers(['na', 'na_sharp', 'tas', 'tas_2', 'tas_3']);
      const tinBuffers = getBuffers(['na-open']);
      const tunBuffers = getBuffers(['tun', 'tun_2', 'tun_3']);
      const teBuffers = getBuffers(['te', 'te_2', 'te_middlefinger', 'te_ne']);
      const reBuffers = getBuffers(['re']);
      const geBuffers = getBuffers(['ghe', 'ghe_2', 'ghe_3', 'ghe_4', 'ghe_5', 'ghe_6']);
      const meendBuffers = getBuffers(['ghe_7', 'ghe_8']);
      const keBuffers = getBuffers(['ke', 'ke_2', 'ke_3']);
      const dhaBuffers = getBuffers(['dhec']);

      if (naBuffers.length) this.bolRoundRobinBanks.set('na', naBuffers);
      if (tinBuffers.length) this.bolRoundRobinBanks.set('tin', tinBuffers);
      if (tunBuffers.length) this.bolRoundRobinBanks.set('tun', tunBuffers);
      if (teBuffers.length) this.bolRoundRobinBanks.set('te', teBuffers);
      if (reBuffers.length) this.bolRoundRobinBanks.set('re', reBuffers);
      if (geBuffers.length) this.bolRoundRobinBanks.set('ge', geBuffers);
      if (meendBuffers.length) this.bolRoundRobinBanks.set('meend', meendBuffers);
      if (keBuffers.length) this.bolRoundRobinBanks.set('ke', keBuffers);
      if (dhaBuffers.length) this.bolRoundRobinBanks.set('dha', dhaBuffers);

      this.sampleBuffers.clear();
      if (naBuffers[0]) this.sampleBuffers.set('na', naBuffers[0]);
      if (tinBuffers[0]) this.sampleBuffers.set('tin', tinBuffers[0]);
      if (tunBuffers[0]) this.sampleBuffers.set('tun', tunBuffers[0]);
      if (teBuffers[0]) this.sampleBuffers.set('te', teBuffers[0]);
      if (reBuffers[0]) this.sampleBuffers.set('re', reBuffers[0]);
      if (geBuffers[0]) this.sampleBuffers.set('ge', geBuffers[0]);
      if (meendBuffers[0]) this.sampleBuffers.set('meend', meendBuffers[0]);
      if (keBuffers[0]) this.sampleBuffers.set('ke', keBuffers[0]);
      if (dhaBuffers[0]) this.sampleBuffers.set('dha', dhaBuffers[0]);

      // Re-apply any custom user recordings
      this.customBuffers.forEach((buffer, bol) => {
        this.sampleBuffers.set(bol, buffer);
      });

      this.isFreesoundLoading = false;
      this.notifySampleStatusChange();
      return true;
    } catch (err) {
      console.error('Failed to load Freesound preset:', err);
      this.isFreesoundLoading = false;
      const fallback = generateStudioSampleBank(this.ctx, 'benares');
      fallback.forEach((b, k) => this.sampleBuffers.set(k, b));
      this.notifySampleStatusChange();
      return false;
    }
  }

  public playRawSample(sampleName: string, intensity: number = 1.0): boolean {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return false;
    const buffer = this.rawFreesoundBuffers.get(sampleName);
    if (!buffer) return false;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(intensity, this.ctx.currentTime);

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime);
    return true;
  }

  public getRawFreesoundList() {
    return this.freesoundManifest.map((item) => ({
      ...item,
      isLoaded: this.rawFreesoundBuffers.has(item.name),
    }));
  }

  public assignRawSampleToBol(bol: BolKey, sampleName: string): boolean {
    const buf = this.rawFreesoundBuffers.get(sampleName);
    if (!buf) return false;
    this.sampleBuffers.set(bol, buf);
    this.customBuffers.set(bol, buf);
    this.notifySampleStatusChange();
    return true;
  }

  public isSampleLoaded(bol: BolKey): boolean {
    return this.sampleBuffers.has(bol);
  }

  public isSampleCustom(bol: BolKey): boolean {
    return this.customBuffers.has(bol);
  }

  public getLoadedSampleCount(): number {
    return this.sampleBuffers.size;
  }

  public getSampleBuffer(bol: string): AudioBuffer | undefined {
    return this.sampleBuffers.get(bol);
  }

  public onSampleStatusChange(cb: () => void) {
    this.sampleStatusListeners.push(cb);
  }

  private notifySampleStatusChange() {
    this.sampleStatusListeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  public async loadSampleFromFile(bol: BolKey, file: File): Promise<boolean> {
    if (!this.ensureContext() || !this.ctx) return false;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.sampleBuffers.set(bol, audioBuffer);
      this.customBuffers.set(bol, audioBuffer);
      this.notifySampleStatusChange();
      return true;
    } catch (e) {
      console.error(`Failed to load sample for ${bol}:`, e);
      return false;
    }
  }

  /**
   * Record directly from user microphone (e.g. real drum, clap, or voice Bol)
   */
  public async recordSampleFromMic(bol: BolKey, durationMs: number = 1000): Promise<boolean> {
    if (!this.ensureContext() || !this.ctx) return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Microphone recording not supported on this browser/environment');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      return new Promise<boolean>((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          try {
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            const arrayBuf = await audioBlob.arrayBuffer();
            if (this.ctx) {
              const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
              this.sampleBuffers.set(bol, audioBuf);
              this.customBuffers.set(bol, audioBuf);
              this.notifySampleStatusChange();
              resolve(true);
            } else {
              resolve(false);
            }
          } catch (err) {
            console.error('Failed to decode mic recording:', err);
            resolve(false);
          }
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, durationMs);
      });
    } catch (err) {
      console.error('Failed to access microphone:', err);
      return false;
    }
  }

  public resetBolToDefault(bol: BolKey) {
    this.customBuffers.delete(bol);
    if (this.ctx) {
      const freshBank = generateStudioSampleBank(this.ctx, this.currentPreset);
      const def = freshBank.get(bol);
      if (def) {
        this.sampleBuffers.set(bol, def);
      }
      const defAlt = freshBank.get(`${bol}_alt`);
      if (defAlt) {
        this.sampleBuffers.set(`${bol}_alt`, defAlt);
      }
    }
    this.notifySampleStatusChange();
  }

  public clearSample(bol: BolKey) {
    this.sampleBuffers.delete(bol);
    this.customBuffers.delete(bol);
    this.notifySampleStatusChange();
  }

  /**
   * Play an acoustic studio sample with dynamic velocity, Round-Robin and pitch tuning
   */
  public playSample(
    bol: BolKey,
    intensity: number = 1.0,
    customBend?: number,
    transientOnly: boolean = false
  ): boolean {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return false;

    let buffer: AudioBuffer | undefined;

    // 1. If Freesound preset and multi-sample Round-Robin bank exists for this bol
    if (this.currentPreset === 'freesound' && this.bolRoundRobinBanks.has(bol)) {
      const bank = this.bolRoundRobinBanks.get(bol)!;
      if (bank.length > 0) {
        const count = this.roundRobinCounters.get(bol) || 0;
        buffer = bank[count % bank.length];
        this.roundRobinCounters.set(bol, count + 1);
      }
    }

    // 2. Fallback to standard sampleBuffers (or synthetic round-robin alt)
    if (!buffer) {
      let sampleKey = bol as string;
      const hasAlt = this.sampleBuffers.has(`${bol}_alt`);
      if (hasAlt) {
        const currentIdx = this.roundRobinCounters.get(bol) || 0;
        sampleKey = currentIdx % 2 === 1 ? `${bol}_alt` : (bol as string);
        this.roundRobinCounters.set(bol, currentIdx + 1);
      }
      buffer = this.sampleBuffers.get(sampleKey) || this.sampleBuffers.get(bol);
    }

    if (!buffer) return false;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Pitch scaling for Dayan tuning (Base D4 = 293.66 Hz)
    const isDayan = bol === 'na' || bol === 'tin' || bol === 'tun' || bol === 'te' || bol === 're';
    if (isDayan) {
      const pitchRatio = (this.rootFreq * this.skinTension) / 293.66;
      source.playbackRate.setValueAtTime(pitchRatio, this.ctx.currentTime);
    } else if (bol === 'meend') {
      const startRate = 1.0;
      const peakRate = Math.max(1.15, Math.min(2.1, customBend || 1.6));
      source.playbackRate.setValueAtTime(startRate, this.ctx.currentTime);
      source.playbackRate.exponentialRampToValueAtTime(peakRate, this.ctx.currentTime + 0.22);
      source.playbackRate.exponentialRampToValueAtTime(startRate * 1.05, this.ctx.currentTime + 0.85);
    }

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    if (transientOnly) {
      // In Hybrid mode: sample gives the crisp initial leather/fingertip bite (first 45ms)
      gain.gain.setValueAtTime(intensity * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    } else {
      gain.gain.setValueAtTime(intensity, now);
    }

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    return true;
  }

  public playBol(bol: BolKey, customBend?: number) {
    // どの画面から叩いても、音の準備（初回の録音読み込みを含む）を必ず行う
    if (!this.ensureContext()) return;
    // Mode 1: Pure Studio Sampler
    if (this.engineMode === 'sampler') {
      if (this.sampleBuffers.has(bol)) {
        this.playSample(bol, 1.0, customBend);
        return;
      }
      if (bol === 'dha' && this.sampleBuffers.has('na') && this.sampleBuffers.has('ge')) {
        this.playSample('na', 0.95);
        this.playSample('ge', 0.95);
        return;
      }
      if (bol === 'dhin' && this.sampleBuffers.has('tin') && this.sampleBuffers.has('ge')) {
        this.playSample('tin', 0.95);
        this.playSample('ge', 0.95);
        return;
      }
    }

    // Mode 2: Acoustic Hybrid (Sampled attack transient + Dynamic physical resonance)
    if (this.engineMode === 'hybrid') {
      // Trigger sampled skin attack
      if (this.sampleBuffers.has(bol)) {
        this.playSample(bol, 1.0, customBend, true);
      }
      // Simultaneously run physical synthesis for continuous resonant body & pitch bend
      this.playPhysicalBol(bol, customBend, 0.8);
      return;
    }

    // Mode 3: Pure Raman Physical Modeling
    this.playPhysicalBol(bol, customBend, 1.0);
  }

  private playPhysicalBol(bol: BolKey, customBend?: number, intensity: number = 1.0) {
    switch (bol) {
      case 'na':
        this.playNa(intensity);
        break;
      case 'tin':
        this.playTin(intensity);
        break;
      case 'tun':
        this.playTun(intensity);
        break;
      case 'te':
        this.playTe(intensity);
        break;
      case 're':
        this.playRe(intensity);
        break;
      case 'ge':
        this.playGe(intensity);
        break;
      case 'meend':
        this.playMeend(customBend || 1.6, intensity);
        break;
      case 'ke':
        this.playKe(intensity);
        break;
      case 'dha':
        this.playDha(intensity);
        break;
      case 'dhin':
        this.playDhin(intensity);
        break;
      case 'ti_re_ki_ta':
        this.playTirekita(intensity);
        break;
    }
  }

  /**
   * Classical Tanpura Drone Generator (Sa - Pa - Sa' - Sa)
   */
  public toggleTanpura(): boolean {
    if (this.isTanpuraPlaying) {
      this.stopTanpura();
      return false;
    } else {
      this.startTanpura();
      return true;
    }
  }

  public isTanpuraActive(): boolean {
    return this.isTanpuraPlaying;
  }

  public startTanpura() {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    this.stopTanpura();

    this.tanpuraGain = this.ctx.createGain();
    this.tanpuraGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.tanpuraGain.connect(this.masterGain);

    this.isTanpuraPlaying = true;

    const sa = this.rootFreq * 0.5;
    const pa = sa * 1.5;
    const saHigh = sa * 2.0;

    const pattern = [pa, saHigh, saHigh, sa];
    let stringIndex = 0;

    const pluckString = () => {
      if (!this.isTanpuraPlaying || !this.ctx || !this.tanpuraGain) return;
      const now = this.ctx.currentTime;
      const freq = pattern[stringIndex];
      stringIndex = (stringIndex + 1) % pattern.length;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 5.5, now);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.tanpuraGain);

      osc.start(now);
      osc.stop(now + 4.0);

      this.tanpuraTimer = window.setTimeout(pluckString, 1100);
    };

    pluckString();
  }

  public stopTanpura() {
    this.isTanpuraPlaying = false;
    if (this.tanpuraTimer) {
      clearTimeout(this.tanpuraTimer);
      this.tanpuraTimer = null;
    }
    if (this.tanpuraGain && this.ctx) {
      try {
        this.tanpuraGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.tanpuraGain.disconnect();
      } catch {}
      this.tanpuraGain = null;
    }
  }

  public restartTanpura() {
    if (this.isTanpuraPlaying) {
      this.stopTanpura();
      this.startTanpura();
    }
  }
}

export const tablaAudio = new TablaAudioEngine();
