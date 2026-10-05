import { BolInfo, TaalDefinition, ClassroomLesson } from '../types/tabla';

export const BOLS_LIST: BolInfo[] = [
  // Dayan (Right Hand)
  {
    id: 'na',
    name: 'Na (Ta)',
    devanagari: 'ना / ता',
    drum: 'dayan',
    zone: 'キナール（外周縁）',
    finger: '人差し指（薬指でシャヒ縁を軽くミュート）',
    description: 'キナール（外縁）を人差し指で打ち、薬指でシャヒ縁を抑えることで基本振動をカットし、澄んだ高い金属的な倍音（ベルのような音）を響かせます。',
    shortcut: 'J',
    frequencyType: 'harmonic',
  },
  {
    id: 'tin',
    name: 'Tin',
    devanagari: 'तिन',
    drum: 'dayan',
    zone: 'マイダン（中間皮）',
    finger: '人差し指（薬指で軽く触れる）',
    description: 'シャヒとキナールの間にある「マイダン（白い中間部）」を人差し指の腹で柔らかく打ちます。Naよりも丸みのある優しい響きです。',
    shortcut: 'K',
    frequencyType: 'harmonic',
  },
  {
    id: 'tun',
    name: 'Tun',
    devanagari: 'तुन',
    drum: 'dayan',
    zone: 'シャヒ（黒い円）中央',
    finger: '人差し指（消音なし開放）',
    description: '薬指でミュートせず、シャヒ中央を人差し指で弾くように打ちます。シャヒの重みによる基本振動が鐘のように長く豊かに響き渡ります。',
    shortcut: 'L',
    frequencyType: 'fundamental',
  },
  {
    id: 'te',
    name: 'Te (Ti)',
    devanagari: 'ते / ति',
    drum: 'dayan',
    zone: 'シャヒ中央',
    finger: '中指・薬指（密着消音）',
    description: 'シャヒの中央を中指・薬指を揃えてペタッと叩きつけ、振動を即座に殺す「消音（クローズド）ストローク」です。乾いた木の音がします。',
    shortcut: ';',
    frequencyType: 'damped',
  },
  {
    id: 're',
    name: 'Re',
    devanagari: 'रे',
    drum: 'dayan',
    zone: 'シャヒ中央',
    finger: '人差し指（密着消音）',
    description: 'Teに続けて人差し指でシャヒを叩きつける消音ストロークです。Te-Reの交互連打（ティレキタなど）で超高速リズムを生み出します。',
    shortcut: 'U',
    frequencyType: 'damped',
  },

  // Bayan (Left Hand)
  {
    id: 'ge',
    name: 'Ge (Ghe)',
    devanagari: 'गे / घे',
    drum: 'bayan',
    zone: 'マイダン（外周〜中間）',
    finger: '中指・人差し指（手首の付け根を皮に乗せる）',
    description: '手首の付け根（掌底）を皮の手前側に軽く休ませ、指先で開放的に打ちます。壺状の金属胴が共鳴し、深みのある低音（約70〜90Hz）が響きます。',
    shortcut: 'A',
    frequencyType: 'bass',
  },
  {
    id: 'meend',
    name: 'Meend (Ghissa)',
    devanagari: 'मींड',
    drum: 'bayan',
    zone: '掌底スライド＋指打ち',
    finger: '手首の付け根を前方にスライド（ピッチベンド）',
    description: '打った直後に手首の付け根をシャヒ方向へ押し滑らせて皮の張力を高め、音程を「グィーン」と滑らかに持ち上げるタブラー最大の魅力技です。',
    shortcut: 'S',
    frequencyType: 'bass_bend',
  },
  {
    id: 'ke',
    name: 'Ke (Ka)',
    devanagari: 'के / क',
    drum: 'bayan',
    zone: 'バーヤーン打面全体',
    finger: '左手手のひら全体（フラット密着消音）',
    description: '左手の指と掌全体をバーヤーンの皮にパタッと平手打ちし、振動を完全に止める無共鳴のストロークです。リズムの切れ味を作ります。',
    shortcut: 'D',
    frequencyType: 'percussive',
  },

  // Combinations (Both Hands)
  {
    id: 'dha',
    name: 'Dha',
    devanagari: 'धा',
    drum: 'both',
    zone: '両手同時（Na + Ge）',
    finger: '右：人差し指キナール ＋ 左：低音Ge',
    description: 'タブラーの代名詞！澄んだ高音「Na」と深い低音「Ge」が同時に鳴る、最も力強く華やかな複合音です。',
    shortcut: 'Space',
    isCombo: true,
    frequencyType: 'harmonic',
  },
  {
    id: 'dhin',
    name: 'Dhin',
    devanagari: 'धिन्',
    drum: 'both',
    zone: '両手同時（Tin + Ge）',
    finger: '右：マイダンTin ＋ 左：低音Ge',
    description: 'マイダンを打つ柔らかな「Tin」と低音「Ge」が合わさった、温かく歌うような優雅な複合音です。',
    shortcut: 'G',
    isCombo: true,
    frequencyType: 'harmonic',
  },
  {
    id: 'ti_re_ki_ta',
    name: 'Tirekita',
    devanagari: 'तिरकिट',
    drum: 'both',
    zone: '連続技（Te-Re-Ke-Ta）',
    finger: '右Te → 右Re → 左Ke → 右Ta の超速連打',
    description: 'インド打楽器を代表する超絶技巧フレーズ。4つの音を素早く連続で打ち鳴らし、機関銃のようなリズムの波を作ります。',
    shortcut: 'T',
    isCombo: true,
    frequencyType: 'percussive',
  },
];

export const TAAL_LIST: TaalDefinition[] = [
  {
    id: 'teental',
    name: 'ティンタール (Teental)',
    devanagari: 'तीनताल',
    beats: 16,
    division: [4, 4, 4, 4],
    claps: [1, 5, 13], // 1(Sam), 5(2nd Tali), 13(3rd Tali)
    waves: [9], // 9(Khali - wave)
    genre: '北インド古典音楽の王道（ヒンドゥスターニー音楽）',
    description: '「16拍（4+4+4+4）」から成る最も代表的で数学的に美しいリズム体系。第9拍目の「カーリー（空拍・手振り）」が対称性の要です。',
    bols: [
      { matra: 1, bol: 'dha', text: 'Dha', dev: 'धा' }, // Sam (X)
      { matra: 2, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 3, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 4, bol: 'dha', text: 'Dha', dev: 'धा' },

      { matra: 5, bol: 'dha', text: 'Dha', dev: 'धा' }, // Tali 2
      { matra: 6, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 7, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 8, bol: 'dha', text: 'Dha', dev: 'धा' },

      { matra: 9, bol: 'dha', text: 'Dha', dev: 'धा' }, // Khali 0 (Bayan open is muted to tin/ta in classical)
      { matra: 10, bol: 'tin', text: 'Tin', dev: 'तिन' },
      { matra: 11, bol: 'tin', text: 'Tin', dev: 'तिन' },
      { matra: 12, bol: 'na', text: 'Ta', dev: 'ता' },

      { matra: 13, bol: 'na', text: 'Ta', dev: 'ता' }, // Tali 3
      { matra: 14, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 15, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 16, bol: 'dha', text: 'Dha', dev: 'धा' },
    ],
  },
  {
    id: 'keherwa',
    name: 'ケヘルワ (Keherwa)',
    devanagari: 'कहरवा',
    beats: 8,
    division: [4, 4],
    claps: [1],
    waves: [5],
    genre: '民謡・映画音楽（ボリウッド）・軽快な舞踊',
    description: '「8拍（4+4）」の非常にノリがよく親しみやすいリズム。前半が有音（低音あり）、後半の5拍目でカーリー（消音・空拍）に入ります。',
    bols: [
      { matra: 1, bol: 'dha', text: 'Dha', dev: 'धा' },
      { matra: 2, bol: 'ge', text: 'Ge', dev: 'गे' },
      { matra: 3, bol: 'na', text: 'Na', dev: 'ना' },
      { matra: 4, bol: 'tin', text: 'Tin', dev: 'तिन' },

      { matra: 5, bol: 'na', text: 'Na', dev: 'ना' },
      { matra: 6, bol: 'ke', text: 'Ke', dev: 'के' },
      { matra: 7, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 8, bol: 'na', text: 'Na', dev: 'ना' },
    ],
  },
  {
    id: 'dadra',
    name: 'ダードラ (Dadra)',
    devanagari: 'दादरा',
    beats: 6,
    division: [3, 3],
    claps: [1],
    waves: [4],
    genre: 'ガザル（抒情詩歌）・ワルツ的な三拍子の倍数',
    description: '「6拍（3+3）」のゆったりとした軽やかなリズム。第1拍の拍手と第4拍の波（手振り）で3連の心地よいスイングを生みます。',
    bols: [
      { matra: 1, bol: 'dha', text: 'Dha', dev: 'धा' },
      { matra: 2, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 3, bol: 'na', text: 'Na', dev: 'ना' },

      { matra: 4, bol: 'dha', text: 'Dha', dev: 'धा' },
      { matra: 5, bol: 'tin', text: 'Tin', dev: 'तिन' },
      { matra: 6, bol: 'na', text: 'Na', dev: 'ना' },
    ],
  },
  {
    id: 'jhaptal',
    name: 'ジャプターール (Jhaptal)',
    devanagari: 'झपताल',
    beats: 10,
    division: [2, 3, 2, 3],
    claps: [1, 3, 8],
    waves: [6],
    genre: '格式高い古典声楽（ドゥルパド・カヤール）',
    description: '「10拍（2+3+2+3）」という非対称な分割を持つ荘厳なリズム。独特のタメと緊張感があり、古典演奏で多用されます。',
    bols: [
      { matra: 1, bol: 'dhin', text: 'Dhi', dev: 'धी' },
      { matra: 2, bol: 'na', text: 'Na', dev: 'ना' },

      { matra: 3, bol: 'dhin', text: 'Dhi', dev: 'धी' },
      { matra: 4, bol: 'dhin', text: 'Dhi', dev: 'धी' },
      { matra: 5, bol: 'na', text: 'Na', dev: 'ना' },

      { matra: 6, bol: 'tin', text: 'Ti', dev: 'ती' },
      { matra: 7, bol: 'na', text: 'Na', dev: 'ना' },

      { matra: 8, bol: 'dhin', text: 'Dhi', dev: 'धी' },
      { matra: 9, bol: 'dhin', text: 'Dhi', dev: 'धी' },
      { matra: 10, bol: 'na', text: 'Na', dev: 'ना' },
    ],
  },
  {
    id: 'rupak',
    name: 'ルーパク (Rupak)',
    devanagari: 'रूपक',
    beats: 7,
    division: [3, 2, 2],
    claps: [4, 6],
    waves: [1], // Unique: starts on Khali!
    genre: '変拍子・瞑想的な器楽独奏',
    description: '「7拍（3+2+2）」の珍しいリズム。全インドのリズムの中で唯一「第1拍目がカーリー（空拍・手振り）」から始まる神秘的な構造です。',
    bols: [
      { matra: 1, bol: 'tin', text: 'Tin', dev: 'तिन' },
      { matra: 2, bol: 'tin', text: 'Tin', dev: 'तिन' },
      { matra: 3, bol: 'na', text: 'Na', dev: 'ना' },

      { matra: 4, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 5, bol: 'na', text: 'Na', dev: 'ना' },

      { matra: 6, bol: 'dhin', text: 'Dhin', dev: 'धिन्' },
      { matra: 7, bol: 'na', text: 'Na', dev: 'ना' },
    ],
  },
];

export const CLASSROOM_LESSONS: ClassroomLesson[] = [
  {
    id: 'lesson_1_syahi',
    title: '第1時限：打楽器なのにドレミがある？「シャヒ」の物理',
    subtitle: 'ノーベル賞物理学者C.V.ラマンが解き明かした音響の奇跡',
    targetBols: ['tun', 'na'],
    concepts: [
      '円形膜の振動（ベッセル関数）',
      '非調和振動（打楽器のドスッという音）',
      'シャヒの質量効果（調和倍音の発生）',
    ],
    interactiveGoal: '「シャヒの質量スライダー」を動かして、普通の太鼓の音とタブラーの鐘のような美しい音の周波数スペクトルの違いを観察しよう！',
    explanation:
      'スネアドラムや和太鼓を叩くと「ドスッ」「タン」という音程の曖昧な音がします。これは円形の膜が振動するとき、倍音の周波数が 1.0 : 1.59 : 2.14 : 2.30 という不揃いな比率（非調和音）になるためです。\n\nしかし、タブラーの中央には鉄粉と米粉・煤を何層も塗り重ねた黒い「シャヒ（Syahi）」という重りが付いています。1928年にノーベル物理学賞を受賞したインドの物理学者C.V.ラマン卿の研究により、この同心円状の重み分布が膜の固有振動数を奇跡的に「1 : 2 : 3 : 4 : 5」という整数倍（ピアノや管楽器と同じ調和倍音）へと補正することが証明されました。だからこそ、タブラーは太鼓でありながらメロディのように澄んだ音階を奏でられるのです。',
    experimentSettings: {
      syahiMass: 1.0,
      damping: 0.0,
      tension: 1.0,
    },
  },
  {
    id: 'lesson_2_fingering',
    title: '第2時限：指1本の魔術 — 叩き分けと消音の技法',
    subtitle: '薬指を置くだけでなぜ音が激変するのか？節線の固定',
    targetBols: ['na', 'tin', 'tun', 'te'],
    concepts: [
      '節（ノード）と腹（アンチノード）',
      '指による基本モードの減衰',
      'キナール打法 vs マイダン打法',
    ],
    interactiveGoal: '右手の太鼓（ダヤーン）の各ゾーン（Na, Tin, Tun, Te）を叩き比べ、波形と減衰時間の違いを比較してみよう！',
    explanation:
      'ダヤーンはたった1つの太鼓ですが、叩く場所と指の使い分けによって全く異なる音が出ます。\n\n・【Tun（開放）】：シャヒの中央を指先で弾く。基本振動（0,1モード）が全体で大きく揺れ、鐘のような長大な低・中音の響き（サステイン）が生まれます。\n・【Na / Ta（キナール）】：外周の縁を打ちますが、同時に薬指の腹をシャヒの縁にそっと触れさせておきます。この指が「節（動かない点）」の役目を果たし、一番低い基本振動を強制的にシャットアウト！結果として高周波の美しい2倍音・3倍音（ベル音）だけが抽出されて澄み渡ります。\n・【Te（消音）】：シャヒ中央に指を密着させて全ての振動を即座に殺します。リズムの句読点となります。',
  },
  {
    id: 'lesson_3_bayan_meend',
    title: '第3時限：人間の声のように歌う低音「ミィーンド」',
    subtitle: '手首の圧力と張力による連続ピッチベンドのメカニズム',
    targetBols: ['ge', 'meend', 'ke'],
    concepts: [
      '膜の張力（テンション）と周波数の関係（f ∝ √T）',
      '掌底のスライドによる音程変化',
      '共鳴腔（ケトル胴）の音響効果',
    ],
    interactiveGoal: 'バーヤーンのタッチパッドをドラッグして、手首の押し込み量に応じて低音が自在にスライドする「ミィーンド」を奏でてみよう！',
    explanation:
      '左手の太鼓「バーヤーン」は金属製（または陶器製）の丸い深鍋のような形をしており、豊かな低音の空気共鳴室となっています。\n\n太鼓の音の高さ（周波数 f）は皮の張力（Tension T）の平方根に比例します（f ∝ √T）。演奏者は手首の付け根（掌底）を皮の手前に置き、打撃した直後にグッと前方に滑らせながら体重をかけます。すると皮が引き伸ばされて張力が急上昇し、音程が滑らかに「グィーーーッ」と上がっていきます。これは西洋の太鼓には見られない、人間の声の抑揚（メロドラマのような感情表現）を模した極めて洗練された奏法です。',
  },
  {
    id: 'lesson_4_taal_cosmos',
    title: '第4時限：インドの「時間」の循環 — 16拍の宇宙ティンタール',
    subtitle: 'サム（開始と終着点）、ターリー（拍手）、カーリー（波の手振り）',
    targetBols: ['dha', 'dhin', 'na', 'tin'],
    concepts: [
      '拍（マートラー）と小節（ヴィバーグ）',
      '拍手（ターリー）と空拍（カーリー）の陰陽構造',
      'サム（第1拍）への劇的な着地',
    ],
    interactiveGoal: '「ターラ学習モード」でティンタール（16拍）を再生し、メトロノームに合わせて第1拍「サム（Dha）」の瞬間に手を叩いてみよう！',
    explanation:
      '西洋音楽の小節（4/4拍子など）は直線的に進む感覚が強いですが、インド音楽の「ターラ（Taal）」は完全な「円環（サイクル）」として捉えられます。\n\n代表格の「ティンタール（Teental）」は16拍（4+4+4+4）。\n・第1拍：【サム（Sam）】＝サイクルの始まりであり、最大の到達点。全員が息を呑んでここに「Dha!」と着地します。\n・第5拍・第13拍：【ターリー（Tali）】＝両手で「パン！」と拍手して拍を数えます。\n・第9拍：【カーリー（Khali）】＝拍手をせず、手のひらを外に向けて「スーッ」と波のように振ります（空拍）。低音太鼓のGeが鳴りを潜め、陰と陽のコントラストが生まれます。',
  },
];

export const ANATOMY_PARTS = [
  {
    name: 'シャヒ (Syahi / سیاهی)',
    meaning: '黒い部分（インク・顔料）',
    role: '鉄粉（酸化鉄）、米粉糊、木炭粉を何十層も練り重ねて磨き上げた円形の塗膜。膜の中央部を重くすることで、通常の打楽器にはない完全な「調和倍音（整数比）」を生み出す物理的キーパーツ。',
    drum: '両方（ダヤーンは同心円中央、バーヤーンは偏心配置）',
  },
  {
    name: 'マイダン / スル (Maidan / Sur)',
    meaning: '平原 / 音程',
    role: 'シャヒと外枠キナールの間にある滑らかな山羊皮の層。ここを指先で打つと柔らかく澄んだ歌うような中音「Tin」が鳴ります。',
    drum: '両方',
  },
  {
    name: 'キナール / チャンティ (Kinar / Chanti)',
    meaning: '縁（フチ）',
    role: '打面の最外周に接着されたリング状の皮の補強層。硬く張られており、ここを人差し指で弾くことで金属的な鋭い高音「Na / Ta」が鳴り響きます。',
    drum: 'ダヤーン',
  },
  {
    name: 'ガッタ (Gatta)',
    meaning: '木製ペグ',
    role: '胴の側面の革紐に挟み込まれた円筒形の硬木の棒。小さなハンマーで叩き下げると皮のテンションが上がり、音程（Saの音、通常C#やD）を精密にチューニングできます。',
    drum: 'ダヤーン',
  },
  {
    name: 'バッディ (Baddhi)',
    meaning: '編み革紐',
    role: '牛革やラクダ革を細長く編んだ頑丈な紐。打面（プリー）と底面のリングを強く締め上げ、数十キログラムの張力を均等に支えます。',
    drum: '両方',
  },
  {
    name: 'ビラ (Bira / Ring)',
    meaning: '座布団・台座',
    role: '布や藁を布地で巻いたリング状のクッション。太鼓を斜めに安定して固定し、床への不要な振動拡散を防いで美しいサステインを保ちます。',
    drum: '両方',
  },
];
