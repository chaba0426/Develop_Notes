## GameEngineAPI

**役割**

Game.dllから利用可能なEngine Subsystem APIをまとめて公開する。

```cpp
struct GameEngineAPI
{
    AssetAPI Assets;
    GraphicsAPI Graphics;
    InputAPI Input;
    AudioAPI Audio;
    PhysicsAPI Physics;
    // ...
};
```

各SubsystemがGame向けAPIを提供し、EngineがそれらをまとめてGame.dllへ渡す。

## GameRuntimeAPI

**役割**

EngineからGame.dll内部のGameRuntimeを生成・更新・破棄するためのDLL境界API。

```cpp
struct GameRuntimeAPI
{
    void* (*Create)(const GameEngineAPI*);
    void (*Destroy)(void*);

    void (*FixedUpdate)(void*);
    void (*Update)(void*);
};

extern "C"
{
    __declspec(dllexport)
    const GameRuntimeAPI* GetGameRuntimeAPI();
}
```

`GameRuntime` 自体はGame.dll内部に隠し、Engine側では `void*` をopaque handleとして保持する。

`Create` はGameRuntimeの生成と初期化、`Destroy` は終了処理と破棄までを担当する。

`GameRuntimeAPI` の実体はGame.dll内の `static const` とし、Engineはそのポインタを非所有で保持する。

GameRuntimeの更新処理には `deltaTime` を直接渡さず、必要な時間情報は `Time` から取得する。

## Engine

**役割**

各Subsystemを保持・更新し、Applicationからのコールバック、Window Message、Fixed Update、フレーム更新を各Subsystemへ分配する。

Game.dllのロード・アンロードとGameRuntimeの寿命管理も担当する。

```cpp
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
    AssetSystem m_Assets;
    GraphicsSystem m_Graphics;
    InputSystem m_Input;
    AudioSystem m_Audio;
    PhysicsSystem m_Physics;
    // ...

    // Application機能へのアクセス
    ApplicationAPI m_ApplicationAPI;

    // Game.dll実体
    HMODULE m_GameModule = nullptr;

    // Game.dllへ公開するEngine機能
    GameEngineAPI m_GameEngineAPI;

    // GameRuntime機能へのアクセス
    const GameRuntimeAPI* m_GameRuntimeAPI = nullptr;

    // GameRuntime実体
    // 寿命管理兼、GameRuntimeAPIへ渡すハンドル
    void* m_GameRuntime = nullptr;
};
```

関係は以下のようになる。

```text
Application
    ↑
ApplicationAPI
    ↑
Engine
    │
    ├─ AssetSystem
    ├─ GraphicsSystem
    ├─ InputSystem
    ├─ AudioSystem
    ├─ PhysicsSystem
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
m_GameRuntimeAPI->Destroy(m_GameRuntime);
m_GameRuntime = nullptr;

m_GameRuntimeAPI = nullptr;

FreeLibrary(m_GameModule);
m_GameModule = nullptr;
```
