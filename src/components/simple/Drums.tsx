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
const B = { cx: 112, cy: 118, r: 80 };   // バーヤーンの皮（真上から）
const BS = { cx: 130, cy: 103, r: 27 };  // バーヤーンの黒い所（中心から少しずれている）
const D = { cx: 330, cy: 118, r: 70 };   // ダーヤーンの皮（外周）
const circ = (e: { cx: number; cy: number }, r: number) => ({ cx: e.cx, cy: e.cy, r });

// ---- 手のポーズ：指先の位置・向き・形 ----
type HandShape = 'index' | 'two' | 'flat' | 'fingers';
interface Pose { x: number; y: number; rot: number; shape: HandShape; left?: boolean }
const POSE: Partial<Record<BolKey, Pose>> = {
  na: { x: 330, y: 54, rot: -10, shape: 'index' },          // 人差し指で縁（キナール）を弾く
  tin: { x: 372, y: 96, rot: -30, shape: 'index' },        // 人差し指で中間（スール）
  tun: { x: 330, y: 118, rot: -20, shape: 'index' },        // 人差し指で中央
  te: { x: 326, y: 116, rot: -10, shape: 'fingers' },       // 中指・薬指で中央を押さえる
  re: { x: 318, y: 110, rot: -28, shape: 'index' },         // 人差し指で黒い所を閉じて
  ge: { x: 88, y: 136, rot: 20, shape: 'two', left: true }, // 中指・人差し指で弾き、手首は縁に
  meend: { x: 88, y: 136, rot: 20, shape: 'two', left: true },
  ke: { x: 112, y: 122, rot: 10, shape: 'flat', left: true }, // 手のひらで押さえる
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
  type C = { cx: number; cy: number; r: number };
  const zone = (b: BolKey, c: C, fill: string, extra?: React.SVGProps<SVGCircleElement>) => (
    <circle {...c} fill={fill} onPointerDown={down(b)} className="cursor-pointer" style={{ filter: struck(b) ? 'brightness(1.18)' : undefined }} {...extra} />
  );
  const pulse = (c: C) => <circle {...c} fill="none" stroke="#fbbf24" strokeWidth={3.5} pointerEvents="none" className="animate-pulse" />;
  // 真上から見た革ひも（編んだ縁から外へ放射状にのびる）
  const radial = (cx: number, cy: number, r1: number, r2: number, n: number, w = 3) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} stroke="#3a200d" strokeWidth={w} strokeLinecap="round" opacity={0.9} pointerEvents="none" />;
    });
  // シャーヒー：何層にも塗り重ねた黒い円（同心円のすじ）とつや
  const syahi = (cx: number, cy: number, r: number) => (
    <g pointerEvents="none">
      {[0.82, 0.62, 0.42].map((k, i) => <circle key={i} cx={cx} cy={cy} r={r * k} fill="none" stroke="#3a3a42" strokeWidth={0.7} opacity={0.8} />)}
      <ellipse cx={cx - r * 0.32} cy={cy - r * 0.38} rx={r * 0.4} ry={r * 0.18} fill="#fff" opacity={0.13} transform={`rotate(-30 ${cx - r * 0.32} ${cy - r * 0.38})`} />
    </g>
  );
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
    <svg viewBox="0 0 440 236" className="w-full h-full select-none" style={{ touchAction: 'none' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="skinHead" cx="46%" cy="42%" r="62%"><stop offset="0" stopColor="#f6e6c6" /><stop offset=".75" stopColor="#e2c899" /><stop offset="1" stopColor="#c9a873" /></radialGradient>
        <radialGradient id="kinar" cx="50%" cy="50%" r="50%"><stop offset=".78" stopColor="#dcc192" /><stop offset=".9" stopColor="#efdcb4" /><stop offset="1" stopColor="#c4a26c" /></radialGradient>
        <radialGradient id="syahiG" cx="40%" cy="36%" r="68%"><stop offset="0" stopColor="#4a4a52" /><stop offset=".55" stopColor="#18181c" /><stop offset="1" stopColor="#060607" /></radialGradient>
        <radialGradient id="copperTop" cx="42%" cy="38%" r="62%"><stop offset=".7" stopColor="#d8904e" /><stop offset=".86" stopColor="#f3c08a" /><stop offset="1" stopColor="#6a3214" /></radialGradient>
        <radialGradient id="woodTop" cx="45%" cy="40%" r="60%"><stop offset=".72" stopColor="#8a4f27" /><stop offset=".9" stopColor="#a8693c" /><stop offset="1" stopColor="#3e1f0b" /></radialGradient>
        <linearGradient id="gatta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5a3416" /><stop offset=".5" stopColor="#c08a55" /><stop offset="1" stopColor="#4a2a10" /></linearGradient>
        <pattern id="braid" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#6b4520" /><rect width="3.5" height="7" fill="#3e2510" /></pattern>
        <radialGradient id="cloth" cx="50%" cy="50%" r="50%"><stop offset=".7" stopColor="#7a1c1c" /><stop offset=".85" stopColor="#a83232" /><stop offset="1" stopColor="#3f0c0c" /></radialGradient>
        <filter id="leather" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .22 0" result="t" />
          <feComposite in="t" in2="SourceGraphic" operator="in" result="tex" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="tex" /></feMerge>
        </filter>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c98d66" /><stop offset=".5" stopColor="#e7b48e" /><stop offset="1" stopColor="#b97d58" /></linearGradient>
        <linearGradient id="skinHi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d99c74" /><stop offset=".5" stopColor="#f6c9a4" /><stop offset="1" stopColor="#c98d66" /></linearGradient>
      </defs>
      <style>{`
        .hand-strike { animation: handStrike .5s ease-out forwards; }
        @keyframes handStrike { 0% { opacity: 0; transform: translateY(14px) scale(1.08); } 18% { opacity: 1; transform: translateY(0) scale(1); } 60% { opacity: 1; } 100% { opacity: 0; transform: translateY(8px); } }
        .ripple { animation: ripple .5s ease-out forwards; transform-box: fill-box; transform-origin: center; }
        @keyframes ripple { from { opacity: .9; transform: scale(.2); } to { opacity: 0; transform: scale(2.6); } }
      `}</style>

      {/* ===== 左：バーヤーン（真上から：銅の胴がふくらんで、皮のまわりに見える） ===== */}
      <circle cx={B.cx} cy={B.cy} r={110} fill="url(#cloth)" />
      <circle cx={B.cx} cy={B.cy} r={102} fill="url(#copperTop)" />
      <circle cx={B.cx} cy={B.cy} r={102} fill="none" stroke="#3a1a08" strokeWidth={1.5} />
      {radial(B.cx, B.cy, B.r + 6, 100, 16, 3.2)}
      <circle cx={B.cx} cy={B.cy} r={B.r + 7} fill="url(#braid)" />
      {zone('ge', circ(B, B.r), 'url(#skinHead)', { filter: 'url(#leather)' })}
      <circle cx={B.cx} cy={B.cy} r={B.r - 1} fill="none" stroke="#b08a56" strokeWidth={1} pointerEvents="none" />
      {zone('ke', BS, 'url(#syahiG)')}
      {syahi(BS.cx, BS.cy, BS.r)}
      {lit('ge') && pulse(circ(B, B.r + 2))}
      {lit('ke') && pulse(circ(BS, BS.r + 3))}
      {label(84, 150, 'Ge', 'ゲー', true, 16)}
      {label(BS.cx, BS.cy + 1, 'Ke', 'ケ', false, 11)}

      {/* ===== 右：ダーヤーン（真上から：下に広がる木の胴・革ひも・ガッタが皮のまわりに見える） ===== */}
      <circle cx={D.cx} cy={D.cy} r={100} fill="url(#cloth)" />
      <circle cx={D.cx} cy={D.cy} r={93} fill="url(#woodTop)" />
      <circle cx={D.cx} cy={D.cy} r={93} fill="none" stroke="#2a1406" strokeWidth={1.5} />
      {radial(D.cx, D.cy, D.r + 5, 92, 24, 2.4)}
      {Array.from({ length: 8 }, (_, i) => { // ガッタ（音程を調整する木の円柱）
        const a = ((i + 0.5) / 8) * Math.PI * 2, x = D.cx + Math.cos(a) * 84, y = D.cy + Math.sin(a) * 84;
        return <rect key={i} x={x - 6} y={y - 9} width={12} height={18} rx={4} fill="url(#gatta)" stroke="#2a1606" strokeWidth={0.8} transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`} pointerEvents="none" />;
      })}
      <circle cx={D.cx} cy={D.cy} r={D.r + 6} fill="url(#braid)" />
      {zone('na', circ(D, D.r), 'url(#kinar)', { filter: 'url(#leather)' })}
      <circle cx={D.cx} cy={D.cy} r={D.r - 12} fill="none" stroke="#a88456" strokeWidth={1.2} pointerEvents="none" />
      {zone('tin', circ(D, D.r - 13), 'url(#skinHead)', { filter: 'url(#leather)' })}
      {zone('te', circ(D, 29), 'url(#syahiG)')}
      {syahi(D.cx, D.cy, 29)}
      {zone('tun', circ(D, 10), '#1c1c21', { stroke: '#5f5f68', strokeWidth: 0.8 })}
      {lit('na') && pulse(circ(D, D.r + 2))}
      {lit('tin') && pulse(circ(D, D.r - 15))}
      {(lit('te') || lit('re')) && pulse(circ(D, 31))}
      {lit('tun') && pulse(circ(D, 12))}
      {label(D.cx, D.cy - D.r + 9, 'Na', 'ナー', true, 10.5)}
      {label(D.cx + 43, D.cy + 2, 'Tin', 'ティン', true, 11)}
      {label(D.cx - 13, D.cy - 9, 'Te', 'テ', false, 9.5)}
      {label(D.cx, D.cy + 42, 'Tun = 中央', 'トゥン', true, 8)}

      {/* 叩いた所の波紋と、叩いている手 */}
      {hits.map((h) => {
        const left = POSE[h.bol]?.left;
        return <circle key={'r' + h.id} cx={h.x} cy={h.y} r={left ? 22 : 16} fill="none" stroke="#fff" strokeWidth={2} className="ripple" pointerEvents="none" />;
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
