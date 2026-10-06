import React, { useEffect, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Drums, BOL_LABEL, BOL_ROMAN, BolText } from './Drums';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { BolKey } from '../../types/tabla';

const KEYS = [{ l: 'C', hz: 261.63 }, { l: 'C#', hz: 277.18 }, { l: 'D', hz: 293.66 }, { l: 'D#', hz: 311.13 }, { l: 'E', hz: 329.63 }];

/** 叩く：太鼓だけの画面。設定は⚙の中 */
export const PlayScreen: React.FC = () => {
  const [last, setLast] = useState<BolKey | null>(null);
  const [sheet, setSheet] = useState(false);
  const [key, setKey] = useState(2);
  const [metro, setMetro] = useState(false);
  const [bpm, setBpm] = useState(80);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const tm = useRef<number | null>(null);

  useEffect(() => { if (tablaAudio.getContext()) tablaAudio.setRootNote(KEYS[key].hz); }, [key]);
  // メトロノーム（4拍目ごとに少し高い音）
  useEffect(() => {
    if (!metro) return;
    tablaAudio.ensureContext();
    const ctx = tablaAudio.getContext()!, out = tablaAudio.getInput()!;
    let next = ctx.currentTime + 0.1, n = 0;
    const pump = () => {
      while (next < ctx.currentTime + 0.2) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = n % 4 === 0 ? 1600 : 1100;
        g.gain.setValueAtTime(0, next); g.gain.linearRampToValueAtTime(0.2, next + 0.003); g.gain.exponentialRampToValueAtTime(0.001, next + 0.07);
        o.connect(g); g.connect(out); o.start(next); o.stop(next + 0.1);
        next += 60 / bpmRef.current; n++;
      }
    };
    pump(); tm.current = window.setInterval(pump, 25);
    return () => { if (tm.current) window.clearInterval(tm.current); };
  }, [metro]);

  const onHit = (b: BolKey) => { setLast(b); if (tablaAudio.getContext()) tablaAudio.setRootNote(KEYS[key].hz); };
  const combos: BolKey[] = ['dha', 'dhin', 'ti_re_ki_ta', 'meend'];

  return (
    <div className="h-full flex flex-col p-3 gap-2 max-w-4xl mx-auto w-full relative">
      <div className="flex items-center justify-between">
        <div className="h-12 min-w-24 flex items-baseline gap-2">{last && <><span className="text-4xl font-extrabold text-amber-400">{BOL_ROMAN[last]}</span><span className="text-lg font-bold text-amber-200/70">{BOL_LABEL[last]}</span></>}</div>
        <button onClick={() => setSheet(true)} className="w-11 h-11 rounded-full bg-stone-800 flex items-center justify-center" aria-label="設定"><Settings className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 min-h-0"><Drums onHit={onHit} /></div>
      <div className="grid grid-cols-4 gap-2 pb-1">
        {combos.map((b) => (
          <button key={b} onPointerDown={(e) => { e.preventDefault(); tablaAudio.playBol(b); onHit(b); }}
            className="py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 active:bg-amber-700"><BolText b={b} big /></button>
        ))}
      </div>

      {sheet && (
        <div className="absolute inset-0 z-20 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setSheet(false)}>
          <div className="w-full sm:max-w-sm bg-stone-900 border border-stone-700 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><b className="text-stone-100">設定</b><button onClick={() => setSheet(false)} aria-label="閉じる"><X className="w-5 h-5" /></button></div>
            <div>
              <div className="text-xs text-stone-400 mb-1.5">調（右の太鼓の音程）</div>
              <div className="flex gap-1.5">{KEYS.map((k, i) => <button key={k.l} onClick={() => setKey(i)} className={`flex-1 py-2.5 rounded-lg font-bold ${i === key ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300'}`}>{k.l}</button>)}</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-stone-400">メトロノーム {bpm}</span>
                <button onClick={() => setMetro((m) => !m)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${metro ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300'}`}>{metro ? 'ON' : 'OFF'}</button>
              </div>
              <input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="w-full accent-amber-500" />
            </div>
            <div className="text-[11px] text-stone-500">キーボード：A Ge／D Ke／J Na／K Tin／L Tun／; Te／Space Dha／G Dhin</div>
          </div>
        </div>
      )}
    </div>
  );
};
