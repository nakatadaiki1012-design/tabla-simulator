import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Music, Play, Square, Repeat, Info } from 'lucide-react';
import { sitarAudio, SitarStroke } from '../audio/sitarEngine';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { ensemble, ENSEMBLE_TAALS, FLOW, beatMarks } from '../audio/ensemble';
import { RAAGS, ladderOf, tarafOf, swaraName, parseSargam, OPEN_STRING } from '../data/raags';

// 調（サの音）：シタールのサ。タブラーの右の太鼓はその1オクターブ上に合わせる
const KEYS = [
  { label: 'C', hz: 130.81 }, { label: 'C#', hz: 138.59 }, { label: 'D', hz: 146.83 },
  { label: 'D#', hz: 155.56 }, { label: 'E', hz: 164.81 },
];

// 棹（フレット）の描画用：実物のように高音ほどフレットが詰まる配置（見やすく少しゆるめ）
const NUT = 30, SY = 120, K = 22; // SY: 主弦の高さ
const LEN = 955 / (1 - Math.pow(2, -(24 - OPEN_STRING) / K));
const xOf = (semi: number) => NUT + LEN * (1 - Math.pow(2, -(semi - OPEN_STRING) / K));

const fingerX = (semi: number) => (semi <= OPEN_STRING ? NUT : xOf(semi));
const markColor = (m: string) => (m.startsWith('X') ? 'border-red-500 text-red-400' : m === '0' ? 'border-sky-500 text-sky-400' : m ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500');

export const SitarPanel: React.FC = () => {
  const [raagId, setRaagId] = useState('yaman');
  const [keyIdx, setKeyIdx] = useState(2);
  const [tanpura, setTanpura] = useState(false);
  const [curNote, setCurNote] = useState<number | null>(null);
  const [stroke, setStroke] = useState<string>('–');
  const [meendText, setMeendText] = useState('');
  const [glowTaraf, setGlowTaraf] = useState<Set<number>>(new Set());
  const [chikFlash, setChikFlash] = useState(false);
  const [bend, setBend] = useState<{ x: number; dy: number } | null>(null);
  // アンサンブル
  const [mode, setMode] = useState<'none' | 'jam' | 'performance'>('none');
  const [taalId, setTaalId] = useState('teentaal');
  const [bpm, setBpm] = useState(90);
  const [beat, setBeat] = useState(-1);
  const [section, setSection] = useState<string | null>(null);
  const [finalFlash, setFinalFlash] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const raag = RAAGS.find((r) => r.id === raagId)!;
  const ladder = useMemo(() => ladderOf(raag), [raag]);
  const taraf = useMemo(() => tarafOf(raag), [raag]);
  const taal = ENSEMBLE_TAALS.find((t) => t.id === taalId)!;
  const perfTaal = mode === 'performance' ? ENSEMBLE_TAALS[0] : taal;
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const taalRef = useRef(taal); taalRef.current = taal;
  const strokeRef = useRef<SitarStroke>('Ra');
  const manual = useRef<{ semi: number; cur: number; y0: number; x: number } | null>(null);
  // 弦の振動アニメーション（押さえた位置から駒まで、だんだん小さく揺れる）
  const vib = useRef({ amp: 0, t0: 0, fx: NUT });
  const stringRef = useRef<SVGPathElement>(null);
  const fingerRef = useRef<SVGCircleElement>(null);
  const bendRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // スマホでは棹を大きく表示して横スクロール。最初は「サ」のあたりを見せる
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (xOf(0) / 1000) * el.scrollWidth - 40;
  }, []);

  // 調・ラーガが変わったら、シタール・タンプーラ・タブラーの音程をそろえて音を準備
  useEffect(() => {
    const sa = KEYS[keyIdx].hz;
    sitarAudio.setSa(sa);
    sitarAudio.taraf = taraf;
    sitarAudio.tanpuraFirst = raag.notes.includes(7) ? 7 : raag.notes.includes(5) ? 5 : 11;
    if (tablaAudio.getContext()) {
      tablaAudio.setRootNote(sa * 2);
      sitarAudio.prerender([OPEN_STRING, ...ladder]);
      if (sitarAudio.tanpuraOn) { sitarAudio.stopTanpura(); sitarAudio.startTanpura(); }
    }
  }, [keyIdx, raag, ladder, taraf]);

  // 音が鳴ったら画面に反映
  useEffect(() => sitarAudio.on((e) => {
    if (e.type === 'note') {
      setCurNote(e.semi); setStroke(e.stroke === 'Ra' ? 'Ra ↑' : 'Da ↓');
      if (e.meend && e.meend.length) {
        const to = e.meend[e.meend.length - 1].to;
        setMeendText(`ミーンド：${swaraName(e.semi).rom} → ${swaraName(to).rom}（弦を横に引いて音程を上げている）`);
        window.setTimeout(() => setCurNote(to), (e.meend[0].at + e.meend[0].dur) * 1000);
      } else if (!manual.current) setMeendText('');
    } else if (e.type === 'chikari') {
      setStroke('チカリ'); setChikFlash(true); window.setTimeout(() => setChikFlash(false), 110);
    } else if (e.type === 'taraf') {
      setGlowTaraf((s) => new Set(s).add(e.index));
      window.setTimeout(() => setGlowTaraf((s) => { const n = new Set(s); n.delete(e.index); return n; }), 900);
    }
  }), []);

  useEffect(() => sitarAudio.on((e) => {
    if (e.type === 'note') vib.current = { amp: 4.5, t0: performance.now(), fx: fingerX(e.semi) };
  }), []);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = vib.current, el = stringRef.current, fg = fingerRef.current;
      if (el) {
        const age = (performance.now() - v.t0) / 1000, amp = v.amp * Math.exp(-age * 3.2), dy = bendRef.current;
        const wob = amp * Math.sin(age * 90), fx = v.fx, mid = (fx + 1000) / 2;
        el.setAttribute('d', `M ${NUT} ${SY} L ${fx} ${SY - dy} Q ${mid} ${SY - dy * 0.55 + wob} 1000 ${SY - dy * 0.12}`);
        if (fg) { fg.setAttribute('cx', String(fx - 9)); fg.setAttribute('cy', String(SY - dy)); fg.setAttribute('opacity', fx > NUT + 1 && age < 2.5 ? String(Math.max(0, 0.9 - age * 0.3)) : '0'); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 画面を離れたら止める
  useEffect(() => () => { ensemble.stop(); sitarAudio.stopTanpura(); }, []);

  const boot = useCallback(() => {
    tablaAudio.ensureContext();
    sitarAudio.setSa(KEYS[keyIdx].hz);
    tablaAudio.setRootNote(KEYS[keyIdx].hz * 2);
    sitarAudio.taraf = taraf;
  }, [keyIdx, taraf]);

  const strike = useCallback((semi: number, opts: { meendFrom?: number } = {}) => {
    boot();
    strokeRef.current = strokeRef.current === 'Da' ? 'Ra' : 'Da';
    if (opts.meendFrom != null) sitarAudio.pluck(opts.meendFrom, undefined, { stroke: strokeRef.current, meend: [{ at: 0.05, to: semi, dur: 0.28 }] });
    else sitarAudio.pluck(semi, undefined, { stroke: strokeRef.current });
  }, [boot]);

  const playSargam = (str: string, step: number) => {
    boot(); if (mode === 'performance') { ensemble.stop(); setMode('none'); }
    let t = sitarAudio.now() + 0.1, k = 0;
    for (const n of parseSargam(str)) {
      const d = n.len * step;
      sitarAudio.pluck(n.semi, t, { stroke: k++ % 2 ? 'Ra' : 'Da', meend: n.to != null ? [{ at: d * 0.3, to: n.to, dur: d * 0.4 }] : null });
      t += d;
    }
  };

  // キーボード：Z〜M 低音域、A〜L サから上、Q〜P 高いサから上、Space チカリ、Shift でミーンド
  const keyMap = useMemo(() => {
    const m: Record<string, number> = {};
    const i0 = ladder.indexOf(0), iu = ladder.indexOf(12);
    'zxcvbnm'.split('').forEach((k, j) => { const i = i0 - 7 + j; if (i >= 0) m[k] = ladder[i]; });
    'asdfghjkl'.split('').forEach((k, j) => { if (i0 + j < ladder.length) m[k] = ladder[i0 + j]; });
    'qwertyuiop'.split('').forEach((k, j) => { if (iu + j < ladder.length) m[k] = ladder[iu + j]; });
    return m;
  }, [ladder]);
  const keyFor = useMemo(() => { const r: Record<number, string> = {}; Object.entries(keyMap).forEach(([k, s]) => (r[s] = k.toUpperCase())); return r; }, [keyMap]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement?.tagName || '');
      if (/INPUT|TEXTAREA|SELECT/.test(tag) && (document.activeElement as HTMLInputElement).type !== 'range') return;
      if (e.code === 'Space') { e.preventDefault(); boot(); sitarAudio.chikari(undefined, 0.9); return; }
      const s = keyMap[e.key.toLowerCase()];
      if (s == null) return;
      e.preventDefault();
      if (e.shiftKey) { const i = ladder.indexOf(s); strike(s, { meendFrom: i > 0 ? ladder[i - 1] : s }); }
      else strike(s);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [keyMap, ladder, strike, boot]);

  // 棹の操作（押す＝弾く、押したまま上へドラッグ＝ミーンド）
  const svgPoint = (ev: React.PointerEvent) => {
    const svg = svgRef.current!, pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };
  const zoneAt = (x: number) => {
    if (x < NUT + 14) return OPEN_STRING;
    let best = OPEN_STRING;
    ladder.forEach((z, k) => { if (x > (k ? xOf(ladder[k - 1]) : NUT + 14)) best = z; });
    return best;
  };
  const onFretDown = (semi: number) => (ev: React.PointerEvent) => {
    ev.preventDefault();
    const p = svgPoint(ev);
    strike(semi);
    manual.current = { semi, cur: semi, y0: p.y, x: p.x };
    setBend({ x: p.x, dy: 0 });
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  };
  const onMove = (ev: React.PointerEvent) => {
    const m = manual.current; if (!m) return;
    const p = svgPoint(ev);
    // 横に動かすと、弾き直さずに隣のフレットへ音が滑る
    const z = zoneAt(p.x);
    if (z !== m.cur) { m.cur = z; m.x = p.x; }
    const dy = Math.max(0, Math.min(60, m.y0 - p.y)), st = dy / 11;
    sitarAudio.bend(m.cur - m.semi + st);
    vib.current.fx = fingerX(m.cur);
    setBend({ x: fingerX(m.cur), dy });
    setCurNote(m.cur + st);
    setMeendText(st > 0.1 ? `ミーンド：+${st.toFixed(1)}半音（${swaraName(m.cur).rom} → ${swaraName(Math.round(m.cur + st)).rom}）` : m.cur !== m.semi ? `フレットに沿って滑らせています（${swaraName(m.semi).rom} → ${swaraName(m.cur).rom}）` : '');
  };
  const onUp = () => {
    const m = manual.current; if (!m) return;
    sitarAudio.bend(m.cur - m.semi, true); manual.current = null; setBend(null); setMeendText('');
  };

  // アンサンブル
  const startJam = async () => {
    boot(); setPreparing(true);
    if (!sitarAudio.tanpuraOn) { sitarAudio.startTanpura(); setTanpura(true); }
    await ensemble.startJam(() => taalRef.current, () => bpmRef.current, { onBeat: setBeat });
    setPreparing(false); setMode('jam'); setSection(null);
  };
  const startPerf = async (ids: string[]) => {
    boot(); setPreparing(true); setFinalFlash(false);
    if (!sitarAudio.tanpuraOn) { sitarAudio.startTanpura(); setTanpura(true); }
    setMode('performance'); setBeat(-1);
    await ensemble.startPerformance(raag, ids, {
      onBeat: setBeat, onSection: setSection,
      onFinal: () => setFinalFlash(true),
      onEnd: () => { setMode('none'); setSection(null); },
    });
    setPreparing(false);
  };
  const stopAll = () => { ensemble.stop(); setMode('none'); setBeat(-1); setSection(null); setPreparing(false); };
  const toggleTanpura = () => {
    boot();
    if (sitarAudio.tanpuraOn) { sitarAudio.stopTanpura(); setTanpura(false); } else { sitarAudio.startTanpura(); setTanpura(true); }
  };

  bendRef.current = bend ? bend.dy * 0.35 : 0; // 見た目：実物のように押さえた指のあたりだけ横に引かれる
  const curName = curNote != null ? swaraName(Math.round(curNote)) : null;
  const sec = FLOW.find((f) => f.id === section);
  const marks = beatMarks(perfTaal);
  const zones = [{ semi: OPEN_STRING, x0: NUT, x1: NUT + 14 }, ...ladder.map((s, i) => ({ semi: s, x0: i ? xOf(ladder[i - 1]) : NUT + 14, x1: xOf(s) }))];

  return (
    <div className="flex flex-col gap-4">
      {/* 操作バー */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 mr-2">
          <Music className="w-5 h-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-bold text-stone-100">シタール ＆ アンサンブル</h2>
        </div>
        <label className="flex flex-col text-[11px] text-stone-400 gap-1">ラーガ
          <select value={raagId} onChange={(e) => setRaagId(e.target.value)} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1.5 text-sm text-stone-100">
            {RAAGS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <div className="flex flex-col text-[11px] text-stone-400 gap-1">調（サ）
          <div className="flex gap-1">
            {KEYS.map((k, i) => (
              <button key={k.label} onClick={() => setKeyIdx(i)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${i === keyIdx ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-950 border-stone-700 text-stone-300'}`}>{k.label}</button>
            ))}
          </div>
        </div>
        <button onClick={toggleTanpura} className={`px-3 py-2 rounded-lg text-xs font-bold border ${tanpura ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-stone-950 border-stone-700 text-stone-300'}`}>
          タンプーラ（持続音）{tanpura ? 'ON' : 'OFF'}
        </button>
        <p className="text-[11px] text-stone-500 w-full">調を変えると、タブラーの右の太鼓もシタールに合わせて自動で調律されます。</p>
      </div>

      {/* 棹 */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 sm:p-4">
        <SitarOverview playing={curNote != null} />
        <div className="sm:hidden text-[11px] text-stone-500 mb-1">← 棹は横にスクロールできます →</div>
        <div ref={scrollRef} className="overflow-x-auto rounded-xl">
        <svg ref={svgRef} viewBox="0 0 1000 236" className="w-full min-w-[880px] sm:min-w-0 h-auto select-none rounded-xl" style={{ touchAction: 'pan-x', background: 'radial-gradient(ellipse at 50% 40%,#2a1a10,#120a06)' }}
          onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <defs>
            <linearGradient id="neckWood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a2410" /><stop offset=".18" stopColor="#6e3a1a" /><stop offset=".5" stopColor="#5a2e14" /><stop offset=".85" stopColor="#3e1d0b" /><stop offset="1" stopColor="#2a1206" />
            </linearGradient>
            <linearGradient id="fretMetal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7a5a2a" /><stop offset=".45" stopColor="#fff2c8" /><stop offset=".6" stopColor="#d9b46a" /><stop offset="1" stopColor="#6b4a1e" />
            </linearGradient>
            <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#c9ccd2" /><stop offset="1" stopColor="#6c6f76" />
            </linearGradient>
            <linearGradient id="bone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f6efdc" /><stop offset="1" stopColor="#cfc2a0" /></linearGradient>
            <pattern id="inlay" width="26" height="10" patternUnits="userSpaceOnUse">
              <rect width="26" height="10" fill="#2a1408" />
              <path d="M0 5 L6.5 1 L13 5 L6.5 9 Z M13 5 L19.5 1 L26 5 L19.5 9 Z" fill="none" stroke="#e9dcc0" strokeWidth=".9" />
              <circle cx="6.5" cy="5" r="1.3" fill="#e9dcc0" /><circle cx="19.5" cy="5" r="1.3" fill="#e9dcc0" />
            </pattern>
            <filter id="glowF" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          {/* 棹（ダンド）：木目と、縁の骨の象嵌 */}
          <rect x={NUT - 6} y={56} width={1010} height={128} rx={6} fill="url(#neckWood)" />
          {[70, 96, 133, 158, 171].map((y, k) => (
            <path key={k} d={`M ${NUT} ${y} C 250 ${y - 3 + k}, 520 ${y + 4 - k}, 1000 ${y - 1}`} stroke="#2a1206" strokeOpacity={0.35} strokeWidth={k % 2 ? 0.7 : 1.2} fill="none" pointerEvents="none" />
          ))}
          <rect x={NUT - 6} y={52} width={1010} height={10} fill="url(#inlay)" pointerEvents="none" />
          <rect x={NUT - 6} y={178} width={1010} height={10} fill="url(#inlay)" pointerEvents="none" />
          {/* 共鳴弦（タラフ）：フレットの下を通る細い弦。共鳴すると光る */}
          {taraf.map((_, i) => {
            const y = 142 + i * 2.6, on = glowTaraf.has(i);
            return <g key={i} pointerEvents="none">
              {on && <line x1={NUT} y1={y} x2={1000} y2={y} stroke="#5eead4" strokeWidth={3} opacity={0.7} filter="url(#glowF)" />}
              <line x1={NUT} y1={y} x2={1000} y2={y} stroke={on ? '#99f6e4' : '#b8a27a'} strokeWidth={on ? 1 : 0.55} opacity={on ? 1 : 0.55} />
            </g>;
          })}
          {/* フレット（パルダー）：弓なりの金属を糸で結びつけてある。押せる範囲＝フレットの手前 */}
          {zones.map((z) => {
            const isSa = (((z.semi % 12) + 12) % 12) === 0;
            const on = curNote != null && Math.round(curNote) === z.semi;
            const sw = swaraName(z.semi), cx = (z.x0 + z.x1) / 2 + 2, narrow = z.x1 - z.x0 < 44;
            return (
              <g key={z.semi} onPointerDown={onFretDown(z.semi)} className="cursor-pointer">
                <rect x={z.x0} y={56} width={Math.max(6, z.x1 - z.x0)} height={128} fill={on ? 'rgba(245,158,11,.16)' : 'transparent'} />
                {z.semi !== OPEN_STRING && (
                  <g pointerEvents="none">
                    {on && <path d={`M ${z.x1} 64 Q ${z.x1 - 6} 120 ${z.x1} 176`} stroke="#fbbf24" strokeWidth={7} fill="none" opacity={0.55} filter="url(#glowF)" />}
                    <path d={`M ${z.x1 + 2.5} 66 Q ${z.x1 - 3.5} 120 ${z.x1 + 2.5} 174`} stroke="#120800" strokeOpacity={0.55} strokeWidth={4} fill="none" />
                    <path d={`M ${z.x1} 64 Q ${z.x1 - 6} 120 ${z.x1} 176`} stroke="url(#fretMetal)" strokeWidth={isSa ? 4.4 : 3.6} fill="none" strokeLinecap="round" />
                    <ellipse cx={z.x1} cy={63} rx={3.2} ry={2} fill="#d8c9a3" /><ellipse cx={z.x1} cy={177} rx={3.2} ry={2} fill="#d8c9a3" />
                    <rect x={cx - 17} y={192} width={34} height={30} rx={5} fill={on ? '#78350f' : 'rgba(0,0,0,.25)'} />
                    <text x={cx} y={206} textAnchor="middle" fontSize={narrow ? 10.5 : 12.5} fontWeight={800} fill={isSa ? '#ff9b8c' : '#f3e6cf'}>{sw.rom}</text>
                    <text x={cx} y={218} textAnchor="middle" fontSize={8.5} fill="#cdb89a">{sw.kana}</text>
                    {keyFor[z.semi] && <text x={cx} y={44} textAnchor="middle" fontSize={10} fill="#7fd6c8" className="hidden sm:block">{keyFor[z.semi]}</text>}
                  </g>
                )}
              </g>
            );
          })}
          {/* 上駒（骨） */}
          <rect x={NUT - 12} y={56} width={10} height={128} rx={2} fill="url(#bone)" pointerEvents="none" />
          {/* チカリ弦 */}
          <g onPointerDown={(e) => { e.preventDefault(); boot(); sitarAudio.chikari(undefined, 0.9); }} className="cursor-pointer" opacity={chikFlash ? 0.35 : 1}>
            <rect x={NUT} y={70} width={1000} height={24} fill="transparent" />
            <line x1={NUT} y1={78} x2={1000} y2={78} stroke="url(#steel)" strokeWidth={1} />
            <line x1={NUT} y1={86} x2={1000} y2={86} stroke="url(#steel)" strokeWidth={1} />
            <text x={990} y={83} textAnchor="end" fontSize={8.5} fill="#e7d9bd" opacity={0.8}>チカリ弦（タップ）</text>
          </g>
          {/* ジョード弦（主弦の隣） */}
          <line x1={NUT} y1={SY + 14} x2={1000} y2={SY + 14} stroke="url(#steel)" strokeWidth={1.4} pointerEvents="none" opacity={0.85} />
          {/* 主弦（バージ・タール）：弾くと揺れ、ミーンドで横に引かれる */}
          <path ref={stringRef} d={`M ${NUT} ${SY} L 1000 ${SY}`} stroke="#f4f4f6" strokeWidth={2.4} fill="none" pointerEvents="none" />
          <circle ref={fingerRef} cx={NUT} cy={SY} r={8} fill="#e0a77e" stroke="#7c4a2c" strokeWidth={1.5} opacity={0} pointerEvents="none" />
          <text x={NUT + 4} y={SY - 7} fontSize={8.5} fill="#e7d9bd" opacity={0.75} pointerEvents="none">主弦（開放＝低いマ）</text>
        </svg>
        </div>
        <div className="text-xs text-teal-300 min-h-[1.2em] mt-1">{meendText}</div>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          <span className="text-[11px] text-stone-500 mr-1">共鳴弦（タラフ）：</span>
          {taraf.map((s, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${glowTaraf.has(i) ? 'bg-teal-400 text-stone-950 border-teal-300 shadow-[0_0_10px_#2dd4bf]' : 'border-stone-700 text-stone-500'}`}>{swaraName(s).rom}</span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-2"><div className="text-[10px] text-stone-500">いまの音</div><div className="text-xl font-extrabold text-amber-400">{curName ? curName.rom : '–'}</div><div className="text-[11px] text-stone-400">{curName ? curName.full : ''}</div></div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-2"><div className="text-[10px] text-stone-500">右手の爪の向き</div><div className="text-xl font-extrabold text-amber-400">{stroke}</div><div className="text-[10px] text-stone-500">Da＝内向き／Ra＝外向き</div></div>
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-2"><div className="text-[10px] text-stone-500">いまの部分</div><div className="text-sm font-bold text-amber-400">{finalFlash ? '🎉 サムで終演！' : sec ? `${sec.no}. ${sec.name}` : mode === 'jam' ? 'タブラー伴奏中' : '–'}</div><div className="text-[10px] text-stone-400 leading-tight">{sec?.point}</div></div>
        </div>
        <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
          👆 フレットを押すと弾けます。<b className="text-stone-300">押したまま上にドラッグ</b>で弦を引っ張る「ミーンド」。
          <span className="hidden sm:inline">キーボード：<kbd className="text-teal-300">Z〜M</kbd> 低音域、<kbd className="text-teal-300">A〜L</kbd> サから上、<kbd className="text-teal-300">Q〜P</kbd> 高いサから上、<kbd className="text-teal-300">Space</kbd> チカリ、<kbd className="text-teal-300">Shift</kbd>＋キーで下の音から滑り込み。</span>
        </p>
      </div>

      {/* アンサンブル */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">🪘 タブラーと一緒に演奏（アンサンブル）</h3>
        {/* 周期の表示 */}
        {mode !== 'none' && (mode === 'jam' || beat >= 0) && (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: perfTaal.beats }, (_, i) => (
              <div key={i} className={`w-7 h-7 rounded-full border-2 text-[10px] font-bold flex items-center justify-center transition-colors ${markColor(marks[i])} ${beat === i ? (i === 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-stone-950') : 'bg-stone-950'}`}>
                {marks[i] || i + 1}
              </div>
            ))}
            <span className="text-[11px] text-stone-500 self-center ml-2"><span className="text-red-400">X＝サム（1拍目）</span>・<span className="text-amber-400">数字＝手拍子</span>・<span className="text-sky-400">0＝カーリー（低音が抜ける）</span></span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {/* ジャム */}
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="text-sm font-bold text-amber-400">① タブラーの伴奏で、自分でシタールを弾く</div>
            <p className="text-xs text-stone-400">タブラーがリズムの周期（テーカ）を刻み続けます。上の棹やキーボードで、ラーガの音を自由に弾いてみよう。周期の1拍目（サム）に合わせて「サ」を弾くと気持ちよく決まります。</p>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="flex flex-col text-[11px] text-stone-400 gap-1">ターラ
                <select value={taalId} onChange={(e) => { setTaalId(e.target.value); setBpm(ENSEMBLE_TAALS.find((t) => t.id === e.target.value)!.bpm); }} className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-sm text-stone-100">
                  {ENSEMBLE_TAALS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-[11px] text-stone-400 gap-1">テンポ {bpm}
                <input type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="accent-amber-500 w-36" />
              </label>
              {mode === 'jam'
                ? <button onClick={stopAll} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1"><Square className="w-3.5 h-3.5" />止める</button>
                : <button onClick={startJam} disabled={preparing} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Repeat className="w-3.5 h-3.5" />伴奏スタート</button>}
            </div>
            <div className="text-[11px] text-stone-500 font-mono">{taal.label.join(' ')}</div>
          </div>

          {/* 自動アンサンブル */}
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="text-sm font-bold text-amber-400">② シタールとタブラーの自動アンサンブル</div>
            <p className="text-xs text-stone-400">選んだラーガで、シタール演奏の一般的な流れを約2分で通します。前半はシタールだけ、ガットからタブラーが加わり、最後は一緒にサムへ着地します。</p>
            <div className="flex flex-wrap gap-2">
              {mode === 'performance'
                ? <button onClick={stopAll} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1"><Square className="w-3.5 h-3.5" />止める</button>
                : <button onClick={() => startPerf(FLOW.map((f) => f.id))} disabled={preparing} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Play className="w-3.5 h-3.5" />{preparing ? '音を準備中…' : '通しで演奏'}</button>}
              <button onClick={() => startPerf(['gat', 'toda', 'drut'])} disabled={preparing || mode === 'performance'} className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold disabled:opacity-40">🪘 タブラー入りの部分だけ</button>
            </div>
            <p className="text-[10px] text-stone-500">🛠 旋律（ガット・トーダーなど）はこのアプリのオリジナルで、ラーガの音階に沿って自動で組み立てています。</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {FLOW.map((f) => (
            <div key={f.id} className={`rounded-xl border p-3 transition-all ${section === f.id ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_0_2px_rgba(245,158,11,.25)]' : 'border-stone-800 bg-stone-950/50'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-stone-100"><span className="inline-flex w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] items-center justify-center mr-1.5">{f.no}</span>{f.name} {f.tabla && '🪘'}</div>
                <button onClick={() => startPerf([f.id])} disabled={preparing || mode === 'performance'} className="text-[11px] px-2 py-1 rounded-md bg-stone-800 border border-stone-700 text-stone-200 disabled:opacity-40">▶ ここだけ</button>
              </div>
              <div className="text-[10px] text-teal-300 font-bold mt-1">{f.laya}・{f.tabla ? 'タブラーあり' : 'タブラーなし'}</div>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ラーガの説明 */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2"><Info className="w-4 h-4 text-amber-500" />{raag.name}</h3>
        <div className="text-xs text-stone-400">🕰 {raag.time}　💭 {raag.mood}　／ ヴァーディー（最重要音）：{raag.vadi}・サンヴァーディー：{raag.samvadi}</div>
        <p className="text-sm text-stone-300">{raag.desc}</p>
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          {[['上行（アーロハ）', raag.aroha, 0.45], ['下行（アヴァローハ）', raag.avaroha, 0.45], ['特徴的なフレーズ（パカド）', raag.pakad, 0.42]].map(([label, s, step]) => (
            <button key={label as string} onClick={() => playSargam(s as string, step as number)} className="text-left bg-stone-950 border border-stone-800 rounded-lg p-2 hover:border-amber-600">
              <div className="text-stone-400">▶ {label as string}</div><div className="font-mono text-teal-300 mt-0.5">{s as string}</div>
            </button>
          ))}
        </div>
        <details className="text-xs text-stone-400 mt-1">
          <summary className="cursor-pointer text-teal-300">シタールのしくみ・用語</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1 leading-relaxed">
            <li><b className="text-stone-200">パルダー（フレット）</b>：弓なりの金属フレット。動かせるので、ラーガに合わせて位置を変えます（この棹にもラーガの音だけが並びます）。</li>
            <li><b className="text-stone-200">ミーンド</b>：弦をフレットに沿って横に引き、音程を連続的に上げる技。声のような滑らかさがシタールの魅力。</li>
            <li><b className="text-stone-200">ジャワーリー（駒）</b>：平らな駒に弦が触れたり離れたりして生まれる「ビーン」という唸り。</li>
            <li><b className="text-stone-200">チカリ弦</b>：高いサの細い弦。リズムを刻む「チャン」。</li>
            <li><b className="text-stone-200">タラフ（共鳴弦）</b>：フレットの下の11〜13本の弦。弾かなくても、同じ音が鳴ると共鳴して残響のように響きます。</li>
            <li><b className="text-stone-200">ミズラーブ（爪）</b>：右手の針金の爪。内向き＝Da、外向き＝Ra。</li>
            <li>音名：サ・レ・ガ・マ・パ・ダ・ニ（ド〜シ）。小文字 r g d n は半音低い「コーマル」、M# は半音高い「ティーヴラ」。</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

/** シタール全体の姿（上から見た図）。下の棹がどの部分かを示す */
const SitarOverview: React.FC<{ playing: boolean }> = ({ playing }) => (
  <svg viewBox="0 0 1000 120" className="w-full h-auto mb-2 select-none pointer-events-none" aria-label="シタール全体の図">
    <defs>
      <radialGradient id="gourd" cx="45%" cy="40%" r="65%"><stop offset="0" stopColor="#c27a3e" /><stop offset=".6" stopColor="#7c3f17" /><stop offset="1" stopColor="#3a1a08" /></radialGradient>
      <linearGradient id="neckO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a4420" /><stop offset="1" stopColor="#3a1c0a" /></linearGradient>
    </defs>
    <ellipse cx={58} cy={70} rx={34} ry={30} fill="url(#gourd)" opacity={0.9} />
    <rect x={70} y={56} width={700} height={22} rx={6} fill="url(#neckO)" />
    <rect x={70} y={54} width={700} height={3} fill="#e9dcc0" opacity={0.7} /><rect x={70} y={77} width={700} height={3} fill="#e9dcc0" opacity={0.7} />
    {[110, 150, 190, 230, 270, 330, 390].map((x, i) => <g key={i}><rect x={x} y={i % 2 ? 80 : 36} width={6} height={22} rx={2} fill="#d9c49a" /><circle cx={x + 3} cy={i % 2 ? 104 : 36} r={5} fill="#e9dcc0" /></g>)}
    {Array.from({ length: 19 }, (_, i) => { const x = 140 + 500 * (1 - Math.pow(2, -i / 10)) * 1.3; return <line key={i} x1={x} y1={57} x2={x} y2={77} stroke="#e8d39a" strokeWidth={1.4} />; })}
    <rect x={128} y={50} width={640} height={34} rx={6} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.9} />
    <text x={560} y={44} textAnchor="middle" fontSize={11} fill="#fbbf24">↓ 下に拡大している部分（棹・フレット）</text>
    <ellipse cx={858} cy={67} rx={118} ry={50} fill="url(#gourd)" />
    <ellipse cx={858} cy={67} rx={92} ry={36} fill="none" stroke="#e9dcc0" strokeWidth={1.2} opacity={0.6} />
    <circle cx={858} cy={67} r={9} fill="none" stroke="#e9dcc0" strokeWidth={1} opacity={0.6} />
    <rect x={906} y={52} width={7} height={30} rx={1.5} fill="#f2e8cf" />
    <text x={909} y={100} textAnchor="middle" fontSize={10} fill="#e7d9bd">駒（ジャワーリー）</text>
    <text x={810} y={112} textAnchor="middle" fontSize={10} fill="#e7d9bd">共鳴胴（トゥンバ）</text>
    {[63, 67, 71].map((y, i) => <line key={i} x1={72} y1={y} x2={910} y2={y + (i - 1) * 2} stroke="#f4f4f6" strokeWidth={i === 1 ? 1.2 : 0.7} opacity={playing && i === 1 ? 1 : 0.7} />)}
    <text x={58} y={112} textAnchor="middle" fontSize={10} fill="#e7d9bd">上の共鳴胴</text>
    <text x={250} y={20} textAnchor="middle" fontSize={10} fill="#e7d9bd">糸巻き（ペグ）</text>
  </svg>
);
