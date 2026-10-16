import React, { useEffect, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Drums, BOL_LABEL, BOL_ROMAN, BolText, strikeDrums } from './Drums';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { BolKey } from '../../types/tabla';

type ButtonSet = 'combo' | 'single' | 'all';
const SET_KEY = 'tablalab.play.buttons';
const SINGLE: BolKey[] = ['na', 'tin', 'tun', 'te', 're', 'ge', 'ke', 'meend'];
const COMBO: BolKey[] = ['dha', 'dhin', 'ti_re_ki_ta', 'meend'];
const BUTTON_SETS: Record<ButtonSet, { label: string; bols: BolKey[] }> = {
  combo: { label: '両手', bols: COMBO },
  single: { label: 'ひとつずつ', bols: SINGLE },
  all: { label: 'ぜんぶ', bols: ['dha', 'dhin', 'ti_re_ki_ta', 'na', 'tin', 'tun', 'te', 're', 'ge', 'ke', 'meend'] },
};
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
  // 下のボタン：両手の合わせ技／ひとつずつ／ぜんぶ を切りかえ（この端末に覚えておく）
  const [set, setSet] = useState<ButtonSet>(() => { try { return (localStorage.getItem(SET_KEY) as ButtonSet) || 'combo'; } catch { return 'combo'; } });
  const chooseSet = (v: ButtonSet) => { setSet(v); try { localStorage.setItem(SET_KEY, v); } catch { /* noop */ } };
  const buttons = BUTTON_SETS[set].bols;
  const cols = buttons.length > 8 ? 'grid-cols-4 land:grid-cols-2' : buttons.length > 4 ? 'grid-cols-4 land:grid-cols-2' : 'grid-cols-4 land:grid-cols-1';

  return (
    <div className="h-full flex flex-col land:flex-row p-3 land:p-1 gap-2 max-w-4xl land:max-w-none mx-auto w-full relative">
      <div className="flex items-center justify-between land:absolute land:left-2 land:right-48 land:top-1 land:z-10 land:pointer-events-none">
        <div className="h-12 min-w-24 flex items-baseline gap-2">{last && <><span className="text-4xl font-extrabold text-amber-400">{BOL_ROMAN[last]}</span><span className="text-lg font-bold text-amber-200/70">{BOL_LABEL[last]}</span></>}</div>
        <button onClick={() => setSheet(true)} className="w-11 h-11 rounded-full bg-stone-800 flex items-center justify-center land:pointer-events-auto" aria-label="設定"><Settings className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 min-h-0"><Drums onHit={onHit} /></div>
      <div className={`flex flex-col gap-1.5 pb-1 land:pb-0 land:shrink-0 land:justify-center ${buttons.length > 4 ? 'land:w-44' : 'land:w-28'}`}>
        <div className="flex justify-center gap-1">
          {(Object.keys(BUTTON_SETS) as ButtonSet[]).map((k) => (
            <button key={k} onClick={() => chooseSet(k)} className={`px-3 land:px-2 py-1 rounded-full text-xs land:text-[11px] font-bold whitespace-nowrap ${set === k ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400'}`}>{BUTTON_SETS[k].label}</button>
          ))}
        </div>
        <div className={`grid ${cols} gap-1.5`}>
          {buttons.map((b) => (
            <button key={b} onPointerDown={(e) => { e.preventDefault(); strikeDrums(b); }}
              className={`${buttons.length > 4 ? 'py-1.5' : 'py-2.5'} rounded-xl border text-stone-100 active:bg-amber-700 ${COMBO.includes(b) && b !== 'meend' ? 'bg-stone-800 border-amber-800/70' : 'bg-stone-800 border-stone-700'}`}><BolText b={b} big={buttons.length <= 4} /></button>
          ))}
        </div>
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
