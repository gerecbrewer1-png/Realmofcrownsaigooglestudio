/**
 * REALM OF CROWNS — Village Raid & Citadel Defense Event System
 * Orchestrates multi-phase raider assaults, warning horns, guard alarms, villager panic,
 * hero defense, victory celebration, and NPC memory updates.
 */

import { Combatant } from '../combat/combatTypes';
import { NPCEntity } from '../npc/npcTypes';
import { NPCMemorySystem } from '../npc/npcMemory';

export type RaidState = 'peace' | 'warning' | 'in_progress' | 'victory' | 'defeat';

export interface RaiderUnit extends Combatant {
  isLeader?: boolean;
  archetype: 'raider_scout' | 'raider_brute' | 'raider_warlord';
  targetObjective: { x: number; z: number };
}

export interface RaidRewards {
  gold: number;
  food: number;
  stone: number;
  iron: number;
  playerExp: number;
}

export interface RaidEventStats {
  wave: number;
  totalWaves: number;
  enemiesRemaining: number;
  villagersSaved: number;
  villagersFallen: number;
  goldLooted: number;
}

export class RaidEventSystem {
  private state: RaidState = 'peace';
  private currentWave = 0;
  private totalWaves = 2;
  private raiders: RaiderUnit[] = [];
  private warningTimer = 0;
  private victoryTimer = 0;
  public lastVictoryRewards: RaidRewards | null = null;
  public onVictory?: (rewards: RaidRewards) => void;
  private spawnLocations = [
    { x: -10, z: 16 }, // West approach to plaza
    { x: 10, z: 16 },  // East approach to plaza
    { x: 0, z: 18 }    // South gate entrance to plaza
  ];

  public getState(): RaidState {
    return this.state;
  }

  public getRaiders(): RaiderUnit[] {
    return this.raiders;
  }

  public getStats(): RaidEventStats {
    const aliveRaiders = this.raiders.filter(r => !r.isDead).length;
    return {
      wave: this.currentWave,
      totalWaves: this.totalWaves,
      enemiesRemaining: aliveRaiders,
      villagersSaved: 14,
      villagersFallen: 0,
      goldLooted: 0
    };
  }

  /**
   * Triggers a new raid manually or dynamically.
   */
  public triggerRaid(): void {
    if (this.state === 'in_progress' || this.state === 'warning') return;
    this.state = 'warning';
    this.warningTimer = 3.2; // 3.2 seconds warning horn
    this.currentWave = 1;
    this.raiders = [];
  }

  /**
   * Updates raid wave status, raider target guidance, and victory checking.
   */
  public update(
    delta: number,
    npcs?: NPCEntity[],
    villageCenter: { x: number; z: number } = { x: 0, z: 0 }
  ): void {
    if (this.state === 'peace') return;

    if (this.state === 'warning') {
      this.warningTimer -= delta;
      if (this.warningTimer <= 0) {
        this.state = 'in_progress';
        this.spawnWave(this.currentWave);
      }
      return;
    }

    if (this.state === 'in_progress') {
      const aliveRaiders = this.raiders.filter(r => !r.isDead);

      // Raider steering towards village center or nearest defender
      for (const raider of aliveRaiders) {
        if (raider.attackCooldown > 0) {
          raider.attackCooldown -= delta;
        }

        const dx = raider.targetObjective.x - raider.x;
        const dz = raider.targetObjective.z - raider.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 1.8) {
          const speed = raider.isLeader ? 2.4 : 2.9;
          const moveDist = Math.min(dist, speed * delta);
          raider.x += (dx / dist) * moveDist;
          raider.z += (dz / dist) * moveDist;
          raider.rotationY = Math.atan2(dx, dz);
        }
      }

      // If current wave is defeated
      if (aliveRaiders.length === 0 && this.raiders.length > 0) {
        if (this.currentWave < this.totalWaves) {
          this.currentWave++;
          this.spawnWave(this.currentWave);
        } else {
          // RAID VICTORY!
          this.state = 'victory';
          this.victoryTimer = 6.0;
          this.lastVictoryRewards = {
            gold: 1400,
            food: 1600,
            stone: 850,
            iron: 550,
            playerExp: 400
          };

          // Update NPC memories and relationships!
          if (npcs) {
            for (const npc of npcs) {
              if (npc.role !== 'bandit' && npc.role !== 'wildlife') {
                NPCMemorySystem.applyEventToNPC(
                  npc,
                  'PLAYER_SAVED_VILLAGE',
                  'Lord Arthurian and the Vanguard defended the citadel from brutal raiders!',
                  8,
                  35
                );
                npc.activity = 'celebrating';
                npc.speechBubbleText = npc.dialogue?.victoryThanks || 'The Vanguard saved us! Glory to the Crown!';
                npc.speechBubbleTimer = 5.0;
                npc.animationState = 'Cheer';
              }
            }
          }

          if (this.onVictory) {
            this.onVictory(this.lastVictoryRewards);
          }
        }
      }
    }

    if (this.state === 'victory') {
      this.victoryTimer -= delta;
      if (this.victoryTimer <= 0) {
        this.state = 'peace';
        this.raiders = [];
        // Villagers resume normal activities
        if (npcs) {
          for (const npc of npcs) {
            if (npc.activity === 'celebrating' || npc.activity === 'fleeing') {
              npc.activity = 'working';
              npc.animationState = 'Idle';
            }
          }
        }
      }
    }
  }

  private spawnWave(wave: number): void {
    const count = wave === 1 ? 6 : 9;
    for (let i = 0; i < count; i++) {
      const spawnPt = this.spawnLocations[i % this.spawnLocations.length];
      const isBoss = wave > 1 && i === 0;

      const raider: RaiderUnit = {
        id: `raider_w${wave}_${i}`,
        name: isBoss ? 'Bandit Warlord Malakor' : `Raider Marauder ${i + 1}`,
        team: 'enemy',
        archetype: isBoss ? 'raider_warlord' : (i % 3 === 0 ? 'raider_brute' : 'raider_scout'),
        isLeader: isBoss,
        x: spawnPt.x + (Math.random() - 0.5) * 6,
        y: 0,
        z: spawnPt.z + (Math.random() - 0.5) * 4,
        rotationY: Math.PI,
        hp: isBoss ? 380 : 95,
        maxHp: isBoss ? 380 : 95,
        attackDamage: isBoss ? 34 : 15,
        attackRange: isBoss ? 2.5 : 1.8,
        attackCooldown: 0,
        armor: isBoss ? 8 : 2,
        isDead: false,
        targetObjective: { x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 6 } // Central village plaza
      };

      this.raiders.push(raider);
    }
  }

  public addReinforcements(infantryCount: number, archerCount: number): void {
    const startIdx = this.raiders.length;
    for (let i = 0; i < infantryCount + archerCount; i++) {
      const spawnPt = this.spawnLocations[i % this.spawnLocations.length];
      const isArcher = i >= infantryCount;
      const raider: RaiderUnit = {
        id: `raider_reinf_${startIdx + i}`,
        name: isArcher ? `Raider Marksman ${i + 1}` : `Raider Marauder ${startIdx + i + 1}`,
        team: 'enemy',
        archetype: isArcher ? 'raider_scout' : 'raider_brute',
        isLeader: false,
        x: spawnPt.x + (Math.random() - 0.5) * 8,
        y: 0,
        z: spawnPt.z + (Math.random() - 0.5) * 4,
        rotationY: Math.PI,
        hp: isArcher ? 80 : 110,
        maxHp: isArcher ? 80 : 110,
        attackDamage: isArcher ? 18 : 14,
        attackRange: isArcher ? 8.0 : 1.8,
        attackCooldown: 0,
        armor: isArcher ? 1 : 3,
        isDead: false,
        targetObjective: { x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 6 }
      };
      this.raiders.push(raider);
    }
  }
}
