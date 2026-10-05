import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-6 text-stone-200">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-stone-100">キーボード操作対応表（学校PC・タブレット対応）</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-400">
          キーボードのホームポジション（左手: A·S·D / 右手: J·K·L·;）に指を置くことで、実際のタブラー演奏と同じように両手で直感的に演奏できます。
        </p>

        {/* Visual Keyboard Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Hand: Bayan */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">左手（バーヤーン / 低音太鼓）</span>
              <span className="text-[10px] text-stone-500">A · S · D</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-amber-400 border border-stone-700 rounded">
                    A
                  </kbd>
                  <span className="font-semibold text-stone-200">Ge (ゲ)</span>
                </div>
                <span className="text-stone-400 text-[11px]">開放的な深みのある低音</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-sky-400 border border-stone-700 rounded">
                    S
                  </kbd>
                  <span className="font-semibold text-stone-200">Meend (ミィーンド)</span>
                </div>
                <span className="text-stone-400 text-[11px]">手首スライドによる音程ベンド</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700 rounded">
                    D
                  </kbd>
                  <span className="font-semibold text-stone-200">Ke (ケ)</span>
                </div>
                <span className="text-stone-400 text-[11px]">平手打ちのフラット消音</span>
              </div>
            </div>
          </div>

          {/* Right Hand: Dayan */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">右手（ダヤーン / 高音太鼓）</span>
              <span className="text-[10px] text-stone-500">J · K · L · ;</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-amber-400 border border-stone-700 rounded">
                    J
                  </kbd>
                  <span className="font-semibold text-stone-200">Na / Ta (ナ)</span>
                </div>
                <span className="text-stone-400 text-[11px]">外縁キナール・澄んだ倍音ベル</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700 rounded">
                    K
                  </kbd>
                  <span className="font-semibold text-stone-200">Tin (ティン)</span>
                </div>
                <span className="text-stone-400 text-[11px]">中間マイダン・柔らかな歌う音</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-purple-400 border border-stone-700 rounded">
                    L
                  </kbd>
                  <span className="font-semibold text-stone-200">Tun (トゥン)</span>
                </div>
                <span className="text-stone-400 text-[11px]">中央シャヒ開放・豊かな鐘の基本音</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700 rounded">
                    ;
                  </kbd>
                  <span className="font-semibold text-stone-200">Te (テ)</span>
                </div>
                <span className="text-stone-400 text-[11px]">中央指ペタ密着消音</span>
              </div>
            </div>
          </div>
        </div>

        {/* Both hands / combos */}
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-amber-300">両手打法・特殊技:</span>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 font-mono font-bold bg-stone-900 text-amber-300 border border-amber-700/60 rounded">
              Space
            </kbd>
            <span className="text-stone-300">Dha (Na+Ge)</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 font-mono font-bold bg-stone-900 text-amber-300 border border-amber-700/60 rounded">
              G
            </kbd>
            <span className="text-stone-300">Dhin (Tin+Ge)</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 font-mono font-bold bg-stone-900 text-amber-300 border border-amber-700/60 rounded">
              T
            </kbd>
            <span className="text-stone-300">Tirekita (高速4連打)</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
