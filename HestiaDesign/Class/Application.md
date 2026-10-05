## ApplicationAPI

**役割**

EngineからApplicationのフレーム制御や終了要求を行うためのFacade。
内部でApplicationへのContextと関数ポインタを保持し、Engine側には通常のメンバ関数として公開する。

```cpp
struct ApplicationAPI
{
public:
    void SetTargetFPS(double fps) const;
    double GetTargetFPS() const;

    void SetUnlimitedFrameRate(bool unlimited) const;
    bool IsUnlimitedFrameRate() const;

    void SetFixedDeltaTime(double deltaTime) const;
    double GetFixedDeltaTime() const;

    void RequestQuit() const;

private:
    using SetTargetFPSFunc = void (*)(void*, double);
    using GetTargetFPSFunc = double (*)(void*);

    using SetUnlimitedFrameRateFunc = void (*)(void*, bool);
    using IsUnlimitedFrameRateFunc = bool (*)(void*);

    using SetFixedDeltaTimeFunc = void (*)(void*, double);
    using GetFixedDeltaTimeFunc = double (*)(void*);

    using RequestQuitFunc = void (*)(void*);

    void* m_Context = nullptr;

    SetTargetFPSFunc m_SetTargetFPS = nullptr;
    GetTargetFPSFunc m_GetTargetFPS = nullptr;

    SetUnlimitedFrameRateFunc m_SetUnlimitedFrameRate = nullptr;
    IsUnlimitedFrameRateFunc m_IsUnlimitedFrameRate = nullptr;

    SetFixedDeltaTimeFunc m_SetFixedDeltaTime = nullptr;
    GetFixedDeltaTimeFunc m_GetFixedDeltaTime = nullptr;

    RequestQuitFunc m_RequestQuit = nullptr;

    friend class Application;
};
```

Applicationが生成時に自身をContextとして登録する。Engine側はContextを意識せず `ApplicationAPI::SetTargetFPS()` などを呼び出す。

## Engine DLL API

**役割**

ApplicationからEngine.dllを操作するためのC ABI境界。

```cpp
extern "C"
{
    Engine* CreateEngine(const ApplicationAPI* applicationAPI);
    void DestroyEngine(Engine* engine);

    bool Engine_Initialize(Engine* engine);
    void Engine_Finalize(Engine* engine);

    void Engine_ProcessMessage(
        Engine* engine,
        HWND hwnd,
        UINT message,
        WPARAM wParam,
        LPARAM lParam);

    void Engine_FixedUpdate(Engine* engine, float deltaTime);
    void Engine_FrameExecute(Engine* engine, float deltaTime);
}
```

ApplicationはEngineクラスのメンバ関数をDLL越しに直接呼ばず、このC関数群を `GetProcAddress()` で取得して使用する。

## Application

**役割**

Window・Engine・Editorのライフタイムを保持し、アプリケーション全体のメインループ、Window Messageの配送、フレーム時間およびFixed Updateの時間管理を行う。

```cpp
class Application
{
public:
    bool Initialize();
    void Run();
    void Finalize();

    void SetTargetFPS(double fps);
    double GetTargetFPS() const;

    void SetUnlimitedFrameRate(bool unlimited);
    bool IsUnlimitedFrameRate() const;

    void SetFixedDeltaTime(double deltaTime);
    double GetFixedDeltaTime() const;

    void RequestQuit();

private:
    bool LoadEngine();
    void UnloadEngine();

    ApplicationAPI CreateApplicationAPI();

    void ProcessMessages();
    void WaitUntil(Clock::time_point target);

private:
    Window m_Window;

    HMODULE m_EngineModule = nullptr;
    Engine* m_Engine = nullptr;

#if HESTIA_EDITOR
    Editor m_Editor;
#endif

    double m_TargetFPS = 120.0;
    double m_TargetFrameTime = 1.0 / 120.0;

    double m_FixedDeltaTime = 1.0 / 60.0;
    double m_AccumulatedTime = 0.0;

    bool m_UnlimitedFrameRate = false;
    bool m_Running = false;

    Clock::time_point m_LastFrameTime;

    HANDLE m_FrameTimer = nullptr;

    CreateEngineFunc m_CreateEngine = nullptr;
    DestroyEngineFunc m_DestroyEngine = nullptr;

    EngineInitializeFunc m_EngineInitialize = nullptr;
    EngineFinalizeFunc m_EngineFinalize = nullptr;

    EngineProcessMessageFunc m_EngineProcessMessage = nullptr;
    EngineFixedUpdateFunc m_EngineFixedUpdate = nullptr;
    EngineFrameExecuteFunc m_EngineFrameExecute = nullptr;
};
```

Engine.dllはApplicationによってロード・破棄される。Engineへの操作はC関数境界を使用し、EngineからApplicationへの操作は `ApplicationAPI` を使用する。

時間計測・フレーム制御は `double` 精度で行い、Engine以下へ渡す際に `float` へ変換する。

フレーム先頭で `ProcessMessages()` により溜まったWindow Messageを処理する。フレーム待機中は高精度Waitable Timerと `MsgWaitForMultipleObjectsEx` を使用し、メッセージ到着時には起床して `ProcessMessages()` を実行する。

目標時刻直前のみ短時間スピンし、スピン中に到着したメッセージは次フレーム先頭で処理する。

Unlimited時はフレーム待機のみを行わず、Fixed Updateの時間管理は通常通り継続する。
