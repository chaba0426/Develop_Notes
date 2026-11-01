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
| 弱1→弱2→強3の攻撃モーション詳細（姿勢・軌道・制作方針） | [Design/AttackMotion_WeakWeakStrong.md](Design/AttackMotion_WeakWeakStrong.md) |
| 攻撃モーションの撮影用チェックシート | [Design/AttackMotion_ShootingChecklist.md](Design/AttackMotion_ShootingChecklist.md) |
| 雑魚・ボス・中ボス、敵AI、拡張案 | [Design/Enemies.md](Design/Enemies.md) |
| 部屋、クリア条件、通貨、ショップ、成長 | [Design/Roguelite.md](Design/Roguelite.md) |

## ステータスの読み方

- **確定**: 現時点で採用したゲームデザイン上のルール。
- **仮**: 現段階の想定。プロトタイプで変更する可能性が高い。
- **未決定**: まだ値や方式を決めていない。
- **拡張候補**: 基本システム完成後に検証する案。初期実装の要件ではない。

## 最初に検証すること

1部屋・雑魚敵1種・リアの弱/強攻撃とステップで、「集めて斬り払う」を繰り返したくなるか。ショップ・ボス・ローグライト要素は初回プロトタイプには含めない。

最終更新: 2026-11-01。実装値（フレーム数、倍率、価格など）は特記がなければ未確定。

## HTML企画書の編集・ビルド

- **仕様の唯一の正本**: `Design/*.md`。
- **編集するHTML**: [Web/index.html](Web/index.html)。構成・本文・SVG・UIモックを編集する。
- **共通スタイル**: [Web/style.css](Web/style.css)。**ブラウザ側JS**: [Web/script.js](Web/script.js)。CSSだけでもコンボ切り替えは機能する。
- **単一HTMLの生成物**: [index.html](index.html)。直接編集しない。

### 更新ルール

1. **Markdownにない仕様を勝手に追加しない。** 仮の数値や商品名などのUI表示例は、確定仕様と区別して「仮」「モック」「例」と明示する。
2. **既存のデザインや部品をなるべく再利用する。** ただし、専用UIモックや独自の図・デザインが必要なら、既存部品に無理に合わせず、**HTML/CSS/JS/SVGを自由にオリジナルで書いてよい**。専用コンポーネントを増設する必要はない。
3. **変更された仕様に関係する箇所だけ更新する。** 無関係な文章・見た目を不用意に変更しない。
4. **MarkdownとHTMLの矛盾はMarkdownを優先する。** 仕様の変更は先に `Design/*.md` を更新し、その後HTML側を同期する。

### 単一HTMLへビルド

Node.js 18以上・追加パッケージ不要。リポジトリのルートから実行：

```sh
node MusouGame/Web/build.js
node MusouGame/Web/build.js --check
```

編集用HTMLの外部CSS・JSをビルド時に埋め込み、`MusouGame/index.html` を生成する。**単体でオフライン閲覧可能**。生成された `index.html` と編集元ファイルを一緒にコミットする。ビルド前後で意図しない本文・仕様の変更がないか確認する。

### GPTからGitHubを直接更新する場合（標準運用）

この企画書は**GPTが編集し、人間は完成版を閲覧する**運用を基本とする。ユーザーのPCでのclone・ローカルビルドやGitHub Actionsは必須ではない。

1. GPTはGitHub上の対象ファイルと最新のコミットを確認し、必要な `Design/*.md` および `Web/index.html`・`Web/style.css`・`Web/script.js` を更新する。上記の更新ルールを守る。
2. GPTの実行環境でNode.jsを利用できる場合は、`node MusouGame/Web/build.js` と `node MusouGame/Web/build.js --check` を実行して `MusouGame/index.html` を生成・検証する。リポジトリをユーザー側でcloneする必要はない。
3. 実行環境でNode.jsが利用できない場合は、`Web/build.js` と同じCSS・JS埋め込み処理で生成物を作成し、可能な範囲で一致・構造を検証する。**実際に実行していないコマンドを実行済みとは報告しない。** ビルド・検証ができなければその旨を明記する。
4. 編集元ファイルと生成済みの `MusouGame/index.html` を、GitHub連携を使って**原則1コミットでmainに反映**する。コミット直前にブランチの最新状態を確認し、他の更新を上書きしない。変更対象外のファイルは触らない。
5. 完了時には、変更内容・ビルド検証結果・コミットURLを報告する。HTMLだけを直してMarkdownの正本と食い違わせたり、編集元だけをコミットして生成物を古いまま残したりしない。

GitHub Actionsの自動ビルドは導入しない。将来必要になった場合のみ別途検討する。
