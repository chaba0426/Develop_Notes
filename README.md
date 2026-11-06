# Develop Notes

HestiaEngineとLEIRの設計資料・開発ノートをまとめたリポジトリです。

- **開発Wiki トップページ**: [index.html](index.html)
- **GitHub Pages**（公開設定後）: https://chaba0426.github.io/Develop_Notes/

## HestiaEngine

C++製ゲームエンジンの設計資料です。

- [設計方針](HestiaDesign/ClassDesign.md)
- [Subsystem / Boundary API / Game Facade](HestiaDesign/SubsystemApiFacadeDesign.md)
- [命名規則](HestiaDesign/NamingConvention.md)
- [クラス設計資料](HestiaDesign/Class/)

現在はMarkdownをGitHub上で閲覧します。必要に応じて専用のHTML Wikiへ拡張します。

## LEIR / 無双アクション

3Dアクションゲームの企画・仕様資料です。

- [開発Wiki（ブラウザ閲覧）](MusouGame/index.html)
- [設計資料の索引（AI・開発者向け）](MusouGame/README.md)
- [設計Markdown](MusouGame/Design/)
- [表示テンプレート・情報整理ルール](MusouGame/DESIGN.md)

LEIRでは `MusouGame/Design/*.md` を仕様の正本として管理し、`MusouGame/index.html` を閲覧用に同期します。編集元と生成手順は [MusouGame/README.md](MusouGame/README.md) を参照してください。

## GitHub Pages

`main` ブランチの `/(root)` をGitHub Pagesの公開元にすると、ルートの `index.html` がサイトの入口になります。既存の `MusouGame/index.html` はサブページとしてそのまま利用できます。

公開時は、設計資料だけでなくリポジトリのGit履歴も公開対象になるため、公開前に内容を確認してください。
