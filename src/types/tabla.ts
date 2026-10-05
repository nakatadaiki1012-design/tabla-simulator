/**
 * Tabla & Bayan Types and Definitions
 */

export type BolKey =
  | 'na'
  | 'tin'
  | 'tun'
  | 'te'
  | 're'
  | 'ge'
  | 'meend'
  | 'ke'
  | 'dha'
  | 'dhin'
  | 'ti_re_ki_ta';

export type EngineMode = 'sampler' | 'hybrid' | 'physical';
export type SoundBankPreset = 'freesound' | 'benares' | 'delhi' | 'bronze' | 'custom';

export interface BolInfo {
  id: BolKey;
  name: string;
  devanagari: string;
  drum: 'dayan' | 'bayan' | 'both';
  zone: string;
  finger: string;
  description: string;
  shortcut: string;
  isCombo?: boolean;
  frequencyType: 'harmonic' | 'fundamental' | 'damped' | 'bass' | 'bass_bend' | 'percussive';
}

export interface TaalDefinition {
  id: string;
  name: string;
  devanagari: string;
  beats: number; // Matras
  division: number[]; // Vibhag e.g. [4, 4, 4, 4]
  claps: number[]; // 1-indexed beat numbers of Tali
  waves: number[]; // 1-indexed beat numbers of Khali
  bols: { matra: number; bol: BolKey; text: string; dev: string }[];
  genre: string;
  description: string;
}

export interface ClassroomLesson {
  id: string;
  title: string;
  subtitle: string;
  targetBols: BolKey[];
  concepts: string[];
  interactiveGoal: string;
  explanation: string;
  experimentSettings?: {
    syahiMass?: number;
    damping?: number;
    tension?: number;
  };
}
