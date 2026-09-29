/**
 * REALM OF CROWNS — Formation Math & Slot Calculation System
 * Generates local and world coordinates for tactical troop formations.
 */

import { FormationType, FormationSlot, ArmyUnit } from './armyTypes';

export class FormationSystem {
  /**
   * Generates relative offsets (X = right/left, Z = forward/back) for given formation and unit count.
   * By convention: +Z is forward along the facing vector, -Z is behind leader.
   */
  public static getFormationSlots(type: FormationType, count: number): FormationSlot[] {
    const slots: FormationSlot[] = [];

    switch (type) {
      case 'line': {
        // Broad front line positioned slightly behind leader (Z = -2.5)
        // Alternate left and right: index 0 -> left 1.8m, 1 -> right 1.8m, 2 -> left 3.6m...
        const spacingX = 2.0;
        const rowDepth = 2.2;
        const maxUnitsPerRow = 6;

        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / maxUnitsPerRow);
          const colIndex = i % maxUnitsPerRow;
          // Center the row
          const unitsInThisRow = Math.min(maxUnitsPerRow, count - row * maxUnitsPerRow);
          const offsetX = (colIndex - (unitsInThisRow - 1) / 2) * spacingX;
          const offsetZ = -(2.5 + row * rowDepth);

          slots.push({ index: i, offsetX, offsetZ });
        }
        break;
      }

      case 'column': {
        // Double file marching column trailing behind leader
        const spacingX = 2.2;
        const spacingZ = 2.4;
        for (let i = 0; i < count; i++) {
          const col = i % 2 === 0 ? -1 : 1;
          const row = Math.floor(i / 2);
          const offsetX = col * (spacingX * 0.5);
          const offsetZ = -(2.5 + row * spacingZ);

          slots.push({ index: i, offsetX, offsetZ });
        }
        break;
      }

      case 'wedge': {
        // Piercing V-formation with leader at point, units trailing back and out
        const spreadRate = 1.8;
        const depthRate = 1.8;
        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const tier = Math.floor(i / 2) + 1;
          const offsetX = side * tier * spreadRate;
          const offsetZ = -(2.0 + tier * depthRate);

          slots.push({ index: i, offsetX, offsetZ });
        }
        break;
      }

      case 'defensive_box': {
        // Tight 360 ring / box perimeter around leader (radius ~3.5 to 5m)
        const radius = Math.max(3.2, 1.8 + count * 0.35);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const offsetX = Math.sin(angle) * radius;
          const offsetZ = Math.cos(angle) * radius;

          slots.push({ index: i, offsetX, offsetZ });
        }
        break;
      }

      case 'scatter': {
        // Dispersed skirmish screen with loose spacing
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const offsetX = (col - 2) * 3.2 + ((i * 17) % 5 - 2) * 0.4;
          const offsetZ = -(2.5 + row * 3.0) + ((i * 23) % 5 - 2) * 0.4;
          slots.push({ index: i, offsetX, offsetZ });
        }
        break;
      }
    }

    return slots;
  }

  /**
   * Transforms local formation slot offset to World coordinates based on leader's position and heading.
   * @param leaderX Leader world X
   * @param leaderZ Leader world Z
   * @param facingAngle Leader facing angle in radians (0 = facing +Z)
   * @param slotOffsetX Local right/left offset
   * @param slotOffsetZ Local forward/back offset
   */
  public static calculateWorldSlotPosition(
    leaderX: number,
    leaderZ: number,
    facingAngle: number,
    slotOffsetX: number,
    slotOffsetZ: number
  ): { x: number; z: number } {
    // Rotation matrix:
    // When facing angle = 0, forward is +Z, right is +X.
    const cosA = Math.cos(facingAngle);
    const sinA = Math.sin(facingAngle);

    // Rotated:
    // forward = (sinA, cosA)
    // right   = (cosA, -sinA)
    const worldX = leaderX + (slotOffsetX * cosA + slotOffsetZ * sinA);
    const worldZ = leaderZ + (-slotOffsetX * sinA + slotOffsetZ * cosA);

    return { x: worldX, z: worldZ };
  }

  /**
   * Assigns formation slots to a list of units and updates their slot offsets.
   */
  public static applyFormationToSquad(
    units: ArmyUnit[],
    formation: FormationType
  ): void {
    const slots = this.getFormationSlots(formation, units.length);
    units.forEach((unit, idx) => {
      if (slots[idx]) {
        unit.formationIndex = idx;
        unit.slotOffsetX = slots[idx].offsetX;
        unit.slotOffsetZ = slots[idx].offsetZ;
      }
    });
  }
}
