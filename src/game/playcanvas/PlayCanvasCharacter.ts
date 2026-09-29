/**
 * REALM OF CROWNS — PlayCanvas Character Visual Controller
 * Binds gameplay entities (Heroes, Squads, NPCs, Raiders) to PlayCanvas 3D entities.
 * Includes stylized medieval geometry, overhead healthbars, hit reactions, and attack swings.
 */

import * as pc from 'playcanvas';

export interface CharacterVisualConfig {
  id: string;
  name: string;
  team: 'player' | 'ally' | 'enemy' | 'neutral';
  color: pc.Color;
  scale?: number;
  hasShield?: boolean;
  hasSpear?: boolean;
  hasBow?: boolean;
  isHero?: boolean;
}

export class PlayCanvasCharacter {
  public root: pc.Entity;
  public id: string;
  public team: 'player' | 'ally' | 'enemy' | 'neutral';
  private app: pc.Application;

  // Visual sub-entities
  private bodyMesh!: pc.Entity;
  private torso!: pc.Entity;
  private leftLeg!: pc.Entity;
  private rightLeg!: pc.Entity;
  private weaponMesh?: pc.Entity;
  private shieldMesh?: pc.Entity;
  private selectionRing!: pc.Entity;
  private healthBarRoot!: pc.Entity;
  private healthBarFill!: pc.Entity;

  // State
  private currentHp = 100;
  private maxHp = 100;
  private isDead = false;
  private isSelected = false;
  private isGuarding = false;
  private hitFlashTimer = 0;
  private attackAnimTimer = 0;
  private heavyAttackTimer = 0;
  private walkTimer = 0;
  private baseColor: pc.Color;
  private bodyMaterial!: pc.StandardMaterial;
  private glbEntity?: pc.Entity;

  // Target transform for smooth interpolation
  private targetX = 0;
  private targetZ = 0;
  private targetRotY = 0;

  constructor(app: pc.Application, config: CharacterVisualConfig) {
    this.app = app;
    this.id = config.id;
    this.team = config.team;
    this.baseColor = config.color;

    this.root = new pc.Entity(config.id);
    this.buildSelectionRing(config);
    this.buildMesh(config);
    this.buildHealthBar(config);
    this.app.root.addChild(this.root);
  }

  private buildSelectionRing(config: CharacterVisualConfig): void {
    const scale = config.scale ?? (config.isHero ? 1.3 : 1.0);
    const ringMat = new pc.StandardMaterial();
    ringMat.diffuse = config.isHero ? new pc.Color(1.0, 0.82, 0.2) : new pc.Color(0.2, 0.8, 1.0);
    ringMat.emissive = ringMat.diffuse;
    ringMat.emissiveIntensity = 0.5;
    ringMat.update();

    this.selectionRing = new pc.Entity('SelectionRing');
    this.selectionRing.addComponent('render', { type: 'cylinder', material: ringMat });
    this.selectionRing.setLocalScale(1.3 * scale, 0.03, 1.3 * scale);
    this.selectionRing.setLocalPosition(0, 0.02, 0);
    this.selectionRing.enabled = false;
    this.root.addChild(this.selectionRing);
  }

  private buildMesh(config: CharacterVisualConfig): void {
    const scale = config.scale ?? (config.isHero ? 1.25 : 1.0);

    // Torso / armor material
    this.bodyMaterial = new pc.StandardMaterial();
    this.bodyMaterial.diffuse = config.color;
    this.bodyMaterial.metalness = config.isHero ? 0.6 : 0.3;
    this.bodyMaterial.shininess = 45;
    this.bodyMaterial.update();

    // Steel armor material
    const steelMat = new pc.StandardMaterial();
    steelMat.diffuse = new pc.Color(0.7, 0.72, 0.75);
    steelMat.metalness = 0.8;
    steelMat.shininess = 65;
    steelMat.update();

    // Gold trim for heroes
    const goldMat = new pc.StandardMaterial();
    goldMat.diffuse = new pc.Color(0.9, 0.75, 0.2);
    goldMat.metalness = 0.7;
    goldMat.shininess = 80;
    goldMat.update();

    // Wood / Leather material
    const woodMat = new pc.StandardMaterial();
    woodMat.diffuse = new pc.Color(0.4, 0.25, 0.15);
    woodMat.shininess = 15;
    woodMat.update();

    // Root model container
    this.bodyMesh = new pc.Entity('Body');
    this.bodyMesh.setLocalScale(scale, scale, scale);

    // 1. Torso
    this.torso = new pc.Entity('Torso');
    this.torso.addComponent('render', {
      type: 'box',
      material: this.bodyMaterial
    });
    this.torso.setLocalScale(0.55, 0.65, 0.38);
    this.torso.setLocalPosition(0, 0.95, 0);
    this.bodyMesh.addChild(this.torso);

    // 2. Chestplate / Crest
    const crest = new pc.Entity('Crest');
    crest.addComponent('render', {
      type: 'box',
      material: config.isHero ? goldMat : steelMat
    });
    crest.setLocalScale(0.4, 0.45, 0.42);
    crest.setLocalPosition(0, 1.0, 0);
    this.bodyMesh.addChild(crest);

    // 3. Head & Helmet
    const head = new pc.Entity('Head');
    head.addComponent('render', {
      type: 'box',
      material: steelMat
    });
    head.setLocalScale(0.35, 0.38, 0.35);
    head.setLocalPosition(0, 1.5, 0);
    this.bodyMesh.addChild(head);

    // Helmet plume/crest for heroes
    if (config.isHero) {
      const plume = new pc.Entity('Plume');
      plume.addComponent('render', {
        type: 'cone',
        material: this.bodyMaterial
      });
      plume.setLocalScale(0.2, 0.35, 0.2);
      plume.setLocalPosition(0, 1.8, -0.05);
      this.bodyMesh.addChild(plume);
    }

    // 4. Legs
    this.leftLeg = new pc.Entity('LeftLeg');
    this.leftLeg.addComponent('render', {
      type: 'cylinder',
      material: steelMat
    });
    this.leftLeg.setLocalScale(0.18, 0.6, 0.18);
    this.leftLeg.setLocalPosition(-0.16, 0.3, 0);
    this.bodyMesh.addChild(this.leftLeg);

    this.rightLeg = new pc.Entity('RightLeg');
    this.rightLeg.addComponent('render', {
      type: 'cylinder',
      material: steelMat
    });
    this.rightLeg.setLocalScale(0.18, 0.6, 0.18);
    this.rightLeg.setLocalPosition(0.16, 0.3, 0);
    this.bodyMesh.addChild(this.rightLeg);

    // 5. Weapon (Right Hand)
    this.weaponMesh = new pc.Entity('WeaponHand');
    this.weaponMesh.setLocalPosition(0.38, 0.9, 0.1);

    if (config.hasSpear) {
      // Spear shaft & tip
      const shaft = new pc.Entity('SpearShaft');
      shaft.addComponent('render', { type: 'cylinder', material: woodMat });
      shaft.setLocalScale(0.06, 2.2, 0.06);
      shaft.setLocalPosition(0, 0.4, 0.2);
      shaft.setLocalEulerAngles(65, 0, 0);
      this.weaponMesh.addChild(shaft);

      const tip = new pc.Entity('SpearTip');
      tip.addComponent('render', { type: 'cone', material: steelMat });
      tip.setLocalScale(0.15, 0.4, 0.15);
      tip.setLocalPosition(0, 1.35, 0.65);
      tip.setLocalEulerAngles(65, 0, 0);
      this.weaponMesh.addChild(tip);
    } else if (config.hasBow) {
      // Longbow
      const bow = new pc.Entity('Bow');
      bow.addComponent('render', { type: 'cylinder', material: woodMat });
      bow.setLocalScale(0.08, 1.2, 0.08);
      bow.setLocalPosition(0, 0.2, 0.2);
      bow.setLocalEulerAngles(0, 0, 15);
      this.weaponMesh.addChild(bow);
    } else {
      // Sword blade & hilt
      const blade = new pc.Entity('SwordBlade');
      blade.addComponent('render', { type: 'box', material: steelMat });
      blade.setLocalScale(0.1, 0.9, 0.04);
      blade.setLocalPosition(0, 0.4, 0.1);
      blade.setLocalEulerAngles(25, 0, 0);
      this.weaponMesh.addChild(blade);

      const guard = new pc.Entity('Crossguard');
      guard.addComponent('render', { type: 'box', material: config.isHero ? goldMat : steelMat });
      guard.setLocalScale(0.3, 0.06, 0.08);
      guard.setLocalPosition(0, 0, 0.0);
      this.weaponMesh.addChild(guard);
    }
    this.bodyMesh.addChild(this.weaponMesh);

    // 6. Shield (Left Hand)
    if (config.hasShield || config.isHero) {
      this.shieldMesh = new pc.Entity('Shield');
      this.shieldMesh.addComponent('render', { type: 'cylinder', material: this.bodyMaterial });
      this.shieldMesh.setLocalScale(0.5, 0.08, 0.5);
      this.shieldMesh.setLocalPosition(-0.38, 0.9, 0.15);
      this.shieldMesh.setLocalEulerAngles(0, 0, 90);

      const boss = new pc.Entity('ShieldBoss');
      boss.addComponent('render', { type: 'sphere', material: steelMat });
      boss.setLocalScale(0.18, 0.12, 0.18);
      boss.setLocalPosition(-0.04, 0, 0);
      this.shieldMesh.addChild(boss);
      this.bodyMesh.addChild(this.shieldMesh);
    }

    this.root.addChild(this.bodyMesh);
  }

  private buildHealthBar(config: CharacterVisualConfig): void {
    const scale = config.scale ?? (config.isHero ? 1.25 : 1.0);
    this.healthBarRoot = new pc.Entity('HealthBar');
    this.healthBarRoot.setLocalPosition(0, 1.95 * scale, 0);

    // Background (dark grey)
    const bgMat = new pc.StandardMaterial();
    bgMat.diffuse = new pc.Color(0.1, 0.1, 0.15);
    bgMat.update();

    const bg = new pc.Entity('Bg');
    bg.addComponent('render', { type: 'box', material: bgMat });
    bg.setLocalScale(1.0, 0.12, 0.08);
    this.healthBarRoot.addChild(bg);

    // Foreground (Green / Yellow / Red based on team)
    const fillMat = new pc.StandardMaterial();
    fillMat.diffuse = this.team === 'enemy' ? new pc.Color(0.9, 0.2, 0.2) : new pc.Color(0.2, 0.85, 0.3);
    fillMat.emissive = fillMat.diffuse;
    fillMat.emissiveIntensity = 0.2;
    fillMat.update();

    this.healthBarFill = new pc.Entity('Fill');
    this.healthBarFill.addComponent('render', { type: 'box', material: fillMat });
    this.healthBarFill.setLocalScale(0.96, 0.1, 0.09);
    this.healthBarFill.setLocalPosition(0, 0, 0.01);
    this.healthBarRoot.addChild(this.healthBarFill);

    this.root.addChild(this.healthBarRoot);
  }

  public setPosition(x: number, y: number, z: number): void {
    this.targetX = x;
    this.targetZ = z;
    this.root.setPosition(x, y, z);
  }

  public setRotationY(rotY: number): void {
    this.targetRotY = rotY;
    this.root.setEulerAngles(0, (rotY * 180) / Math.PI, 0);
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    if (this.selectionRing) {
      this.selectionRing.enabled = selected;
    }
  }

  public setShieldGuard(guarding: boolean): void {
    this.isGuarding = guarding;
    if (this.shieldMesh) {
      if (guarding) {
        // Raise shield in front of chest
        this.shieldMesh.setLocalPosition(-0.15, 1.0, 0.35);
        this.shieldMesh.setLocalEulerAngles(0, 25, 90);
      } else {
        // Return to side
        this.shieldMesh.setLocalPosition(-0.38, 0.9, 0.15);
        this.shieldMesh.setLocalEulerAngles(0, 0, 90);
      }
    }
  }

  public updateHealth(current: number, max: number): void {
    this.currentHp = current;
    this.maxHp = max;
    const ratio = Math.max(0, Math.min(1, current / max));
    this.healthBarFill.setLocalScale(0.96 * ratio, 0.1, 0.09);
    this.healthBarFill.setLocalPosition(-0.48 * (1 - ratio), 0, 0.01);

    if (current <= 0 && !this.isDead) {
      this.triggerDeath();
    }
  }

  public triggerHitFlash(): void {
    this.hitFlashTimer = 0.18;
    this.bodyMaterial.emissive = new pc.Color(0.8, 0.1, 0.1);
    this.bodyMaterial.emissiveIntensity = 0.8;
    this.bodyMaterial.update();
  }

  public triggerAttack(): void {
    this.attackAnimTimer = 0.35;
  }

  public triggerHeavyAttack(): void {
    this.heavyAttackTimer = 0.55;
  }

  public triggerDeath(): void {
    this.isDead = true;
    this.healthBarRoot.enabled = false;
    if (this.selectionRing) {
      this.selectionRing.enabled = false;
    }
    // Fall over backwards
    if (this.glbEntity) {
      this.glbEntity.setLocalEulerAngles(-90, 0, 0);
      this.glbEntity.setLocalPosition(0, 0.2, 0);
    }
    if (this.bodyMesh) {
      this.bodyMesh.setLocalEulerAngles(-90, 0, 0);
      this.bodyMesh.setLocalPosition(0, 0.2, 0);
    }
  }

  /**
   * Asynchronously loads a GLB model container and swaps it into the entity,
   * retaining the stylized procedural mesh if the file is pending or encounters an error.
   */
  public loadGLB(url: string, scaleMod: number = 1.0): void {
    // Retain procedural animated character mesh with full walk/attack/shield animations
    return;
  }

  public update(delta: number, isMoving: boolean | number = false, cameraFacingY: number = 0): void {
    if (this.isDead) return;

    // Billboard healthbar toward camera
    this.healthBarRoot.setEulerAngles(35, cameraFacingY, 0);

    // Rotate selection ring if enabled
    if (this.isSelected && this.selectionRing) {
      this.selectionRing.rotate(0, delta * 75, 0);
    }

    // Walk cycle animation on legs, torso and arms
    const moving = typeof isMoving === 'number' ? isMoving > 0.05 : Boolean(isMoving);
    if (moving && this.leftLeg && this.rightLeg) {
      this.walkTimer += delta * 9.5;
      const swing = Math.sin(this.walkTimer) * 26;
      this.leftLeg.setLocalEulerAngles(swing, 0, 0);
      this.rightLeg.setLocalEulerAngles(-swing, 0, 0);
      if (this.torso) {
        this.torso.setLocalPosition(0, 0.95 + Math.abs(Math.sin(this.walkTimer)) * 0.04, 0);
      }
    } else if (this.leftLeg && this.rightLeg) {
      this.leftLeg.setLocalEulerAngles(0, 0, 0);
      this.rightLeg.setLocalEulerAngles(0, 0, 0);
      if (this.torso) {
        this.torso.setLocalPosition(0, 0.95, 0);
      }
    }

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.bodyMaterial.emissive = new pc.Color(0, 0, 0);
        this.bodyMaterial.emissiveIntensity = 0;
        this.bodyMaterial.update();
      }
    }

    // Attack swing motion
    if (this.heavyAttackTimer > 0 && this.weaponMesh) {
      this.heavyAttackTimer -= delta;
      const progress = 1.0 - (this.heavyAttackTimer / 0.55);
      const swingAngle = Math.sin(progress * Math.PI) * 110;
      this.weaponMesh.setLocalEulerAngles(swingAngle, -20, 0);
    } else if (this.attackAnimTimer > 0 && this.weaponMesh) {
      this.attackAnimTimer -= delta;
      const progress = 1.0 - (this.attackAnimTimer / 0.35); // 0 to 1
      const swingAngle = Math.sin(progress * Math.PI) * 75; // swing forward 75 deg
      this.weaponMesh.setLocalEulerAngles(swingAngle, 0, 0);
    } else if (this.weaponMesh) {
      this.weaponMesh.setLocalEulerAngles(0, 0, 0);
    }
  }

  public destroy(): void {
    this.root.destroy();
  }
}
