# 🪘 TablaLab — 教育用タブラー・バーヤーン音響シミュレーター

インドの伝統打楽器タブラーとバーヤーンの音響物理、演奏技法、ターラ（リズム理論）を体験的に学べる教育用シミュレーター。

**公開ページ：** https://nakatadaiki1012-design.github.io/tabla-simulator/
（`main` にプッシュすると GitHub Actions で自動ビルド・公開されます）

## 主な機能

下のタブで切りかえ。どの画面もスクロールなしの1画面で操作できます。

- **🎓 レッスン**：6ユニット×3〜4の小さなステップ（叩く・聞き分け・リズム・サム）。ユニットを全部クリアするとバッジ、全部で「タブラー修了」🏆。進み具合は端末に保存
- **🥁 たたく**：太鼓だけの画面（スマホ縦向きでは上下に大きく表示）。設定は⚙の中
- **🎧 きく**：タイルを押すと演奏。説明は ⓘ の中
- **🎸 シタール**：自由に弾く／タブラー伴奏で弾く／シタールとタブラーの自動アンサンブル
- **その他**：くわしい演奏画面・自動演奏の詳しい版・音のしくみと理論

## 手元で動かす

```bash
bun install      # または npm install
bun run dev      # 開発サーバー（http://localhost:3000）
bun run build    # 公開用ファイルを dist/ に出力
bun run lint     # 型チェック
```

AI（Gemini）の機能は使っていないので、API キーは不要です。

## 音源

`public/samples/freesound/` の録音は Freesound の
[mmiron「tabla bols」](https://freesound.org/people/mmiron/packs/8162/)（Creative Commons 0）です。
