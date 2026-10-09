# Asset System

Engine内部のアセット管理と、Game.dllに公開するAsset APIのクラスモック。
HestiaDesignのAssetDB・AssetManagement・AssetTypeを元に、現行のEngine / Boundary API構成へ合わせて整理する。
本資料は責務・所有関係・主要メンバ・Public APIの草案であり、実装用Headerではない。

## AssetSystem

**役割**

Game / EngineからのLoad・Get・Registerを受け付け、AssetDBへの問い合わせと型別Loaderの呼び出しを管理する。
GPUリソースが必要なAssetはGraphicsSystemへ生成・アップロードを依頼する。

```cpp
namespace Hestia
{
    class AssetSystem
    {
    public:
        bool Initialize(std::string_view databasePath);
        void Finalize();

        template<class T>
        static AssetHandle<T> Load(std::string_view name);

        template<class T>
        static T* Get(AssetHandle<T> handle);

        template<class T>
        static AssetHandle<T> Register(
            std::string_view name,
            T&& asset);

    private:
        template<class T>
        AssetHandle<T> LoadImpl(std::string_view name);

        template<class T>
        AssetHandle<T> RegisterImpl(
            std::string_view name,
            T&& asset);

        AssetDB m_assetDB;

        static AssetSystem* s_instance;
    };
}
```

[AssetDB](#assetdb)  
[AssetLoader](#assetloadert)  
[AssetHandle](#assethandlet)  
[Engine](./Engine.md#engine)  
[AssetAPI](#assetapi)

- Engineが`AssetSystem`を値所有する。内部状態は`m_assetDB`に集約し、AssetSystemへCacheや型別Storageを重複して持たせない。
- `s_instance` はEngine所有の実体へのprivateな非所有ポインタ。static公開入口はその実体へ転送し、System実体を取得するpublic Getterは作らない。
- 初期のGame公開操作は`Load<T>`・`Get<T>`・`Register<T>`の3つ。個別UnloadやGPUのみのReleaseは初期公開APIに含めない。
- AssetSystemがロードと登録の手順を組み立てる。AssetDB自身にはファイル読込やGPU操作をさせない。

**Loadの流れ**

```text
AssetSystem::Load<T>(name)
    ↓
AssetDBで名前を正規化して型別Cacheを検索
    ├─ Hit  → 既存のAssetHandle<T>を返す
    └─ Miss → AssetDBから要求TypeとPathを解決
                    ↓
              AssetLoader<T>::Load(path)
                    ↓
              AssetDBへAssetを格納しHandleを割り当て
                    ↓
              GPU資源が必要な型はGraphicsへアップロード依頼
                    ↓
              AssetHandle<T>を返す
```

`Register<T>` はファイル読込を通らず、渡されたAssetをAssetDBへ格納する。その後は`Load<T>`と同じGPUアップロード経路を使用する。
初期は別のLoaderインスタンスを所有せず、型ごとの`AssetLoader<T>`を呼び出す。

### AssetDB

**役割**

YAMLの登録情報を保持し、名前からType・Path・ロード済みHandleを解決する。
型ごとの`AssetStorage<T>`を所有し、ロード済みのCPU Assetの実体も管理する。

```cpp
namespace Hestia
{
    class AssetDB
    {
    public:
        bool Initialize(std::string_view databasePath);
        bool Reload();

        template<class T>
        AssetHandle<T> FindCached(std::string_view name) const;

        template<class T>
        std::string_view FindPath(std::string_view name) const;

        template<class T>
        AssetHandle<T> Store(std::string_view name, T&& asset);

        template<class T>
        T* Get(AssetHandle<T> handle);

    private:
        // YAML登録情報: 正規化名 → Type / Path
        // 登録名は全Typeで一意。手動登録名との重複も検査する。

        AssetStorage<Mesh> m_meshes;
        AssetStorage<Texture> m_textures;
        AssetStorage<Material> m_materials;
        AssetStorage<MaterialShader> m_materialShaders;
        // 必要な具体Asset型を追加
    };
}
```

[AssetSystem](#assetsystem)  
[AssetStorage](#assetstoraget)  
[AssetHandle](#assethandlet)

- 名前は大文字小文字を区別せず、全Asset型を通して一意に管理する。Path自体は小文字に変換しない。
- `FindCached`は型別Storage内の名前→Handle対応を使う。`FindPath`はYAMLから読んだ登録情報を使う。
- `Store`はロード済みAssetのCache格納と手動Registerの共通処理を表す仮名。登録済みYAML名からのロードは許容し、手動Registerと既存名の衝突は拒否する。
- DBの登録情報とロード済みAssetは別管理。将来のDB手動Reloadでは登録情報だけを差し替え、Storage内のAssetや対応GPUリソースは維持する。
- `Mesh`・`Texture`・`Material`・`MaterialShader`は現在の資料にある例。確定した対応型一覧ではない。`RenderTexture`は現段階でAssetに含めない。

### AssetStorage<T>

**役割**

Asset型ごとのCPU実体を所有し、HandleのIndexでスロットへアクセスする。
外部へ貸し出す`T*`のアドレスが、StorageへのAsset追加で変わらないようにする。

```cpp
namespace Hestia
{
    template<class T>
    struct AssetSlot
    {
        std::unique_ptr<T> m_asset;
        uint32_t m_generation = 1;
    };

    template<class T>
    class AssetStorage
    {
    public:
        AssetHandle<T> Find(std::string_view name) const;
        AssetHandle<T> Register(std::string_view name, T&& asset);

        T* Get(AssetHandle<T> handle);
        const T* Get(AssetHandle<T> handle) const;

    private:
        std::vector<AssetSlot<T>> m_slots;
        std::unordered_map<std::string, AssetHandle<T>> m_cachedByName;
    };
}
```

[AssetSlot](#assetstoraget)  
[AssetHandle](#assethandlet)  
[AssetDB](#assetdb)

- 型別の連番Indexを発行する。異なる型なら同じIndexを使用できる。
- `vector`のスロットが再配置されても`unique_ptr<T>`が指すAsset実体のアドレスは変わらない。
- `Get`はGenerationを照合してAssetへの非所有ポインタを返す。貸出ポインタは登録追加後も有効。
- 初期は個別UnloadとIndex再利用を実装しない。Asset実体はAssetSystemの終了まで保持する。将来の削除ではGeneration更新と貸出ポインタ失効の扱いを決める。
- 大量のAssetを連続走査する用途ではないため、実体の連続配置より貸出ポインタの安定性を優先する。

### AssetHandle<T>

**役割**

型別StorageとGraphics側の対応GPUリソースを参照する識別子。
型はテンプレート引数`T`で表し、値はIndexとGenerationを持つ。

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

[AssetStorage](#assetstoraget)

- Indexは型ごとに独立。GenerationはIndex再利用時の古いHandleを識別するために保持する。
- `IsValid`は値としての無効値判定。実際にStorageへ存在するかは`Get`等で照合する。
- Graphics側も`AssetHandle<Mesh>` / `AssetHandle<Texture>`のIndexとGenerationで対応するGPUリソースを解決し、別の`MeshHandle` / `TextureHandle`への変換表は初期に作らない。

### AssetLoader<T>

**役割**

型ごとにファイルを読み込み、CPU Assetを生成する。Assetの名前解決・Cache所有・GPU資源の所有は担当しない。

```cpp
namespace Hestia
{
    template<class T>
    struct AssetLoader;

    // 型別に実装する例
    template<>
    struct AssetLoader<Mesh>
    {
        static Mesh Load(std::string_view path);
    };
}
```

[AssetSystem](#assetsystem)  
[AssetDB](#assetdb)

`Load`の失敗通知方法と対応ファイル形式は未確定。この例は型別に処理を分けるためのモックであり、実装上の戻り値は後で決める。

### AssetAPI

**役割**

Engine内部のAssetSystemをGame.dllへ直接公開せず、Gameに許可したアセット操作だけを渡すBoundary API。
Engineが値所有し、初期化後に`AssetSystem*`を設定する。

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
        AssetHandle<T> Register(std::string_view name, T&& asset);

    private:
        AssetSystem* m_system = nullptr;
    };
}
```

[AssetSystem](#assetsystem)  
[GameEngineAPI](./Engine.md#gameengineapi)  
[Assets](#hestiagameassets)

現行の`GameEngineAPI`には、Engineが所有する`AssetAPI`への非所有ポインタを格納する。
TemplateをDLL境界越しに呼ぶための定義・明示的実体化・対応するAsset型の公開Headerは未確定。ここではGame側の操作形状のみを示す。

### HestiaGame::Assets

**役割**

Game ScriptへLoad・Get・Registerをstaticメソッドとして公開し、AssetAPIへ転送するFacade。

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

        template<class T>
        static Hestia::AssetHandle<T> Register(
            std::string_view name,
            T&& asset);

    private:
        static void Bind(Hestia::AssetAPI* api);
        static void Unbind();

        inline static Hestia::AssetAPI* s_api = nullptr;
    };
}
```

[AssetAPI](#assetapi)  
[GameEngineAPI](./Engine.md#gameengineapi)

`Bind` / `Unbind`はGameRuntime側の初期化・終了から呼ぶ。FacadeはAsset実体を所有しない。

## Graphicsとの接続

CPU Assetと対応するGPUリソースは別々の場所で所有する。

```text
AssetSystem
└─ AssetDB
   ├─ AssetStorage<Mesh>       ── AssetHandle<Mesh>    ──┐
   └─ AssetStorage<Texture>    ── AssetHandle<Texture> ─┤
                                                       │
GraphicsSystem                                         │
└─ DX12BackEnd                                         │
   └─ GPUResourceStorage                               │
      ├─ DXMesh    [AssetHandle<Mesh>]     <───────────┤
      └─ DXTexture [AssetHandle<Texture>]  <───────────┘

Graphics内部の描画用リソース（AssetDBとは独立）
├─ DXRenderTexture m_sceneColor;
├─ DXRenderTexture m_gbufferNormal;
└─ DXRenderTexture m_gbufferMaterial;
```

- `DXMesh`はGPUのVertex / Index ResourceとBufferView等を持つ。`DXTexture`はGPU Texture ResourceとMaster SRV Heap上のIndex等を持つ。
- Graphicsは型別に`AssetHandle<T>`と同じIndexでGPU実体を引き、Generationも照合する。GPU資源を持たないSlotは許容する。
- AssetSystemが必要なGPUアップロードを依頼する。GPU実体・Descriptor・転送コマンド・Fenceの管理はGraphics側の責務。
- **論理的な寿命はCPU Assetに合わせる**。将来Assetを削除する場合は対応GPU資源も使用不可にし、実体の解放はGPU Fence完了後まで遅延できるようにする。
- RenderTarget / GBuffer / SceneColor等は初期にAsset化せず、Graphics内部の`DXRenderTexture`メンバ等として保持する。GPU専用の`TextureHandle`変換表は初期に設けない。

## 現時点で保留する事項

- AssetLoaderの失敗通知と、対応Asset型・ファイル形式の確定。
- `AssetDB::Store`の内部実装、TypeごとのStorage選択、名前の正規化の具体的な文字範囲。
- 個別Unload、空きIndex再利用、Generation更新、貸出ポインタの失効条件。
- 同期／非同期ロードとGPUアップロード完了時点の通知。
- `AssetAPI`とGame FacadeのテンプレートをDLL境界でどう提供するか。
- GPU資源登録・転送要求の具体的なGraphics API。Assetが保持するCPU Upload元データの解放時点。
- AssetDBの手動ReloadをGameへ公開するかどうか。
- Material / MaterialShaderの詳細は別資料で設計する。

## 参照元

- [HestiaDesign / AssetDB](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/Asset/AssetDB.md)
- [HestiaDesign / AssetManagement](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/Asset/AssetManagement.md)
- [HestiaDesign / AssetType](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/Asset/AssetType.md)
- [HestiaDesign / DevelopNotesDesign / AssetSystem](https://github.com/YokoyamaHaruki64/HestiaDesign/blob/main/DevelopNotesDesign/Class/AssetSystem.md)
