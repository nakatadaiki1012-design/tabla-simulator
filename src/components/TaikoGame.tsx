import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AUTO_PERFORMANCES, AutoPerformance } from '../audio/autoPerformances';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { BolKey } from '../types/tabla';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Flame,
  Award,
  Zap,
  Volume2,
  VolumeX,
  Music2,
  ChevronRight,
  Trophy,
} from 'lucide-react';

interface TaikoNote {
  id: string;
  stepIndex: number;
  bol: BolKey;
  label: string;
  devanagari: string;
  type: 'don' | 'ka' | 'dos' | 'roll'; // don: red (both hands), ka: blue (right hand), dos: yellow (left hand), roll: purple
  typeJa: string;
  keyLabel: string;
  targetTimeMs: number; // Scheduled hit time in ms from song start
  hitState?: 'perfect' | 'good' | 'miss' | null;
}

export const TaikoGame: React.FC = () => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>('teental_theka');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'oni'>('normal');

  // Taiko Score & Gauge
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [perfects, setPerfects] = useState<number>(0); // 良
  const [goods, setGoods] = useState<number>(0); // 可
  const [misses, setMisses] = useState<number>(0); // 不可
  const [soulGauge, setSoulGauge] = useState<number>(0); // 0 to 100%

  // Visual effects
  const [lastJudgement, setLastJudgement] = useState<{
    text: '良' | '可' | '不可';
    type: 'perfect' | 'good' | 'miss';
    bolText?: string;
  } | null>(null);

  const [drumHitPulse, setDrumHitPulse] = useState<'left' | 'right' | 'both' | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);

  const activeTrack =
    AUTO_PERFORMANCES.find((p) => p.id === selectedTrackId) || AUTO_PERFORMANCES[0];

  // Canvas / Animation refs
  const trackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const notesRef = useRef<TaikoNote[]>([]);
  const gameStartTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;

  // Speed scaling based on difficulty
  const getSpeedMultiplier = useCallback(() => {
    switch (difficulty) {
      case 'easy':
        return 0.75;
      case 'normal':
        return 1.0;
      case 'hard':
        return 1.25;
      case 'oni':
        return 1.5;
    }
  }, [difficulty]);

  // Build Taiko Note Sequence for the selected track
  const generateNotes = useCallback(() => {
    const mult = getSpeedMultiplier();
    const notes: TaikoNote[] = [];
    let currentTime = 2000; // 2 seconds lead-in runway

    // Repeat track steps 2 times for a complete Taiko song round
    const rounds = difficulty === 'easy' ? 2 : 3;

    for (let r = 0; r < rounds; r++) {
      activeTrack.steps.forEach((step, idx) => {
        let type: TaikoNote['type'] = 'don';
        let typeJa = 'ドン！(両手)';
        let keyLabel = 'Space';

        if (step.drum === 'both') {
          if (step.bol === 'ti_re_ki_ta') {
            type = 'roll';
            typeJa = '連打！(ティレキタ)';
            keyLabel = 'T';
          } else {
            type = 'don';
            typeJa = 'ドン！(両手合体)';
            keyLabel = step.bol === 'dha' ? 'Space' : 'G';
          }
        } else if (step.drum === 'dayan') {
          type = 'ka';
          typeJa = 'カッ！(右手高音)';
          keyLabel = step.shortcut;
        } else {
          type = 'dos';
          typeJa = 'ドス！(左手低音)';
          keyLabel = step.shortcut;
        }

        notes.push({
          id: `note_${r}_${idx}`,
          stepIndex: idx,
          bol: step.bol,
          label: step.label,
          devanagari: step.devanagari || '',
          type,
          typeJa,
          keyLabel,
          targetTimeMs: currentTime,
          hitState: null,
        });

        currentTime += step.durationMs / mult;
      });
    }

    notesRef.current = notes;
  }, [activeTrack, getSpeedMultiplier, difficulty]);

  // Start / Stop Game
  const handleTogglePlay = () => {
    if (!isPlaying) {
      tablaAudio.ensureContext();
      generateNotes();
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setPerfects(0);
      setGoods(0);
      setMisses(0);
      setSoulGauge(0);
      setLastJudgement(null);
      setShowResultModal(false);
      gameStartTimeRef.current = performance.now();
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    generateNotes();
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfects(0);
    setGoods(0);
    setMisses(0);
    setSoulGauge(0);
    setLastJudgement(null);
    setShowResultModal(false);
  };

  // Student Strike Handler
  const handleStrike = useCallback(
    (struckBol: BolKey) => {
      // Play audio immediately
      tablaAudio.playBol(struckBol);

      // Trigger visual drum bounce pulse
      if (struckBol === 'dha' || struckBol === 'dhin' || struckBol === 'ti_re_ki_ta') {
        setDrumHitPulse('both');
      } else if (struckBol === 'ge' || struckBol === 'meend' || struckBol === 'ke') {
        setDrumHitPulse('left');
      } else {
        setDrumHitPulse('right');
      }
      setTimeout(() => setDrumHitPulse(null), 100);

      if (!isPlayingRef.current) return;

      const elapsed = performance.now() - gameStartTimeRef.current;

      // Find the earliest unhit note within judgment window (±220ms)
      const hitWindow = 220;
      let targetNote: TaikoNote | null = null;
      let minDiff = Infinity;

      for (let note of notesRef.current) {
        if (note.hitState !== null) continue;
        const diff = note.targetTimeMs - elapsed;
        if (Math.abs(diff) <= hitWindow && Math.abs(diff) < minDiff) {
          minDiff = Math.abs(diff);
          targetNote = note;
        }
      }

      if (targetNote) {
        // Check if Bol matches (or compatible category)
        const isMatch =
          targetNote.bol === struckBol ||
          (targetNote.type === 'don' && (struckBol === 'dha' || struckBol === 'dhin')) ||
          (targetNote.type === 'ka' && (struckBol === 'na' || struckBol === 'tin' || struckBol === 'tun')) ||
          (targetNote.type === 'dos' && (struckBol === 'ge' || struckBol === 'meend')) ||
          (targetNote.type === 'roll' && struckBol === 'ti_re_ki_ta');

        if (isMatch) {
          if (minDiff <= 85) {
            // 良 (PERFECT)
            targetNote.hitState = 'perfect';
            setPerfects((p) => p + 1);
            setCombo((c) => {
              const next = c + 1;
              setMaxCombo((mc) => Math.max(mc, next));
              return next;
            });
            setScore((s) => s + 1000 + combo * 50);
            setSoulGauge((g) => Math.min(100, g + 3.2));
            setLastJudgement({ text: '良', type: 'perfect', bolText: targetNote.label });
          } else {
            // 可 (GOOD)
            targetNote.hitState = 'good';
            setGoods((g) => g + 1);
            setCombo((c) => {
              const next = c + 1;
              setMaxCombo((mc) => Math.max(mc, next));
              return next;
            });
            setScore((s) => s + 500);
            setSoulGauge((g) => Math.min(100, g + 1.6));
            setLastJudgement({ text: '可', type: 'good', bolText: targetNote.label });
          }
        } else {
          // Miss (Wrong Bol)
          targetNote.hitState = 'miss';
          setMisses((m) => m + 1);
          setCombo(0);
          setSoulGauge((g) => Math.max(0, g - 4.5));
          setLastJudgement({ text: '不可', type: 'miss', bolText: targetNote.label });
        }
      }
    },
    [combo]
  );

  // Global Keyboard Listener for Taiko controls
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
      } else if (key === 'g') {
        matchedBol = 'dhin';
      } else if (key === 'j') {
        matchedBol = 'na';
      } else if (key === 'k') {
        matchedBol = 'tin';
      } else if (key === 'l') {
        matchedBol = 'tun';
      } else if (key === ';') {
        matchedBol = 'te';
      } else if (key === 'a') {
        matchedBol = 'ge';
      } else if (key === 's') {
        matchedBol = 'meend';
      } else if (key === 'd') {
        matchedBol = 'ke';
      } else if (key === 't') {
        matchedBol = 'ti_re_ki_ta';
      }

      if (matchedBol) {
        handleStrike(matchedBol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStrike]);

  // Main Canvas Render Loop (Taiko Horizontal Scrolling Track)
  useEffect(() => {
    const canvas = trackCanvasRef.current;
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

      // Dark traditional lacquer background
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(0, 0, w, h);

      // Lane bar
      const laneY = h * 0.5;
      const laneHeight = 84;
      const laneTop = laneY - laneHeight / 2;

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, laneTop, w, laneHeight);

      // Lane borders
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, laneTop);
      ctx.lineTo(w, laneTop);
      ctx.moveTo(0, laneTop + laneHeight);
      ctx.lineTo(w, laneTop + laneHeight);
      ctx.stroke();

      // Judgement Target Circle on the Left (判定枠)
      const targetX = 140;
      const targetRadius = 34;

      // Pulsing outer ring
      ctx.beginPath();
      ctx.arc(targetX, laneY, targetRadius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = isPlaying ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner target circle
      ctx.beginPath();
      ctx.arc(targetX, laneY, targetRadius, 0, Math.PI * 2);
      ctx.fillStyle = isPlaying ? '#292524' : '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = '#a8a29e';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('判定枠', targetX, laneY);

      if (isPlaying) {
        const elapsed = performance.now() - gameStartTimeRef.current;
        const scrollSpeed = 0.42; // px per ms

        let allNotesProcessed = true;

        // Render approaching notes
        for (let note of notesRef.current) {
          const diffMs = note.targetTimeMs - elapsed;
          const noteX = targetX + diffMs * scrollSpeed;

          // Auto-mark miss if note has passed beyond window without hit
          if (diffMs < -200 && note.hitState === null) {
            note.hitState = 'miss';
            setMisses((m) => m + 1);
            setCombo(0);
            setSoulGauge((g) => Math.max(0, g - 4.5));
            setLastJudgement({ text: '不可', type: 'miss', bolText: note.label });
          }

          if (note.hitState === null) {
            allNotesProcessed = false;
          }

          // Only draw if within screen view
          if (noteX >= targetX - 40 && noteX <= w + 60 && note.hitState === null) {
            const noteRadius = note.type === 'don' ? 32 : 28;

            // Draw Note Circle
            ctx.beginPath();
            ctx.arc(noteX, laneY, noteRadius, 0, Math.PI * 2);

            if (note.type === 'don') {
              // 🔴 RED (ドン: Dha/Dhin - Both hands)
              ctx.fillStyle = '#dc2626';
              ctx.fill();
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 3.5;
              ctx.stroke();
            } else if (note.type === 'ka') {
              // 🔵 BLUE (カッ: Na/Tin - Right hand)
              ctx.fillStyle = '#0284c7';
              ctx.fill();
              ctx.strokeStyle = '#e0f2fe';
              ctx.lineWidth = 3;
              ctx.stroke();
            } else if (note.type === 'dos') {
              // 🟡 YELLOW (ドス: Ge/Meend - Left hand)
              ctx.fillStyle = '#d97706';
              ctx.fill();
              ctx.strokeStyle = '#fef3c7';
              ctx.lineWidth = 3;
              ctx.stroke();
            } else {
              // 🟣 PURPLE (連打: Tirekita)
              ctx.fillStyle = '#9333ea';
              ctx.fill();
              ctx.strokeStyle = '#f3e8ff';
              ctx.lineWidth = 3;
              ctx.stroke();
            }

            // Note Text (Bol label)
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(note.label, noteX, laneY - 4);

            // Key Prompt below
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = '10px monospace';
            ctx.fillText(`[${note.keyLabel}]`, noteX, laneY + 12);
          }
        }

        // If song finished, show results
        const lastNote = notesRef.current[notesRef.current.length - 1];
        if (lastNote && elapsed > lastNote.targetTimeMs + 1200) {
          setIsPlaying(false);
          setShowResultModal(true);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Taiko Arcade Header Banner */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
              <span className="text-2xl">🥁</span>
              <span>太鼓の達人風・タブラー音ゲー（Taiko Challenge）</span>
            </h2>
            <p className="text-xs text-stone-400">
              右から流れてくる音符が左の「判定枠」に重なった瞬間に、キーボードまたは太鼓を叩こう！
              赤は両手（Space）、青は右高音（J/K）、黄は左低音（A/S）。フルコンボを目指せ！
            </p>
          </div>

          {/* Difficulty Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 self-start md:self-center">
            {[
              { id: 'easy', label: 'かんたん' },
              { id: 'normal', label: 'ふつう' },
              { id: 'hard', label: 'むずかしい' },
              { id: 'oni', label: 'おに (達人)' },
            ].map((diff) => (
              <button
                key={diff.id}
                onClick={() => {
                  setDifficulty(diff.id as typeof difficulty);
                  handleReset();
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  difficulty === diff.id
                    ? diff.id === 'oni'
                      ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                      : 'bg-amber-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>

        {/* Track Selection Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-stone-800">
          {[
            { id: 'teental_theka', name: 'ティンタール (16拍)' },
            { id: 'keherwa_meend', name: 'ケヘルワ舞踊 (8拍)' },
            { id: 'tirakita_kaida', name: '超絶カイダ (高速ソロ)' },
            { id: 'tihai_ending', name: 'ティハイ (3回反復)' },
          ].map((trk) => (
            <button
              key={trk.id}
              onClick={() => {
                setSelectedTrackId(trk.id);
                handleReset();
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                selectedTrackId === trk.id
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {trk.name}
            </button>
          ))}
        </div>
      </div>

      {/* TAIKO GAME ARENA */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border-2 border-amber-600/50 shadow-2xl p-6 flex flex-col gap-5 overflow-hidden">
        {/* Top Status: Soul Gauge & Score */}
        <div className="flex flex-col gap-2">
          {/* Soul Gauge Bar (魂ゲージ) */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>魂ゲージ (Soul Gauge):</span>
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                soulGauge >= 70
                  ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-400/50 font-bold'
                  : 'text-stone-500'
              }`}
            >
              {soulGauge >= 70 ? '★ ノルマCLEAR達成！' : 'クリアライン: 70%'}
            </span>
          </div>

          <div className="w-full h-4 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5 relative">
            {/* Target 70% Marker Line */}
            <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-yellow-400 z-10 opacity-70" />
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                soulGauge >= 70
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400'
                  : 'bg-gradient-to-r from-amber-800 to-amber-600'
              }`}
              style={{ width: `${soulGauge}%` }}
            />
          </div>

          {/* Score & Combo HUD */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-500 uppercase">Score</span>
                <span className="text-2xl font-mono font-bold text-amber-400">{score}</span>
              </div>

              <div className="flex flex-col pl-4 border-l border-stone-800">
                <span className="text-[10px] text-stone-500 uppercase">Combo</span>
                <span
                  className={`text-2xl font-mono font-bold transition-transform ${
                    combo > 0 ? 'text-yellow-300 scale-110' : 'text-stone-500'
                  }`}
                >
                  {combo} <span className="text-xs">連打</span>
                </span>
              </div>
            </div>

            {/* Transport / Start Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white ring-4 ring-amber-500/30'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? '一時停止' : '演奏スタート！'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-2.5 text-stone-400 hover:text-stone-200 bg-stone-850 hover:bg-stone-800 rounded-xl border border-stone-700 transition-colors"
                title="リセット"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TAIKO HORIZONTAL CANVAS TRACK */}
        <div className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-stone-800 bg-stone-950">
          <canvas ref={trackCanvasRef} className="w-full h-full block" />

          {/* Real-time Floating Judgement Popup */}
          {lastJudgement && (
            <div
              className={`absolute top-2 left-28 px-3 py-1 rounded-lg text-xs font-bold shadow-lg animate-fade-in flex items-center gap-1.5 ${
                lastJudgement.type === 'perfect'
                  ? 'bg-yellow-400 text-stone-950 ring-2 ring-yellow-300 scale-110'
                  : lastJudgement.type === 'good'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-800 text-stone-400 border border-stone-700'
              }`}
            >
              <span>{lastJudgement.text}</span>
              <span className="text-[10px] opacity-80">({lastJudgement.bolText})</span>
            </div>
          )}

          {/* Bouncing Mascot Character on Left */}
          <div
            className={`absolute bottom-2 left-3 flex items-center gap-2 transition-transform duration-100 ${
              drumHitPulse ? 'scale-110' : 'scale-100'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-amber-600 border-2 border-yellow-300 flex items-center justify-center text-lg shadow-md">
              🪘
            </div>
          </div>
        </div>

        {/* Note Color Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-yellow-300 inline-block" />
            <span className="font-bold text-red-400">ドン！ [Space / G]</span>
            <span className="text-[11px] text-stone-500">両手合体（Dha / Dhin）</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-600 border border-sky-200 inline-block" />
            <span className="font-bold text-sky-400">カッ！ [J / K / L]</span>
            <span className="text-[11px] text-stone-500">右手高音（Na / Tin）</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-600 border border-yellow-200 inline-block" />
            <span className="font-bold text-amber-400">ドス！ [A / S]</span>
            <span className="text-[11px] text-stone-500">左手低音（Ge / Meend）</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-purple-200 inline-block" />
            <span className="font-bold text-purple-400">連打！ [T]</span>
            <span className="text-[11px] text-stone-500">ティレキタ</span>
          </div>
        </div>

        {/* ON-SCREEN TAIKO DRUM PADS FOR TOUCH & CLICK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Left Drum Pad: Bayan (低音) */}
          <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-300">左手（バーヤーン / 低音）</span>
              <span className="text-[11px] font-mono text-sky-400">キー: A · S · D</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStrike('ge')}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center active:scale-95 ${
                  drumHitPulse === 'left' || drumHitPulse === 'both'
                    ? 'bg-amber-500 text-stone-950 scale-105 shadow-md'
                    : 'bg-sky-900/80 hover:bg-sky-800 text-sky-100 border border-sky-700'
                }`}
              >
                <span>ドス！(Ge)</span>
                <span className="text-[10px] opacity-75 font-mono">[A]</span>
              </button>

              <button
                onClick={() => handleStrike('meend')}
                className="py-3 px-2 rounded-xl text-xs font-bold bg-sky-900/80 hover:bg-sky-800 text-sky-100 border border-sky-700 transition-all flex flex-col items-center justify-center active:scale-95"
              >
                <span>ベンド(Meend)</span>
                <span className="text-[10px] opacity-75 font-mono">[S]</span>
              </button>

              <button
                onClick={() => handleStrike('ke')}
                className="py-3 px-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700 transition-all flex flex-col items-center justify-center active:scale-95"
              >
                <span>消音(Ke)</span>
                <span className="text-[10px] opacity-75 font-mono">[D]</span>
              </button>
            </div>
          </div>

          {/* Right Drum Pad: Dayan (高音) */}
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">右手（ダヤーン / 高音）</span>
              <span className="text-[11px] font-mono text-amber-400">キー: J · K · L</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStrike('na')}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center active:scale-95 ${
                  drumHitPulse === 'right' || drumHitPulse === 'both'
                    ? 'bg-amber-500 text-stone-950 scale-105 shadow-md'
                    : 'bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700'
                }`}
              >
                <span>カッ！(Na)</span>
                <span className="text-[10px] opacity-75 font-mono">[J]</span>
              </button>

              <button
                onClick={() => handleStrike('tin')}
                className="py-3 px-2 rounded-xl text-xs font-bold bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-700 transition-all flex flex-col items-center justify-center active:scale-95"
              >
                <span>歌音(Tin)</span>
                <span className="text-[10px] opacity-75 font-mono">[K]</span>
              </button>

              <button
                onClick={() => handleStrike('tun')}
                className="py-3 px-2 rounded-xl text-xs font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 transition-all flex flex-col items-center justify-center active:scale-95"
              >
                <span>鐘(Tun)</span>
                <span className="text-[10px] opacity-75 font-mono">[L]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Both-Hands Big Hit Button */}
        <div className="flex gap-3">
          <button
            onClick={() => handleStrike('dha')}
            className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${
              drumHitPulse === 'both'
                ? 'bg-yellow-400 text-stone-950 scale-105 shadow-xl ring-4 ring-yellow-300'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg ring-2 ring-red-400/40'
            }`}
          >
            <span>🔴 ドン！ Dha (両手合体)</span>
            <span className="text-xs font-mono opacity-80">[Space]</span>
          </button>

          <button
            onClick={() => handleStrike('ti_re_ki_ta')}
            className="flex-1 py-3.5 px-4 rounded-xl text-sm font-bold bg-purple-700 hover:bg-purple-600 text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>🟣 連打！ Tirekita (高速ロール)</span>
            <span className="text-xs font-mono opacity-80">[T]</span>
          </button>
        </div>

        {/* Result Screen Modal */}
        {showResultModal && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-stone-100">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h3 className="text-lg font-bold">
                    {soulGauge >= 70 ? '🎉 クリア成功だドン！' : '惜しい！もう一歩だドン！'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="text-xs text-stone-400 hover:text-stone-100"
                >
                  閉じる
                </button>
              </div>

              {misses === 0 && (
                <div className="p-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-center text-sm shadow-md animate-bounce">
                  ✨ フルコンボ達成！神技だドン！ ✨
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="text-xs text-stone-400">総合スコア</span>
                  <div className="text-2xl font-mono font-bold text-amber-400 mt-1">{score}</div>
                </div>

                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="text-xs text-stone-400">最大コンボ</span>
                  <div className="text-2xl font-mono font-bold text-yellow-300 mt-1">
                    {maxCombo} 連打
                  </div>
                </div>
              </div>

              {/* Judgement Breakdown */}
              <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                <span className="text-yellow-400 font-bold">良: {perfects}</span>
                <span className="text-emerald-400 font-bold">可: {goods}</span>
                <span className="text-stone-400 font-bold">不可: {misses}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    handleTogglePlay();
                  }}
                  className="w-full py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md transition-colors"
                >
                  もう一度遊ぶ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
