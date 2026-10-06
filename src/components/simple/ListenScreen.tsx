import React, { useEffect, useRef, useState } from 'react';
import { Info, Play, Square, X } from 'lucide-react';
import { AUTO_PERFORMANCES, AutoPerformance } from '../../audio/autoPerformances';
import { tablaAudio } from '../../audio/tablaAudioEngine';

const TYPE: Record<AutoPerformance['compositionType'], { name: string; icon: string }> = {
  Theka: { name: 'テーカ（基本の型）', icon: '🔁' }, Kayda: { name: 'カイダ（主題と変奏）', icon: '🧩' },
  Rela: { name: 'レラ（高速の連打）', icon: '⚡' }, Tukra: { name: 'トゥクラ（決めの曲）', icon: '🎯' },
  Peshkar: { name: 'ペシュカール（導入）', icon: '🌅' }, Tihai: { name: 'ティハーイー', icon: '3️⃣' }, Jugalbandi: { name: 'ジャーラー（クライマックス）', icon: '🔥' },
};
const LEVEL: Record<AutoPerformance['difficulty'], number> = { 初級: 1, 中級: 2, 上級: 3, 師範級: 4 };
const shortGharana = (g: string) => g.replace(/（.*$/, '');
// 易しい順に並べる
const LIST = [...AUTO_PERFORMANCES].sort((a, b) => LEVEL[a.difficulty] - LEVEL[b.difficulty]);

/** きく：タイルを押すと演奏。説明は ⓘ の中だけ */
export const ListenScreen: React.FC = () => {
  const [cur, setCur] = useState<AutoPerformance | null>(null);
  const [bol, setBol] = useState('');
  const [pos, setPos] = useState(0);
  const [sam, setSam] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [info, setInfo] = useState<AutoPerformance | null>(null);
  const timer = useRef<number | null>(null), vis = useRef<number[]>([]);
  const speedRef = useRef(speed); speedRef.current = speed;

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    vis.current.forEach((x) => window.clearTimeout(x)); vis.current = [];
    timer.current = null; setCur(null); setBol(''); setPos(0);
  };
  useEffect(() => () => stop(), []);

  const play = async (p: AutoPerformance) => {
    stop(); setCur(p);
    await tablaAudio.ready();
    const ctx = tablaAudio.getContext()!;
    let next = ctx.currentTime + 0.2, i = 0;
    const total = p.steps.length;
    const pump = () => {
      while (next < ctx.currentTime + 0.25) {
        const st = p.steps[i % total], when = next, k = i % total;
        tablaAudio.scheduleBol(st.bol, when, st.isSam ? 1 : 0.85);
        vis.current.push(window.setTimeout(() => {
          setBol(st.label); setPos((k + 1) / total);
          if (st.isSam) { setSam(true); window.setTimeout(() => setSam(false), 250); }
        }, Math.max(0, (when - ctx.currentTime) * 1000)));
        if (vis.current.length > 300) vis.current.splice(0, 150);
        next += st.durationMs / 1000 / speedRef.current; i++;
      }
    };
    pump(); timer.current = window.setInterval(pump, 25);
  };

  return (
    <div className="h-full flex flex-col p-3 gap-3 max-w-3xl mx-auto w-full relative">
      {/* 再生中 */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 min-h-28 ${cur ? 'bg-amber-950/30 border-amber-700/60' : 'bg-stone-900 border-stone-800'}`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-extrabold transition-colors ${sam ? 'bg-red-500 text-white' : 'bg-stone-800 text-amber-300'}`}>{cur ? bol : '🎧'}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-stone-100 truncate">{cur ? TYPE[cur.compositionType].name : 'えらんで きく'}</div>
          {cur && <div className="text-xs text-stone-400">{shortGharana(cur.gharana)}</div>}
          <div className="h-2 bg-stone-800 rounded-full mt-2 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${pos * 100}%` }} /></div>
          <div className="flex gap-1.5 mt-2">
            {[0.5, 0.75, 1].map((s) => <button key={s} onClick={() => setSpeed(s)} className={`px-3 py-1 rounded-full text-xs font-bold ${speed === s ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400'}`}>{s === 1 ? 'ふつう' : s === 0.75 ? 'ゆっくり' : 'とてもゆっくり'}</button>)}
          </div>
        </div>
        {cur && <button onClick={stop} className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center" aria-label="止める"><Square className="w-5 h-5 text-white" /></button>}
      </div>

      {/* 曲のタイル */}
      <div className="flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
        {LIST.map((p) => {
          const t = TYPE[p.compositionType], on = cur?.id === p.id;
          return (
            <div key={p.id} className={`relative rounded-2xl border ${on ? 'border-amber-500 bg-amber-900/30' : 'border-stone-800 bg-stone-900'}`}>
              <button onClick={() => (on ? stop() : play(p))} className="w-full text-left p-3 pr-9">
                <div className="text-2xl">{t.icon}</div>
                <div className="font-bold text-sm text-stone-100 leading-tight mt-1">{t.name.replace(/（.*/, '')}</div>
                <div className="text-[11px] text-stone-500">{shortGharana(p.gharana)}</div>
                <div className="flex gap-0.5 mt-1.5">{Array.from({ length: 4 }, (_, i) => <span key={i} className={`w-2 h-2 rounded-full ${i < LEVEL[p.difficulty] ? 'bg-amber-500' : 'bg-stone-700'}`} />)}</div>
                <div className="absolute right-2 bottom-2">{on ? <Square className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-stone-400" />}</div>
              </button>
              <button onClick={() => setInfo(p)} className="absolute right-1.5 top-1.5 p-1.5 text-stone-500" aria-label="説明"><Info className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>

      {info && (
        <div className="absolute inset-0 z-20 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setInfo(null)}>
          <div className="w-full sm:max-w-md bg-stone-900 border border-stone-700 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><b className="text-stone-100">{TYPE[info.compositionType].icon} {TYPE[info.compositionType].name}</b><button onClick={() => setInfo(null)} aria-label="閉じる"><X className="w-5 h-5" /></button></div>
            <p className="text-sm text-stone-300 leading-relaxed">{info.learningPoint}</p>
            <p className="text-[11px] text-stone-500">流派：{shortGharana(info.gharana)}・{info.taalName}</p>
          </div>
        </div>
      )}
    </div>
  );
};
