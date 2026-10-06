import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { BolKey } from '../../types/tabla';

/**
 * すっきりした太鼓（上から見た図）。叩く場所に打ち方の名前だけを表示。
 * target を渡すと、その場所が光って「ここを叩いて」と示す。
 */
export const BOL_LABEL: Record<BolKey, string> = {
  na: 'ナー', tin: 'ティン', tun: 'トゥン', te: 'テ', re: 'レ', ge: 'ゲー', meend: 'ゲー↑', ke: 'ケ',
  dha: 'ダー', dhin: 'ディン', ti_re_ki_ta: 'ティラキタ',
};
/** 組み合わせの打ち方 → 両手の打ち方 */
export const PARTS: Partial<Record<BolKey, BolKey[]>> = { dha: ['na', 'ge'], dhin: ['tin', 'ge'] };

const KEYMAP: Record<string, BolKey> = {
  a: 'ge', s: 'meend', d: 'ke', j: 'na', k: 'tin', l: 'tun', ';': 'te', u: 're', ' ': 'dha', g: 'dhin', t: 'ti_re_ki_ta',
};

interface Props {
  onHit?: (bol: BolKey, time: number) => void;
  target?: BolKey[]; // 光らせる打ち方
  silent?: boolean;
}

export const Drums: React.FC<Props> = ({ onHit, target = [], silent }) => {
  const [flash, setFlash] = useState<Record<string, number>>({});
  // 縦長の画面（スマホ縦向き）では太鼓を上下に並べて大きく見せる
  const box = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(false);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setVertical(el.clientHeight > el.clientWidth * 1.15));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const onHitRef = useRef(onHit); onHitRef.current = onHit;

  const hit = (bol: BolKey) => {
    if (!silent) tablaAudio.playBol(bol);
    const ctx = tablaAudio.getContext();
    // 聞こえる音の遅れ（出力レイテンシ）を差し引いた「叩いた時刻」
    const t = ctx ? ctx.currentTime - ((ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0) : 0;
    onHitRef.current?.(bol, t);
    const parts = PARTS[bol] || [bol === 'meend' ? 'ge' : bol];
    setFlash((f) => { const n = { ...f }; parts.forEach((p) => (n[p] = Date.now())); return n; });
    window.setTimeout(() => setFlash((f) => ({ ...f })), 170); // 光を消すための再描画
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

  const lit = (b: BolKey) => target.includes(b) || target.some((t) => (PARTS[t] || []).includes(b));
  const fl = (b: string) => (Date.now() - (flash[b] || 0) < 160);
  const down = (b: BolKey) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); hit(b); };

  const zone = (b: BolKey, el: React.ReactNode) => (
    <g onPointerDown={down(b)} className="cursor-pointer" style={{ filter: fl(b) ? 'brightness(1.8)' : undefined }}>{el}</g>
  );
  const pulse = (cx: number, cy: number, r: number) => (
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fbbf24" strokeWidth={4} pointerEvents="none" className="animate-pulse" />
  );
  const label = (x: number, y: number, t: string, dark = false, size = 15) => (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={800} fill={dark ? '#2a1a10' : '#f5ead8'} pointerEvents="none">{t}</text>
  );

  return (
    <div ref={box} className="w-full h-full">
    <svg viewBox={vertical ? '0 0 240 448' : '0 0 420 220'} className="w-full h-full select-none" style={{ touchAction: 'none' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="dSkin" cx="45%" cy="40%" r="70%"><stop offset="0" stopColor="#f6e7c9" /><stop offset="1" stopColor="#d9bf92" /></radialGradient>
        <radialGradient id="dCopper" cx="45%" cy="40%" r="70%"><stop offset="0" stopColor="#c98a52" /><stop offset="1" stopColor="#5e3318" /></radialGradient>
        <radialGradient id="dWood" cx="45%" cy="40%" r="70%"><stop offset="0" stopColor="#8f5a32" /><stop offset="1" stopColor="#3e2310" /></radialGradient>
        <radialGradient id="dSyahi" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#4b4b52" /><stop offset="1" stopColor="#0d0d10" /></radialGradient>
      </defs>
      <g transform={vertical ? 'translate(10 214)' : undefined}>
      {/* 左：バーヤーン（低音） */}
      <circle cx={110} cy={112} r={102} fill="url(#dCopper)" />
      {zone('ge', <circle cx={110} cy={112} r={88} fill="url(#dSkin)" />)}
      {zone('ke', <circle cx={128} cy={96} r={30} fill="url(#dSyahi)" />)}
      {label(90, 160, 'ゲー', true, 17)}
      {label(128, 101, 'ケ', false, 14)}
      {lit('ge') && pulse(110, 112, 92)}
      {lit('ke') && pulse(128, 96, 34)}
      </g>
      <g transform={vertical ? 'translate(-190 2)' : undefined}>
      {/* 右：ダーヤーン（高音） */}
      <circle cx={310} cy={116} r={92} fill="url(#dWood)" />
      {zone('na', <circle cx={310} cy={116} r={80} fill="#ead6ad" stroke="#b3956a" strokeWidth={1.5} />)}
      {zone('tin', <circle cx={310} cy={116} r={64} fill="url(#dSkin)" />)}
      {zone('te', <circle cx={310} cy={116} r={38} fill="url(#dSyahi)" />)}
      {zone('tun', <circle cx={310} cy={116} r={15} fill="#26262c" stroke="#666" strokeWidth={1} />)}
      {label(310, 49, 'ナー', true, 14)}
      {label(310, 196, 'ティン', true, 14)}
      {label(310, 102, 'テ', false, 13)}
      {label(310, 121, 'トゥン', false, 9)}
      {lit('na') && pulse(310, 116, 84)}
      {lit('tin') && pulse(310, 116, 60)}
      {lit('te') && pulse(310, 116, 36)}
      {lit('tun') && pulse(310, 116, 17)}
      </g>
    </svg>
    </div>
  );
};
