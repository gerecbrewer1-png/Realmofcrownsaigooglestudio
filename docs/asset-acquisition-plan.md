# Asset Acquisition Plan - Realm of Crowns

## Overview

This document outlines the strategic acquisition and implementation of high-quality game assets for the Realm of Crowns MMO. The plan is organized into 6 tiers of increasing complexity and dependency, designed to be executed sequentially or in parallel where appropriate.

**Current Status**: Foundation phase complete. Repository is ready to accept and integrate real assets.

---

## Tier 1: World Foundation (Terrain, Nature, Resources)

### Objective
Establish a visually cohesive fantasy world with natural environments and resource deposits.

### Assets to Acquire

#### Terrain & Grass
- **Grass Field Tiles**: High-quality PBR grass textures (4K or 2K), tileable and seamless
  - Source candidates: Poly Haven, Substance 3D Assets
  - Use case: Procedural terrain base replacement
  - Format: Tileable texture sets (diffuse, normal, roughness, AO)

- **Dirt Path Tiles**: Weathered dirt and mud textures for roads
  - Source candidates: Poly Haven, OpenGameArt
  - Use case: Road networks between settlements
  - Format: Tileable GLB with integrated materials

- **Snow Terrain**: Snow-covered ground for arctic regions
  - Source candidates: Poly Haven, custom creation
  - Use case: Regional variant terrains
  - Format: GLB with LODs

#### Trees & Vegetation
- **Pine Trees** (3-5 LOD variants)
  - High: 5K-15K tris, 2K textures
  - Medium: 2K-5K tris, 1K textures
  - Low: 500-1K tris, 512 textures
  - Distant: Billboard/impostor representation
  - Source candidates: Kenney Asset Packs, Quaternius, custom
  - Instancing: YES (high-frequency)

- **Oak Trees** (similar LOD structure)
  - Deciduous variant for contrast
  - Source candidates: Same as Pine

- **Bushes & Shrubs** (2-3 LOD variants)
  - Low poly for performance (instanced)
  - Source candidates: Kenney, Poly Haven

- **Grass Tufts** (ground-level detail)
  - Very low poly (100-200 tris)
  - High instancing frequency
  - Source candidates: Kenney, custom

#### Rocks & Stones
- **Small Scattered Rocks** (3-5 variants)
  - Low poly (500-1500 tris per variant)
  - Heavy instancing use
  - Source candidates: Kenney, Quaternius

- **Large Boulders** (2 LOD variants)
  - Medium detail (2K-5K tris)
  - Sparse placement
  - Source candidates: Quaternius

#### Water Features
- **Water System**: High-quality water shader
  - Consider: Advanced Ocean.js or Three.js Water shader
  - Animated waves, foam, reflection
  - Source: Custom shader or community solution

- **Water Tiles**: If replacing procedural water
  - Concept: Seamless water planes with good lighting response

### Implementation Priority
1. Grass tiles (affects 100% of visible terrain)
2. Tree variants (affects visual richness)
3. Rock variants (environmental detail)
4. Water (atmospheric)

### Expected Timeline
- Asset sourcing: 1-2 weeks
- Integration & LOD setup: 1-2 weeks
- Testing & optimization: 1 week

---

## Tier 2: Settlements & Infrastructure

### Objective
Create visually distinct player and NPC settlements with varied architectural styles.

### Assets to Acquire

#### Player Citadel (CRITICAL)
- **Main Castle Structure** (4 LOD variants)
  - LOD0: 20K-50K tris, 4K textures (close inspection)
  - LOD1: 8K-15K tris, 2K textures (regional view)
  - LOD2: 2K-5K tris, 1K textures (world view)
  - LOD3: 200-500 tris, billboard (distant representation)
  - Architectural style: Medieval European/fantasy hybrid
  - Source candidates: Quaternius (free), Fab asset store, custom commission
  - **MUST INCLUDE**: Distinct visual upgrades for tiers 2-5

- **Castle Walls & Towers**
  - Modular wall sections (for instancing)
  - Tower variants
  - Gateway structures
  - Source candidates: Kenney, Quaternius

- **Castle Interiors** (optional for future):
  - Throne room, barracks, treasury visualization

#### Residential Buildings
- **Stone Houses** (2-3 variants for visual variety)
  - LOD0: 2K-5K tris, 2K textures
  - LOD1: 1K-2K tris, 1K textures
  - LOD2: 300-500 tris, 512 textures
  - Source candidates: Kenney Asset Packs, Quaternius

- **Wooden Houses** (similar structure)
  - Budget/earlier tier variant
  - Source candidates: Same as Stone

#### Resource Production Buildings
- **Farms**
  - Includes: Fields, barn, storage structures
  - LOD variants
  - Source candidates: Quaternius, Kenney

- **Stone Mines**
  - Includes: Excavation pit, equipment, storage
  - Visual emphasis on quarry/extraction
  - Source candidates: Custom or high-quality asset pack

- **Lumber Camps**
  - Includes: Sawmill, log piles, work structures
  - Source candidates: Quaternius

#### Defensive Structures
- **Watch Towers** (modular)
  - Part of fortification system
  - LOD variants

- **Wall Sections** (instanced)
  - Modular segments for building walls
  - Multiple damage states (future)

- **Gates & Doors**
  - Castle gate entrance
  - Wooden palisade gates

#### Special Sites
- **Ancient Shrines**
  - Mystical, ornate design
  - Glowing/magical elements
  - Source candidates: Custom or high-fantasy asset packs

- **Barbarian Camps**
  - Hostile primitive structures
  - Tents, palisades, fire pits
  - Distinct from civilized structures
  - Source candidates: Custom, Quaternius

### Implementation Priority
1. **Player Castle** (iconic, central)
2. **Residential buildings** (populate settlements)
3. **Resource buildings** (gameplay visual feedback)
4. **Defensive structures** (war system visualization)

### Expected Timeline
- Castle design & sourcing: 2-3 weeks (highest priority)
- Other buildings: 2-3 weeks
- Integration & variation system: 2 weeks
- Testing: 1 week

---

## Tier 3: Military & Combat Units

### Objective
Provide visual representation of armies, units, and combat.

### Assets to Acquire

#### Unit Types
- **Infantry Soldiers** (with armor variants)
  - LOD0: 1K-3K tris, 1K textures
  - LOD1: 500-1K tris, 512 textures
  - LOD2: 100-300 tris (distant batch)
  - Instancing: YES (very high frequency)
  - Source candidates: Kenney, Quaternius, Sketchfab

- **Cavalry** (mounted soldiers)
  - Includes: Soldier + Horse mesh
  - LOD variants
  - Instancing: YES

- **Archers** (ranged units)
  - Bow and arrow
  - LOD variants
  - Instancing: YES

#### Equipment & Weapons
- **Banners/Flags** (for army visualization)
  - Cloth simulation or rigged animation
  - Player kingdom colors
  - Source candidates: Custom or SketchFab

- **Weapons** (if needed separately)
  - Swords, spears, bows
  - Source candidates: Kenney weapon packs

#### Effects
- **Fire/Destruction Effects**
  - Particle system or mesh-based
  - Burning building/field effects
  - Source candidates: Custom shader, particle system

- **Smoke Clouds**
  - Atmospheric effect
  - Source candidates: Particle system, texture-based

- **Combat Effects**
  - Impact effects, magical auras
  - Shield visualizations (already have placeholder)

### Implementation Priority
1. **Infantry units** (primary army visual)
2. **Cavalry & Archers** (unit variety)
3. **Banners** (identification)
4. **Effects** (feedback)

### Expected Timeline
- Unit sourcing: 1-2 weeks
- Integration & LOD: 1 week
- Testing & optimization: 1 week

---

## Tier 4: Characters & NPCs

### Objective
Provide character representations for player heroes and NPCs.

### Assets to Acquire

#### Hero Characters
- **Male Knight Hero**
  - LOD0: 3K-8K tris, 2K textures
  - LOD1: 1K-2K tris, 1K textures
  - Rigged with animation support (future)
  - Source candidates: Mixamo, SketchFab, custom commission

- **Female Warrior Hero** (variant)
  - Similar specifications

- **Additional class variants** (Mage, Archer, Paladin)
  - Future expansion

#### NPCs
- **Generic Villager** (multiple variants)
  - LOD0: 1K-2K tris, 1K texture
  - LOD1: 400-600 tris, 512 texture
  - Instancing: YES (population visualization)
  - Source candidates: Kenney, Quaternius

- **Merchant NPC**
  - Distinctive appearance (robes, goods)
  - Source candidates: SketchFab, custom

- **Quest Givers** (elder, sage, etc.)
  - Distinctive visual markers
  - Source candidates: Custom or high-quality packs

### Implementation Priority
1. **Hero character** (player identity)
2. **Generic villagers** (settlement population)
3. **Special NPCs** (quest system feedback)

### Expected Timeline
- Character sourcing: 2-3 weeks
- Integration & rigging: 2 weeks
- Animation setup (future phase): 2+ weeks

---

## Tier 5: UI & Visual Enhancements

### Objective
Improve UI consistency and add visual polish.

### Assets to Acquire
- Icon sets (resource types, building types, unit types)
- Loading screen artwork
- Map markers
- Status indicators
- Notification graphics

### Expected Timeline
- 1-2 weeks

---

## Tier 6: Advanced Features (Future Phases)

### Weather Effects
- Rain, snow, fog systems
- Seasonal variations

### Advanced Characters
- Skeletal animation & rigging
- Facial animations
- Emotes

### Advanced Building Damage States
- Progressive destruction visualization
- Burn states, ruin states

### Particle Systems
- Advanced magical effects
- Environmental effects (dust, wind, etc.)

---

## Recommended Legal Asset Sources

### Kenney (kenney.nl)
- **License**: CC0 (Public Domain)
- **Cost**: Free
- **Quality**: Medium (stylized, consistent)
- **Best for**: Buildings, terrain, simple characters
- **Recommendation**: Excellent starting point, fast iteration

### Poly Haven (polyhaven.com)
- **License**: CC0 (Public Domain)
- **Cost**: Free
- **Quality**: High (PBR textures, professional)
- **Best for**: Textures, environments, specialized objects
- **Recommendation**: Essential for terrain and material sourcing

### Quaternius (quaternius.com)
- **License**: CC0 / CC-BY (check per asset)
- **Cost**: Free
- **Quality**: High (voxel-based, stylized 3D)
- **Best for**: Buildings, terrain, decorative objects
- **Recommendation**: Excellent for medieval fantasy assets

### OpenGameArt (opengameart.org)
- **License**: Varies (check each asset)
- **Cost**: Free (community-contributed)
- **Quality**: Variable (community assets)
- **Best for**: Supplementary assets, community art
- **Recommendation**: Good for specific needs, requires vetting

### Fab (fabfoundation.org / fabonline.io)
- **License**: Varies (subscription or purchase)
- **Cost**: Paid / Subscription
- **Quality**: High to Very High (professional)
- **Best for**: Premium assets, specialized needs
- **Recommendation**: Consider for flagship assets (castle)

### SketchFab (sketchfab.com)
- **License**: Varies (filter by CC0/commercial use)
- **Cost**: Free to paid
- **Quality**: Variable
- **Best for**: One-off models, specific scenarios
- **Recommendation**: Good for supplementary content

### Mixamo (mixamo.com)
- **License**: Adobe license (free with account)
- **Cost**: Free
- **Quality**: High (professional rigged characters)
- **Best for**: Animated characters, NPCs
- **Recommendation**: Excellent for character animation foundation

---

## Asset Integration Workflow

### For Each Asset Acquired:

1. **Validation**
   - Verify license compliance
   - Check file format (convert to GLB if needed)
   - Test in-engine loading

2. **LOD Creation** (if not included)
   - Import high-poly version
   - Create medium, low, billboard variants
   - Optimize texture atlasing

3. **Material Setup**
   - Ensure PBR compatibility
   - Set up material properties in Three.js
   - Test lighting response

4. **Registry Update**
   - Update `assetRegistry.ts` with new entry
   - Set status to "loaded"
   - Add performance tier information

5. **Deployment**
   - Replace placeholder reference
   - Test in-scene performance
   - Verify visual integration

---

## Performance Targets

### Tier 1 (Terrain & Nature)
- **Target FPS**: 60 on balanced, 30 on performance
- **Max draw calls**: 500
- **Texture VRAM**: <512MB active

### Tier 2 (Settlements)
- **Target FPS**: 60 on balanced
- **Max draw calls**: 800
- **Texture VRAM**: <1GB active

### Tier 3+ (Units & Characters)
- **Target FPS**: 60 on ultra, 30 on performance
- **Max draw calls**: 1200+
- **Aggressive LOD required**

---

## Technical Requirements for Assets

### Model Format
- **Primary**: GLB (preferred, single file)
- **Secondary**: glTF separate (textures + JSON)
- **Avoid**: OBJ, FBX, Collada (require conversion)

### Texture Format
- **Preferred**: PNG (lossless, alpha channel support)
- **Acceptable**: JPG (diffuse only, fast loading)
- **Recommended resolution**: 2K (2048×2048) for buildings, 1K for secondary objects
- **Folder structure**: One folder per asset with consistent naming

### Model Structure
- **Naming convention**: `asset_type_variant_lod0.glb`
- **Optimizations**:
  - Merge materials where possible
  - Use texture atlasing for repeated objects
  - Remove unnecessary nodes/bones
  - Consider baking lighting if static

### LOD Guidelines
- **LOD0** (close): Maximum detail, 10K-50K tris
- **LOD1** (medium): 2K-10K tris
- **LOD2** (far): 300-2K tris
- **LOD3** (distant): 50-300 tris or billboard

---

## Blockers & Considerations

### Current Blockers
1. **No online asset repository**: Assets must be manually sourced and managed
2. **No CDN/Asset delivery**: All assets loaded from `public/assets/` directory
3. **No texture optimization pipeline**: Manual texture preparation required

### Future Optimization Opportunities
- Draco compression for GLB files (reduce file size 70%)
- KTX2 texture compression (GPU-native format)
- Automatic LOD generation tools
- Texture baking/atlas generation tools
- Performance profiling dashboard

---

## Success Criteria

- [x] Asset registry created
- [x] Model loader system ready
- [x] LOD architecture in place
- [x] Instancing system ready
- [x] Placeholder mapping documented
- [ ] Tier 1 assets sourced (target: 4 weeks)
- [ ] Tier 1 assets integrated (target: 2 weeks)
- [ ] Tier 2 assets sourced (target: 3 weeks)
- [ ] Tier 2 assets integrated (target: 2 weeks)
- [ ] Performance maintained >30 FPS on all quality modes
- [ ] Visual quality assessment passed

---

## Next Immediate Steps

1. **Week 1-2**: Source Tier 1 terrain and tree assets
   - Create free Kenney and Poly Haven accounts
   - Download grass, tree, and rock packs
   - Prepare for GLB conversion if needed

2. **Week 2-3**: Prepare assets for integration
   - Convert to GLB format
   - Create LOD variants
   - Set up texture atlasing

3. **Week 3-4**: Integration & testing
   - Update asset registry
   - Test model loader
   - Verify performance

4. **Week 4+**: Iterate on Tier 2 (settlements)

---

## Contact & Attribution

All assets acquired must maintain proper attribution as required by their licenses. A `ASSET_ATTRIBUTION.md` file will be maintained in the repository root listing all sources and licenses.

Example format:
```
- Asset Name
  - Source: Kenney (kenney.nl)
  - License: CC0
  - URL: [link]
  - Status: Integrated in v0.2.0
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-05  
**Next Review**: After Tier 1 completion
