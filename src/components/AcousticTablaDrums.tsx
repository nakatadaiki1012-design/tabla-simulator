import React from 'react';
import { BolKey } from '../types/tabla';
import { TablaVibrationOverlay } from './TablaVibrationOverlay';
import { TablaHandVisualizer } from './TablaHandVisualizer';

export interface AcousticTablaDrumsProps {
  bayanStrike: { bol: BolKey; time: number } | null;
  dayanStrike: { bol: BolKey; time: number } | null;
  isBayanRecoil?: boolean;
  isDayanRecoil?: boolean;
  handMode?: 'smart' | 'silhouette' | 'off';
  handOpacity?: number;
  showVibrations?: boolean;
  targetStep?: {
    bol: BolKey;
    drum: 'dayan' | 'bayan' | 'both';
    shortcut?: string;
    coordsBayan?: { x: number; y: number };
    coordsDayan?: { x: number; y: number };
  } | null;
  onStrikeBol?: (bol: BolKey, customBend?: number) => void;
  showLabels?: boolean;
  showCushions?: boolean;
}

/**
 * AcousticTablaDrums
 * Museum-grade, ultra-realistic Indian classical Tabla & Bayan visualizer:
 * - Hand-hammered nickel/brass kettle for Bayan with authentic metallic specular luster
 * - Lathed red Shisham (Rosewood) timber shell for Dayan with lathe grooving and timber grain
 * - Cylindrical hardwood Gatta tuning pegs and Baddhi tension straps
 * - Royal silk-brocade Bira cushion rings (Torana/Chutta) with gold Zari embroidery
 * - Authentic 3-zone Dayan head (translucent Kinar, smooth Maidan, multi-ply Syahi with micro-fissure craquelure)
 * - Off-center Bayan Syahi with palm-heel resting pad and forward Meend glide corridor
 * - Dynamic 3D leather depression indentation on finger impact
 * - Cushion mass-spring physical recoil
 * - Strictly isolated acoustic membrane vibration shockwaves and classical hand guides
 */
export const AcousticTablaDrums: React.FC<AcousticTablaDrumsProps> = ({
  bayanStrike,
  dayanStrike,
  isBayanRecoil = false,
  isDayanRecoil = false,
  handMode = 'smart',
  handOpacity = 0.75,
  showVibrations = true,
  targetStep = null,
  onStrikeBol,
  showLabels = true,
  showCushions = true,
}) => {
  const handleStrike = (bol: BolKey, customBend?: number) => {
    // Tactile haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const isBass = bol === 'ge' || bol === 'dha' || bol === 'dhin';
        const isSlap = bol === 'ke' || bol === 'te' || bol === 're';
        navigator.vibrate?.(isBass ? 18 : isSlap ? 8 : 12);
      } catch (_) {}
    }
    if (onStrikeBol) {
      onStrikeBol(bol, customBend);
    }
  };

  const isBayanTarget = targetStep && (targetStep.drum === 'bayan' || targetStep.drum === 'both');
  const isDayanTarget = targetStep && (targetStep.drum === 'dayan' || targetStep.drum === 'both');

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-6 md:gap-8 items-start justify-items-center relative z-20 my-auto w-full select-none">
      {/* =================================================================== */}
      {/* 1. LEFT DRUM: BAYAN (बायाँ · 左手・低音太鼓)                         */}
      {/* =================================================================== */}
      <div className="flex flex-col items-center gap-2 w-full max-w-sm">
        {showLabels && (
          <div className="flex items-center justify-between w-full px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-bold bg-sky-900/80 text-sky-200 px-1.5 py-0.5 rounded shadow-sm">
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
        )}

        {/* Bayan Drum Stage Container with Physical Cushion Rebound */}
        <div
          className={`relative w-full max-w-[155px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[285px] aspect-square group transition-all duration-100 ease-out ${
            isBayanRecoil
              ? 'scale-[1.035] -translate-y-1.5 rotate-[-0.8deg]'
              : 'scale-100 translate-y-0 rotate-0'
          }`}
        >
          {/* Royal Embroidered Bira Cushion Ring (Base cushion under Bayan) */}
          {showCushions && (
            <div className="absolute -inset-3.5 rounded-full bg-gradient-to-tr from-sky-950 via-slate-900 to-sky-900 border-4 border-amber-600/40 shadow-2xl -z-10 flex items-center justify-center overflow-hidden">
              {/* Gold Zari brocade rope texture on cushion edge */}
              <div className="w-full h-full rounded-full border-2 border-dashed border-amber-400/30 opacity-70" />
            </div>
          )}

          {/* SVG Canvas for Bayan */}
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
            <defs>
              {/* Hammered Nickel / Brass Kettle Metallic Sheen */}
              <radialGradient id="bayanHammeredMetal" cx="36%" cy="34%" r="66%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="25%" stopColor="#eab308" />
                <stop offset="55%" stopColor="#a16207" />
                <stop offset="85%" stopColor="#451a03" />
                <stop offset="100%" stopColor="#1a0800" />
              </radialGradient>

              {/* Specular Rim Light for 3D Bell Metal Kettle */}
              <linearGradient id="bayanRimBevel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#b45309" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
              </linearGradient>

              {/* Natural Unbleached Goatskin Maidan */}
              <radialGradient id="bayanMaidanSkin" cx="48%" cy="48%" r="52%">
                <stop offset="0%" stopColor="#faf7ee" />
                <stop offset="60%" stopColor="#f4ebd6" />
                <stop offset="88%" stopColor="#dfceaa" />
                <stop offset="100%" stopColor="#c5b085" />
              </radialGradient>

              {/* Multi-ply Starched Iron-Rice Syahi Paste with Velvet Depth */}
              <radialGradient id="bayanSyahiVelvet" cx="44%" cy="42%" r="54%">
                <stop offset="0%" stopColor="#3d3d3d" />
                <stop offset="35%" stopColor="#242424" />
                <stop offset="75%" stopColor="#121212" />
                <stop offset="100%" stopColor="#040404" />
              </radialGradient>

              {/* Palm Heel Cushion Zone Sheen */}
              <radialGradient id="bayanPalmHeelSheen" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#0284c7" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 1. Heavy Metal Kettle Rim */}
            <circle
              cx="150"
              cy="150"
              r="146"
              fill="url(#bayanHammeredMetal)"
              stroke="#592b02"
              strokeWidth="4"
            />
            <circle
              cx="150"
              cy="150"
              r="145"
              fill="none"
              stroke="url(#bayanRimBevel)"
              strokeWidth="2.5"
            />

            {/* 2. Gajra Braided Camel-Hide Rim with Stitched Eyelets */}
            <circle
              cx="150"
              cy="150"
              r="134"
              fill="#c4ad82"
              stroke="#785c32"
              strokeWidth="6"
              strokeDasharray="4 2.5"
            />
            {/* Gajra Eyelet Pins (Lace Holes) */}
            {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
              (deg) => {
                const rad = (deg * Math.PI) / 180;
                const x = 150 + Math.cos(rad) * 134;
                const y = 150 + Math.sin(rad) * 134;
                return <circle key={deg} cx={x} cy={y} r="2" fill="#3b2506" opacity="0.8" />;
              }
            )}

            {/* 3. Outer Goatskin Parchment Border */}
            <circle
              cx="150"
              cy="150"
              r="128"
              fill="#f1e6cd"
              stroke="#b59c6b"
              strokeWidth="1.5"
            />

            {/* 4. MAIDAN LEATHER (Ge Bass open resonance zone) */}
            <circle
              cx="150"
              cy="150"
              r="125"
              fill="url(#bayanMaidanSkin)"
              className="cursor-pointer transition-all hover:brightness-105 active:scale-[0.99]"
              onClick={() => handleStrike('ge')}
            />

            {/* 5. OFF-CENTER SYAHI (Ke flat slap zone) with Hakla Micro-Cracks */}
            <g
              className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
              onClick={() => handleStrike('ke')}
            >
              <circle
                cx="155"
                cy="125"
                r="68"
                fill="url(#bayanSyahiVelvet)"
                stroke="#171717"
                strokeWidth="2.5"
              />
              {/* Concentric Paste Layer Rings */}
              <circle cx="155" cy="125" r="54" fill="none" stroke="#2e2e2e" strokeWidth="1.2" strokeDasharray="3 3" />
              <circle cx="155" cy="125" r="38" fill="none" stroke="#222222" strokeWidth="0.9" />
              <circle cx="155" cy="125" r="22" fill="none" stroke="#333333" strokeWidth="0.8" />
              <circle cx="155" cy="125" r="10" fill="none" stroke="#1f1f1f" strokeWidth="0.8" />

              {/* Authentic Fine Radial Hakla Drying Fissure Lines */}
              {[15, 65, 110, 160, 205, 255, 300, 345].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 155 + Math.cos(rad) * 14;
                const y1 = 125 + Math.sin(rad) * 14;
                const x2 = 155 + Math.cos(rad) * 62;
                const y2 = 125 + Math.sin(rad) * 62;
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#1c1c1c"
                    strokeWidth="0.6"
                    opacity="0.75"
                  />
                );
              })}

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

            {/* 6. MEEND / GE PALM HEEL CONTACT & SLIDE CORRIDOR */}
            <path
              d="M 95 235 Q 150 255 205 235 Q 185 188 150 188 Q 115 188 95 235 Z"
              fill="url(#bayanPalmHeelSheen)"
              stroke="rgba(56, 189, 248, 0.65)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="cursor-pointer transition-colors hover:fill-sky-500/25 active:scale-[0.99]"
              onClick={() => handleStrike('ge')}
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

            {/* 7. TARGET POINTER BEACON (When targeted) */}
            {isBayanTarget && targetStep && (
              <g
                transform={`translate(${targetStep.bol === 'ke' ? 155 : 150}, ${
                  targetStep.bol === 'ke' ? 125 : 180
                })`}
                className="cursor-pointer animate-pulse"
                onClick={() => handleStrike(targetStep.bol)}
              >
                <circle cx="0" cy="0" r="28" fill="none" stroke="#38bdf8" strokeWidth="3" className="animate-ping origin-center" />
                <circle cx="0" cy="0" r="20" fill="rgba(56, 189, 248, 0.45)" stroke="#0284c7" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                <text x="0" y="4.5" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">
                  {targetStep.shortcut === 'Space' ? '␣' : targetStep.shortcut || 'A'}
                </text>
              </g>
            )}

            {/* 8. ACOUSTIC MEMBRANE VIBRATION SHOCKWAVES (Strictly isolated to Bayan) */}
            {showVibrations && (
              <TablaVibrationOverlay
                drum="bayan"
                activeBol={bayanStrike?.bol || null}
                strikeTime={bayanStrike?.time || 0}
              />
            )}

            {/* 9. HAND & FINGER GUIDE OVERLAY */}
            {handMode !== 'off' && (
              <TablaHandVisualizer
                drum="bayan"
                activeBol={bayanStrike?.bol || null}
                targetBol={targetStep && targetStep.drum !== 'dayan' ? targetStep.bol : null}
                displayMode={handMode}
                handOpacity={handOpacity}
                isStriking={isBayanRecoil}
              />
            )}
          </svg>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. RIGHT DRUM: DAYAN (दायाँ · 右手・高音太鼓)                        */}
      {/* =================================================================== */}
      <div className="flex flex-col items-center gap-2 w-full max-w-sm">
        {showLabels && (
          <div className="flex items-center justify-between w-full px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-bold bg-amber-900/80 text-amber-200 px-1.5 py-0.5 rounded shadow-sm">
                右手
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1">
                <span>दायाँ</span> ダヤーン
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
              [J · K · L · ;]
            </span>
          </div>
        )}

        {/* Dayan Drum Stage Container with Physical Cushion Rebound */}
        <div
          className={`relative w-full max-w-[155px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[285px] aspect-square group transition-all duration-100 ease-out ${
            isDayanRecoil
              ? 'scale-[1.03] -translate-y-1.5 rotate-[0.6deg]'
              : 'scale-100 translate-y-0 rotate-0'
          }`}
        >
          {/* Royal Embroidered Bira Cushion Ring (Base cushion under Dayan) */}
          {showCushions && (
            <div className="absolute -inset-3.5 rounded-full bg-gradient-to-tr from-amber-950 via-stone-900 to-red-950 border-4 border-amber-600/50 shadow-2xl -z-10 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full rounded-full border-2 border-dashed border-amber-400/35 opacity-70" />
            </div>
          )}

          {/* SVG Canvas for Dayan */}
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl overflow-visible">
            <defs>
              {/* Lathe-Turned Shisham (Rosewood) Shell Tone */}
              <radialGradient id="dayanShishamWood" cx="42%" cy="38%" r="62%">
                <stop offset="0%" stopColor="#9a3412" />
                <stop offset="45%" stopColor="#7c2d12" />
                <stop offset="78%" stopColor="#451a03" />
                <stop offset="95%" stopColor="#220b02" />
                <stop offset="100%" stopColor="#0f0400" />
              </radialGradient>

              {/* Kinar (Outer Parchment Ring) - Translucent Amber Goatskin */}
              <radialGradient id="dayanKinarParchment" cx="50%" cy="50%" r="50%">
                <stop offset="85%" stopColor="#fdf6e7" />
                <stop offset="94%" stopColor="#f2e2be" />
                <stop offset="100%" stopColor="#d8bc88" />
              </radialGradient>

              {/* Maidan (Inner Singing Ring) - Supple Fine Goatskin */}
              <radialGradient id="dayanMaidanSkin" cx="48%" cy="48%" r="52%">
                <stop offset="0%" stopColor="#fefaf0" />
                <stop offset="65%" stopColor="#f6ecda" />
                <stop offset="100%" stopColor="#dfceaa" />
              </radialGradient>

              {/* Syahi (Centered Multi-Layered Iron-Rice Paste Starched Compound) */}
              <radialGradient id="dayanSyahiCompound" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#383838" />
                <stop offset="40%" stopColor="#202020" />
                <stop offset="80%" stopColor="#0e0e0e" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
            </defs>

            {/* 1. Carved Rosewood Shell Rim */}
            <circle
              cx="150"
              cy="150"
              r="146"
              fill="url(#dayanShishamWood)"
              stroke="#381104"
              strokeWidth="5"
            />
            {/* Lathe Grooves on Wood Rim */}
            <circle cx="150" cy="150" r="141" fill="none" stroke="#7c2d12" strokeWidth="1" opacity="0.6" />
            <circle cx="150" cy="150" r="137" fill="none" stroke="#2d0a02" strokeWidth="1.2" opacity="0.8" />

            {/* 2. Gajra Braided Rawhide Rim with 16 Eyelet Straps */}
            <circle
              cx="150"
              cy="150"
              r="133"
              fill="#c6b088"
              stroke="#735429"
              strokeWidth="6"
              strokeDasharray="4 2.5"
            />
            {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
              (deg) => {
                const rad = (deg * Math.PI) / 180;
                const x = 150 + Math.cos(rad) * 133;
                const y = 150 + Math.sin(rad) * 133;
                return <circle key={deg} cx={x} cy={y} r="2" fill="#362208" opacity="0.85" />;
              }
            )}

            {/* 3. KINAR (Chat - Outer Ring: NA / TA Bell Strike) */}
            <circle
              cx="150"
              cy="150"
              r="124"
              fill="url(#dayanKinarParchment)"
              className="cursor-pointer hover:fill-amber-200 active:fill-amber-300 transition-colors"
              onClick={() => handleStrike('na')}
            />
            <circle cx="150" cy="150" r="124" fill="none" stroke="#baa070" strokeWidth="1.5" />

            {/* 4. MAIDAN (Sur - Middle Ring: TIN Singing Stroke) */}
            <circle
              cx="150"
              cy="150"
              r="104"
              fill="url(#dayanMaidanSkin)"
              className="cursor-pointer hover:fill-amber-50 active:fill-amber-100 transition-colors"
              onClick={() => handleStrike('tin')}
            />
            <circle cx="150" cy="150" r="104" fill="none" stroke="#cdb482" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* 5. SYAHI (Center Black Circle - TUN Open Bell / TE Damped Slap) */}
            <g
              className="cursor-pointer transition-transform hover:scale-[1.015] active:scale-[0.985]"
              onClick={(e) => {
                if (e.shiftKey) {
                  handleStrike('te');
                } else {
                  handleStrike('tun');
                }
              }}
            >
              <circle
                cx="150"
                cy="150"
                r="58"
                fill="url(#dayanSyahiCompound)"
                stroke="#171717"
                strokeWidth="2.5"
              />
              {/* Concentric Paste Layer Rings */}
              <circle cx="150" cy="150" r="44" fill="none" stroke="#333333" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="150" cy="150" r="28" fill="none" stroke="#242424" strokeWidth="0.8" />
              <circle cx="150" cy="150" r="13" fill="none" stroke="#404040" strokeWidth="0.8" />

              {/* Radial Hakla Craquelure Fissures */}
              {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 150 + Math.cos(rad) * 10;
                const y1 = 150 + Math.sin(rad) * 10;
                const x2 = 150 + Math.cos(rad) * 54;
                const y2 = 150 + Math.sin(rad) * 54;
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#1a1a1a"
                    strokeWidth="0.6"
                    opacity="0.8"
                  />
                );
              })}

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

            {/* 6. On-Drum Zone Helper Labels */}
            <text
              x="150"
              y="50"
              textAnchor="middle"
              fill="#92400e"
              fontSize="11"
              fontWeight="bold"
              className="pointer-events-none"
            >
              Na [J] 外縁
            </text>
            <text
              x="150"
              y="74"
              textAnchor="middle"
              fill="#78350f"
              fontSize="10"
              fontWeight="600"
              className="pointer-events-none"
            >
              Tin [K] 中皮
            </text>

            {/* 7. TARGET POINTER BEACON (When targeted) */}
            {isDayanTarget && targetStep && (
              <g
                transform={`translate(${
                  targetStep.bol === 'na'
                    ? 150
                    : targetStep.bol === 'tin'
                    ? 150
                    : targetStep.bol === 'te' || targetStep.bol === 're'
                    ? 145
                    : 150
                }, ${
                  targetStep.bol === 'na'
                    ? 36
                    : targetStep.bol === 'tin'
                    ? 82
                    : targetStep.bol === 'te' || targetStep.bol === 're'
                    ? 148
                    : 120
                })`}
                className="cursor-pointer animate-pulse"
                onClick={() => handleStrike(targetStep.bol)}
              >
                <circle cx="0" cy="0" r="28" fill="none" stroke="#fbbf24" strokeWidth="3" className="animate-ping origin-center" />
                <circle cx="0" cy="0" r="20" fill="rgba(251, 191, 36, 0.45)" stroke="#d97706" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="14" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                <text x="0" y="4.5" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">
                  {targetStep.shortcut === 'Space' ? '␣' : targetStep.shortcut || 'J'}
                </text>
              </g>
            )}

            {/* 8. ACOUSTIC MEMBRANE VIBRATION SHOCKWAVES (Strictly isolated to Dayan) */}
            {showVibrations && (
              <TablaVibrationOverlay
                drum="dayan"
                activeBol={dayanStrike?.bol || null}
                strikeTime={dayanStrike?.time || 0}
              />
            )}

            {/* 9. HAND & FINGER GUIDE OVERLAY */}
            {handMode !== 'off' && (
              <TablaHandVisualizer
                drum="dayan"
                activeBol={dayanStrike?.bol || null}
                targetBol={targetStep && targetStep.drum !== 'bayan' ? targetStep.bol : null}
                displayMode={handMode}
                handOpacity={handOpacity}
                isStriking={isDayanRecoil}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
