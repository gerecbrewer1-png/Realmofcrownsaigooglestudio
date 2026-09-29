# Asset Directory Structure

## Public Assets Folder Layout

```
public/
└── assets/
    ├── README.md (this file)
    ├── terrain/
    │   ├── grass/
    │   ├── dirt/
    │   ├── snow/
    │   ├── rock/
    │   ├── cliffs/
    │   └── water/
    ├── environment/
    │   ├── trees/
    │   │   ├── pine/
    │   │   ├── oak/
    │   │   └── birch/
    │   ├── rocks/
    │   ├── plants/
    │   └── mountains/
    ├── buildings/
    │   ├── castles/
    │   │   ├── tier_1/
    │   │   ├── tier_2/
    │   │   └── tier_3/
    │   ├── houses/
    │   │   ├── stone/
    │   │   └── wood/
    │   ├── resource/
    │   │   ├── farm/
    │   │   ├── mine/
    │   │   └── lumber/
    │   ├── military/
    │   │   ├── towers/
    │   │   ├── walls/
    │   │   └── gates/
    │   └── special/
    │       ├── shrines/
    │       └── camps/
    ├── resources/
    │   ├── stone/
    │   ├── wood/
    │   ├── gold/
    │   └── iron/
    ├── military/
    │   ├── infantry/
    │   ├── cavalry/
    │   ├── archers/
    │   ├── banners/
    │   └── weapons/
    ├── characters/
    │   ├── heroes/
    │   ├── villagers/
    │   ├── merchants/
    │   └── npcs/
    ├── effects/
    │   ├── fire/
    │   ├── smoke/
    │   ├── magic/
    │   ├── particles/
    │   └── weather/
    └── ui/
        ├── icons/
        ├── buttons/
        ├── textures/
        └── fonts/
```

## File Naming Conventions

### Models (GLB/glTF)
```
{category}_{type}_{variant}_{lod}.glb
{category}_{type}_{variant}_{lod}.gltf (with separate texture folder)

Examples:
- building_castle_tier1_lod0.glb
- building_castle_tier1_lod1.glb
- environment_tree_pine_lod0.glb
- resource_stone_deposit_lod0.glb
- military_soldier_lod0.glb
```

### Textures (PNG/JPG)
```
{assetname}_{texturetype}_{resolution}.png

Examples:
- grass_diffuse_2k.png
- grass_normal_2k.png
- grass_roughness_2k.png
- grass_ao_2k.png
- castle_diffuse_4k.png
- castle_normal_4k.png
```

### Texture Types
- `diffuse` or `albedo` - Color/base color
- `normal` - Normal map for surface detail
- `roughness` - Roughness/metalness channel
- `ao` or `ambient` - Ambient occlusion
- `metallic` - Metallic channel (if separate)
- `height` or `displacement` - Height map

## Loading Assets in Code

### Via Asset Registry
```typescript
import { getAssetInfo, ASSET_REGISTRY } from '@/assets/registry/assetRegistry';

const assetInfo = getAssetInfo('castle_tier_1');
const filePath = assetInfo?.filePath;
```

### Direct Model Loading
```typescript
import { modelLoader } from '@/assets/loaders/modelLoader';

const model = await modelLoader.loadAsset('public/assets/buildings/castles/tier_1/building_castle_tier1_lod0.glb');
const instance = await modelLoader.createInstance('public/assets/buildings/castles/tier_1/building_castle_tier1_lod0.glb');
```

### With LOD System
```typescript
import { LODManager, DEFAULT_LOD_CONFIG } from '@/assets/lod/lodSystem';

const manager = new LODManager(myObject, DEFAULT_LOD_CONFIG);
manager.setLOD('lod0', highDetailMesh);
manager.setLOD('lod1', mediumDetailMesh);
manager.setLOD('lod2', lowDetailMesh);
manager.setLOD('lod3', distantMesh);
```

### With Instancing
```typescript
import { InstanceBatchManager } from '@/assets/instancing/instancedMeshPool';

const batcher = new InstanceBatchManager();
const pool = batcher.getPool('trees', geometry, material, 1000);

pool.addInstance({
  position: new THREE.Vector3(10, 0, 20),
  rotation: new THREE.Euler(),
  scale: new THREE.Vector3(1, 1, 1),
});
```

## Asset Import Checklist

When adding new assets to the repository:

- [ ] Asset acquired from legal source (check license)
- [ ] Asset format: GLB or glTF
- [ ] File size reasonable (<10MB for single model, <2MB for textures)
- [ ] Textures power-of-2 resolution (512, 1024, 2048, 4096)
- [ ] Model LOD variants created (if applicable)
- [ ] Normal maps and PBR materials included
- [ ] Asset placed in correct folder structure
- [ ] Filename follows naming convention
- [ ] `assetRegistry.ts` updated with entry
- [ ] Asset license documented in `ASSET_ATTRIBUTION.md`
- [ ] Model tested in-scene for visual quality
- [ ] LOD switching verified
- [ ] Performance impact measured (draw calls, VRAM)
- [ ] TypeScript compiles without errors

## Performance Guidelines

### Texture Budgets
- **Terrain**: 2K resolution maximum (tileable)
- **Buildings**: 2K-4K for primary, 1K for secondary
- **Small objects**: 512-1K
- **Characters**: 1K-2K
- **UI**: 512-2K
- **Total active VRAM**: <2GB target

### Triangle Count Budgets
- **LOD0 (close)**: 5K-50K tris
- **LOD1 (medium)**: 2K-10K tris
- **LOD2 (far)**: 300-2K tris
- **LOD3 (distant)**: 50-300 tris or billboard

### Draw Call Budget
- **Performance mode**: <500 draw calls
- **Balanced mode**: <800 draw calls
- **Ultra mode**: <1200 draw calls

## Future Optimizations

- [ ] Implement Draco compression for GLB files
- [ ] Implement KTX2 texture compression
- [ ] Create automated LOD generation pipeline
- [ ] Set up texture atlasing workflow
- [ ] Build asset profiling dashboard

## Attribution Template

When adding assets, create an entry in `ASSET_ATTRIBUTION.md`:

```markdown
### Asset Name
- **Source**: [Website/Creator]
- **License**: CC0 / CC-BY / Proprietary / [Other]
- **License URL**: [Link to license]
- **Download URL**: [Link to asset]
- **Creator**: [Name/Studio]
- **Integration Date**: YYYY-MM-DD
- **Status**: Integrated in v[X.Y.Z]
- **Notes**: Any additional information
```

---

**Last Updated**: 2026-09-05
