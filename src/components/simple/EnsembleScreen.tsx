import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import { Drums, BolText, strikeDrums } from './Drums';
import { StageMini } from '../stage/StageMini';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { sitarAudio } from '../../audio/sitarEngine';
import { ensemble, ENSEMBLE_TAALS, FLOW } from '../../audio/ensemble';
import { RAAGS, Raag, parseSargam, swaraName } from '../../data/raags';
import { BolKey } from '../../types/tabla';

/**
 * 合奏：舞台の上で、もう一人の演奏者といっしょに弾く。
 * - あなた＝タブラー：シタールがガット（主題）〜ティハーイーを弾く。タブラーのパート（ティーンタールのテーカ）を叩く。
 * - あなた＝シタール：タブラーがテーカで伴奏する。流れてくる音（サ・レ・ガ…）のボタンを押して旋律を弾く。
 * どちらも最後はティハーイー（3回くり返し）で1拍目（サム）に一緒に着地して、拍手で終わる。
 */

type Role = 'tabla' | 'sitar';
type Side = 'R' | 'L' | 'B';
const SIDE: Record<BolKey, Side> = { na: 'R', tin: 'R', tun: 'R', te: 'R', re: 'R', ge: 'L', meend: 'L', ke: 'L', dha: 'B', dhin: 'B', ti_re_ki_ta: 'B' };
const COLOR: Record<Side, string> = { B: 'bg-red-600 border-red-300', R: 'bg-sky-600 border-sky-300', L: 'bg-amber-500 border-amber-200' };
const TEEN = ENSEMBLE_TAALS[0];
const LEAD = 2.2;
const SITAR_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'];

interface Note { t: number; bol?: BolKey; semi?: number; label: string; color: string; state: null | 'great' | 'good' | 'miss'; part: Set<Side> }

/**
 * あなたが弾くシタールの旋律（1拍に1音・ティーンタール3周＋着地）。
 * 1周目：上行→下行、2周目：パカド（そのラーガらしい決まり文句）、3周目：上行の出だし → ティハーイー（同じ3音を3回）→ サムでサ
 */
export function sitarChart(r: Raag): (number | null)[] {
  const fit = (xs: (number | null)[], n: number) => { const o = xs.slice(0, n); while (o.length < n) o.push(null); return o; };
  const up = parseSargam(r.aroha).map((x) => x.semi), down = parseSargam(r.avaroha).map((x) => x.semi);
  const c1 = fit([...up, ...down.slice(1)], 16);
  const pk: (number | null)[] = []; for (const x of parseSargam(r.pakad)) { pk.push(x.semi); for (let i = 1; i < x.len; i++) pk.push(null); }
  const c2 = fit(pk, 16);
  const tail = down.slice(-3); // 例：G R S
  const tihai = [...tail, null, ...tail, null, ...tail]; // 11拍。最後のサが次の1拍目に来る
  const c3 = fit(up.slice(0, 6), 6);
  return [...c1, ...c2, ...c3, ...tihai]; // 16+16+6+11 = 49（最後の音＝4周目の1拍目）
}

// ---- 終わりの拍手（ノイズを細かく鳴らす） ----
function applause() {
  const ctx = tablaAudio.getContext(), out = tablaAudio.getInput(); if (!ctx || !out) return;
  const len = Math.floor(ctx.sampleRate * 0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));
  const t0 = ctx.currentTime + 0.05;
  for (let i = 0; i < 260; i++) {
    const t = t0 + Math.pow(Math.random(), 0.7) * 3.2, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 2200; f.Q.value = 0.8;
    g.gain.value = 0.16 * (1 - (t - t0) / 3.6) * (0.5 + Math.random() * 0.5);
    s.connect(f); f.connect(g); g.connect(out); s.start(t);
  }
}
function click(when: number, accent: boolean) {
  const ctx = tablaAudio.getContext(), out = tablaAudio.getInput(); if (!ctx || !out) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = accent ? 1600 : 1100;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(accent ? 0.3 : 0.2, when + 0.003); g.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.1);
}
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export const EnsembleScreen: React.FC = () => {
  const [role, setRole] = useState<Role>('tabla');
  const [raagId, setRaagId] = useState('yaman');
  const [slow, setSlow] = useState(true);
  const [guide, setGuide] = useState(true);
  const [long, setLong] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'loading' | 'play' | 'done'>('ready');
  const [section, setSection] = useState('');
  const [beat, setBeat] = useState(-1);
  const [hud, setHud] = useState({ combo: 0 });
  const [judge, setJudge] = useState<{ id: number; text: string; cls: string } | null>(null);
  const [result, setResult] = useState<{ great: number; good: number; miss: number; pct: number; stars: number; maxCombo: number } | null>(null);
  const [next, setNext] = useState<BolKey | null>(null);
  const raag = RAAGS.find((r) => r.id === raagId) ?? RAAGS[0];

  const notes = useRef<Note[]>([]), els = useRef<(HTMLDivElement | null)[]>([]), lane = useRef<HTMLDivElement>(null);
  const raf = useRef(0), combo = useRef(0), maxCombo = useRef(0), score = useRef(0), jid = useRef(0), nextRef = useRef<BolKey | null>(null);
  const timing = useRef({ t0: 0, spb: 0.6, end: 0 });
  const [, force] = useState(0);

  const chart = useMemo(() => sitarChart(raag), [raag]);
  const keysSemis = useMemo(() => [...new Set(chart.filter((x): x is number => x != null))].sort((a, b) => a - b), [chart]);

  const stopAll = () => { cancelAnimationFrame(raf.current); ensemble.stop(); sitarAudio.stopTanpura(); };
  useEffect(() => () => stopAll(), []);

  const show = (text: string, cls: string) => setJudge({ id: ++jid.current, text, cls });
  const mark = (n: Note, state: 'great' | 'good' | 'miss') => {
    n.state = state;
    if (state === 'miss') { combo.current = 0; show('ミス', 'text-stone-400'); }
    else { combo.current++; maxCombo.current = Math.max(maxCombo.current, combo.current); score.current += state === 'great' ? 2 : 1; show(state === 'great' ? 'ピッタリ！' : 'いいね', state === 'great' ? 'text-amber-300' : 'text-sky-300'); }
    setHud({ combo: combo.current });
  };

  const begin = (ns: Note[]) => {
    notes.current = ns; combo.current = 0; maxCombo.current = 0; score.current = 0;
    setHud({ combo: 0 }); setResult(null); setJudge(null); setPhase('play'); force((x) => x + 1);
    const ctx = tablaAudio.getContext()!;
    const loop = () => {
      const now = ctx.currentTime, w = lane.current?.clientWidth || 300, hitX = 44, { t0, spb, end } = timing.current;
      if (lane.current) lane.current.dataset.now = now.toFixed(3);
      notes.current.forEach((n, i) => {
        if (!n.state && now > n.t + 0.16) mark(n, 'miss');
        const el = els.current[i]; if (!el) return;
        const x = hitX + ((n.t - now) / LEAD) * (w - hitX);
        const hide = x > w + 30 || x < -40 || (n.state && n.state !== 'miss');
        el.style.transform = `translate(${x}px, -50%) scale(${n.state && n.state !== 'miss' ? 1.4 : 1})`;
        el.style.opacity = hide ? '0' : n.state === 'miss' ? '0.3' : '1';
      });
      setBeat(now >= t0 - 0.05 ? Math.floor((now - t0) / spb + 0.05) % 16 : -1);
      const up = notes.current.find((n) => !n.state && n.t > now - 0.16);
      const nb = up && up.bol && up.t - now < spb * 1.2 ? up.bol : null;
      if (nb !== nextRef.current) { nextRef.current = nb; setNext(nb); }
      if (now > end) {
        const total = notes.current.length, great = notes.current.filter((n) => n.state === 'great').length, good = notes.current.filter((n) => n.state === 'good').length;
        const pct = Math.round((score.current / (total * 2)) * 100), st = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;
        setResult({ great, good, miss: total - great - good, pct, stars: st, maxCombo: maxCombo.current });
        if (st) applause();
        sitarAudio.stopTanpura(); nextRef.current = null; setNext(null); setBeat(-1); setPhase('done');
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const start = async () => {
    stopAll();
    tablaAudio.ensureContext(); await tablaAudio.ready();
    const ctx = tablaAudio.getContext(); if (!ctx) return;
    setPhase('loading'); setSection('');
    if (role === 'tabla') {
      // あなた＝タブラー：シタールが弾き、テーカの音符が流れる
      const tempo = slow ? 0.75 : 1, spb = 60 / (112 * tempo);
      const ids = long ? ['gat', 'toda', 'drut'] : ['gat', 'toda'];
      const r = await ensemble.startPerformance(raag, ids, { onSection: (id) => setSection(FLOW.find((f) => f.id === id)?.name ?? '') }, { tablaVel: guide ? 0.22 : 0, emitTabla: false, delay: 0.5 + 4 * spb, tempo });
      if (!r) { setPhase('ready'); return; }
      for (let i = 0; i < 4; i++) click(r.t0 - (4 - i) * spb, i === 0);
      const ns: Note[] = [];
      for (const e of r.perf.ev) if (e.type === 'tabla') ns.push({ t: r.t0 + e.t, bol: e.bol, label: e.bol === 'na' ? 'Ta' : e.bol === 'tin' ? 'Tin' : e.bol === 'dhin' ? 'Dhin' : 'Dha', color: COLOR[SIDE[e.bol]], state: null, part: new Set() });
      timing.current = { t0: r.t0, spb, end: r.t0 + r.perf.dur + 0.3 };
      begin(ns);
    } else {
      // あなた＝シタール：タブラーがテーカで伴奏し、旋律の音符が流れる。タンプーラ（持続音）も鳴らす
      const bpm = slow ? 66 : 84, spb = 60 / bpm;
      await new Promise<void>((res) => sitarAudio.prerender(keysSemis, res));
      sitarAudio.startTanpura();
      const t0 = ctx.currentTime + 0.6 + 4 * spb, beats = chart.length; // 最後の音は4周目の1拍目
      for (let i = 0; i < 4; i++) click(t0 - (4 - i) * spb, i === 0);
      for (let b = 0; b < beats; b++) {
        const pos = b % 16, last = b === beats - 1;
        TEEN.theka[pos].forEach((bol) => tablaAudio.scheduleBol(last ? 'dha' : bol, t0 + b * spb, pos === 0 ? 1 : 0.8));
      }
      const ns: Note[] = [];
      chart.forEach((semi, b) => {
        if (semi == null) return;
        const t = t0 + b * spb;
        if (guide) sitarAudio.pluck(semi, t, { vel: 0.22, emit: false });
        ns.push({ t, semi, label: swaraName(semi).rom, color: semi < 0 ? 'bg-indigo-600 border-indigo-300' : semi >= 12 ? 'bg-pink-600 border-pink-300' : 'bg-emerald-600 border-emerald-300', state: null, part: new Set() });
      });
      timing.current = { t0, spb, end: t0 + (beats - 1) * spb + 1.2 };
      setSection('ガット（主題）');
      begin(ns);
    }
  };

  // ---- 判定 ----
  const nearest = (t: number, ok: (n: Note) => boolean) => {
    let best: Note | null = null;
    for (const n of notes.current) { if (n.state || !ok(n)) continue; const e = Math.abs(t - n.t); if (e <= 0.16 && (!best || e < Math.abs(t - best.t))) best = n; }
    return best;
  };
  const onTabla = (bol: BolKey, t: number) => {
    if (phase !== 'play') return;
    const side = SIDE[bol], n = nearest(t, () => true); if (!n || !n.bol) return;
    const need = SIDE[n.bol];
    let ok = need === side || side === 'B';
    if (!ok && need === 'B') { n.part.add(side); ok = n.part.has('R') && n.part.has('L'); if (!ok) return; }
    if (ok) mark(n, Math.abs(t - n.t) <= 0.07 ? 'great' : 'good');
  };
  const onSitar = (semi: number) => {
    sitarAudio.pluck(semi);
    if (phase !== 'play') return;
    const ctx = tablaAudio.getContext(); if (!ctx) return;
    const t = ctx.currentTime - ((ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0);
    const n = nearest(t, (x) => x.semi === semi);
    if (n) mark(n, Math.abs(t - n.t) <= 0.07 ? 'great' : 'good');
  };
  // シタール：キーボードでも弾ける（A S D F …）
  const onSitarRef = useRef(onSitar); onSitarRef.current = onSitar;
  useEffect(() => {
    if (role !== 'sitar') return;
    const h = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const i = SITAR_KEYS.indexOf(e.key.toLowerCase()); if (i < 0 || i >= keysSemis.length) return;
      e.preventDefault(); onSitarRef.current(keysSemis[i]);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [role, keysSemis]);

  const marks = ['X', '', '', '', '2', '', '', '', '0', '', '', '', '3', '', '', ''];
  return (
    <div className="h-full flex flex-col land:flex-row p-3 land:p-1.5 gap-2 max-w-4xl land:max-w-none mx-auto w-full relative">
      {/* 舞台（3D の演奏者） */}
      <div className="shrink-0 h-44 sm:h-56 land:h-auto land:w-[42%] flex flex-col gap-1">
        <StageMini variant="inline" className="flex-1 min-h-0 w-full" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 land:gap-1">
        {/* いまの部分と、16拍の位置（赤＝サム、青＝カーリー） */}
        <div className="flex items-center gap-2 min-h-6">
          <span className="text-xs font-bold text-amber-300 truncate">{phase === 'play' ? section || '♪' : role === 'tabla' ? 'あなた＝タブラー' : 'あなた＝シタール'}</span>
          <div className="ml-auto flex gap-[3px]">
            {marks.map((m, i) => <i key={i} className={`w-2.5 h-2.5 rounded-full border ${m === 'X' ? 'border-red-500' : m === '0' ? 'border-sky-500' : 'border-stone-600'} ${beat === i ? (i === 0 ? 'bg-red-500' : 'bg-amber-400') : ''}`} />)}
          </div>
          {phase === 'play' && hud.combo > 1 && <span className="text-amber-400 font-extrabold text-sm whitespace-nowrap">{hud.combo} コンボ</span>}
        </div>

        {/* 音符が流れるレーン */}
        <div ref={lane} className="relative h-20 shrink-0 rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-stone-700" />
          <div className="absolute top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-4 border-white/70" style={{ left: 44 - 28 }} />
          {notes.current.map((n, i) => (
            <div key={i} ref={(el) => { els.current[i] = el; }} data-t={n.t.toFixed(3)} data-k={n.bol ?? n.semi} className={`absolute top-1/2 left-0 -ml-6 w-12 h-12 rounded-full border-2 text-white font-extrabold text-xs flex items-center justify-center shadow-lg ${n.color}`} style={{ transform: 'translate(-100px,-50%)', opacity: 0, willChange: 'transform' }}>{n.label}</div>
          ))}
          {judge && <div key={judge.id} className={`absolute left-[80px] top-0.5 font-extrabold animate-bounce ${judge.cls}`}>{judge.text}</div>}
        </div>

        {/* 入力：タブラー＝太鼓、シタール＝音のボタン */}
        <div className="flex-1 min-h-0 relative flex flex-col gap-2">
          {role === 'tabla' ? (
            <>
              <div className="flex-1 min-h-0"><Drums onHit={onTabla} target={next ? [next] : []} /></div>
              <div className="flex justify-center gap-3">
                {(['dha', 'dhin'] as BolKey[]).map((b) => (
                  <button key={b} onPointerDown={(e) => { e.preventDefault(); strikeDrums(b); }} className="min-w-24 px-5 py-2 rounded-xl bg-red-700 text-white active:scale-95"><BolText b={b} big /></button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-5 gap-2 content-center">
              {keysSemis.map((s, i) => {
                const n = swaraName(s);
                return (
                  <button key={s} onPointerDown={(e) => { e.preventDefault(); onSitar(s); }}
                    className={`rounded-2xl py-3 land:py-2 border-2 font-extrabold active:scale-95 active:bg-amber-600 ${s < 0 ? 'bg-indigo-950 border-indigo-700' : s >= 12 ? 'bg-pink-950 border-pink-700' : 'bg-emerald-950 border-emerald-700'}`}>
                    <div className="text-xl text-stone-50">{n.rom}</div><div className="text-xs text-stone-300">{n.kana}</div>
                    <div className="text-[10px] text-stone-500 hidden md:block">{SITAR_KEYS[i]?.toUpperCase()}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* はじめる前の設定 */}
          {(phase === 'ready' || phase === 'loading') && (
            <div className="absolute inset-0 z-10 bg-stone-950/92 rounded-2xl flex flex-col gap-3 p-3 overflow-y-auto">
              <div className="text-sm font-bold text-stone-200">だれと合奏する？</div>
              <div className="grid grid-cols-2 gap-2">
                {([['tabla', '🪘 わたしがタブラー', 'シタールに合わせて叩く'], ['sitar', '🎻 わたしがシタール', 'タブラーの伴奏で弾く']] as const).map(([k, t, d]) => (
                  <button key={k} onClick={() => setRole(k)} className={`rounded-2xl p-3 text-left border-2 ${role === k ? 'border-amber-500 bg-amber-900/40' : 'border-stone-700 bg-stone-900'}`}>
                    <div className="font-extrabold text-stone-50 text-sm">{t}</div><div className="text-[11px] text-stone-400">{d}</div>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <select value={raagId} onChange={(e) => setRaagId(e.target.value)} aria-label="ラーガ" className="bg-stone-900 border border-stone-700 rounded-xl px-2 py-2 text-sm font-bold text-stone-100">
                  {RAAGS.map((r) => <option key={r.id} value={r.id}>{r.name.replace(/（.*/, '')}</option>)}
                </select>
                {[[slow, setSlow, '🐢 ゆっくり'], [guide, setGuide, '🔈 お手本']].map(([v, f, l]) => (
                  <button key={l as string} onClick={() => (f as (x: boolean) => void)(!(v as boolean))} className={`px-3 py-2 rounded-full text-xs font-bold ${v ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300'}`}>{l as string}</button>
                ))}
                {role === 'tabla' && <button onClick={() => setLong(!long)} className={`px-3 py-2 rounded-full text-xs font-bold ${long ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300'}`}>⏩ 終曲まで</button>}
              </div>
              <div className="text-[11px] text-stone-500 leading-relaxed">
                {role === 'tabla' ? 'シタールの主題（ガット）に、ティーンタールのテーカで伴奏します。最後はティハーイーでいっしょに1拍目へ。' : 'タブラーのテーカに乗って旋律を弾きます。上行→下行→ラーガの決まり文句→ティハーイーでサに着地。'}
              </div>
              <button onClick={start} disabled={phase === 'loading'} className="mt-auto py-3 rounded-2xl bg-amber-600 text-white font-extrabold text-lg flex items-center justify-center gap-2 disabled:opacity-60">
                <Play className="w-5 h-5" />{phase === 'loading' ? '準備中…' : '合奏をはじめる'}
              </button>
            </div>
          )}
          {phase === 'play' && (
            <button onClick={() => { stopAll(); setPhase('ready'); setBeat(-1); }} className="absolute right-0 top-0 z-10 w-9 h-9 rounded-full bg-stone-800/90 flex items-center justify-center" aria-label="やめる"><Square className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {phase === 'done' && result && (
        <div className="absolute inset-0 z-20 bg-stone-950/88 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="text-5xl">{result.stars === 3 ? '👏' : result.stars ? '🎉' : '💪'}</div>
          <div className="text-amber-300 font-extrabold text-2xl">{result.stars ? '合奏できました！' : 'もう少し！'}</div>
          <div className="text-4xl text-amber-400 tracking-widest">{stars(result.stars)}</div>
          <div className="text-stone-200 font-bold">{result.pct} 点</div>
          <div className="flex gap-4 text-sm text-stone-300"><span>ピッタリ {result.great}</span><span>いいね {result.good}</span><span>ミス {result.miss}</span></div>
          <div className="text-xs text-stone-500">最大 {result.maxCombo} コンボ</div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setPhase('ready')} className="px-5 py-3 rounded-xl bg-stone-800 text-stone-200 font-bold">設定にもどる</button>
            <button onClick={start} className="px-6 py-3 rounded-xl bg-amber-600 text-white font-extrabold text-lg flex items-center gap-1"><RotateCcw className="w-5 h-5" />もう一回</button>
          </div>
        </div>
      )}
    </div>
  );
};
