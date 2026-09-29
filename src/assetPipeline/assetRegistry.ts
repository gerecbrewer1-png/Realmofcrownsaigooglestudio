/**
 * Central Asset Registry
 * 
 * Provides a unified query and mapping layer for game entities to resolve
 * logical IDs (e.g. "castle_tier_1", "pine_tree_default") to file paths or
 * procedural fallback generators without hardcoded path dependencies.
 */

import { AssetMetadata, AssetCategory, AssetStatus } from './types';
import { ASSET_MANIFEST } from './assetManifest';

class AssetRegistry {
  private manifest: Map<string, AssetMetadata> = new Map();
  private aliasMap: Map<string, string> = new Map();

  constructor() {
    this.initializeFromManifest();
    this.setupLogicalAliases();
  }

  private initializeFromManifest(): void {
    Object.values(ASSET_MANIFEST).forEach((asset) => {
      this.manifest.set(asset.assetId, asset);
    });
  }

  private setupLogicalAliases(): void {
    // Logical alias mappings for gameplay code pointing to active real GLBs
    this.registerAlias('citadel_default', 'building_castle_keep');
    this.registerAlias('castle_tier_1', 'building_castle_keep');
    this.registerAlias('castle', 'building_castle_keep');
    this.registerAlias('keep', 'building_castle_keep');
    this.registerAlias('rival_castle_default', 'building_castle_keep');
    this.registerAlias('farm_food_node', 'building_farm_windmill');
    this.registerAlias('farm', 'building_farm_windmill');
    this.registerAlias('farm_1', 'building_farm_windmill');
    this.registerAlias('windmill', 'building_farm_windmill');
    this.registerAlias('lumber_wood_node', 'building_lumber_sawmill');
    this.registerAlias('lumber', 'building_lumber_sawmill');
    this.registerAlias('lumber_1', 'building_lumber_sawmill');
    this.registerAlias('sawmill', 'building_lumber_sawmill');
    this.registerAlias('quarry_stone_node', 'building_stone_quarry');
    this.registerAlias('quarry', 'building_stone_quarry');
    this.registerAlias('quarry_1', 'building_stone_quarry');
    this.registerAlias('mine_iron_node', 'building_stone_quarry');
    this.registerAlias('iron_1', 'building_stone_quarry');
    this.registerAlias('deposit_gold_node', 'building_market_warehouse');
    this.registerAlias('gold_1', 'building_market_warehouse');
    this.registerAlias('barracks', 'building_barracks_garrison');
    this.registerAlias('barracks_default', 'building_barracks_garrison');
    this.registerAlias('hospital', 'building_infirmary_church');
    this.registerAlias('infirmary', 'building_infirmary_church');
    this.registerAlias('academy', 'building_academy_observatory');
    this.registerAlias('warehouse', 'building_market_warehouse');
    this.registerAlias('market', 'building_market_warehouse');
    this.registerAlias('archery', 'building_archery_range');
    this.registerAlias('blacksmith', 'building_blacksmith_hearth');
    this.registerAlias('house', 'building_house_residence');
    this.registerAlias('gate', 'building_gate_portal');
    this.registerAlias('tree_pine_default', 'nature_tree_single');
    this.registerAlias('tree_oak_default', 'nature_tree_grove');
    this.registerAlias('rock_boulder_default', 'nature_rock_single');
    this.registerAlias('rock_cluster_default', 'nature_rock_cluster');
    this.registerAlias('hero_warlord', 'hero_warlord_mesh');
    this.registerAlias('hero_guardian', 'hero_guardian_mesh');
    this.registerAlias('hero_ranger', 'hero_ranger_mesh');
    this.registerAlias('hero_steward', 'hero_steward_mesh');
    this.registerAlias('hero_strategist', 'hero_strategist_mesh');
    this.registerAlias('kingdom_realm_view', 'building_castle_keep');
  }

  /**
   * Registers a logical alias pointing to an assetId
   */
  public registerAlias(alias: string, targetAssetId: string): void {
    this.aliasMap.set(alias, targetAssetId);
  }

  /**
   * Resolves an alias or assetId to its canonical AssetMetadata
   */
  public get(idOrAlias: string): AssetMetadata | undefined {
    const resolvedId = this.aliasMap.get(idOrAlias) || idOrAlias;
    return this.manifest.get(resolvedId);
  }

  /**
   * Gets metadata, throwing if not found
   */
  public getOrThrow(idOrAlias: string): AssetMetadata {
    const asset = this.get(idOrAlias);
    if (!asset) {
      throw new Error(`[AssetRegistry] Asset not found in registry: "${idOrAlias}"`);
    }
    return asset;
  }

  /**
   * Query all assets in a category
   */
  public getByCategory(category: AssetCategory): AssetMetadata[] {
    return Array.from(this.manifest.values()).filter((a) => a.category === category);
  }

  /**
   * Query all assets eligible for InstancedMesh batching
   */
  public getInstancingEligible(): AssetMetadata[] {
    return Array.from(this.manifest.values()).filter((a) => a.instancingEligible);
  }

  /**
   * Query assets by implementation status
   */
  public getByStatus(status: AssetStatus): AssetMetadata[] {
    return Array.from(this.manifest.values()).filter((a) => a.status === status);
  }

  /**
   * Checks if an asset has a valid file path available (not planned or procedural)
   */
  public isFileAvailable(idOrAlias: string): boolean {
    const asset = this.get(idOrAlias);
    return !!asset && asset.status === 'active' && !asset.filePath.startsWith('procedural://');
  }

  /**
   * Dynamically registers or updates an asset definition
   */
  public registerAsset(asset: AssetMetadata): void {
    this.manifest.set(asset.assetId, asset);
  }

  /**
   * Returns all registered assets
   */
  public getAll(): AssetMetadata[] {
    return Array.from(this.manifest.values());
  }
}

export const assetRegistry = new AssetRegistry();
