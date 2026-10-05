import React, { useState, useEffect, useRef } from 'react';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { BOLS_LIST, TAAL_LIST, ANATOMY_PARTS } from '../data/tablaData';
import { BolKey } from '../types/tabla';
import { InteractiveDrumLesson } from './InteractiveDrumLesson';
import {
  GraduationCap,
  Activity,
  Disc3,
  Layers,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Award,
  Zap
} from 'lucide-react';

interface Props {
  initialSubTab?: 'lessons' | 'mechanism' | 'taal' | 'anatomy';
  onPlayBol?: (bol: BolKey) => void;
  onNavigateToSimulator?: () => void;
}

export const LearningHub: React.FC<Props> = ({
  initialSubTab = 'lessons',
  onPlayBol,
  onNavigateToSimulator,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'lessons' | 'mechanism' | 'taal' | 'anatomy'>(
    initialSubTab
  );

  // ==========================================
  // MECHANISM SUBTAB STATE
  // ==========================================
  const [selectedMechanismBol, setSelectedMechanismBol] = useState<BolKey>('na');
  const [syahiMass, setSyahiMass] = useState<number>(1.0);
  const [dampingVal, setDampingVal] = useState<number>(0.85);
  const [visualMode, setVisualMode] = useState<'spectrum' | 'oscilloscope'>('spectrum');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    tablaAudio.setSyahiMass(syahiMass);
  }, [syahiMass]);

  useEffect(() => {
    tablaAudio.setDamping(dampingVal);
  }, [dampingVal]);

  // Visualizer loop for mechanism
  useEffect(() => {
    if (activeSubTab !== 'mechanism') return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (visualMode === 'oscilloscope') {
        const waveData = tablaAudio.getWaveformData();
        if (waveData) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          const sliceWidth = w / waveData.length;
          let x = 0;
          for (let i = 0; i < waveData.length; i++) {
            const v = waveData[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
        }
      } else {
        const freqData = tablaAudio.getFrequencyData();
        if (freqData) {
          const barCount = 48;
          const barWidth = w / barCount - 2;
          for (let i = 0; i < barCount; i++) {
            const val = freqData[i * 2] || 0;
            const barH = (val / 255) * (h - 10);
            const x = i * (barWidth + 2);
            const y = h - barH;

            const grad = ctx.createLinearGradient(0, y, 0, h);
            if (i < 4) {
              grad.addColorStop(0, '#f59e0b');
              grad.addColorStop(1, '#78350f');
            } else if (i < 12) {
              grad.addColorStop(0, '#38bdf8');
              grad.addColorStop(1, '#0369a1');
            } else {
              grad.addColorStop(0, '#a855f7');
              grad.addColorStop(1, '#581c87');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barH);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [visualMode, activeSubTab]);

  const handleAuditionBol = (bol: BolKey) => {
    setSelectedMechanismBol(bol);
    tablaAudio.playBol(bol);
    if (onPlayBol) onPlayBol(bol);
  };

  // ==========================================
  // TAAL SUBTAB STATE
  // ==========================================
  const [selectedTaalId, setSelectedTaalId] = useState<string>('teental');
  const selectedTaal = TAAL_LIST.find((t) => t.id === selectedTaalId) || TAAL_LIST[0];
  const [isTaalPlaying, setIsTaalPlaying] = useState<boolean>(false);
  const [currentTaalMatra, setCurrentTaalMatra] = useState<number>(1);
  const [taalBpm, setTaalBpm] = useState<number>(76);
  const taalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop loop when switching taals
  useEffect(() => {
    setIsTaalPlaying(false);
    setCurrentTaalMatra(1);
    if (taalTimerRef.current) clearInterval(taalTimerRef.current);
  }, [selectedTaalId]);

  // Live Taal loop player effect
  useEffect(() => {
    if (!isTaalPlaying) {
      if (taalTimerRef.current) clearInterval(taalTimerRef.current);
      return;
    }

    const intervalMs = (60 / taalBpm) * 1000;
    taalTimerRef.current = setInterval(() => {
      setCurrentTaalMatra((prev) => {
        const next = prev >= selectedTaal.beats ? 1 : prev + 1;
        const targetBol = selectedTaal.bols.find((b) => b.matra === next);
        if (targetBol) {
          tablaAudio.playBol(targetBol.bol);
          if (onPlayBol) onPlayBol(targetBol.bol);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (taalTimerRef.current) clearInterval(taalTimerRef.current);
    };
  }, [isTaalPlaying, taalBpm, selectedTaal, onPlayBol]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Top Header & Sub-Navigation */}
      <div className="p-5 md:p-6 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-stone-100">
                演奏ルール ＆ 太鼓直感ステップレッスン
              </h2>
              <p className="text-xs text-stone-400">
                太鼓の丸（打撃ゾーン）の上に叩く順番と番号が直接表示される、直感型インタラクティブ学習
              </p>
            </div>
          </div>

          {onNavigateToSimulator && (
            <button
              onClick={onNavigateToSimulator}
              className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>🪘 自由演奏へ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 4 Clean Sub-Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-stone-800">
          {[
            {
              id: 'lessons',
              title: '① 太鼓直感レッスン',
              subtitle: '太鼓の丸に順番表示（全6課）',
              icon: GraduationCap,
              badge: '最重要',
            },
            {
              id: 'mechanism',
              title: '② 音が違う仕組み',
              subtitle: 'シャヒの物理・倍音・打点解剖',
              icon: Activity,
              badge: '音響物理',
            },
            {
              id: 'taal',
              title: '③ ターラ（リズム周期）',
              subtitle: 'ティーンタール・拍手と空拍',
              icon: Disc3,
              badge: '拍子体系',
            },
            {
              id: 'anatomy',
              title: '④ 構造・多層皮の解剖',
              subtitle: 'プリー断面・木胴・真鍮鍋',
              icon: Layers,
              badge: '楽器解剖',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.title}</span>
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-amber-700 text-amber-100' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </div>
                <span
                  className={`text-[11px] leading-tight ${
                    isActive ? 'text-amber-100' : 'text-stone-400'
                  }`}
                >
                  {tab.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: 太鼓直感レッスン (Drums with Pinpoint Circle Overlays) */}
      {/* ========================================================================= */}
      {activeSubTab === 'lessons' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <InteractiveDrumLesson
            onBolPlayed={onPlayBol}
            onSwitchToFreePlay={onNavigateToSimulator}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: 音が違う仕組み (Acoustic Mechanism & Syahi Physics) */}
      {/* ========================================================================= */}
      {activeSubTab === 'mechanism' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-5">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Acoustics & Physics</span>
              <h3 className="text-xl font-bold text-stone-100 mt-1">
                なぜ同じ太鼓から、まったく違う音色が何種類も出るのか？
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm text-stone-300 leading-relaxed">
              <div className="space-y-3 bg-stone-950/70 p-5 rounded-xl border border-stone-800">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  理由1：黒い円「シャヒ（Syahi）」の奇跡（C.V.ラマン卿の大発見）
                </h4>
                <p>
                  通常の丸い膜（太鼓）を叩くと、物理法則（ベッセル関数）に従って
                  <strong>1 : 1.59 : 2.14 : 2.30</strong> という非整数の不協和な倍音が出ます。そのため普通の太鼓は「ポコポコ」と濁った音になり、音階（ドレミ）が聞こえません。
                </p>
                <p>
                  しかしタブラの中央には、鉄粉・煤・米糊を同心円状に塗り重ねた重り<strong>「シャヒ」</strong>があります。
                  1920年にノーベル物理学賞受賞者C.V.ラマンが解明した通り、この緻密な荷重によって膜の倍音比が
                  <strong className="text-amber-300">「1 : 2 : 3 : 4 : 5」の完全な整数次倍音</strong>
                  へと補正されます。世界で唯一、打楽器でありながら弦楽器や管楽器と同じ澄んだピッチ感を持つ秘密がここにあります。
                </p>
              </div>

              <div className="space-y-3 bg-stone-950/70 p-5 rounded-xl border border-stone-800">
                <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  理由2：打撃位置と指のミュートによる「振動モードの選別」
                </h4>
                <p>
                  タブラ奏者は、叩く位置（最外縁キナール／中央白皮マイダーン／中央黒シャヒ）と、
                  <strong>「薬指をどこに置くか」</strong>によって、膜の特定の振動モードを選択的に殺したり励起したりしています。
                </p>
                <p>
                  例えば<strong>Na</strong>は薬指でシャヒ端を軽く押さえて基音を殺し、外縁の第2・第3倍音だけをベルのように共鳴させます。
                  逆に<strong>Tun</strong>はシャヒ中央を弾いて指を離すことで、全倍音を一斉に歌わせます。
                  このように<strong>「1枚の皮の中に全く異なる共振点を作り出している」</strong>のが音の違いの仕組みです。
                </p>
              </div>
            </div>

            {/* Interactive Bol Audition & FFT Spectrum */}
            <div className="mt-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-500" />
                  <span>各ボルの音響解剖 ＆ リアルタイム試聴</span>
                </h4>
                <span className="text-xs text-stone-500">ボタンを押して波形とスペクトラムを体感</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'na' as BolKey, name: 'Na (ナ)', role: '高音ベル', drum: 'Dayan', color: 'border-amber-600 bg-amber-950/40 text-amber-200' },
                  { id: 'tin' as BolKey, name: 'Tin (ティン)', role: '甘い歌声', drum: 'Dayan', color: 'border-amber-700 bg-amber-950/30 text-amber-300' },
                  { id: 'tun' as BolKey, name: 'Tun (トゥン)', role: '全開共鳴', drum: 'Dayan', color: 'border-purple-700 bg-purple-950/40 text-purple-200' },
                  { id: 'te' as BolKey, name: 'Te (テ)', role: '消音アタック', drum: 'Dayan', color: 'border-stone-700 bg-stone-900 text-stone-200' },
                  { id: 'ge' as BolKey, name: 'Ge (ゲ)', role: '重低音', drum: 'Bayan', color: 'border-sky-600 bg-sky-950/40 text-sky-200' },
                  { id: 'meend' as BolKey, name: 'Meend (ミィーンド)', role: 'ピッチベンド', drum: 'Bayan', color: 'border-sky-500 bg-sky-900/50 text-white' },
                  { id: 'ke' as BolKey, name: 'Ke (ケ)', role: '平手消音', drum: 'Bayan', color: 'border-stone-700 bg-stone-900 text-stone-300' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleAuditionBol(b.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      selectedMechanismBol === b.id
                        ? `${b.color} ring-2 ring-amber-400 font-bold shadow-lg scale-[1.02]`
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <span className="text-xs font-bold">{b.name}</span>
                    <span className="text-[10px] text-stone-400">{b.role}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-900 text-stone-400">
                      {b.drum}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bol Detail Card */}
              {(() => {
                const info = BOLS_LIST.find((item) => item.id === selectedMechanismBol) || BOLS_LIST[0];
                return (
                  <div className="p-5 rounded-xl bg-stone-950 border border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-amber-400">{info.name}</span>
                        <span className="text-lg font-serif text-stone-400">{info.devanagari}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          {info.drum === 'dayan' ? '右手・高音太鼓 (ダヤーン)' : '左手・低音太鼓 (バーヤーン)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800">
                          <span className="text-stone-400 block text-[11px]">打撃位置（ゾーン）：</span>
                          <span className="font-semibold text-stone-200">{info.zone}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800">
                          <span className="text-stone-400 block text-[11px]">使用する指・手の形：</span>
                          <span className="font-semibold text-stone-200">{info.finger}</span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-300 leading-relaxed bg-stone-900/50 p-3 rounded-lg border border-stone-800/80">
                        <strong className="text-amber-400">【音響のメカニズム】</strong> {info.description}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span className="font-semibold text-stone-300">周波数スペクトラム：</span>
                        <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded">
                          <button
                            onClick={() => setVisualMode('spectrum')}
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              visualMode === 'spectrum' ? 'bg-amber-600 text-white font-bold' : 'text-stone-400'
                            }`}
                          >
                            FFT
                          </button>
                          <button
                            onClick={() => setVisualMode('oscilloscope')}
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              visualMode === 'oscilloscope' ? 'bg-amber-600 text-white font-bold' : 'text-stone-400'
                            }`}
                          >
                            波形
                          </button>
                        </div>
                      </div>

                      <div className="h-28 w-full rounded-lg overflow-hidden border border-stone-800 relative bg-stone-950">
                        <canvas ref={canvasRef} className="w-full h-full" />
                      </div>

                      <button
                        onClick={() => handleAuditionBol(selectedMechanismBol)}
                        className="py-1.5 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>音を鳴らす</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ターラ体系 (Taal System & Metrical Cycles) */}
      {/* ========================================================================= */}
      {activeSubTab === 'taal' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Metrical Cycles</span>
              <h3 className="text-xl font-bold text-stone-100 mt-1">
                ターラ（Taal）体系：円環状に巡るインドのリズム構造
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                西洋音楽の小節とは異なり、インド音楽のターラは「第1拍（Sam）」から出発して円を描き、再びSamへと着地する円環構造です。
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TAAL_LIST.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaalId(t.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedTaalId === t.id
                      ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-md'
                      : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  <span className="text-xs block font-bold">{t.name}</span>
                  <span className="text-[11px] opacity-80">{t.beats} 拍子</span>
                </button>
              ))}
            </div>

            <div className="p-5 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <h4 className="text-base font-bold text-amber-400">
                    {selectedTaal.name}（{selectedTaal.devanagari}）- {selectedTaal.beats} 拍
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">{selectedTaal.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-stone-400 bg-stone-900 px-2.5 py-1 rounded-md border border-stone-800">
                    拍節: {selectedTaal.division.join(' + ')}
                  </span>
                  <div className="flex items-center gap-1.5 bg-stone-900 px-2 py-1 rounded-lg border border-stone-800">
                    <span className="text-[11px] text-stone-400">速度:</span>
                    <input
                      type="range"
                      min="48"
                      max="140"
                      step="4"
                      value={taalBpm}
                      onChange={(e) => setTaalBpm(parseInt(e.target.value))}
                      className="w-16 h-1 bg-stone-800 rounded accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-amber-400 w-10 text-center font-bold">
                      {taalBpm}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsTaalPlaying(!isTaalPlaying)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      isTaalPlaying
                        ? 'bg-amber-600 text-white animate-pulse'
                        : 'bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-700'
                    }`}
                  >
                    {isTaalPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>停止</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>暗誦・ループ再生</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1.5">
                {selectedTaal.bols.map((b) => {
                  const isSam = b.matra === 1;
                  const isKhali = selectedTaal.waves.includes(b.matra);
                  const isTali = selectedTaal.claps.includes(b.matra) && !isSam;
                  const isCurrent = isTaalPlaying && currentTaalMatra === b.matra;

                  return (
                    <div
                      key={b.matra}
                      onClick={() => {
                        tablaAudio.playBol(b.bol);
                        if (onPlayBol) onPlayBol(b.bol);
                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          try { navigator.vibrate?.(10); } catch (_) {}
                        }
                      }}
                      className={`p-2 sm:p-2.5 rounded-lg border text-center cursor-pointer transition-all flex flex-col items-center justify-between gap-1 hover:brightness-110 active:scale-95 ${
                        isCurrent
                          ? isSam
                            ? 'bg-amber-500 text-stone-950 font-black border-amber-300 ring-2 ring-amber-300 scale-105 shadow-lg z-10'
                            : isKhali
                            ? 'bg-sky-400 text-stone-950 font-black border-sky-300 ring-2 ring-sky-300 scale-105 shadow-lg z-10'
                            : 'bg-amber-400 text-stone-950 font-black border-amber-200 ring-2 ring-amber-200 scale-105 shadow z-10'
                          : isSam
                          ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                          : isKhali
                          ? 'bg-sky-950/40 border-sky-800 text-sky-200'
                          : 'bg-stone-900 border-stone-800 text-stone-300'
                      }`}
                    >
                      <span className="text-[10px] font-mono opacity-80">#{b.matra}</span>
                      <span className="text-xs sm:text-sm font-black">{b.text}</span>
                      <span className="text-[9px] px-1 rounded font-bold whitespace-nowrap">
                        {isSam ? '★ Sam' : isKhali ? '波 (Khali)' : isTali ? '拍 (Tali)' : '·'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: 構造・解剖 (Anatomy & Craftsmanship) */}
      {/* ========================================================================= */}
      {activeSubTab === 'anatomy' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
            <div className="border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Instrument Anatomy</span>
              <h3 className="text-xl font-bold text-stone-100 mt-1">
                楽器の構造と職人技：3層山羊皮プリーの解剖学
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                タブラの打面「プリー」は、1枚の皮ではなく3層の皮と鉄粉の練り込みによって出来ています。
              </p>
            </div>

            {/* Cross Section SVG */}
            <div className="w-full bg-stone-950 p-6 rounded-xl border border-stone-800 flex flex-col items-center">
              <svg viewBox="0 0 800 240" className="w-full max-w-3xl h-auto">
                <rect x="40" y="160" width="80" height="60" fill="#3f1407" rx="4" stroke="#5c200e" strokeWidth="2" />
                <rect x="680" y="160" width="80" height="60" fill="#3f1407" rx="4" stroke="#5c200e" strokeWidth="2" />
                <text x="80" y="200" fill="#a8a29e" fontSize="12" textAnchor="middle">木胴（シーシャム）</text>
                <text x="720" y="200" fill="#a8a29e" fontSize="12" textAnchor="middle">木胴（シーシャム）</text>

                <path d="M 50 155 Q 400 162 750 155" stroke="#e5d5b5" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M 50 148 L 190 149" stroke="#ba9e6e" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M 610 149 L 750 148" stroke="#ba9e6e" strokeWidth="5" fill="none" strokeLinecap="round" />
                <ellipse cx="400" cy="157" rx="140" ry="10" fill="#1c1917" stroke="#44403c" strokeWidth="2" />

                <circle cx="50" cy="155" r="14" fill="#a3824f" stroke="#715428" strokeWidth="3" />
                <circle cx="750" cy="155" r="14" fill="#a3824f" stroke="#715428" strokeWidth="3" />
                <text x="50" y="125" fill="#ca8a04" fontSize="11" textAnchor="middle" fontWeight="bold">編み紐 (ガジュラ)</text>
                <text x="750" y="125" fill="#ca8a04" fontSize="11" textAnchor="middle" fontWeight="bold">編み紐 (ガジュラ)</text>

                <text x="120" y="115" fill="#d97706" fontSize="11" textAnchor="middle" fontWeight="bold">① キナール (外縁革)</text>
                <line x1="120" y1="120" x2="120" y2="145" stroke="#d97706" strokeWidth="1" strokeDasharray="2 2" />

                <text x="280" y="115" fill="#d4d4d4" fontSize="11" textAnchor="middle" fontWeight="bold">② マイダーン (中間主皮)</text>
                <line x1="280" y1="120" x2="280" y2="155" stroke="#a8a29e" strokeWidth="1" strokeDasharray="2 2" />

                <text x="400" y="115" fill="#f59e0b" fontSize="12" textAnchor="middle" fontWeight="bold">③ シャヒ (重層鉄粉円盤)</text>
                <line x1="400" y1="120" x2="400" y2="150" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>

            {/* Parts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ANATOMY_PARTS.map((part, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">{part.name}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{part.meaning}</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">{part.role}</p>
                  <p className="text-[11px] text-amber-500/90 font-medium pt-0.5">
                    対象太鼓：{part.drum}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
