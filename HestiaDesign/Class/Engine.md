# Engine

Engine.dllの中核となるクラス群。
Engineが各Subsystem・Boundary API・Game.dllのライフタイムと更新を管理し、
ApplicationおよびGame.dllとの境界には各種APIを使用する。

## Engine

**役割**

各SubsystemとGame向けBoundary APIを所有し、Applicationからのコールバック、Window Message、Fixed Update、フレーム更新を各Subsystemへ分配する。

Game.dllのロード・アンロードとGameRuntimeの寿命管理も担当する。

```cpp
namespace Hestia
{
    class Engine
    {
    public:
        bool Initialize(const ApplicationAPI& applicationAPI);
        void Finalize();

        void ProcessMessage(
            HWND hwnd,
            UINT message,
            WPARAM wParam,
            LPARAM lParam);

        void FixedUpdate(float deltaTime);
        void FrameExecute(float deltaTime);

    private:
        bool LoadGame();
        void UnloadGame();

    private:
        // 各Subsystem
        AssetSystem m_assets;
        GraphicsSystem m_graphics;
        InputSystem m_input;
        AudioSystem m_audio;
        PhysicsSystem m_physics;
        TimeSystem m_time;
        // ...

        // Game.dll向けBoundary API実体
        AssetAPI m_assetAPI;
        GraphicsAPI m_graphicsAPI;
        InputAPI m_inputAPI;
        AudioAPI m_audioAPI;
        PhysicsAPI m_physicsAPI;
        TimeAPI m_timeAPI;
        // ...

        // Application機能へのアクセス
        ApplicationAPI m_applicationAPI;

        // Game.dllへ渡すBoundary API一覧
        GameEngineAPI m_gameEngineAPI;

        // Game.dll実体
        HMODULE m_gameModule = nullptr;

        // GameRuntime機能へのアクセス
        const GameRuntimeAPI* m_gameRuntimeAPI = nullptr;

        // GameRuntime実体
        // 寿命管理兼、GameRuntimeAPIへ渡すハンドル
        void* m_gameRuntime = nullptr;
    };
}
```

[ApplicationAPI](./Application.md#applicationapi)  
[TimeSystem](./Time.md#timesystem)  
[TimeAPI](./Time.md#timeapi)  
[GameEngineAPI](#gameengineapi)  
[GameRuntimeAPI](#gameruntimeapi)

`Initialize()` では以下の順に初期化する。

```text
各SubsystemをInitialize
        ↓
各XxxAPIへ初期化済みXxxSystem*を設定
        ↓
GameEngineAPIへ各XxxAPI*を設定
        ↓
Game.dllをLoad
        ↓
GameRuntimeへGameEngineAPIを渡す
```

SubsystemとBoundary APIの実体はEngineが所有する。
`GameEngineAPI` はそれらを所有せず、Game.dllへ公開するBoundary APIへのポインタだけを保持する。

関係は以下のようになる。

```text
Application
    ↑
ApplicationAPI
    ↑
Hestia::Engine
    │
    ├─ AssetSystem
    │    ↑
    │  AssetAPI
    │
    ├─ GraphicsSystem
    │    ↑
    │  GraphicsAPI
    │
    ├─ TimeSystem
    │    ↑
    │  TimeAPI
    │
    └─ GameEngineAPI
         ├─ AssetAPI*
         ├─ GraphicsAPI*
         ├─ TimeAPI*
         └─ ...
                ↓
             Game.dll
                ↑
         GameRuntimeAPI
```

方向としては、

```text
ApplicationAPI
Engine → Application

GameEngineAPI
Game.dll → Engine

GameRuntimeAPI
Engine → GameRuntime
```

GameRuntimeの破棄はGame.dllをUnloadする前に行う。

```cpp
m_gameRuntimeAPI->Destroy(m_gameRuntime);
m_gameRuntime = nullptr;

m_gameRuntimeAPI = nullptr;

FreeLibrary(m_gameModule);
m_gameModule = nullptr;
```

### EngineAPI

**役割**

ApplicationからEngine.dllを操作するためのAPIテーブル。
Engine.dllからは `GetEngineAPI` のみをC関数として公開し、Applicationは取得したAPIテーブル経由でEngineを操作する。

```cpp
namespace Hestia
{
    struct EngineAPI
    {
        using UpdateFunc = void (*)(Engine*, float);

        Engine* (*Create)(const ApplicationAPI*);
        void (*Destroy)(Engine*);

        bool (*Initialize)(Engine*);
        void (*Finalize)(Engine*);

        void (*ProcessMessage)(
            Engine*,
            HWND,
            UINT,
            WPARAM,
            LPARAM);

        UpdateFunc FixedUpdate;
        UpdateFunc FrameExecute;
    };
}

extern "C"
{
    const Hestia::EngineAPI* GetEngineAPI();
}
```

[Engine](#engine)  
[ApplicationAPI](./Application.md#applicationapi)

`GetProcAddress()` で取得するのは `GetEngineAPI` のみとし、それ以降のEngine操作は `EngineAPI` の関数ポインタを使用する。

### GameEngineAPI

**役割**

Game.dllから利用可能なEngine Boundary APIへのポインタをまとめて渡す。

```cpp
namespace Hestia
{
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
}
```

各 `XxxAPI` の実体はEngineが所有し、`GameEngineAPI` は非所有ポインタのみを保持する。

Engineの `Initialize()` で各 `XxxAPI` の初期化後にポインタを設定し、その後Game.dllへ渡す。

[TimeAPI](./Time.md#timeapi)

### GameRuntimeAPI

**役割**

EngineからGame.dll内部のGameRuntimeを生成・更新・破棄するためのDLL境界API。

```cpp
namespace Hestia
{
    struct GameRuntimeAPI
    {
        void* (*Create)(const GameEngineAPI*);
        void (*Destroy)(void*);

        void (*FixedUpdate)(void*);
        void (*Update)(void*);
    };
}

extern "C"
{
    __declspec(dllexport)
    const Hestia::GameRuntimeAPI* GetGameRuntimeAPI();
}
```

[GameEngineAPI](#gameengineapi)

`GameRuntime` 自体はGame.dll内部に隠し、Engine側では `void*` をopaque handleとして保持する。

`Create` はGameRuntimeの生成と初期化、`Destroy` は終了処理と破棄までを担当する。

`GameRuntimeAPI` の実体はGame.dll内の `static const` とし、Engineはそのポインタを非所有で保持する。

GameRuntimeの更新処理には `deltaTime` を直接渡さず、必要な時間情報は `HestiaGame::Time` から取得する。
