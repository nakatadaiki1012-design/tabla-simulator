import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Repeat, Info, X } from 'lucide-react';
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
  const [panel, setPanel] = useState<'free' | 'jam' | 'auto'>('free');
  const [infoOpen, setInfoOpen] = useState(false);

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

  const short = (n: string) => n.replace(/（.*/, '');
  return (
    <div className="h-full flex flex-col gap-2 p-3 max-w-6xl mx-auto w-full relative">
      {/* 1行の操作バー */}
      <div className="flex items-center gap-2">
        <select value={raagId} onChange={(e) => setRaagId(e.target.value)} aria-label="ラーガ" className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-sm font-bold text-stone-100 min-w-0 flex-1 sm:flex-none sm:w-48">
          {RAAGS.map((r) => <option key={r.id} value={r.id}>{short(r.name)}</option>)}
        </select>
        <select value={keyIdx} onChange={(e) => setKeyIdx(+e.target.value)} aria-label="調" className="bg-stone-900 border border-stone-700 rounded-xl px-2 py-2.5 text-sm font-bold text-stone-100 w-20">
          {KEYS.map((k, i) => <option key={k.label} value={i}>調 {k.label}</option>)}
        </select>
        <button onClick={toggleTanpura} aria-label="タンプーラ（持続音）" className={`h-11 px-3 rounded-xl text-sm font-bold whitespace-nowrap ${tanpura ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-300'}`}>🎵 持続音</button>
        <button onClick={() => setInfoOpen(true)} aria-label="説明" className="w-11 h-11 rounded-xl bg-stone-800 flex items-center justify-center shrink-0"><Info className="w-5 h-5 text-stone-300" /></button>
      </div>

      <div className="hidden lg:block"><SitarOverview playing={curNote != null} /></div>
        <div ref={scrollRef} className="overflow-x-auto rounded-xl">
        <svg ref={svgRef} viewBox="0 0 1000 236" className="w-full min-w-[1040px] sm:min-w-0 h-auto select-none rounded-xl" style={{ touchAction: 'pan-x', background: 'radial-gradient(ellipse at 50% 40%,#2a1a10,#120a06)' }}
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

      {/* いまの音（1行） */}
      <div className="flex items-center gap-3 h-9 px-1">
        {curName ? (<>
          <span className="text-2xl font-extrabold text-amber-400 w-14">{curName.rom}</span>
          <span className="text-xs font-bold text-stone-400 w-10">{stroke}</span>
        </>) : <span className="text-sm text-stone-500">👆 フレットを押してみよう</span>}
        <span className="text-xs text-teal-300 truncate flex-1">{finalFlash ? '🎉 サムで終演！' : meendText}</span>
        {mode !== 'none' && (mode === 'jam' || beat >= 0) && (
          <div className="flex gap-0.5">
            {Array.from({ length: perfTaal.beats }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border ${marks[i]?.startsWith('X') ? 'border-red-500' : marks[i] === '0' ? 'border-sky-500' : 'border-stone-600'} ${beat === i ? (i === 0 ? 'bg-red-500' : 'bg-amber-400') : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* モード */}
      <div className="grid grid-cols-3 gap-1 bg-stone-900 p-1 rounded-xl">
        {([['free', '🎸 自由に'], ['jam', '🪘 伴奏'], ['auto', '▶ 自動演奏']] as const).map(([id, label]) => (
          <button key={id} onClick={() => { if (id !== panel) { stopAll(); setPanel(id); } }}
            className={`py-2.5 rounded-lg text-sm font-bold ${panel === id ? 'bg-amber-600 text-white' : 'text-stone-400'}`}>{label}</button>
        ))}
      </div>

      <div className="min-h-[96px] flex flex-col justify-center gap-2">
        {panel === 'free' && (
          <>
            <div className="text-center text-xs text-stone-400">押す＝弾く　上へドラッグ＝ミーンド　横へ動かす＝すべらせる</div>
            <div className="grid grid-cols-3 gap-2">
              {([['▶ 上がる', raag.aroha, 0.45], ['▶ 下がる', raag.avaroha, 0.45], ['▶ 特徴フレーズ', raag.pakad, 0.42]] as const).map(([l, str, st]) => (
                <button key={l} onClick={() => playSargam(str, st)} className="py-3 rounded-xl bg-stone-800 text-stone-200 text-sm font-bold">{l}</button>
              ))}
            </div>
          </>
        )}
        {panel === 'jam' && (
          <div className="flex items-center gap-2">
            <select value={taalId} onChange={(e) => { setTaalId(e.target.value); setBpm(ENSEMBLE_TAALS.find((t) => t.id === e.target.value)!.bpm); }} aria-label="ターラ" className="bg-stone-900 border border-stone-700 rounded-xl px-2 py-3 text-sm font-bold text-stone-100 min-w-0 flex-1">
              {ENSEMBLE_TAALS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label className="flex flex-col items-center text-[10px] text-stone-400 w-28">テンポ {bpm}
              <input type="range" min={40} max={220} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="accent-amber-500 w-full" />
            </label>
            {mode === 'jam'
              ? <button onClick={stopAll} className="h-12 px-5 rounded-xl bg-red-600 text-white font-bold flex items-center gap-1"><Square className="w-4 h-4" />止める</button>
              : <button onClick={startJam} disabled={preparing} className="h-12 px-5 rounded-xl bg-amber-600 text-white font-bold flex items-center gap-1 disabled:opacity-50"><Repeat className="w-4 h-4" />スタート</button>}
          </div>
        )}
        {panel === 'auto' && (
          <>
            <div className="grid grid-cols-6 gap-1">
              {FLOW.map((f) => (
                <button key={f.id} onClick={() => startPerf([f.id])} disabled={preparing || mode === 'performance'}
                  className={`py-2 rounded-lg text-[11px] font-bold leading-tight ${section === f.id ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'} disabled:opacity-100`}>
                  {f.tabla ? '🪘' : '🎸'}<br />{f.name.replace(/（.*/, '').replace('トーダー＋ティハーイー', 'トーダー')}
                </button>
              ))}
            </div>
            {mode === 'performance'
              ? <button onClick={stopAll} className="h-12 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center gap-1"><Square className="w-4 h-4" />止める</button>
              : <button onClick={() => startPerf(FLOW.map((f) => f.id))} disabled={preparing} className="h-12 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center gap-1 disabled:opacity-50"><Play className="w-4 h-4" />{preparing ? '準備中…' : '最初から通して聞く（約2分）'}</button>}
          </>
        )}
      </div>

      {/* 説明（ⓘ を押したときだけ） */}
      {infoOpen && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setInfoOpen(false)}>
          <div className="w-full sm:max-w-lg max-h-[85%] overflow-y-auto bg-stone-900 border border-stone-700 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><b className="text-stone-100 text-base">{raag.name}</b><button onClick={() => setInfoOpen(false)} aria-label="閉じる"><X className="w-5 h-5" /></button></div>
            <div className="text-stone-300">{raag.desc}</div>
            <div className="text-xs text-stone-400">🕰 {raag.time}　💭 {raag.mood}</div>
            <div className="text-xs font-mono text-teal-300">上がる {raag.aroha}<br />下がる {raag.avaroha}</div>
            <hr className="border-stone-800" />
            <ul className="text-xs text-stone-400 space-y-1.5 leading-relaxed">
              <li><b className="text-stone-200">ミーンド</b>：弦を横に引いて音程を上げる技</li>
              <li><b className="text-stone-200">チカリ弦</b>：上の細い2本。リズムの「チャン」</li>
              <li><b className="text-stone-200">共鳴弦</b>：フレットの下の細い弦。同じ音で光って響く</li>
              <li><b className="text-stone-200">Da / Ra</b>：右手の爪の向き（内向き／外向き）</li>
              <li><b className="text-stone-200">自動演奏の順番</b>：{FLOW.map((f) => f.name.replace(/（.*/, '')).join(' → ')}</li>
              <li className="hidden sm:list-item"><b className="text-stone-200">キーボード</b>：Z〜M 低音／A〜L サから上／Q〜P 高いサから上／Space チカリ／Shift＋キー＝下から滑り込み</li>
            </ul>
            <p className="text-[11px] text-stone-500">🛠 自動演奏の旋律はこのアプリのオリジナルです。</p>
          </div>
        </div>
      )}
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
