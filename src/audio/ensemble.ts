/**
 * シタール × タブラー アンサンブル
 * - 伴奏モード（ジャム）：タブラーがターラ（周期）のテーカを刻み続け、その上で自由にシタールを弾く
 * - 自動アンサンブル：アーラープ → ジョール → ジャーラー →（タブラー参加）ガット → トーダー＆ティハーイー → ドゥルト・ジャーラー
 * 2つの楽器は同じ AudioContext の時計で「先読み予約」するので、ずれない。
 */
import { tablaAudio } from './tablaAudioEngine';
import { sitarAudio, SitarStroke, Meend } from './sitarEngine';
import { BolKey } from '../types/tabla';
import { Raag, ladderOf, parseSargam } from '../data/raags';

export interface EnsembleTaal {
  id: string;
  name: string;
  beats: number;
  vib: number[];
  marks: string[]; // 各ヴィバーグの印：X=サム, 数字=ターリー(手拍子), 0=カーリー(手を振る)
  theka: BolKey[][]; // 1拍ごとのボル（1拍に複数あれば等分）
  label: string[]; // 表示用のボル
  bpm: number;
}

const b = (s: string): BolKey[] => s.split(' ') as BolKey[];
export const ENSEMBLE_TAALS: EnsembleTaal[] = [
  { id: 'teentaal', name: 'ティーンタール（16拍）', beats: 16, vib: [4, 4, 4, 4], marks: ['X', '2', '0', '3'], bpm: 90,
    theka: 'dha dhin dhin dha dha dhin dhin dha dha tin tin na na dhin dhin dha'.split(' ').map((x) => [x as BolKey]),
    label: 'Dha Dhin Dhin Dha Dha Dhin Dhin Dha Dha Tin Tin Ta Ta Dhin Dhin Dha'.split(' ') },
  { id: 'jhaptaal', name: 'ジャプタール（10拍）', beats: 10, vib: [2, 3, 2, 3], marks: ['X', '2', '0', '3'], bpm: 100,
    theka: 'dhin na dhin dhin na tin na dhin dhin na'.split(' ').map((x) => [x as BolKey]),
    label: 'Dhi Na Dhi Dhi Na Ti Na Dhi Dhi Na'.split(' ') },
  { id: 'rupak', name: 'ルーパク（7拍）', beats: 7, vib: [3, 2, 2], marks: ['X/0', '1', '2'], bpm: 110,
    theka: 'tin tin na dhin na dhin na'.split(' ').map((x) => [x as BolKey]),
    label: 'Tin Tin Na Dhi Na Dhi Na'.split(' ') },
  { id: 'ektaal', name: 'エークタール（12拍）', beats: 12, vib: [2, 2, 2, 2, 2, 2], marks: ['X', '0', '2', '0', '3', '4'], bpm: 70,
    theka: [b('dhin'), b('dhin'), b('dha ge'), b('ti_re_ki_ta'), b('tun'), b('na'), b('ke'), b('na'), b('dha ge'), b('ti_re_ki_ta'), b('dhin'), b('na')],
    label: ['Dhin', 'Dhin', 'DhaGe', 'TiRaKiTa', 'Tu', 'Na', 'Kat', 'Ta', 'DhaGe', 'TiRaKiTa', 'Dhi', 'Na'] },
  { id: 'keherwa', name: 'ケヘルワー（8拍）', beats: 8, vib: [4, 4], marks: ['X', '0'], bpm: 110,
    theka: 'dha ge na te na ke dhin na'.split(' ').map((x) => [x as BolKey]),
    label: 'Dha Ge Na Ti Na Ka Dhi Na'.split(' ') },
  { id: 'dadra', name: 'ダードラー（6拍）', beats: 6, vib: [3, 3], marks: ['X', '0'], bpm: 120,
    theka: 'dha dhin na dha tin na'.split(' ').map((x) => [x as BolKey]),
    label: 'Dha Dhi Na Dha Ti Na'.split(' ') },
];

/** 拍ごとの印（サム・ターリー・カーリー） */
export function beatMarks(t: EnsembleTaal) {
  const m: string[] = []; t.vib.forEach((n, v) => { for (let k = 0; k < n; k++) m.push(k === 0 ? t.marks[v] : ''); });
  return m;
}

export interface FlowSection { id: string; no: number; name: string; rom: string; laya: string; tabla: boolean; text: string; point: string }
export const FLOW: FlowSection[] = [
  { id: 'alap', no: 1, name: 'アーラープ', rom: 'Alap', laya: '拍なし・自由なテンポ', tabla: false,
    text: '拍のない導入。主音サを確かめ、低い音域からひとつずつ音を紹介しながらラーガの性格を描きます。',
    point: '音から音へ「滑る」ミーンドと、残響のように鳴る共鳴弦に注目。' },
  { id: 'jor', no: 2, name: 'ジョール', rom: 'Jor', laya: '一定の脈動・ゆっくり加速', tabla: false,
    text: '旋律に一定の「脈」が加わります。メロディ弦とチカリ弦を交互に弾き、だんだん速く高くなります。',
    point: '「音・チャン・音・チャン」というリズム。まだタブラーはいません。' },
  { id: 'jhala', no: 3, name: 'ジャーラー', rom: 'Jhala', laya: '速い・さらに加速', tabla: false,
    text: '旋律の音1つにチカリ弦3つ（Da ra ra ra）を高速で組み合わせる、前半のクライマックス。',
    point: '「ター・ラララ」のきらめく連打。' },
  { id: 'gat', no: 4, name: 'ガット（主題）', rom: 'Gat', laya: 'タブラー登場・中くらい', tabla: true,
    text: '作曲された短い旋律（ガット）を、タブラーのティーンタール（16拍）に乗せて演奏。ここからリズムの周期が始まります。',
    point: 'ガットの頭がサム（1拍目）に来るのを、タブラーと一緒に感じよう。' },
  { id: 'toda', no: 5, name: 'トーダー＋ティハーイー', rom: 'Toda / Tihai', laya: '速いパッセージ', tabla: true,
    text: '速い音階の即興（トーダー）のあと、同じフレーズを3回くり返すティハーイーでサムにぴたりと着地。',
    point: '3回目の最後の「サ」がタブラーの「ダー（サム）」と重なる瞬間。' },
  { id: 'drut', no: 6, name: 'ドゥルト・ジャーラー（終曲）', rom: 'Drut Jhala', laya: '最も速い', tabla: true,
    text: 'タブラーと一緒に最速のジャーラーで盛り上がり、最後のティハーイーでサムに着地して終演。',
    point: '最後の音とタブラーの「ダー」が同時に鳴って終わる。' },
];

type Ev =
  | { t: number; type: 'note'; semi: number; stroke: SitarStroke; meend?: Meend[] | null; vel: number }
  | { t: number; type: 'chik'; vel: number }
  | { t: number; type: 'tabla'; bol: BolKey; vel: number }
  | { t: number; type: 'beat'; b: number }
  | { t: number; type: 'sec'; id: string }
  | { t: number; type: 'final' };

const TEENTAAL = ENSEMBLE_TAALS[0];
const U = (s: string) => s.trim().split(/\s+/);
const tihai = (p: string[], gap: number) => { const g = Array(gap).fill('S'); return [...p, ...g, ...p, ...g, ...p]; };
/** 最後の音がちょうど次のサム（1拍目）に来るよう、前をフィラーで埋める */
function placeOnSam(body: (string | number)[], tih: (string | number)[], cycleUnits: number, filler: (string | number)[]) {
  const all = [...body, ...tih];
  const landing = all.pop()!;
  const k = Math.max(1, Math.ceil(all.length / cycleUnits));
  const need = k * cycleUnits - all.length;
  return { units: [...Array.from({ length: need }, (_, i) => filler[i % filler.length]), ...all], landing };
}

// 位置の書き方：数字＝ラーガの音階上の番号（0=サ、1=次の音…、負＝下）、'O'＝高いサ（O-1 など）
const GAT = U('2 1 0 S 1 2 3 S 4 3 4 5 4 S 3 2 4 5 O S O-1 4 3 S 2 1 2 3 1 -1 0 S');
const TODA = U('0 1 2 3 1 2 3 4 2 3 4 5 3 4 5 6 O O-1 O-2 O-3 O-1 O-2 O-3 O-4 O-2 O-3 O-4 O-5 4 3 2 1');

/** 演奏全体を「何秒後に何を鳴らすか」の一覧にする */
export function buildPerformance(raag: Raag, ids: string[]) {
  const ladder = ladderOf(raag), i0 = ladder.indexOf(0), N = raag.notes.length;
  const pos = (tok: string | number) => { const m = String(tok).match(/^O([+-]\d+)?$/); return m ? N + (m[1] ? +m[1] : 0) : +tok; };
  const semiOf = (tok: string | number) => ladder[Math.max(0, Math.min(ladder.length - 1, i0 + pos(tok)))];
  const ev: Ev[] = []; let t = 0;
  const rnd = (a: number) => 1 + (Math.random() * 2 - 1) * a;
  const note = (tt: number, semi: number, stroke: SitarStroke = 'Da', meend: Meend[] | null = null, vel = 1) => ev.push({ t: tt, type: 'note', semi, stroke, meend, vel });
  const chik = (tt: number, vel: number) => ev.push({ t: tt, type: 'chik', vel });

  if (ids.includes('alap')) {
    ev.push({ t, type: 'sec', id: 'alap' });
    const base = 0.62;
    const phrases = ['c', '0:4', '-1:1 0:3', '-2:1 -1:1 0~1:2 0:3', 'P:' + raag.pakad, '0:1 1:1 2:2 1~2:2 1:1 0:3',
      '2:1 3:1 4:3 3~4:2 3:1 2:1 1~2:1 1:1 0:3', 'A:' + raag.aroha, 'O:3 O-1:1 O-2~O-1:2 O-2:1 O-3:1', 'V:' + raag.avaroha, '0:4', 'c'];
    for (const ph of phrases) {
      if (ph === 'c') { chik(t, 0.8); t += 1.4; continue; }
      if (/^[PAV]:/.test(ph)) {
        const step = ph[0] === 'P' ? base * 0.85 : base * 0.7;
        for (const n of parseSargam(ph.slice(2))) {
          const d = n.len * step * rnd(0.12);
          note(t, n.semi, 'Da', n.to != null ? [{ at: d * 0.3, to: n.to, dur: d * 0.45 }] : null, 0.9);
          t += d;
        }
      } else {
        for (const tok of U(ph)) {
          const [p, len] = tok.split(':'); const d = +len * base * rnd(0.15);
          const [a, bb] = p.split('~');
          note(t, semiOf(a), 'Da', bb != null ? [{ at: d * 0.25, to: semiOf(bb), dur: d * 0.45 }] : null, 0.9);
          t += d;
        }
      }
      t += 0.5;
    }
  }
  if (ids.includes('jor')) {
    ev.push({ t, type: 'sec', id: 'jor' });
    const up = parseSargam(raag.aroha).map((n) => n.semi), down = parseSargam(raag.avaroha).map((n) => n.semi);
    const path = [0, ...up.slice(1), ...down.slice(1)];
    let bpm = 72, prev = 0;
    path.forEach((s, i) => {
      for (let r = 0; r < 2; r++) {
        const spb = 60 / bpm;
        if (r === 0) note(t, i % 3 === 2 ? prev : s, 'Da', i % 3 === 2 && prev !== s ? [{ at: 0.04, to: s, dur: spb * 0.35 }] : null, 0.85);
        else chik(t, 0.55);
        chik(t + spb / 2, 0.6);
        t += spb; bpm += 1.2;
      }
      prev = s;
    });
  }
  if (ids.includes('jhala')) {
    ev.push({ t, type: 'sec', id: 'jhala' });
    const walk: number[] = [];
    for (let i = 0; i <= N; i++) walk.push(i, i);
    for (let i = N - 1; i >= 0; i--) walk.push(i);
    walk.push(0, 0);
    let bpm = 118;
    walk.forEach((p) => {
      const spb = 60 / bpm;
      note(t, semiOf(p), 'Da', null, 0.9);
      for (let k = 1; k < 4; k++) chik(t + (k * spb) / 4, k === 2 ? 0.55 : 0.45);
      t += spb; bpm += 1.6;
    });
    t += 0.6;
  }
  // ここからタブラー参加（ティーンタール）
  let landing: string | number | null = null;
  const playUnits = (units: (string | number)[], sub: number, bpm: number, mode: 'alt' | 'jhala') => {
    const spu = 60 / bpm / sub;
    units.forEach((u, k) => {
      const tt = t + k * spu;
      if (k % sub === 0) {
        const bt = (k / sub) % 16;
        ev.push({ t: tt, type: 'beat', b: bt });
        const isLand = landing != null && k === 0;
        TEENTAAL.theka[bt].forEach((bol) => ev.push({ t: tt, type: 'tabla', bol: isLand ? 'dha' : bol, vel: bt === 0 ? 1 : 0.8 }));
      }
      if (landing != null && k === 0) { note(tt, semiOf(landing), 'Da', null, 1.1); landing = null; return; }
      if (u === 'S') return;
      if (u === 'c') { chik(tt, k % sub === 2 ? 0.55 : 0.45); return; }
      note(tt, semiOf(u), mode === 'alt' ? (k % 2 ? 'Ra' : 'Da') : 'Da', null, k % sub === 0 ? 1 : 0.85);
    });
    t += units.length * spu;
  };
  const gatFiller = GAT.flatMap((u) => [u, 'S']);
  if (ids.includes('gat')) { ev.push({ t, type: 'sec', id: 'gat' }); playUnits([...GAT, ...GAT], 2, 112, 'alt'); }
  if (ids.includes('toda')) {
    ev.push({ t, type: 'sec', id: 'toda' });
    const r = placeOnSam(TODA, tihai(U('2 1 -1 0'), 4), 64, gatFiller);
    playUnits(r.units, 4, 112, 'alt'); landing = r.landing;
  }
  if (ids.includes('drut')) {
    ev.push({ t, type: 'sec', id: 'drut' });
    const body: (string | number)[] = [];
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 'O', 'O', 'O-1', 'O-2', 4, 3, 2, 2, 1, 1, 0, 0, -1, 0].forEach((p) => body.push(p, 'c', 'c', 'c'));
    const r = placeOnSam(body, tihai(U('2 c c c 1 c c c 0'), 3), 64, [0, 'c', 'c', 'c']);
    playUnits(r.units, 4, 138, 'jhala'); landing = r.landing;
  }
  if (landing != null) { // 最後のサムで一緒に着地
    ev.push({ t, type: 'beat', b: 0 });
    ev.push({ t, type: 'tabla', bol: 'dha', vel: 1.15 });
    note(t, semiOf(landing), 'Da', null, 1.1);
    chik(t + 0.01, 0.8);
    ev.push({ t: t + 0.01, type: 'final' });
    t += 3;
  }
  ev.sort((a, c) => a.t - c.t);
  return { ev, dur: t, semis: [...new Set(ladder)] };
}

export interface EnsembleCallbacks {
  onBeat?: (beat: number) => void;
  onSection?: (id: string) => void;
  onFinal?: () => void;
  onEnd?: () => void;
}

class EnsembleConductor {
  private timer: number | null = null;
  private visTimers: number[] = [];
  public playing: 'none' | 'jam' | 'performance' = 'none';

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.visTimers.forEach((x) => window.clearTimeout(x)); this.visTimers = [];
    this.playing = 'none';
  }

  private at(time: number, f: () => void) {
    const ctx = tablaAudio.getContext(); if (!ctx) return;
    this.visTimers.push(window.setTimeout(f, Math.max(0, (time - ctx.currentTime) * 1000)));
  }

  /** 伴奏モード：テーカを刻み続ける（テンポは途中でも変えられる） */
  async startJam(taal: () => EnsembleTaal, bpm: () => number, cb: EnsembleCallbacks = {}) {
    this.stop();
    await tablaAudio.ready();
    const ctx = tablaAudio.getContext(); if (!ctx) return;
    this.playing = 'jam';
    let next = ctx.currentTime + 0.15, beat = 0;
    const pump = () => {
      while (next < ctx.currentTime + 0.2) {
        const tl = taal(), spb = 60 / bpm(), pos = beat % tl.beats, bols = tl.theka[pos];
        bols.forEach((bol, k) => tablaAudio.scheduleBol(bol, next + (k * spb) / bols.length, pos === 0 && k === 0 ? 1 : k ? 0.75 : 0.85));
        const tt = next, p = pos;
        this.at(tt, () => cb.onBeat?.(p));
        next += spb; beat++;
      }
    };
    pump();
    this.timer = window.setInterval(pump, 25);
  }

  /** 自動アンサンブル演奏 */
  async startPerformance(raag: Raag, ids: string[], cb: EnsembleCallbacks = {}) {
    this.stop();
    await tablaAudio.ready();
    const ctx = tablaAudio.getContext(); if (!ctx) return;
    const perf = buildPerformance(raag, ids);
    // 使う音を先に用意しておく
    await new Promise<void>((r) => sitarAudio.prerender(perf.semis, r));
    this.playing = 'performance';
    const t0 = ctx.currentTime + 0.4;
    let i = 0;
    const pump = () => {
      const ahead = ctx.currentTime + 0.25;
      while (i < perf.ev.length && t0 + perf.ev[i].t < ahead) {
        const e = perf.ev[i++], tt = t0 + e.t;
        if (e.type === 'note') sitarAudio.pluck(e.semi, tt, { stroke: e.stroke, meend: e.meend, vel: e.vel });
        else if (e.type === 'chik') sitarAudio.chikari(tt, e.vel);
        else if (e.type === 'tabla') tablaAudio.scheduleBol(e.bol, tt, e.vel);
        else if (e.type === 'beat') { const bt = e.b; this.at(tt, () => cb.onBeat?.(bt)); }
        else if (e.type === 'sec') { const id = e.id; this.at(tt, () => cb.onSection?.(id)); }
        else if (e.type === 'final') this.at(tt, () => cb.onFinal?.());
      }
      if (i >= perf.ev.length && this.timer) {
        window.clearInterval(this.timer); this.timer = null;
        this.at(t0 + perf.dur, () => { this.playing = 'none'; cb.onEnd?.(); });
      }
    };
    pump();
    this.timer = window.setInterval(pump, 25);
  }
}

export const ensemble = new EnsembleConductor();
