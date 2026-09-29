/**
 * REALM OF CROWNS — 3D Battlefield Loot & Spoils System
 * Manages physical 3D interactive loot drops (Gold Pouches, Treasure Chests, Gem Caches).
 * Features bobbing/rotation, magnetic proximity attraction to Lord Arthurian, and pickup events.
 */

import * as pc from 'playcanvas';

export type LootType = 'gold' | 'gems' | 'chest';

export interface LootReward {
  id: string;
  type: LootType;
  amount: number;
  label: string;
}

export interface LootItem {
  id: string;
  type: LootType;
  amount: number;
  x: number;
  y: number;
  z: number;
  entity: pc.Entity;
  lifetime: number;
  maxLifetime: number;
  bobTime: number;
  isAttracting: boolean;
}

export class LootSystem {
  private app: pc.Application;
  private lootRoot: pc.Entity;
  private activeLoot: LootItem[] = [];
  private nextId = 1;

  public onLootCollected?: (reward: LootReward) => void;

  constructor(app: pc.Application) {
    this.app = app;
    this.lootRoot = new pc.Entity('LootRoot');
    this.app.root.addChild(this.lootRoot);
  }

  /**
   * Spawns a physical 3D loot drop at given coordinates.
   */
  public spawnLoot(type: LootType, x: number, z: number, amount?: number): LootItem {
    const id = `loot_${this.nextId++}`;
    const entity = new pc.Entity(id);
    const dropY = 0.4;
    entity.setPosition(x, dropY, z);

    let defaultAmount = 25;
    if (type === 'gold') {
      defaultAmount = amount ?? Math.floor(20 + Math.random() * 30);
      this.buildGoldPouchMesh(entity);
    } else if (type === 'gems') {
      defaultAmount = amount ?? Math.floor(5 + Math.random() * 10);
      this.buildGemsMesh(entity);
    } else if (type === 'chest') {
      defaultAmount = amount ?? Math.floor(100 + Math.random() * 150);
      this.buildChestMesh(entity);
    }

    // Ground glow ring
    const ringMat = new pc.StandardMaterial();
    ringMat.diffuse = type === 'gems' ? new pc.Color(0.2, 0.8, 1.0) : new pc.Color(1.0, 0.85, 0.2);
    ringMat.emissive = ringMat.diffuse;
    ringMat.emissiveIntensity = 1.8;
    ringMat.blendType = pc.BLEND_ADDITIVE;
    ringMat.opacity = 0.7;
    ringMat.update();

    const ring = new pc.Entity('LootRing');
    ring.addComponent('render', { type: 'cylinder', material: ringMat });
    ring.setLocalScale(1.1, 0.02, 1.1);
    ring.setLocalPosition(0, -0.35, 0);
    entity.addChild(ring);

    this.lootRoot.addChild(entity);

    const item: LootItem = {
      id,
      type,
      amount: defaultAmount,
      x,
      y: dropY,
      z,
      entity,
      lifetime: 0,
      maxLifetime: 60.0, // 60 seconds before despawn
      bobTime: Math.random() * Math.PI * 2,
      isAttracting: false
    };

    this.activeLoot.push(item);
    return item;
  }

  private buildGoldPouchMesh(entity: pc.Entity): void {
    // Gold bag material
    const bagMat = new pc.StandardMaterial();
    bagMat.diffuse = new pc.Color(0.85, 0.65, 0.18);
    bagMat.emissive = new pc.Color(0.9, 0.7, 0.1);
    bagMat.emissiveIntensity = 0.6;
    bagMat.shininess = 40;
    bagMat.update();

    // Pouch base sphere
    const bag = new pc.Entity('PouchBase');
    bag.addComponent('render', { type: 'sphere', material: bagMat });
    bag.setLocalScale(0.55, 0.65, 0.55);
    bag.setLocalPosition(0, 0, 0);
    entity.addChild(bag);

    // Tie cinch
    const tieMat = new pc.StandardMaterial();
    tieMat.diffuse = new pc.Color(0.95, 0.2, 0.15);
    tieMat.update();
    const tie = new pc.Entity('PouchTie');
    tie.addComponent('render', { type: 'cylinder', material: tieMat });
    tie.setLocalScale(0.35, 0.08, 0.35);
    tie.setLocalPosition(0, 0.32, 0);
    entity.addChild(tie);
  }

  private buildGemsMesh(entity: pc.Entity): void {
    const gemMat = new pc.StandardMaterial();
    gemMat.diffuse = new pc.Color(0.1, 0.85, 1.0);
    gemMat.emissive = new pc.Color(0.2, 0.9, 1.0);
    gemMat.emissiveIntensity = 1.5;
    gemMat.shininess = 90;
    gemMat.metalness = 0.6;
    gemMat.update();

    // Crystal prism
    const crystal = new pc.Entity('GemCrystal');
    crystal.addComponent('render', { type: 'cone', material: gemMat });
    crystal.setLocalScale(0.5, 0.8, 0.5);
    crystal.setLocalEulerAngles(180, 0, 0);
    entity.addChild(crystal);
  }

  private buildChestMesh(entity: pc.Entity): void {
    // Wood chest body
    const woodMat = new pc.StandardMaterial();
    woodMat.diffuse = new pc.Color(0.42, 0.26, 0.14);
    woodMat.shininess = 30;
    woodMat.update();

    const chest = new pc.Entity('ChestBase');
    chest.addComponent('render', { type: 'box', material: woodMat });
    chest.setLocalScale(0.85, 0.5, 0.55);
    entity.addChild(chest);

    // Gilded iron trim
    const trimMat = new pc.StandardMaterial();
    trimMat.diffuse = new pc.Color(0.9, 0.78, 0.2);
    trimMat.emissive = new pc.Color(0.8, 0.65, 0.1);
    trimMat.emissiveIntensity = 0.8;
    trimMat.metalness = 0.8;
    trimMat.shininess = 70;
    trimMat.update();

    const trim = new pc.Entity('ChestTrim');
    trim.addComponent('render', { type: 'box', material: trimMat });
    trim.setLocalScale(0.88, 0.12, 0.58);
    trim.setLocalPosition(0, 0.15, 0);
    entity.addChild(trim);
  }

  /**
   * Updates loot bobbing, rotation, magnetic attraction to Hero, and collection.
   */
  public update(delta: number, heroPos: { x: number; y: number; z: number }): LootReward[] {
    const collectedRewards: LootReward[] = [];
    const pickupRadius = 2.4; // Magnetic attract distance
    const consumeRadius = 0.45; // Picked up distance

    for (let i = this.activeLoot.length - 1; i >= 0; i--) {
      const item = this.activeLoot[i];
      item.lifetime += delta;
      item.bobTime += delta * 3.5;

      // Distance to hero
      const dx = heroPos.x - item.x;
      const dz = heroPos.z - item.z;
      const dist = Math.hypot(dx, dz);

      if (dist < pickupRadius) {
        item.isAttracting = true;
      }

      if (item.isAttracting) {
        // Fly magnetically toward Lord Arthurian
        const flySpeed = 9.0;
        const dirX = dx / (dist || 1);
        const dirZ = dz / (dist || 1);
        item.x += dirX * flySpeed * delta;
        item.z += dirZ * flySpeed * delta;
        item.y += ((heroPos.y + 0.8) - item.y) * 8.0 * delta;

        item.entity.setPosition(item.x, item.y, item.z);
        item.entity.rotate(0, 480 * delta, 0);

        if (dist < consumeRadius || item.y < heroPos.y + 0.1) {
          // Collected!
          item.entity.destroy();
          this.activeLoot.splice(i, 1);

          let label = `+${item.amount} Gold`;
          if (item.type === 'gems') label = `+${item.amount} Gems!`;
          if (item.type === 'chest') label = `+${item.amount} War Spoils!`;

          const reward: LootReward = {
            id: item.id,
            type: item.type,
            amount: item.amount,
            label
          };
          collectedRewards.push(reward);
          this.onLootCollected?.(reward);
          continue;
        }
      } else {
        // Idle bob and spin
        const bobY = item.y + Math.sin(item.bobTime) * 0.12;
        item.entity.setPosition(item.x, bobY, item.z);
        item.entity.rotate(0, 75 * delta, 0);

        // Despawn timeout
        if (item.lifetime >= item.maxLifetime) {
          item.entity.destroy();
          this.activeLoot.splice(i, 1);
        }
      }
    }

    return collectedRewards;
  }

  public getActiveLoot(): Array<{ id: string; type: LootType; amount: number; x: number; z: number }> {
    return this.activeLoot.map(item => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      x: item.x,
      z: item.z
    }));
  }

  public destroy(): void {
    for (const item of this.activeLoot) {
      item.entity.destroy();
    }
    this.activeLoot = [];
    this.lootRoot.destroy();
  }
}
