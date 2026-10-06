import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, HelpCircle, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Drums, BOL_LABEL, PARTS } from './Drums';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { ensemble, ENSEMBLE_TAALS } from '../../audio/ensemble';
import { BolKey } from '../../types/tabla';
import { UNITS, Unit, Step, FINAL_BADGE, loadProgress, saveProgress, unitDone, allDone, nextStep, isUnlocked, Progress } from '../../data/steps';

const norm = (b: BolKey): BolKey => (b === 'meend' ? 'ge' : b === 're' ? 'te' : b);
const starsText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

function click(when: number, accent: boolean) {
  const ctx = tablaAudio.getContext(), out = tablaAudio.getInput();
  if (!ctx || !out) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = accent ? 1600 : 1100;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(accent ? 0.35 : 0.22, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.1);
}

// =====================================================================
// レッスンのトップ：バッジ棚と、ステップの道
// =====================================================================
export const LessonScreen: React.FC = () => {
  const [p, setP] = useState<Progress>(loadProgress);
  const [open, setOpen] = useState<{ unit: Unit; step: Step } | null>(null);

  if (open) {
    return (
      <StepPlayer key={open.step.id} unit={open.unit} step={open.step}
        onExit={() => setOpen(null)}
        onClear={(stars) => {
          const np: Progress = { stars: { ...p.stars, [open.step.id]: Math.max(stars, p.stars[open.step.id] || 0) } };
          saveProgress(np); setP(np);
          return { unitNow: !unitDone(p, open.unit) && unitDone(np, open.unit), allNow: !allDone(p) && allDone(np) };
        }}
        onNext={() => {
          const i = open.unit.steps.findIndex((x) => x.id === open.step.id);
          const nxt = open.unit.steps[i + 1];
          if (nxt) setOpen({ unit: open.unit, step: nxt });
          else { const n = nextStep(loadProgress()); setOpen(n); }
        }} />
    );
  }

  const nx = nextStep(p);
  const total = UNITS.reduce((a, u) => a + u.steps.length, 0), cleared = Object.values(p.stars).filter((v) => v > 0).length;
  return (
    <div className="h-full flex flex-col gap-3 p-3 max-w-xl mx-auto w-full">
      {/* バッジ棚 */}
      <div className="flex items-center justify-between gap-1 bg-stone-900 border border-stone-800 rounded-2xl px-2 py-2.5">
        {UNITS.map((u) => {
          const got = unitDone(p, u);
          return (
            <div key={u.id} className="flex flex-col items-center" title={u.badge} aria-label={`バッジ：${u.badge}${got ? '（獲得）' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${got ? 'bg-amber-500/90 shadow-[0_0_12px_rgba(245,158,11,.6)]' : 'bg-stone-800 grayscale opacity-40'}`}>{u.badgeIcon}</div>

            </div>
          );
        })}
        <div className="flex flex-col items-center" title={FINAL_BADGE.name}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${allDone(p) ? 'bg-yellow-400 shadow-[0_0_14px_#facc15]' : 'bg-stone-800 grayscale opacity-40'}`}>{FINAL_BADGE.icon}</div>

        </div>
      </div>

      {/* つづきから */}
      <button onClick={() => nx && setOpen(nx)} disabled={!nx}
        className="w-full rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 text-white font-extrabold text-lg py-4 flex items-center justify-center gap-2 shadow-lg">
        <Play className="w-5 h-5" />{nx ? `つづきから：${nx.step.say}` : '🎉 全部クリア！'}
      </button>
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all" style={{ width: `${(cleared / total) * 100}%` }} /></div>

      {/* ユニットの道 */}
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {UNITS.map((u) => {
          const unlocked = isUnlocked(p, u.steps[0].id), done = unitDone(p, u);
          return (
            <div key={u.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${done ? 'border-amber-700/60 bg-amber-950/20' : 'border-stone-800 bg-stone-900'} ${unlocked ? '' : 'opacity-40'}`}>
              <div className="text-2xl w-8 text-center">{unlocked ? u.icon : '🔒'}</div>
              <div className="font-bold text-stone-100 text-sm flex-1 truncate">{u.name}</div>
              <div className="flex gap-1.5">
                {u.steps.map((st, k) => {
                  const sv = p.stars[st.id] || 0, can = isUnlocked(p, st.id);
                  return (
                    <button key={st.id} disabled={!can} onClick={() => setOpen({ unit: u, step: st })}
                      className={`w-9 h-9 rounded-full text-[11px] font-bold flex items-center justify-center border-2 ${sv ? 'bg-amber-500 border-amber-400 text-stone-950' : can ? 'bg-stone-800 border-amber-500 text-amber-300 animate-pulse' : 'bg-stone-900 border-stone-700 text-stone-600'}`}
                      aria-label={st.say}>
                      {sv ? `★${sv}` : k + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =====================================================================
// 1ステップを遊ぶ画面
// =====================================================================
interface PlayerProps {
  unit: Unit; step: Step;
  onExit: () => void; onNext: () => void;
  onClear: (stars: number) => { unitNow: boolean; allNow: boolean };
}
const StepPlayer: React.FC<PlayerProps> = ({ unit, step, onExit, onNext, onClear }) => {
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<{ stars: number; unitNow: boolean; allNow: boolean } | null>(null);
  const [shake, setShake] = useState(0);
  const [tries, setTries] = useState(0);
  const idx = unit.steps.findIndex((x) => x.id === step.id);

  const finish = useCallback((stars: number) => {
    if (stars <= 0) return;
    const r = onClear(stars);
    setResult({ stars, ...r });
  }, [onClear]);
  const miss = () => setShake((x) => x + 1);

  return (
    <div className="h-full flex flex-col p-3 gap-2 max-w-3xl mx-auto w-full relative">
      {/* 上：戻る・進み具合 */}
      <div className="flex items-center gap-2">
        <button onClick={onExit} className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center" aria-label="もどる"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 flex gap-1">
          {unit.steps.map((st, k) => <div key={st.id} className={`h-2 flex-1 rounded-full ${k < idx ? 'bg-amber-500' : k === idx ? 'bg-amber-300' : 'bg-stone-800'}`} />)}
        </div>
        <span className="text-xl">{unit.icon}</span>
      </div>
      {/* 一言の指示 */}
      <div key={shake} className={`flex items-center justify-center gap-2 py-1 ${shake ? 'animate-wiggle' : ''}`}>
        <h2 className="text-xl sm:text-2xl font-extrabold text-stone-50 text-center">{step.say}</h2>
        {step.hint && <button onClick={() => setShowHint((v) => !v)} className="text-stone-400" aria-label="ヒント"><HelpCircle className="w-5 h-5" /></button>}
      </div>
      {showHint && step.hint && <div className="text-center text-sm text-teal-300 -mt-1">{step.hint}</div>}

      <div className="flex-1 min-h-0 flex flex-col">
        {step.kind === 'tap' && <TapGame key={tries} step={step} onDone={finish} onMiss={miss} />}
        {step.kind === 'rhythm' && <RhythmGame key={tries} step={step} onDone={finish} onRetry={() => setTries((t) => t + 1)} />}
        {step.kind === 'quiz' && <QuizGame key={tries} step={step} onDone={finish} onMiss={miss} />}
        {step.kind === 'sam' && <SamGame key={tries} step={step} onDone={finish} onMiss={miss} />}
      </div>

      {/* クリア表示 */}
      {result && (
        <div className="absolute inset-0 z-20 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-2xl">
          {result.unitNow ? (
            <>
              <div className="text-7xl animate-bounce">{result.allNow ? FINAL_BADGE.icon : unit.badgeIcon}</div>
              <div className="text-amber-300 font-extrabold text-2xl">バッジ ゲット！</div>
              <div className="text-stone-100 font-bold text-lg">「{result.allNow ? FINAL_BADGE.name : unit.badge}」</div>
            </>
          ) : (
            <>
              <div className="text-5xl">🎉</div>
              <div className="text-amber-300 font-extrabold text-3xl">クリア！</div>
            </>
          )}
          <div className="text-4xl text-amber-400 tracking-widest">{starsText(result.stars)}</div>
          <div className="flex gap-3">
            <button onClick={() => { setResult(null); setTries((t) => t + 1); }} className="px-5 py-3 rounded-xl bg-stone-800 text-stone-200 font-bold flex items-center gap-1"><RotateCcw className="w-4 h-4" />もう一回</button>
            <button onClick={onNext} className="px-6 py-3 rounded-xl bg-amber-600 text-white font-extrabold text-lg">つぎへ ▶</button>
          </div>
        </div>
      )}
    </div>
  );
};

/** 下に並べる「順番」チップ */
const SeqChips: React.FC<{ seq: BolKey[]; at: number; marks?: (boolean | null)[] }> = ({ seq, at, marks }) => (
  <div className="flex flex-wrap justify-center gap-1.5">
    {seq.map((b, i) => (
      <div key={i} className={`px-2.5 py-1.5 rounded-lg text-sm font-bold border ${marks && marks[i] === true ? 'bg-emerald-600 border-emerald-400 text-white' : marks && marks[i] === false ? 'bg-red-900 border-red-600 text-red-200' : i < at ? 'bg-amber-600/80 border-amber-500 text-white' : i === at ? 'bg-amber-300 border-amber-200 text-stone-950 scale-110' : 'bg-stone-800 border-stone-700 text-stone-400'}`}>
        {BOL_LABEL[b]}
      </div>
    ))}
  </div>
);
const ComboButtons: React.FC<{ seq: BolKey[]; onHit: (b: BolKey) => void }> = ({ seq, onHit }) => {
  const need = (['dha', 'dhin'] as BolKey[]).filter((b) => seq.includes(b));
  if (!need.length) return null;
  return (
    <div className="flex justify-center gap-3">
      {need.map((b) => (
        <button key={b} onPointerDown={(e) => { e.preventDefault(); tablaAudio.playBol(b); onHit(b); }}
          className="min-w-24 px-5 py-3 rounded-xl bg-amber-700 text-white font-extrabold text-lg active:scale-95">{BOL_LABEL[b]}</button>
      ))}
    </div>
  );
};

// ---------- 順番に叩く ----------
const TapGame: React.FC<{ step: Step; onDone: (s: number) => void; onMiss: () => void }> = ({ step, onDone, onMiss }) => {
  const seq = step.seq!;
  const [at, setAt] = useState(0);
  const mistakes = useRef(0), pending = useRef<Set<BolKey>>(new Set()), timer = useRef<number | null>(null);
  const atRef = useRef(0); atRef.current = at;
  const advance = () => {
    const n = atRef.current + 1; setAt(n);
    if (n >= seq.length) window.setTimeout(() => onDone(mistakes.current === 0 ? 3 : mistakes.current <= 2 ? 2 : 1), 350);
  };
  const wrong = () => { mistakes.current++; onMiss(); };
  const onHit = (raw: BolKey) => {
    const exp = seq[atRef.current]; if (!exp) return;
    const b = norm(raw), parts = PARTS[exp];
    if (b === exp) { pending.current.clear(); advance(); return; }
    if (parts && parts.includes(b)) { // 両手：2か所が少しの時間内にそろえばOK
      pending.current.add(b);
      if (parts.every((x) => pending.current.has(x))) { if (timer.current) window.clearTimeout(timer.current); pending.current.clear(); advance(); return; }
      if (!timer.current) timer.current = window.setTimeout(() => { timer.current = null; if (pending.current.size) { pending.current.clear(); wrong(); } }, 160);
      return;
    }
    wrong();
  };
  return (
    <>
      <div className="flex-1 min-h-0"><Drums onHit={onHit} target={at < seq.length ? [seq[at]] : []} /></div>
      <div className="flex flex-col gap-2 pb-1"><SeqChips seq={seq} at={at} /><ComboButtons seq={seq} onHit={onHit} /></div>
    </>
  );
};

// ---------- 拍に合わせて叩く ----------
const RhythmGame: React.FC<{ step: Step; onDone: (s: number) => void; onRetry: () => void }> = ({ step, onDone, onRetry }) => {
  const seq = step.seq!, spb = 60 / (step.bpm || 70);
  const [phase, setPhase] = useState<'ready' | 'count' | 'play' | 'fail'>('ready');
  const [beat, setBeat] = useState(-1);
  const [marks, setMarks] = useState<(boolean | null)[]>(seq.map(() => null));
  const t0 = useRef(0), matched = useRef<boolean[]>([]), partial = useRef<Set<BolKey>[]>([]), errs = useRef<number[]>([]);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const start = () => {
    tablaAudio.ensureContext();
    const ctx = tablaAudio.getContext()!;
    t0.current = ctx.currentTime + 0.4 + 4 * spb;
    for (let i = 0; i < 4; i++) click(t0.current - (4 - i) * spb, i === 0);
    seq.forEach((b, i) => tablaAudio.scheduleBol(b, t0.current + i * spb, 0.25)); // 小さなお手本音
    matched.current = seq.map(() => false); partial.current = seq.map(() => new Set()); errs.current = [];
    setMarks(seq.map(() => null)); setPhase('count');
    const loop = () => {
      const now = ctx.currentTime, k = Math.floor((now - t0.current) / spb + 0.5);
      setBeat(now < t0.current - spb / 2 ? -1 : Math.min(k, seq.length - 1));
      if (now >= t0.current - spb / 2) setPhase((ph) => (ph === 'count' ? 'play' : ph));
      if (now > t0.current + (seq.length - 1) * spb + 0.35) {
        const ok = matched.current.filter(Boolean).length, ratio = ok / seq.length;
        const avg = errs.current.length ? errs.current.reduce((a, c) => a + c, 0) / errs.current.length : 1;
        setMarks(matched.current.map((m) => m));
        const stars = ratio === 1 && avg < 0.07 ? 3 : ratio >= 0.75 ? 2 : ratio >= 0.5 ? 1 : 0;
        if (stars) window.setTimeout(() => onDone(stars), 500); else setPhase('fail');
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const onHit = (raw: BolKey, t: number) => {
    if (phase === 'ready' || phase === 'fail') return;
    const b = norm(raw);
    for (let i = 0; i < seq.length; i++) {
      if (matched.current[i]) continue;
      const bt = t0.current + i * spb, e = Math.abs(t - bt);
      if (e > 0.2) continue;
      const exp = seq[i], parts = PARTS[exp];
      const done = b === exp || (parts && (partial.current[i].add(b), parts.every((x) => partial.current[i].has(x))));
      if (done) { matched.current[i] = true; errs.current.push(e); setMarks((m) => { const n = [...m]; n[i] = true; return n; }); }
      return;
    }
  };
  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <Drums onHit={onHit} target={beat >= 0 && phase === 'play' ? [seq[beat]] : []} />
        {phase === 'ready' && (
          <button onClick={start} className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-amber-600/95 text-white font-extrabold text-2xl shadow-2xl flex flex-col items-center justify-center gap-1">
            <Play className="w-8 h-8" />スタート
          </button>
        )}
        {phase === 'fail' && (
          <button onClick={onRetry} className="absolute inset-0 m-auto w-44 h-44 rounded-full bg-stone-800/95 text-white font-extrabold text-xl shadow-2xl flex flex-col items-center justify-center gap-1">
            <RotateCcw className="w-7 h-7" />もう一回<span className="text-xs font-normal text-stone-400">音を聞きながら</span>
          </button>
        )}
        {phase === 'count' && <div className="absolute top-1 left-0 right-0 text-center text-amber-300 font-bold">カウント…</div>}
      </div>
      <div className="flex flex-col gap-2 pb-1"><SeqChips seq={seq} at={phase === 'play' ? beat : -1} marks={marks} /><ComboButtons seq={seq} onHit={(b) => { const c = tablaAudio.getContext(); onHit(b, c ? c.currentTime : 0); }} /></div>
    </>
  );
};

// ---------- 聞いて当てる ----------
const QuizGame: React.FC<{ step: Step; onDone: (s: number) => void; onMiss: () => void }> = ({ step, onDone, onMiss }) => {
  const opts = step.options!, rounds = step.rounds || 3;
  const pick = (prev?: BolKey) => { let a: BolKey; do { a = opts[Math.floor(Math.random() * opts.length)]; } while (a === prev && opts.length > 1); return a; };
  const [r, setR] = useState(0);
  const [ans, setAns] = useState<BolKey>(() => pick());
  const [ok, setOk] = useState<BolKey | null>(null);
  const [bad, setBad] = useState<BolKey | null>(null);
  const mistakes = useRef(0);
  const play = (b: BolKey) => tablaAudio.playBol(b);
  useEffect(() => { const t = window.setTimeout(() => play(ans), 350); return () => window.clearTimeout(t); }, [ans]);
  const choose = (b: BolKey) => {
    if (ok) return;
    if (b === ans) {
      setOk(b);
      window.setTimeout(() => {
        setOk(null); setBad(null);
        if (r + 1 >= rounds) onDone(mistakes.current === 0 ? 3 : mistakes.current <= 1 ? 2 : 1);
        else { setR(r + 1); setAns(pick(ans)); }
      }, 600);
    } else { mistakes.current++; setBad(b); onMiss(); }
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="flex gap-1.5">{Array.from({ length: rounds }, (_, i) => <div key={i} className={`w-3 h-3 rounded-full ${i < r ? 'bg-amber-500' : i === r ? 'bg-amber-300' : 'bg-stone-700'}`} />)}</div>
      <button onClick={() => play(ans)} className="w-28 h-28 rounded-full bg-amber-600 text-white flex flex-col items-center justify-center shadow-xl active:scale-95">
        <Volume2 className="w-10 h-10" /><span className="text-xs font-bold mt-1">もう一度</span>
      </button>
      <div className={`grid gap-3 w-full max-w-md ${opts.length === 2 ? 'grid-cols-2' : opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {opts.map((b) => (
          <button key={b} onClick={() => choose(b)}
            className={`py-5 rounded-2xl text-xl font-extrabold border-2 transition-colors ${ok === b ? 'bg-emerald-600 border-emerald-400 text-white' : bad === b ? 'bg-red-900 border-red-600 text-red-100' : 'bg-stone-800 border-stone-700 text-stone-100'}`}>
            {BOL_LABEL[b]}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------- サム（1拍目）を感じる ----------
const SamGame: React.FC<{ step: Step; onDone: (s: number) => void; onMiss: () => void }> = ({ step, onDone, onMiss }) => {
  const taal = ENSEMBLE_TAALS[0], spb = 60 / (step.bpm || 90), need = step.rounds || 3;
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [got, setGot] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null);
  const last = useRef({ beat: -1, time: 0 }), mistakes = useRef(0), gotRef = useRef(0), used = useRef(-1);
  useEffect(() => () => ensemble.stop(), []);
  const start = async () => {
    setRunning(true);
    await ensemble.startJam(() => taal, () => step.bpm || 90, {
      onBeat: (b) => { const c = tablaAudio.getContext(); last.current = { beat: b, time: c ? c.currentTime : 0 }; setBeat(b); },
    });
  };
  const tap = () => {
    if (!running || last.current.beat < 0) return;
    const c = tablaAudio.getContext()!, now = c.currentTime;
    const prevSam = last.current.time - last.current.beat * spb, nextSam = prevSam + taal.beats * spb;
    const near = Math.abs(now - prevSam) < Math.abs(now - nextSam) ? prevSam : nextSam;
    const id = Math.round(near / spb);
    if (Math.abs(now - near) < 0.28 && id !== used.current) {
      used.current = id; gotRef.current++; setGot(gotRef.current); setFlash('ok');
      if (gotRef.current >= need) { window.setTimeout(() => { ensemble.stop(); onDone(mistakes.current === 0 ? 3 : mistakes.current <= 2 ? 2 : 1); }, 400); }
    } else { mistakes.current++; setFlash('ng'); onMiss(); }
    window.setTimeout(() => setFlash(null), 250);
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5">
      <div className="flex flex-wrap justify-center gap-1 max-w-md">
        {Array.from({ length: taal.beats }, (_, i) => (
          <div key={i} className={`w-6 h-6 rounded-full border-2 ${i === 0 ? 'border-red-500' : i === 8 ? 'border-sky-500' : 'border-stone-600'} ${beat === i ? (i === 0 ? 'bg-red-500' : 'bg-amber-400') : 'bg-stone-900'}`} />
        ))}
      </div>
      <div className="text-amber-300 font-bold">{got} / {need}</div>
      {!running ? (
        <button onClick={start} className="w-40 h-40 rounded-full bg-amber-600 text-white font-extrabold text-2xl shadow-2xl flex flex-col items-center justify-center gap-1"><Play className="w-8 h-8" />スタート</button>
      ) : (
        <button onPointerDown={(e) => { e.preventDefault(); tap(); }}
          className={`w-48 h-48 rounded-full text-white font-extrabold text-3xl shadow-2xl active:scale-95 transition-colors ${flash === 'ok' ? 'bg-emerald-500' : flash === 'ng' ? 'bg-red-700' : 'bg-red-600'}`}>サム！</button>
      )}
    </div>
  );
};
