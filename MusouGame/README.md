# LEIR — 開発Wiki / 企画・仕様の索引

> **AI向けの入口。** 実装・設計時は対象ファイルだけ読み、通常は `index.html` のCSS/SVGを読み込まない。

## 資料の使い分け

- **仕様の正本**: `Design/*.md`。仕様の変更・追加はまずこちらを更新する。
- **人間向けの開発Wiki**: [index.html](index.html)。企画と仕様を蓄積・参照する閲覧画面。本文・リスト・表を基本に、図、コンボ切り替え、ショップのUIモックアップを必要な箇所へ掲載する。仮の数値や表示例は確定仕様ではない。
- **共通の表示・情報整理ルール**: [DESIGN.md](DESIGN.md)。既存のテンプレートを維持して追記するための基準。ゲーム仕様の正本にはしない。
- **同期ルール**: MarkdownとHTMLが矛盾したらMarkdownを優先し、HTMLも後で同期する。

## 必要なファイルだけ読む

| 作業対象 | 参照先 |
| --- | --- |
| ゲーム概要、スコープ、制作順 | [Design/Overview.md](Design/Overview.md) |
| リア・雑魚敵のキャラクターデザインと画像 | [Design/Characters.md](Design/Characters.md) |
| 通常攻撃、コンボ、ステップ、キャンセル、攻撃の隙 | [Design/Combat.md](Design/Combat.md) |
| モーション概要、制作・編集方針、基本構え、待機→攻撃ブレンド | [Design/AttackMotion_Common.md](Design/AttackMotion_Common.md) |
| 弱→弱→強（斜め斬り・斬り上げ・低空360°回転斬り） | [Design/AttackMotion_WeakWeakStrong.md](Design/AttackMotion_WeakWeakStrong.md) |
| 弱→強→強（低い突き・両手での縦斬り） | [Design/AttackMotion_WeakStrongStrong.md](Design/AttackMotion_WeakStrongStrong.md) |
| 単発強（右→左の水平薙ぎ払い） | [Design/AttackMotion_StandaloneStrong.md](Design/AttackMotion_StandaloneStrong.md) |
| 攻撃モーションの撮影用チェックシート | [Design/AttackMotion_ShootingChecklist.md](Design/AttackMotion_ShootingChecklist.md) |
| 雑魚・ボス・中ボス、敵AI、拡張案 | [Design/Enemies.md](Design/Enemies.md) |
| 部屋、クリア条件、通貨、ショップ、成長 | [Design/Roguelite.md](Design/Roguelite.md) |
| 草原ステージの景観・地形・配置・Blender→FBX/JSON制作方針 | [Design/Stage_Grassland.md](Design/Stage_Grassland.md) |

## ステータスの読み方

- **確定**: 現時点で採用したゲームデザイン上のルール。
- **仮**: 現段階の想定。プロトタイプで変更する可能性が高い。
- **未決定**: まだ値や方式を決めていない。
- **拡張候補**: 基本システム完成後に検証する案。初期実装の要件ではない。

## 最初に検証すること

1部屋・雑魚敵1種・リアの弱/強攻撃とステップで、「集めて斬り払う」を繰り返したくなるか。ショップ・ボス・ローグライト要素は初回プロトタイプには含めない。

最終更新: 2026-11-03。実装値（フレーム数、倍率、価格など）は特記がなければ未確定。

## テンプレートへの情報の追加

1. 追加する仕様を、担当する `Design/*.md` に記載する。既存の仕様IDがあれば維持し、確定・仮・未決定・拡張候補を区別する。
2. HTMLでは内容に対応する既存の分類・ページ・見出しへ追記する。見栄えのために内容を分割したり、短い説明ごとにカードを作ったりしない。
3. 並列の情報は箇条書き、順番がある情報は番号付きリスト、属性は項目名と値、同じ属性の比較は表にする。図や操作が必要な情報には既存の専用表示を使う。
4. 他の節を参照するときは既存のハッシュへリンクする。同じルールの複製を増やさず、前提・例外・関連仕様が必要な場所から参照できるようにする。
5. 新しい節のIDは内容を表す名前にする。既存のIDやリンクを変更しない。左ナビには参照に必要な階層を追加し、右目次や重複する本文内目次は増やさない。
6. 編集元と単一HTMLを同期し、本文・数値・状態・内部リンクを確認する。仕様変更がなければ正本の内容を変更しない。

### 既存仕様IDから参照する

| 仕様ID | 正本 | HTMLの参照先 |
| --- | --- | --- |
| COMBO-001 | [Combat.md](Design/Combat.md) | [攻撃の成立](index.html#combo-001) |
| COMBO-002 | [Combat.md](Design/Combat.md) | [ステップ挿入規則](index.html#combo-002) |
| ATTACK-001 | [Combat.md](Design/Combat.md) | [攻撃の隙](index.html#timing) |

HTMLは正本の閲覧用表現であり、全ての仕様が一対一で掲載されているとは限らない。未掲載の仕様IDを新しい仕様として作り直さず、正本の該当項目を確認して同期する。

## 開発Wiki HTMLの編集・ビルド

- **仕様の唯一の正本**: `Design/*.md`。
- **編集するHTML**: [Web/index.html](Web/index.html)。構成・本文・SVG・UIモックを編集する。
- **共通スタイル**: [Web/style.css](Web/style.css)。**ブラウザ側JS**: [Web/script.js](Web/script.js)。CSSだけでもコンボ切り替えは機能する。
- **単一HTMLの生成物**: [index.html](index.html)。直接編集しない。

### 更新ルール

1. **Markdownにない仕様を勝手に追加しない。** 仮の数値や商品名などのUI表示例は、確定仕様と区別して「仮」「モック」「例」と明示する。
2. **既存テンプレートを共通の器として使う。** 左ナビ・本文・見出し・リスト・表・注釈のルールは [DESIGN.md](DESIGN.md) に合わせる。専用UIモックや図が必要ならHTML/CSS/JS/SVGで追加できるが、文章を装飾部品に合わせて作り替えない。
3. **変更された仕様に関係する箇所だけ更新する。** 無関係な文章・見た目を不用意に変更しない。
4. **MarkdownとHTMLの矛盾はMarkdownを優先する。** 仕様の変更は先に `Design/*.md` を更新し、その後HTML側を同期する。

### WIKI型ナビゲーション

- **PC:** 左にサイドメニューを常設。**スマホ:** アイコンのみのハンバーガーメニュー。
- 「ゲーム全体」「モーション詳細」の横長バーがアコーディオンの開閉操作。**バーはページ移動しない**。中の「概要」「弱1」などは通常のリンクで、複数グループを同時に開ける。「ゲーム全体」は初期状態で閉じ、ページ移動による自動展開は行わない。撮影チェックもモーション詳細内のリンク。
- ページ構成: **ゲーム全体・企画書**（従来の8セクションを維持）、**キャラクター**（リア／魔法生物の立ち絵・キャラシ）、**モーション共通**（概要 → 制作・編集方針 → 基本構え）、**弱→弱→強**、**弱→強→強**、**単発強**、**撮影チェックシート**。共通情報を特定のコンボに含めない。
- **画像**: Assets/*.webp を保存し、編集元は ../Assets/ で参照。ビルド時に埋め込むため生成物は単独でオフライン表示できる。画像の仕様は [Design/Characters.md](Design/Characters.md) にまとめる。
- 単一HTML内の各ページは `Web/index.html` の `data-wiki-page` で区切り、`Web/script.js` がハッシュリンクで切り替える。例: `#overview` / `#motion` / `#motion-wss` / `#motion-single` / `#shooting`。従来の `#core` や `#combo` もそのまま利用可能。
- モーションは [概要](index.html#motion-overview) → [制作・編集方針](index.html#motion-production) → [基本構え](index.html#motion-stance) → 各コンボの順に参照する。既存の `#motion` は弱→弱→強のページを指し、基本構え・制作方針のハッシュも維持する。
- **ページ追加時:** 正本の `Design/*.md` を更新 → `Web/index.html` にページとサイドメニュー項目を追加 → 必要なら `Web/style.css` を調整 → 単一HTMLを再生成して編集元もコミットする。
- **モーションの正本:** [共通仕様](Design/AttackMotion_Common.md)、[弱→弱→強](Design/AttackMotion_WeakWeakStrong.md)、[弱→強→強](Design/AttackMotion_WeakStrongStrong.md)、[単発強](Design/AttackMotion_StandaloneStrong.md)。撮影用の正本は [チェックシート](Design/AttackMotion_ShootingChecklist.md)。HTMLには閲覧しやすい内容として同期する。
- **既存のコンボ切り替え**は引き続きCSSのみで動き、ページ切り替えとスマホのメニュー開閉はJavaScriptで動く。重複するページ内目次やメニューの説明文を増やさない。仕様情報はそのまま保持する。

### 単一HTMLへビルド

Node.js 18以上・追加パッケージ不要。リポジトリのルートから実行：

```sh
node MusouGame/Web/build.js
node MusouGame/Web/build.js --check
```

編集用HTMLの外部CSS・JSとWebP画像をビルド時に埋め込み、`MusouGame/index.html` を生成する。**単体でオフライン閲覧可能**。生成された `index.html` と編集元ファイルを一緒にコミットする。ビルド前後で意図しない本文・仕様の変更がないか確認する。

### GPTからGitHubを直接更新する場合（標準運用）

この開発Wikiは**GPTが編集し、人間は閲覧する**運用を基本とする。ユーザーのPCでのclone・ローカルビルドやGitHub Actionsは必須ではない。

1. GPTはGitHub上の対象ファイルと最新のコミットを確認し、必要な `Design/*.md` および `Web/index.html`・`Web/style.css`・`Web/script.js` を更新する。上記の更新ルールを守る。
2. GPTの実行環境でNode.jsを利用できる場合は、`node MusouGame/Web/build.js` と `node MusouGame/Web/build.js --check` を実行して `MusouGame/index.html` を生成・検証する。リポジトリをユーザー側でcloneする必要はない。
3. 実行環境でNode.jsが利用できない場合は、`Web/build.js` と同じCSS・JS埋め込み処理で生成物を作成し、可能な範囲で一致・構造を検証する。**実際に実行していないコマンドを実行済みとは報告しない。** ビルド・検証ができなければその旨を明記する。
4. 編集元ファイルと生成済みの `MusouGame/index.html` を、GitHub連携を使って**原則1コミットでmainに反映**する。コミット直前にブランチの最新状態を確認し、他の更新を上書きしない。変更対象外のファイルは触らない。
5. 完了時には、変更内容・ビルド検証結果・コミットURLを報告する。HTMLだけを直してMarkdownの正本と食い違わせたり、編集元だけをコミットして生成物を古いまま残したりしない。

GitHub Actionsの自動ビルドは導入しない。将来必要になった場合のみ別途検討する。
