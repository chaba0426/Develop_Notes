# Application

Application.exeの中核となるクラス群。
ApplicationがWindow・Engine・Editorのライフタイムとメインループを管理し、
EngineからApplicationへのアクセスにはApplicationAPIを使用する。

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
    Window m_window;

    HMODULE m_engineModule = nullptr;
    const Hestia::EngineAPI* m_engineAPI = nullptr;
    Hestia::Engine* m_engine = nullptr;

#if HESTIA_EDITOR
    Editor m_editor;
#endif

    double m_targetFPS = 120.0;
    double m_targetFrameTime = 1.0 / 120.0;

    double m_fixedDeltaTime = 1.0 / 60.0;
    double m_accumulatedTime = 0.0;

    bool m_unlimitedFrameRate = false;
    bool m_running = false;

    Clock::time_point m_lastFrameTime;

    HANDLE m_frameTimer = nullptr;
};
```

[ApplicationAPI](#applicationapi)  
[Engine](./Engine.md#engine)  
[EngineAPI](./Engine.md#engineapi)

Engine.dllはApplicationによってロード・破棄される。ApplicationからEngineへの操作は `Hestia::EngineAPI`、EngineからApplicationへの操作は `ApplicationAPI` を使用する。

時間計測・フレーム制御は `double` 精度で行い、Engine以下へ渡す際に `float` へ変換する。

フレーム先頭で `ProcessMessages()` により溜まったWindow Messageを処理する。フレーム待機中は高精度Waitable Timerと `MsgWaitForMultipleObjectsEx` を使用し、メッセージ到着時には起床して `ProcessMessages()` を実行する。

目標時刻直前のみ短時間スピンし、スピン中に到着したメッセージは次フレーム先頭で処理する。

Unlimited時はフレーム待機のみを行わず、Fixed Updateの時間管理は通常通り継続する。

### ApplicationAPI

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

    void* m_context = nullptr;

    SetTargetFPSFunc m_setTargetFPS = nullptr;
    GetTargetFPSFunc m_getTargetFPS = nullptr;

    SetUnlimitedFrameRateFunc m_setUnlimitedFrameRate = nullptr;
    IsUnlimitedFrameRateFunc m_isUnlimitedFrameRate = nullptr;

    SetFixedDeltaTimeFunc m_setFixedDeltaTime = nullptr;
    GetFixedDeltaTimeFunc m_getFixedDeltaTime = nullptr;

    RequestQuitFunc m_requestQuit = nullptr;

    friend class Application;
};
```

[Application](#application)

Applicationが生成時に自身をContextとして登録する。Engine側はContextを意識せず `ApplicationAPI::SetTargetFPS()` などを呼び出す。
