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

private:
    void ProcessMessages();
    void WaitUntil(Clock::time_point target);

private:
    Window m_Window;
    Engine m_Engine;

#if HESTIA_EDITOR
    Editor m_Editor;
#endif

    double m_TargetFPS = 120.0;
    double m_TargetFrameTime = 1.0 / 120.0;

    double m_FixedDeltaTime = 1.0 / 60.0;
    double m_AccumulatedTime = 0.0;

    bool m_UnlimitedFrameRate = false;

    Clock::time_point m_LastFrameTime;

    HANDLE m_FrameTimer = nullptr;
};
```

時間計測・フレーム制御は `double` 精度で行い、Engine以下へ渡す際に `float` へ変換する。

フレーム先頭で `ProcessMessages()` により溜まったWindow Messageを処理する。フレーム待機中は高精度Waitable Timerと `MsgWaitForMultipleObjectsEx` を使用し、メッセージ到着時には起床して `ProcessMessages()` を実行する。

目標時刻直前のみ短時間スピンし、スピン中に到着したメッセージは次フレーム先頭で処理する。

Unlimited時はフレーム待機のみを行わず、Fixed Updateの時間管理は通常通り継続する。
