import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BolKey, BolInfo, EngineMode, SoundBankPreset } from '../types/tabla';
import { BOLS_LIST } from '../data/tablaData';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { InteractiveDrumLesson } from './InteractiveDrumLesson';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Music2,
  Hammer,
  HelpCircle,
  Hand,
  Layers,
  ChevronRight,
  Headphones,
  Sliders,
  Zap,
  GraduationCap,
  Waves,
  Eye,
  EyeOff,
  Play,
  Pause,
  Clock,
  Radio,
} from 'lucide-react';
import { TablaHandVisualizer } from './TablaHandVisualizer';
import { TablaVibrationOverlay } from './TablaVibrationOverlay';

interface Props {
  onBolPlayed?: (bol: BolKey, info: BolInfo) => void;
  activeBolKey?: BolKey | null;
}

const SA_NOTES = [
  { name: 'C', freq: 261.63 },
  { name: 'C#', freq: 277.18 },
  { name: 'D (基本標準)', freq: 293.66 },
  { name: 'D#', freq: 311.13 },
  { name: 'E', freq: 329.63 },
];

export const TablaVisualizer: React.FC<Props> = ({ onBolPlayed, activeBolKey }) => {
  const [viewMode, setViewMode] = useState<'free' | 'lesson'>('free');
  const [lastPlayedBol, setLastPlayedBol] = useState<BolInfo>(
    BOLS_LIST.find((b) => b.id === 'dha') || BOLS_LIST[0]
  );
  const [selectedSa, setSelectedSa] = useState<number>(293.66);
  const [tensionLevel, setTensionLevel] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTanpuraActive, setIsTanpuraActive] = useState<boolean>(false);
  const [meendBendStyle, setMeendBendStyle] = useState<'slide' | 'wave' | 'jhatka'>('slide');
  const [engineMode, setEngineMode] = useState<EngineMode>(tablaAudio.getEngineMode());
  const [soundPreset, setSoundPreset] = useState<SoundBankPreset>(tablaAudio.getSoundBankPreset());

  // Hand & Vibration Features
  const [handMode, setHandMode] = useState<'smart' | 'silhouette' | 'off'>('smart');
  const [handOpacity, setHandOpacity] = useState<number>(0.72);
  const [showVibrations, setShowVibrations] = useState<boolean>(true);

  // Independent per-drum strike tracking (prevents vibrations from leaking across drums!)
  const [bayanStrike, setBayanStrike] = useState<{ bol: BolKey; time: number } | null>(null);
  const [dayanStrike, setDayanStrike] = useState<{ bol: BolKey; time: number } | null>(null);

  const isBayanRecoil = !!(bayanStrike && Date.now() - bayanStrike.time < 240);
  const isDayanRecoil = !!(dayanStrike && Date.now() - dayanStrike.time < 240);

  useEffect(() => {
    setEngineMode(tablaAudio.getEngineMode());
    setSoundPreset(tablaAudio.getSoundBankPreset());
    tablaAudio.onSampleStatusChange(() => {
      setEngineMode(tablaAudio.getEngineMode());
      setSoundPreset(tablaAudio.getSoundBankPreset());
    });
  }, []);

  // Metronome / Teen Taal Practice Companion
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(80);
  const [metronomeBeat, setMetronomeBeat] = useState<number>(1); // 1..16
  const [metronomeSoundMode, setMetronomeSoundMode] = useState<'tali' | 'tick'>('tali');
  const metronomeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Metronome tick loop
  useEffect(() => {
    if (!isMetronomeActive) {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
      setMetronomeBeat(1);
      return;
    }

    const intervalMs = (60 / metronomeBpm) * 1000;
    metronomeTimerRef.current = setInterval(() => {
      setMetronomeBeat((prev) => {
        const next = prev >= 16 ? 1 : prev + 1;
        try {
          const isSam = next === 1;
          const isTali = next === 5 || next === 13;
          const isAccent = isSam || isTali;
          tablaAudio.playMetronomeTick(isAccent, metronomeSoundMode);
        } catch (_) {}
        return next;
      });
    }, intervalMs);

    return () => {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    };
  }, [isMetronomeActive, metronomeBpm, metronomeSoundMode]);

  // Haptic feedback helper for smartphones
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(10);
      } catch (_) {}
    }
  }, []);

  const handlePlayBol = useCallback(
    (bolId: BolKey, customBend?: number) => {
      triggerHaptic();
      if (bolId === 'meend') {
        tablaAudio.playMeend(customBend || 1.6, 1.0, meendBendStyle);
      } else {
        tablaAudio.playBol(bolId, customBend);
      }

      const info = BOLS_LIST.find((b) => b.id === bolId);
      if (info) {
        setLastPlayedBol(info);
        if (onBolPlayed) {
          onBolPlayed(bolId, info);
        }
      }

      const now = Date.now();
      const isBayan = bolId === 'ge' || bolId === 'ke' || bolId === 'meend';
      const isDayan = bolId === 'na' || bolId === 'tin' || bolId === 'tun' || bolId === 'te' || bolId === 're';

      if (isBayan) {
        setBayanStrike({ bol: bolId, time: now });
      } else if (isDayan) {
        setDayanStrike({ bol: bolId, time: now });
      } else if (bolId === 'dha') {
        setBayanStrike({ bol: 'ge', time: now });
        setDayanStrike({ bol: 'na', time: now });
      } else if (bolId === 'dhin') {
        setBayanStrike({ bol: 'ge', time: now });
        setDayanStrike({ bol: 'tin', time: now });
      } else if (bolId === 'ti_re_ki_ta') {
        setDayanStrike({ bol: 'te', time: now });
        setTimeout(() => {
          setBayanStrike({ bol: 'ke', time: Date.now() });
        }, 80);
      }
    },
    [onBolPlayed, meendBendStyle]
  );

  // Sync external activeBolKey from Taal player or auto-play
  useEffect(() => {
    if (activeBolKey) {
      handlePlayBol(activeBolKey);
    }
  }, [activeBolKey, handlePlayBol]);

  // Keyboard shortcut listener
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
        handlePlayBol(matchedBol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayBol]);

  const handleSaChange = (freq: number) => {
    setSelectedSa(freq);
    tablaAudio.setRootNote(freq);
  };

  const handleTuneHammer = (delta: number) => {
    const next = Math.max(0.85, Math.min(1.25, tensionLevel + delta));
    setTensionLevel(next);
    tablaAudio.setSkinTension(next);
    handlePlayBol('na');
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    tablaAudio.setVolume(v);
    if (isMuted && v > 0) {
      setIsMuted(false);
      tablaAudio.setMute(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    tablaAudio.setMute(next);
  };

  const handleToggleTanpura = () => {
    const active = tablaAudio.toggleTanpura();
    setIsTanpuraActive(active);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      {/* Sleek Compact Sound Engine & Drone Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs">
        {/* Simulator Mode Switcher: Free Play vs Guided Drum Lesson */}
        <div className="flex items-center gap-1 p-0.5 bg-stone-950 rounded-lg border border-stone-800">
          <button
            onClick={() => setViewMode('free')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'free'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>🪘 自由演奏</span>
          </button>
          <button
            onClick={() => setViewMode('lesson')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'lesson'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md ring-1 ring-amber-300'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="sm:hidden">🎓 レッスン</span>
            <span className="hidden sm:inline">🎓 太鼓レッスン・打順表示</span>
          </button>
        </div>

        {viewMode === 'free' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-stone-400 text-[11px] shrink-0 hidden sm:inline">音源：</span>
            <div className="flex items-center gap-0.5 p-0.5 bg-stone-950 rounded-lg border border-stone-800">
              <button
                onClick={() => {
                  tablaAudio.setEngineMode('sampler');
                  setEngineMode('sampler');
                  handlePlayBol('dha');
                }}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                  engineMode === 'sampler'
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Headphones className="w-3 h-3" />
                <span className="sm:hidden">実音</span>
                <span className="hidden sm:inline">実音サンプリング 🎙️</span>
              </button>
              <button
                onClick={() => {
                  tablaAudio.setEngineMode('hybrid');
                  setEngineMode('hybrid');
                  handlePlayBol('dha');
                }}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-black flex items-center gap-1 transition-all ${
                  engineMode === 'hybrid'
                    ? 'bg-gradient-to-r from-amber-500 to-sky-500 text-stone-950 shadow-sm ring-1 ring-sky-400/50'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>ハイブリッド</span>
              </button>
              <button
                onClick={() => {
                  tablaAudio.setEngineMode('physical');
                  setEngineMode('physical');
                  handlePlayBol('dha');
                }}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                  engineMode === 'physical'
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span className="sm:hidden">物理</span>
                <span className="hidden sm:inline">物理モデリング 🎛️</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {viewMode === 'free' && engineMode !== 'physical' && (
            <div className="hidden sm:flex items-center gap-1">
              {[
                { id: 'freesound', label: '⭐ 提供実音' },
                { id: 'benares', label: 'ベナレス' },
                { id: 'delhi', label: 'デリー' },
                { id: 'bronze', label: '青銅' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    tablaAudio.setSoundBankPreset(p.id as SoundBankPreset);
                    setSoundPreset(p.id as SoundBankPreset);
                    handlePlayBol('dha');
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                    soundPreset === p.id
                      ? 'bg-amber-950 text-amber-200 border-amber-600 shadow-sm'
                      : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick Tanpura Toggle */}
          <button
            onClick={handleToggleTanpura}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${
              isTanpuraActive
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <span>🪕 タンピューラ</span>
            <span className="text-[10px] opacity-75">{isTanpuraActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* If Lesson mode is selected, render the dedicated pinpoint drum circle overlay lesson */}
      {viewMode === 'lesson' ? (
        <InteractiveDrumLesson
          onSwitchToFreePlay={() => setViewMode('free')}
          onBolPlayed={(bol) => handlePlayBol(bol)}
        />
      ) : (
        <>
          {/* Main Interactive 3D Drum Stage - Always Side-by-Side Horizontal */}
          <div className="relative w-full rounded-2xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 p-4 sm:p-6 md:p-8 border border-stone-800 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Traditional Carpet Backdrop */}
        <div className="absolute inset-x-8 bottom-4 h-36 bg-amber-950/20 blur-3xl rounded-full pointer-events-none" />

        {/* Hand Guide Style & Vibration Display Toggles: Responsive on Mobile */}
        <div className="flex items-center justify-between w-full max-w-3xl mb-3 px-1 text-xs relative z-20 gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-stone-950 p-0.5 rounded-xl border border-stone-800">
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
              <div className="hidden sm:flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 text-[10px] text-stone-400">
                <span>濃度:</span>
                {[0.4, 0.72, 1.0].map((op) => (
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
              className={`px-2 sm:px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 text-xs ${
                showVibrations
                  ? 'bg-sky-950 text-sky-200 border-sky-600 shadow-sm'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="sm:hidden">振動: {showVibrations ? 'ON' : 'OFF'}</span>
              <span className="hidden sm:inline">〰️ 膜面振動: {showVibrations ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* The Two Drums - Side-by-Side on ALL screens */}
        <div className="grid grid-cols-2 gap-2 sm:gap-6 md:gap-8 items-start justify-items-center relative z-20 my-auto w-full">
          {/* LEFT: BAYAN (左手・低音太鼓) */}
          <div className="flex flex-col items-center gap-2.5 w-full max-w-sm">
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold bg-sky-900/80 text-sky-200 px-1.5 py-0.5 rounded">
                  左手
                </span>
                <span className="text-xs sm:text-sm font-bold text-sky-400 flex items-center gap-1">
                  <span>बायाँ</span> バーヤーン
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">
                [A · S · D]
              </span>
            </div>

            {/* SVG Drum - Responsive Aspect Ratio */}
            <div
              className={`relative w-full max-w-[155px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[290px] aspect-square group select-none transition-transform duration-100 ${
                isBayanRecoil ? 'scale-[1.03] -translate-y-1 rotate-[-0.5deg]' : 'scale-100 translate-y-0 rotate-0'
              }`}
            >
              <div className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-red-950 via-sky-950 to-red-950 border-3 border-sky-700/50 shadow-xl -z-10" />

              <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
                <defs>
                  <radialGradient id="brassGradientV2" cx="38%" cy="38%" r="62%">
                    <stop offset="0%" stopColor="#e5c158" />
                    <stop offset="45%" stopColor="#b38a16" />
                    <stop offset="85%" stopColor="#5d4306" />
                    <stop offset="100%" stopColor="#251b03" />
                  </radialGradient>
                  <radialGradient id="leatherBayanV2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#faf6ee" />
                    <stop offset="70%" stopColor="#f3e8d2" />
                    <stop offset="100%" stopColor="#d6c39a" />
                  </radialGradient>
                  <radialGradient id="syahiBayanV2" cx="46%" cy="44%" r="52%">
                    <stop offset="0%" stopColor="#383838" />
                    <stop offset="50%" stopColor="#1a1a1a" />
                    <stop offset="100%" stopColor="#050505" />
                  </radialGradient>
                </defs>

                {/* Polished Bell Metal Rim */}
                <circle cx="150" cy="150" r="144" fill="url(#brassGradientV2)" stroke="#805d0e" strokeWidth="4" />

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
                  fill="url(#leatherBayanV2)"
                  className="cursor-pointer transition-all hover:brightness-105 active:scale-[0.99]"
                  onClick={() => handlePlayBol('ge')}
                />

                {/* Off-Center Syahi (Ke Slap Zone) */}
                <g
                  className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  onClick={() => handlePlayBol('ke')}
                >
                  <circle
                    cx="155"
                    cy="125"
                    r="68"
                    fill="url(#syahiBayanV2)"
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
                  onClick={() => handlePlayBol('ge')}
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
                    displayMode={handMode}
                    handOpacity={handOpacity}
                    isStriking={isBayanRecoil}
                  />
                )}
              </svg>
            </div>

            {/* Bayan Controls & Meend Expressions */}
            <div className="w-full bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> ミィーンド奏法（手首スライドの表情）
                </span>
                <span className="text-[11px] text-stone-400">[Sキー]</span>
              </div>

              {/* 3 Authentic Meend Style Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { style: 'slide', label: '押し上げ', desc: '通常スライド' },
                  { style: 'wave', label: '波 (Lahar)', desc: 'うねり戻り' },
                  { style: 'jhatka', label: '跳ね (Snap)', desc: '鋭いベンド' },
                ].map((item) => (
                  <button
                    key={item.style}
                    onClick={() => {
                      setMeendBendStyle(item.style as 'slide' | 'wave' | 'jhatka');
                      handlePlayBol('meend');
                    }}
                    className={`p-2 rounded-lg border text-left transition-colors flex flex-col items-center text-center ${
                      meendBendStyle === item.style
                        ? 'bg-sky-950 text-sky-200 border-sky-700 shadow-sm'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200 hover:bg-stone-850'
                    }`}
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-stone-500">{item.desc}</span>
                  </button>
                ))}
              </div>

              {/* Quick Left-Hand Triggers */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => handlePlayBol('ge')}
                  className="py-2 px-1 text-xs font-bold bg-sky-950 hover:bg-sky-900 text-sky-200 rounded-lg border border-sky-800 transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Ge 低音</span>
                  <span className="text-[10px] text-sky-400 font-mono">[A]</span>
                </button>
                <button
                  onClick={() => handlePlayBol('meend')}
                  className="py-2 px-1 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Meend</span>
                  <span className="text-[10px] opacity-80 font-mono">[S]</span>
                </button>
                <button
                  onClick={() => handlePlayBol('ke')}
                  className="py-2 px-1 text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Ke 消音</span>
                  <span className="text-[10px] text-stone-400 font-mono">[D]</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: DAYAN (右手・高音太鼓) */}
          <div className="flex flex-col items-center gap-2.5 w-full max-w-sm">
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold bg-amber-900/80 text-amber-200 px-1.5 py-0.5 rounded">
                  右手
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1">
                  <span>दाहिना</span> ダヤーン
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                [J · K · L · ;]
              </span>
            </div>

            {/* SVG Drum */}
            <div
              className={`relative w-full max-w-[155px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[290px] aspect-square group select-none transition-transform duration-100 ${
                isDayanRecoil ? 'scale-[1.03] -translate-y-1 rotate-[0.5deg]' : 'scale-100 translate-y-0 rotate-0'
              }`}
            >
              <div className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-3 border-amber-700/50 shadow-xl -z-10" />

              <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
                <defs>
                  <radialGradient id="woodGradientV2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4a1506" />
                    <stop offset="80%" stopColor="#300d04" />
                    <stop offset="100%" stopColor="#1a0602" />
                  </radialGradient>
                  <radialGradient id="leatherDayanV2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fdfbf7" />
                    <stop offset="80%" stopColor="#f5edd8" />
                    <stop offset="100%" stopColor="#dfcca3" />
                  </radialGradient>
                  <radialGradient id="syahiDayanV2" cx="48%" cy="48%" r="50%">
                    <stop offset="0%" stopColor="#303030" />
                    <stop offset="60%" stopColor="#171717" />
                    <stop offset="100%" stopColor="#050505" />
                  </radialGradient>
                </defs>

                {/* Carved Rosewood Shell Rim */}
                <circle cx="150" cy="150" r="144" fill="url(#woodGradientV2)" stroke="#591c0b" strokeWidth="5" />

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
                  onClick={() => handlePlayBol('na')}
                />
                <circle cx="150" cy="150" r="124" fill="none" stroke="#ba9e6e" strokeWidth="1.5" />

                {/* MAIDAN (Middle Ring - TIN Strike) */}
                <circle
                  cx="150"
                  cy="150"
                  r="104"
                  fill="url(#leatherDayanV2)"
                  className="cursor-pointer hover:fill-amber-50 active:fill-amber-100 transition-colors"
                  onClick={() => handlePlayBol('tin')}
                />
                <circle cx="150" cy="150" r="104" fill="none" stroke="#cdb482" strokeWidth="1" strokeDasharray="2 2" />

                {/* SYAHI (Center Black Circle - TUN Open Bell / TE Damped Slap) */}
                <g
                  className="cursor-pointer transition-transform hover:scale-[1.015] active:scale-[0.985]"
                  onClick={(e) => {
                    if (e.shiftKey) {
                      handlePlayBol('te');
                    } else {
                      handlePlayBol('tun');
                    }
                  }}
                >
                  <circle
                    cx="150"
                    cy="150"
                    r="58"
                    fill="url(#syahiDayanV2)"
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
                    displayMode={handMode}
                    handOpacity={handOpacity}
                    isStriking={isDayanRecoil}
                  />
                )}
              </svg>
            </div>

            {/* Quick Right-Hand Triggers */}
            <div className="w-full bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400">右手の叩き分け（4大打法）</span>
                <span className="text-[11px] text-stone-500 hidden sm:inline">キー操作対応</span>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                <button
                  onClick={() => handlePlayBol('na')}
                  className="py-2 px-1 text-xs font-bold bg-amber-950/70 hover:bg-amber-900 text-amber-200 rounded-lg border border-amber-800/70 transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Na</span>
                  <span className="text-[10px] text-amber-400/80 font-mono">[J]</span>
                </button>
                <button
                  onClick={() => handlePlayBol('tin')}
                  className="py-2 px-1 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-stone-200 rounded-lg border border-stone-700 transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Tin</span>
                  <span className="text-[10px] text-stone-400 font-mono">[K]</span>
                </button>
                <button
                  onClick={() => handlePlayBol('tun')}
                  className="py-2 px-1 text-xs font-bold bg-purple-950/70 hover:bg-purple-900 text-purple-200 rounded-lg border border-purple-800/70 transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Tun</span>
                  <span className="text-[10px] text-purple-400/80 font-mono">[L]</span>
                </button>
                <button
                  onClick={() => handlePlayBol('te')}
                  className="py-2 px-1 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-lg border border-stone-700 transition-colors flex flex-col items-center justify-center min-h-[44px]"
                >
                  <span>Te</span>
                  <span className="text-[10px] text-stone-400 font-mono">[;]</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COMBINATION BOLS (両手合体打法: Dha & Dhin) */}
        <div className="relative z-20 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-stone-300">両手合体技 (Both Hands):</span>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              左手の低音と右手の高音を同時に叩く！
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            <button
              onClick={() => handlePlayBol('dha')}
              className="py-2 px-2.5 sm:px-4 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-md ring-1 ring-amber-400/40 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px]"
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Dha</span>
              </span>
              <span className="text-[10px] opacity-80 font-mono">[Space]</span>
            </button>
            <button
              onClick={() => handlePlayBol('dhin')}
              className="py-2 px-2.5 sm:px-4 text-xs font-bold bg-stone-850 hover:bg-stone-800 text-amber-200 border border-stone-700 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px]"
            >
              <span>Dhin</span>
              <span className="text-[10px] text-stone-400 font-mono">[G]</span>
            </button>
            <button
              onClick={() => handlePlayBol('ti_re_ki_ta')}
              className="py-2 px-2.5 sm:px-4 text-xs font-semibold bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-700 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px]"
            >
              <span>Tirekita</span>
              <span className="text-[10px] text-stone-400 font-mono">[T]</span>
            </button>
          </div>
        </div>

        {/* PRACTICE METRONOME & 16-BEAT TEEN TAAL COMPANION */}
        <div className="relative z-20 mt-4 p-3.5 sm:p-4 rounded-xl bg-stone-950/90 border border-stone-800 flex flex-col gap-3 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-stone-200">
                練習用メトロノーム / ターラ・ビート (Teen Taal 16拍)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMetronomeSoundMode(metronomeSoundMode === 'tali' ? 'tick' : 'tali')}
                className="px-2 py-1 text-[11px] rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                title="音色の切り替え"
              >
                音色: {metronomeSoundMode === 'tali' ? '👏 手拍子 (Tali)' : '⏱️ クリック (Tick)'}
              </button>

              <button
                onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  isMetronomeActive
                    ? 'bg-amber-600 text-white shadow-amber-600/30'
                    : 'bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                {isMetronomeActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>停止</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>ビート開始</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tempo Slider & Beat Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-stone-400 font-semibold shrink-0">テンポ:</span>
              <input
                type="range"
                min="48"
                max="180"
                step="2"
                value={metronomeBpm}
                onChange={(e) => setMetronomeBpm(parseInt(e.target.value))}
                className="w-28 sm:w-36 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-xs font-mono font-bold text-amber-400 w-16">
                {metronomeBpm} BPM
              </span>
            </div>

            {/* 16-Beat Visual Matra Grid (4 Vibhags) */}
            <div className="grid grid-cols-16 gap-1 w-full sm:w-auto max-w-md">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((matra) => {
                const isActive = isMetronomeActive && metronomeBeat === matra;
                const isSam = matra === 1;
                const isKhali = matra === 9;
                const isTali = matra === 5 || matra === 13;

                return (
                  <div
                    key={matra}
                    className={`h-7 rounded flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all ${
                      isActive
                        ? isSam
                          ? 'bg-amber-500 text-stone-950 scale-110 shadow-lg ring-2 ring-amber-300 z-10'
                          : isKhali
                          ? 'bg-sky-400 text-stone-950 scale-110 shadow-md ring-2 ring-sky-300 z-10'
                          : 'bg-amber-400 text-stone-950 scale-105 shadow z-10'
                        : isSam
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                        : isKhali
                        ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                        : isTali
                        ? 'bg-stone-850 text-stone-300 border border-stone-700'
                        : 'bg-stone-900 text-stone-500'
                    }`}
                    title={`第${matra}拍 ${isSam ? '(Sam)' : isKhali ? '(Khali)' : isTali ? '(Tali)' : ''}`}
                  >
                    <span>{matra}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Hand Placement & Theory Explanation Card */}
      {lastPlayedBol && (
        <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-800/80 flex flex-col items-center justify-center shrink-0">
              <span className="text-xl font-bold text-amber-400 leading-tight">
                {lastPlayedBol.name}
              </span>
              <span className="text-xs text-stone-400">{lastPlayedBol.devanagari}</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-stone-400">打点:</span>
                <span className="font-semibold text-stone-200">{lastPlayedBol.zone}</span>
                <span className="text-stone-600">·</span>
                <span className="text-stone-400">指使い:</span>
                <span className="font-semibold text-amber-300">{lastPlayedBol.finger}</span>
              </div>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed max-w-2xl">
                {lastPlayedBol.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-stone-500">キーボード</span>
              <kbd className="px-3 py-1.5 text-xs font-mono font-bold bg-stone-950 text-amber-400 border border-stone-700 rounded shadow">
                {lastPlayedBol.shortcut}
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tuning & Atmospheric Tanpura Controls: Fully Responsive */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-stone-950 border border-stone-800 text-stone-300">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Music2 className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-stone-400">調律(Sa):</span>
          </div>
          <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-stone-900 rounded-lg border border-stone-800 overflow-x-auto no-scrollbar">
            {SA_NOTES.map((note) => (
              <button
                key={note.name}
                onClick={() => handleSaChange(note.freq)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedSa === note.freq
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {note.name}
              </button>
            ))}
          </div>

          {/* Gatta Hammer Tuning */}
          <div className="flex items-center gap-1.5 sm:gap-2 sm:pl-2 sm:border-l border-stone-800">
            <span className="text-xs text-stone-400">皮張力:</span>
            <button
              onClick={() => handleTuneHammer(-0.03)}
              className="px-2 py-1 text-xs bg-stone-850 hover:bg-stone-800 text-stone-300 rounded border border-stone-700 flex items-center gap-0.5"
            >
              <Hammer className="w-3 h-3 text-stone-400 rotate-180" /> -
            </button>
            <span className="text-xs font-mono text-amber-400 w-10 text-center font-bold">
              {(tensionLevel * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => handleTuneHammer(0.03)}
              className="px-2 py-1 text-xs bg-stone-850 hover:bg-stone-800 text-stone-300 rounded border border-stone-700 flex items-center gap-0.5"
            >
              <Hammer className="w-3 h-3 text-amber-500" /> +
            </button>
          </div>
        </div>

        {/* Tanpura & Volume */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-stone-850">
          <button
            onClick={handleToggleTanpura}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              isTanpuraActive
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <span>タンプーラ: {isTanpuraActive ? 'ON' : 'OFF'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
