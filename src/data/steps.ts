/**
 * スモールステップのレッスン
 * 1ステップ＝1つのこと。ユニット（3〜4ステップ）を全部クリアするとバッジがもらえる。
 */
import { BolKey } from '../types/tabla';

export type StepKind = 'tap' | 'rhythm' | 'quiz' | 'sam';
export interface Step {
  id: string;
  kind: StepKind;
  say: string; // 画面に出す一言
  hint?: string; // ？ボタンで出すヒント
  seq?: BolKey[]; // tap / rhythm：叩く順番
  bpm?: number;
  options?: BolKey[]; // quiz：選択肢
  rounds?: number; // quiz / sam：回数
}
export interface Unit { id: string; name: string; icon: string; badge: string; badgeIcon: string; steps: Step[] }

const s = (str: string) => str.split(' ') as BolKey[];

export const UNITS: Unit[] = [
  { id: 'u1', name: 'はじめの音', icon: '🔔', badge: 'はじめの一打', badgeIcon: '🥉', steps: [
    { id: 'u1s1', kind: 'tap', say: 'ナーを たたこう', hint: '右の太鼓の ふち（光っている所）', seq: s('na') },
    { id: 'u1s2', kind: 'tap', say: 'ナーを 3回', seq: s('na na na') },
    { id: 'u1s3', kind: 'tap', say: 'ティンを 2回', hint: 'ふちの内側。ナーより まるい音', seq: s('tin tin') },
    { id: 'u1s4', kind: 'tap', say: 'ナー・ティンを こうごに', seq: s('na tin na tin') },
  ] },
  { id: 'u2', name: '左手の低音', icon: '🌊', badge: '低音マスター', badgeIcon: '🌊', steps: [
    { id: 'u2s1', kind: 'tap', say: 'ゲーを 2回', hint: '左の大きい太鼓。ひびく低い音', seq: s('ge ge') },
    { id: 'u2s2', kind: 'tap', say: 'ケを 2回', hint: '左の黒い所。ひびかない音', seq: s('ke ke') },
    { id: 'u2s3', kind: 'tap', say: 'ゲー・ケを こうごに', seq: s('ge ke ge ke') },
    { id: 'u2s4', kind: 'tap', say: '右のまん中 トゥン', hint: '右の太鼓の いちばん真ん中', seq: s('tun tun') },
  ] },
  { id: 'u3', name: '両手で', icon: '🙌', badge: '両手名人', badgeIcon: '🙌', steps: [
    { id: 'u3s1', kind: 'tap', say: 'ダー＝ナー＋ゲー', hint: '2か所を同時に。下の「ダー」ボタンでもOK', seq: s('dha') },
    { id: 'u3s2', kind: 'tap', say: 'ダーを 2回', seq: s('dha dha') },
    { id: 'u3s3', kind: 'tap', say: 'ディン＝ティン＋ゲー', hint: '2か所を同時に。下の「ディン」ボタンでもOK', seq: s('dhin dhin') },
    { id: 'u3s4', kind: 'tap', say: 'ダー ディン ディン ダー', seq: s('dha dhin dhin dha') },
  ] },
  { id: 'u4', name: '耳で聞く', icon: '👂', badge: '耳の達人', badgeIcon: '👂', steps: [
    { id: 'u4s1', kind: 'quiz', say: 'どっちの音？', options: s('na ge'), rounds: 3 },
    { id: 'u4s2', kind: 'quiz', say: 'どの音？', options: s('na tin tun'), rounds: 4 },
    { id: 'u4s3', kind: 'quiz', say: 'どの音？', options: s('dha na ge ke'), rounds: 5 },
  ] },
  { id: 'u5', name: 'リズム', icon: '⏱', badge: 'リズムキーパー', badgeIcon: '⏱', steps: [
    { id: 'u5s1', kind: 'rhythm', say: '拍に合わせて ナー', hint: 'カウント4つのあと、光る拍で叩く', seq: s('na na na na'), bpm: 70 },
    { id: 'u5s2', kind: 'rhythm', say: 'ダー ディン ディン ダー', seq: s('dha dhin dhin dha'), bpm: 70 },
    { id: 'u5s3', kind: 'rhythm', say: '8拍 つづけて', seq: s('dha dhin dhin dha dha dhin dhin dha'), bpm: 80 },
  ] },
  { id: 'u6', name: 'ティーンタール', icon: '👑', badge: 'ターラ入門', badgeIcon: '👑', steps: [
    { id: 'u6s1', kind: 'sam', say: '1拍目（サム）で タップ', hint: '16拍で1周。赤い丸＝サム', bpm: 90, rounds: 3 },
    { id: 'u6s2', kind: 'rhythm', say: '後半は 低音がぬける', hint: 'ディン→ティン、ダー→ナー', seq: s('dha tin tin na na dhin dhin dha'), bpm: 70 },
    { id: 'u6s3', kind: 'rhythm', say: '16拍 ぜんぶ', seq: s('dha dhin dhin dha dha dhin dhin dha dha tin tin na na dhin dhin dha'), bpm: 72 },
  ] },
];
export const FINAL_BADGE = { name: 'タブラー修了', icon: '🏆' };

// ---------- 進み具合の保存（この端末の中だけ） ----------
const KEY = 'tablalab.progress.v1';
export interface Progress { stars: Record<string, number> }
export function loadProgress(): Progress {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.stars) return v; } catch { /* noop */ }
  return { stars: {} };
}
export function saveProgress(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* noop */ } }
export const unitDone = (p: Progress, u: Unit) => u.steps.every((st) => (p.stars[st.id] || 0) > 0);
export const allDone = (p: Progress) => UNITS.every((u) => unitDone(p, u));
/** 次にやるステップ（順番に開放） */
export function nextStep(p: Progress): { unit: Unit; step: Step } | null {
  for (const u of UNITS) for (const st of u.steps) if (!(p.stars[st.id] > 0)) return { unit: u, step: st };
  return null;
}
export function isUnlocked(p: Progress, stepId: string) {
  const flat = UNITS.flatMap((u) => u.steps);
  const i = flat.findIndex((x) => x.id === stepId);
  return i <= 0 || (p.stars[flat[i - 1].id] || 0) > 0 || (p.stars[stepId] || 0) > 0;
}
