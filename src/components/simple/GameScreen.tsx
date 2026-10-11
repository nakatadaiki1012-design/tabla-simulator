import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { Drums, BolText, BOL_ROMAN } from './Drums';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { BolKey } from '../../types/tabla';

/**
 * リズムゲーム：右から流れてくる音符が左の丸に重なった瞬間に叩く。
 * 判定は「どちらの太鼓か」だけ（赤＝両手、青＝右、黄＝左）。音の名前は覚えるための表示。
 */

type Side = 'R' | 'L' | 'B';
const SIDE: Record<BolKey, Side> = {
  na: 'R', tin: 'R', tun: 'R', te: 'R', re: 'R', ge: 'L', meend: 'L', ke: 'L', dha: 'B', dhin: 'B', ti_re_ki_ta: 'B',
};
const COLOR: Record<Side, string> = { B: 'bg-red-600 border-red-300', R: 'bg-sky-600 border-sky-300', L: 'bg-amber-500 border-amber-200' };

interface Song { id: string; name: string; sub: string; level: number; bpm: number; beats: string[]; loops: number }
// 1要素＝1拍。空白区切りで1拍を等分。「-」は休み
const SONGS: Song[] = [
  { id: 'g1', name: 'はじめの一歩', sub: 'Na と Ge だけ', level: 1, bpm: 66, loops: 2, beats: ['na', 'na', 'ge', '-', 'na', 'na', 'ge', '-'] },
  { id: 'g2', name: 'ティーンタール', sub: '16拍の基本形', level: 1, bpm: 72, loops: 1,
    beats: 'dha dhin dhin dha dha dhin dhin dha dha tin tin na na dhin dhin dha'.split(' ') },
  { id: 'g3', name: 'ダードラ', sub: '6拍・軽やか', level: 2, bpm: 96, loops: 3, beats: 'dha dhin na dha tin na'.split(' ') },
  { id: 'g4', name: 'ケヘルワ', sub: '8拍・おどる', level: 2, bpm: 100, loops: 3, beats: 'dha ge na tin na ke dhin na'.split(' ') },
  { id: 'g5', name: 'カイダ', sub: '1拍に2つ', level: 3, bpm: 72, loops: 2,
    beats: ['dha dha', 'te te', 'dha dha', 'tin na', 'ta ta', 'te te', 'dha dha', 'dhin na'] },
  { id: 'g6', name: 'ティハイ', sub: '3回くり返して着地', level: 3, bpm: 80, loops: 2,
    beats: ['dha te', 'te dha', '-', 'dha te', 'te dha', '-', 'dha te', 'te dha'] },
];

interface Note { t: number; bol: BolKey; side: Side; state: null | 'great' | 'good' | 'miss'; err: number; part: Set<Side> }

function buildNotes(song: Song, spb: number, t0: number): Note[] {
  const out: Note[] = [];
  for (let l = 0; l < song.loops; l++) {
    song.beats.forEach((beat, bi) => {
      const toks = beat.split(' ');
      toks.forEach((tok, k) => {
        if (tok === '-') return;
        const bol = (tok === 'ta' ? 'na' : tok) as BolKey;
        out.push({ t: t0 + (l * song.beats.length + bi + k / toks.length) * spb, bol, side: SIDE[bol], state: null, err: 0, part: new Set() });
      });
    });
  }
  return out;
}

const KEY = 'tablalab.game.v1';
const loadBest = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const saveBest = (b: Record<string, number>) => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* noop */ } };
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

function click(when: number, accent: boolean) {
  const ctx = tablaAudio.getContext(), out = tablaAudio.getInput();
  if (!ctx || !out) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = accent ? 1600 : 1100;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(accent ? 0.35 : 0.22, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.1);
}

export const GameScreen: React.FC = () => {
  const [song, setSong] = useState<Song | null>(null);
  const [slow, setSlow] = useState(false);
  const [guide, setGuide] = useState(true);
  const [best, setBest] = useState(loadBest);
  if (song) return <Play1 song={song} slow={slow} guide={guide} onBack={() => setSong(null)} onBest={(s) => { const b = { ...loadBest() }; if ((b[song.id] || 0) < s) { b[song.id] = s; saveBest(b); setBest(b); } }} />;
  return (
    <div className="h-full flex flex-col gap-3 p-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎮</span><b className="text-lg">リズムゲーム</b>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setSlow((v) => !v)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${slow ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300'}`}>🐢 ゆっくり</button>
          <button onClick={() => setGuide((v) => !v)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${guide ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300'}`}>🔈 お手本</button>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-stone-400 items-center">
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-full bg-red-600 inline-block" />両手</span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-full bg-sky-600 inline-block" />右</span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-full bg-amber-500 inline-block" />左</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SONGS.map((s) => (
          <button key={s.id} onClick={() => setSong(s)} className="text-left rounded-2xl bg-stone-900 border border-stone-800 active:border-amber-500 p-3 flex flex-col gap-1">
            <div className="font-extrabold text-stone-100">{s.name}</div>
            <div className="text-[11px] text-stone-500">{s.sub}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="flex gap-0.5">{[1, 2, 3].map((i) => <i key={i} className={`w-2 h-2 rounded-full ${i <= s.level ? 'bg-amber-500' : 'bg-stone-700'}`} />)}</span>
              <span className="text-amber-400 text-sm tracking-wider">{stars(best[s.id] || 0)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const LEAD = 2.2; // 音符が右端から丸まで流れる秒数

const Play1: React.FC<{ song: Song; slow: boolean; guide: boolean; onBack: () => void; onBest: (s: number) => void }> = ({ song, slow, guide, onBack, onBest }) => {
  const spb = 60 / (song.bpm * (slow ? 0.75 : 1));
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [hud, setHud] = useState({ score: 0, combo: 0 });
  const [judge, setJudge] = useState<{ id: number; text: string; cls: string } | null>(null);
  const [result, setResult] = useState<{ great: number; good: number; miss: number; maxCombo: number; pct: number; stars: number } | null>(null);
  const notes = useRef<Note[]>([]);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const lane = useRef<HTMLDivElement>(null);
  const raf = useRef(0), combo = useRef(0), maxCombo = useRef(0), score = useRef(0), jid = useRef(0);
  const [, force] = useState(0);
  const [next, setNext] = useState<BolKey | null>(null);
  const nextRef = useRef<BolKey | null>(null);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const show = (text: string, cls: string) => setJudge({ id: ++jid.current, text, cls });
  const mark = (n: Note, state: 'great' | 'good' | 'miss', err = 0) => {
    n.state = state; n.err = err;
    if (state === 'miss') { combo.current = 0; show('ミス', 'text-stone-400'); }
    else {
      combo.current++; maxCombo.current = Math.max(maxCombo.current, combo.current);
      score.current += state === 'great' ? 2 : 1;
      show(state === 'great' ? 'ピッタリ！' : 'いいね', state === 'great' ? 'text-amber-300' : 'text-sky-300');
    }
    setHud({ score: score.current, combo: combo.current });
  };

  const start = () => {
    tablaAudio.ensureContext();
    const ctx = tablaAudio.getContext()!;
    const t0 = ctx.currentTime + 0.4 + 4 * spb;
    for (let i = 0; i < 4; i++) click(t0 - (4 - i) * spb, i === 0);
    notes.current = buildNotes(song, spb, t0);
    if (guide) notes.current.forEach((n) => tablaAudio.scheduleBol(n.bol, n.t, 0.22));
    combo.current = 0; maxCombo.current = 0; score.current = 0;
    setHud({ score: 0, combo: 0 }); setResult(null); setJudge(null); setPhase('play'); force((x) => x + 1);
    const end = notes.current[notes.current.length - 1].t + 0.6;
    const loop = () => {
      const now = ctx.currentTime, w = lane.current?.clientWidth || 300, hitX = 44;
      notes.current.forEach((n, i) => {
        if (!n.state && now > n.t + 0.16) mark(n, 'miss');
        const el = els.current[i]; if (!el) return;
        const x = hitX + ((n.t - now) / LEAD) * (w - hitX);
        const hide = x > w + 30 || x < -40 || (n.state && n.state !== 'miss');
        el.style.transform = `translate(${x}px, -50%) scale(${n.state && n.state !== 'miss' ? 1.4 : 1})`;
        el.style.opacity = hide ? '0' : n.state === 'miss' ? '0.3' : '1';
      });
      // 次に叩く所を太鼓の上で光らせる
      const up = notes.current.find((n) => !n.state && n.t > now - 0.16);
      const nb = up && up.t - now < spb * 1.2 ? up.bol : null;
      if (nb !== nextRef.current) { nextRef.current = nb; setNext(nb); }
      if (now > end) {
        const total = notes.current.length;
        const great = notes.current.filter((n) => n.state === 'great').length, good = notes.current.filter((n) => n.state === 'good').length;
        const pct = Math.round((score.current / (total * 2)) * 100);
        const st = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;
        setResult({ great, good, miss: total - great - good, maxCombo: maxCombo.current, pct, stars: st });
        if (st) onBest(st);
        nextRef.current = null; setNext(null);
        setPhase('done');
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const onHit = (bol: BolKey, t: number) => {
    if (phase !== 'play') return;
    const side = SIDE[bol];
    // いちばん近い、まだ判定していない音符
    let best: Note | null = null;
    for (const n of notes.current) {
      if (n.state) continue;
      const e = Math.abs(t - n.t);
      if (e <= 0.16 && (!best || e < Math.abs(t - best.t))) best = n;
    }
    if (!best) return;
    const e = Math.abs(t - best.t);
    let ok = false;
    if (best.side === side || (side === 'B')) ok = true;
    else if (best.side === 'B') { best.part.add(side); ok = best.part.has('R') && best.part.has('L'); if (!ok) return; }
    if (!ok) return;
    mark(best, e <= 0.07 ? 'great' : 'good', e);
  };

  const hasBoth = song.beats.some((b) => /dha|dhin/.test(b));
  return (
    <div className="h-full flex flex-col p-3 gap-2 max-w-4xl mx-auto w-full relative">
      <div className="flex items-center gap-2">
        <button onClick={() => { cancelAnimationFrame(raf.current); onBack(); }} className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center" aria-label="もどる"><ArrowLeft className="w-5 h-5" /></button>
        <b className="text-stone-100">{song.name}</b>
        <div className="ml-auto text-right leading-tight">
          <div className="text-amber-400 font-extrabold text-xl">{hud.combo > 1 ? `${hud.combo} コンボ` : ''}</div>
        </div>
      </div>

      {/* 音符が流れるレーン */}
      <div ref={lane} className="relative h-24 shrink-0 rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-stone-700" />
        <div className="absolute top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-white/70" style={{ left: 44 - 32 }} />
        {notes.current.map((n, i) => (
          <div key={i} ref={(el) => { els.current[i] = el; }} className={`absolute top-1/2 left-0 -ml-7 w-14 h-14 rounded-full border-2 text-white font-extrabold text-xs flex items-center justify-center shadow-lg ${COLOR[n.side]}`} style={{ transform: 'translate(-100px,-50%)', opacity: 0, willChange: 'transform' }}>
            {BOL_ROMAN[n.bol]}
          </div>
        ))}
        {judge && <div key={judge.id} className={`absolute left-[88px] top-1 font-extrabold text-lg animate-bounce ${judge.cls}`}>{judge.text}</div>}
      </div>

      <div className="flex-1 min-h-0 relative">
        <Drums onHit={onHit} target={next ? [next] : []} />
        {phase === 'ready' && (
          <button onClick={start} className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-amber-600/95 text-white font-extrabold text-2xl shadow-2xl flex flex-col items-center justify-center gap-1">
            <Play className="w-8 h-8" />スタート
          </button>
        )}
      </div>
      {hasBoth && (
        <div className="flex justify-center gap-3 pb-1">
          {(['dha', 'dhin'] as BolKey[]).map((b) => (
            <button key={b} onPointerDown={(e) => { e.preventDefault(); tablaAudio.playBol(b); const c = tablaAudio.getContext(); onHit(b, c ? c.currentTime : 0); }}
              className="min-w-24 px-5 py-2 rounded-xl bg-red-700 text-white active:scale-95"><BolText b={b} big /></button>
          ))}
        </div>
      )}

      {phase === 'done' && result && (
        <div className="absolute inset-0 z-20 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="text-5xl">{result.stars === 3 ? '🏆' : result.stars ? '🎉' : '💪'}</div>
          <div className="text-amber-300 font-extrabold text-3xl">{result.stars ? 'クリア！' : 'おしい！'}</div>
          <div className="text-4xl text-amber-400 tracking-widest">{stars(result.stars)}</div>
          <div className="text-stone-200 font-bold">{result.pct} 点</div>
          <div className="flex gap-4 text-sm text-stone-300">
            <span>ピッタリ {result.great}</span><span>いいね {result.good}</span><span>ミス {result.miss}</span>
          </div>
          <div className="text-xs text-stone-500">最大 {result.maxCombo} コンボ</div>
          <div className="flex gap-3 mt-2">
            <button onClick={onBack} className="px-5 py-3 rounded-xl bg-stone-800 text-stone-200 font-bold">曲をえらぶ</button>
            <button onClick={start} className="px-6 py-3 rounded-xl bg-amber-600 text-white font-extrabold text-lg flex items-center gap-1"><RotateCcw className="w-5 h-5" />もう一回</button>
          </div>
        </div>
      )}
    </div>
  );
};
