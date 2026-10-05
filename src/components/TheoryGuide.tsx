import React, { useState } from 'react';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { BolKey } from '../types/tabla';
import { BookOpen, Sparkles, Play, ArrowRight, CheckCircle2, Music } from 'lucide-react';

interface Props {
  onPlayBol: (bol: BolKey) => void;
  onNavigateToAutoPlay?: () => void;
}

export const TheoryGuide: React.FC<Props> = ({ onPlayBol, onNavigateToAutoPlay }) => {
  const [activeTheory, setActiveTheory] = useState<number>(1);
  const [comboStep, setComboStep] = useState<'right' | 'left' | 'both'>('both');

  const handlePlayComboTest = (step: 'right' | 'left' | 'both') => {
    setComboStep(step);
    if (step === 'right') {
      tablaAudio.playNa();
    } else if (step === 'left') {
      tablaAudio.playGe();
    } else {
      tablaAudio.playDha();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-100">
              タブラー演奏のセオリー（演奏理論と文法）
            </h2>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed max-w-3xl">
            タブラーは単なる直感的な打楽器ではなく、数千年に及ぶ高度な「言葉の体系」「音響の合体則」「陰陽の拍子理論」に基づいています。
            学校の音楽の授業でも直感的に理解できるよう、4大セオリーを体験型シミュレーションで解説します。
          </p>
        </div>

        {/* 4 Theory Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-5">
          {[
            {
              id: 1,
              title: 'セオリー 1: ボル（Bol）',
              sub: '言葉と歌の体系（パダント）',
            },
            {
              id: 2,
              title: 'セオリー 2: 両手合体の法則',
              sub: 'なぜ Na + Ge = Dha なのか？',
            },
            {
              id: 3,
              title: 'セオリー 3: 陰と陽の呼吸',
              sub: 'ターリー（拍手）とカーリー（空拍）',
            },
            {
              id: 4,
              title: 'セオリー 4: ティハイ（Tihai）',
              sub: '数学的美学（3回反復の着地）',
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTheory(t.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                activeTheory === t.id
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
              }`}
            >
              <span className="text-xs font-bold">{t.title}</span>
              <span
                className={`text-[11px] ${
                  activeTheory === t.id ? 'text-amber-100' : 'text-stone-400'
                }`}
              >
                {t.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Theory Detail Content */}
      <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
        {/* THEORY 1: The Bol & Padhant System */}
        {activeTheory === 1 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase">Theory 1</span>
              <h3 className="text-xl font-bold text-stone-100 mt-0.5">
                ボル（Bol）という言葉の体系 —「歌えないフレーズは叩けない」
              </h3>
            </div>

            <div className="text-sm text-stone-300 leading-relaxed space-y-3">
              <p>
                西洋音楽のドラマーは「五線譜」を見て叩きますが、伝統的なインド音楽では楽譜を使いません。
                その代わりに、太鼓から出るすべての音色に固有の音声言語（音象徴）が割り当てられており、これを
                <strong className="text-amber-400">「ボル（Bol / 言葉）」</strong>と呼びます。
              </p>
              <p>
                演奏者は師匠から弟子へと、まず口で「ダー・ディン・ディン・ダー」とリズムを歌う
                <strong className="text-amber-400">「パダント（Padhant / 朗唱）」</strong>
                を徹底的に叩き込まれます。
                太鼓の音色と言葉の発音が1対1で直結しているため、聴衆も「今のフレーズはティレキタだ！」と言葉として聴き取ることができます。
              </p>
            </div>

            {/* Interactive Audio Audition Grid */}
            <div className="p-5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-3">
              <span className="text-xs font-semibold text-stone-300">
                代表的なボル（言葉）を口ずさみながら聴いてみよう:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { bol: 'dha', label: 'Dha (ダ)', desc: '堂々とした主役の音' },
                  { bol: 'dhin', label: 'Dhin (ディン)', desc: '優雅に歌う音' },
                  { bol: 'na', label: 'Na (ナ)', desc: '澄んだ高いベル音' },
                  { bol: 'tin', label: 'Tin (ティン)', desc: '柔らかい中間音' },
                  { bol: 'tun', label: 'Tun (トゥン)', desc: '鐘のような開放音' },
                  { bol: 'ge', label: 'Ge (ゲ)', desc: '深鍋の重低音' },
                  { bol: 'meend', label: 'Meend (ミィーンド)', desc: '歌うピッチベンド' },
                  { bol: 'ke', label: 'Ke (ケ)', desc: 'フラットな消音' },
                ].map((item) => (
                  <button
                    key={item.bol}
                    onClick={() => {
                      tablaAudio.playBol(item.bol as BolKey);
                      onPlayBol(item.bol as BolKey);
                    }}
                    className="p-2.5 rounded-lg bg-stone-900 hover:bg-amber-950/60 border border-stone-800 hover:border-amber-700/60 text-left transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">{item.label}</span>
                      <Play className="w-3 h-3 text-stone-500 fill-stone-500" />
                    </div>
                    <span className="text-[10px] text-stone-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* THEORY 2: The Law of Dual-Hand Combination */}
        {activeTheory === 2 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase">Theory 2</span>
              <h3 className="text-xl font-bold text-stone-100 mt-0.5">
                両手合体の法則 — なぜ Na + Ge = Dha（濁音化）になるのか？
              </h3>
            </div>

            <div className="text-sm text-stone-300 leading-relaxed space-y-3">
              <p>
                タブラーの最も画期的な仕組みは、
                <strong className="text-amber-400">「右手（高音）＋ 左手（低音）＝ 新しい名前の複合音」</strong>
                が生まれる点です。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400">右手の高音 (Na / Ta)</span>
                    <span className="mx-2 text-stone-500">+</span>
                    <span className="text-xs text-sky-400">左手の低音 (Ge)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-base">Dha (ダ)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400">右手の中音 (Tin)</span>
                    <span className="mx-2 text-stone-500">+</span>
                    <span className="text-xs text-sky-400">左手の低音 (Ge)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-base">Dhin (ディン)</span>
                  </div>
                </div>
              </div>
              <p>
                <strong>言語学的な驚き：</strong>
                日本語でも「カ」に濁点を付けると「ガ」になるように、サンスクリット語でも無声音（Ta）に低音（有声の喉の響き Ge）が加わることで、
                有声音（Dha）へと濁音化します。太鼓の音響物理と言語の音声学が完全に一致しているのです！
              </p>
            </div>

            {/* Interactive Step-by-Step Combination Experiment */}
            <div className="p-5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-4">
              <span className="text-xs font-semibold text-stone-300">
                ステップ式「Dha」の分解実験（実際に音を重ねてみよう）:
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handlePlayComboTest('right')}
                  className={`px-4 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                    comboStep === 'right'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>1. 右手のみ Na（澄んだ高音）</span>
                </button>

                <span className="text-stone-500 font-bold">+</span>

                <button
                  onClick={() => handlePlayComboTest('left')}
                  className={`px-4 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                    comboStep === 'left'
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>2. 左手のみ Ge（重低音）</span>
                </button>

                <span className="text-stone-500 font-bold">=</span>

                <button
                  onClick={() => handlePlayComboTest('both')}
                  className={`px-5 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                    comboStep === 'both'
                      ? 'bg-amber-500 text-stone-950 border-amber-300 ring-2 ring-amber-500/40'
                      : 'bg-stone-900 text-amber-300 border-amber-700/60 hover:bg-stone-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3. 両手合体！ Dha (Na + Ge)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* THEORY 3: The Yin and Yang of Tali and Khali */}
        {activeTheory === 3 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase">Theory 3</span>
              <h3 className="text-xl font-bold text-stone-100 mt-0.5">
                陰と陽の呼吸 — ターリー（拍手）とカーリー（空拍・手振り）
              </h3>
            </div>

            <div className="text-sm text-stone-300 leading-relaxed space-y-3">
              <p>
                インドのリズム周期（ターラ）は、ただメトロノームのように均一に進むのではなく、
                <strong className="text-amber-400">「陽（充実・有音）」</strong>と
                <strong className="text-sky-400">「陰（空虚・静寂）」</strong>
                が波のように交互に押し寄せる構造を持っています。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👏</span>
                    <span className="text-sm font-bold text-amber-300">
                      ターリー（Tali / 拍手）：陽の世界
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    手を叩いてリズムを刻むセクション。左手の低音（Ge）が豊かに響き、
                    「Dha」や「Dhin」といった重厚で力強いボルが鳴り響きます。
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👋</span>
                    <span className="text-sm font-bold text-sky-300">
                      カーリー（Khali / 手振り）：陰の世界
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    手を叩かず、手のひらを外に向けて「スーッ」と振るセクション。
                    なんと<strong className="text-white">左手の低音が完全にカット</strong>され、
                    右手のみの「Tin」「Ta」という乾いた静寂が訪れます。
                  </p>
                </div>
              </div>
              <p>
                カーリーで低音を失うことによって聴衆に「緊張感」を与え、
                次の拍で低音が爆発して第1拍「サム（Sam）」に着地したときの感動を何十倍にも増幅させる仕掛けです。
              </p>
            </div>
          </div>
        )}

        {/* THEORY 4: Tihai - The Mathematical Climax */}
        {activeTheory === 4 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase">Theory 4</span>
              <h3 className="text-xl font-bold text-stone-100 mt-0.5">
                ティハイ（Tihai）の数学的美学 —「3回反復で奇跡の着地」
              </h3>
            </div>

            <div className="text-sm text-stone-300 leading-relaxed space-y-3">
              <p>
                インド古典音楽のコンサートで、演奏が終わった瞬間に聴衆が「ワーッ！」と立ち上がって拍手喝采する場面があります。
                その99%は<strong className="text-amber-400">「ティハイ（Tihai）」</strong>が決まった瞬間です。
              </p>
              <p>
                ティハイとは、まったく同じリズムフレーズを寸分違わず「3回」繰り返し、
                3回目の最後の1音が、16拍や10拍の周期の
                <strong className="text-amber-400">「第1拍サム（Sam）」</strong>
                に1ミリのズレもなく完璧に着地する数学的カデンツァです。
              </p>

              {/* Mathematical Formula Diagram */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
                <span className="text-xs font-semibold text-amber-400 font-mono">
                  ティハイの基本計算式:
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-200">
                  <span className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                    [フレーズA]
                  </span>
                  <span>+</span>
                  <span className="text-stone-500">[休符]</span>
                  <span>+</span>
                  <span className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                    [フレーズA]
                  </span>
                  <span>+</span>
                  <span className="text-stone-500">[休符]</span>
                  <span>+</span>
                  <span className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                    [フレーズA]
                  </span>
                  <span className="text-amber-400 font-bold">➔ ⭐ SAM (Dha!)</span>
                </div>
              </div>

              {onNavigateToAutoPlay && (
                <div className="pt-2">
                  <button
                    onClick={onNavigateToAutoPlay}
                    className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>自動演奏モードで「ティハイの着地」を実際に聴いてみる</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
