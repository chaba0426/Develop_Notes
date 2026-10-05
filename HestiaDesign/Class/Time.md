# Time

Engine内部の時間状態と、Game Scriptから参照する時間APIを定義する。
Engineは `TimeSystem` を所有して更新し、Engine内部ではstatic Getter、Game.dll側では `HestiaGame::Time` から参照する。

## TimeSystem

**役割**

Engine内部の時間状態を保持・更新する。
更新はEngineが所有するインスタンスに対して行い、参照用の値はstatic Getterからも取得できる。

```cpp
namespace Hestia
{
    class TimeSystem
    {
    public:
        TimeSystem();
        ~TimeSystem();

        inline static float DeltaTime()
        {
            return s_instance->m_data.m_deltaTime;
        }

        inline static float UnscaledDeltaTime()
        {
            return s_instance->m_data.m_unscaledDeltaTime;
        }

        inline static float TotalTime()
        {
            return s_instance->m_data.m_totalTime;
        }

        inline static float UnscaledTotalTime()
        {
            return s_instance->m_data.m_unscaledTotalTime;
        }

        inline static float FixedDeltaTime()
        {
            return s_instance->m_data.m_fixedDeltaTime;
        }

        inline static float UnscaledFixedDeltaTime()
        {
            return s_instance->m_data.m_unscaledFixedDeltaTime;
        }

        inline static float TimeScale()
        {
            return s_instance->m_data.m_timeScale;
        }

        void SetTimeScale(float scale);

        void Update(float deltaTime);
        void UpdateFixed(float fixedDeltaTime);

        inline const TimeData& GetData() const
        {
            return m_data;
        }

    private:
        TimeData m_data;

        static TimeSystem* s_instance;
    };
}
```

[TimeData](#timedata)  
[TimeAPI](#timeapi)

`Update()` はApplicationから渡された実時間をUnscaled値として保持し、`TimeScale` を適用したDeltaTimeとTotalTimeを更新する。

`UpdateFixed()` はFixed Updateに使用する時間値を更新する。TotalTimeは通常フレームの `Update()` 側でのみ加算する。

### TimeData

**役割**

高頻度に参照する時間値をまとめて保持する。
Game.dll側の `TimeAPI` から直接参照できるDLL境界共有データとする。

```cpp
namespace Hestia
{
    struct TimeData
    {
        float m_deltaTime = 0.0f;
        float m_unscaledDeltaTime = 0.0f;

        float m_totalTime = 0.0f;
        float m_unscaledTotalTime = 0.0f;

        float m_fixedDeltaTime = 0.0f;
        float m_unscaledFixedDeltaTime = 0.0f;

        float m_timeScale = 1.0f;
    };
}
```

[TimeSystem](#timesystem)

### TimeAPI

**役割**

Game.dllからEngine側の時間情報へアクセスするためのDLL境界API。

Getterは `TimeData` を直接参照し、DLL境界の関数呼び出しを行わない。
値を書き換える `SetTimeScale()` は `TimeSystem` へ処理を渡す。

```cpp
namespace Hestia
{
    class ENGINE_API TimeAPI
    {
    public:
        explicit TimeAPI(TimeSystem& system)
            : m_system(system)
            , m_data(&system.GetData())
        {
        }

        inline float DeltaTime() const
        {
            return m_data->m_deltaTime;
        }

        inline float UnscaledDeltaTime() const
        {
            return m_data->m_unscaledDeltaTime;
        }

        inline float TotalTime() const
        {
            return m_data->m_totalTime;
        }

        inline float UnscaledTotalTime() const
        {
            return m_data->m_unscaledTotalTime;
        }

        inline float FixedDeltaTime() const
        {
            return m_data->m_fixedDeltaTime;
        }

        inline float UnscaledFixedDeltaTime() const
        {
            return m_data->m_unscaledFixedDeltaTime;
        }

        inline float TimeScale() const
        {
            return m_data->m_timeScale;
        }

        void SetTimeScale(float scale);

    private:
        TimeSystem& m_system;
        const TimeData* m_data = nullptr;
    };
}
```

[TimeSystem](#timesystem)  
[TimeData](#timedata)  
[HestiaGame::Time](#hestiagametime)

`SetTimeScale()` はEngine.dll側で以下のように `TimeSystem` へ転送する。

```cpp
void Hestia::TimeAPI::SetTimeScale(float scale)
{
    m_system.SetTimeScale(scale);
}
```

### HestiaGame::Time

**役割**

Game Scriptから時間情報へアクセスするためのstatic Facade。

```cpp
namespace HestiaGame
{
    class Time
    {
    public:
        inline static float DeltaTime()
        {
            return s_api->DeltaTime();
        }

        inline static float UnscaledDeltaTime()
        {
            return s_api->UnscaledDeltaTime();
        }

        inline static float TotalTime()
        {
            return s_api->TotalTime();
        }

        inline static float UnscaledTotalTime()
        {
            return s_api->UnscaledTotalTime();
        }

        inline static float FixedDeltaTime()
        {
            return s_api->FixedDeltaTime();
        }

        inline static float UnscaledFixedDeltaTime()
        {
            return s_api->UnscaledFixedDeltaTime();
        }

        inline static float TimeScale()
        {
            return s_api->TimeScale();
        }

        inline static void SetTimeScale(float scale)
        {
            s_api->SetTimeScale(scale);
        }

    private:
        inline static void Bind(Hestia::TimeAPI* api)
        {
            s_api = api;
        }

        inline static void Unbind()
        {
            s_api = nullptr;
        }

        inline static Hestia::TimeAPI* s_api = nullptr;
    };
}
```

[TimeAPI](#timeapi)

参照経路は以下とする。

```text
HestiaGame::Time
        ↓ inline
Hestia::TimeAPI
        ↓ inline
Hestia::TimeData
```

`SetTimeScale()` のみEngine側へ処理を渡す。

```text
HestiaGame::Time::SetTimeScale()
        ↓
Hestia::TimeAPI::SetTimeScale()
        ↓ DLL Boundary
Hestia::TimeSystem::SetTimeScale()
```
