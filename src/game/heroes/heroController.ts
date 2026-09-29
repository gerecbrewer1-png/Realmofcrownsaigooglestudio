/**
 * Realm of Crowns — Hero Controller with Live AI/Player Switching
 * Seamlessly transitions between autonomous tactical AI and responsive mobile touch control.
 * Supports abilities: Heavy Strike (Stomp), Rally the Vanguard, and Shield Guard.
 */

import { HeroProfile, HeroAbility } from './heroTypes';
import { NPCEntity, Vector3D } from '../npc/npcTypes';

export type HeroAIState =
  | 'IDLE'
  | 'MOVING'
  | 'FOLLOWING'
  | 'ATTACKING'
  | 'DEFENDING'
  | 'RETREATING'
  | 'DEFEATED';

export class HeroController {
  public profile: HeroProfile;
  public aiState: HeroAIState = 'IDLE';
  public targetDestination: { x: number; z: number } | null = null;
  private currentInput: { x: number; y: number } = { x: 0, y: 0 };
  private attackFreezeTimer = 0;
  public isGuarding = false;

  constructor(
    profile: Partial<HeroProfile> & { id: string; name: string },
    initialPos?: { x: number; y: number; z: number; rotationY: number }
  ) {
    this.profile = {
      id: profile.id,
      name: profile.name,
      title: profile.title || 'Knight Commander',
      heroClass: profile.heroClass || 'Warlord',
      level: profile.level || 5,
      experience: profile.experience || 1200,
      xp: profile.xp || 1200,
      xpToNextLevel: profile.xpToNextLevel || 2000,
      health: profile.health || 450,
      maxHealth: profile.maxHealth || 450,
      stamina: profile.stamina || 100,
      maxStamina: profile.maxStamina || 100,
      attackPower: profile.attackPower || 45,
      defensePower: profile.defensePower || 18,
      leadership: profile.leadership || 20,
      morale: profile.morale || 100,
      position: {
        x: initialPos?.x ?? profile.position?.x ?? 0,
        y: initialPos?.y ?? profile.position?.y ?? 0,
        z: initialPos?.z ?? profile.position?.z ?? 8
      },
      rotationY: initialPos?.rotationY ?? profile.rotationY ?? 0,
      velocity: { x: 0, y: 0, z: 0 },
      moveSpeed: profile.moveSpeed || 4.8,
      isPlayerControlled: profile.isPlayerControlled ?? true,
      assignedArmyId: profile.assignedArmyId || 'squad_royal_guard',
      abilities: profile.abilities || [
        {
          id: 'warlord_stomp',
          name: 'Heavy Strike & Stomp',
          description: 'Slams the ground, staggering hostiles and dealing 1.8x damage in an AoE radius.',
          staminaCost: 30,
          cooldownSeconds: 7,
          lastUsedTimestamp: 0,
          radius: 6,
          range: 6,
          damageMultiplier: 1.8,
          effectType: 'whirlwind'
        },
        {
          id: 'rally_vanguard',
          name: 'Rally the Vanguard',
          description: 'Sounds the war horn, restoring troops +40 HP and boosting attack damage.',
          staminaCost: 35,
          cooldownSeconds: 12,
          lastUsedTimestamp: 0,
          radius: 12,
          range: 12,
          damageMultiplier: 1.0,
          effectType: 'rally'
        },
        {
          id: 'shield_defend',
          name: 'Shield Guard',
          description: 'Raises royal kite shield, mitigating 70% of all incoming damage.',
          staminaCost: 20,
          cooldownSeconds: 4,
          lastUsedTimestamp: 0,
          radius: 2,
          range: 2,
          damageMultiplier: 0.5,
          effectType: 'shield_wall'
        }
      ],
      animationState: 'Idle'
    };
  }

  // --- Instance Accessors ---

  public getPosition() {
    return {
      x: this.profile.position.x,
      y: this.profile.position.y,
      z: this.profile.position.z,
      rotationY: this.profile.rotationY,
      hp: this.profile.health,
      maxHp: this.profile.maxHealth,
      stamina: this.profile.stamina,
      maxStamina: this.profile.maxStamina,
      attackDamage: this.profile.attackPower,
      attackRange: 2.4,
      defense: this.isGuarding ? this.profile.defensePower * 2.5 : this.profile.defensePower
    };
  }

  public isPlayerControlled(): boolean {
    return this.profile.isPlayerControlled;
  }

  public setControlMode(mode: 'player' | 'ai'): void {
    this.profile.isPlayerControlled = mode === 'player';
    this.profile.velocity = { x: 0, y: 0, z: 0 };
    this.targetDestination = null;
    if (mode === 'ai') {
      this.currentInput = { x: 0, y: 0 };
      this.aiState = 'DEFENDING';
    }
  }

  public issueMoveTo(x: number, z: number): void {
    this.targetDestination = { x, z };
  }

  public setPlayerInput(vx: number, vy: number): void {
    this.currentInput = { x: vx, y: vy };
    if (Math.hypot(vx, vy) > 0.05) {
      // Manual joystick/keyboard cancels Click-to-Move destination
      this.targetDestination = null;
    }
  }

  public triggerPlayerAttack(): boolean {
    if (this.profile.health <= 0) return false;
    this.attackFreezeTimer = 0.35;
    this.profile.animationState = '1H_Melee_Attack_Chop';
    return true;
  }

  public useAbility(abilityId: string): boolean {
    if (this.profile.health <= 0) return false;
    const ability = this.profile.abilities.find(a => a.id === abilityId);
    if (!ability) return false;

    const now = Date.now();
    const cd = (ability.cooldownSeconds || ability.cooldown || 8) * 1000;
    if (now - ability.lastUsedTimestamp < cd) {
      return false;
    }
    if (this.profile.stamina < ability.staminaCost) {
      return false;
    }

    this.profile.stamina -= ability.staminaCost;
    ability.lastUsedTimestamp = now;

    if (abilityId === 'shield_defend') {
      this.isGuarding = true;
      setTimeout(() => { this.isGuarding = false; }, 3500);
    }

    this.attackFreezeTimer = 0.45;
    this.profile.animationState = '2H_Melee_Attack_Chop';
    return true;
  }

  public takeDamage(amount: number): void {
    const mitigated = this.isGuarding ? Math.max(1, Math.round(amount * 0.3)) : amount;
    this.profile.health = Math.max(0, this.profile.health - mitigated);
    if (this.profile.health <= 0) {
      this.aiState = 'DEFEATED';
      this.profile.animationState = 'Death_A';
    } else {
      this.profile.animationState = 'Hit_A';
    }
  }

  public update(delta: number, enemies: Array<{ id: string; x: number; z: number; isDead: boolean }>): void {
    if (this.profile.health <= 0) {
      this.aiState = 'DEFEATED';
      this.profile.animationState = 'Death_A';
      return;
    }

    // Passive stamina regen
    if (this.profile.stamina < this.profile.maxStamina) {
      this.profile.stamina = Math.min(this.profile.maxStamina, this.profile.stamina + 12 * delta);
    }

    // Attack animation freeze
    if (this.attackFreezeTimer > 0) {
      this.attackFreezeTimer -= delta;
      return;
    }

    if (this.profile.isPlayerControlled) {
      this.updatePlayerMovement(delta);
    } else {
      this.updateAIMovement(delta, enemies);
    }
  }

  private updatePlayerMovement(delta: number): void {
    const inputLen = Math.hypot(this.currentInput.x, this.currentInput.y);

    if (inputLen > 0.08) {
      // Manual input active
      this.targetDestination = null;
      const dirX = this.currentInput.x / inputLen;
      const dirZ = this.currentInput.y / inputLen;
      const speed = this.profile.moveSpeed * Math.min(1.0, inputLen);

      this.profile.position.x += dirX * speed * delta;
      this.profile.position.z += dirZ * speed * delta;
      this.profile.velocity = { x: dirX * speed, y: 0, z: dirZ * speed };

      const targetAngle = Math.atan2(dirX, dirZ);
      let diff = targetAngle - this.profile.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.profile.rotationY += diff * Math.min(1.0, 14.0 * delta);

      this.profile.animationState = inputLen > 0.65 ? 'Running_A' : 'Walking_A';
    } else if (this.targetDestination) {
      // Destination-based Click-to-Move
      const dx = this.targetDestination.x - this.profile.position.x;
      const dz = this.targetDestination.z - this.profile.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.35) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const speed = this.profile.moveSpeed;

        this.profile.position.x += dirX * speed * delta;
        this.profile.position.z += dirZ * speed * delta;
        this.profile.velocity = { x: dirX * speed, y: 0, z: dirZ * speed };

        const targetAngle = Math.atan2(dirX, dirZ);
        let diff = targetAngle - this.profile.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.profile.rotationY += diff * Math.min(1.0, 14.0 * delta);

        this.profile.animationState = 'Running_A';
      } else {
        // Arrived at destination
        this.targetDestination = null;
        this.profile.velocity = { x: 0, y: 0, z: 0 };
        this.profile.animationState = 'Idle';
      }
    } else {
      this.profile.velocity = { x: 0, y: 0, z: 0 };
      this.profile.animationState = 'Idle';
    }
  }

  private updateAIMovement(delta: number, enemies: Array<{ id: string; x: number; z: number; isDead: boolean }>): void {
    // 1. Low health retreat condition
    if (this.profile.health < this.profile.maxHealth * 0.25) {
      this.aiState = 'RETREATING';
      const keepX = 0;
      const keepZ = -18;
      const dx = keepX - this.profile.position.x;
      const dz = keepZ - this.profile.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.5) {
        this.profile.position.x += (dx / dist) * this.profile.moveSpeed * 1.1 * delta;
        this.profile.position.z += (dz / dist) * this.profile.moveSpeed * 1.1 * delta;
        this.profile.rotationY = Math.atan2(dx, dz);
        this.profile.animationState = 'Running_A';
        return;
      }
    }

    // 2. Find nearest active enemy
    let nearest: { id: string; x: number; z: number } | null = null;
    let minDSq = 28 * 28;

    for (const e of enemies) {
      if (e.isDead) continue;
      const dx = e.x - this.profile.position.x;
      const dz = e.z - this.profile.position.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDSq) {
        minDSq = dSq;
        nearest = e;
      }
    }

    if (nearest) {
      const dist = Math.sqrt(minDSq);
      const attackRange = 2.4;
      const dx = nearest.x - this.profile.position.x;
      const dz = nearest.z - this.profile.position.z;
      this.profile.rotationY = Math.atan2(dx, dz);

      if (dist <= attackRange) {
        this.aiState = 'ATTACKING';
        // Use abilities if ready
        const stomp = this.profile.abilities.find(a => a.id === 'warlord_stomp');
        if (stomp && Date.now() - stomp.lastUsedTimestamp > 7000 && this.profile.stamina >= 30) {
          this.useAbility('warlord_stomp');
        } else {
          this.triggerPlayerAttack();
        }
      } else {
        this.aiState = 'MOVING';
        const speed = this.profile.moveSpeed * 1.1;
        this.profile.position.x += (dx / dist) * speed * delta;
        this.profile.position.z += (dz / dist) * speed * delta;
        this.profile.animationState = 'Running_A';
      }
    } else {
      // Hold defensive stance near plaza center (x=0, z=4)
      this.aiState = 'DEFENDING';
      const dx = 0 - this.profile.position.x;
      const dz = 4 - this.profile.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 1.5) {
        this.profile.position.x += (dx / dist) * this.profile.moveSpeed * delta;
        this.profile.position.z += (dz / dist) * this.profile.moveSpeed * delta;
        this.profile.rotationY = Math.atan2(dx, dz);
        this.profile.animationState = 'Walking_A';
      } else {
        this.profile.animationState = 'Idle';
      }
    }
  }

  // --- Static Utility Methods ---

  public static setPlayerControl(hero: HeroProfile, isControlled: boolean): void {
    hero.isPlayerControlled = isControlled;
    hero.velocity = { x: 0, y: 0, z: 0 };
    if (!isControlled) {
      hero.animationState = 'Idle';
    }
  }

  public static update(
    hero: HeroProfile,
    joystickInput: { x: number; y: number },
    deltaSec: number,
    enemies: NPCEntity[],
    defendTargetPos: Vector3D
  ): void {
    if (hero.health <= 0) {
      hero.animationState = 'Death_A';
      return;
    }
    const ctrl = new HeroController(hero);
    ctrl.setPlayerInput(joystickInput.x, joystickInput.y);
    ctrl.update(deltaSec, enemies.map(e => ({ id: e.id, x: e.position.x, z: e.position.z, isDead: e.health <= 0 })));
  }

  public static executeAttack(hero: HeroProfile): boolean {
    if (hero.health <= 0) return false;
    hero.animationState = '1H_Melee_Attack_Chop';
    return true;
  }

  public static executeAbility(hero: HeroProfile, abilityId: string): HeroAbility | null {
    const ctrl = new HeroController(hero);
    const ok = ctrl.useAbility(abilityId);
    return ok ? hero.abilities.find(a => a.id === abilityId) || null : null;
  }
}
