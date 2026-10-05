# Subsystem / Boundary API / Game Facade Design

## 目的

Engine内部のSubsystemを直接Game.dllへ公開せず、DLL境界では必要な機能だけを `XxxAPI` として公開する。
Engine側および境界共有型は `Hestia`、Game Script向けFacadeは `HestiaGame` 名前空間を使用する。

設計上は次の3層に分ける。

```text
Engine内部実装
    XxxSystem
        ↓
DLL境界公開面
    XxxAPI
        ↓
Game.dll向けFacade
    HestiaGame::Xxx
```

---

## 1. Subsystem

SubsystemはEngine内部の本体であり、状態・実装・管理処理を保持する。

```cpp
class AssetSystem
{
public:
    static AssetHandle Load(AssetID id);
    static bool IsLoaded(AssetHandle handle);

    AssetInfo GetDetailedInfo(AssetHandle handle) const;

    void Initialize();
    void Update();
    void Shutdown();

private:
    static AssetSystem& Instance();

    AssetHandle LoadImpl(AssetID id);
    bool IsLoadedImpl(AssetHandle handle) const;

    AssetStorage m_storage;
};
```

Systemの状態はinstance memberに保持する。
Engine内部でどこからでも利用したい一部機能のみ、必要に応じてstatic入口を用意する。

static / non-static とGameへの公開可否は別軸で判断する。

---

## 2. Boundary API

Game.dllにはSubsystem本体を直接公開せず、Subsystemごとに薄いBoundary APIを置く。

`XxxAPI` の実体はEngineが所有し、Engine初期化時に初期化済みの `XxxSystem*` を設定する。

```cpp
class ENGINE_API AssetAPI
{
public:
    void Initialize(AssetSystem* system);

    AssetHandle Load(AssetID id);
    bool IsLoaded(AssetHandle handle) const;
    AssetInfo GetInfo(AssetHandle handle) const;

private:
    AssetSystem* m_system = nullptr;
};
```

`AssetAPI` はSubsystemの実データを所有せず、対応するSystemへの非所有ポインタとGameへ公開する処理だけを持つ。

```cpp
void AssetAPI::Initialize(AssetSystem* system)
{
    m_system = system;
}

AssetInfo AssetAPI::GetInfo(AssetHandle handle) const
{
    return m_system->GetDetailedInfo(handle);
}
```

System側のstatic入口を利用する処理では、Systemポインタを経由せずstatic APIをそのまま呼んでもよい。

---

## 3. GameEngineAPI

Engineが所有する各Boundary APIへのポインタを、Game.dllへまとめて渡す。

```cpp
struct GameEngineAPI
{
    AssetAPI* m_assets = nullptr;
    GraphicsAPI* m_graphics = nullptr;
    InputAPI* m_input = nullptr;
    AudioAPI* m_audio = nullptr;
    PhysicsAPI* m_physics = nullptr;
    TimeAPI* m_time = nullptr;
    // ...
};
```

`GameEngineAPI` はBoundary APIを所有しない。

Engine初期化時の流れは以下とする。

```text
各XxxSystemをInitialize
        ↓
各XxxAPI.Initialize(&XxxSystem)
        ↓
GameEngineAPIへ各XxxAPI*を設定
        ↓
Game.dllをLoad
        ↓
GameRuntimeへGameEngineAPIを渡す
```

---

## 4. Game.dll側 Facade

GameコードからはBoundary APIを直接触らせず、Game.dll側にstatic Facadeを置く。

```cpp
namespace HestiaGame
{
    class Assets
    {
    public:
        static AssetHandle Load(AssetID id)
        {
            return s_api->Load(id);
        }

        static bool IsLoaded(AssetHandle handle)
        {
            return s_api->IsLoaded(handle);
        }

    private:
        static void Bind(Hestia::AssetAPI* api)
        {
            s_api = api;
        }

        static void Unbind()
        {
            s_api = nullptr;
        }

        inline static Hestia::AssetAPI* s_api = nullptr;
    };
}
```

ゲームコードからは次のように利用する。

```cpp
auto texture = HestiaGame::Assets::Load(textureID);
```

Facade自身はEngineの実データを持たず、注入されたBoundary APIへのポインタのみを保持する。

---

## 5. 全体構造

```text
Engine.dll
────────────────────────────────────

Engine
├─ AssetSystem
├─ AssetAPI ─────────→ AssetSystem*
│
├─ GraphicsSystem
├─ GraphicsAPI ──────→ GraphicsSystem*
│
├─ TimeSystem
├─ TimeAPI ──────────→ TimeSystem*
│
└─ GameEngineAPI
     ├─ AssetAPI*
     ├─ GraphicsAPI*
     ├─ TimeAPI*
     └─ ...

──────────── DLL Boundary ────────────

Game.dll

GameRuntime
    ↓ GameEngineAPI

HestiaGame::Assets
    ↓ AssetAPI*

HestiaGame::Graphics
    ↓ GraphicsAPI*

HestiaGame::Time
    ↓ TimeAPI*

        ↓

Game Scripts
```

---

## 6. Hot Reload

Game.dllのHot Reload時は、FacadeがBoundary APIポインタを保持したままGame.dllを破棄しないようBind / Unbindを行う。

```text
Game.dll実行
    ↓
Reload開始
    ↓
各Facade Unbind
    ↓
GameRuntime破棄
    ↓
Game.dll unload
    ↓
新Game.dll load
    ↓
同じGameEngineAPIを再注入
    ↓
各Facade Bind
```

Engine側のSubsystem・Boundary API・GameEngineAPIはEngineが所有するため、Game.dllを差し替えても継続して利用できる。

---

## 7. DLL境界ルール

Boundary APIで使用する型はDLL境界向けの型に限定する。

避けるものの例:

```text
std::vector
std::string
std::unordered_map
所有権が不明な生ポインタ
Engine内部実装型そのもの
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

共通基底の `ISystem` や `ISystemAPI` は設けない。
共通化する具体的な必要が出た時点で検討する。

---

## 9. 現時点の設計ルール

1. Engine内部の本体は `XxxSystem` とする。
2. Systemの状態はinstance memberに保持する。
3. Engine内部で広く使いたい一部機能のみstatic入口を用意する。
4. static / non-static とGameへの公開可否は別軸で判断する。
5. DLL境界にはSystem本体を出さず、`XxxAPI` を置く。
6. EngineがSubsystemとBoundary APIの両方を所有する。
7. Engine初期化時、System初期化後に `XxxAPI::Initialize(XxxSystem*)` で接続する。
8. `XxxAPI` は対応するSystemへの非所有ポインタを保持する。
9. `GameEngineAPI` は各 `XxxAPI*` をまとめる非所有ポインタの集合とする。
10. Game.dll側では `HestiaGame::Xxx` FacadeにBoundary APIをBindする。
11. Game ScriptはFacadeを利用する。
12. Hot Reload時はFacadeをUnbindしてからGameRuntimeとGame.dllを破棄する。
13. 共通基底 `ISystem` / `ISystemAPI` は現時点では作らない。

---

## 要約

```text
XxxSystem
    Engine内部の本体
    状態・実装・管理処理を保持

        ↑ System*

XxxAPI
    Engine所有
    Systemへの非所有ポインタを保持
    Gameへ許可する機能だけ公開

        ↑ API*

GameEngineAPI
    Engine所有
    各XxxAPI*をまとめてGame.dllへ渡す

        ↓

HestiaGame::Xxx
    Game.dll側Facade
    APIポインタを保持
    Game Scriptにはstatic APIとして提供
```
