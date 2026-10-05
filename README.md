# 🪘 TablaLab — 教育用タブラー・バーヤーン音響シミュレーター

インドの伝統打楽器タブラーとバーヤーンの音響物理、演奏技法、ターラ（リズム理論）を体験的に学べる教育用シミュレーター。

**公開ページ：** https://nakatadaiki1012-design.github.io/tabla-simulator/
（`main` にプッシュすると GitHub Actions で自動ビルド・公開されます）

## 主な機能

- **演奏・体験**：タブラー（右）とバーヤーン（左）を叩いて演奏
- **巨匠の自動演奏**：代表的な作品形式の自動演奏
- **シタール＆アンサンブル**：
  - ラーガ（ヤマン・バイラヴなど6種）に合わせたフレットでシタールを演奏。押したまま上にドラッグでミーンド、共鳴弦、チカリ弦、タンプーラ
  - **タブラー伴奏で弾く**：6種類のターラのテーカをタブラーが刻み、その上で自由にシタールを弾ける
  - **自動アンサンブル**：アーラープ → ジョール → ジャーラー →（タブラー参加）ガット → トーダー＆ティハーイー → ドゥルト・ジャーラーで一緒にサムへ着地
- **学習・レッスン**

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
