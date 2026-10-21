# LEIR — HTMLプレゼンテーション生成

`Design/*.md` が唯一の**仕様の正本**。`Presentation/presentation.json` は人間向け表示を作るための**派生データ**であり、仕様を変更する場所ではありません。

## 生成

Node.js 18以上で、リポジトリのルートから実行します。外部パッケージ不要です。

```sh
node MusouGame/Renderer/renderer.js
```

生成物は `MusouGame/index.html`（CSS同梱・オフライン閲覧可能）。JSON、CSS、テンプレート、生成HTMLをまとめてコミットしてください。

## 更新フロー

1. 仕様変更は `Design/*.md` に記載。
2. AIが該当Markdownを読み、`Presentation/presentation.json` の該当セクションだけ同期（図の説明用比率やショップのダミー値は「仮」と明記）。
3. `node MusouGame/Renderer/renderer.js` でHTMLを再生成。
4. 差分と表示を確認。HTMLを直接編集しない。

## JSONブロック

`sections[].blocks[]` に `type` を指定します。現在の汎用描画部品は `text`, `note`, `cards`, `comparison`, `flow`, `timelines`, `combo`, `shop`, `roadmap`, `chips`, `table` です。AIが既存部品を組み合わせて図を構成します。新しい表現が必要ならレンダラーを拡張してください。

`timelines` の `weight` は**相対的な描画幅**であり、攻撃フレーム数ではありません。JSON内のテキストはすべてHTMLエスケープされます。ブラウザ上で購入などはできません（ショップは静的モックアップ）。コンボ切り替えはCSSのみで動作します。

## 再生成チェック

```sh
node MusouGame/Renderer/test.js
```

既存の `index.html` を再生成して、**差分がないこと**、コンボ3タブ・ショップ3枠・主要な図解が出ていることを検査します。差分が出た場合は `presentation.json`、CSS、テンプレートを確認してから生成物もコミットしてください。
