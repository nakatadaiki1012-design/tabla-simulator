/**
 * シタール＆タンプーラ音源
 * - 倍音加算合成＋ジャワーリー（平らな駒による「ビーン」という唸り：強調される倍音帯域が時間とともに高→低へ移動）
 * - ミーンド（弦を横に引いて音程を滑らせる）は再生速度の連続変化で表現
 * - 共鳴弦（タラフ）：同じ音名の弦が遅れてふわっと鳴る
 * - タブラー音源（tablaAudio）と同じ AudioContext・リバーブ・リミッターに混ぜて鳴らす
 */
import { tablaAudio } from './tablaAudioEngine';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PluckOpts {
  dur?: number; decay?: number; tilt?: number; pluckPos?: number; jawari?: number; jw?: number;
  jc0?: number; jc1?: number; jtau?: number; maxH?: number; soft?: number; click?: number; seed?: number;
  inharm?: number; hdamp?: number;
}

/** 撥弦音の合成（Float32Array を返す純粋関数） */
export function renderPluck(f0: number, sr: number, opts: PluckOpts = {}): Float32Array {
  const o = {
    dur: 3, decay: 1.3, tilt: 0.75, pluckPos: 0.13, jawari: 3, jw: 3.5, jc0: 26, jc1: 5, jtau: 0.8,
    maxH: 48, soft: 0, click: 0.25, seed: 1, inharm: 0.00004, hdamp: 0.075, ...opts,
  };
  const r = rng(o.seed);
  const n = Math.floor(o.dur * sr);
  const out = new Float32Array(n);
  const maxH = Math.max(1, Math.min(o.maxH, Math.floor(Math.min(sr * 0.45, 12000) / f0)));
  const BLK = 64;
  const nb = Math.ceil(n / BLK) + 1;
  const center = new Float32Array(nb);
  for (let b = 0; b < nb; b++) center[b] = o.jc1 + (o.jc0 - o.jc1) * Math.exp(-(b * BLK / sr) / o.jtau);
  for (let h = 1; h <= maxH; h++) {
    const fh = f0 * h * Math.sqrt(1 + o.inharm * h * h);
    if (fh > sr * 0.45) break;
    const a0 = (Math.abs(Math.sin(Math.PI * h * o.pluckPos)) + 0.05) / Math.pow(h, o.tilt);
    const tau = o.decay / (1 + o.hdamp * Math.pow(h, 1.25)); // 高い倍音ほど早く減衰
    const w = (2 * Math.PI * fh) / sr;
    const c = Math.cos(w), s = Math.sin(w);
    const phi = r() * 2 * Math.PI;
    let x = Math.cos(phi), y = Math.sin(phi);
    const ampAt = (b: number) => {
      const t = (b * BLK) / sr, d = h - center[b];
      return a0 * Math.exp(-t / tau) * (1 + o.jawari * Math.exp(-(d * d) / (2 * o.jw * o.jw)));
    };
    let aPrev = ampAt(0);
    for (let b = 0; b * BLK < n; b++) {
      const aNext = ampAt(b + 1);
      if (aPrev < 1e-6 && aNext < 1e-6 && (b * BLK) / sr > 0.2) break;
      const i0 = b * BLK, i1 = Math.min(n, i0 + BLK), da = (aNext - aPrev) / BLK;
      let a = aPrev;
      for (let i = i0; i < i1; i++) {
        out[i] += a * y;
        const nx = x * c - y * s; y = x * s + y * c; x = nx;
        a += da;
      }
      const g = 1 / Math.sqrt(x * x + y * y); x *= g; y *= g;
      aPrev = aNext;
    }
  }
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  if (o.click > 0) { // ミズラーブ（金属の爪）のアタック
    const m = Math.floor(sr * 0.012);
    let prevIn = 0, prevOut = 0;
    const a = Math.exp(-2 * Math.PI * 1800 / sr);
    for (let i = 0; i < m; i++) {
      const v = (r() * 2 - 1) * Math.exp(-i / (sr * 0.0025));
      const hp = a * (prevOut + v - prevIn); prevIn = v; prevOut = hp; // 簡易ハイパス
      out[i] += hp * o.click * pk;
    }
  }
  if (o.soft > 0) for (let i = 0; i < n; i++) out[i] *= 1 - Math.exp(-(i / sr) / o.soft);
  else { const att = Math.floor(sr * 0.001); for (let i = 0; i < att; i++) out[i] *= i / att; }
  pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  if (pk > 0) for (let i = 0; i < n; i++) out[i] *= 0.9 / pk;
  const fade = Math.min(n, Math.floor(sr * Math.min(1.2, o.dur * 0.2)));
  for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return out;
}

export type SitarStroke = 'Da' | 'Ra';
export interface Meend { at: number; to: number; dur: number } // at/dur: 秒（相対）, to: 半音
export type SitarEvent =
  | { type: 'note'; semi: number; stroke: SitarStroke; meend?: Meend[] | null; time: number }
  | { type: 'chikari'; time: number }
  | { type: 'taraf'; index: number; time: number };

class SitarEngine {
  private cache = new Map<string, AudioBuffer>();
  private bus: GainNode | null = null;
  private tBus: GainNode | null = null;
  private tanBus: GainNode | null = null;
  private lastMain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private listeners = new Set<(e: SitarEvent) => void>();
  private tanTimer: number | null = null;
  public sa = 146.83; // サ（主音）：タブラーの右の太鼓の1オクターブ下
  public taraf: number[] = [];
  public tanpuraOn = false;
  public tanpuraFirst = 7; // 第1弦：パ（ラーガにパが無ければマなど）

  private ctx(): AudioContext | null { return tablaAudio.getContext(); }

  private ensureBus() {
    const ctx = this.ctx(), out = tablaAudio.getInput();
    if (!ctx || !out) return false;
    if (!this.bus) {
      this.bus = ctx.createGain(); this.bus.gain.value = 0.55; this.bus.connect(out);
      this.tBus = ctx.createGain(); this.tBus.gain.value = 0.3; this.tBus.connect(out);
      this.tanBus = ctx.createGain(); this.tanBus.gain.value = 0.22; this.tanBus.connect(out);
    }
    return true;
  }

  hz(semi: number) { return this.sa * Math.pow(2, semi / 12); }
  setSa(hz: number) { if (Math.abs(hz - this.sa) > 0.01) { this.sa = hz; this.cache.clear(); } }

  private buf(hz: number, kind: 'da' | 'ra' | 'chik' | 'taraf' | 'tan', seed = 0): AudioBuffer | null {
    const ctx = this.ctx(); if (!ctx) return null;
    const key = kind + hz.toFixed(2) + ':' + seed;
    const hit = this.cache.get(key); if (hit) return hit;
    const s = Math.round(hz) + seed;
    const o: PluckOpts =
      kind === 'da' ? { dur: 5, decay: 1.3, tilt: 0.72, jawari: 3.2, jc0: 26, jc1: 6, jtau: 0.7, click: 0.3, seed: s }
      : kind === 'ra' ? { dur: 4.5, decay: 1.1, tilt: 0.9, jawari: 2.6, jc0: 22, jc1: 5, jtau: 0.6, click: 0.18, seed: s + 5 }
      : kind === 'chik' ? { dur: 2.2, decay: 0.45, tilt: 0.7, jawari: 3, jc0: 18, jc1: 4, jtau: 0.3, click: 0.35, maxH: 24, seed: s + 9 }
      : kind === 'taraf' ? { dur: 4.5, decay: 1.3, tilt: 0.9, jawari: 2.5, jc0: 20, jc1: 4, jtau: 0.8, click: 0, soft: 0.07, maxH: 20, seed: s + 2 }
      : { dur: 8, decay: 2.6, jawari: 3.5, jw: 4, jc0: 26, jc1: 7, jtau: 2.2, maxH: 60, tilt: 0.6, click: 0.05, soft: 0.01, seed: s + 3 };
    const data = renderPluck(hz, ctx.sampleRate, o);
    const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
    b.getChannelData(0).set(data);
    this.cache.set(key, b);
    return b;
  }

  /** 弾く前に音を作っておく（弾いた瞬間の遅れを防ぐ）。少しずつ作るので画面は固まらない */
  prerender(semis: number[], done?: () => void) {
    const list = semis.slice();
    const step = () => {
      const s = list.shift();
      if (s == null) { done?.(); return; }
      this.buf(this.hz(s), 'da');
      window.setTimeout(step, 4);
    };
    step();
  }

  private play(b: AudioBuffer, when: number, dest: AudioNode, gain: number) {
    const ctx = this.ctx()!;
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(dest);
    src.start(Math.max(when, ctx.currentTime));
    return { src, gain: g };
  }

  private emit(e: SitarEvent) {
    const ctx = this.ctx(); if (!ctx) return;
    const delay = Math.max(0, (e.time - ctx.currentTime) * 1000);
    window.setTimeout(() => this.listeners.forEach((f) => f(e)), delay);
  }
  on(f: (e: SitarEvent) => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }

  now() { const c = this.ctx(); return c ? c.currentTime : 0; }

  /** 主弦を弾く。when 省略で今すぐ */
  pluck(semi: number, when?: number, opts: { stroke?: SitarStroke; meend?: Meend[] | null; vel?: number } = {}) {
    if (!this.ensureBus()) return null;
    const ctx = this.ctx()!;
    const t = Math.max(when ?? ctx.currentTime + 0.005, ctx.currentTime);
    const stroke = opts.stroke ?? 'Da';
    const b = this.buf(this.hz(semi), stroke === 'Ra' ? 'ra' : 'da'); if (!b) return null;
    // 主弦は1本なので、新しく弾くと前の音は止まる
    if (this.lastMain) {
      try { this.lastMain.gain.gain.setTargetAtTime(0, t, 0.015); this.lastMain.src.stop(t + 0.3); } catch { /* noop */ }
    }
    const v = (opts.vel ?? 1) * (stroke === 'Ra' ? 0.8 : 1);
    const voice = this.play(b, t, this.bus!, v);
    this.lastMain = voice;
    for (const m of opts.meend ?? []) {
      const ratio = Math.pow(2, (m.to - semi) / 12);
      voice.src.playbackRate.setValueAtTime(voice.src.playbackRate.value, t + m.at);
      voice.src.playbackRate.linearRampToValueAtTime(ratio, t + m.at + m.dur);
    }
    // 共鳴弦：同じ音名の弦が鳴る
    const pc = ((semi % 12) + 12) % 12;
    const last = opts.meend && opts.meend.length ? opts.meend[opts.meend.length - 1] : null;
    const fpc = last ? (((last.to % 12) + 12) % 12) : pc;
    this.taraf.forEach((ts, i) => {
      const tpc = ((ts % 12) + 12) % 12;
      if (tpc !== pc && tpc !== fpc) return;
      const d = tpc === pc ? 0.02 : (last!.at + 0.1);
      const tb = this.buf(this.hz(ts), 'taraf');
      if (tb) this.play(tb, t + d, this.tBus!, 0.5 * (opts.vel ?? 1));
      this.emit({ type: 'taraf', index: i, time: t + d });
    });
    this.emit({ type: 'note', semi, stroke, meend: opts.meend, time: t });
    return voice.src;
  }

  /** 手で弾いている音の音程を動かす（ミーンド） */
  bend(semitones: number, release = false) {
    const ctx = this.ctx(); if (!ctx || !this.lastMain) return;
    try { this.lastMain.src.playbackRate.setTargetAtTime(Math.pow(2, semitones / 12), ctx.currentTime, release ? 0.06 : 0.015); } catch { /* noop */ }
  }

  /** チカリ弦（高いサ）をジャラン */
  chikari(when?: number, vel = 0.7) {
    if (!this.ensureBus()) return;
    const ctx = this.ctx()!;
    const t = Math.max(when ?? ctx.currentTime + 0.005, ctx.currentTime);
    const b1 = this.buf(this.hz(24), 'chik'), b2 = this.buf(this.hz(12), 'chik');
    if (b1) this.play(b1, t, this.bus!, vel * 0.55);
    if (b2) this.play(b2, t + 0.004, this.bus!, vel * 0.4);
    this.emit({ type: 'chikari', time: t });
  }

  startTanpura() {
    if (!this.ensureBus() || this.tanpuraOn) return;
    const ctx = this.ctx()!;
    this.tanpuraOn = true;
    let next = ctx.currentTime + 0.1, idx = 0;
    const strings = () => [this.hz(this.tanpuraFirst - 12), this.sa, this.sa, this.sa / 2];
    const tick = () => {
      if (!this.tanpuraOn) return;
      while (next < ctx.currentTime + 0.5) {
        const b = this.buf(strings()[idx], 'tan', idx);
        if (b) this.play(b, next, this.tanBus!, idx === 3 ? 1 : 0.8);
        next += idx === 3 ? 1.9 : 1.15;
        idx = (idx + 1) % 4;
      }
      this.tanTimer = window.setTimeout(tick, 120);
    };
    tick();
  }
  stopTanpura() { this.tanpuraOn = false; if (this.tanTimer) window.clearTimeout(this.tanTimer); }
}

export const sitarAudio = new SitarEngine();
