import React, { Suspense, lazy, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

// 3D の部品は大きいので、小窓を開いたときにだけ読み込む
const Stage3D = lazy(() => import('./Stage3D'));

const load = (key: string, def: boolean) => { try { const v = localStorage.getItem(key); return v == null ? def : v === '1'; } catch { return def; } };
const save = (key: string, v: boolean) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* noop */ } };

/**
 * 3D の演奏者の小窓。
 * inline：画面のあまった場所に置く（はじめから表示）。
 * float：🎭 ボタンで開け閉めする浮かぶ小窓（場所は floatClass で指定。はじめは閉じている）。
 * ⤢ で大きく表示。開け閉めはこの端末に覚えておく。
 */
export const StageMini: React.FC<{ variant: 'inline' | 'float'; className?: string; floatClass?: string }> = ({ variant, className = '', floatClass = 'absolute right-3 top-16 z-20 w-72 h-44' }) => {
  const key = `tablalab.stage.${variant}`;
  const [open, setOpen] = useState(() => load(key, variant === 'inline'));
  const [big, setBig] = useState(false);
  const toggle = (v: boolean) => { setOpen(v); save(key, v); };

  if (!open) {
    return (
      <button onClick={() => toggle(true)} className={`${variant === 'inline' ? 'self-center' : ''} px-3 py-1.5 rounded-full bg-stone-800/90 border border-stone-700 text-xs font-bold text-stone-300 whitespace-nowrap`}>
        🎭 演奏者
      </button>
    );
  }
  const frame = (
    <div className={`relative rounded-2xl overflow-hidden border border-stone-700 bg-[#140d08] shadow-xl w-full h-full`}>
      {/* 浮かぶ小窓は、下の太鼓を叩けるようにタップを通す（大きく表示したときはドラッグで向きを変えられる） */}
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs text-stone-500">読み込み中…</div>}>
        <Stage3D className={`w-full h-full ${variant === 'float' && !big ? 'pointer-events-none' : ''}`} />
      </Suspense>
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        <button onClick={() => setBig((v) => !v)} aria-label={big ? '小さくする' : '大きくする'} className="w-7 h-7 rounded-full bg-black/50 text-stone-200 flex items-center justify-center">{big ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
        <button onClick={() => { setBig(false); toggle(false); }} aria-label="閉じる" className="w-7 h-7 rounded-full bg-black/50 text-stone-200 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
      </div>
      {(variant === 'inline' || big) && <div className="absolute left-2 bottom-1 text-[10px] text-stone-500 pointer-events-none">ドラッグで向きを変える</div>}
    </div>
  );
  if (big) return <div className="fixed inset-0 z-40 bg-black/70 p-3 sm:p-8 flex items-center justify-center"><div className="w-full max-w-4xl aspect-[16/10] max-h-full">{frame}</div></div>;
  if (variant === 'float') return <div className={`${floatClass} pointer-events-none [&_button]:pointer-events-auto opacity-95`}>{frame}</div>;
  return <div className={className}>{frame}</div>;
};
