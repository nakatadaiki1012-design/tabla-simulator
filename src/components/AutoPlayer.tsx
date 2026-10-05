import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AUTO_PERFORMANCES, AutoPerformance, PerformanceStep } from '../audio/autoPerformances';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { BolKey } from '../types/tabla';
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Sparkles,
  Music2,
  Gamepad2,
  Headphones,
  Award,
  Zap,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { TablaHandVisualizer } from './TablaHandVisualizer';
import { TablaVibrationOverlay } from './TablaVibrationOverlay';

interface Props {
  onBolPlayed?: (bol: BolKey) => void;
}

export const AutoPlayer: React.FC<Props> = ({ onBolPlayed }) => {
  // Mode: 'listen' (Auto-Listen to Master) vs 'playalong' (Guide-based Student Interactive Play-Along)
  const [playMode, setPlayMode] = useState<'listen' | 'playalong'>('listen');

  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>(
    AUTO_PERFORMANCES[0].id
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'theka' | 'solo' | 'groove' | 'climax'>(
    'all'
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isTanpuraActive, setIsTanpuraActive] = useState<boolean>(false);
  const [assistAudio, setAssistAudio] = useState<boolean>(true); // In playalong mode: play master guide audio

  // Game / Play-Along Scoring State
  const [score, setScore] = useState<{
    points: number;
    perfects: number;
    goods: number;
    misses: number;
    combo: number;
    maxCombo: number;
  }>({
    points: 0,
    perfects: 0,
    goods: 0,
    misses: 0,
    combo: 0,
    maxCombo: 0,
  });

  const [hitFeedback, setHitFeedback] = useState<{
    text: string;
    type: 'perfect' | 'good' | 'miss';
    bolName?: string;
  } | null>(null);

  const [showResultCard, setShowResultCard] = useState<boolean>(false);

  // Real-time Drum Visualizer State for Auto-Play & Play-Along
  const [handMode, setHandMode] = useState<'smart' | 'silhouette' | 'off'>('smart');
  const [handOpacity, setHandOpacity] = useState<number>(0.75);
  const [showVibrations, setShowVibrations] = useState<boolean>(true);

  // Independent per-drum strike tracking (strictly isolated so one drum strike NEVER triggers the other!)
  const [bayanStrike, setBayanStrike] = useState<{ bol: BolKey; time: number } | null>(null);
  const [dayanStrike, setDayanStrike] = useState<{ bol: BolKey; time: number } | null>(null);

  const isBayanRecoil = !!(bayanStrike && Date.now() - bayanStrike.time < 240);
  const isDayanRecoil = !!(dayanStrike && Date.now() - dayanStrike.time < 240);

  const activePerformance =
    AUTO_PERFORMANCES.find((p) => p.id === selectedPerformanceId) || AUTO_PERFORMANCES[0];

  const timerRef = useRef<number | null>(null);
  const stepIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const currentStepStartTimeRef = useRef<number>(0);
  const lastEvaluatedStepRef = useRef<number>(-1);

  // Play Step Handler (Drives the timeline clock)
  const playNextStep = useCallback(() => {
    if (!isPlayingRef.current) return;

    const steps = activePerformance.steps;
    const idx = stepIndexRef.current;

    if (idx >= steps.length) {
      if (playMode === 'playalong') {
        // Show result card at end of performance
        setShowResultCard(true);
      }

      if (isLooping) {
        stepIndexRef.current = 0;
        setCurrentStepIndex(0);
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const currentStep = steps[stepIndexRef.current];
    setCurrentStepIndex(stepIndexRef.current);
    const now = Date.now();
    currentStepStartTimeRef.current = now;

    // Trigger visual strikes strictly isolated per drum
    const isBayan = currentStep.drum === 'bayan' || currentStep.drum === 'both';
    const isDayan = currentStep.drum === 'dayan' || currentStep.drum === 'both';

    if (isBayan) {
      const bayanBol = currentStep.bol === 'dha' || currentStep.bol === 'dhin' ? 'ge' : currentStep.bol;
      setBayanStrike({ bol: bayanBol, time: now });
    }
    if (isDayan) {
      const dayanBol = currentStep.bol === 'dha' ? 'na' : currentStep.bol === 'dhin' ? 'tin' : currentStep.bol;
      setDayanStrike({ bol: dayanBol, time: now });
    }

    // In 'listen' mode, always play master audio
    // In 'playalong' mode, play master audio only if assistAudio is ON
    if (playMode === 'listen' || assistAudio) {
      const volumeScale = playMode === 'playalong' ? 0.6 : 1.0;
      tablaAudio.playBol(currentStep.bol, currentStep.bend);
    }

    if (onBolPlayed) {
      onBolPlayed(currentStep.bol);
    }

    // Schedule next beat
    const nextInterval = currentStep.durationMs / speedMultiplier;
    stepIndexRef.current += 1;

    timerRef.current = window.setTimeout(() => {
      playNextStep();
    }, nextInterval);
  }, [activePerformance, isLooping, speedMultiplier, playMode, assistAudio, onBolPlayed]);

  // Main playback lifecycle
  useEffect(() => {
    if (isPlaying) {
      tablaAudio.ensureContext();
      setShowResultCard(false);
      playNextStep();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, playNextStep]);

  // Student Play-Along Hit Evaluator
  const handleStudentStrike = useCallback(
    (pressedBol: BolKey) => {
      const now = Date.now();
      const isBayan =
        pressedBol === 'ge' ||
        pressedBol === 'ke' ||
        pressedBol === 'meend' ||
        pressedBol === 'dha' ||
        pressedBol === 'dhin';
      const isDayan =
        pressedBol === 'na' ||
        pressedBol === 'tin' ||
        pressedBol === 'tun' ||
        pressedBol === 'te' ||
        pressedBol === 're' ||
        pressedBol === 'dha' ||
        pressedBol === 'dhin';

      if (isBayan) {
        const bayanBol = pressedBol === 'dha' || pressedBol === 'dhin' ? 'ge' : pressedBol;
        setBayanStrike({ bol: bayanBol, time: now });
      }
      if (isDayan) {
        const dayanBol = pressedBol === 'dha' ? 'na' : pressedBol === 'dhin' ? 'tin' : pressedBol;
        setDayanStrike({ bol: dayanBol, time: now });
      }

      // Always play the student's drum sound with full fidelity!
      tablaAudio.playBol(pressedBol);
      if (onBolPlayed) {
        onBolPlayed(pressedBol);
      }

      // If not playing or in listen mode, just audition
      if (!isPlaying || playMode !== 'playalong') return;

      const steps = activePerformance.steps;
      const currentIdx = Math.max(0, stepIndexRef.current - 1);
      const expectedStep = steps[currentIdx];

      if (!expectedStep) return;

      const elapsedMs = Date.now() - currentStepStartTimeRef.current;
      const expectedDuration = expectedStep.durationMs / speedMultiplier;
      const timeDiff = Math.abs(elapsedMs);

      // Check if Bol matches
      const isBolMatch = expectedStep.bol === pressedBol;

      // Evaluation windows
      if (isBolMatch) {
        if (timeDiff <= 110) {
          // PERFECT!
          setScore((prev) => {
            const nextCombo = prev.combo + 1;
            return {
              points: prev.points + 100 + nextCombo * 10,
              perfects: prev.perfects + 1,
              goods: prev.goods,
              misses: prev.misses,
              combo: nextCombo,
              maxCombo: Math.max(prev.maxCombo, nextCombo),
            };
          });
          setHitFeedback({ text: 'PERFECT! (ジャスト)', type: 'perfect', bolName: expectedStep.label });
        } else {
          // GOOD
          setScore((prev) => {
            const nextCombo = prev.combo + 1;
            return {
              points: prev.points + 50,
              perfects: prev.perfects,
              goods: prev.goods + 1,
              misses: prev.misses,
              combo: nextCombo,
              maxCombo: Math.max(prev.maxCombo, nextCombo),
            };
          });
          setHitFeedback({ text: 'GOOD! (いい調子)', type: 'good', bolName: expectedStep.label });
        }
      } else {
        // Wrong Bol struck
        setScore((prev) => ({
          ...prev,
          misses: prev.misses + 1,
          combo: 0,
        }));
        setHitFeedback({
          text: `MISS! (次は ${expectedStep.label} を狙おう)`,
          type: 'miss',
          bolName: expectedStep.label,
        });
      }
    },
    [isPlaying, playMode, activePerformance, speedMultiplier, onBolPlayed]
  );

  // Keyboard shortcut listener for interactive playalong
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      let matchedBol: BolKey | null = null;

      if (e.code === 'Space') {
        e.preventDefault();
        matchedBol = 'dha';
      } else if (key === 'j') {
        matchedBol = 'na';
      } else if (key === 'k') {
        matchedBol = 'tin';
      } else if (key === 'l') {
        matchedBol = 'tun';
      } else if (key === ';') {
        matchedBol = 'te';
      } else if (key === 'u') {
        matchedBol = 're';
      } else if (key === 'a') {
        matchedBol = 'ge';
      } else if (key === 's') {
        matchedBol = 'meend';
      } else if (key === 'd') {
        matchedBol = 'ke';
      } else if (key === 'g') {
        matchedBol = 'dhin';
      } else if (key === 't') {
        matchedBol = 'ti_re_ki_ta';
      }

      if (matchedBol) {
        handleStudentStrike(matchedBol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStudentStrike]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      stepIndexRef.current = 0;
      setCurrentStepIndex(0);
      setScore({ points: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0 });
      setHitFeedback(null);
      setShowResultCard(false);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    stepIndexRef.current = 0;
    setCurrentStepIndex(0);
    setBayanStrike(null);
    setDayanStrike(null);
    setScore({ points: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0 });
    setHitFeedback(null);
    setShowResultCard(false);
  };

  const handleSelectPerformance = (id: string) => {
    setIsPlaying(false);
    setSelectedPerformanceId(id);
    stepIndexRef.current = 0;
    setCurrentStepIndex(0);
    setBayanStrike(null);
    setDayanStrike(null);
    setScore({ points: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0 });
    setHitFeedback(null);
    setShowResultCard(false);
  };

  const handleToggleTanpura = () => {
    const active = tablaAudio.toggleTanpura();
    setIsTanpuraActive(active);
  };

  // Filtered tracks
  const filteredPerformances =
    categoryFilter === 'all'
      ? AUTO_PERFORMANCES
      : AUTO_PERFORMANCES.filter((p) => p.category === categoryFilter);

  // Target beat coming up
  const currentStep = activePerformance.steps[currentStepIndex] || activePerformance.steps[0];
  const nextStep = activePerformance.steps[(currentStepIndex + 1) % activePerformance.steps.length];

  // Calculate Accuracy Percentage
  const totalNotesHit = score.perfects + score.goods + score.misses;
  const accuracyPct =
    totalNotesHit > 0 ? Math.round(((score.perfects * 1.0 + score.goods * 0.7) / totalNotesHit) * 100) : 100;

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Top Selector: 2 Core Modes (Listen to Master vs Guided Play-Along) */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <span className="text-xl">🎶</span> 本格自動演奏 ＆ 演奏ガイド・体感モード
            </h2>
            <p className="text-xs text-stone-400">
              プロのお手本演奏をじっくり鑑賞することも、画面のガイドに合わせてキーボードを叩き、
              自分自身でインド打楽器の演奏を再現して習得することもできます。
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 self-start md:self-center">
            <button
              onClick={() => {
                setPlayMode('listen');
                handleReset();
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                playMode === 'listen'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>お手本を聴く（自動演奏）</span>
            </button>

            <button
              onClick={() => {
                setPlayMode('playalong');
                handleReset();
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                playMode === 'playalong'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>ガイドに合わせて自分で叩く</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400 font-semibold">ジャンル絞り込み:</span>
            {[
              { id: 'all', label: 'すべて (6名演)' },
              { id: 'solo', label: '巨匠独奏・レラ/カイダ' },
              { id: 'theka', label: '基本周期・テーカ' },
              { id: 'groove', label: '導入ペシュカール' },
              { id: 'climax', label: '白熱クライマックス' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as typeof categoryFilter)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-stone-800 text-amber-300 font-semibold border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tanpura Drone Toggle */}
          <button
            onClick={handleToggleTanpura}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              isTanpuraActive
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Music2 className="w-3.5 h-3.5 text-amber-400" />
            <span>タンプーラ伴奏: {isTanpuraActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Grid of Repertoire Pieces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
          {filteredPerformances.map((p) => {
            const isSelected = selectedPerformanceId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPerformance(p.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-amber-950/70 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-stone-950 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-stone-100 line-clamp-1">{p.titleJa}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      p.difficulty === '初級'
                        ? 'bg-emerald-950 text-emerald-300'
                        : p.difficulty === '中級'
                        ? 'bg-sky-950 text-sky-300'
                        : 'bg-red-950 text-red-300'
                    }`}
                  >
                    {p.difficulty}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span className="text-amber-400/90 font-medium">{p.gharana.split('（')[0]}</span>
                  <span className="text-stone-300 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                    {p.compositionType}
                  </span>
                  <span className="font-mono text-stone-500">{p.defaultBpm} BPM</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Playback Deck */}
      <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
        {/* Track Header & Transport */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-stone-100">{activePerformance.titleJa}</h3>
              <span className="text-xs text-amber-400 font-mono">[{activePerformance.taalName}]</span>
            </div>
            
            {/* Real Master & Gharana Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold">
                流派：{activePerformance.gharana}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800 font-semibold">
                実演伝承：{activePerformance.masterArtist}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-semibold">
                形式：{activePerformance.compositionType}
              </span>
            </div>

            <p className="text-xs text-stone-300 mt-2 max-w-3xl leading-relaxed">
              {activePerformance.description}
            </p>
            {activePerformance.structureNotes && (
              <p className="text-[11px] text-amber-400/90 mt-1.5 font-sans bg-stone-950/60 px-3 py-1.5 rounded-lg border border-stone-800/80">
                {activePerformance.structureNotes}
              </p>
            )}
          </div>

          {/* Transport Buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {playMode === 'playalong' && (
              <button
                onClick={() => setAssistAudio(!assistAudio)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                  assistAudio
                    ? 'bg-stone-800 text-stone-200 border-stone-700'
                    : 'bg-stone-950 text-stone-500 border-stone-800'
                }`}
                title="ガイド音の有無を切り替え"
              >
                {assistAudio ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{assistAudio ? 'ガイド音: ON' : 'ガイド音: OFF'}</span>
              </button>
            )}

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2.5 rounded-lg border transition-colors ${
                isLooping ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-stone-800 text-stone-400 border-stone-700'
              }`}
              title={isLooping ? 'リピート再生中' : '1回のみ再生'}
            >
              <Repeat className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? '一時停止' : playMode === 'playalong' ? 'ガイド開始！' : '自動演奏スタート'}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2.5 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
              title="最初に戻す"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Speed Multiplier & Difficulty Hint */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-stone-400 font-semibold">テンポ調整:</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              className="w-32 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-mono text-amber-400 font-bold w-12 text-center">
              {speedMultiplier.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center gap-4 text-stone-400 text-[11px]">
            <span>原曲速度: {activePerformance.defaultBpm} BPM</span>
            <span>·</span>
            <span>{activePerformance.tempoName}</span>
          </div>
        </div>

        {/* LIVE CONCERT DRUM STAGE (Master Auto-Performance & Interactive Play-Along) */}
        <div className="relative w-full rounded-2xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 p-4 sm:p-6 border border-stone-800 shadow-2xl overflow-hidden flex flex-col gap-4">
          {/* Traditional Amber Stage Backdrop */}
          <div className="absolute inset-x-8 bottom-4 h-32 bg-amber-950/20 blur-3xl rounded-full pointer-events-none" />

          {/* Top Live Stage Toolbar: Real-time Status & Hand/Vibration Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20 pb-2 border-b border-stone-800/80">
            {/* Live Playing Bol Banner */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-stone-600'
                  }`}
                />
                <span className="text-xs font-bold text-stone-200">
                  {isPlaying
                    ? playMode === 'listen'
                      ? '🔴 巨匠の生実演中（リアルタイム打法追尾）'
                      : '🎯 ガイド追尾中（タイミングを合わせて叩こう）'
                    : '⏸ 停止中（スタートを押すと打撃を再現）'}
                </span>
              </div>

              {/* Current Bol Badge */}
              <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {currentStep.label}
                </span>
                <span className="text-[10px] text-stone-400 font-hindi">
                  {currentStep.devanagari}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ml-1 ${
                    currentStep.drum === 'both'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : currentStep.drum === 'bayan'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {currentStep.drum === 'both'
                    ? '両手同時'
                    : currentStep.drum === 'bayan'
                    ? '左手'
                    : '右手'}
                </span>
              </div>
            </div>

            {/* Hand Guide Style & Vibration Display Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-stone-950 p-0.5 rounded-xl border border-stone-800">
                <span className="text-[11px] text-stone-400 font-semibold px-1.5 hidden sm:inline">
                  手の案内:
                </span>
                {[
                  { id: 'smart', label: '🎯 指先', fullLabel: '🎯 指先ガイド' },
                  { id: 'silhouette', label: '🖐️ 手形', fullLabel: '🖐️ 手形' },
                  { id: 'off', label: '❌ OFF', fullLabel: '❌ OFF' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setHandMode(m.id as 'smart' | 'silhouette' | 'off')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      handMode === m.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="sm:hidden">{m.label}</span>
                    <span className="hidden sm:inline">{m.fullLabel}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowVibrations(!showVibrations)}
                className={`px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 text-xs ${
                  showVibrations
                    ? 'bg-sky-950 text-sky-200 border-sky-600 shadow-sm'
                    : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                }`}
              >
                <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>振動: {showVibrations ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* PLAY-ALONG SCORE HUD (If playalong mode) */}
          {playMode === 'playalong' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-stone-950/80 border border-amber-900/40">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-stone-400 font-semibold uppercase">Score</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{score.points}</span>
                </div>
                <div className="flex flex-col pl-3 border-l border-stone-800">
                  <span className="text-[10px] text-stone-400 font-semibold uppercase">Accuracy</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">{accuracyPct}%</span>
                </div>
                <div className="flex flex-col pl-3 border-l border-stone-800">
                  <span className="text-[10px] text-stone-400 font-semibold uppercase">Streak</span>
                  <span className="text-lg font-mono font-bold text-sky-400">{score.combo} COMBO</span>
                </div>
              </div>

              {hitFeedback && (
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-bold animate-fade-in flex items-center gap-1.5 ${
                    hitFeedback.type === 'perfect'
                      ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-400/50'
                      : hitFeedback.type === 'good'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-900/80 text-red-200 border border-red-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{hitFeedback.text}</span>
                </div>
              )}
            </div>
          )}

          {/* THE TWO DRUMS: BAYAN (LEFT) & DAYAN (RIGHT) - Side-by-Side Horizontal */}
          <div className="grid grid-cols-2 gap-2 sm:gap-6 md:gap-8 items-start justify-items-center relative z-20 my-auto w-full">
            {/* ------------------------------------------------------------- */}
            {/* LEFT DRUM: BAYAN (左手・低音太鼓)                                */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-col items-center gap-2 w-full max-w-sm">
              <div className="flex items-center justify-between w-full px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs font-bold bg-sky-900/80 text-sky-200 px-1.5 py-0.5 rounded">
                    左手
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-sky-400">
                    बायाँ バーヤーン
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">
                  [A · S · D]
                </span>
              </div>

              {/* Bayan Drum Stage SVG */}
              <div
                className={`relative w-full max-w-[155px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[280px] aspect-square group select-none transition-transform duration-100 ${
                  isBayanRecoil ? 'scale-[1.03] -translate-y-1 rotate-[-0.5deg]' : 'scale-100'
                }`}
              >
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-red-950 via-sky-950 to-red-950 border-3 border-sky-700/50 shadow-xl -z-10" />

                <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
                  <defs>
                    <radialGradient id="autoBrassGrad" cx="38%" cy="38%" r="62%">
                      <stop offset="0%" stopColor="#e5c158" />
                      <stop offset="45%" stopColor="#b38a16" />
                      <stop offset="85%" stopColor="#5d4306" />
                      <stop offset="100%" stopColor="#251b03" />
                    </radialGradient>
                    <radialGradient id="autoLeatherBayan" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#faf6ee" />
                      <stop offset="70%" stopColor="#f3e8d2" />
                      <stop offset="100%" stopColor="#d6c39a" />
                    </radialGradient>
                    <radialGradient id="autoSyahiBayan" cx="46%" cy="44%" r="52%">
                      <stop offset="0%" stopColor="#383838" />
                      <stop offset="50%" stopColor="#1a1a1a" />
                      <stop offset="100%" stopColor="#050505" />
                    </radialGradient>
                  </defs>

                  {/* Polished Bell Metal Rim */}
                  <circle cx="150" cy="150" r="144" fill="url(#autoBrassGrad)" stroke="#805d0e" strokeWidth="4" />

                  {/* Gajra Braid */}
                  <circle
                    cx="150"
                    cy="150"
                    r="134"
                    fill="#cbb387"
                    stroke="#8f6e3c"
                    strokeWidth="5"
                    strokeDasharray="4 2"
                  />

                  {/* MAIDAN LEATHER (Ge Bass zone) */}
                  <circle
                    cx="150"
                    cy="150"
                    r="126"
                    fill="url(#autoLeatherBayan)"
                    className="cursor-pointer transition-all hover:brightness-105 active:scale-[0.99]"
                    onClick={() => handleStudentStrike('ge')}
                  />

                  {/* Off-Center Syahi (Ke Slap Zone) */}
                  <g
                    className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    onClick={() => handleStudentStrike('ke')}
                  >
                    <circle
                      cx="155"
                      cy="125"
                      r="68"
                      fill="url(#autoSyahiBayan)"
                      stroke="#1c1917"
                      strokeWidth="2"
                    />
                    <circle cx="155" cy="125" r="54" fill="none" stroke="#3d3d3d" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="155" cy="125" r="36" fill="none" stroke="#2a2a2a" strokeWidth="0.8" />
                    <circle cx="155" cy="125" r="18" fill="none" stroke="#4a4a4a" strokeWidth="0.8" />
                    <text
                      x="155"
                      y="125"
                      textAnchor="middle"
                      fill="#f5f5f4"
                      fontSize="13"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      Ke [D]
                    </text>
                    <text
                      x="155"
                      y="141"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9.5"
                      className="pointer-events-none select-none"
                    >
                      平手消音
                    </text>
                  </g>

                  {/* Meend / Ge Palm Contact Zone */}
                  <path
                    d="M 95 235 Q 150 255 205 235 Q 185 190 150 190 Q 115 190 95 235 Z"
                    fill="rgba(2, 132, 199, 0.16)"
                    stroke="rgba(56, 189, 248, 0.6)"
                    strokeDasharray="3 3"
                    className="cursor-pointer transition-colors hover:fill-sky-500/30"
                    onClick={() => handleStudentStrike('ge')}
                  />
                  <text
                    x="150"
                    y="218"
                    textAnchor="middle"
                    fill="#0284c7"
                    fontSize="12"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    Ge [A] 開放低音
                  </text>

                  {/* TARGET BEACON FOR PLAYALONG (Target on Bayan) */}
                  {playMode === 'playalong' &&
                    (currentStep.drum === 'bayan' || currentStep.drum === 'both') && (
                      <g
                        transform={`translate(${currentStep.bol === 'ke' ? 155 : 150}, ${
                          currentStep.bol === 'ke' ? 125 : 180
                        })`}
                        className="cursor-pointer"
                        onClick={() => handleStudentStrike(currentStep.bol)}
                      >
                        <circle cx="0" cy="0" r="26" fill="none" stroke="#38bdf8" strokeWidth="3" className="animate-ping origin-center" />
                        <circle cx="0" cy="0" r="20" fill="rgba(56, 189, 248, 0.4)" stroke="#0284c7" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                        <text x="0" y="4.5" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">
                          {currentStep.shortcut === 'Space' ? '␣' : currentStep.shortcut}
                        </text>
                      </g>
                    )}

                  {/* ACOUSTIC MEMBRANE VIBRATION WAVES */}
                  {showVibrations && (
                    <TablaVibrationOverlay
                      drum="bayan"
                      activeBol={bayanStrike?.bol || null}
                      strikeTime={bayanStrike?.time || 0}
                    />
                  )}

                  {/* HAND & FINGER GUIDE OVERLAY */}
                  {handMode !== 'off' && (
                    <TablaHandVisualizer
                      drum="bayan"
                      activeBol={bayanStrike?.bol || null}
                      targetBol={currentStep.drum !== 'dayan' ? currentStep.bol : null}
                      displayMode={handMode}
                      handOpacity={handOpacity}
                      isStriking={isBayanRecoil}
                    />
                  )}
                </svg>
              </div>

              {/* Quick Left-Hand Triggers */}
              <div className="grid grid-cols-3 gap-1 w-full pt-1">
                {[
                  { bol: 'ge', key: 'A', label: 'Ge', sub: '低音' },
                  { bol: 'ke', key: 'D', label: 'Ke', sub: '消音' },
                  { bol: 'meend', key: 'S', label: 'Meend', sub: 'ベンド' },
                ].map((b) => (
                  <button
                    key={b.bol}
                    onClick={() => handleStudentStrike(b.bol as BolKey)}
                    className="py-1.5 px-1 text-xs font-bold bg-sky-950/70 hover:bg-sky-900 text-sky-200 rounded-lg border border-sky-800/70 transition-colors flex flex-col items-center justify-center min-h-[42px]"
                  >
                    <span>{b.label} <span className="font-mono text-[10px] text-sky-400">[{b.key}]</span></span>
                    <span className="text-[9px] text-sky-400/80">{b.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT DRUM: DAYAN (右手・高音太鼓)                               */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-col items-center gap-2 w-full max-w-sm">
              <div className="flex items-center justify-between w-full px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs font-bold bg-amber-900/80 text-amber-200 px-1.5 py-0.5 rounded">
                    右手
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-400">
                    दायाँ ダヤーン
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                  [J · K · L · ;]
                </span>
              </div>

              {/* Dayan Drum Stage SVG */}
              <div
                className={`relative w-full max-w-[155px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[280px] aspect-square group select-none transition-transform duration-100 ${
                  isDayanRecoil ? 'scale-[1.03] -translate-y-1 rotate-[0.5deg]' : 'scale-100'
                }`}
              >
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-3 border-amber-700/50 shadow-xl -z-10" />

                <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
                  <defs>
                    <radialGradient id="autoWoodGrad" cx="40%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#a33d1b" />
                      <stop offset="60%" stopColor="#631b07" />
                      <stop offset="90%" stopColor="#3b0f04" />
                      <stop offset="100%" stopColor="#170501" />
                    </radialGradient>
                    <radialGradient id="autoLeatherDayan" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fdfbf7" />
                      <stop offset="65%" stopColor="#f7ebd4" />
                      <stop offset="100%" stopColor="#e3cfab" />
                    </radialGradient>
                    <radialGradient id="autoSyahiDayan" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#303030" />
                      <stop offset="50%" stopColor="#141414" />
                      <stop offset="100%" stopColor="#000000" />
                    </radialGradient>
                  </defs>

                  {/* Carved Rosewood Shell Rim */}
                  <circle cx="150" cy="150" r="144" fill="url(#autoWoodGrad)" stroke="#591c0b" strokeWidth="5" />

                  {/* Gajra Braided Rim */}
                  <circle
                    cx="150"
                    cy="150"
                    r="133"
                    fill="#cbb387"
                    stroke="#7c5f32"
                    strokeWidth="5"
                    strokeDasharray="4 2"
                  />

                  {/* KINAR (Outer Rim - NA / TA Bell Strike) */}
                  <circle
                    cx="150"
                    cy="150"
                    r="124"
                    fill="#ebdcb9"
                    className="cursor-pointer hover:fill-amber-200 active:fill-amber-300 transition-colors"
                    onClick={() => handleStudentStrike('na')}
                  />
                  <circle cx="150" cy="150" r="124" fill="none" stroke="#ba9e6e" strokeWidth="1.5" />

                  {/* MAIDAN (Middle Ring - TIN Strike) */}
                  <circle
                    cx="150"
                    cy="150"
                    r="104"
                    fill="url(#autoLeatherDayan)"
                    className="cursor-pointer hover:fill-amber-50 active:fill-amber-100 transition-colors"
                    onClick={() => handleStudentStrike('tin')}
                  />
                  <circle cx="150" cy="150" r="104" fill="none" stroke="#cdb482" strokeWidth="1" strokeDasharray="2 2" />

                  {/* SYAHI (Center Black Circle - TUN Open Bell / TE Damped Slap) */}
                  <g
                    className="cursor-pointer transition-transform hover:scale-[1.015] active:scale-[0.985]"
                    onClick={(e) => {
                      if (e.shiftKey) {
                        handleStudentStrike('te');
                      } else {
                        handleStudentStrike('tun');
                      }
                    }}
                  >
                    <circle
                      cx="150"
                      cy="150"
                      r="58"
                      fill="url(#autoSyahiDayan)"
                      stroke="#1c1917"
                      strokeWidth="2.5"
                    />
                    <circle cx="150" cy="150" r="44" fill="none" stroke="#3d3d3d" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="150" cy="150" r="28" fill="none" stroke="#2a2a2a" strokeWidth="0.8" />
                    <circle cx="150" cy="150" r="12" fill="none" stroke="#4a4a4a" strokeWidth="0.8" />
                    <text
                      x="150"
                      y="145"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="13"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      Tun [L]
                    </text>
                    <text
                      x="150"
                      y="160"
                      textAnchor="middle"
                      fill="#d4d4d4"
                      fontSize="9.5"
                      className="pointer-events-none select-none"
                    >
                      Te [;] / Re [U]
                    </text>
                  </g>

                  {/* On-Drum Text Labels */}
                  <text x="150" y="50" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="bold" className="pointer-events-none">
                    Na [J] 外縁
                  </text>
                  <text x="150" y="74" textAnchor="middle" fill="#78350f" fontSize="10" fontWeight="600" className="pointer-events-none">
                    Tin [K] 中皮
                  </text>

                  {/* TARGET BEACON FOR PLAYALONG (Target on Dayan) */}
                  {playMode === 'playalong' &&
                    (currentStep.drum === 'dayan' || currentStep.drum === 'both') && (
                      <g
                        transform={`translate(${
                          currentStep.bol === 'na'
                            ? 150
                            : currentStep.bol === 'tin'
                            ? 150
                            : currentStep.bol === 'te' || currentStep.bol === 're'
                            ? 145
                            : 150
                        }, ${
                          currentStep.bol === 'na'
                            ? 36
                            : currentStep.bol === 'tin'
                            ? 82
                            : currentStep.bol === 'te' || currentStep.bol === 're'
                            ? 148
                            : 120
                        })`}
                        className="cursor-pointer"
                        onClick={() => handleStudentStrike(currentStep.bol)}
                      >
                        <circle cx="0" cy="0" r="26" fill="none" stroke="#fbbf24" strokeWidth="3" className="animate-ping origin-center" />
                        <circle cx="0" cy="0" r="20" fill="rgba(251, 191, 36, 0.4)" stroke="#d97706" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="14" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                        <text x="0" y="4.5" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">
                          {currentStep.shortcut === 'Space' ? '␣' : currentStep.shortcut}
                        </text>
                      </g>
                    )}

                  {/* ACOUSTIC MEMBRANE VIBRATION WAVES */}
                  {showVibrations && (
                    <TablaVibrationOverlay
                      drum="dayan"
                      activeBol={dayanStrike?.bol || null}
                      strikeTime={dayanStrike?.time || 0}
                    />
                  )}

                  {/* HAND & FINGER GUIDE OVERLAY */}
                  {handMode !== 'off' && (
                    <TablaHandVisualizer
                      drum="dayan"
                      activeBol={dayanStrike?.bol || null}
                      targetBol={currentStep.drum !== 'bayan' ? currentStep.bol : null}
                      displayMode={handMode}
                      handOpacity={handOpacity}
                      isStriking={isDayanRecoil}
                    />
                  )}
                </svg>
              </div>

              {/* Quick Right-Hand Triggers */}
              <div className="grid grid-cols-4 gap-1 w-full pt-1">
                {[
                  { bol: 'na', key: 'J', label: 'Na', sub: '外縁' },
                  { bol: 'tin', key: 'K', label: 'Tin', sub: '中皮' },
                  { bol: 'tun', key: 'L', label: 'Tun', sub: '開放' },
                  { bol: 'te', key: ';', label: 'Te', sub: '消音' },
                ].map((b) => (
                  <button
                    key={b.bol}
                    onClick={() => handleStudentStrike(b.bol as BolKey)}
                    className="py-1.5 px-1 text-xs font-bold bg-amber-950/70 hover:bg-amber-900 text-amber-200 rounded-lg border border-amber-800/70 transition-colors flex flex-col items-center justify-center min-h-[42px]"
                  >
                    <span>{b.label} <span className="font-mono text-[9px] text-amber-400">[{b.key}]</span></span>
                    <span className="text-[9px] text-amber-400/80">{b.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Combo Pads (Dha & Dhin) */}
          <div className="flex items-center justify-center gap-2 pt-1 border-t border-stone-800/60">
            <span className="text-[11px] text-stone-400 font-semibold mr-1">
              両手同時：
            </span>
            <button
              onClick={() => handleStudentStrike('dha')}
              className="px-4 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/80 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Dha [Space]</span>
              <span className="text-[10px] text-purple-400 font-normal">(Na + Ge)</span>
            </button>
            <button
              onClick={() => handleStudentStrike('dhin')}
              className="px-4 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/80 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Dhin [G]</span>
              <span className="text-[10px] text-purple-400 font-normal">(Tin + Ge)</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Interactive Playhead Grid */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>楽曲全体のタイムライン（各拍のボル）:</span>
            <span className="text-[11px] text-stone-500">
              進行: {currentStepIndex + 1} / {activePerformance.steps.length} 拍
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
            {activePerformance.steps.map((step, idx) => {
              const isActive = currentStepIndex === idx && isPlaying;
              const isSam = step.isSam;

              return (
                <div
                  key={idx}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between min-h-[92px] transition-all ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 border-amber-300 ring-4 ring-amber-500/40 scale-105 z-10 font-bold'
                      : isSam
                      ? 'bg-amber-950/40 border-amber-700/60 text-stone-200'
                      : 'bg-stone-950 border-stone-800 text-stone-300'
                  }`}
                >
                  <span className="text-[10px] font-mono opacity-70">#{idx + 1}</span>

                  <span className="text-xs font-bold text-center leading-tight my-1">
                    {step.label}
                  </span>

                  <span
                    className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                      step.drum === 'both'
                        ? 'bg-purple-900/60 text-purple-200'
                        : step.drum === 'bayan'
                        ? 'bg-sky-900/60 text-sky-200'
                        : 'bg-amber-900/60 text-amber-200'
                    }`}
                  >
                    [{step.shortcut}]
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Point Box */}
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-amber-300">鑑賞・習得のポイント:</span>
            <p className="text-stone-300 leading-relaxed">{activePerformance.learningPoint}</p>
          </div>
        </div>

        {/* Play-Along Result Card Modal */}
        {showResultCard && (
          <div className="p-6 rounded-2xl bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500 shadow-2xl flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                <h4 className="text-base font-bold text-stone-100">
                  🎉 演奏結果発表（Play-Along Result）
                </h4>
              </div>
              <button
                onClick={() => setShowResultCard(false)}
                className="text-xs text-stone-400 hover:text-stone-200"
              >
                閉じる
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400">総合ランク</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {accuracyPct >= 90 ? 'S 師範級' : accuracyPct >= 75 ? 'A 上級' : 'B 練習中'}
                </div>
              </div>
              <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400">正確度</span>
                <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                  {accuracyPct}%
                </div>
              </div>
              <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400">最大コンボ</span>
                <div className="text-2xl font-mono font-bold text-sky-400 mt-1">
                  {score.maxCombo} 回
                </div>
              </div>
              <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400">スコア</span>
                <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                  {score.points} 点
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed bg-stone-900 p-3.5 rounded-xl border border-stone-800">
              {accuracyPct >= 85
                ? '素晴らしいリズム感です！インド打楽器特有の「サムへの着地」と両手打法のコンビネーションが的確に身についています。次はテンポを1.2xに上げて挑戦してみましょう！'
                : 'いい調子です！まずはテンポを0.7xや0.8xに落として、ボルのキー配置（Space=Dha, J=Na, G=Dhin）を指に覚え込ませてみましょう。'}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowResultCard(false);
                  handleTogglePlay();
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
              >
                もう一度挑戦する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
