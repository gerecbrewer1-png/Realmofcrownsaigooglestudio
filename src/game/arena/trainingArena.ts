/**
 * REALM OF CROWNS — Hero Training Field & Duel Arena System
 * Supports 1v1 tactical duels between Player Hero and AI Challengers across 4 distinct AI behaviors.
 */

import { HeroProfile } from '../heroes/heroTypes';

export type DuelDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';

export interface DuelChallenger {
  id: string;
  name: string;
  title: string;
  heroClass: string;
  level: number;
  health: number;
  maxHealth: number;
  attackPower: number;
  defensePower: number;
  difficulty: DuelDifficulty;
  position: { x: number; y: number; z: number };
  rotationY: number;
  state: 'IDLE' | 'CIRCLING' | 'ATTACKING' | 'GUARDING' | 'RECOVERING' | 'DEFEATED';
  lastAbilityTimestamp: number;
  lastAttackTimestamp: number;
  stamina: number;
}

export class TrainingArenaManager {
  public isActive = false;
  public difficulty: DuelDifficulty = 'NORMAL';
  public challenger: DuelChallenger | null = null;
  public matchTimer = 0;
  public result: 'in_progress' | 'player_victory' | 'player_defeat' | null = null;

  public initializeDuel(difficulty: DuelDifficulty = 'NORMAL', challengerName: string = 'Sir Gareth the Ironclad'): DuelChallenger {
    this.difficulty = difficulty;
    this.isActive = true;
    this.matchTimer = 0;
    this.result = 'in_progress';

    // Base challenger stats scaled by archetype, not bloated cheat stats
    this.challenger = {
      id: 'challenger_ai',
      name: challengerName,
      title: `${difficulty} Champion`,
      heroClass: 'Knight Errant',
      level: 5,
      health: 400,
      maxHealth: 400,
      attackPower: 38,
      defensePower: 16,
      difficulty,
      position: { x: 0, y: 0, z: -8 }, // Spawns across the arena
      rotationY: 0,
      state: 'IDLE',
      lastAbilityTimestamp: 0,
      lastAttackTimestamp: 0,
      stamina: 100
    };

    return this.challenger;
  }

  /**
   * Updates Challenger AI decision making based strictly on tactical behavior rather than stat bloat.
   */
  public update(delta: number, playerPos: { x: number; y: number; z: number; isGuarding?: boolean }): void {
    if (!this.isActive || !this.challenger || this.challenger.health <= 0) {
      if (this.challenger && this.challenger.health <= 0) {
        this.result = 'player_victory';
      }
      return;
    }

    this.matchTimer += delta;
    const now = Date.now();

    const dx = playerPos.x - this.challenger.position.x;
    const dz = playerPos.z - this.challenger.position.z;
    const dist = Math.hypot(dx, dz);
    const facingAngle = Math.atan2(dx, dz);
    this.challenger.rotationY = facingAngle;

    // Behavior branches based on Difficulty
    switch (this.difficulty) {
      case 'EASY': {
        // Hesitant, slow advances, rarely blocks, large telegraph windows
        if (dist > 3.0) {
          this.moveTowards(dx, dz, dist, 2.4 * delta);
          this.challenger.state = 'CIRCLING';
        } else if (now - this.challenger.lastAttackTimestamp > 2200) {
          // Slow attack interval
          this.challenger.state = 'ATTACKING';
          this.challenger.lastAttackTimestamp = now;
        } else {
          this.challenger.state = 'IDLE';
        }
        break;
      }

      case 'NORMAL': {
        // Balanced approach, maintains tactical distance, strikes on standard cooldown
        if (dist > 2.5) {
          this.moveTowards(dx, dz, dist, 3.2 * delta);
          this.challenger.state = 'CIRCLING';
        } else if (now - this.challenger.lastAttackTimestamp > 1400) {
          this.challenger.state = 'ATTACKING';
          this.challenger.lastAttackTimestamp = now;
        } else if (playerPos.isGuarding && now - this.challenger.lastAbilityTimestamp > 8000) {
          // Uses guard breaker ability against blocking player
          this.challenger.state = 'ATTACKING';
          this.challenger.lastAbilityTimestamp = now;
        } else {
          this.challenger.state = 'IDLE';
        }
        break;
      }

      case 'HARD': {
        // Dynamic strafing, aggressively closes distance, raises guard when player winds up
        if (dist > 2.2) {
          this.moveTowards(dx, dz, dist, 4.0 * delta);
          this.challenger.state = 'CIRCLING';
        } else if (now - this.challenger.lastAttackTimestamp > 1000) {
          this.challenger.state = 'ATTACKING';
          this.challenger.lastAttackTimestamp = now;
        } else if (Math.random() < 0.35) {
          // Proactive guard stance
          this.challenger.state = 'GUARDING';
        }
        break;
      }

      case 'EXPERT': {
        // Flanks aggressively, punishes stamina depletion, executes ability combos
        if (dist > 2.0) {
          // Flanking motion: combine forward vector with perpendicular tangent
          const perpX = -dz / dist;
          const perpZ = dx / dist;
          this.challenger.position.x += (dx / dist * 0.7 + perpX * 0.4) * 4.6 * delta;
          this.challenger.position.z += (dz / dist * 0.7 + perpZ * 0.4) * 4.6 * delta;
          this.challenger.state = 'CIRCLING';
        } else if (now - this.challenger.lastAttackTimestamp > 750) {
          this.challenger.state = 'ATTACKING';
          this.challenger.lastAttackTimestamp = now;
          if (now - this.challenger.lastAbilityTimestamp > 6000) {
            this.challenger.lastAbilityTimestamp = now;
          }
        } else {
          this.challenger.state = 'GUARDING';
        }
        break;
      }
    }
  }

  private moveTowards(dx: number, dz: number, dist: number, step: number): void {
    if (!this.challenger) return;
    this.challenger.position.x += (dx / dist) * step;
    this.challenger.position.z += (dz / dist) * step;
  }

  public endDuel(): void {
    this.isActive = false;
    this.challenger = null;
  }
}
