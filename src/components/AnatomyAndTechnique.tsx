import React, { useState } from 'react';
import { ANATOMY_PARTS, BOLS_LIST } from '../data/tablaData';
import { BolInfo, BolKey } from '../types/tabla';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { Layers, Play, Volume2, Info } from 'lucide-react';

interface Props {
  onPlayBol?: (bol: BolKey) => void;
}

export const AnatomyAndTechnique: React.FC<Props> = ({ onPlayBol }) => {
  const [selectedBol, setSelectedBol] = useState<BolInfo>(BOLS_LIST[0]);

  const handleAudition = (bolId: BolKey) => {
    tablaAudio.playBol(bolId);
    const b = BOLS_LIST.find((item) => item.id === bolId);
    if (b) setSelectedBol(b);
    if (onPlayBol) onPlayBol(bolId);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Introduction */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-stone-100">
            タブラー・バーヤーンの構造と奏法図鑑（Anatomy & Techniques）
          </h2>
        </div>
        <p className="text-sm text-stone-400 mt-1.5 leading-relaxed">
          なぜ数千年にわたり、この2つの太鼓は現在の形に進化してきたのか？
          3層に重なる山羊皮「プリー（Puri）」の断面構造、鉄粉を塗り重ねた「シャヒ」、そして口承で受け継がれるリズム言語「ボル（Bol）」の全貌を解説します。
        </p>
      </div>

      {/* Cross Section Membrane Diagram */}
      <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
        <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500" />
          <span>打面「プリー（Puri）」の多層断面構造（3つの音色エリア）</span>
        </h3>

        {/* Multi-layer SVG cross section */}
        <div className="w-full bg-stone-950 p-6 rounded-xl border border-stone-800 flex flex-col items-center">
          <svg viewBox="0 0 800 240" className="w-full max-w-3xl h-auto">
            {/* Wooden Shell Top Rim */}
            <rect x="40" y="160" width="80" height="60" fill="#3f1407" rx="4" stroke="#5c200e" strokeWidth="2" />
            <rect x="680" y="160" width="80" height="60" fill="#3f1407" rx="4" stroke="#5c200e" strokeWidth="2" />
            <text x="80" y="200" fill="#a8a29e" fontSize="12" textAnchor="middle">木胴（胴体）</text>
            <text x="720" y="200" fill="#a8a29e" fontSize="12" textAnchor="middle">木胴（胴体）</text>

            {/* Base Leather Membrane (山羊皮のベース) */}
            <path
              d="M 50 155 Q 400 162 750 155"
              stroke="#e5d5b5"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />

            {/* Kinar Ring Layer (外周補強皮リング) */}
            <path d="M 50 148 L 180 150" stroke="#c4a572" strokeWidth="8" strokeLinecap="round" />
            <path d="M 620 150 L 750 148" stroke="#c4a572" strokeWidth="8" strokeLinecap="round" />

            {/* Syahi (Concentric iron paste loading center) */}
            <path
              d="M 280 154 C 320 130, 480 130, 520 154 Z"
              fill="#171717"
              stroke="#262626"
              strokeWidth="2"
            />

            {/* Annotations & Indicators */}
            {/* Kinar */}
            <line x1="115" y1="140" x2="115" y2="70" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="115" cy="70" r="4" fill="#f59e0b" />
            <text x="115" y="45" fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle">
              キナール (Kinar)
            </text>
            <text x="115" y="60" fill="#d4d4d4" fontSize="11" textAnchor="middle">
              高音倍音 · Na/Ta
            </text>

            {/* Maidan */}
            <line x1="230" y1="152" x2="230" y2="90" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="230" cy="90" r="4" fill="#38bdf8" />
            <text x="230" y="65" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">
              マイダン (Maidan)
            </text>
            <text x="230" y="80" fill="#d4d4d4" fontSize="11" textAnchor="middle">
              単層山羊皮 · Tin
            </text>

            {/* Syahi */}
            <line x1="400" y1="135" x2="400" y2="40" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="400" cy="40" r="4" fill="#a855f7" />
            <text x="400" y="18" fill="#a855f7" fontSize="14" fontWeight="bold" textAnchor="middle">
              シャヒ (Syahi / 鉄粉塗膜)
            </text>
            <text x="400" y="32" fill="#d4d4d4" fontSize="11" textAnchor="middle">
              調和倍音の発生源 · Tun / Te
            </text>

            {/* Bottom Gajra Braid */}
            <path
              d="M 40 165 C 40 175, 55 175, 55 165 C 55 175, 70 175, 70 165"
              stroke="#b45309"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M 730 165 C 730 175, 745 175, 745 165 C 745 175, 760 175, 760 165"
              stroke="#b45309"
              strokeWidth="4"
              fill="none"
            />
          </svg>

          <p className="text-xs text-stone-400 text-center max-w-2xl mt-2 leading-relaxed">
            打面（プリー）は1枚の皮ではなく、外枠を支える補強リング皮（キナール）と、土台となる山羊皮（マイダン）、
            そしてその中央に職人が数週間かけて鉄粉と米粉を何十層も塗り重ねた「シャヒ」の複合構造によって、唯一無二の音色を生み出しています。
          </p>
        </div>

        {/* Structural Parts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ANATOMY_PARTS.map((part) => (
            <div key={part.name} className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400">{part.name}</span>
                <span className="text-[10px] text-stone-500 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                  {part.drum}
                </span>
              </div>
              <span className="text-xs text-stone-400 font-mono">意味: {part.meaning}</span>
              <p className="text-xs text-stone-300 leading-relaxed mt-1">{part.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bol (Phonetic Rhythm Language) Dictionary */}
      <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-100">
              インド打楽器の音象徴言語「ボル（Bol）」全集
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              タブラー奏者は楽譜を使わず、すべての太鼓の音を「言葉（ボル）」として口で歌いながら演奏・伝承します。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BOLS_LIST.map((b) => (
            <div
              key={b.id}
              onClick={() => handleAudition(b.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                selectedBol.id === b.id
                  ? 'bg-amber-950/40 border-amber-600 ring-2 ring-amber-500/20'
                  : 'bg-stone-950 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-amber-400">{b.name}</span>
                  <span className="text-xs font-mono text-stone-400">{b.devanagari}</span>
                  {b.isCombo && (
                    <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/50 px-1.5 py-0.5 rounded border border-amber-700/50">
                      複合技
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAudition(b.id);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-300 rounded border border-stone-700 transition-colors flex items-center gap-1"
                >
                  <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>試聴</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                <span className="font-semibold text-stone-300">打点: {b.zone}</span>
                <span>·</span>
                <span className="text-amber-300">指: {b.finger}</span>
                <span>·</span>
                <span className="font-mono bg-stone-900 px-1.5 py-0.5 rounded text-stone-400 border border-stone-800">
                  キー: [{b.shortcut}]
                </span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed mt-1">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
