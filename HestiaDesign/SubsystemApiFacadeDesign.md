# Subsystem / Boundary API / Game Facade Design

## 目的

Engine内部のSubsystemを直接Game.dllへ公開せず、DLL境界では必要な機能だけを公開する。
一方で、Engine内部ではSubsystemを使いやすく保ち、Gameコード側ではstatic Facadeによる簡潔なアクセスを提供する。

設計上は次の3層に分ける。

```text
Engine内部実装
    XxxSystem
        ↓
DLL境界公開面
    XxxAPI
        ↓
Game.dll向けFacade
    Game::Xxx
```

---

## 1. Subsystem

SubsystemはEngine内部の本体であり、状態・実装・管理処理を保持する。

```cpp
class AssetSystem
{
public:
    // Engine内部でどこからでも使わせたい便利API
    static AssetHandle Load(AssetID id);
    static bool IsLoaded(AssetHandle handle);

    // Systemを明示的に保持する側から使うAPI
    AssetInfo GetDetailedInfo(AssetHandle handle) const;

    // ライフサイクル管理
    void Initialize();
    void Update();
    void Shutdown();

private:
    static AssetSystem& Instance();

    AssetHandle LoadImpl(AssetID id);
    bool IsLoadedImpl(AssetHandle handle) const;

    AssetStorage m_Storage;
};
```

### static APIの方針

staticにするのは「入口」であり、状態そのものは通常のinstance memberに保持する。

```cpp
AssetHandle AssetSystem::Load(AssetID id)
{
    return Instance().LoadImpl(id);
}
```

```text
AssetSystem::Load()      // static入口
        ↓
AssetSystem instance
        ↓
LoadImpl()
        ↓
m_Storage               // 非static状態
```

### static / non-static の意味

static / non-static はGameへの公開権限とは別軸で考える。

- static API
  - Engine内部で広く利用してよい便利な入口
- instance API
  - Systemを明示的に持つ側から利用する処理
  - 管理処理や文脈依存処理など
- private
  - System内部専用

Gameへ公開するかどうかは後述する `XxxAPI` 側で決める。

---

## 2. Boundary API

Game.dllにはSubsystem本体を直接公開せず、Subsystemごとに薄い境界クラスを置く。

```cpp
class ENGINE_API AssetAPI
{
public:
    explicit AssetAPI(AssetSystem& system)
        : m_System(system)
    {}

    AssetHandle Load(AssetID id);
    bool IsLoaded(AssetHandle handle) const;
    AssetInfo GetInfo(AssetHandle handle) const;

private:
    AssetSystem& m_System;
};
```

`AssetAPI` は実データを持たず、基本的には以下だけを持つ。

```text
AssetSystem&
+
Gameへ公開するAPIのラッパ
```

### System側static APIを呼ぶ場合

```cpp
AssetHandle AssetAPI::Load(AssetID id)
{
    return AssetSystem::Load(id);
}
```

System側で広く公開しているstatic入口は、そのまま利用してよい。

### System側instance APIを公開する場合

```cpp
AssetInfo AssetAPI::GetInfo(AssetHandle handle) const
{
    return m_System.GetDetailedInfo(handle);
}
```

今はstatic APIしか公開しなくても、将来的にGameへ公開したい処理がinstance APIだった場合に対応できるため、`XxxAPI` はSystem instanceを保持する。

### 重要

Subsystemでnon-staticになっている処理をGame向けAPIから公開しても矛盾しない。

```text
Engine内部でのアクセス方法
    static / instance

Gameへ公開するか
    XxxAPIに載せる / 載せない
```

この2つは独立した判断とする。

---

## 3. Game.dll側 Facade

Gameコードからは境界APIを直接触らせず、Game.dll側にstatic Facadeを置く。

```cpp
namespace Game
{
    class Assets
    {
    public:
        static AssetHandle Load(AssetID id)
        {
            return s_API->Load(id);
        }

        static bool IsLoaded(AssetHandle handle)
        {
            return s_API->IsLoaded(handle);
        }

    private:
        static void Bind(AssetAPI* api)
        {
            s_API = api;
        }

        static void Unbind()
        {
            s_API = nullptr;
        }

        inline static AssetAPI* s_API = nullptr;
    };
}
```

ゲームコードからは次のように利用する。

```cpp
auto texture = Game::Assets::Load(textureID);
```

Facadeの役割は次の通り。

- Gameコードからの呼び出しを簡潔にする
- Engine側のAPI形状を直接露出しない
- Game向けの名前・引数・返り値へ整形できる
- Gameに許可する機能だけ公開する
- 将来Engine側APIが変わってもGame側表面を維持しやすくする

Facade自身はEngineの実データを持たず、注入されたBoundary APIへの参照のみを保持する。

---

## 4. 全体構造

```text
Engine.dll
────────────────────────────────────

AssetSystem
├─ 状態 / Storage / Cache
├─ static便利API
├─ instance API
└─ lifecycle API
       ↑
       │ AssetSystem&
       │
AssetAPI
├─ Gameへ公開する機能のみ
└─ AssetSystem& を保持

GraphicsSystem
       ↑
GraphicsAPI

InputSystem
       ↑
InputAPI

──────────── DLL Boundary ────────────

Game.dll

Game::Assets
    ↓ AssetAPI*
Game::Graphics
    ↓ GraphicsAPI*
Game::Input
    ↓ InputAPI*

        ↓

Game Scripts
```

---

## 5. Game.dllへの注入

### 初期段階

API数が少ない間は個別に渡してよい。

```cpp
InitializeGame(
    AssetAPI* assets,
    GraphicsAPI* graphics,
    InputAPI* input
);
```

Game.dll側で各Facadeへ分配する。

```cpp
void InitializeGame(
    AssetAPI* assets,
    GraphicsAPI* graphics,
    InputAPI* input)
{
    Game::Assets::Bind(assets);
    Game::Graphics::Bind(graphics);
    Game::Input::Bind(input);
}
```

### 最終形

System/APIが増えたら `GameAPI` にまとめる。

```cpp
struct GameAPI
{
    uint32_t version;

    AssetAPI* assets;
    GraphicsAPI* graphics;
    InputAPI* input;
    AudioAPI* audio;
};
```

```cpp
void InitializeGame(const GameAPI& api)
{
    Game::Assets::Bind(api.assets);
    Game::Graphics::Bind(api.graphics);
    Game::Input::Bind(api.input);
}
```

Engine側が各Boundary API instanceを所有し、Game.dllロード時にまとめて渡す。

---

## 6. Hot Reload

Game.dllのHot Reload時は、Facadeが古い境界ポインタを保持し続けないようBind/Unbindを明確にする。

```text
Game.dll実行
    ↓
Reload開始
    ↓
各Facade Unbind
    ↓
Game.dll unload
    ↓
新Game.dll load
    ↓
GameAPI再注入
    ↓
各Facade Bind
```

Engine側のSubsystem / Boundary API instanceはEngineが所有するため、Game.dllを差し替えても継続して利用できる。

---

## 7. DLL境界ルール

Boundary APIで使用する型はDLL境界向けの型に限定する。

避けるものの例:

```text
std::vector
std::string
std::unordered_map
所有権が不明な生ポインタ
Engine内部実装型
```

基本は以下を利用する。

```text
Handle
ID
POD struct
明示的なView
境界専用String / Span等
```

必要ならBoundary API内部でEngine内部型との変換を行う。

---

## 8. lifecycle APIのアクセス制御

現段階では `Initialize / Update / Shutdown` は普通にpublicでよい。

```cpp
class AssetSystem
{
public:
    void Initialize();
    void Update();
    void Shutdown();
};
```

実際に誤用防止が必要になった場合のみ、Passkey方式などへ変更する。

```cpp
class EngineKey
{
    friend class Engine;
    EngineKey() = default;
};

class AssetSystem
{
public:
    void Update(EngineKey);
};
```

最初からfriendやPasskeyを大量導入せず、必要になった時点でアクセス制御を強化する。

---

## 9. 現時点の設計ルール

1. Engine内部の本体は `XxxSystem` とする。
2. Systemの状態はinstance memberに保持する。
3. Engine内部で広く使いたい一部機能のみstatic入口を用意する。
4. static / non-static とGameへの公開可否は別軸で判断する。
5. DLL境界にはSystem本体を出さず、`XxxAPI` を置く。
6. `XxxAPI` は対応するSystem instanceを保持する。
7. `XxxAPI` はGameへ許可する処理だけラップする。
8. Game.dll側では `Game::Xxx` FacadeにBoundary APIをBindする。
9. Game ScriptはFacadeだけを利用する。
10. 最初はAPIを個別注入し、増えたら `GameAPI` にまとめる。
11. Hot Reload時はFacadeをUnbindしてからGame.dllをUnloadする。
12. lifecycle APIは当面public。必要になった場合のみPasskey等で制限する。

---

## 要約

```text
XxxSystem
    Engine内部の本体
    状態・実装・管理処理を保持
    一部だけstatic便利API

        ↓ System&

XxxAPI
    DLL境界の公開面
    System instanceを保持
    Gameへ許可する機能だけ公開

        ↓ API*

Game::Xxx
    Game.dll側Facade
    API instanceを保持
    Game Scriptにはstatic APIとして提供
```

この構造により、Engine内部ではSubsystemを直接扱える柔軟性を残しつつ、Game.dllとの境界では公開範囲を制限し、Gameコード側には簡潔なstatic APIを提供する。
