import React from 'react';
import { BolKey } from '../types/tabla';

interface Props {
  drum: 'dayan' | 'bayan';
  activeBol: BolKey | null;
  targetBol?: BolKey | null;
  handOpacity?: number; // 0 to 1
  isStriking?: boolean;
  displayMode?: 'smart' | 'silhouette';
}

/**
 * TablaHandVisualizer
 * High-definition, classical Indian tabla hand & finger striking posture visualizer.
 *
 * Provides two modes:
 * 1. 'smart' (Default): Clean, pinpoint finger pads, anatomical anchor indicators,
 *    spring-release rebound indicators for open sounds, dead-stop damp pads for closed strokes,
 *    and a sleek Mini Hand Anatomy HUD in the corner.
 * 2. 'silhouette': Elegant, lifelike classical Indian hand silhouette showing individual fingers,
 *    knuckle flex, sacred Anamika anchor, and wrist placement.
 */
export const TablaHandVisualizer: React.FC<Props> = ({
  drum,
  activeBol,
  targetBol,
  handOpacity = 0.85,
  isStriking = false,
  displayMode = 'smart',
}) => {
  const currentBol = activeBol || targetBol || (drum === 'bayan' ? 'ge' : 'na');

  // =========================================================================
  // LEFT DRUM: BAYAN (बायाँ · 左手・低音太鼓)
  // =========================================================================
  if (drum === 'bayan') {
    return (
      <g
        className="pointer-events-none select-none transition-all duration-150"
        style={{ opacity: handOpacity }}
      >
        <defs>
          <filter id="smartGlowBayan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="bayanHandSkin" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#0284c7" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* ----------------------------------------------------------------- */}
        {/* MODE A: SMART PINPOINT FINGER & TOUCH POSITION GUIDE (DEFAULT)    */}
        {/* ----------------------------------------------------------------- */}
        {displayMode === 'smart' && (
          <g>
            {/* 1. Permanent Palm Heel Anchor on Rear Rim */}
            <g transform="translate(150, 246)">
              <ellipse
                cx="0"
                cy="0"
                rx="36"
                ry="13"
                fill="rgba(3, 105, 161, 0.4)"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <circle cx="0" cy="0" r="5" fill="#38bdf8" />
              <rect
                x="-40"
                y="-8"
                width="80"
                height="15"
                rx="4"
                fill="rgba(12, 74, 110, 0.95)"
                stroke="#38bdf8"
                strokeWidth="1"
              />
              <text x="0" y="3.5" textAnchor="middle" fill="#e0f2fe" fontSize="8.5" fontWeight="bold">
                ⚓ 手首ヒール接地
              </text>
            </g>

            {/* 2. Active Stroke Touch Indicators */}
            {/* GE: Dual-finger bass spring */}
            {(currentBol === 'ge' || currentBol === 'dha' || currentBol === 'dhin') && (
              <g
                transform="translate(150, 168)"
                className={`transition-all duration-100 ${
                  isStriking ? 'scale-120 translate-y-2' : 'scale-100'
                }`}
              >
                {/* Finger Pad Touch Marks (Middle + Index) */}
                <ellipse
                  cx="-10"
                  cy="0"
                  rx="10"
                  ry="15"
                  fill="rgba(56, 189, 248, 0.65)"
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  filter="url(#smartGlowBayan)"
                />
                <ellipse
                  cx="10"
                  cy="-2"
                  rx="10"
                  ry="15"
                  fill="rgba(56, 189, 248, 0.65)"
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  filter="url(#smartGlowBayan)"
                />
                <circle cx="-10" cy="0" r="4.5" fill="#ffffff" />
                <circle cx="10" cy="-2" r="4.5" fill="#ffffff" />

                {/* Finger Label Badge */}
                <g transform="translate(0, -22)">
                  <rect
                    x="-52"
                    y="-9"
                    width="104"
                    height="18"
                    rx="5"
                    fill="rgba(3, 105, 161, 0.95)"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                  />
                  <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                    ✌️ 2本指打撃・開放
                  </text>
                </g>
              </g>
            )}

            {/* KE: Flat Open Palm Mute */}
            {(currentBol === 'ke' || currentBol === 'ti_re_ki_ta') && (
              <g
                transform="translate(155, 125)"
                className={`transition-all duration-100 ${
                  isStriking ? 'scale-110 translate-y-1' : 'scale-100'
                }`}
              >
                <ellipse
                  cx="0"
                  cy="0"
                  rx="55"
                  ry="44"
                  fill="rgba(56, 189, 248, 0.38)"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  className={isStriking ? 'animate-pulse' : ''}
                />
                <circle cx="0" cy="0" r="28" fill="rgba(14, 165, 233, 0.35)" stroke="#e0f2fe" strokeWidth="2" />
                <g transform="translate(0, 0)">
                  <rect
                    x="-48"
                    y="-9"
                    width="96"
                    height="18"
                    rx="5"
                    fill="rgba(3, 105, 161, 0.95)"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                  />
                  <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                    🖐️ 全指平手消音
                  </text>
                </g>
              </g>
            )}

            {/* MEEND: Wrist Slide */}
            {currentBol === 'meend' && (
              <g transform="translate(150, 195)">
                <ellipse cx="0" cy="0" rx="38" ry="24" fill="rgba(2, 132, 199, 0.55)" stroke="#38bdf8" strokeWidth="2.5" />
                {/* Motion Arrows */}
                <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                  <line x1="0" y1="24" x2="0" y2="-16" />
                  <polyline points="-7,-6 0,-16 7,-6" />
                </g>
                <g transform="translate(0, 28)">
                  <rect
                    x="-50"
                    y="-8"
                    width="100"
                    height="17"
                    rx="4.5"
                    fill="rgba(2, 132, 199, 0.95)"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                  />
                  <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                    〰️ 手首スライド加圧
                  </text>
                </g>
              </g>
            )}

            {/* 3. Mini Hand Anatomy HUD (Left Drum Corner - Desktop/Tablet) */}
            <g transform="translate(12, 218)" className="hidden sm:block">
              <rect x="0" y="0" width="78" height="68" rx="8" fill="rgba(15, 23, 42, 0.92)" stroke="#1e293b" strokeWidth="1.2" />
              <text x="39" y="13" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
                左手のフォーム
              </text>
              {/* Hand Outline diagram */}
              <g transform="translate(20, 21)">
                {/* Thumb */}
                <circle cx="28" cy="18" r="4.5" fill="#334155" />
                {/* Index */}
                <circle
                  cx="20"
                  cy="6"
                  r="5"
                  fill={currentBol === 'ge' || currentBol === 'ke' ? '#38bdf8' : '#334155'}
                  stroke={currentBol === 'ge' ? '#ffffff' : 'none'}
                  strokeWidth="1.2"
                />
                {/* Middle */}
                <circle
                  cx="12"
                  cy="4"
                  r="5.5"
                  fill={currentBol === 'ge' || currentBol === 'ke' ? '#38bdf8' : '#334155'}
                  stroke={currentBol === 'ge' ? '#ffffff' : 'none'}
                  strokeWidth="1.2"
                />
                {/* Ring & Pinky */}
                <circle cx="4" cy="9" r="4" fill={currentBol === 'ke' ? '#38bdf8' : '#1e293b'} />
                <circle cx="-2" cy="18" r="3.5" fill={currentBol === 'ke' ? '#38bdf8' : '#1e293b'} />
                {/* Heel */}
                <ellipse cx="12" cy="28" rx="14" ry="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
              </g>
              <text x="39" y="60" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontWeight="bold">
                {currentBol === 'ke' ? '全指平手' : currentBol === 'meend' ? '手首スライド' : '2本指弾き'}
              </text>
            </g>
          </g>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODE B: LIFELIKE CLASSICAL INDIAN HAND SILHOUETTE                 */}
        {/* ----------------------------------------------------------------- */}
        {displayMode === 'silhouette' && (
          <g
            className={`transition-transform duration-100 ease-out ${
              isStriking ? 'translate-y-[-3px] scale-[1.03]' : 'scale-100'
            }`}
          >
            {/* Natural Hand Structure Entering from Bottom Rim */}
            {/* Palm Base & Wrist Cuff */}
            <path
              d="
                M 112 280
                C 106 256, 102 240, 108 222
                C 114 206, 124 192, 132 176
                L 142 158
                C 146 150, 158 150, 162 158
                L 168 180
                C 176 196, 184 216, 190 230
                C 194 242, 190 258, 180 280
                Z
              "
              fill="url(#bayanHandSkin)"
              stroke="#38bdf8"
              strokeWidth="2.2"
            />
            {/* Individual Knuckle & Finger Segment Highlights */}
            {/* Index & Middle Finger Striking Tips */}
            <ellipse cx="140" cy="164" rx="7" ry="12" fill="#bae6fd" opacity="0.8" />
            <ellipse cx="156" cy="166" rx="7" ry="12" fill="#bae6fd" opacity="0.8" />
            {/* Wrist Heel Pivot Marker */}
            <ellipse cx="148" cy="245" rx="28" ry="13" fill="rgba(3, 105, 161, 0.55)" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="148" cy="245" r="5" fill="#ffffff" />
          </g>
        )}
      </g>
    );
  }

  // =========================================================================
  // RIGHT DRUM: DAYAN (दायाँ · 右手・高音太鼓)
  // =========================================================================
  return (
    <g
      className="pointer-events-none select-none transition-all duration-150"
      style={{ opacity: handOpacity }}
    >
      <defs>
        <filter id="smartGlowDayan" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="dayanHandSkin" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#78350f" stopOpacity="0.4" />
          <stop offset="40%" stopColor="#b45309" stopOpacity="0.6" />
          <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* ----------------------------------------------------------------- */}
      {/* MODE A: SMART PINPOINT FINGER & TOUCH POSITION GUIDE (DEFAULT)    */}
      {/* ----------------------------------------------------------------- */}
      {displayMode === 'smart' && (
        <g>
          {/* =============================================================== */}
          {/* 1. SACRED DAYAN ANCHOR: RING FINGER (Anamika) on Syahi Edge      */}
          {/* =============================================================== */}
          <g transform="translate(192, 160)">
            {/* Pulsing Anchor Halo */}
            <circle cx="0" cy="0" r="16" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeDasharray="3 2" className="animate-spin" />
            <ellipse
              cx="0"
              cy="0"
              rx="11"
              ry="14"
              fill="rgba(217, 119, 6, 0.65)"
              stroke="#ffffff"
              strokeWidth="2.2"
              filter="url(#smartGlowDayan)"
            />
            <circle cx="0" cy="0" r="4.5" fill="#ffffff" />

            {/* Little Finger resting softly beside it */}
            <ellipse cx="15" cy="11" rx="7" ry="10" fill="rgba(217, 119, 6, 0.4)" stroke="#f59e0b" strokeWidth="1.4" />

            {/* Anchor Label Tag */}
            <g transform="translate(6, 19)">
              <rect x="0" y="-7" width="72" height="15" rx="3.5" fill="rgba(120, 53, 15, 0.95)" stroke="#fbbf24" strokeWidth="1" />
              <text x="36" y="3.5" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="bold">
                ⚓ 薬指アンカー
              </text>
            </g>
          </g>

          {/* =============================================================== */}
          {/* 2. ACTIVE STRIKING FINGER POSITION INDICATORS                     */}
          {/* =============================================================== */}

          {/* NA / TA: Index on Kinar Rim (150, 36) */}
          {(currentBol === 'na' || currentBol === 'dha') && (
            <g
              transform="translate(150, 36)"
              className={`transition-all duration-100 ${
                isStriking ? 'scale-125 translate-y-2' : 'scale-100'
              }`}
            >
              {/* Finger Pad Contact Arc */}
              <ellipse
                cx="0"
                cy="0"
                rx="16"
                ry="11"
                fill="rgba(245, 158, 11, 0.7)"
                stroke="#ffffff"
                strokeWidth="2.5"
                filter="url(#smartGlowDayan)"
              />
              <circle cx="0" cy="0" r="5" fill="#ffffff" />

              {/* Pointing Badge */}
              <g transform="translate(0, -22)">
                <rect x="-48" y="-9" width="96" height="18" rx="5" fill="rgba(180, 83, 9, 0.95)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                  ☝️ 人差し指 (Na)
                </text>
              </g>
            </g>
          )}

          {/* TIN / DHIN: Index on Maidan Ring (150, 82) */}
          {(currentBol === 'tin' || currentBol === 'dhin') && (
            <g
              transform="translate(150, 82)"
              className={`transition-all duration-100 ${
                isStriking ? 'scale-120 translate-y-2' : 'scale-100'
              }`}
            >
              <ellipse
                cx="0"
                cy="0"
                rx="15"
                ry="11"
                fill="rgba(234, 179, 8, 0.65)"
                stroke="#ffffff"
                strokeWidth="2.4"
                filter="url(#smartGlowDayan)"
              />
              <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
              <g transform="translate(0, -19)">
                <rect x="-46" y="-8" width="92" height="17" rx="4" fill="rgba(180, 83, 9, 0.95)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  ☝️ 人差し指 (Tin)
                </text>
              </g>
            </g>
          )}

          {/* TUN: Rebounding Release from Syahi Edge (150, 115) */}
          {currentBol === 'tun' && (
            <g transform="translate(150, 115)">
              <ellipse cx="0" cy="0" rx="14" ry="10" fill="rgba(245, 158, 11, 0.6)" stroke="#ffffff" strokeWidth="2.4" />
              <path d="M 0 0 L 0 -18 M -6 -11 L 0 -18 L 6 -11" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" className="animate-bounce" />
              <g transform="translate(0, -30)">
                <rect x="-50" y="-8" width="100" height="17" rx="4.5" fill="rgba(180, 83, 9, 0.95)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                  ☝️ 人差し指 (跳ね上げ)
                </text>
              </g>
            </g>
          )}

          {/* TE / TI: Flat Middle Finger on Syahi Center (138, 148) */}
          {(currentBol === 'te' || (currentBol as string) === 'ti' || currentBol === 'ti_re_ki_ta') && (
            <g
              transform="translate(138, 148)"
              className={`transition-all duration-100 ${
                isStriking ? 'scale-120 translate-y-1.5' : 'scale-100'
              }`}
            >
              <ellipse cx="0" cy="0" rx="18" ry="12" fill="rgba(245, 158, 11, 0.65)" stroke="#ffffff" strokeWidth="2.4" />
              <g transform="translate(0, -19)">
                <rect x="-46" y="-8" width="92" height="17" rx="4" fill="rgba(180, 83, 9, 0.95)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  ✋ 中指密着消音
                </text>
              </g>
            </g>
          )}

          {/* RE: Flat Index Finger on Syahi Center (158, 148) */}
          {currentBol === 're' && (
            <g
              transform="translate(158, 148)"
              className={`transition-all duration-100 ${
                isStriking ? 'scale-120 translate-y-1.5' : 'scale-100'
              }`}
            >
              <ellipse cx="0" cy="0" rx="17" ry="12" fill="rgba(251, 191, 36, 0.65)" stroke="#ffffff" strokeWidth="2.4" />
              <g transform="translate(0, -19)">
                <rect x="-46" y="-8" width="92" height="17" rx="4" fill="rgba(180, 83, 9, 0.95)" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  ☝️ 人指密着消音
                </text>
              </g>
            </g>
          )}

          {/* =============================================================== */}
          {/* 3. MINI HAND ANATOMY HUD (Right Drum Corner - Desktop/Tablet)    */}
          {/* =============================================================== */}
          <g transform="translate(208, 218)" className="hidden sm:block">
            <rect x="0" y="0" width="78" height="68" rx="8" fill="rgba(15, 23, 42, 0.92)" stroke="#1e293b" strokeWidth="1.2" />
            <text x="39" y="13" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
              右手のフォーム
            </text>
            {/* Hand Outline diagram */}
            <g transform="translate(18, 21)">
              {/* Thumb */}
              <circle cx="-4" cy="18" r="4.5" fill="#334155" />
              {/* Index */}
              <circle
                cx="6"
                cy="6"
                r="5"
                fill={currentBol === 'na' || currentBol === 'tin' || currentBol === 'tun' || currentBol === 're' ? '#fbbf24' : '#334155'}
                stroke={currentBol === 'na' || currentBol === 'tin' ? '#ffffff' : 'none'}
                strokeWidth="1.2"
              />
              {/* Middle */}
              <circle
                cx="16"
                cy="4"
                r="5.5"
                fill={currentBol === 'te' || (currentBol as string) === 'ti' ? '#fbbf24' : '#334155'}
                stroke={currentBol === 'te' ? '#ffffff' : 'none'}
                strokeWidth="1.2"
              />
              {/* Ring (Permanent Anchor) */}
              <circle cx="26" cy="7" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              {/* Pinky */}
              <circle cx="34" cy="14" r="3.8" fill="#78350f" />
              {/* Palm */}
              <ellipse cx="16" cy="26" rx="14" ry="6" fill="#334155" />
            </g>
            <text x="39" y="60" textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontWeight="bold">
              {currentBol === 'te' ? '中指消音' : currentBol === 'tun' ? '人指開放' : '人指打法'}
            </text>
          </g>
        </g>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODE B: LIFELIKE CLASSICAL INDIAN HAND SILHOUETTE                 */}
      {/* ----------------------------------------------------------------- */}
      {displayMode === 'silhouette' && (
        <g
          className={`transition-transform duration-100 ease-out ${
            isStriking ? 'translate-y-[-3px] scale-[1.03]' : 'scale-100'
          }`}
        >
          {/* Classical Indian Right Hand Anatomy */}
          <path
            d="
              M 226 265
              C 210 248, 198 230, 188 208
              L 165 168
              C 158 156, 146 156, 142 166
              L 158 202
              C 168 224, 188 244, 214 265
              Z
            "
            fill="url(#dayanHandSkin)"
            stroke="#f59e0b"
            strokeWidth="2.2"
          />
          {/* Finger Knuckle Highlights */}
          <ellipse cx="152" cy="172" rx="6" ry="10" fill="#fef3c7" opacity="0.85" />
          {/* Sacred Ring Finger Anchor pad */}
          <circle cx="190" cy="160" r="8" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
        </g>
      )}
    </g>
  );
};
