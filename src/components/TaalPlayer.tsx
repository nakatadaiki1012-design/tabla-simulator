import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TAAL_LIST } from '../data/tablaData';
import { TaalDefinition, BolKey } from '../types/tabla';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { Play, Pause, RotateCcw, Volume2, Award, Sparkles } from 'lucide-react';

interface Props {
  onBolTriggered?: (bol: BolKey) => void;
}

export const TaalPlayer: React.FC<Props> = ({ onBolTriggered }) => {
  const [selectedTaalId, setSelectedTaalId] = useState<string>('teental');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(80);
  const [currentMatra, setCurrentMatra] = useState<number>(1);
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [score, setScore] = useState<{ hits: number; total: number; streak: number }>({
    hits: 0,
    total: 0,
    streak: 0,
  });
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  const activeTaal = TAAL_LIST.find((t) => t.id === selectedTaalId) || TAAL_LIST[0];

  const timerRef = useRef<number | null>(null);
  const currentMatraRef = useRef<number>(1);
  const bpmRef = useRef<number>(bpm);
  bpmRef.current = bpm;

  // Theka playback loop
  const stepBeat = useCallback(() => {
    const totalBeats = activeTaal.beats;
    let nextMatra = currentMatraRef.current + 1;
    if (nextMatra > totalBeats) {
      nextMatra = 1;
    }
    currentMatraRef.current = nextMatra;
    setCurrentMatra(nextMatra);

    // Find the bol for this matra
    const beatInfo = activeTaal.bols.find((b) => b.matra === nextMatra);
    if (beatInfo) {
      tablaAudio.playBol(beatInfo.bol);
      if (onBolTriggered) {
        onBolTriggered(beatInfo.bol);
      }
    }
  }, [activeTaal, onBolTriggered]);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 / bpm) * 1000;
      timerRef.current = window.setInterval(() => {
        stepBeat();
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, bpm, stepBeat]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      tablaAudio.ensureContext();
      // Play beat 1 immediately
      currentMatraRef.current = 1;
      setCurrentMatra(1);
      const beat1 = activeTaal.bols.find((b) => b.matra === 1);
      if (beat1) {
        tablaAudio.playBol(beat1.bol);
        if (onBolTriggered) onBolTriggered(beat1.bol);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    currentMatraRef.current = 1;
    setCurrentMatra(1);
    setScore({ hits: 0, total: 0, streak: 0 });
    setLastFeedback(null);
  };

  const handleSelectTaal = (id: string) => {
    setIsPlaying(false);
    setSelectedTaalId(id);
    currentMatraRef.current = 1;
    setCurrentMatra(1);
    setScore({ hits: 0, total: 0, streak: 0 });
    setLastFeedback(null);
  };

  // Student Practice Hit Handler
  const handleStudentHit = (pressedBol: BolKey) => {
    tablaAudio.playBol(pressedBol);
    if (!isPlaying || !practiceMode) return;

    const expectedBol = activeTaal.bols.find((b) => b.matra === currentMatra)?.bol;
    const isCorrect = expectedBol === pressedBol;

    setScore((prev) => {
      const nextHits = isCorrect ? prev.hits + 1 : prev.hits;
      const nextStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        hits: nextHits,
        total: prev.total + 1,
        streak: nextStreak,
      };
    });

    if (isCorrect) {
      setLastFeedback('ジャスト！正確なボルです');
    } else {
      setLastFeedback(`惜しい！次は ${expectedBol?.toUpperCase()} を狙おう`);
    }
  };

  // Speed Presets
  const setTempoPreset = (preset: 'vilambit' | 'madhya' | 'drut') => {
    if (preset === 'vilambit') setBpm(54);
    else if (preset === 'madhya') setBpm(90);
    else if (preset === 'drut') setBpm(144);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Header explanation */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <span className="text-amber-500">ताल</span> ターラ（インド音楽のリズム周期）学習
            </h2>
            <p className="text-xs text-stone-400">
              インド音楽は直線的な拍子ではなく「円環（サイクル）」で時間を捉えます。
              拍手（ターリー）と空拍（カーリー）、そしてすべてが帰結する第1拍「サム」を体感しましょう。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPracticeMode(!practiceMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                practiceMode
                  ? 'bg-amber-600 text-white border-amber-500 shadow'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              {practiceMode ? '練習モード: ON' : '練習モード: OFF'}
            </button>
          </div>
        </div>

        {/* Taal Selector Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-stone-800">
          {TAAL_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTaal(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                selectedTaalId === t.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-750'
              }`}
            >
              <span>{t.name}</span>
              <span className="text-[11px] opacity-75">({t.beats}拍)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Taal Visual Cycle Matrix */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
        {/* Info bar about selected Taal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-amber-400">{activeTaal.name}</span>
              <span className="text-xs text-stone-500 font-mono">[{activeTaal.devanagari}]</span>
              <span className="text-xs text-stone-400">· {activeTaal.genre}</span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{activeTaal.description}</p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Play / Pause / Reset */}
            <button
              onClick={handleTogglePlay}
              className={`px-4 py-2 text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? '一時停止' : '演奏スタート'}</span>
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
              title="最初に戻す"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Beats Grid Strip */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>マートラー (Matra / 拍の進行)</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> サム (X / 第1拍)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span>👏 ターリー (拍手)</span>
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span>👋 カーリー (波・空拍)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
            {activeTaal.bols.map((beat) => {
              const isCurrent = currentMatra === beat.matra;
              const isSam = beat.matra === 1;
              const isClap = activeTaal.claps.includes(beat.matra) && !isSam;
              const isWave = activeTaal.waves.includes(beat.matra);

              return (
                <div
                  key={beat.matra}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-between min-h-[96px] transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-stone-950 border-amber-300 ring-4 ring-amber-500/30 scale-105 z-10 font-bold'
                      : isSam
                      ? 'bg-amber-950/40 border-amber-700/60 text-stone-200'
                      : isWave
                      ? 'bg-sky-950/30 border-sky-800/40 text-stone-300'
                      : 'bg-stone-950 border-stone-800 text-stone-300'
                  }`}
                >
                  {/* Beat number & Action badge */}
                  <div className="flex items-center justify-between w-full text-[11px]">
                    <span className="font-mono font-semibold">{beat.matra}</span>
                    <span>
                      {isSam && '⭐'}
                      {isClap && '👏'}
                      {isWave && '👋'}
                    </span>
                  </div>

                  {/* Bol Name */}
                  <div className="flex flex-col items-center my-1">
                    <span className="text-sm font-bold">{beat.text}</span>
                    <span className="text-[10px] opacity-75">{beat.dev}</span>
                  </div>

                  {/* Gesture Label */}
                  <div className="text-[9px] opacity-80 whitespace-nowrap">
                    {isSam ? 'サム (X)' : isClap ? 'ターリー' : isWave ? 'カーリー (0)' : '・'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tempo Controller & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-stone-950 border border-stone-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-400">テンポ (BPM / Laya):</span>
            <input
              type="range"
              min="40"
              max="200"
              step="2"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10))}
              className="w-36 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-sm font-mono font-bold text-amber-400 w-16">{bpm} BPM</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">古典速度区分:</span>
            <button
              onClick={() => setTempoPreset('vilambit')}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                bpm <= 70
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
            >
              ヴィランビット (緩 54)
            </button>
            <button
              onClick={() => setTempoPreset('madhya')}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                bpm > 70 && bpm <= 130
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
            >
              マディヤ (中 90)
            </button>
            <button
              onClick={() => setTempoPreset('drut')}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                bpm > 130
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
            >
              ドルット (速 144)
            </button>
          </div>
        </div>

        {/* Practice Game Section (if enabled) */}
        {practiceMode && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/40 border border-amber-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>生徒用リズム・トレーニング（拍に合わせてボルを叩こう！）</span>
              </div>
              <p className="text-xs text-stone-300">
                現在の拍に表示されているボル（Dha, Dhin, Tin, Na）を下のボタンまたはキーボードでタイミングよく叩きましょう。
              </p>
              {lastFeedback && (
                <span className="text-xs font-semibold text-amber-300 mt-1">{lastFeedback}</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center bg-stone-950 px-4 py-2 rounded-lg border border-stone-800">
                <span className="text-[11px] text-stone-400">スコア正解率</span>
                <span className="text-lg font-mono font-bold text-amber-400">
                  {score.total > 0 ? `${Math.round((score.hits / score.total) * 100)}%` : '0%'}
                </span>
                <span className="text-[10px] text-stone-500">
                  {score.hits} / {score.total} 打
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['dha', 'dhin', 'tin', 'na', 'ge', 'ke'] as BolKey[]).map((bol) => (
                  <button
                    key={bol}
                    onClick={() => handleStudentHit(bol)}
                    className="px-3 py-2 text-xs font-bold uppercase bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-200 rounded-lg border border-stone-700 transition-colors"
                  >
                    {bol}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
