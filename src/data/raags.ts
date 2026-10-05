/**
 * ラーガ（旋律の型）のデータと、サルガム（インドの階名）表記の読み取り
 * 上行・下行・パカド・時間帯・情感は一般に知られている形にもとづく（流派により細部は異なる）
 */

export interface Raag {
  id: string;
  name: string;
  notes: number[]; // サからの半音（1オクターブ内）
  thaat: string;
  aroha: string;
  avaroha: string;
  pakad: string;
  vadi: string;
  samvadi: string;
  time: string;
  mood: string;
  desc: string;
}

export const RAAGS: Raag[] = [
  { id: 'yaman', name: 'ヤマン（Yaman）', notes: [0, 2, 4, 6, 7, 9, 11], thaat: 'カリヤーン',
    aroha: "N. R G M# D N S'", avaroha: "S' N D P M# G R S", pakad: 'N. R G - R S - N. R S - P M# G R - S -',
    vadi: 'Ga（ガ）', samvadi: 'Ni（ニ）', time: '夜のはじめ（18〜21時ごろ）', mood: '穏やか・優美・祈り',
    desc: '最初に習うことが多い代表的なラーガ。半音高いマ（ティーヴラ・マ）が明るく上品な響きを作る。' },
  { id: 'bhairav', name: 'バイラヴ（Bhairav）', notes: [0, 1, 4, 5, 7, 8, 11], thaat: 'バイラヴ',
    aroha: "S r G M P d N S'", avaroha: "S' N d P M G r S", pakad: 'S G M d~P - d~P - G M r~S - S -',
    vadi: 'dha（コーマル・ダ）', samvadi: 're（コーマル・レ）', time: '夜明け（早朝）', mood: '荘厳・敬虔・瞑想',
    desc: '夜明けのラーガ。半音低いレとダを、ゆらすようにゆっくり弾くのが特徴。' },
  { id: 'kafi', name: 'カーフィー（Kafi）', notes: [0, 2, 3, 5, 7, 9, 10], thaat: 'カーフィー',
    aroha: "S R g M P D n S'", avaroha: "S' n D P M g R S", pakad: 'S S R R g g M M P -',
    vadi: 'Pa（パ）', samvadi: 'Sa（サ）', time: '深夜／春（ホーリー祭の歌）', mood: '叙情的・甘く切ない',
    desc: '半音低いガとニを使う。民謡や軽い古典歌曲でも親しまれる。' },
  { id: 'bhupali', name: 'ブーパーリー（Bhupali）', notes: [0, 2, 4, 7, 9], thaat: 'カリヤーン',
    aroha: "S R G P D S'", avaroha: "S' D P G R S", pakad: 'G R S D. - S R G - P G - D P G R S -',
    vadi: 'Ga（ガ）', samvadi: 'Dha（ダ）', time: '夕方〜夜のはじめ', mood: '平和・明朗・敬虔',
    desc: 'マとニを使わない5音のラーガ。シンプルだからこそ音と音の間の表現が大切。' },
  { id: 'malkauns', name: 'マールカウンス（Malkauns）', notes: [0, 3, 5, 8, 10], thaat: 'バイラヴィー',
    aroha: "S g M d n S'", avaroha: "S' n d M g S", pakad: 'M g M d n d M - g M g S -',
    vadi: 'Ma（マ）', samvadi: 'Sa（サ）', time: '深夜', mood: '瞑想的・神秘的・重厚',
    desc: 'レとパを使わない5音のラーガ。深夜の静けさの中で低音域からゆっくり展開される。' },
  { id: 'kirwani', name: 'キルワーニー（Kirwani）', notes: [0, 2, 3, 5, 7, 8, 11], thaat: '（南インド由来）',
    aroha: "S R g M P d N S'", avaroha: "S' N d P M g R S", pakad: "P d N S' - N d P - M g R S -",
    vadi: 'Pa（パ）', samvadi: 'Sa（サ）', time: '夜', mood: '哀愁・ロマンティック',
    desc: '南インド音楽から取り入れられたラーガ。西洋の和声的短音階と同じ音で、どこか哀しく情熱的。' },
];

const SARGAM: Record<string, number> = { S: 0, r: 1, R: 2, g: 3, G: 4, M: 5, 'M#': 6, P: 7, d: 8, D: 9, n: 10, N: 11 };
const INFO: Record<number, [string, string]> = {
  0: ['Sa', 'サ'], 1: ['re', 'レ(コーマル)'], 2: ['Re', 'レ'], 3: ['ga', 'ガ(コーマル)'], 4: ['Ga', 'ガ'], 5: ['Ma', 'マ'],
  6: ['Ma′', 'マ(ティーヴラ)'], 7: ['Pa', 'パ'], 8: ['dha', 'ダ(コーマル)'], 9: ['Dha', 'ダ'], 10: ['ni', 'ニ(コーマル)'], 11: ['Ni', 'ニ'],
};

/** 半音 → 表示名（低いオクターブは「.」、高いオクターブは「'」） */
export function swaraName(semi: number) {
  const pc = ((semi % 12) + 12) % 12, oct = Math.floor(semi / 12);
  const [rom, kana] = INFO[pc];
  const mark = oct < 0 ? '.'.repeat(-oct) : oct > 0 ? "'".repeat(oct) : '';
  return { rom: rom + mark, kana: kana.replace(/\(.*\)/, ''), full: kana, low: oct < 0, high: oct > 0 };
}

/** "N. R G - R ~S" のようなサルガム表記を解析。- はのばす、A~B は A から B へミーンド */
export function parseSargam(str: string): { semi: number; to: number | null; len: number }[] {
  const out: { semi: number; to: number | null; len: number }[] = [];
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '-') { if (out.length) out[out.length - 1].len += 1; continue; }
    const semis = tok.split('~').map((p) => {
      const m = p.match(/^(M#|[SrRgGMPdDnN])([.']*)$/);
      if (!m) return null;
      let s = SARGAM[m[1]];
      for (const ch of m[2]) s += ch === '.' ? -12 : 12;
      return s;
    });
    if (semis.some((s) => s == null)) continue;
    out.push({ semi: semis[0]!, to: semis.length > 1 ? semis[semis.length - 1]! : null, len: 1 });
  }
  return out;
}

/** ラーガの音を低音から高音まで並べた「はしご」（主弦の開放＝低いマ の上から 2 オクターブ上のサまで） */
export const OPEN_STRING = -7;
export function ladderOf(r: Raag) {
  const ladder: number[] = [];
  for (let s = OPEN_STRING + 1; s <= 24; s++) if (r.notes.includes(((s % 12) + 12) % 12)) ladder.push(s);
  return ladder;
}
export function tarafOf(r: Raag) {
  const t: number[] = [];
  for (let s = 11; s <= 28 && t.length < 13; s++) if (r.notes.includes(s % 12)) t.push(s);
  return t;
}
