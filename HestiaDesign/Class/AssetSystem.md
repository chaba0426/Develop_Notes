# Asset System

Engine内部のAsset管理クラスと、Game.dll向け公開APIのクラス設計モック。
AssetSystemが名前解決・ロード・登録を統括し、CPU Assetは型別Storage、GPU ResourceはGraphicsが所有する。
DLL境界のテンプレート公開方法や失敗時処理など、未確定の詳細は本段階で固定しない。

## AssetSystem

**役割**

`Load<T>`・`Get<T>`・`Register<T>`を公開し、AssetDB・型別Loader・型別Storageを連携させる。
AssetSystemはEngineが所有し、GraphicsSystemはGPU資源の生成・Upload依頼先として参照する。

```cpp
namespace Hestia
{
    class GraphicsSystem;

    class AssetSystem
    {
    public:
        AssetSystem();
        ~AssetSystem();

        bool Initialize(
            std::string_view databasePath,
            GraphicsSystem* graphics);

        void Finalize();

        template<class T>
        static AssetHandle<T> Load(std::string_view name);

        template<class T>
        static T* Get(AssetHandle<T> handle);

        // assetの所有権をAssetSystemへ譲渡
        template<class T>
        static AssetHandle<T> Register(
            std::string_view name, T* asset);

    private:
        template<class T>
        AssetHandle<T> LoadImpl(std::string_view name);

        template<class T>
        AssetHandle<T> RegisterImpl(
            std::string_view name, T* asset);

        template<class T>
        AssetLoader<T>& GetLoader();

        template<class T>
        AssetStorage<T>& GetStorage();

        // 型共通の登録後処理（既定では何もしない）
        template<class T>
        void OnRegistered(AssetHandle<T> handle, T& asset);

        // 必要なAsset型のみオーバーロード
        void OnRegistered(AssetHandle<Mesh> handle, Mesh& asset);
        void OnRegistered(AssetHandle<Texture> handle, Texture& asset);

    private:
        AssetDB m_assetDB;

        std::tuple<
            AssetLoader<Mesh>,
            AssetLoader<Texture>,
            AssetLoader<Material>,
            AssetLoader<MaterialShader>
        > m_loaders;

        std::tuple<
            AssetStorage<Mesh>,
            AssetStorage<Texture>,
            AssetStorage<Material>,
            AssetStorage<MaterialShader>
        > m_storages;

        GraphicsSystem* m_graphics = nullptr; // 非所有
        static AssetSystem* s_instance;
    };
}
```

[AssetDB](#assetdb)  
[AssetLoader<T>](#assetloadert)  
[AssetStorage<T>](#assetstoraget)  
[AssetHandle<T>](#assethandlet)  
[Engine](./Engine.md#engine)  
[AssetAPI](#assetapi)

- `AssetDB`は**登録情報の名前解決のみ**を担当し、AssetStorageは所有しない。
- `AssetSystem`が`std::tuple`で各`AssetLoader<T>`と`AssetStorage<T>`のインスタンスを直接所有する。
- 対応Asset型は各Tupleに具体型として列挙する。`std::get<AssetLoader<T>>` / `std::get<AssetStorage<T>>`でコンパイル時に型を選択できる。
- `Load`・`LoadImpl`・`Get`・`Register`・`RegisterImpl`は汎用テンプレート。`OnRegistered`はGPU生成が必要な型だけオーバーロードする。
- `s_instance`はEngine所有の実体への非所有ポインタ。Game向け公開APIは別途`AssetAPI`を通す。
- 初期は個別Unload・GPUだけの解放・RenderTextureのAsset化を実装しない。

**初期化の考え方**

各`AssetLoader<T>`が`Initialize()`を持つ。依存するシステムは型によって異なるため、AssetSystemが具体型ごとに初期化を呼ぶ。

```cpp
bool AssetSystem::Initialize(
    std::string_view databasePath,
    GraphicsSystem* graphics)
{
    s_instance = this;
    m_graphics = graphics;

    if (!m_assetDB.Initialize(databasePath))
        return false;

    if (!GetLoader<Mesh>().Initialize())
        return false;

    if (!GetLoader<Texture>().Initialize())
        return false;

    if (!GetLoader<Material>().Initialize())
        return false;

    if (!GetLoader<MaterialShader>().Initialize(graphics))
        return false;

    return true;
}
```

`MaterialShader`だけGraphicsSystemを渡すのは**例示**。実際にGraphicsを必要とするLoaderは型別実装を決める際に確定する。通常のMesh/TextureのGPUアップロードは引き続きAssetSystemからGraphicsSystemへ依頼する。

**共通処理のモック（AssetSystem.cpp）**

```cpp
template<class T>
AssetLoader<T>& AssetSystem::GetLoader()
{
    return std::get<AssetLoader<T>>(m_loaders);
}

template<class T>
AssetStorage<T>& AssetSystem::GetStorage()
{
    return std::get<AssetStorage<T>>(m_storages);
}

template<class T>
AssetHandle<T> AssetSystem::Load(std::string_view name)
{
    return s_instance->LoadImpl<T>(name);
}

template<class T>
T* AssetSystem::Get(AssetHandle<T> handle)
{
    return s_instance->GetStorage<T>().Get(handle);
}

template<class T>
AssetHandle<T> AssetSystem::Register(
    std::string_view name, T* asset)
{
    return s_instance->RegisterImpl<T>(name, asset);
}

template<class T>
AssetHandle<T> AssetSystem::LoadImpl(std::string_view name)
{
    auto& storage = GetStorage<T>();

    if (auto handle = storage.Find(name); handle.IsValid())
        return handle;

    const AssetInfo* info = m_assetDB.Find(name);
    if (!info)
        return {};

    // TODO: info->m_type と T の型一致を検査
    T* asset = GetLoader<T>().Load(info->m_path);
    if (!asset)
        return {};

    return RegisterImpl<T>(name, asset);
}

template<class T>
AssetHandle<T> AssetSystem::RegisterImpl(
    std::string_view name, T* asset)
{
    // ここでraw pointerの所有権を受け取る。
    // make_uniqueは既存ポインタの引き取りには使わない。
    std::unique_ptr<T> owner(asset);

    auto& storage = GetStorage<T>();
    auto handle = storage.Register(name, std::move(owner));
    if (!handle.IsValid())
        return {};

    OnRegistered(handle, *storage.Get(handle));
    return handle;
}

template<class T>
void AssetSystem::OnRegistered(AssetHandle<T>, T&)
{
    // CPU Assetのみの型では追加処理なし
}

void AssetSystem::OnRegistered(
    AssetHandle<Mesh> handle, Mesh& mesh)
{
    // GraphicsへDXMesh生成・Uploadを依頼
}

void AssetSystem::OnRegistered(
    AssetHandle<Texture> handle, Texture& texture)
{
    // GraphicsへDXTexture生成・Uploadを依頼
}
```

- `LoadImpl`はCache → AssetDBの名前解決 → Loader → RegisterImplの順。ファイルを読み込まない`Register`も同じ`RegisterImpl`へ合流する。
- `RegisterImpl`は`T*`を受け取り、Storageへ登録する直前に`std::unique_ptr<T>`へ変換する。登録失敗時も所有権を戻さない契約とする。
- `OnRegistered`で必要に応じてGPU Resource生成を依頼する。GPU Resource自体の所有・コマンド送信・Fence管理はGraphics側。
- `AssetLoader<T>::Load()`は必要な別Assetを`AssetSystem::Load<U>()`で再帰的にロードできる。循環依存への対処は保留。

**テンプレート定義の配置**

扱えるAsset型がTupleで固定されているため、`AssetSystem`のテンプレート関数定義は`AssetSystem.cpp`へまとめ、対応型を明示的インスタンス化する案を採用する。

```cpp
// AssetSystem.cpp の末尾（Meshの例）
template AssetHandle<Mesh>
AssetSystem::Load<Mesh>(std::string_view);

template Mesh*
AssetSystem::Get<Mesh>(AssetHandle<Mesh>);

template AssetHandle<Mesh>
AssetSystem::Register<Mesh>(std::string_view, Mesh*);

// Texture / Material / MaterialShaderも同様
```

上記と同じ翻訳単位で`LoadImpl`・`RegisterImpl`・`GetLoader`・`GetStorage`のテンプレート定義が見えれば、公開関数のインスタンス化から必要な内部実装も生成できる。
`AssetStorage<T>`の汎用テンプレート実装は原則ヘッダー側。`std::tuple`でLoaderを値所有するため、`AssetSystem.h`には**全Loader特殊化の完全なクラス定義**が必要。
Loaderのヘッダーは`AssetSystem.h`をIncludeせず、再帰的LoadのためのIncludeは各Loaderの`.cpp`側で行う。

### AssetDB

**役割**

YAMLの登録情報から名前→型・ファイルPathを解決する。CPU Asset本体・ロード済みCacheは持たない。

```cpp
namespace Hestia
{
    struct AssetInfo
    {
        AssetType m_type;
        std::string m_path;
    };

    class AssetDB
    {
    public:
        bool Initialize(std::string_view databasePath);
        bool Reload();

        const AssetInfo* Find(std::string_view name) const;

    private:
        std::unordered_map<std::string, AssetInfo> m_entries;
    };
}
```

[AssetSystem](#assetsystem)

- `m_entries`はYAMLに登録された名前→型・Pathを保持する。名前は正規化して検索する（従来方針では大文字小文字を区別しない）。
- `Reload`は登録情報の更新を想定し、既存のStorage内AssetとGPU Resourceは変更しない。
- Load時の`T`との型照合、手動`Register`したAssetとの名前衝突規則はAssetSystem側で統括する。名前のグローバルな重複検出の詳細は未確定。

### AssetStorage<T>

**役割**

型別のCPU Assetを所有し、名前→HandleのCacheと、Index→Asset実体を管理する。
`Get`で借用した`T*`が後続のAsset登録・Vector再配置で移動しないようにする。

```cpp
namespace Hestia
{
    template<class T>
    class AssetStorage
    {
    public:
        AssetHandle<T> Find(std::string_view name) const;

        AssetHandle<T> Register(
            std::string_view name,
            std::unique_ptr<T> asset);

        T* Get(AssetHandle<T> handle);
        const T* Get(AssetHandle<T> handle) const;

    private:
        struct Slot
        {
            std::unique_ptr<T> m_asset;
            uint32_t m_generation = 1;
        };

        std::vector<Slot> m_slots;

        std::unordered_map<
            std::string, AssetHandle<T>
        > m_nameToHandle;
    };
}
```

[AssetHandle<T>](#assethandlet)  
[AssetSystem](#assetsystem)

- 型別の連番Indexで`m_slots`へ直接アクセスする。異なる型のStorageはIndex空間を共有しない。
- `unique_ptr`で実体を所有するので`vector`のスロット再配置後もAssetのアドレスは変わらない。
- `Get`ではIndex範囲・Generation・Assetの有無を確認して借用ポインタを返す。
- 初期は個別Unloadを持たず、AssetはAssetSystem終了まで保持する。将来のIndex再利用や貸出ポインタ失効条件は後回し。
- Storageの汎用実装は型ごとに特殊化しない。

### AssetHandle<T>

**役割**

型別のCPU Assetと、対応するGPU Resourceの検索に用いる識別子。

```cpp
namespace Hestia
{
    template<class T>
    struct AssetHandle
    {
        uint32_t m_index = UINT32_MAX;
        uint32_t m_generation = 0;

        bool IsValid() const
        {
            return m_index != UINT32_MAX;
        }
    };
}
```

[AssetStorage<T>](#assetstoraget)

- `T`でAsset型を区別するため、Handle本体にTypeIDを持つ必要はない。
- Generationは将来のIndex再利用に備えて保持する。`IsValid`は無効値の簡易判定で、Storage上の存在は保証しない。
- GPUResourceStorageも同じIndex/Generationを用いる。GPU用の別Handleへの変換表は初期実装では持たない。

### AssetLoader<T>

**役割**

型ごとのファイル読込・解析・CPU Asset生成を担当する。型別に**完全特殊化**し、必要な内部状態と依存Systemを持てる。
共通入口は`Initialize(...)`と`Load(path)`。初期化引数・内部実装は型ごとに異なってよい。

```cpp
namespace Hestia
{
    class GraphicsSystem;

    template<class T>
    class AssetLoader;

    template<>
    class AssetLoader<Mesh>
    {
    public:
        bool Initialize();
        Mesh* Load(std::string_view path);

    private:
        // Mesh固有のImporter・作業状態など
    };

    template<>
    class AssetLoader<Texture>
    {
    public:
        bool Initialize();
        Texture* Load(std::string_view path);

    private:
        // TextureのDecoderなど
    };

    template<>
    class AssetLoader<Material>
    {
    public:
        bool Initialize();
        Material* Load(std::string_view path);

    private:
        // 依存Assetの名前を解析・解決
    };

    template<>
    class AssetLoader<MaterialShader>
    {
    public:
        bool Initialize(GraphicsSystem* graphics);
        MaterialShader* Load(std::string_view path);

    private:
        GraphicsSystem* m_graphics = nullptr;
    };
}
```

[AssetSystem](#assetsystem)

`Load`の戻り値`T*`はAssetSystemに所有権を渡す。失敗時は`nullptr`を返す仮仕様。
LoaderはStorageやGPUResourceStorageを所有しない。GraphicsSystemが必要なLoaderにのみ`Initialize`で依存を渡す。

**依存Assetをロードする例**

```cpp
Material* AssetLoader<Material>::Load(std::string_view path)
{
    auto material = std::make_unique<Material>();

    // ファイルから依存Asset名を取得（解析詳細は省略）
    auto shader = AssetSystem::Load<MaterialShader>(shaderName);
    auto texture = AssetSystem::Load<Texture>(textureName);

    material->SetShader(shader);
    material->SetTexture(texture);

    return material.release();
}
```

`Material` Loaderの`.cpp`から`AssetSystem.h`をIncludeする。Cache済みの依存Assetは`Load<T>`が同じHandleを返す。
`A → B → A`のように循環依存があると、現状の「読込完了後にCache登録」方式では再帰が止まらないため、初期は循環依存を禁止し、必要に応じてLoading状態や検出機構を検討する。

### AssetAPI

**役割**

Game.dllにAsset操作を公開するBoundary API。Engineが所有し`AssetSystem*`を非所有参照する。

```cpp
namespace Hestia
{
    class ENGINE_API AssetAPI
    {
    public:
        void Initialize(AssetSystem* system);

        template<class T>
        AssetHandle<T> Load(std::string_view name);

        template<class T>
        T* Get(AssetHandle<T> handle);

        template<class T>
        AssetHandle<T> Register(std::string_view name, T* asset);

    private:
        AssetSystem* m_system = nullptr;
    };
}
```

[AssetSystem](#assetsystem)  
[GameEngineAPI](./Engine.md#gameengineapi)  
[HestiaGame::Assets](#hestiagameassets)

`AssetAPI`の操作形状は仮置き。DLL境界でのテンプレート公開・エクスポート・文字列型や所有権譲渡のABI詳細は**後で検討**する。

### HestiaGame::Assets

**役割**

Game Scriptから呼ぶstatic Facade。`AssetAPI`へ転送し、Asset実体は所有しない。

```cpp
namespace HestiaGame
{
    class Assets
    {
    public:
        template<class T>
        static Hestia::AssetHandle<T> Load(std::string_view name);

        template<class T>
        static T* Get(Hestia::AssetHandle<T> handle);

        // T*の所有権をEngine側へ譲渡
        template<class T>
        static Hestia::AssetHandle<T> Register(
            std::string_view name, T* asset);

    private:
        static void Bind(Hestia::AssetAPI* api);
        static void Unbind();

        inline static Hestia::AssetAPI* s_api = nullptr;
    };
}
```

[AssetAPI](#assetapi)  
[GameEngineAPI](./Engine.md#gameengineapi)

GameRuntime側の初期化・終了で`Bind` / `Unbind`する構成を想定。`Get`の返す`T*`は非所有で、EngineがAssetを破棄すると無効になる。

## Graphicsとの接続

GPU Resourceを必要とする型の`OnRegistered`からGraphicsにUploadを依頼する。
CPU AssetとGPU Resourceの論理的寿命は一致させ、所有者は分ける。

```text
AssetSystem
├─ AssetDB  (Name → AssetInfo)
├─ tuple<AssetStorage<T>...>
│  ├─ AssetStorage<Mesh>    ─ AssetHandle<Mesh>    ─┐
│  └─ AssetStorage<Texture> ─ AssetHandle<Texture> ─┤
└─ tuple<AssetLoader<T>...>                          │
                                                   │
GraphicsSystem                                     │
└─ DX12BackEnd                                      │
   ├─ GPUResourceStorage                            │
   │  ├─ DXMesh    [AssetHandle<Mesh>]    <─────────┤
   │  └─ DXTexture [AssetHandle<Texture>] <─────────┘
   │
   ├─ DXRenderTexture m_sceneColor;
   ├─ DXRenderTexture m_gbufferNormal;
   └─ DXRenderTexture m_gbufferMaterial;
```

- `DXMesh`はGPUのVertex/Index ResourceとBufferView、`DXTexture`はTexture ResourceとSRV Heap Indexなどを保持する。
- GPU側はAssetHandleと同じIndex/Generationで検索する。GPUリソース未生成のSlotは許容する。
- GPU転送・Descriptor・GPU使用中のFence・物理解放はGraphics内部が管理する。
- GPU ResourceはAssetの寿命と連動して論理削除する。GPU実体の破棄は使用完了後に遅延できるようにする。
- GBuffer、SceneColor、その他内部RenderTargetは`DXRenderTexture`をGraphics内部メンバ等として別管理し、初期はAsset化しない。

## 未決定事項

- 対応する具体Asset型一覧、各Loaderの初期化依存、失敗通知とデコード方式。
- `AssetDB`の名前解決・型照合・手動`Register`名の一意性判定。
- GPU生成依頼の具体的なAPI、Upload失敗時・Ready状態・CPU Upload元メモリの解放時点。
- 個別Unload、空きIndexの再利用、Generation更新、貸出ポインタの失効契約。
- 依存Assetの循環検出・ロード中状態、非同期ロード。
- `AssetAPI`と`HestiaGame::Assets`のDLL境界でのテンプレート呼出・所有権譲渡のABI。
- DBの手動ReloadをGameへ公開するかどうか、Material/Shaderの詳細。

## 参照元

- [HestiaDesign / AssetDB](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/Asset/AssetDB.md)
- [HestiaDesign / AssetManagement](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/Asset/AssetManagement.md)
- [HestiaDesign / AssetType](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/Asset/AssetType.md)
- [HestiaDesign / DevelopNotesDesign / AssetSystem](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/DevelopNotesDesign/Class/AssetSystem.md)
