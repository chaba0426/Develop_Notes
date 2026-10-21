# LEIR — 無双アクション企画 / 設計索引

> **AI向けの入口。** 実装・設計時は対象ファイルだけ読み、通常は `index.html` のCSS/SVGを読み込まない。

## 資料の使い分け

- **仕様の正本**: `Design/*.md`。仕様の変更・追加はまずこちらを更新する。
- **人間向けの可視化**: [index.html](index.html)。図、コンボ切り替え、ショップのUIモックアップを掲載。仮の数値や表示例は確定仕様ではない。
- **同期ルール**: MarkdownとHTMLが矛盾したらMarkdownを優先し、HTMLも後で同期する。

## 必要なファイルだけ読む

| 作業対象 | 参照先 |
| --- | --- |
| ゲーム概要、キャラクター、スコープ、制作順 | [Design/Overview.md](Design/Overview.md) |
| 通常攻撃、コンボ、ステップ、キャンセル、攻撃の隙 | [Design/Combat.md](Design/Combat.md) |
| 雑魚・ボス・中ボス、敵AI、拡張案 | [Design/Enemies.md](Design/Enemies.md) |
| 部屋、クリア条件、通貨、ショップ、成長 | [Design/Roguelite.md](Design/Roguelite.md) |

## ステータスの読み方

- **確定**: 現時点で採用したゲームデザイン上のルール。
- **仮**: 現段階の想定。プロトタイプで変更する可能性が高い。
- **未決定**: まだ値や方式を決めていない。
- **拡張候補**: 基本システム完成後に検証する案。初期実装の要件ではない。

## 最初に検証すること

1部屋・雑魚敵1種・リアの弱/強攻撃とステップで、「集めて斬り払う」を繰り返したくなるか。ショップ・ボス・ローグライト要素は初回プロトタイプには含めない。

最終更新: 2026-10-22。実装値（フレーム数、倍率、価格など）は特記がなければ未確定。

## HTMLを再生成する

プレゼンテーションは [Presentation/README.md](Presentation/README.md) を参照。Node.js 18以上・追加パッケージ不要。

```sh
node MusouGame/Renderer/renderer.js
node MusouGame/Renderer/test.js
```

`index.html` は生成物なので直接編集せず、仕様は `Design/*.md`、表示データは `Presentation/presentation.json` で管理する。
