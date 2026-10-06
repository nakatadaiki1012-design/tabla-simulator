/**
 * タブラーの代表的な作品形式の演奏例
 * - ティーンタールのテーカは伝統的な形。それ以外は各流派のスタイルにならった「このアプリのオリジナル作曲」で、
 *   特定の演奏家の録音や作品を再現したものではない。
 * - どの曲も1周がちょうど16拍になるよう、拍の格子（グリッド）の上に並べてある（くり返してもサムがずれない）。
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


// ---------------------------------------------------------------------------
// 1拍ずつ書いた譜から、正確な長さの手順を作る
//   beats: 1要素＝1拍。空白区切りで等分（"Dha Ge Te Te" は1拍に4つ）
//   "S" はのばす（前の音の長さに足す）、"TRKT" は Ti-Re-Ki-Ta の4つ打ち
// ---------------------------------------------------------------------------
const TOK: Record<string, { bol: BolKey; label: string; dev: string; drum: 'dayan' | 'bayan' | 'both'; key: string }> = {
  Dha: { bol: 'dha', label: 'Dha', dev: 'धा', drum: 'both', key: 'Space' },
  DHA: { bol: 'dha', label: 'DHA!', dev: 'धा', drum: 'both', key: 'Space' },
  Dhin: { bol: 'dhin', label: 'Dhin', dev: 'धिन्', drum: 'both', key: 'G' },
  Ge: { bol: 'ge', label: 'Ge', dev: 'गे', drum: 'bayan', key: 'A' },
  Ghe: { bol: 'meend', label: 'Ghe↑', dev: 'घे', drum: 'bayan', key: 'S' },
  Ke: { bol: 'ke', label: 'Ke', dev: 'के', drum: 'bayan', key: 'D' },
  Na: { bol: 'na', label: 'Na', dev: 'ना', drum: 'dayan', key: 'J' },
  Ta: { bol: 'na', label: 'Ta', dev: 'ता', drum: 'dayan', key: 'J' },
  Tin: { bol: 'tin', label: 'Tin', dev: 'तिन', drum: 'dayan', key: 'K' },
  Te: { bol: 'te', label: 'Te', dev: 'ते', drum: 'dayan', key: ';' },
  Ti: { bol: 'te', label: 'Ti', dev: 'ति', drum: 'dayan', key: ';' },
  Re: { bol: 're', label: 'Re', dev: 'र', drum: 'dayan', key: 'U' },
  Ki: { bol: 'ke', label: 'Ki', dev: 'कि', drum: 'bayan', key: 'D' },
};
function fromBeats(bpm: number, beats: string[], khali: number[] = []): PerformanceStep[] {
  const beatMs = 60000 / bpm, out: PerformanceStep[] = [];
  beats.forEach((b, bi) => {
    const toks = b.trim().split(/\s+/).flatMap((t) => (t === 'TRKT' ? ['Ti', 'Re', 'Ki', 'Te'] : [t]));
    const d = beatMs / toks.length;
    toks.forEach((t, k) => {
      if (t === 'S') { if (out.length) out[out.length - 1].durationMs += d; return; }
      const m = TOK[t];
      out.push({
        bol: m.bol, label: m.label, devanagari: m.dev, durationMs: d, drum: m.drum, shortcut: m.key,
        ...(t === 'Ghe' ? { bend: 1.9 } : {}),
        ...(bi === 0 && k === 0 ? { isSam: true, description: '第1拍 サム' } : {}),
        ...(k === 0 && khali.includes(bi + 1) ? { isKhali: true, description: `第${bi + 1}拍 カーリー` } : {}),
      });
    });
  });
  return out;
}

export const AUTO_PERFORMANCES: AutoPerformance[] = [
  // =========================================================================
  // 1. パンジャーブ流派スタイルのレラ（オリジナル）
  // =========================================================================
  {
    id: 'punjab_rela_zakir',
    title: 'Punjab-style Rela (app original)',
    titleJa: 'パンジャーブ流派スタイルのレラ（高速の連打）',
    masterArtist: 'パンジャーブ流派のスタイル（このアプリのオリジナル作曲）',
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
      'レラ（激流）は、細かい音を途切れなく連ねる高速の曲。パンジャーブ流派は、開いた低音「Dha Ge」と、指を回すような「Te Te」の連打を得意とします。',
    structureNotes:
      '前半8拍：低音あり（Dha Ge Te Te）→ 後半8拍：9拍目から低音を抜き（Ta Ke Te Te）、13拍目で低音が戻ってサムへ。',
    learningPoint:
      '左手の「Ge」がリズムの骨格を支え、右手の「Te-Te」が流れるようなレガートを作る「左右交互打撃」の極致です。',
    steps: fromBeats(156, [
      'Dha Ge Te Te', 'Dha Ge Te Te', 'Dha Ti Dha Ge', 'Na Ti Ke Na',
      'Dha Ge Te Te', 'Dha Ge Te Te', 'TRKT', 'Tin Na Ke Na',
      'Ta Ke Te Te', 'Ta Ke Te Te', 'Ta Ti Ta Ke', 'Na Ti Ke Na',
      'Dha Ge Te Te', 'Dha Ge Te Te', 'TRKT', 'Dhin Na Ge Na',
    ], [9]),
  },

  // =========================================================================
  // 2. デリー流派スタイルのカイダ（オリジナル）
  // =========================================================================
  {
    id: 'delhi_kayda_gameh',
    title: 'Delhi-style Kayda (app original)',
    titleJa: 'デリー流派スタイルのカイダ（主題と変奏）',
    masterArtist: 'デリー流派のスタイル（このアプリのオリジナル作曲）',
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
  // 3. ベナレス流派スタイルのトゥクラ（オリジナル）
  // =========================================================================
  {
    id: 'benares_tukra_kishan',
    title: 'Benares-style Tukra (app original)',
    titleJa: 'ベナレス流派スタイルのトゥクラ（決めの曲）',
    masterArtist: 'ベナレス流派のスタイル（このアプリのオリジナル作曲）',
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
      'トゥクラは1周期ほどの短い決めの曲。ベナレス流派らしい力強い低音とゲー↑（手首で音程を上げる）を使い、最後はティハーイーでサムに着地します。',
    structureNotes:
      '1〜11拍：主題 → 12〜16拍：「TiReKiTa Dha」を3回くり返すティハーイー。3回目の Dha が次の周期の1拍目（サム）に重なる。',
    learningPoint:
      'ベナレス流派ならではの豪快な低音の共鳴と、最後の「Dha!」の劇的な瞬間を体感してください。',
    steps: fromBeats(98, [
      'Dha Ge', 'TRKT', 'Dha Ge', 'Na Dha', 'Ghe S', 'Na Ke', 'TRKT', 'Dha S',
      'Dha Ge', 'Na Ke', 'Dha S',
      // ティハーイー：「TiReKiTa Dha」を3回。3回目の Dha が次の周期のサムに着地
      'TRKT', 'Dha S', 'TRKT', 'Dha S', 'TRKT',
    ]),
  },

  // =========================================================================
  // 4. Teental Traditional Theka (16 beats foundational cosmos)
  // =========================================================================
  {
    id: 'teental_theka',
    title: 'Teental Traditional Theka (Classical Foundation)',
    titleJa: 'ティンタール・伝統基本テーカ（北インド音楽の王道16拍）',
    masterArtist: '伝統的な形（ティーンタールの標準的なテーカ）',
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
  // 5. ファルッカーバード流派スタイルのペシュカール（オリジナル）
  // =========================================================================
  {
    id: 'farrukhabad_peshkar',
    title: 'Farrukhabad-style Peshkar (app original)',
    titleJa: 'ファルッカーバード流派スタイルのペシュカール（導入）',
    masterArtist: 'ファルッカーバード流派のスタイル（このアプリのオリジナル作曲）',
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
      'ペシュカールは独奏の幕開けに置かれる、ゆったりした即興的な曲。音と音の間（ま）を生かし、開放音を中心に空間を探るように始まります。',
    structureNotes:
      '前半8拍：低音あり → 後半8拍：9拍目から低音を抜いて軽く（Tin・Ta）、13拍目で戻ってサムへ。',
    learningPoint:
      '音符の多さではなく、一打一打の余韻（サステイン）と手首の柔らかな圧力変化を味わってください。',
    steps: fromBeats(66, [
      'Dhin S', 'Dha Dhin', 'Dha Dha', 'Tin S', 'Dha S', 'Ghe S', 'Dhin Dha', 'Tin Na',
      'Tin S', 'Ta Tin', 'Ta Ta', 'Tin S', 'Dha S', 'TRKT', 'Dhin Dha', 'Dhin Na',
    ], [9]),
  },

  // =========================================================================
  // 6. クライマックスとティハーイー（オリジナル）
  // =========================================================================
  {
    id: 'concert_climax_jhala',
    title: 'Climax with Tihai (app original)',
    titleJa: 'クライマックスとティハーイー',
    masterArtist: '演奏の終盤を想定した例（このアプリのオリジナル作曲）',
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
      '演奏の最後の盛り上がりを想定した速い曲。Dha と TiReKiTa の連打で高まり、最後はティハーイーでサムに着地して締めくくります。',
    structureNotes:
      '1〜12拍：Dha と TiReKiTa の連打 → 13〜16拍：「TiReKiTa DHA」を3回くり返すティハーイー。3回目の DHA が次の周期のサムに重なる。',
    learningPoint:
      '超高速の中でも一切崩れない左手と右手の同期（シンクロナイゼーション）を体感してください。',
    steps: fromBeats(172, [
      'Dha S Dha S', 'TRKT', 'Dha S Dha S', 'TRKT', 'Dha Ge Na Dha', 'TRKT', 'Dha Ge Na Dha', 'TRKT',
      'Dha Ge Na Dha', 'TRKT', 'Dha Ge Na Dha', 'Dha S TRKT',
      // ティハーイー：「TiReKiTa DHA」を3回。3回目の DHA が次の周期のサムに着地
      'DHA S S S', 'TRKT', 'DHA S S S', 'TRKT',
    ]),
  },
];
