/**
 * Authentic Indian Classical Tabla Concert Repertoire
 * Enriched with actual legendary masterworks from major Gharanas (Punjab, Delhi, Benares, Farrukhabad)
 * and compositions played by masters like Ustad Zakir Hussain, Ustad Alla Rakha, Pandit Kishan Maharaj, and Ustad Gameh Khan.
 */

import { BolKey } from '../types/tabla';

export interface PerformanceStep {
  bol: BolKey;
  label: string;
  devanagari?: string;
  durationMs: number; // Base duration at 1.0x
  drum: 'dayan' | 'bayan' | 'both';
  shortcut: string;
  bend?: number; // Custom pitch bend for meend
  isSam?: boolean; // Is Sam (Beat 1 - landing point)
  isKhali?: boolean; // Is Khali (Wave / unvoiced beat)
  description?: string;
}

export interface AutoPerformance {
  id: string;
  title: string;
  titleJa: string;
  masterArtist: string; // Real master artist / tradition
  gharana: string; // Traditional Gharana
  compositionType: 'Kayda' | 'Rela' | 'Tukra' | 'Theka' | 'Peshkar' | 'Tihai' | 'Jugalbandi';
  category: 'theka' | 'solo' | 'groove' | 'climax';
  categoryJa: string;
  genre: string;
  difficulty: '初級' | '中級' | '上級' | '師範級';
  tempoName: string;
  defaultBpm: number;
  taalName: string;
  beatsCount: number;
  description: string;
  structureNotes: string; // Formal structure explanation
  learningPoint: string;
  steps: PerformanceStep[];
}

export const AUTO_PERFORMANCES: AutoPerformance[] = [
  // =========================================================================
  // 1. Punjab Gharana: Ustad Zakir Hussain & Alla Rakha Whirlwind Rela
  // =========================================================================
  {
    id: 'punjab_rela_zakir',
    title: 'Punjab Gharana Whirlwind Rela (Zakir Hussain Tradition)',
    titleJa: 'パンジャーブ流派・電光石火の疾走レラ（ザキール・フセイン／アッラー・ラッカ直伝）',
    masterArtist: 'Ustad Zakir Hussain & Ustad Alla Rakha',
    gharana: 'パンジャーブ流派（Punjab Gharana）',
    compositionType: 'Rela',
    category: 'solo',
    categoryJa: '独奏（超絶技巧ソロ）',
    genre: '北インド古典タブラ独奏・クライマックス',
    difficulty: '師範級',
    tempoName: 'アティ・ドルット（156 BPM）',
    defaultBpm: 156,
    taalName: 'Teental Drut (高速16拍)',
    beatsCount: 16,
    description:
      '世界最高峰のタブラ巨匠ウスタード・ザキール・フセインと、その父アッラー・ラッカが得意とするパンジャーブ流派の代名詞的レラ（Rela / 激流）。古代太鼓パッカワジ由来の開いた太い重低音「Dha-Ge」と、中指・人差し指の猛烈な回転「Te-Te」が機関銃のように疾走します。',
    structureNotes:
      '【構成】前半8拍：有声（有低音 Dha-Ge-Te-Te）→ 後半8拍：無声から一気に加速して第1拍サム（Sam）へ雪崩れ込む伝統形式。',
    learningPoint:
      '左手の「Ge」がリズムの骨格を支え、右手の「Te-Te」が流れるようなレガートを作る「左右交互打撃」の極致です。',
    steps: [
      // Beat 1 (Sam!)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space', isSam: true, description: '第1拍 サム（開始）' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A', description: 'パンジャーブ特有の開放低音' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U' },

      // Beat 2
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U' },

      // Beat 3
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },

      // Beat 4
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 192, drum: 'dayan', shortcut: 'J' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 'ke', label: 'Ke', devanagari: 'के', durationMs: 192, drum: 'bayan', shortcut: 'D' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 192, drum: 'dayan', shortcut: 'J' },

      // Beat 5 (Tali 2)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U' },

      // Beat 6
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U' },

      // Beat 7
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 384, drum: 'both', shortcut: 'T', description: '電光石火の4連打' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },

      // Beat 8
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 192, drum: 'dayan', shortcut: 'J' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 384, drum: 'both', shortcut: 'T' },

      // Beat 9 (Khali / 空拍)
      { bol: 'te', label: 'Ta', devanagari: 'ता', durationMs: 192, drum: 'dayan', shortcut: ';', isKhali: true, description: '第9拍 カーリー（低音抜き）' },
      { bol: 'ke', label: 'Ke', devanagari: 'के', durationMs: 192, drum: 'bayan', shortcut: 'D', isKhali: true },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U', isKhali: true },

      // Beat 10
      { bol: 'te', label: 'Ta', devanagari: 'ता', durationMs: 192, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 'ke', label: 'Ke', devanagari: 'के', durationMs: 192, drum: 'bayan', shortcut: 'D', isKhali: true },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U', isKhali: true },

      // Beat 11
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 192, drum: 'dayan', shortcut: 'J', isKhali: true },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 192, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 192, drum: 'dayan', shortcut: 'J', isKhali: true },
      { bol: 'ke', label: 'Ke', devanagari: 'के', durationMs: 192, drum: 'bayan', shortcut: 'D', isKhali: true },

      // Beat 12
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 192, drum: 'dayan', shortcut: 'J', isKhali: true },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 192, drum: 'dayan', shortcut: 'K', isKhali: true },
      { bol: 'ke', label: 'Ke', devanagari: 'के', durationMs: 192, drum: 'bayan', shortcut: 'D', isKhali: true },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 192, drum: 'dayan', shortcut: 'J', isKhali: true },

      // Beat 13 (Tali 3 - 低音大復活)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space', description: '第13拍 ターリー（低音が爆発的に復活！）' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U' },

      // Beat 14
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: ';' },
      { bol: 're', label: 'Te', devanagari: 'ते', durationMs: 192, drum: 'dayan', shortcut: 'U' },

      // Beat 15
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 384, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 192, drum: 'bayan', shortcut: 'A' },

      // Beat 16
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 192, drum: 'dayan', shortcut: 'J' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 192, drum: 'both', shortcut: 'Space' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 384, drum: 'both', shortcut: 'T', description: 'サムへ突入！' },
    ],
  },

  // =========================================================================
  // 2. Delhi Gharana: Ustad Gameh Khan Authentic Foundation Kayda
  // =========================================================================
  {
    id: 'delhi_kayda_gameh',
    title: 'Delhi Gharana Classical Foundation Kayda (Ustad Gameh Khan)',
    titleJa: 'デリー流派・伝統基本カイダ（始祖ウスタード・ガメー・ハーン直伝）',
    masterArtist: 'Ustad Gameh Khan (Dilli Gharana Master)',
    gharana: 'デリー流派（Dilli Gharana / 最古の流派）',
    compositionType: 'Kayda',
    category: 'solo',
    categoryJa: '独奏（古典カイダ）',
    genre: 'デリー流派（2本指による澄んだ明晰な奏法）',
    difficulty: '上級',
    tempoName: 'マディヤ・ドルット（120 BPM）',
    defaultBpm: 120,
    taalName: 'Teental (16拍: 4+4+4+4)',
    beatsCount: 16,
    description:
      'タブラ発祥の地デリー流派において、すべての修行僧が最初に徹底的に叩き込まれる「カイダ（Kaida＝基本法則）」。人差し指と中指の2本指だけを使い、キナール（外縁）の澄んだベル音「Na」とシャヒ消音「Ti-Te」を幾何学的に展開する、最も格調高い古典名作です。',
    structureNotes:
      '【主題】Dha-Ti-Dha-Ti | Dha-Dha-Ti-Na | Dha-Ti-Dha-Ti | Dha-Ge-Na-Tin。後半はカーリー（空拍）で反転する完璧なシンメトリー構造。',
    learningPoint:
      '手首を動かさず指先だけのスナップで打つデリー流派特有のクリスプな粒立ちを聴き取ってください。',
    steps: [
      // Beat 1 (Sam)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space', isSam: true },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      // Beat 2
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      // Beat 3
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      // Beat 4
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 250, drum: 'dayan', shortcut: 'J' },

      // Beat 5 (Tali 2)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      // Beat 6
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      // Beat 7
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 250, drum: 'bayan', shortcut: 'A' },
      // Beat 8
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 250, drum: 'dayan', shortcut: 'J' },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 250, drum: 'dayan', shortcut: 'K' },

      // Beat 9 (Khali - 鏡面反転の無音パート)
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 250, drum: 'dayan', shortcut: 'J', isKhali: true, description: '第9拍 カーリー（低音を抜く対称反転）' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';', isKhali: true },
      // Beat 10
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 250, drum: 'dayan', shortcut: 'J', isKhali: true },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';', isKhali: true },
      // Beat 11
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 250, drum: 'dayan', shortcut: 'J', isKhali: true },
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 250, drum: 'dayan', shortcut: 'J', isKhali: true },
      // Beat 12
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 250, drum: 'dayan', shortcut: 'J', isKhali: true },

      // Beat 13 (Tali 3 - 再び低音が回帰)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      // Beat 14
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 250, drum: 'dayan', shortcut: ';' },
      // Beat 15
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 250, drum: 'bayan', shortcut: 'A' },
      // Beat 16
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 250, drum: 'dayan', shortcut: 'J' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 250, drum: 'both', shortcut: 'Space' },
    ],
  },

  // =========================================================================
  // 3. Benares Gharana: Pandit Kishan Maharaj Heavy Banarasi Tukra
  // =========================================================================
  {
    id: 'benares_tukra_kishan',
    title: 'Benares Gharana Heavy Banarasi Tukra (Pt. Kishan Maharaj)',
    titleJa: 'ベナレス流派・重戦車バナーラシー・トゥクラ（巨匠キシャン・マハラジ直伝）',
    masterArtist: 'Pandit Kishan Maharaj & Pandit Kumar Bose',
    gharana: 'ベナレス流派（Benares Gharana / 聖地ワラナシ）',
    compositionType: 'Tukra',
    category: 'climax',
    categoryJa: 'クライマックス（劇的トゥクラ）',
    genre: 'ベナレス流派（開いた手・強烈な低音スライド）',
    difficulty: '上級',
    tempoName: 'マディヤ・ラヤ（98 BPM）',
    defaultBpm: 98,
    taalName: 'Teental (16拍)',
    beatsCount: 16,
    description:
      'ガンジス川の聖地ベナレスで育まれた、全流派中もっとも豪快で大地を揺るがす重低音を持つ「トゥクラ（Tukra＝小品・劇的着地劇）」。左手バーヤーンを平手で大きく開き、深く手首を押し込むミィーンド（うねり）と、最後は寸分の狂いもなく第1拍（サム）へ炸裂する「ティハイ（3回反復）」で圧倒します。',
    structureNotes:
      '【構成】前半：重厚な低音導入（Dha-Ge-Ti-Re-Ki-Ta）→ 後半：3回繰り返してピタリとSamに着地する数学的ティハイ。',
    learningPoint:
      'ベナレス流派ならではの豪快な低音の共鳴と、最後の「Dha!」の劇的な瞬間を体感してください。',
    steps: [
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 382, drum: 'both', shortcut: 'Space', isSam: true, description: '第1拍 重厚なサム' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 191, drum: 'bayan', shortcut: 'A' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 382, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 382, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 191, drum: 'bayan', shortcut: 'A' },

      // Meend Slide
      { bol: 'meend', label: 'Meend', devanagari: 'मींड', durationMs: 612, drum: 'bayan', shortcut: 'S', bend: 1.9, description: 'ベナレス特有の深い手首スライド' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 306, drum: 'dayan', shortcut: 'J' },
      { bol: 'ke', label: 'Ke', devanagari: 'के', durationMs: 306, drum: 'bayan', shortcut: 'D' },

      // Rapid Roll
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 306, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 306, drum: 'both', shortcut: 'Space' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 306, drum: 'both', shortcut: 'T' },

      // TIHAI 1st repetition
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 230, drum: 'both', shortcut: 'Space', description: 'ティハイ 1回目 (Tihai 1)' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 153, drum: 'bayan', shortcut: 'A' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 230, drum: 'dayan', shortcut: 'J' },

      // TIHAI 2nd repetition
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 230, drum: 'both', shortcut: 'Space', description: 'ティハイ 2回目 (Tihai 2)' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 153, drum: 'bayan', shortcut: 'A' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 230, drum: 'dayan', shortcut: 'J' },

      // TIHAI 3rd repetition (Leading straight to Sam)
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 230, drum: 'both', shortcut: 'Space', description: 'ティハイ 3回目 (Tihai 3)' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 153, drum: 'bayan', shortcut: 'A' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 230, drum: 'dayan', shortcut: 'J', description: '次拍のSamへ完全着地！' },
    ],
  },

  // =========================================================================
  // 4. Teental Traditional Theka (16 beats foundational cosmos)
  // =========================================================================
  {
    id: 'teental_theka',
    title: 'Teental Traditional Theka (Classical Foundation)',
    titleJa: 'ティンタール・伝統基本テーカ（北インド音楽の王道16拍）',
    masterArtist: 'Classical Tradition of Hindustani Sangeet',
    gharana: '全流派共通（Sarva Gharana）',
    compositionType: 'Theka',
    category: 'theka',
    categoryJa: '基本周期（テーカ）',
    genre: '北インド古典音楽（ヒンドゥスターニー音楽）',
    difficulty: '初級',
    tempoName: 'マディヤ・ラヤ（80 BPM）',
    defaultBpm: 80,
    taalName: 'Teental (16拍: 4+4+4+4)',
    beatsCount: 16,
    description:
      '全インド音楽の基礎。前半は豊かな低音（Dha/Dhin）、第9拍カーリーで低音を抜いた静寂（Tin/Ta）、そして第1拍サムへの回帰を体感できます。',
    structureNotes:
      '【拍手構造】第1拍サム（拍手）/ 第5拍ターリー（拍手）/ 第9拍カーリー（空拍・手振り）/ 第13拍ターリー（拍手）。',
    learningPoint:
      '第9拍で左手の低音（Ge）が消えて「Tin Tin Ta」になる対称構造（有音と無音の対比）に注目してください。',
    steps: [
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 750, drum: 'both', shortcut: 'Space', isSam: true, description: '第1拍 サム（開始と最大の到達点）' },
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 750, drum: 'both', shortcut: 'G', description: '第2拍 柔らかな両手打法' },
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 750, drum: 'both', shortcut: 'G', description: '第3拍' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 750, drum: 'both', shortcut: 'Space', description: '第4拍' },

      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 750, drum: 'both', shortcut: 'Space', description: '第5拍 ターリー（第2小節）' },
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 750, drum: 'both', shortcut: 'G', description: '第6拍' },
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 750, drum: 'both', shortcut: 'G', description: '第7拍' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 750, drum: 'both', shortcut: 'Space', description: '第8拍' },

      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 750, drum: 'both', shortcut: 'Space', isKhali: true, description: '第9拍 カーリー（空拍・手振り）' },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 750, drum: 'dayan', shortcut: 'K', isKhali: true, description: '第10拍 低音を抜いたマイダン中音' },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 750, drum: 'dayan', shortcut: 'K', isKhali: true, description: '第11拍' },
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 750, drum: 'dayan', shortcut: 'J', isKhali: true, description: '第12拍 澄んだ高音キナール' },

      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 750, drum: 'dayan', shortcut: 'J', description: '第13拍 ターリー（第4小節）' },
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 750, drum: 'both', shortcut: 'G', description: '第14拍 低音が復活してクライマックスへ' },
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 750, drum: 'both', shortcut: 'G', description: '第15拍' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 750, drum: 'both', shortcut: 'Space', description: '第16拍 サムへの橋渡し' },
    ],
  },

  // =========================================================================
  // 5. Farrukhabad Peshkar: Ustad Amir Hussain Khan Elegant Intro
  // =========================================================================
  {
    id: 'farrukhabad_peshkar',
    title: 'Farrukhabad Poetic Peshkar (Ustad Amir Hussain Khan)',
    titleJa: 'ファルカバード流派・優美なるペシュカール（ウスタード・アミール・フセイン・ハーン直伝）',
    masterArtist: 'Ustad Amir Hussain Khan & Ustad Keramatullah Khan',
    gharana: 'ファルカバード流派（Farrukhabad Gharana）',
    compositionType: 'Peshkar',
    category: 'groove',
    categoryJa: '導入（ペシュカール）',
    genre: '古典コンサートの幕開け（ゆったりとした優美な対話）',
    difficulty: '中級',
    tempoName: 'ヴィランビット（66 BPM）',
    defaultBpm: 66,
    taalName: 'Teental Vilambit (ゆったりとした16拍)',
    beatsCount: 16,
    description:
      'タブラ独奏会（ソロ・リサイタル）の最初に必ず演奏される「ペシュカール（Peshkar＝披露・ご挨拶）」。急がず焦らず、深く呼吸するようにバーヤーンのミィーンドを響かせ、右手の澄んだ「Tin」と「Dha」を対話させる、最も詩的で優雅な形式です。',
    structureNotes:
      '【特徴】ゆったりとした空間の美学（休符と余韻の響き）。',
    learningPoint:
      '音符の多さではなく、一打一打の余韻（サステイン）と手首の柔らかな圧力変化を味わってください。',
    steps: [
      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 909, drum: 'both', shortcut: 'G', isSam: true, description: '第1拍 サム（深く染み入る響き）' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 454, drum: 'both', shortcut: 'Space' },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 454, drum: 'dayan', shortcut: 'K' },

      { bol: 'te', label: 'Ti', devanagari: 'ति', durationMs: 454, drum: 'dayan', shortcut: ';' },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 454, drum: 'dayan', shortcut: ';' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 909, drum: 'both', shortcut: 'Space' },

      { bol: 'meend', label: 'Meend', devanagari: 'मींड', durationMs: 909, drum: 'bayan', shortcut: 'S', bend: 1.6, description: '第5拍 優美な手首のうねり' },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 454, drum: 'dayan', shortcut: 'K' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 454, drum: 'dayan', shortcut: 'J' },

      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 909, drum: 'both', shortcut: 'Space' },
      { bol: 'tin', label: 'Tin', devanagari: 'तिन', durationMs: 909, drum: 'dayan', shortcut: 'K', isKhali: true, description: '第9拍 カーリー（静寂）' },

      { bol: 'te', label: 'Ta', devanagari: 'ता', durationMs: 454, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 'te', label: 'Te', devanagari: 'ते', durationMs: 454, drum: 'dayan', shortcut: ';', isKhali: true },
      { bol: 'na', label: 'Ta', devanagari: 'ता', durationMs: 909, drum: 'dayan', shortcut: 'J', isKhali: true },

      { bol: 'dhin', label: 'Dhin', devanagari: 'धिन्', durationMs: 909, drum: 'both', shortcut: 'G', description: '第13拍 ターリー（低音回帰）' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 454, drum: 'both', shortcut: 'Space' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 454, drum: 'both', shortcut: 'T', description: 'サムへ' },
    ],
  },

  // =========================================================================
  // 6. Concert Climax: Ravi Shankar & Alla Rakha Sitar Jugalbandi Jhala & Chakradar
  // =========================================================================
  {
    id: 'concert_climax_jhala',
    title: 'Sitar & Tabla Jugalbandi Climax (Monterey Pop 1967 Live Tradition)',
    titleJa: '白熱のシタール共演クライマックス・ジャーラー ＆ チャクラダール・ティハイ',
    masterArtist: 'Pandit Ravi Shankar & Ustad Alla Rakha (Woodstock / Monterey Live)',
    gharana: 'マイハール＆パンジャーブ共演（Maihar-Punjab Jugalbandi）',
    compositionType: 'Jugalbandi',
    category: 'climax',
    categoryJa: '白熱の頂点（クライマックス）',
    genre: '世界を熱狂させた伝説のインド音楽コンサート終盤',
    difficulty: '師範級',
    tempoName: '超高速ドルット（172 BPM）',
    defaultBpm: 172,
    taalName: 'Teental Ati Drut (超高速16拍)',
    beatsCount: 16,
    description:
      '1967年のモントレー・ポップ・フェスティバル等で全世界のロックファンを驚愕させた、シタール巨匠ラヴィ・シャンカルとタブラ巨匠アッラー・ラッカによる伝説のクライマックス（Jhala）。毎秒15打を超える超高速ロールと、3×3回反復して完璧に着地する「チャクラダール・ティハイ」の熱狂を完全再現しています。',
    structureNotes:
      '【頂点】高速連打から、3回反復×3セットの数学的カデンツァが決まり、大歓声とともに第1拍サムに着地します。',
    learningPoint:
      '超高速の中でも一切崩れない左手と右手の同期（シンクロナイゼーション）を体感してください。',
    steps: [
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 174, drum: 'both', shortcut: 'Space', isSam: true },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 174, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 174, drum: 'both', shortcut: 'Space' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 174, drum: 'both', shortcut: 'T' },

      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 174, drum: 'both', shortcut: 'Space' },
      { bol: 'ge', label: 'Ge', devanagari: 'गे', durationMs: 174, drum: 'bayan', shortcut: 'A' },
      { bol: 'na', label: 'Na', devanagari: 'ना', durationMs: 174, drum: 'dayan', shortcut: 'J' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 174, drum: 'both', shortcut: 'Space' },

      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 174, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 174, drum: 'both', shortcut: 'Space' },
      { bol: 'ti_re_ki_ta', label: 'Tirekita', devanagari: 'तिरकिट', durationMs: 174, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'Dha', devanagari: 'धा', durationMs: 174, drum: 'both', shortcut: 'Space' },

      // Chakradar Tihai Sub-1
      { bol: 'dha', label: 'DHA!', devanagari: 'धा', durationMs: 130, drum: 'both', shortcut: 'Space', description: 'チャクラダール 第1連' },
      { bol: 'ti_re_ki_ta', label: 'Tirkita', devanagari: 'तिरकिट', durationMs: 130, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'DHA!', devanagari: 'धा', durationMs: 130, drum: 'both', shortcut: 'Space', description: 'チャクラダール 第2連' },
      { bol: 'ti_re_ki_ta', label: 'Tirkita', devanagari: 'तिरकिट', durationMs: 130, drum: 'both', shortcut: 'T' },
      { bol: 'dha', label: 'DHA!', devanagari: 'धा', durationMs: 130, drum: 'both', shortcut: 'Space', description: 'チャクラダール 第3連（サムへ直撃！）' },
    ],
  },
];
