# Engine

Engine.dllの中核となるクラス群。
Engineが各SubsystemとGame.dllのライフタイム・更新を管理し、
ApplicationおよびGame.dllとの境界には各種APIを使用する。

## Engine

**役割**

各Subsystemを保持・更新し、Applicationからのコールバック、Window Message、Fixed Update、フレーム更新を各Subsystemへ分配する。

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

        GameEngineAPI CreateGameEngineAPI();

    private:
        // 各Subsystem
        AssetSystem m_assets;
        GraphicsSystem m_graphics;
        InputSystem m_input;
        AudioSystem m_audio;
        PhysicsSystem m_physics;
        TimeSystem m_time;
        // ...

        // Application機能へのアクセス
        ApplicationAPI m_applicationAPI;

        // Game.dll実体
        HMODULE m_gameModule = nullptr;

        // Game.dllへ公開するEngine機能
        GameEngineAPI m_gameEngineAPI;

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
[GameEngineAPI](#gameengineapi)  
[GameRuntimeAPI](#gameruntimeapi)

関係は以下のようになる。

```text
Application
    ↑
ApplicationAPI
    ↑
Hestia::Engine
    │
    ├─ AssetSystem
    ├─ GraphicsSystem
    ├─ InputSystem
    ├─ AudioSystem
    ├─ PhysicsSystem
    ├─ TimeSystem
    │
    ├─ GameEngineAPI
    │      ↓
    │   Game.dll
    │
    └─ GameRuntimeAPI
           ↓
       GameRuntime
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

Game.dllから利用可能なEngine Subsystem APIをまとめて公開する。

```cpp
namespace Hestia
{
    struct GameEngineAPI
    {
        AssetAPI m_assets;
        GraphicsAPI m_graphics;
        InputAPI m_input;
        AudioAPI m_audio;
        PhysicsAPI m_physics;
        TimeAPI m_time;
        // ...
    };
}
```

各SubsystemがGame向けAPIを提供し、EngineがそれらをまとめてGame.dllへ渡す。

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

GameRuntimeの更新処理には `deltaTime` を直接渡さず、必要な時間情報は `Time` から取得する。
