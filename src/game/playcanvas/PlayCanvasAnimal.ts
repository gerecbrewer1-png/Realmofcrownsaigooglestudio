/**
 * REALM OF CROWNS — PlayCanvas Wildlife 3D Visuals
 * Stylized medieval wildlife geometry (Deer, Boar, Wolf) with smooth locomotion,
 * pack alpha scaling, biting attack lunges, hit reactions, and death animations.
 */

import * as pc from 'playcanvas';
import { AnimalType } from '../npc/animalSystem';

export class PlayCanvasAnimal {
  public root: pc.Entity;
  public id: string;
  private app: pc.Application;
  private animalType: AnimalType;
  private bodyEntity?: pc.Entity;
  private headEntity?: pc.Entity;
  private legGroup: pc.Entity[] = [];
  private walkCycleTimer = 0;
  private attackAnimTimer = 0;
  private hitFlashTimer = 0;
  public isDead = false;
  private primaryMaterial!: pc.StandardMaterial;
  private wasMoving = false;

  constructor(app: pc.Application, id: string, type: AnimalType) {
    this.app = app;
    this.id = id;
    this.animalType = type;
    this.root = new pc.Entity(id);

    this.buildGeometry(type);
    this.app.root.addChild(this.root);
  }

  private buildGeometry(type: AnimalType): void {
    if (type === 'deer') {
      this.buildDeer();
    } else if (type === 'boar') {
      this.buildBoar();
    } else {
      this.buildWolf();
    }
  }

  private buildDeer(): void {
    const fawnMat = new pc.StandardMaterial();
    fawnMat.diffuse = new pc.Color(0.68, 0.44, 0.22);
    fawnMat.shininess = 20;
    fawnMat.update();
    this.primaryMaterial = fawnMat;

    const antlerMat = new pc.StandardMaterial();
    antlerMat.diffuse = new pc.Color(0.85, 0.8, 0.7);
    antlerMat.update();

    // Body
    const body = new pc.Entity('DeerBody');
    body.addComponent('render', { type: 'box', material: fawnMat });
    body.setLocalScale(0.5, 0.55, 1.1);
    body.setLocalPosition(0, 0.9, 0);
    this.root.addChild(body);
    this.bodyEntity = body;

    // Neck & Head
    const neck = new pc.Entity('DeerNeck');
    neck.addComponent('render', { type: 'box', material: fawnMat });
    neck.setLocalScale(0.28, 0.55, 0.35);
    neck.setLocalPosition(0, 1.35, 0.45);
    neck.setLocalEulerAngles(25, 0, 0);
    this.root.addChild(neck);

    const head = new pc.Entity('DeerHead');
    head.addComponent('render', { type: 'box', material: fawnMat });
    head.setLocalScale(0.25, 0.28, 0.45);
    head.setLocalPosition(0, 1.6, 0.65);
    this.root.addChild(head);
    this.headEntity = head;

    // Antlers
    const leftAntler = new pc.Entity('LeftAntler');
    leftAntler.addComponent('render', { type: 'cone', material: antlerMat });
    leftAntler.setLocalScale(0.08, 0.45, 0.08);
    leftAntler.setLocalPosition(-0.12, 1.85, 0.6);
    leftAntler.setLocalEulerAngles(20, 0, -25);
    this.root.addChild(leftAntler);

    const rightAntler = new pc.Entity('RightAntler');
    rightAntler.addComponent('render', { type: 'cone', material: antlerMat });
    rightAntler.setLocalScale(0.08, 0.45, 0.08);
    rightAntler.setLocalPosition(0.12, 1.85, 0.6);
    rightAntler.setLocalEulerAngles(20, 0, 25);
    this.root.addChild(rightAntler);

    // 4 Slender Legs
    const legOffsets = [
      { x: -0.18, z: 0.35 },
      { x: 0.18, z: 0.35 },
      { x: -0.18, z: -0.35 },
      { x: 0.18, z: -0.35 }
    ];
    for (let i = 0; i < 4; i++) {
      const leg = new pc.Entity(`Leg_${i}`);
      leg.addComponent('render', { type: 'cylinder', material: fawnMat, castShadows: false });
      leg.setLocalScale(0.1, 0.65, 0.1);
      leg.setLocalPosition(legOffsets[i].x, 0.35, legOffsets[i].z);
      this.root.addChild(leg);
      this.legGroup.push(leg);
    }
  }

  private buildBoar(): void {
    const bristleMat = new pc.StandardMaterial();
    bristleMat.diffuse = new pc.Color(0.28, 0.22, 0.18);
    bristleMat.shininess = 15;
    bristleMat.update();
    this.primaryMaterial = bristleMat;

    const tuskMat = new pc.StandardMaterial();
    tuskMat.diffuse = new pc.Color(0.9, 0.88, 0.82);
    tuskMat.update();

    // Sturdy Body
    const body = new pc.Entity('BoarBody');
    body.addComponent('render', { type: 'box', material: bristleMat });
    body.setLocalScale(0.65, 0.6, 1.0);
    body.setLocalPosition(0, 0.55, 0);
    this.root.addChild(body);
    this.bodyEntity = body;

    // Snout
    const head = new pc.Entity('BoarHead');
    head.addComponent('render', { type: 'cone', material: bristleMat });
    head.setLocalScale(0.45, 0.55, 0.45);
    head.setLocalPosition(0, 0.5, 0.65);
    head.setLocalEulerAngles(90, 0, 0);
    this.root.addChild(head);
    this.headEntity = head;

    // Tusks
    const leftTusk = new pc.Entity('LeftTusk');
    leftTusk.addComponent('render', { type: 'cone', material: tuskMat });
    leftTusk.setLocalScale(0.08, 0.22, 0.08);
    leftTusk.setLocalPosition(-0.2, 0.48, 0.7);
    leftTusk.setLocalEulerAngles(-30, 0, -20);
    this.root.addChild(leftTusk);

    const rightTusk = new pc.Entity('RightTusk');
    rightTusk.addComponent('render', { type: 'cone', material: tuskMat });
    rightTusk.setLocalScale(0.08, 0.22, 0.08);
    rightTusk.setLocalPosition(0.2, 0.48, 0.7);
    rightTusk.setLocalEulerAngles(-30, 0, 20);
    this.root.addChild(rightTusk);

    // Short stout legs
    const legOffsets = [
      { x: -0.22, z: 0.3 },
      { x: 0.22, z: 0.3 },
      { x: -0.22, z: -0.3 },
      { x: 0.22, z: -0.3 }
    ];
    for (let i = 0; i < 4; i++) {
      const leg = new pc.Entity(`BoarLeg_${i}`);
      leg.addComponent('render', { type: 'cylinder', material: bristleMat, castShadows: false });
      leg.setLocalScale(0.14, 0.35, 0.14);
      leg.setLocalPosition(legOffsets[i].x, 0.18, legOffsets[i].z);
      this.root.addChild(leg);
      this.legGroup.push(leg);
    }
  }

  private buildWolf(): void {
    const isAlpha = this.id.includes('alpha');
    const peltMat = new pc.StandardMaterial();
    // Alpha wolf has darker, charcoal coat with higher contrast
    peltMat.diffuse = isAlpha ? new pc.Color(0.25, 0.26, 0.29) : new pc.Color(0.42, 0.44, 0.46);
    peltMat.shininess = 25;
    peltMat.update();
    this.primaryMaterial = peltMat;

    const scale = isAlpha ? 1.25 : 1.0;
    this.root.setLocalScale(scale, scale, scale);

    // Sleek Body
    const body = new pc.Entity('WolfBody');
    body.addComponent('render', { type: 'box', material: peltMat });
    body.setLocalScale(0.48, 0.52, 1.15);
    body.setLocalPosition(0, 0.72, 0);
    this.root.addChild(body);
    this.bodyEntity = body;

    // Head and Snout
    const head = new pc.Entity('WolfHead');
    head.addComponent('render', { type: 'box', material: peltMat });
    head.setLocalScale(0.32, 0.32, 0.45);
    head.setLocalPosition(0, 0.95, 0.65);
    this.root.addChild(head);
    this.headEntity = head;

    // Glowing amber eyes for Alpha wolf
    if (isAlpha) {
      const eyeMat = new pc.StandardMaterial();
      eyeMat.diffuse = new pc.Color(1.0, 0.8, 0.1);
      eyeMat.emissive = eyeMat.diffuse;
      eyeMat.emissiveIntensity = 0.9;
      eyeMat.update();

      const eyeL = new pc.Entity('EyeL');
      eyeL.addComponent('render', { type: 'sphere', material: eyeMat });
      eyeL.setLocalScale(0.06, 0.06, 0.06);
      eyeL.setLocalPosition(-0.1, 1.02, 0.82);
      this.root.addChild(eyeL);

      const eyeR = new pc.Entity('EyeR');
      eyeR.addComponent('render', { type: 'sphere', material: eyeMat });
      eyeR.setLocalScale(0.06, 0.06, 0.06);
      eyeR.setLocalPosition(0.1, 1.02, 0.82);
      this.root.addChild(eyeR);
    }

    // Pointed ears
    const earL = new pc.Entity('EarL');
    earL.addComponent('render', { type: 'cone', material: peltMat });
    earL.setLocalScale(0.1, 0.18, 0.1);
    earL.setLocalPosition(-0.1, 1.15, 0.6);
    this.root.addChild(earL);

    const earR = new pc.Entity('EarR');
    earR.addComponent('render', { type: 'cone', material: peltMat });
    earR.setLocalScale(0.1, 0.18, 0.1);
    earR.setLocalPosition(0.1, 1.15, 0.6);
    this.root.addChild(earR);

    // Tail
    const tail = new pc.Entity('Tail');
    tail.addComponent('render', { type: 'cylinder', material: peltMat });
    tail.setLocalScale(0.09, 0.5, 0.09);
    tail.setLocalPosition(0, 0.65, -0.75);
    tail.setLocalEulerAngles(-45, 0, 0);
    this.root.addChild(tail);

    // 4 Swift legs
    const legOffsets = [
      { x: -0.16, z: 0.35 },
      { x: 0.16, z: 0.35 },
      { x: -0.16, z: -0.35 },
      { x: 0.16, z: -0.35 }
    ];
    for (let i = 0; i < 4; i++) {
      const leg = new pc.Entity(`WolfLeg_${i}`);
      leg.addComponent('render', { type: 'cylinder', material: peltMat, castShadows: false });
      leg.setLocalScale(0.11, 0.55, 0.11);
      leg.setLocalPosition(legOffsets[i].x, 0.28, legOffsets[i].z);
      this.root.addChild(leg);
      this.legGroup.push(leg);
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    if (this.isDead) return;
    this.root.setPosition(x, y, z);
  }

  public setRotationY(rotY: number): void {
    if (this.isDead) return;
    this.root.setEulerAngles(0, (rotY * 180) / Math.PI, 0);
  }

  public triggerAttack(): void {
    if (this.isDead) return;
    this.attackAnimTimer = 0.32;
  }

  public triggerHitFlash(): void {
    this.hitFlashTimer = 0.18;
    if (this.primaryMaterial) {
      this.primaryMaterial.emissive = new pc.Color(0.8, 0.15, 0.15);
      this.primaryMaterial.emissiveIntensity = 0.8;
      this.primaryMaterial.update();
    }
  }

  public triggerDeath(): void {
    if (this.isDead) return;
    this.isDead = true;
    // Topple onto side
    this.root.setLocalEulerAngles(0, 0, 90);
    const curPos = this.root.getPosition();
    this.root.setPosition(curPos.x, 0.15, curPos.z);
    for (const leg of this.legGroup) {
      leg.setLocalEulerAngles(0, 0, 0);
    }
  }

  public update(delta: number, isMoving: boolean): void {
    if (this.isDead) return;

    // 1. Hit flash recovery
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0 && this.primaryMaterial) {
        this.primaryMaterial.emissive = new pc.Color(0, 0, 0);
        this.primaryMaterial.emissiveIntensity = 0;
        this.primaryMaterial.update();
      }
    }

    // 2. Attack Lunge Animation
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= delta;
      const t = 1.0 - (this.attackAnimTimer / 0.32); // 0 -> 1
      const lungeForward = Math.sin(t * Math.PI) * 0.45;
      const lungePitch = Math.sin(t * Math.PI) * -18; // Pitch forward

      if (this.bodyEntity) {
        this.bodyEntity.setLocalPosition(0, 0.72 - lungeForward * 0.1, lungeForward);
        this.bodyEntity.setLocalEulerAngles(lungePitch, 0, 0);
      }
      if (this.headEntity) {
        this.headEntity.setLocalPosition(0, 0.95, 0.65 + lungeForward * 1.3);
      }
      return;
    } else {
      if (this.bodyEntity) {
        this.bodyEntity.setLocalPosition(0, this.animalType === 'boar' ? 0.55 : this.animalType === 'deer' ? 0.9 : 0.72, 0);
        this.bodyEntity.setLocalEulerAngles(0, 0, 0);
      }
      if (this.headEntity) {
        this.headEntity.setLocalPosition(0, this.animalType === 'boar' ? 0.5 : this.animalType === 'deer' ? 1.6 : 0.95, this.animalType === 'deer' ? 0.65 : 0.65);
      }
    }

    // 3. Locomotion leg swing (guarded against redundant idle transform recalculation)
    if (isMoving) {
      this.wasMoving = true;
      this.walkCycleTimer += delta * 9.0;
      const swing = Math.sin(this.walkCycleTimer) * 22;
      if (this.legGroup.length === 4) {
        this.legGroup[0].setLocalEulerAngles(swing, 0, 0);
        this.legGroup[1].setLocalEulerAngles(-swing, 0, 0);
        this.legGroup[2].setLocalEulerAngles(-swing, 0, 0);
        this.legGroup[3].setLocalEulerAngles(swing, 0, 0);
      }
    } else if (this.wasMoving && this.legGroup.length === 4) {
      this.wasMoving = false;
      this.walkCycleTimer = 0;
      for (const leg of this.legGroup) {
        leg.setLocalEulerAngles(0, 0, 0);
      }
    }
  }

  public destroy(): void {
    this.root.destroy();
  }
}
