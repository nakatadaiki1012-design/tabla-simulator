/**
 * High-Fidelity Acoustic Studio Sample Generator for Tabla & Bayan
 * Generates pristine PCM AudioBuffers modeling real recorded studio instruments.
 * Supports multiple sound bank presets (Benares Classical, Delhi Crisp, Bronze Bayan)
 * and Round-Robin variations for natural human performance without machine-gun effect.
 */

import { BolKey, SoundBankPreset } from '../types/tabla';

interface PresetConfig {
  saFreq: number; // Fundamental Dayan Sa
  bayanCavityFreq: number; // Bayan Helmholtz resonance
  woodWarmth: number; // Sheesham wood body warmth
  rimCrispness: number; // Metallic rim attack intensity
  meendRange: number; // Pitch slide maximum multiplier
}

const PRESET_CONFIGS: Record<SoundBankPreset, PresetConfig> = {
  freesound: {
    saFreq: 293.66,
    bayanCavityFreq: 73.4,
    woodWarmth: 0.35,
    rimCrispness: 0.95,
    meendRange: 1.6,
  },
  benares: {
    saFreq: 293.66, // D4
    bayanCavityFreq: 71.5, // Deep thunderous Benares kettle
    woodWarmth: 0.38,
    rimCrispness: 0.85,
    meendRange: 1.65,
  },
  delhi: {
    saFreq: 311.13, // D#4 (Higher, snappy Delhi solo pitch)
    bayanCavityFreq: 78.0,
    woodWarmth: 0.22,
    rimCrispness: 1.15,
    meendRange: 1.5,
  },
  bronze: {
    saFreq: 277.18, // C#4 (Grave classical sitar accompaniment)
    bayanCavityFreq: 65.4, // Heavy bronze sub-bass
    woodWarmth: 0.45,
    rimCrispness: 0.72,
    meendRange: 1.85,
  },
  custom: {
    saFreq: 293.66,
    bayanCavityFreq: 73.4,
    woodWarmth: 0.3,
    rimCrispness: 0.9,
    meendRange: 1.6,
  },
};

/**
 * Generate full sample bank for all Bols for a specific preset
 */
export function generateStudioSampleBank(
  ctx: AudioContext,
  preset: SoundBankPreset = 'benares'
): Map<string, AudioBuffer> {
  const bank = new Map<string, AudioBuffer>();
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS.benares;
  const sampleRate = ctx.sampleRate;

  // 1. NA (Round-Robin: na_0, na_1)
  bank.set('na', generateNaSample(ctx, config, 0));
  bank.set('na_alt', generateNaSample(ctx, config, 1));

  // 2. TIN
  bank.set('tin', generateTinSample(ctx, config));

  // 3. TUN
  bank.set('tun', generateTunSample(ctx, config));

  // 4. TE (Closed Syahi mute, Round-Robin)
  bank.set('te', generateTeSample(ctx, config, 0));
  bank.set('te_alt', generateTeSample(ctx, config, 1));

  // 5. RE (Index Syahi mute, Round-Robin)
  bank.set('re', generateReSample(ctx, config, 0));
  bank.set('re_alt', generateReSample(ctx, config, 1));

  // 6. GE (Bayan open resonant bass, Round-Robin)
  bank.set('ge', generateGeSample(ctx, config, 0));
  bank.set('ge_alt', generateGeSample(ctx, config, 1));

  // 7. MEEND (Bayan gliding bass slide)
  bank.set('meend', generateMeendSample(ctx, config));

  // 8. KE (Bayan flat palm mute slap)
  bank.set('ke', generateKeSample(ctx, config));

  // 9. DHA (Composite Na + Ge stereo image)
  bank.set('dha', generateCompositeSample(ctx, bank.get('na')!, bank.get('ge')!, 0.95, 0.95));

  // 10. DHIN (Composite Tin + Ge)
  bank.set('dhin', generateCompositeSample(ctx, bank.get('tin')!, bank.get('ge')!, 0.92, 0.95));

  return bank;
}

/**
 * NA / TA: High-tension rim stroke with ring finger resting on Syahi.
 * Pure bell-like Singing Mode (1,1) with Raman degenerate splitting (shimmer).
 */
function generateNaSample(
  ctx: AudioContext,
  config: PresetConfig,
  variation: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 1.35;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const sa = config.saFreq;
  const fSinging = sa * 2.0; // 2nd harmonic bell pitch
  const splitDelta = 1.8 + (variation === 1 ? 0.35 : 0); // Raman beating
  const f3 = sa * 3.0; // 3rd harmonic
  const f4 = sa * 4.0; // 4th metallic harmonic

  const decayMain = 2.4;
  const decayF3 = 5.2;
  const decayF4 = 8.5;

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;

    // 1. Viscoelastic goat skin attack impulse transient (0 - 25ms)
    let attackTransient = 0;
    if (t < 0.035) {
      const window = Math.sin((t / 0.035) * Math.PI);
      const noise = (Math.random() * 2 - 1) * Math.sin(t * 14000);
      attackTransient = noise * window * Math.exp(-t * 110) * config.rimCrispness * 0.45;
    }

    // 2. Principal Singing Bell Harmonic with Raman Mode Splitting
    const envSinging = Math.exp(-t * decayMain);
    const mode1a = Math.sin(2 * Math.PI * fSinging * t);
    const mode1b = Math.sin(2 * Math.PI * (fSinging + splitDelta) * t) * 0.38;
    const singingWave = (mode1a + mode1b) * envSinging * 0.65;

    // 3. Higher Overtone Modes (Chladni radial/nodal modes)
    const envF3 = Math.exp(-t * decayF3);
    const mode3 = Math.sin(2 * Math.PI * f3 * t) * envF3 * 0.28;

    const envF4 = Math.exp(-t * decayF4);
    const mode4 = Math.sin(2 * Math.PI * f4 * t) * envF4 * 0.14;

    // 4. Muted fundamental (damped by resting ring finger)
    const envF0 = Math.exp(-t * 14.0);
    const mode0 = Math.sin(2 * Math.PI * sa * t) * envF0 * 0.18;

    // 5. Wood body warmth (Sheesham resonance)
    const envWood = Math.exp(-t * 9.0);
    const woodMode = Math.sin(2 * Math.PI * (sa * 0.85) * t) * envWood * config.woodWarmth * 0.2;

    const totalSample = (attackTransient + singingWave + mode3 + mode4 + mode0 + woodMode) * 0.85;

    // Stereo panning: Dayan panned slightly right (65% R, 35% L)
    left[i] = totalSample * 0.82;
    right[i] = totalSample * 1.0;
  }

  return buffer;
}

/**
 * TIN: Fleshy strike on Maidan (sur)
 */
function generateTinSample(ctx: AudioContext, config: PresetConfig): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 1.05;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const sa = config.saFreq;
  const f2 = sa * 2.0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;

    // Soft fleshy attack
    let attack = 0;
    if (t < 0.04) {
      attack = (Math.random() * 2 - 1) * Math.sin((t / 0.04) * Math.PI) * Math.exp(-t * 90) * 0.25;
    }

    // Warm resonant fundamental
    const env0 = Math.exp(-t * 3.2);
    const mode0 = Math.sin(2 * Math.PI * sa * t) * env0 * 0.48;

    // Singing 2nd harmonic
    const env2 = Math.exp(-t * 2.8);
    const mode2 = Math.sin(2 * Math.PI * f2 * t) * env2 * 0.58;

    const sample = (attack + mode0 + mode2) * 0.8;
    left[i] = sample * 0.85;
    right[i] = sample * 1.0;
  }

  return buffer;
}

/**
 * TUN: Open bell strike on Syahi center with prolonged sustain
 */
function generateTunSample(ctx: AudioContext, config: PresetConfig): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 2.1;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const sa = config.saFreq;
  const f2 = sa * 2.0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;

    // Pitch relaxation: starts +3.2 Hz sharp, settles to Sa
    const pitch = sa + 3.2 * Math.exp(-t * 6.5);
    const env = Math.exp(-t * 1.65);
    const mode0 = Math.sin(2 * Math.PI * pitch * t) * env * 0.78;

    // Bell overtones
    const env2 = Math.exp(-t * 2.4);
    const mode2 = Math.sin(2 * Math.PI * f2 * t) * env2 * 0.35;

    const sample = (mode0 + mode2) * 0.88;
    left[i] = sample * 0.88;
    right[i] = sample * 1.0;
  }

  return buffer;
}

/**
 * TE: Middle/ring finger mute slap on central black Syahi
 */
function generateTeSample(
  ctx: AudioContext,
  config: PresetConfig,
  variation: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 0.14;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const pitch = (config.saFreq * 1.45) * (variation === 1 ? 1.04 : 0.98);

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 38.0);
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 85.0) * 0.45;
    const body = Math.sin(2 * Math.PI * pitch * t) * env * 0.55;

    const sample = (click + body) * 0.85;
    left[i] = sample * 0.9;
    right[i] = sample * 1.0;
  }

  return buffer;
}

/**
 * RE: Index finger mute slap on Syahi
 */
function generateReSample(
  ctx: AudioContext,
  config: PresetConfig,
  variation: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 0.12;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const pitch = (config.saFreq * 1.62) * (variation === 1 ? 1.03 : 0.97);

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 44.0);
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 95.0) * 0.5;
    const body = Math.sin(2 * Math.PI * pitch * t) * env * 0.5;

    const sample = (click + body) * 0.85;
    left[i] = sample * 0.9;
    right[i] = sample * 1.0;
  }

  return buffer;
}

/**
 * GE: Open resonant bass on Bayan (Helmholtz cavity resonance)
 */
function generateGeSample(
  ctx: AudioContext,
  config: PresetConfig,
  variation: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 1.45;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const f0 = config.bayanCavityFreq * (variation === 1 ? 1.02 : 1.0);
  const fHarm = f0 * 1.98;

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;

    // Fleshy palm contact thump
    let thump = 0;
    if (t < 0.05) {
      thump = (Math.random() * 2 - 1) * Math.sin(t * 500) * Math.exp(-t * 55) * 0.35;
    }

    // Deep cavity fundamental resonance
    const pitch = f0 * (1 + 0.04 * Math.exp(-t * 18));
    const env0 = Math.exp(-t * 2.2);
    const wave0 = Math.sin(2 * Math.PI * pitch * t) * env0 * 0.85;

    // 2nd harmonic cavity mode
    const envHarm = Math.exp(-t * 5.0);
    const waveHarm = Math.sin(2 * Math.PI * fHarm * t) * envHarm * 0.22;

    const sample = (thump + wave0 + waveHarm) * 0.95;

    // Bayan panned slightly left (70% L, 30% R)
    left[i] = sample * 1.0;
    right[i] = sample * 0.78;
  }

  return buffer;
}

/**
 * MEEND: Continuous pitch slide on Bayan with natural palm dampening
 */
function generateMeendSample(ctx: AudioContext, config: PresetConfig): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 1.35;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const f0 = config.bayanCavityFreq;
  const fPeak = f0 * config.meendRange;

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;

    // Dynamic pitch curve: climbs to peak at 0.22s, then gently settles
    let currentFreq = f0;
    if (t < 0.22) {
      currentFreq = f0 + (fPeak - f0) * Math.sin((t / 0.22) * (Math.PI / 2));
    } else {
      currentFreq = fPeak - (fPeak - f0 * 1.05) * Math.min(1, (t - 0.22) * 0.85);
    }

    const env = Math.exp(-t * 2.1);
    const wave = Math.sin(2 * Math.PI * currentFreq * t) * env * 0.88;

    left[i] = wave * 1.0;
    right[i] = wave * 0.8;
  }

  return buffer;
}

/**
 * KE: Flat palm slap on Bayan (completely dry non-resonant slap)
 */
function generateKeSample(ctx: AudioContext, config: PresetConfig): AudioBuffer {
  const rate = ctx.sampleRate;
  const duration = 0.09;
  const numSamples = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, numSamples, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;
    const snap = (Math.random() * 2 - 1) * Math.exp(-t * 90.0) * 0.55;
    const thud = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 70.0) * 0.45;

    const sample = (snap + thud) * 0.9;
    left[i] = sample * 1.0;
    right[i] = sample * 0.8;
  }

  return buffer;
}

/**
 * Composite sample (for DHA = Na + Ge, DHIN = Tin + Ge)
 */
function generateCompositeSample(
  ctx: AudioContext,
  sampleA: AudioBuffer,
  sampleB: AudioBuffer,
  gainA: number,
  gainB: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(sampleA.length, sampleB.length);
  const buffer = ctx.createBuffer(2, length, rate);

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const aL = sampleA.getChannelData(0);
  const aR = sampleA.getChannelData(1);
  const bL = sampleB.getChannelData(0);
  const bR = sampleB.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const vAL = i < sampleA.length ? aL[i] * gainA : 0;
    const vAR = i < sampleA.length ? aR[i] * gainA : 0;
    const vBL = i < sampleB.length ? bL[i] * gainB : 0;
    const vBR = i < sampleB.length ? bR[i] * gainB : 0;

    left[i] = (vAL + vBL) * 0.85;
    right[i] = (vAR + vBR) * 0.85;
  }

  return buffer;
}
