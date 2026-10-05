# クラス設計フォーマット

`HestiaDesign/Class/` 配下のクラス設計Markdownで使用する共通フォーマット。
マスタークラスを先に記述し、そのクラスに付随するAPI・補助型を下位見出しとしてまとめる。
コード内に他の設計対象型が登場する場合は、コードブロック直下に参照リンクを置く。

## ルール

- `#` : ファイル全体の設計単位
- `##` : マスタークラス
- `###` : マスタークラスに付随するAPI・補助型
- ファイル先頭には全体概要を2〜3行程度で記述する
- 各クラス・型は `**役割**` → 説明 → コードの順で記述する
- コード内に他の設計対象型が登場する場合、コードブロック直下に参照リンクを置く
- 同一ファイル内は `[Type](#type)`
- 別ファイルは `[Type](./File.md#type)`
- `HWND` や `HMODULE` など外部ライブラリ・標準APIの型は原則として参照リンクを付けない
- 補助型でも独立した設計単位として扱う場合は `##` に昇格させる

## テンプレート

```md
# <設計単位名>

<このファイル全体が何を扱うか。>
<マスタークラスが何を管理するか。>
<必要なら外部との境界や関連クラスについて1行。>

## <MasterClass>

**役割**

<マスタークラスの責務を1〜3行程度で記述する。>

```cpp
class MasterClass
{
public:
    // ...

private:
    RelatedAPI m_RelatedAPI;
};
```

[RelatedAPI](#relatedapi)
[ExternalType](./Other.md#externaltype)

<必要な補足説明。>

### <RelatedAPI>

**役割**

<マスタークラスに付随するAPI・補助型の責務を記述する。>

```cpp
struct RelatedAPI
{
    // ...
};
```

[MasterClass](#masterclass)

<必要な補足説明。>

### <OtherSubClass>

**役割**

<別のAPI・補助型の責務を記述する。>

```cpp
struct OtherSubClass
{
    // ...
};
```

[MasterClass](#masterclass)
[RelatedAPI](#relatedapi)
```
