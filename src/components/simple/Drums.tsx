import React, { useEffect, useRef, useState } from 'react';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { BolKey } from '../../types/tabla';

/**
 * リアルな見た目のタブラー（右・ダーヤーン）とバーヤーン（左）。少し斜め上から見た図。
 * 叩くと、その打ち方の手（指の形）が現れて叩き、膜に波紋が広がる。
 */
export const BOL_LABEL: Record<BolKey, string> = {
  na: 'ナー', tin: 'ティン', tun: 'トゥン', te: 'テ', re: 'レ', ge: 'ゲー', meend: 'ゲー↑', ke: 'ケ',
  dha: 'ダー', dhin: 'ディン', ti_re_ki_ta: 'ティラキタ',
};
export const BOL_ROMAN: Record<BolKey, string> = {
  na: 'Na', tin: 'Tin', tun: 'Tun', te: 'Te', re: 'Re', ge: 'Ge', meend: 'Ge↑', ke: 'Ke',
  dha: 'Dha', dhin: 'Dhin', ti_re_ki_ta: 'TiReKiTa',
};
/** 組み合わせの打ち方 → 両手の打ち方 */
export const PARTS: Partial<Record<BolKey, BolKey[]>> = { dha: ['na', 'ge'], dhin: ['tin', 'ge'] };

const KEYMAP: Record<string, BolKey> = {
  a: 'ge', s: 'meend', d: 'ke', j: 'na', k: 'tin', l: 'tun', ';': 'te', u: 're', ' ': 'dha', g: 'dhin', t: 'ti_re_ki_ta',
};

// ---- 太鼓の形（座標） ----
const B = { cx: 118, cy: 128, rx: 100, ry: 44 };      // バーヤーンの皮
const BS = { cx: 138, cy: 120, rx: 30, ry: 13 };       // バーヤーンの黒い所（中心から少しずれている）
const D = { cx: 330, cy: 112, rx: 80, ry: 35 };        // ダーヤーンの皮（外周）
const ell = (e: { cx: number; cy: number }, rx: number, ry: number) => ({ cx: e.cx, cy: e.cy, rx, ry });

// ---- 手のポーズ：指先の位置・向き・形 ----
type HandShape = 'index' | 'two' | 'flat' | 'fingers';
interface Pose { x: number; y: number; rot: number; shape: HandShape; left?: boolean }
const POSE: Partial<Record<BolKey, Pose>> = {
  na: { x: 330, y: 80, rot: -18, shape: 'index' },          // 人差し指で縁（キナール）を弾く
  tin: { x: 360, y: 101, rot: -28, shape: 'index' },        // 人差し指で中間（スール）
  tun: { x: 330, y: 112, rot: -22, shape: 'index' },        // 人差し指で中央
  te: { x: 330, y: 113, rot: -10, shape: 'fingers' },       // 中指・薬指で中央を押さえる
  re: { x: 322, y: 110, rot: -30, shape: 'index' },         // 人差し指で黒い所を閉じて
  ge: { x: 96, y: 140, rot: 22, shape: 'two', left: true }, // 中指・人差し指で弾き、手首は縁に
  meend: { x: 96, y: 140, rot: 22, shape: 'two', left: true },
  ke: { x: 120, y: 128, rot: 12, shape: 'flat', left: true }, // 手のひらで押さえる
};

const Hand: React.FC<{ pose: Pose }> = ({ pose }) => {
  const { x, y, rot, shape, left } = pose;
  const sx = left ? -1 : 1;
  // ローカル座標：指先が原点、手は右下（左手は左下）へ伸びる
  const finger = (dx: number, len: number, on: boolean) => (
    <rect x={dx - 5.5} y={-4} width={11} height={len} rx={5.5} fill={on ? 'url(#skinHi)' : 'url(#skin)'} stroke="#8a5434" strokeWidth={0.8} />
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sx} 1)`} pointerEvents="none">
      <g className="hand-strike">
        {shape === 'flat' ? (
          <>
            <rect x={-38} y={-26} width={76} height={56} rx={24} fill="url(#skin)" stroke="#8a5434" strokeWidth={1} opacity={0.93} />
            {[-24, -8, 8, 24].map((dx, i) => <rect key={i} x={dx - 6} y={-58} width={12} height={40} rx={6} fill="url(#skin)" stroke="#8a5434" strokeWidth={0.8} />)}
          </>
        ) : (
          <>
            {/* 曲げた指（薬指・小指など） */}
            {shape !== 'fingers' && finger(24, 34, false)}
            {finger(36, 28, false)}
            {/* 叩く指 */}
            {shape === 'index' && finger(0, 54, true)}
            {shape === 'two' && <>{finger(0, 54, true)}{finger(13, 52, true)}</>}
            {shape === 'fingers' && <>{finger(0, 52, true)}{finger(12, 50, true)}{finger(24, 46, true)}</>}
            {shape === 'index' && finger(12, 40, false)}
            {/* 手のひら・手首 */}
            <rect x={-8} y={36} width={56} height={44} rx={18} fill="url(#skin)" stroke="#8a5434" strokeWidth={1} />
            <rect x={4} y={70} width={36} height={40} rx={12} fill="url(#skin)" stroke="#8a5434" strokeWidth={1} opacity={0.9} />
          </>
        )}
      </g>
    </g>
  );
};

interface Props {
  onHit?: (bol: BolKey, time: number) => void;
  target?: BolKey[]; // 光らせる打ち方
  silent?: boolean;
}

export const Drums: React.FC<Props> = ({ onHit, target = [], silent }) => {
  const [hits, setHits] = useState<{ id: number; bol: BolKey; x: number; y: number }[]>([]);
  const seq = useRef(0);
  const onHitRef = useRef(onHit); onHitRef.current = onHit;

  const hit = (bol: BolKey) => {
    if (!silent) tablaAudio.playBol(bol);
    const ctx = tablaAudio.getContext();
    // 聞こえる音の遅れ（出力レイテンシ）を差し引いた「叩いた時刻」
    const t = ctx ? ctx.currentTime - ((ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0) : 0;
    onHitRef.current?.(bol, t);
    const parts: BolKey[] = bol === 'ti_re_ki_ta' ? ['te'] : PARTS[bol] || [bol];
    const now = parts.map((p) => { const ps = POSE[p]!; return { id: ++seq.current, bol: p, x: ps.x, y: ps.y }; });
    // 同じ手（右手／左手）の前の手は消して、新しい手に置きかえる
    const sideOf = (b: BolKey) => !!POSE[b]?.left;
    setHits((h) => [...h.filter((x) => !parts.some((p) => sideOf(p) === sideOf(x.bol))), ...now]);
    const ids = now.map((n) => n.id);
    window.setTimeout(() => setHits((h) => h.filter((x) => !ids.includes(x.id))), 520);
  };
  const hitRef = useRef(hit); hitRef.current = hit;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
      const bol = KEYMAP[e.key.toLowerCase()];
      if (!bol) return;
      e.preventDefault();
      hitRef.current(bol);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const lit = (b: BolKey) => target.includes(b) || target.some((t) => (PARTS[t] || []).includes(b) || (t === 'meend' && b === 'ge'));
  const down = (b: BolKey) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); hit(b); };
  const struck = (b: BolKey) => hits.some((h) => h.bol === b || (b === 'ge' && h.bol === 'meend'));
  type E = { cx: number; cy: number; rx: number; ry: number };
  const zone = (b: BolKey, e: E, fill: string, extra?: React.SVGProps<SVGEllipseElement>) => (
    <ellipse {...e} fill={fill} onPointerDown={down(b)} className="cursor-pointer" style={{ filter: struck(b) ? 'brightness(1.22)' : undefined }} {...extra} />
  );
  const pulse = (e: E) => <ellipse {...e} fill="none" stroke="#fbbf24" strokeWidth={3.5} pointerEvents="none" className="animate-pulse" />;
  const label = (x: number, y: number, roman: string, kana: string, dark = true, size = 13) => (
    <g pointerEvents="none">
      <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={800} fill={dark ? '#3a2412' : '#f5ead8'}>{roman}</text>
      <text x={x} y={y + size * 0.85} textAnchor="middle" fontSize={size * 0.62} fontWeight={700} fill={dark ? '#6b4a2e' : '#d8cbb4'}>{kana}</text>
    </g>
  );

  // 胴に沿う革ひも（手前半分だけ見える）
  const straps = (cx: number, topY: number, topRx: number, topRy: number, botY: number, botRx: number, n: number, bulge = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = Math.PI * (0.08 + (0.84 * i) / (n - 1));
      const x1 = cx - Math.cos(a) * topRx, y1 = topY + Math.sin(a) * topRy;
      const x2 = cx - Math.cos(a) * botRx, y2 = botY + Math.sin(a) * topRy * 0.6;
      const mx = cx - Math.cos(a) * (Math.max(topRx, botRx) + bulge), my = (y1 + y2) / 2;
      return <path key={i} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke="#3b2210" strokeWidth={2.2} strokeOpacity={0.85} fill="none" pointerEvents="none" />;
    });

  return (
    <svg viewBox="0 0 440 300" className="w-full h-full select-none" style={{ touchAction: 'none' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="skinHead" cx="45%" cy="38%" r="70%"><stop offset="0" stopColor="#f7ead0" /><stop offset="1" stopColor="#d6ba8a" /></radialGradient>
        <radialGradient id="kinar" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#f2e2c2" /><stop offset="1" stopColor="#cdb07e" /></radialGradient>
        <radialGradient id="syahi" cx="38%" cy="32%" r="70%"><stop offset="0" stopColor="#55555c" /><stop offset=".6" stopColor="#1a1a1e" /><stop offset="1" stopColor="#0a0a0c" /></radialGradient>
        <linearGradient id="copper" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a2c12" /><stop offset=".28" stopColor="#c47a3c" /><stop offset=".42" stopColor="#f1b77a" /><stop offset=".6" stopColor="#b8692f" /><stop offset="1" stopColor="#4a220d" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b1f0c" /><stop offset=".3" stopColor="#7a4521" /><stop offset=".45" stopColor="#a1643a" /><stop offset=".65" stopColor="#6e3c1b" /><stop offset="1" stopColor="#331a09" />
        </linearGradient>
        <linearGradient id="gatta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5a3416" /><stop offset=".5" stopColor="#b07a48" /><stop offset="1" stopColor="#4a2a10" /></linearGradient>
        <pattern id="braid" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#5a3a1c" /><path d="M0 8 L4 0 L8 8" fill="none" stroke="#2a180a" strokeWidth="1.4" /></pattern>
        <radialGradient id="cloth" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#9b2c2c" /><stop offset="1" stopColor="#4a1010" /></radialGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c98d66" /><stop offset=".5" stopColor="#e7b48e" /><stop offset="1" stopColor="#b97d58" /></linearGradient>
        <linearGradient id="skinHi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d99c74" /><stop offset=".5" stopColor="#f6c9a4" /><stop offset="1" stopColor="#c98d66" /></linearGradient>
      </defs>
      <style>{`
        .hand-strike { animation: handStrike .5s ease-out forwards; }
        @keyframes handStrike { 0% { opacity: 0; transform: translateY(-18px); } 18% { opacity: 1; transform: translateY(0); } 60% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
        .ripple { animation: ripple .5s ease-out forwards; transform-box: fill-box; transform-origin: center; }
        @keyframes ripple { from { opacity: .9; transform: scale(.2); } to { opacity: 0; transform: scale(2.4); } }
      `}</style>

      {/* ===== 左：バーヤーン（銅の釜形の胴） ===== */}
      <ellipse cx={B.cx} cy={276} rx={78} ry={16} fill="url(#cloth)" />
      <path d={`M ${B.cx - B.rx} ${B.cy} C ${B.cx - B.rx - 22} ${B.cy + 70}, ${B.cx - 70} 266, ${B.cx} 268 C ${B.cx + 70} 266, ${B.cx + B.rx + 22} ${B.cy + 70}, ${B.cx + B.rx} ${B.cy} Z`} fill="url(#copper)" />
      <path d={`M ${B.cx - 60} ${B.cy + 40} Q ${B.cx - 70} ${B.cy + 95} ${B.cx - 30} ${B.cy + 130}`} stroke="#ffd9a8" strokeOpacity={0.35} strokeWidth={6} fill="none" strokeLinecap="round" />
      {straps(B.cx, B.cy, B.rx, B.ry, 262, 52, 11, 18)}
      <ellipse cx={B.cx} cy={B.cy} rx={B.rx + 4} ry={B.ry + 3} fill="url(#braid)" />
      {zone('ge', ell(B, B.rx - 4, B.ry - 3), 'url(#skinHead)')}
      {zone('ke', BS, 'url(#syahi)')}
      {lit('ge') && pulse(ell(B, B.rx - 2, B.ry - 1))}
      {lit('ke') && pulse(ell(BS, BS.rx + 3, BS.ry + 2))}
      {label(88, 140, 'Ge', 'ゲー', true, 15)}
      {label(BS.cx, BS.cy + 1, 'Ke', 'ケ', false, 11)}

      {/* ===== 右：ダーヤーン（木の胴・革ひも・木の調律ブロック） ===== */}
      <ellipse cx={D.cx} cy={276} rx={70} ry={15} fill="url(#cloth)" />
      <path d={`M ${D.cx - D.rx} ${D.cy} L ${D.cx - 88} 260 Q ${D.cx} 284 ${D.cx + 88} 260 L ${D.cx + D.rx} ${D.cy} Z`} fill="url(#wood)" />
      {straps(D.cx, D.cy, D.rx, D.ry, 252, 86, 13, 2)}
      {Array.from({ length: 7 }, (_, i) => { // ガッタ（音程を調整する木の円柱）
        const a = Math.PI * (0.12 + (0.76 * i) / 6), x = D.cx - Math.cos(a) * 84, y = 212 + Math.sin(a) * 12;
        return <rect key={i} x={x - 7} y={y - 16} width={14} height={30} rx={5} fill="url(#gatta)" stroke="#2a1606" strokeWidth={0.8} pointerEvents="none" />;
      })}
      <ellipse cx={D.cx} cy={D.cy} rx={D.rx + 4} ry={D.ry + 3} fill="url(#braid)" />
      {zone('na', ell(D, D.rx - 3, D.ry - 2), 'url(#kinar)', { stroke: '#a4855a', strokeWidth: 1 })}
      {zone('tin', ell(D, D.rx - 16, D.ry - 8), 'url(#skinHead)')}
      {zone('te', ell(D, 34, 15), 'url(#syahi)')}
      {zone('tun', ell(D, 12, 5.5), '#24242a', { stroke: '#6b6b74', strokeWidth: 0.8 })}
      {lit('na') && pulse(ell(D, D.rx, D.ry))}
      {lit('tin') && pulse(ell(D, D.rx - 14, D.ry - 7))}
      {(lit('te') || lit('re')) && pulse(ell(D, 36, 16))}
      {lit('tun') && pulse(ell(D, 14, 6.5))}
      {label(D.cx, D.cy - D.ry + 13, 'Na', 'ナー', true, 12)}
      {label(D.cx + 48, D.cy + 4, 'Tin', 'ティン', true, 11)}
      {label(D.cx - 18, D.cy - 1, 'Te', 'テ', false, 10)}
      {label(D.cx + 12, D.cy + 25, 'Tun', '中央', true, 8.5)}

      {/* 叩いた所の波紋と、叩いている手 */}
      {hits.map((h) => {
        const left = POSE[h.bol]?.left;
        return <ellipse key={'r' + h.id} cx={h.x} cy={h.y} rx={left ? 26 : 20} ry={left ? 11 : 9} fill="none" stroke="#fff" strokeWidth={2} className="ripple" pointerEvents="none" />;
      })}
      {hits.map((h) => <Hand key={'h' + h.id} pose={POSE[h.bol]!} />)}
    </svg>
  );
};

/** ボタンなどで使う 2段表示（アルファベット＋カタカナ） */
export const BolText: React.FC<{ b: BolKey; big?: boolean }> = ({ b, big }) => (
  <span className="flex flex-col items-center leading-tight">
    <span className={big ? 'text-lg font-extrabold' : 'text-sm font-extrabold'}>{BOL_ROMAN[b]}</span>
    <span className={big ? 'text-xs font-bold opacity-75' : 'text-[10px] font-bold opacity-75'}>{BOL_LABEL[b]}</span>
  </span>
);
