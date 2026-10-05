import React, { useState, useEffect, useRef } from 'react';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { Activity, Sliders, Play, Info, HelpCircle } from 'lucide-react';

export const AcousticLab: React.FC = () => {
  const [syahiMass, setSyahiMass] = useState<number>(1.0);
  const [dampingVal, setDampingVal] = useState<number>(0.85);
  const [activeTab, setActiveTab] = useState<'oscilloscope' | 'spectrum' | 'chladni'>('spectrum');
  const [selectedMode, setSelectedMode] = useState<'(0,1)' | '(1,1)' | '(0,2)' | '(2,1)'>('(0,1)');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chladniCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync parameters with audio engine
  useEffect(() => {
    tablaAudio.setSyahiMass(syahiMass);
  }, [syahiMass]);

  useEffect(() => {
    tablaAudio.setDamping(dampingVal);
  }, [dampingVal]);

  // Audio Visualizer loop for Oscilloscope & Spectrum
  useEffect(() => {
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

      // Dark background with subtle grid
      ctx.fillStyle = '#0c0a09'; // stone-950
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (activeTab === 'oscilloscope') {
        // OSCILLOSCOPE (Time Domain Waveform)
        const waveData = tablaAudio.getWaveformData();
        if (waveData) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#f59e0b'; // amber-500
          ctx.beginPath();

          const sliceWidth = w / waveData.length;
          let x = 0;

          for (let i = 0; i < waveData.length; i++) {
            const v = waveData[i] / 128.0; // 0 to 2
            const y = (v * h) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.stroke();

          // Center baseline
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // FREQUENCY SPECTRUM (FFT)
        const freqData = tablaAudio.getFrequencyData();
        if (freqData) {
          const bufferLength = Math.min(freqData.length, 300);
          const barWidth = (w / bufferLength) * 1.5;
          let x = 0;

          // Gradient for spectrum
          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#78350f'); // amber-900
          grad.addColorStop(0.5, '#d97706'); // amber-600
          grad.addColorStop(1, '#fde047'); // yellow-300

          ctx.fillStyle = grad;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (freqData[i] / 255.0) * (h - 20);
            ctx.fillRect(x, h - barHeight, Math.max(1.5, barWidth - 1), barHeight);
            x += barWidth;
          }

          // Harmonic Markers overlay
          const baseFreq = tablaAudio.rootFreq * tablaAudio.skinTension;
          const sampleRate = tablaAudio.getSampleRate();
          const nyquist = sampleRate / 2;

          // Theoretical marker positions
          const markers = [
            { label: 'f₀ (基本音)', factor: 1.0, color: '#a855f7' },
            {
              label: syahiMass > 0.5 ? '2f₀ (第2倍音 / Na)' : '1.59f₀ (非調和)',
              factor: 2.0 * syahiMass + 1.59 * (1.0 - syahiMass),
              color: '#38bdf8',
            },
            {
              label: syahiMass > 0.5 ? '3f₀ (第3倍音)' : '2.14f₀ (非調和)',
              factor: 3.0 * syahiMass + 2.14 * (1.0 - syahiMass),
              color: '#4ade80',
            },
          ];

          markers.forEach((m) => {
            const markerFreq = baseFreq * m.factor;
            const markerX = (markerFreq / (nyquist * (bufferLength / freqData.length))) * w * 0.7;

            if (markerX > 0 && markerX < w) {
              ctx.strokeStyle = m.color;
              ctx.setLineDash([2, 3]);
              ctx.beginPath();
              ctx.moveTo(markerX, 0);
              ctx.lineTo(markerX, h);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = m.color;
              ctx.font = '10px monospace';
              ctx.fillText(`${m.label} (${Math.round(markerFreq)}Hz)`, markerX + 4, 16);
            }
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeTab, syahiMass]);

  // 2D Chladni / Membrane Vibration Mode animation
  useEffect(() => {
    let animId: number;
    const canvas = chladniCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const renderChladni = () => {
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

      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.42;

      time += 0.05;

      // Draw drum outline
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw Syahi center mass
      const syahiRadius = radius * 0.42;
      ctx.beginPath();
      ctx.arc(centerX, centerY, syahiRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Render 2D wave displacement grid
      const steps = 36;
      for (let r = 0.15; r <= 0.95; r += 0.08) {
        for (let a = 0; a < steps; a++) {
          const theta = (a / steps) * Math.PI * 2;
          const currR = r * radius;
          const px = centerX + Math.cos(theta) * currR;
          const py = centerY + Math.sin(theta) * currR;

          // Mode displacement equations:
          // (0,1): J0(kr) * cos(wt) -> fundamental symmetrical bell
          // (1,1): J1(kr) * cos(theta) * cos(wt) -> 1 nodal diameter
          // (0,2): J0(k2r) -> 1 concentric nodal circle
          // (2,1): J2(kr) * cos(2*theta) -> 2 nodal diameters (cross)
          let displacement = 0;
          if (selectedMode === '(0,1)') {
            displacement = Math.cos(r * 2.4) * Math.sin(time * 3);
          } else if (selectedMode === '(1,1)') {
            displacement = Math.sin(r * 3.8) * Math.cos(theta) * Math.sin(time * 4);
          } else if (selectedMode === '(0,2)') {
            displacement = Math.cos(r * 5.5) * Math.sin(time * 4.5);
          } else if (selectedMode === '(2,1)') {
            displacement = Math.sin(r * 3.8) * Math.cos(2 * theta) * Math.sin(time * 4.8);
          }

          // Dot size and color by displacement
          const dispSize = Math.max(1, 3.5 + displacement * 3);
          ctx.beginPath();
          ctx.arc(px, py, dispSize, 0, Math.PI * 2);

          if (displacement > 0.05) {
            ctx.fillStyle = `rgba(234, 179, 8, ${Math.min(0.9, 0.3 + displacement * 0.6)})`; // Up (Amber)
          } else if (displacement < -0.05) {
            ctx.fillStyle = `rgba(56, 189, 248, ${Math.min(0.9, 0.3 + Math.abs(displacement) * 0.6)})`; // Down (Sky blue)
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Nodal line (Zero displacement)
          }
          ctx.fill();
        }
      }

      // Draw Nodal line indicators
      if (selectedMode === '(1,1)') {
        // Vertical nodal line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX, centerY + radius);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animId = requestAnimationFrame(renderChladni);
    };

    renderChladni();
    return () => cancelAnimationFrame(animId);
  }, [selectedMode]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Educational Banner */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-stone-100">
                タブラーの音響物理実験室（Acoustics Lab）
              </h2>
            </div>
            <p className="text-sm text-stone-400 max-w-3xl leading-relaxed">
              なぜタブラーは一般的な太鼓と異なり、ピアノや鐘のように美しい「音階（メロディ）」を持つのか？
              ノーベル物理学賞受賞者C.V.ラマンが発見した「シャヒ（重り）による調和倍音の秘密」と「膜振動物理学」を実際に音と波形で体験できます。
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Experimentation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-Time Audio Visualizer & 2D Membrane Simulator */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Visualizer Display Box */}
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-lg border border-stone-800">
                <button
                  onClick={() => setActiveTab('spectrum')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'spectrum'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  FFT周波数スペクトル (倍音分析)
                </button>
                <button
                  onClick={() => setActiveTab('oscilloscope')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'oscilloscope'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  オシロスコープ (時間波形)
                </button>
                <button
                  onClick={() => setActiveTab('chladni')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'chladni'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  膜の2D固有振動 (クラドニ図形)
                </button>
              </div>

              {activeTab === 'spectrum' && (
                <span className="text-[11px] text-stone-500 hidden sm:inline">
                  縦点線：理論倍音ピーク (f₀, 2f₀, 3f₀)
                </span>
              )}
            </div>

            {/* Canvas Area */}
            {activeTab !== 'chladni' ? (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-stone-800">
                <canvas ref={canvasRef} className="w-full h-full block" />
                <div className="absolute top-2 right-2 text-[10px] text-stone-500 font-mono">
                  {activeTab === 'spectrum' ? '0Hz ────────────── 3kHz' : '±1.0 Amplitude'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-400 font-medium">振動モード選択:</span>
                  {(['(0,1)', '(1,1)', '(0,2)', '(2,1)'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                        selectedMode === mode
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {mode === '(0,1)' && 'Tun基本音 (0,1)'}
                      {mode === '(1,1)' && 'Na倍音 (1,1)'}
                      {mode === '(0,2)' && '同心円節 (0,2)'}
                      {mode === '(2,1)' && '十字節 (2,1)'}
                    </button>
                  ))}
                </div>
                <div className="relative w-full h-64 rounded-lg overflow-hidden border border-stone-800 flex items-center justify-center bg-stone-950">
                  <canvas ref={chladniCanvasRef} className="w-full h-full block" />
                  <div className="absolute bottom-2 left-3 text-[11px] text-stone-400 bg-stone-900/80 px-2 py-0.5 rounded border border-stone-800">
                    黄: 上方向変位 / 青: 下方向変位 / 赤破線: 節線（動かない点）
                  </div>
                </div>
              </div>
            )}

            {/* Quick Test Trigger Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-800/80">
              <span className="text-xs text-stone-400">実験用音出し:</span>
              <button
                onClick={() => tablaAudio.playBol('tun')}
                className="px-3 py-1.5 text-xs font-semibold bg-purple-950 hover:bg-purple-900 text-purple-200 rounded border border-purple-800 flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Tun (開放・基本音を観察)
              </button>
              <button
                onClick={() => tablaAudio.playBol('na')}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-950 hover:bg-amber-900 text-amber-200 rounded border border-amber-800 flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Na (消音付き・高調波を観察)
              </button>
              <button
                onClick={() => tablaAudio.playBol('tin')}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Tin (マイダン中音)
              </button>
              <button
                onClick={() => tablaAudio.playBol('meend', 1.8)}
                className="px-3 py-1.5 text-xs font-semibold bg-sky-950 hover:bg-sky-900 text-sky-200 rounded border border-sky-800 flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Meend (低音周波数上昇)
              </button>
            </div>
          </div>

          {/* C.V. Raman Physics Explainer Card */}
          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 text-xs text-stone-300 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Info className="w-4 h-4" />
              <span>ノーベル賞物理学者C.V.ラマンが解き明かした音響の秘密</span>
            </div>
            <p className="leading-relaxed text-stone-300">
              「一様な円形膜（普通の太鼓）」の固有振動数は、ベッセル関数 $J_n(x)$ のゼロ点で表され、
              <strong className="text-white font-mono"> 1.00 : 1.59 : 2.14 : 2.30 : 2.65</strong>{' '}
              という非整数比（非調和音）になります。これが西洋のティンパニ以外の太鼓が「ドスッ」「バン」という濁った音になる物理的原因です。
            </p>
            <p className="leading-relaxed text-stone-300">
              タブラーの膜中央にある「シャヒ（鉄粉糊の重り層）」は、膜の質量密度を中心に向けて放物線状に増大させます。ラマン卿（1928年）の計算と実験により、この絶妙な質量分布が固有振動モードを
              <strong className="text-amber-400 font-mono"> 1.00 : 2.00 : 3.00 : 4.00 : 5.00</strong>{' '}
              という完全な整数倍（純正な調和倍音）へと強制的に収束させることが明らかになりました。
            </p>
          </div>
        </div>

        {/* Right Col: Interactive Parameter Sliders & Classroom Experiments */}
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-stone-100">音響パラメータ実験</h3>
            </div>

            {/* Slider 1: Syahi Mass Effect */}
            <div className="flex flex-col gap-2 bg-stone-950 p-3 rounded-lg border border-stone-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400">シャヒの質量効果 (Mass Loading)</span>
                <span className="font-mono text-stone-400">{(syahiMass * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={syahiMass}
                onChange={(e) => setSyahiMass(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>0% (普通の太鼓・非調和)</span>
                <span>100% (タブラー・調和倍音)</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                0%にすると倍音がベッセル比になり、ドスッとしたスネアやタムのような非調和音に変化します。
              </p>
            </div>

            {/* Slider 2: Ring Finger Damping */}
            <div className="flex flex-col gap-2 bg-stone-950 p-3 rounded-lg border border-stone-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-400">薬指による基本音ミュート (Damping)</span>
                <span className="font-mono text-stone-400">{(dampingVal * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={dampingVal}
                onChange={(e) => setDampingVal(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>0% (消音なし・Tun)</span>
                <span>100% (完全消音・Na)</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                薬指をシャヒ縁に置くことで最低周波の基本音を消し去り、澄んだ金属倍音（2f₀）のみを抽出します。
              </p>
            </div>

            {/* Side-by-Side Comparison Audio Test */}
            <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
              <span className="text-xs font-semibold text-stone-300">聴き比べ実験:</span>
              <button
                onClick={() => {
                  setSyahiMass(0.0);
                  setDampingVal(0.0);
                  setTimeout(() => tablaAudio.playNa(), 50);
                }}
                className="w-full py-2 px-3 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 transition-colors flex items-center justify-between"
              >
                <span>普通の太鼓の音（非調和音）</span>
                <Play className="w-3.5 h-3.5 text-stone-400" />
              </button>
              <button
                onClick={() => {
                  setSyahiMass(1.0);
                  setDampingVal(0.85);
                  setTimeout(() => tablaAudio.playNa(), 50);
                }}
                className="w-full py-2 px-3 text-xs bg-amber-950/80 hover:bg-amber-900 text-amber-200 rounded-lg border border-amber-800 transition-colors flex items-center justify-between"
              >
                <span>タブラーの音（調和倍音ベル）</span>
                <Play className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Classroom Inquiry Box (生徒向け発問) */}
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>授業での探究問いかけ</span>
            </div>
            <ul className="text-xs text-stone-400 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-stone-200">問1：</strong>{' '}
                なぜスネアドラムには黒い円（シャヒ）が付いていないのだろう？その音の違いの理由は？
              </li>
              <li>
                <strong className="text-stone-200">問2：</strong>{' '}
                ギターのハーモニクス奏法と、タブラーのNa打法（薬指で触れながら叩く）の共通点は何だろう？
              </li>
              <li>
                <strong className="text-stone-200">問3：</strong>{' '}
                バーヤーンの低音が上がるとき、皮の「張力」はどう変化しているだろう？
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
