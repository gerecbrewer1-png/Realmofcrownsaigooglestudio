/**
 * REALM OF CROWNS — Combat Resolver & Damage System
 * Handles melee/ranged hitboxes, armor reductions, crits, floating combat texts, and deaths.
 */

import { Combatant, DamageResult, FloatingDamageNumber } from './combatTypes';

export class CombatSystem {
  private floatingNumbers: FloatingDamageNumber[] = [];
  private nextId = 1;

  /**
   * Executes an attack from attacker against target.
   */
  public executeAttack(
    attacker: Combatant,
    target: Combatant,
    damageMultiplier: number = 1.0,
    critChance: number = 0.15
  ): DamageResult | null {
    if (attacker.isDead || target.isDead) return null;
    if (attacker.team === target.team) return null;

    // Check distance
    const dx = target.x - attacker.x;
    const dz = target.z - attacker.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > attacker.attackRange + 0.5) {
      return null;
    }

    // Determine crit
    const isCrit = Math.random() < critChance;
    const variance = 0.9 + Math.random() * 0.2; // 90% - 110%
    const baseDamage = attacker.attackDamage * damageMultiplier * variance;
    const critMultiplier = isCrit ? 1.75 : 1.0;

    // Armor mitigation: flat armor reduction with diminishing returns
    const effectiveArmor = Math.max(0, target.armor);
    const mitigation = effectiveArmor / (effectiveArmor + 35);
    const rawDealt = (baseDamage * critMultiplier) * (1 - mitigation);
    const damageDealt = Math.max(1, Math.round(rawDealt));

    // Apply damage
    target.hp = Math.max(0, target.hp - damageDealt);
    const targetKilled = target.hp <= 0;
    if (targetKilled) {
      target.isDead = true;
      if (target.onDie) target.onDie();
    }

    if (target.onTakeDamage) {
      target.onTakeDamage(damageDealt, attacker.id);
    }

    // Spawn floating damage indicator
    this.spawnFloatingNumber({
      x: target.x + (Math.random() - 0.5) * 0.5,
      y: target.y + 1.8,
      z: target.z + (Math.random() - 0.5) * 0.5,
      amount: damageDealt,
      isCrit,
      isHeal: false,
      color: isCrit ? '#ff4d4f' : (attacker.team === 'player' ? '#fadb14' : '#ff7875')
    });

    return {
      damageDealt,
      isCrit,
      targetKilled,
      targetRemainingHp: target.hp
    };
  }

  /**
   * Executes an Area-of-Effect attack around a point (e.g. Hero whirlwind or stomp).
   */
  public executeAoEAttack(
    attacker: Combatant,
    originX: number,
    originZ: number,
    radius: number,
    damage: number,
    potentialTargets: Combatant[]
  ): number {
    let totalHits = 0;
    const radSq = radius * radius;

    for (const target of potentialTargets) {
      if (target.isDead || target.team === attacker.team) continue;

      const dx = target.x - originX;
      const dz = target.z - originZ;
      const distSq = dx * dx + dz * dz;

      if (distSq <= radSq) {
        const fakeAttacker: Combatant = {
          ...attacker,
          attackDamage: damage,
          attackRange: radius
        };
        const res = this.executeAttack(fakeAttacker, target, 1.0, 0.25);
        if (res) totalHits++;
      }
    }

    return totalHits;
  }

  public spawnFloatingNumber(params: {
    x: number;
    y: number;
    z: number;
    amount: number;
    isCrit: boolean;
    isHeal: boolean;
    color: string;
  }): void {
    this.floatingNumbers.push({
      id: `dmg_${this.nextId++}`,
      x: params.x,
      y: params.y,
      z: params.z,
      amount: params.amount,
      isCrit: params.isCrit,
      isHeal: params.isHeal,
      color: params.color,
      lifetime: 1.2,
      maxLifetime: 1.2,
      velocityUp: 1.6
    });
  }

  /**
   * Updates floating text physics and lifetime.
   */
  public update(delta: number): void {
    for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
      const f = this.floatingNumbers[i];
      f.lifetime -= delta;
      f.y += f.velocityUp * delta;
      f.velocityUp = Math.max(0.2, f.velocityUp - delta * 1.5);

      if (f.lifetime <= 0) {
        this.floatingNumbers.splice(i, 1);
      }
    }
  }

  public getFloatingNumbers(): FloatingDamageNumber[] {
    return this.floatingNumbers;
  }
}
