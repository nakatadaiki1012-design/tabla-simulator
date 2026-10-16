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
  tin: { x: 370, y: 98, rot: 12, shape: 'index' },          // 人差し指で中間（スール）
  tun: { x: 330, y: 118, rot: -20, shape: 'index' },        // 人差し指で中央
  te: { x: 326, y: 116, rot: -10, shape: 'fingers' },       // 中指・薬指・小指をそろえて中央を閉じて打つ
  re: { x: 318, y: 110, rot: -28, shape: 'index' },         // 人差し指で黒い所を閉じて
  ge: { x: 88, y: 136, rot: 20, shape: 'two', left: true }, // 中指・人差し指で弾き、手首は縁に
  meend: { x: 88, y: 136, rot: 20, shape: 'two', left: true },
  ke: { x: 112, y: 122, rot: 10, shape: 'flat', left: true }, // 手のひらで押さえる
};

// ---- 手（手の甲を真上から見た形）。右手のローカル座標：人差し指の先が原点、手首は下 ----
type F = 'I' | 'M' | 'R' | 'P' | 'T';
const FING: Record<F, { bx: number; by: number; tx: number; ty: number; wb: number; wt: number }> = {
  I: { bx: 0, by: 54, tx: 0, ty: 0, wb: 12.5, wt: 10 },
  M: { bx: 13.5, by: 51, tx: 14, ty: -4, wb: 13, wt: 10.5 },
  R: { bx: 26, by: 53, tx: 27.5, ty: 2, wb: 12, wt: 9.5 },
  P: { bx: 37.5, by: 58, tx: 41, ty: 18, wb: 10, wt: 8 },
  T: { bx: 4, by: 96, tx: -15, ty: 50, wb: 17, wt: 11 }, // 親指：手首の近くから人差し指の横へ
};
const EXT: Record<HandShape, F[]> = { index: ['I'], two: ['I', 'M'], fingers: ['M', 'R', 'P'], flat: ['I', 'M', 'R', 'P'] };
const SKIN_LINE = '#94593a';

type Pt = [number, number];
/** 点を通るなめらかな曲線（キャットマル・ロム → ベジェ）。各区間の C コマンドを返す */
function smooth(pts: Pt[], closed: boolean): string[] {
  const n = pts.length, at = (i: number) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const segs: string[] = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    segs.push(`C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return segs;
}
const pathOf = (pts: Pt[]) => `M ${pts[0][0]} ${pts[0][1]} ${smooth(pts, true).join(' ')} Z`;

/**
 * 指1本（手の甲側から見た形）。関節で少しふくらみ、先は丸く細くなる。
 * 爪（根元の白い半月・つや）、関節のしわ、指先の赤み、円柱のような陰影つき。
 * curl＝曲げた指：短く見え、先に第2関節の丸いでっぱりとしわが出る。
 */
const Finger: React.FC<{ f: F; curl?: boolean }> = ({ f, curl }) => {
  const g = FING[f];
  const k = curl ? 0.36 : 1;
  const ex = g.bx + (g.tx - g.bx) * k, ey = g.by + (g.ty - g.by) * k;
  const dx = ex - g.bx, dy = ey - g.by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const P = (along: number, side: number): Pt => [g.bx + ux * along + px * side, g.by + uy * along + py * side];
  const wt = curl ? g.wb * 1.02 : g.wt;
  // 幅：根元→先へ細く。関節（第2・第1）で少しふくらむ
  const bump = (t: number, c: number, h: number) => h * Math.exp(-((t - c) ** 2) / 0.006);
  const W = (t: number) => (g.wb + (wt - g.wb) * t) / 2 + (curl ? bump(t, 0.9, 0.6) : bump(t, 0.47, 0.55) + bump(t, 0.76, 0.35));
  const ts = [0, 0.18, 0.34, 0.47, 0.6, 0.76, 0.86];
  const r = wt / 2, capStart = L - r;
  const left = ts.map((t) => P(Math.min(t * L, capStart), -W(t)));
  const cap: Pt[] = [-60, -25, 0, 25, 60].map((deg) => { const a = (deg * Math.PI) / 180; return P(capStart + r * Math.cos(a) * 1.02, r * Math.sin(a) * 0.98); });
  const right = ts.slice().reverse().map((t) => P(Math.min(t * L, capStart), W(t)));
  const outline = pathOf([...left, ...cap, ...right]);
  const gid = `fg${f}${curl ? 'c' : ''}`;
  const [g1, g2] = [P(0, -g.wb / 2), P(0, g.wb / 2)];
  const arc = (t: number, w: number, bend: number) => { const a = P(t, -w), m = P(t + bend, 0), c = P(t, w); return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} Q ${m[0].toFixed(1)} ${m[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`; };
  // 爪：先の方に、根元が少し細い角の丸い形
  const nl = wt * 0.95, n0 = L - nl - r * 0.15, n1 = L - r * 0.3, nw0 = wt * 0.27, nw1 = wt * 0.33;
  const nail = pathOf([P(n0, -nw0), P((n0 + n1) / 2, -nw1), P(n1, -nw1 * 0.95), P(n1 + 1.2, 0), P(n1, nw1 * 0.95), P((n0 + n1) / 2, nw1), P(n0, nw0), P(n0 - 0.8, 0)]);
  const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
  const tip = P(L - r * 0.9, 0), lun = P(n0 + 1.1, 0), knk = P(L - r * 0.85, 0);
  return (
    <g>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={g1[0]} y1={g1[1]} x2={g2[0]} y2={g2[1]}>
          <stop offset="0" stopColor="#a8693f" /><stop offset=".18" stopColor="#d49a72" /><stop offset=".45" stopColor="#efc19c" /><stop offset=".75" stopColor="#dca37c" /><stop offset="1" stopColor="#a36440" />
        </linearGradient>
      </defs>
      <path d={outline} fill={`url(#${gid})`} stroke={SKIN_LINE} strokeWidth={0.7} strokeLinejoin="round" />
      {curl ? (
        <>
          {/* 第2関節のでっぱり（光）としわ */}
          <ellipse cx={knk[0]} cy={knk[1]} rx={r * 0.62} ry={r * 0.8} transform={`rotate(${ang + 90} ${knk[0]} ${knk[1]})`} fill="#f7d2b2" opacity={0.55} />
          {[0.55, 0.7, 0.82].map((t, i) => <path key={i} d={arc(L * t, W(t) * 0.55, 1.4)} stroke={SKIN_LINE} strokeWidth={0.5} fill="none" opacity={0.45} />)}
        </>
      ) : (
        <>
          {/* 第2関節（3本）・第1関節（2本）のしわ */}
          {[-1.3, 0, 1.3].map((o, i) => <path key={'p' + i} d={arc(L * 0.47 + o, W(0.47) * (0.55 - Math.abs(o) * 0.08), 1.1)} stroke={SKIN_LINE} strokeWidth={0.5} fill="none" opacity={0.42} />)}
          {[-0.7, 0.7].map((o, i) => <path key={'d' + i} d={arc(L * 0.76 + o, W(0.76) * 0.45, 0.8)} stroke={SKIN_LINE} strokeWidth={0.45} fill="none" opacity={0.38} />)}
          {/* 指先の赤み */}
          <ellipse cx={tip[0]} cy={tip[1]} rx={r * 0.95} ry={r * 1.1} transform={`rotate(${ang + 90} ${tip[0]} ${tip[1]})`} fill="#e48f7c" opacity={0.22} />
          {/* 爪：本体・根元の半月・つや */}
          <path d={nail} fill="url(#nail)" stroke="#b98572" strokeWidth={0.45} />
          <ellipse cx={lun[0]} cy={lun[1]} rx={nw0 * 0.7} ry={1.1} transform={`rotate(${ang + 90} ${lun[0]} ${lun[1]})`} fill="#fff4ee" opacity={0.7} />
          <path d={`M ${P(n0 + 1.5, -nw0 * 0.35).join(' ')} L ${P(n1 - 0.6, -nw1 * 0.4).join(' ')}`} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" opacity={0.45} />
        </>
      )}
    </g>
  );
};

// 手の甲の外形（上の縁はナックルのでこぼこ。親指の付け根のふくらみ付き）
const PALM: Pt[] = [
  [-7.5, 58], [-1, 51.5], [6.5, 51], [13.5, 48.5], [20, 50], [26, 50.5], [32, 53], [38, 55.5], [44, 60],
  [46, 72], [43.5, 86], [38, 99], [30, 105.5], [19, 106.5], [9, 105.5], [1, 99], [-6, 89], [-9.5, 76],
];
const PALM_FILL = pathOf(PALM);
// 縁取りはナックルの上（指と重なる所）を除いた、外側だけ
const PALM_EDGE = (() => { const segs = smooth(PALM, true); const i0 = 8; return `M ${PALM[i0][0]} ${PALM[i0][1]} ${[...segs.slice(i0), segs[0]].join(' ')}`; })();

const Hand: React.FC<{ pose: Pose }> = ({ pose }) => {
  const { x, y, rot, shape, left } = pose;
  const sx = left ? -1 : 1;
  const ext = EXT[shape];
  const curled = (['P', 'R', 'M', 'I'] as F[]).filter((f) => !ext.includes(f));
  // 手のひら（ケ）は手の中心、テは中指の先を、叩く場所に合わせる
  const off = shape === 'flat' ? 'translate(-19 -74)' : shape === 'fingers' ? 'translate(-15 6)' : '';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sx} 1)`} pointerEvents="none">
      <g className="hand-strike">
        <g transform={off} filter="url(#handShadow)">
          {/* 腕・手首 */}
          <path d="M 7 100 Q 19 97 32 100 Q 35 126 34 154 L 6 154 Q 4 126 7 100 Z" fill="url(#arm)" />
          {/* 指（根元は手の甲の下にもぐる）：親指 → 曲げた指 → のばした指（小指側から） */}
          <Finger f="T" />
          {curled.map((f) => <Finger key={f} f={f} curl />)}
          {(['P', 'R', 'M', 'I'] as F[]).filter((f) => ext.includes(f)).map((f) => <Finger key={f} f={f} />)}
          {/* 手の甲 */}
          <path d={PALM_FILL} fill="url(#palm)" />
          <path d={PALM_EDGE} fill="none" stroke={SKIN_LINE} strokeWidth={0.85} />
          {/* 指の骨に沿った筋（腱）・うっすら見える血管・手首のしわ */}
          {(['I', 'M', 'R', 'P'] as F[]).map((f) => <path key={f} d={`M ${FING[f].bx} ${FING[f].by + 5} Q ${FING[f].bx * 0.72 + 5.5} ${FING[f].by + 27} ${19 + (FING[f].bx - 19) * 0.3} 101`} stroke="#b9805c" strokeWidth={1.1} fill="none" opacity={0.2} strokeLinecap="round" />)}
          <path d="M 30 70 Q 25 80 27 92 Q 28 98 24 104" stroke="#7d8fb0" strokeWidth={1.1} fill="none" opacity={0.12} strokeLinecap="round" />
          <path d="M 12 74 Q 16 84 14 94 Q 13 99 16 104" stroke="#7d8fb0" strokeWidth={0.9} fill="none" opacity={0.1} strokeLinecap="round" />
          <path d="M 10 104.5 Q 19 106.5 29 104.5" stroke={SKIN_LINE} strokeWidth={0.5} fill="none" opacity={0.35} />
          {/* ナックル（指の付け根の骨）の光 */}
          {(['I', 'M', 'R', 'P'] as F[]).map((f) => <ellipse key={'k' + f} cx={FING[f].bx + 0.5} cy={FING[f].by + 1.5} rx={4} ry={2.4} fill="#f8d6b8" opacity={ext.includes(f) ? 0.25 : 0.45} />)}
          {/* 親指の付け根のふくらみ */}
          <ellipse cx={-3} cy={80} rx={4.5} ry={9} transform="rotate(-20 -3 80)" fill="#f2c7a3" opacity={0.35} />
        </g>
      </g>
    </g>
  );
};

/** 太鼓の外のボタン（Dha など）から叩く：音・手の動き・判定を太鼓をタップしたときと同じにする */
export const strikeDrums = (bol: BolKey) => window.dispatchEvent(new CustomEvent<BolKey>('tabla-strike', { detail: bol }));

interface Props {
  onHit?: (bol: BolKey, time: number) => void;
  target?: BolKey[]; // 光らせる打ち方
  silent?: boolean;
}

export const Drums: React.FC<Props> = ({ onHit, target = [], silent }) => {
  const [hits, setHits] = useState<{ id: number; bol: BolKey; x: number; y: number }[]>([]);
  const seq = useRef(0);
  const onHitRef = useRef(onHit); onHitRef.current = onHit;

  // 手を出す（同じ手＝右手／左手の前の手は消して、新しい手に置きかえる）
  const showHands = (parts: BolKey[]) => {
    const now = parts.map((p) => { const ps = POSE[p]!; return { id: ++seq.current, bol: p, x: ps.x, y: ps.y }; });
    const sideOf = (b: BolKey) => !!POSE[b]?.left;
    setHits((h) => [...h.filter((x) => !parts.some((p) => sideOf(p) === sideOf(x.bol))), ...now]);
    const ids = now.map((n) => n.id);
    window.setTimeout(() => setHits((h) => h.filter((x) => !ids.includes(x.id))), 520);
  };
  const hit = (bol: BolKey) => {
    if (!silent) tablaAudio.playBol(bol);
    const ctx = tablaAudio.getContext();
    // 聞こえる音の遅れ（出力レイテンシ）を差し引いた「叩いた時刻」
    const t = ctx ? ctx.currentTime - ((ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0) : 0;
    onHitRef.current?.(bol, t);
    if (bol === 'ti_re_ki_ta') {
      // Ti・Re・Ki・Ta を音と同じ間隔（0.07秒）で順番に見せる
      (['te', 're', 'ke', 'te'] as BolKey[]).forEach((p, i) => window.setTimeout(() => showHands([p]), i * 70));
    } else showHands(PARTS[bol] || [bol]);
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
    const st = (e: Event) => hitRef.current((e as CustomEvent<BolKey>).detail);
    window.addEventListener('keydown', h);
    window.addEventListener('tabla-strike', st);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('tabla-strike', st); };
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
        <linearGradient id="arm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9a17a" /><stop offset="1" stopColor="#d9a17a" stopOpacity="0" /></linearGradient>
        <radialGradient id="nail" cx="50%" cy="60%" r="75%"><stop offset="0" stopColor="#f6d6cc" /><stop offset=".7" stopColor="#e9b9a8" /><stop offset="1" stopColor="#d49e8a" /></radialGradient>
        <linearGradient id="palm" gradientUnits="userSpaceOnUse" x1="-10" y1="0" x2="47" y2="0"><stop offset="0" stopColor="#c98a62" /><stop offset=".3" stopColor="#e9b892" /><stop offset=".55" stopColor="#efc29e" /><stop offset=".85" stopColor="#d79d76" /><stop offset="1" stopColor="#b37450" /></linearGradient>
        <filter id="handShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="3" dy="5" stdDeviation="3" floodColor="#000" floodOpacity="0.38" /></filter>
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
