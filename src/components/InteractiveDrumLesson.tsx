import React, { useState, useEffect, useRef, useCallback } from 'react';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { LESSONS_DATA, InteractiveLesson, LessonStep } from '../data/lessonData';
import { BolKey } from '../types/tabla';
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  ChevronRight,
  Flame,
  CheckCircle2,
  Sparkles,
  Award,
  Zap,
  Waves,
  Eye,
  EyeOff,
  Compass,
  ArrowRight,
  Star,
  Check,
} from 'lucide-react';
import { TablaHandVisualizer } from './TablaHandVisualizer';
import { TablaVibrationOverlay } from './TablaVibrationOverlay';

interface Props {
  initialLessonIndex?: number;
  onBolPlayed?: (bol: BolKey) => void;
  onSwitchToFreePlay?: () => void;
}

export const InteractiveDrumLesson: React.FC<Props> = ({
  initialLessonIndex = 0,
  onBolPlayed,
  onSwitchToFreePlay,
}) => {
  // Current active lesson and step
  const [selectedLessonIdx, setSelectedLessonIdx] = useState<number>(initialLessonIndex);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Practice Modes: 'tutorial' (1手ずつ学ぶ), 'loop' (連続リヤーズ特訓), 'demo' (お手本自動再生)
  const [practiceMode, setPracticeMode] = useState<'tutorial' | 'loop' | 'demo'>('tutorial');

  // Interactive feedback states
  const [lastStruckBol, setLastStruckBol] = useState<{
    bol: BolKey;
    success: boolean;
    time: number;
    feedbackText?: string;
  } | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [isLevelCompleted, setIsLevelCompleted] = useState<boolean>(false);
  const [wrongHitHint, setWrongHitHint] = useState<string | null>(null);

  // Hand & Vibration visual toggles
  const [handMode, setHandMode] = useState<'smart' | 'silhouette' | 'off'>('smart');
  const [handOpacity, setHandOpacity] = useState<number>(0.85);
  const [showVibrations, setShowVibrations] = useState<boolean>(true);

  // Independent per-drum strike tracking (strictly isolated so one drum strike NEVER triggers the other!)
  const [bayanStrike, setBayanStrike] = useState<{ bol: BolKey; time: number } | null>(null);
  const [dayanStrike, setDayanStrike] = useState<{ bol: BolKey; time: number } | null>(null);

  // Speed & tempo
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);

  // Timers
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentLesson: InteractiveLesson = LESSONS_DATA[selectedLessonIdx] || LESSONS_DATA[0];
  const activeStep: LessonStep = currentLesson.steps[currentStepIdx] || currentLesson.steps[0];

  // Reset step index when switching lessons
  useEffect(() => {
    setCurrentStepIdx(0);
    setIsLevelCompleted(false);
    setWrongHitHint(null);
    if (practiceMode === 'demo') setPracticeMode('tutorial');
  }, [selectedLessonIdx]);

  // Handle striking a bol
  const handleStrike = useCallback(
    (bol: BolKey, customBend?: number) => {
      // Audio playback
      tablaAudio.playBol(bol, customBend);
      if (onBolPlayed) onBolPlayed(bol);

      // Haptic feedback for touch devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(12);
        } catch (_) {}
      }

      const target = currentLesson.steps[currentStepIdx];
      if (!target) return;

      const now = Date.now();
      const isBayan =
        bol === 'ge' ||
        bol === 'ke' ||
        bol === 'meend' ||
        bol === 'dha' ||
        bol === 'dhin';
      const isDayan =
        bol === 'na' ||
        bol === 'tin' ||
        bol === 'tun' ||
        bol === 'te' ||
        bol === 're' ||
        bol === 'dha' ||
        bol === 'dhin';

      if (isBayan) {
        const bayanBol = bol === 'dha' || bol === 'dhin' ? 'ge' : bol;
        setBayanStrike({ bol: bayanBol, time: now });
      }
      if (isDayan) {
        const dayanBol = bol === 'dha' ? 'na' : bol === 'dhin' ? 'tin' : bol;
        setDayanStrike({ bol: dayanBol, time: now });
      }
      if (bol === 'ti_re_ki_ta') {
        setDayanStrike({ bol: 'te', time: now });
        setTimeout(() => {
          setBayanStrike({ bol: 'ke', time: Date.now() });
        }, 90);
      }

      // Match evaluation
      const isMatch =
        target.bol === bol ||
        (target.bol === 'dha' && (bol === 'dha' || bol === 'na' || bol === 'ge')) ||
        (target.bol === 'dhin' && (bol === 'dhin' || bol === 'tin' || bol === 'ge')) ||
        (target.bol === 'ti_re_ki_ta' && bol === 'ti_re_ki_ta');

      if (isMatch) {
        // Success feedback
        setLastStruckBol({
          bol,
          success: true,
          time: now,
          feedbackText: target.successFeedback,
        });
        setWrongHitHint(null);
        setCurrentStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });

        // Step progression
        if (currentStepIdx + 1 >= currentLesson.steps.length) {
          if (practiceMode === 'loop') {
            setCurrentStepIdx(0);
          } else {
            setIsLevelCompleted(true);
          }
        } else {
          setCurrentStepIdx((s) => s + 1);
        }
      } else {
        // Wrong hit guidance
        setLastStruckBol({
          bol,
          success: false,
          time: now,
        });
        setCurrentStreak(0);

        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        setWrongHitHint(
          `惜しい！いま叩くのは: 【${target.hand} ${target.label}】 [${target.keyHint}キー] です！`
        );
        hintTimeoutRef.current = setTimeout(() => {
          setWrongHitHint(null);
        }, 2600);
      }
    },
    [currentLesson, currentStepIdx, practiceMode, onBolPlayed]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      let matchedBol: BolKey | null = null;
      let bend: number | undefined;

      if (key === 'a') matchedBol = 'ge';
      else if (key === 's') {
        matchedBol = 'meend';
        bend = 1.8;
      } else if (key === 'd') matchedBol = 'ke';
      else if (key === 'j') matchedBol = 'na';
      else if (key === 'k') matchedBol = 'tin';
      else if (key === 'l') matchedBol = 'tun';
      else if (key === ';') matchedBol = 'te';
      else if (key === 'u') matchedBol = 're';
      else if (key === ' ') {
        e.preventDefault();
        matchedBol = 'dha';
      } else if (key === 'g') matchedBol = 'dhin';
      else if (key === 't') matchedBol = 'ti_re_ki_ta';

      if (matchedBol) {
        handleStrike(matchedBol, bend);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStrike]);

  // Master auto-play loop (Teacher Demo)
  useEffect(() => {
    if (practiceMode === 'demo') {
      const stepDurationMs = (60000 / (currentLesson.defaultBpm * speedMultiplier)) * 0.75;
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          const next = (prev + 1) % currentLesson.steps.length;
          const step = currentLesson.steps[next];
          tablaAudio.playBol(step.bol);
          const now = Date.now();
          const isBayan =
            step.bol === 'ge' ||
            step.bol === 'ke' ||
            step.bol === 'meend' ||
            step.bol === 'dha' ||
            step.bol === 'dhin';
          const isDayan =
            step.bol === 'na' ||
            step.bol === 'tin' ||
            step.bol === 'tun' ||
            step.bol === 'te' ||
            step.bol === 're' ||
            step.bol === 'dha' ||
            step.bol === 'dhin';

          if (isBayan) {
            const bayanBol = step.bol === 'dha' || step.bol === 'dhin' ? 'ge' : step.bol;
            setBayanStrike({ bol: bayanBol, time: now });
          }
          if (isDayan) {
            const dayanBol = step.bol === 'dha' ? 'na' : step.bol === 'dhin' ? 'tin' : step.bol;
            setDayanStrike({ bol: dayanBol, time: now });
          }

          setLastStruckBol({
            bol: step.bol,
            success: true,
            time: now,
            feedbackText: step.successFeedback,
          });
          return next;
        });
      }, stepDurationMs);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [practiceMode, currentLesson, speedMultiplier]);

  const handleReset = () => {
    setCurrentStepIdx(0);
    setIsLevelCompleted(false);
    setCurrentStreak(0);
    setWrongHitHint(null);
    setBayanStrike(null);
    setDayanStrike(null);
  };

  const handleNextLesson = () => {
    if (selectedLessonIdx + 1 < LESSONS_DATA.length) {
      setSelectedLessonIdx((prev) => prev + 1);
    }
  };

  // Recoil states
  const isBayanRecoil = !!(bayanStrike && Date.now() - bayanStrike.time < 240);
  const isDayanRecoil = !!(dayanStrike && Date.now() - dayanStrike.time < 240);

  return (
    <div className="flex flex-col gap-4 w-full select-none">
      {/* ============================================================= */}
      {/* 1. TUTORIAL LEVEL PROGRESS BAR (Lv.1 〜 Lv.7)                  */}
      {/* ============================================================= */}
      <div className="p-3 sm:p-4 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col gap-2 shadow-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-stone-200 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>ステップ・チュートリアル</span>
          </span>
          <span className="font-mono text-amber-400 font-bold">
            Level {selectedLessonIdx + 1} / {LESSONS_DATA.length}
          </span>
        </div>

        {/* Level Selector: Swipeable on Mobile, Grid on Larger Screens */}
        <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 snap-x scroll-smooth">
          {LESSONS_DATA.map((lesson, idx) => {
            const isSelected = selectedLessonIdx === idx;
            const isUnlocked = idx <= selectedLessonIdx;
            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedLessonIdx(idx)}
                className={`px-3 py-2 sm:px-2.5 sm:py-2 rounded-xl border text-left transition-all flex flex-col gap-1 shrink-0 snap-start min-w-[130px] sm:min-w-0 ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-400/40 font-bold'
                    : isUnlocked
                    ? 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
                    : 'bg-stone-950/60 text-stone-500 border-stone-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-mono tracking-wider opacity-90">
                    {lesson.levelBadge}
                  </span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </div>
                <span className="text-xs font-semibold leading-tight">{lesson.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. ACTIVE MISSION HUD CARD (お題カード)                       */}
      {/* ============================================================= */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900/95 to-stone-900 border border-amber-900/40 flex flex-col gap-3 shadow-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Header Row: Level Name, Difficulty, Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 relative z-10">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-600/40 text-[11px] font-bold">
                {currentLesson.levelBadge}
              </span>
              <span className="text-xs text-amber-400 font-mono">{currentLesson.difficulty}</span>
              <span className="text-xs text-stone-300">
                目標: <span className="font-mono text-amber-300 font-bold">{currentLesson.targetPhrase}</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-stone-100">
              {currentLesson.title}
            </h3>
          </div>

          {/* Mode Selector Buttons: Evenly spaced and touch-friendly on mobile */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 w-full sm:w-auto overflow-x-auto no-scrollbar justify-between sm:justify-start">
            <button
              onClick={() => {
                setPracticeMode('tutorial');
                handleReset();
              }}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                practiceMode === 'tutorial'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>🌱 1音ずつ</span>
            </button>
            <button
              onClick={() => {
                setPracticeMode('loop');
                handleReset();
              }}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                practiceMode === 'loop'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>🔁 ループ</span>
            </button>
            <button
              onClick={() => {
                setPracticeMode(practiceMode === 'demo' ? 'tutorial' : 'demo');
              }}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                practiceMode === 'demo'
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {practiceMode === 'demo' ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{practiceMode === 'demo' ? '停止' : 'お手本'}</span>
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg shrink-0"
              title="最初に戻す"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Active Mission Banner: Spacious on Mobile */}
        <div className="p-3 sm:p-4 rounded-xl bg-stone-950 border-2 border-amber-500/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 shadow-inner">
          <div className="flex items-start sm:items-center gap-3 w-full">
            {/* Target Keycap Badge */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-lg border-2 border-amber-300">
              {activeStep.keyHint === 'Space' ? '␣' : activeStep.keyHint}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60">
                  ステップ {currentStepIdx + 1} / {currentLesson.steps.length}
                </span>
                <span className="text-[11px] text-stone-400">
                  {activeStep.hand}担当 · {activeStep.finger}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-stone-100 mt-1 leading-snug">
                {activeStep.missionTitle}
              </h4>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>{activeStep.actionGuide}</span>
              </p>
            </div>
          </div>

          {/* Real-time Hit Feedback or Streak Banner */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {lastStruckBol && lastStruckBol.success && lastStruckBol.feedbackText && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 flex items-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{lastStruckBol.feedbackText}</span>
              </span>
            )}
            {currentStreak > 1 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>{currentStreak} 連打！</span>
              </span>
            )}
          </div>
        </div>

        {/* Wrong Hit Warning Toast */}
        {wrongHitHint && (
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-600 text-rose-200 text-xs font-bold animate-bounce flex items-center gap-1.5">
            <span>⚠️</span>
            <span>{wrongHitHint}</span>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 3. THE INTERACTIVE DRUM STAGE (Bayan & Dayan)                  */}
      {/* ============================================================= */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-stone-950 via-stone-900/90 to-stone-950 p-3 sm:p-7 border border-stone-800 shadow-2xl flex flex-col items-center overflow-hidden">
        {/* Stage Lighting */}
        <div className="absolute inset-x-12 bottom-6 h-40 bg-amber-950/15 blur-3xl rounded-full pointer-events-none" />

        {/* Hand Guide Style & Vibration Toggles: Clean Single-Row on Mobile */}
        <div className="flex items-center justify-between w-full max-w-3xl mb-3 px-1 text-xs gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-stone-900/90 p-0.5 rounded-xl border border-stone-800">
              <span className="text-[11px] text-stone-400 font-semibold px-1.5 hidden sm:inline">手の案内:</span>
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

            {handMode !== 'off' && (
              <div className="hidden sm:flex items-center gap-1 bg-stone-900 px-2 py-1 rounded-xl border border-stone-800 text-[10px] text-stone-400">
                <span>濃度:</span>
                {[0.4, 0.75, 1.0].map((op) => (
                  <button
                    key={op}
                    onClick={() => setHandOpacity(op)}
                    className={`px-1.5 py-0.5 rounded font-mono ${
                      handOpacity === op
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {(op * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVibrations(!showVibrations)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1 text-xs ${
                showVibrations
                  ? 'bg-sky-950 text-sky-200 border-sky-600 shadow-sm'
                  : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-sky-400" />
              <span className="sm:hidden">振動: {showVibrations ? 'ON' : 'OFF'}</span>
              <span className="hidden sm:inline">〰️ 膜面振動: {showVibrations ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* The Two Drums Horizontal Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-8 md:gap-12 items-center justify-items-center w-full max-w-4xl relative z-10 my-2">
          {/* --------------------------------------------------------- */}
          {/* LEFT: BAYAN (左手・低音太鼓)                                */}
          {/* --------------------------------------------------------- */}
          <div
            className={`relative w-full max-w-[155px] sm:max-w-[250px] md:max-w-[310px] aspect-square select-none group transition-transform duration-100 ${
              isBayanRecoil ? 'scale-[1.03] -translate-y-1 rotate-[-0.5deg]' : 'scale-100'
            }`}
          >
            {/* Drum Rim Glow */}
            <div className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-red-950 via-sky-950 to-red-950 border-3 border-sky-700/50 shadow-xl -z-10" />

            <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
              <defs>
                <radialGradient id="tutBayanMetal" cx="38%" cy="38%" r="62%">
                  <stop offset="0%" stopColor="#e5c158" />
                  <stop offset="45%" stopColor="#b38a16" />
                  <stop offset="85%" stopColor="#5d4306" />
                  <stop offset="100%" stopColor="#251b03" />
                </radialGradient>
                <radialGradient id="tutBayanSkin" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#faf6ee" />
                  <stop offset="70%" stopColor="#f3e8d2" />
                  <stop offset="100%" stopColor="#d6c39a" />
                </radialGradient>
                <radialGradient id="tutBayanSyahi" cx="46%" cy="44%" r="52%">
                  <stop offset="0%" stopColor="#383838" />
                  <stop offset="50%" stopColor="#1a1a1a" />
                  <stop offset="100%" stopColor="#050505" />
                </radialGradient>
              </defs>

              {/* Shell & Gajra Braid */}
              <circle cx="150" cy="150" r="144" fill="url(#tutBayanMetal)" stroke="#805d0e" strokeWidth="4" />
              <circle cx="150" cy="150" r="134" fill="#cbb387" stroke="#8f6e3c" strokeWidth="5" strokeDasharray="4 2" />

              {/* Maidan Skin (Ge Zone) */}
              <circle
                cx="150"
                cy="150"
                r="126"
                fill="url(#tutBayanSkin)"
                className="cursor-pointer hover:brightness-105 transition-all"
                onClick={() => handleStrike('ge')}
              />

              {/* Off-Center Syahi (Ke Slap Zone) */}
              <g className="cursor-pointer hover:scale-[1.01] transition-transform" onClick={() => handleStrike('ke')}>
                <circle cx="155" cy="125" r="68" fill="url(#tutBayanSyahi)" stroke="#1c1917" strokeWidth="2" />
                <circle cx="155" cy="125" r="54" fill="none" stroke="#3d3d3d" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="155" cy="125" r="36" fill="none" stroke="#2a2a2a" strokeWidth="0.8" />
                <text x="155" y="125" textAnchor="middle" fill="#f5f5f4" fontSize="13" fontWeight="bold">
                  Ke [D]
                </text>
                <text x="155" y="141" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                  消音
                </text>
              </g>

              {/* Meend / Ge Touch Zone */}
              <path
                d="M 95 235 Q 150 255 205 235 Q 185 190 150 190 Q 115 190 95 235 Z"
                fill="rgba(2, 132, 199, 0.2)"
                stroke="rgba(56, 189, 248, 0.7)"
                strokeDasharray="3 3"
                className="cursor-pointer hover:fill-sky-500/30 transition-colors"
                onClick={() => handleStrike('ge')}
              />
              <text x="150" y="220" textAnchor="middle" fill="#0284c7" fontSize="12" fontWeight="bold">
                Ge [A] 低音
              </text>

              {/* ===================================================== */}
              {/* TARGET POINTER BEACON (現在のお題ガイド)              */}
              {/* ===================================================== */}
              {(activeStep.drumTarget === 'bayan' || activeStep.drumTarget === 'both') && (
                <g
                  transform={`translate(${activeStep.coordsBayan?.x || 150}, ${activeStep.coordsBayan?.y || 180})`}
                  className="cursor-pointer"
                  onClick={() => handleStrike(activeStep.bol)}
                >
                  {/* Glowing Radar Rings */}
                  <circle cx="0" cy="0" r="28" fill="none" stroke="#38bdf8" strokeWidth="3" className="animate-ping origin-center" />
                  <circle cx="0" cy="0" r="22" fill="rgba(56, 189, 248, 0.4)" stroke="#0284c7" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="16" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                    {activeStep.keyHint === 'Space' ? '␣' : activeStep.keyHint}
                  </text>

                  {/* Adaptive Pointing Banner - Never Clipped */}
                  {(activeStep.coordsBayan?.y || 180) < 85 ? (
                    <g transform="translate(0, 32)" className="animate-bounce">
                      <rect x="-38" y="-6" width="76" height="18" rx="5" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="0" y="7" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                        👆 ココを叩く！
                      </text>
                    </g>
                  ) : (
                    <g transform="translate(0, -32)" className="animate-bounce">
                      <rect x="-38" y="-12" width="76" height="18" rx="5" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="0" y="1" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                        👇 ココを叩く！
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* VIBRATION WAVES */}
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
                  targetBol={activeStep.drumTarget !== 'dayan' ? activeStep.bol : null}
                  displayMode={handMode}
                  handOpacity={handOpacity}
                  isStriking={isBayanRecoil}
                />
              )}
            </svg>
          </div>

          {/* --------------------------------------------------------- */}
          {/* RIGHT: DAYAN (右手・高音太鼓)                               */}
          {/* --------------------------------------------------------- */}
          <div
            className={`relative w-full max-w-[155px] sm:max-w-[250px] md:max-w-[310px] aspect-square select-none group transition-transform duration-100 ${
              isDayanRecoil ? 'scale-[1.03] -translate-y-1 rotate-[0.5deg]' : 'scale-100'
            }`}
          >
            {/* Drum Rim Glow */}
            <div className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-3 border-amber-700/50 shadow-xl -z-10" />

            <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
              <defs>
                <radialGradient id="tutDayanWood" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#4a1506" />
                  <stop offset="80%" stopColor="#300d04" />
                  <stop offset="100%" stopColor="#1a0602" />
                </radialGradient>
                <radialGradient id="tutDayanLeather" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fdfbf7" />
                  <stop offset="80%" stopColor="#f5edd8" />
                  <stop offset="100%" stopColor="#dfcca3" />
                </radialGradient>
                <radialGradient id="tutDayanSyahi" cx="48%" cy="48%" r="50%">
                  <stop offset="0%" stopColor="#303030" />
                  <stop offset="60%" stopColor="#171717" />
                  <stop offset="100%" stopColor="#050505" />
                </radialGradient>
              </defs>

              {/* Shell & Gajra Braid */}
              <circle cx="150" cy="150" r="144" fill="url(#tutDayanWood)" stroke="#591c0b" strokeWidth="5" />
              <circle cx="150" cy="150" r="133" fill="#cbb387" stroke="#7c5f32" strokeWidth="5" strokeDasharray="4 2" />

              {/* ZONE 1: KINAR (Outer Rim - Na Bell Tone) */}
              <circle
                cx="150"
                cy="150"
                r="124"
                fill="#ebdcb9"
                className="cursor-pointer hover:fill-amber-200 transition-colors"
                onClick={() => handleStrike('na')}
              />
              <circle cx="150" cy="150" r="124" fill="none" stroke="#ba9e6e" strokeWidth="1.5" />
              <text x="150" y="50" textAnchor="middle" fill="#92400e" fontSize="10.5" fontWeight="bold">
                Na [J] 外縁
              </text>

              {/* ZONE 2: MAIDAN (Middle Leather Ring - Tin) */}
              <circle
                cx="150"
                cy="150"
                r="104"
                fill="url(#tutDayanLeather)"
                className="cursor-pointer hover:fill-amber-100 transition-colors"
                onClick={() => handleStrike('tin')}
              />
              <circle cx="150" cy="150" r="104" fill="none" stroke="#cdb482" strokeWidth="1" strokeDasharray="2 2" />
              <text x="150" y="74" textAnchor="middle" fill="#78350f" fontSize="10" fontWeight="600">
                Tin [K] 中皮
              </text>

              {/* ZONE 3: SYAHI (Center Black Circle - Tun / Ti / Re) */}
              <g
                className="cursor-pointer hover:scale-[1.015] transition-transform"
                onClick={() => handleStrike('tun')}
              >
                <circle cx="150" cy="150" r="58" fill="url(#tutDayanSyahi)" stroke="#1c1917" strokeWidth="2.5" />
                <circle cx="150" cy="150" r="44" fill="none" stroke="#3d3d3d" strokeWidth="1" strokeDasharray="3 3" />
                <text x="150" y="145" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="bold">
                  Tun [L]
                </text>
                <text x="150" y="160" textAnchor="middle" fill="#d4d4d4" fontSize="9.5">
                  Ti [;] / Re [U]
                </text>
              </g>

              {/* ===================================================== */}
              {/* TARGET POINTER BEACON (現在のお題ガイド)              */}
              {/* ===================================================== */}
              {(activeStep.drumTarget === 'dayan' || activeStep.drumTarget === 'both') && (
                <g
                  transform={`translate(${activeStep.coordsDayan?.x || 150}, ${activeStep.coordsDayan?.y || 42})`}
                  className="cursor-pointer"
                  onClick={() => handleStrike(activeStep.bol)}
                >
                  {/* Glowing Radar Rings */}
                  <circle cx="0" cy="0" r="28" fill="none" stroke="#f59e0b" strokeWidth="3" className="animate-ping origin-center" />
                  <circle cx="0" cy="0" r="22" fill="rgba(245, 158, 11, 0.4)" stroke="#d97706" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="16" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                    {activeStep.keyHint === 'Space' ? '␣' : activeStep.keyHint}
                  </text>

                  {/* Adaptive Pointing Banner - Never Clipped */}
                  {(activeStep.coordsDayan?.y || 42) < 85 ? (
                    <g transform="translate(0, 32)" className="animate-bounce">
                      <rect x="-38" y="-6" width="76" height="18" rx="5" fill="#b45309" stroke="#fbbf24" strokeWidth="1.2" />
                      <text x="0" y="7" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                        👆 ココを叩く！
                      </text>
                    </g>
                  ) : (
                    <g transform="translate(0, -32)" className="animate-bounce">
                      <rect x="-38" y="-12" width="76" height="18" rx="5" fill="#b45309" stroke="#fbbf24" strokeWidth="1.2" />
                      <text x="0" y="1" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                        👇 ココを叩く！
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* VIBRATION WAVES */}
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
                  targetBol={activeStep.drumTarget !== 'bayan' ? activeStep.bol : null}
                  displayMode={handMode}
                  handOpacity={handOpacity}
                  isStriking={isDayanRecoil}
                />
              )}
            </svg>
          </div>
        </div>

        {/* MOBILE & TOUCH FRIENDLY CURRENT STRIKE ACTION PAD */}
        <div className="w-full max-w-md mt-3 flex flex-col items-center gap-1.5 z-20 px-1">
          <button
            onClick={() => handleStrike(activeStep.bol)}
            className="w-full py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base shadow-lg shadow-amber-900/30 border border-amber-300 active:scale-[0.98] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-950 text-amber-300 font-mono text-sm flex items-center justify-center font-bold shadow-inner">
                {activeStep.keyHint === 'Space' ? '␣' : activeStep.keyHint}
              </span>
              <span className="text-left leading-tight">
                <span className="block text-[10px] sm:text-[11px] font-semibold text-stone-900/80">
                  {activeStep.hand}担当 · {activeStep.circleZoneLabel}
                </span>
                <span className="text-sm sm:text-base font-black text-stone-950">
                  タップで打つ: 【{activeStep.label}】
                </span>
              </span>
            </div>
            <span className="text-xs font-bold bg-stone-950/20 px-2 py-1 rounded text-stone-950 flex items-center gap-1 shrink-0">
              <span>叩く!</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>

        {/* ============================================================= */}
        {/* STEP PROGRESSION FLOW BAR (打順の流れ)                        */}
        {/* ============================================================= */}
        <div className="w-full max-w-3xl mt-3 sm:mt-4 pt-3 border-t border-stone-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span className="font-bold text-[11px] sm:text-xs">打順（タップで直接演奏）</span>
            <span className="font-mono text-amber-400 font-bold text-[11px] sm:text-xs">
              進捗: {currentStepIdx + 1} / {currentLesson.steps.length} 打
            </span>
          </div>

          {/* Swipeable on Mobile, Wrapped on Desktop */}
          <div className="flex sm:flex-wrap items-center sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 px-1">
            {currentLesson.steps.map((step, idx) => {
              const isCurrent = currentStepIdx === idx && !isLevelCompleted;
              const isPast = isLevelCompleted || idx < currentStepIdx;

              return (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => {
                      setCurrentStepIdx(idx);
                      handleStrike(step.bol);
                    }}
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow ${
                      isCurrent
                        ? 'bg-amber-600 text-white scale-105 ring-2 ring-amber-400/60 shadow-lg'
                        : isPast
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-75">
                      {isPast ? '✓' : `#${step.stepNumber}`}
                    </span>
                    <span>{step.label}</span>
                    <span className="text-[10px] font-mono opacity-80">[{step.keyHint}]</span>
                  </button>
                  {idx < currentLesson.steps.length - 1 && (
                    <span className="text-stone-600 text-xs select-none shrink-0">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ============================================================= */}
        {/* LEVEL CLEAR CELEBRATION MODAL BANNER                          */}
        {/* ============================================================= */}
        {isLevelCompleted && (
          <div className="w-full max-w-3xl mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-2 border-emerald-500 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
                🎉
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs font-bold text-emerald-300 ml-1">3つ星クリア！</span>
                </div>
                <h4 className="text-base font-bold text-stone-100 mt-0.5">
                  {currentLesson.title} をマスターしました！
                </h4>
                <p className="text-xs text-stone-300">
                  叩く位置と指使いがスムーズに身につきました。次のレベルへ挑戦しましょう！
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleReset}
                className="px-3.5 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 transition-colors"
              >
                もう一度叩く
              </button>
              {selectedLessonIdx + 1 < LESSONS_DATA.length && (
                <button
                  onClick={handleNextLesson}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                >
                  <span>次のレベルへ進む</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 4. SPEED & NAVIGATION FOOTER                                  */}
      {/* ============================================================= */}
      <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Speed presets for loop practice */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-semibold">練習テンポ:</span>
          {[0.5, 0.75, 1.0, 1.25, 1.5].map((val) => (
            <button
              key={val}
              onClick={() => setSpeedMultiplier(val)}
              className={`px-2 py-1 rounded font-mono font-bold transition-colors ${
                speedMultiplier === val
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-950 text-stone-400 hover:text-stone-200'
              }`}
            >
              {val}x
            </button>
          ))}
        </div>

        {/* Free Play CTA */}
        {onSwitchToFreePlay && (
          <button
            onClick={onSwitchToFreePlay}
            className="px-3.5 py-1.5 font-bold bg-stone-950 hover:bg-stone-800 text-amber-300 border border-amber-600/50 rounded-xl shadow transition-colors flex items-center gap-1.5 ml-auto"
          >
            <span>🪘 自由演奏シミュレーターへ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
