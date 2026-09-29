/**
 * Realm of Crowns — Pirate & Naval Gear Service
 * 
 * Procedural 3D Asset Generator for authentic 18th-century maritime gear,
 * directly modeled after the user's reference sheets:
 * 
 * 1. PERIOD HATS (Reference Image 2 — Historical Chart Page 5A):
 *    - 'feathered_tricorne': Grand buccaneer tricorne with tall sweeping ostrich/horsehair plume & gold lace (M251 Artilleryman / Ref Image 4).
 *    - 'tricorne': Classic 3-corner cocked hat with curled brim flaps & rosette cockade (No. 51 / No. 58).
 *    - 'bicorne_naval': High-peaked colonial naval bicorne with gold loop tape and center cockade button (No. 356 & M50).
 *    - 'cocked_chapeau': Flared swept bicorne / chapeau with side ribbon bow (No. 257 & M55).
 *    - 'pirate_bandana': Knotted skullcap bandana with trailing cloth ribbons resting on shoulders (Ref Image 1).
 *    - 'french_fusilier': High-crested cocked mitre/hat with front crest (M250).
 *    - 'yager_rosette': Cocked hat with pleated circular ribbon cockade and brass center button (M255).
 * 
 * 2. PERIOD SWORDS & CUTLASSES (Reference Image 3 — AC4 Black Flag Weapon Catalog):
 *    - 'blackbeard_cutlass_t1': Curved boarding cutlass with steel stirrup knuckle-bow guard and wire grip.
 *    - 'blackbeard_basket_t2': Heavy naval cutlass with broad curved blade, fuller groove, brass double-bow basket hilt, and ball pommel.
 *    - 'blackbeard_falchion_t3': Clip-point recurve naval falchion with decorative spine, brass S-quillons, and fluted urn pommel.
 *    - 'siren_clamshell_t1': Spanish naval cutlass with pierced ornate brass clamshell basket hilt.
 *    - 'siren_swept_t3': Swept-hilt naval boarding saber with triple-branch knuckle bow and red cord wrap.
 *    - 'duelist_rapier': Slender straight colichemarde/rapier thrusting blade with pierced cup/bowl hilt.
 *    - 'orchid_scimitar': Curved Asian-inspired naval blade with circular brass disc guard (tsuba) and dragon pommel.
 * 
 * 3. CAPTAIN OUTFITS & ACCESSORIES (Reference Images 1 & 4):
 *    - Knee-length flared woolen frock coat with turned-back oversized cuffs, brass buttons, and waist sash.
 *    - Broad diagonal cross-chest leather baldric / bandolier with ornate brass buckle plate and hip cutlass frog.
 *    - Corsair waistcoat / buff vest over loose open linen shirt with laces.
 *    - Tall cuffed leather sea boots.
 *    - Braided pirate beard, mustache, and sideburns.
 */

import * as THREE from 'three';

const _tempCapPos = new THREE.Vector3();

// ---------------------------------------------------------------------------
// SHARED MATERIALS PALETTE
// ---------------------------------------------------------------------------

export const GearMaterials = {
  // Felt Hat Materials
  blackFelt: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.05 }),
  charcoalFelt: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.88, metalness: 0.05 }),
  brownLeatherFelt: new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.85, metalness: 0.1 }),

  // Metallic Trims & Hilts
  goldLace: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.32, metalness: 0.9 }),
  brassGilded: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.92 }),
  antiqueBronze: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.45, metalness: 0.8 }),
  whitePiping: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }),

  // Blades
  polishedSteel: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.18, metalness: 0.96 }),
  weatheredSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.9 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.85 }),

  // Leathers & Fabrics
  darkLeather: new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.78 }),
  russetLeather: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.82 }),
  tanLeather: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }),
  crimsonSilk: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 }),
  scarletCloth: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.72 }),
  royalNavyWool: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.82 }),
  buffGoldWool: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }),
  creamLinen: new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 }),

  // Feathers & Details
  blackFeather: new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6, metalness: 0.15 }),
  whiteFeather: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65, metalness: 0.1 }),
  crimsonFeather: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 }),

  // Hair & Skin
  pirateSkin: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }),
  darkBeard: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.95 }),
  auburnBeard: new THREE.MeshStandardMaterial({ color: 0x542006, roughness: 0.95 }),
};

// ---------------------------------------------------------------------------
// 1. PERIOD HATS (Reference Image 2 — Historical Chart Page 5A)
// ---------------------------------------------------------------------------

export type PeriodHatType =
  | 'feathered_tricorne'
  | 'tricorne'
  | 'bicorne_naval'
  | 'cocked_chapeau'
  | 'pirate_bandana'
  | 'french_fusilier'
  | 'yager_rosette';

export interface HatOptions {
  feltColor?: number;
  trimColor?: number;
  featherColor?: number;
  scale?: number;
}

export class PirateGearService {
  /**
   * Generates a 3D period hat based on Reference Image 2
   */
  public static createPeriodHat(type: PeriodHatType, options: HatOptions = {}): THREE.Group {
    const group = new THREE.Group();
    group.name = `hat-${type}`;
    const s = options.scale || 1.0;

    const feltMat = options.feltColor
      ? new THREE.MeshStandardMaterial({ color: options.feltColor, roughness: 0.88 })
      : GearMaterials.blackFelt;

    const trimMat = options.trimColor
      ? new THREE.MeshStandardMaterial({ color: options.trimColor, roughness: 0.3, metalness: 0.85 })
      : GearMaterials.goldLace;

    const featherMat = options.featherColor
      ? new THREE.MeshStandardMaterial({ color: options.featherColor, roughness: 0.6 })
      : GearMaterials.blackFeather;

    switch (type) {
      case 'feathered_tricorne': {
        // Grand Buccaneer Tricorne with Sweeping Feather Plume (M251 Artilleryman / Ref Image 4)
        // 1. Crown (dome)
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.28 * s, 0.22 * s, 12), feltMat);
        crown.position.y = 0.1 * s;
        group.add(crown);

        // 2. Triangular Cocked Brim with 3 turned-up points
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.54 * s, 0.5 * s, 0.16 * s, 3), feltMat);
        brim.position.y = 0.16 * s;
        brim.rotation.y = Math.PI * 0.18;
        group.add(brim);

        // 3. Gilded Edge Trim along brim perimeter
        const trim = new THREE.Mesh(new THREE.TorusGeometry(0.48 * s, 0.032 * s, 4, 16), trimMat);
        trim.rotation.x = Math.PI * 0.5;
        trim.position.y = 0.22 * s;
        group.add(trim);

        // 4. Side Cockade / Rosette
        const cockade = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.02 * s, 8), GearMaterials.scarletCloth);
        cockade.rotation.z = Math.PI * 0.45;
        cockade.position.set(-0.32 * s, 0.18 * s, 0.1 * s);
        group.add(cockade);

        const button = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 6, 6), trimMat);
        button.position.set(-0.33 * s, 0.18 * s, 0.1 * s);
        group.add(button);

        // 5. Tall Sweeping Ostrich / Horsehair Feather Plumes (Ref Image 4 Captains)
        const plumeGroup = new THREE.Group();
        plumeGroup.position.set(-0.22 * s, 0.24 * s, -0.05 * s);

        // Main sweeping plume
        const plumeGeo = new THREE.ConeGeometry(0.09 * s, 0.75 * s, 7);
        plumeGeo.rotateZ(0.4);
        plumeGeo.rotateX(-0.25);
        const plume1 = new THREE.Mesh(plumeGeo, featherMat);
        plumeGroup.add(plume1);

        // Secondary accent plume
        const plume2Geo = new THREE.ConeGeometry(0.06 * s, 0.55 * s, 6);
        plume2Geo.rotateZ(0.65);
        plume2Geo.rotateX(-0.1);
        const plume2 = new THREE.Mesh(plume2Geo, GearMaterials.whiteFeather);
        plume2.position.set(0.04 * s, -0.05 * s, 0.05 * s);
        plumeGroup.add(plume2);

        group.add(plumeGroup);
        break;
      }

      case 'tricorne': {
        // Classic 3-Point Cocked Hat (No. 51 / No. 58)
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.26 * s, 0.18 * s, 10), feltMat);
        crown.position.y = 0.09 * s;
        group.add(crown);

        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.46 * s, 0.14 * s, 3), feltMat);
        brim.position.y = 0.14 * s;
        brim.rotation.y = Math.PI * 0.18;
        group.add(brim);

        // White or gold edge piping
        const piping = new THREE.Mesh(new THREE.TorusGeometry(0.44 * s, 0.024 * s, 4, 16), trimMat);
        piping.rotation.x = Math.PI * 0.5;
        piping.position.y = 0.19 * s;
        group.add(piping);

        // Side ribbon bow
        const bow = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.12 * s, 0.08 * s), GearMaterials.whitePiping);
        bow.position.set(-0.28 * s, 0.15 * s, 0.08 * s);
        group.add(bow);
        break;
      }

      case 'bicorne_naval': {
        // Colonial Naval Bicorne (No. 356 Colonial Bicorn / M50 Gen. Washington)
        // Two-corner athwart or fore-and-aft cocked peaks
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.25 * s, 0.2 * s, 8), feltMat);
        crown.position.y = 0.1 * s;
        group.add(crown);

        // Wide flared crescent brim folded up front and back
        const frontPeak = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, 0.32 * s, 5), feltMat);
        frontPeak.rotation.z = Math.PI;
        frontPeak.rotation.y = Math.PI * 0.5;
        frontPeak.scale.set(0.35, 1.0, 1.25);
        frontPeak.position.set(0, 0.26 * s, 0);
        group.add(frontPeak);

        // Gold looping lace across front center
        const laceLoop = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.24 * s, 0.08 * s), trimMat);
        laceLoop.position.set(0, 0.22 * s, 0.18 * s);
        laceLoop.rotation.x = 0.2;
        group.add(laceLoop);

        // Center cockade button
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 6, 6), trimMat);
        button.position.set(0, 0.26 * s, 0.2 * s);
        group.add(button);
        break;
      }

      case 'cocked_chapeau': {
        // Swept Side Cocked Chapeau (No. 257 / M55 Navy 1797)
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.26 * s, 8, 6), feltMat);
        crown.scale.set(1.0, 0.65, 1.15);
        crown.position.y = 0.1 * s;
        group.add(crown);

        // Asymmetrical swept brim
        const sweptBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * s, 0.44 * s, 0.18 * s, 4), feltMat);
        sweptBrim.scale.set(0.85, 1.0, 1.35);
        sweptBrim.rotation.y = 0.4;
        sweptBrim.position.y = 0.18 * s;
        group.add(sweptBrim);

        // White contrast tape trim
        const tape = new THREE.Mesh(new THREE.TorusGeometry(0.46 * s, 0.025 * s, 4, 16), GearMaterials.whitePiping);
        tape.rotation.x = Math.PI * 0.5;
        tape.position.y = 0.24 * s;
        group.add(tape);

        // Side Rosette
        const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.02 * s, 8), GearMaterials.crimsonSilk);
        rosette.rotation.z = Math.PI * 0.5;
        rosette.position.set(-0.28 * s, 0.22 * s, 0);
        group.add(rosette);
        break;
      }

      case 'pirate_bandana': {
        // Knotted Pirate Bandana / Headscarf with trailing neck ties (Reference Image 1 center captain)
        // 1. Skullcap wrapping forehead and crown
        const skullcap = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 10, 8), GearMaterials.crimsonSilk);
        skullcap.scale.set(1.05, 0.95, 1.15);
        skullcap.position.set(0, 0.05 * s, -0.02 * s);
        group.add(skullcap);

        // 2. Forehead brow band / rolled fabric rim
        const browBand = new THREE.Mesh(new THREE.TorusGeometry(0.24 * s, 0.045 * s, 6, 16), GearMaterials.scarletCloth);
        browBand.rotation.x = Math.PI * 0.5 + 0.15;
        browBand.position.set(0, 0.02 * s, 0.02 * s);
        group.add(browBand);

        // 3. Knotted tie at the back of the head
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.065 * s, 6, 6), GearMaterials.crimsonSilk);
        knot.position.set(0, -0.02 * s, -0.28 * s);
        group.add(knot);

        // 4. Dual trailing fabric tails draping down behind the neck
        const tail1Geo = new THREE.CylinderGeometry(0.03 * s, 0.06 * s, 0.38 * s, 5);
        tail1Geo.rotateX(-0.35);
        tail1Geo.rotateZ(0.25);
        const tail1 = new THREE.Mesh(tail1Geo, GearMaterials.crimsonSilk);
        tail1.position.set(-0.06 * s, -0.16 * s, -0.32 * s);
        group.add(tail1);

        const tail2Geo = new THREE.CylinderGeometry(0.03 * s, 0.05 * s, 0.32 * s, 5);
        tail2Geo.rotateX(-0.4);
        tail2Geo.rotateZ(-0.2);
        const tail2 = new THREE.Mesh(tail2Geo, GearMaterials.scarletCloth);
        tail2.position.set(0.05 * s, -0.14 * s, -0.31 * s);
        group.add(tail2);
        break;
      }

      case 'french_fusilier': {
        // High-crested Cocked Mitre (M250)
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.26 * s, 0.22 * s, 8), feltMat);
        crown.position.y = 0.11 * s;
        group.add(crown);

        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.35 * s, 0.5 * s, 4), feltMat);
        crest.scale.set(0.4, 1.0, 1.1);
        crest.position.set(0, 0.32 * s, 0.06 * s);
        group.add(crest);

        const brassInsignia = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 * s, 0), trimMat);
        brassInsignia.position.set(0, 0.34 * s, 0.18 * s);
        group.add(brassInsignia);
        break;
      }

      case 'yager_rosette':
      default: {
        // Cocked hat with Pleated Rosette & Short Plume (M255 Yager Corps)
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.23 * s, 0.26 * s, 0.18 * s, 8), feltMat);
        crown.position.y = 0.09 * s;
        group.add(crown);

        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * s, 0.44 * s, 0.15 * s, 3), feltMat);
        brim.position.y = 0.15 * s;
        brim.rotation.y = Math.PI * 0.15;
        group.add(brim);

        // Pleated rosette cockade
        const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.02 * s, 12), GearMaterials.creamLinen);
        rosette.rotation.z = Math.PI * 0.5;
        rosette.position.set(-0.26 * s, 0.18 * s, 0.08 * s);
        group.add(rosette);

        const rosetteCenter = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 6, 6), trimMat);
        rosetteCenter.position.set(-0.28 * s, 0.18 * s, 0.08 * s);
        group.add(rosetteCenter);

        // Short upright feather
        const featherGeo = new THREE.ConeGeometry(0.045 * s, 0.32 * s, 5);
        featherGeo.rotateZ(0.2);
        const feather = new THREE.Mesh(featherGeo, GearMaterials.whiteFeather);
        feather.position.set(-0.24 * s, 0.32 * s, 0.08 * s);
        group.add(feather);
        break;
      }
    }

    return group;
  }

  // ---------------------------------------------------------------------------
  // 2. PERIOD SWORDS & CUTLASSES (Reference Image 3 — AC4 Black Flag Catalog)
  // ---------------------------------------------------------------------------

  public static createPeriodSword(
    style:
      | 'blackbeard_cutlass_t1'
      | 'blackbeard_basket_t2'
      | 'blackbeard_falchion_t3'
      | 'siren_clamshell_t1'
      | 'siren_swept_t3'
      | 'duelist_rapier'
      | 'orchid_scimitar',
    scale = 1.0
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `sword-${style}`;
    const s = scale;

    switch (style) {
      case 'blackbeard_basket_t2': {
        // Heavy Naval Cutlass with Double-Bow Brass Basket Hilt & Fuller Groove (Ref Image 3 Black Beard T2)
        // 1. Curved Steel Blade with fuller groove and clipped point
        const bladeGeo = new THREE.BoxGeometry(0.09 * s, 1.15 * s, 0.035 * s);
        // Subtle curve: offset vertices
        const posAttr = bladeGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const y = posAttr.getY(i);
          if (y > 0) {
            const curve = Math.pow(y / (1.15 * s), 2) * 0.08 * s;
            posAttr.setZ(i, posAttr.getZ(i) + curve);
          }
        }
        bladeGeo.computeVertexNormals();
        const blade = new THREE.Mesh(bladeGeo, GearMaterials.polishedSteel);
        blade.position.y = 0.58 * s;
        blade.castShadow = true;
        group.add(blade);

        // Blade Fuller Groove (darkened steel recess)
        const fullerGeo = new THREE.BoxGeometry(0.03 * s, 0.85 * s, 0.038 * s);
        const fuller = new THREE.Mesh(fullerGeo, GearMaterials.darkSteel);
        fuller.position.set(0, 0.55 * s, 0.01 * s);
        group.add(fuller);

        // 2. Brass Basket Guard (Dual protective knuckle bows wrapping around the hand)
        const basketGroup = new THREE.Group();
        basketGroup.position.set(0, 0.02 * s, 0);

        // Main crossguard plate
        const plateGeo = new THREE.BoxGeometry(0.24 * s, 0.04 * s, 0.22 * s);
        const plate = new THREE.Mesh(plateGeo, GearMaterials.brassGilded);
        basketGroup.add(plate);

        // Outer basket knuckle bow
        const bow1Geo = new THREE.TorusGeometry(0.12 * s, 0.025 * s, 5, 12, Math.PI);
        const bow1 = new THREE.Mesh(bow1Geo, GearMaterials.brassGilded);
        bow1.rotation.y = Math.PI * 0.5;
        bow1.position.set(0, -0.12 * s, 0.09 * s);
        basketGroup.add(bow1);

        // Secondary reinforcing swept bar
        const bow2Geo = new THREE.TorusGeometry(0.13 * s, 0.02 * s, 4, 12, Math.PI * 0.85);
        const bow2 = new THREE.Mesh(bow2Geo, GearMaterials.brassGilded);
        bow2.rotation.y = Math.PI * 0.65;
        bow2.rotation.z = 0.2;
        bow2.position.set(0.04 * s, -0.12 * s, 0.07 * s);
        basketGroup.add(bow2);

        group.add(basketGroup);

        // 3. Ribbed Leather Grip
        const gripGeo = new THREE.CylinderGeometry(0.038 * s, 0.042 * s, 0.26 * s, 8);
        const grip = new THREE.Mesh(gripGeo, GearMaterials.russetLeather);
        grip.position.y = -0.14 * s;
        group.add(grip);

        // Wire wrap rings on grip
        for (let w = 0; w < 4; w++) {
          const wire = new THREE.Mesh(new THREE.TorusGeometry(0.042 * s, 0.006 * s, 4, 8), GearMaterials.goldLace);
          wire.rotation.x = Math.PI * 0.5;
          wire.position.y = (-0.06 - w * 0.05) * s;
          group.add(wire);
        }

        // 4. Brass Ball Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.065 * s, 8, 8), GearMaterials.brassGilded);
        pommel.position.y = -0.28 * s;
        group.add(pommel);
        break;
      }

      case 'blackbeard_cutlass_t1': {
        // Classic Boarding Cutlass with Stirrup Guard (Ref Image 3 Black Beard T1)
        const bladeGeo = new THREE.BoxGeometry(0.085 * s, 1.1 * s, 0.032 * s);
        const blade = new THREE.Mesh(bladeGeo, GearMaterials.weatheredSteel);
        blade.position.y = 0.55 * s;
        blade.castShadow = true;
        group.add(blade);

        // Knuckle-bow stirrup guard (steel loop)
        const stirrupGeo = new THREE.TorusGeometry(0.12 * s, 0.022 * s, 5, 12, Math.PI);
        const stirrup = new THREE.Mesh(stirrupGeo, GearMaterials.darkSteel);
        stirrup.rotation.y = Math.PI * 0.5;
        stirrup.position.set(0, -0.11 * s, 0.08 * s);
        group.add(stirrup);

        const guardBar = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.035 * s, 0.06 * s), GearMaterials.darkSteel);
        guardBar.position.y = 0.01 * s;
        group.add(guardBar);

        // Leather wrapped grip
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.038 * s, 0.24 * s, 6), GearMaterials.darkLeather);
        grip.position.y = -0.12 * s;
        group.add(grip);

        // Flat disc pommel
        const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.04 * s, 6), GearMaterials.darkSteel);
        pommel.position.y = -0.25 * s;
        group.add(pommel);
        break;
      }

      case 'blackbeard_falchion_t3': {
        // Clip-point Falchion / Boarding Saber with Brass S-Quillons (Ref Image 3 Black Beard T3)
        const bladeGeo = new THREE.BoxGeometry(0.11 * s, 1.18 * s, 0.035 * s);
        const blade = new THREE.Mesh(bladeGeo, GearMaterials.polishedSteel);
        blade.position.y = 0.59 * s;
        blade.castShadow = true;
        group.add(blade);

        // Brass S-curved quillons
        const sGuard = new THREE.Group();
        const qLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.025 * s, 0.18 * s, 5), GearMaterials.brassGilded);
        qLeft.position.set(-0.1 * s, 0.04 * s, 0);
        qLeft.rotation.z = 0.6;
        const qRight = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.025 * s, 0.18 * s, 5), GearMaterials.brassGilded);
        qRight.position.set(0.1 * s, -0.04 * s, 0);
        qRight.rotation.z = -0.6;
        sGuard.add(qLeft, qRight);
        group.add(sGuard);

        // Grip & Fluted urn pommel
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * s, 0.04 * s, 0.25 * s, 6), GearMaterials.russetLeather);
        grip.position.y = -0.14 * s;
        group.add(grip);

        const pommel = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.09 * s, 6), GearMaterials.brassGilded);
        pommel.rotation.x = Math.PI;
        pommel.position.y = -0.29 * s;
        group.add(pommel);
        break;
      }

      case 'siren_clamshell_t1': {
        // Spanish Naval Cutlass with Pierced Clamshell Basket Hilt (Ref Image 3 The Siren T1)
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 1.12 * s, 0.03 * s), GearMaterials.polishedSteel);
        blade.position.y = 0.56 * s;
        group.add(blade);

        // Ornate Pierced Clamshell Guard
        const shellGeo = new THREE.SphereGeometry(0.14 * s, 8, 6, 0, Math.PI * 1.2, 0, Math.PI * 0.6);
        const clamshell = new THREE.Mesh(shellGeo, GearMaterials.goldLace);
        clamshell.rotation.x = Math.PI;
        clamshell.position.set(0, -0.04 * s, 0.04 * s);
        group.add(clamshell);

        // Twisted brass grip
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.038 * s, 0.24 * s, 8), GearMaterials.brassGilded);
        grip.position.y = -0.13 * s;
        group.add(grip);

        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 8), GearMaterials.goldLace);
        pommel.position.y = -0.26 * s;
        group.add(pommel);
        break;
      }

      case 'siren_swept_t3': {
        // Swept-Hilt Boarding Saber with Triple Branch Guard & Crimson Tassel (Ref Image 3 The Siren T3)
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.075 * s, 1.2 * s, 0.03 * s), GearMaterials.polishedSteel);
        blade.position.y = 0.6 * s;
        group.add(blade);

        // Triple swept branches
        const sweptGroup = new THREE.Group();
        for (let b = -1; b <= 1; b++) {
          const branch = new THREE.Mesh(new THREE.TorusGeometry(0.13 * s, 0.018 * s, 4, 10, Math.PI * 0.9), GearMaterials.brassGilded);
          branch.rotation.y = Math.PI * 0.5 + b * 0.3;
          branch.position.set(b * 0.03 * s, -0.12 * s, 0.08 * s);
          sweptGroup.add(branch);
        }
        group.add(sweptGroup);

        // Crimson cord tassel wrap hanging from the pommel
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.18 * s, 5), GearMaterials.crimsonSilk);
        tassel.rotation.x = Math.PI;
        tassel.position.set(0.05 * s, -0.36 * s, 0.02 * s);
        group.add(tassel);

        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * s, 0.038 * s, 0.24 * s, 8), GearMaterials.darkLeather);
        grip.position.y = -0.13 * s;
        group.add(grip);

        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 6, 6), GearMaterials.brassGilded);
        pommel.position.y = -0.27 * s;
        group.add(pommel);
        break;
      }

      case 'duelist_rapier': {
        // Slender Rapier / Colichemarde with Filigree Cup Hilt (Ref Image 3 The Duelist)
        const bladeGeo = new THREE.CylinderGeometry(0.016 * s, 0.028 * s, 1.35 * s, 4);
        const blade = new THREE.Mesh(bladeGeo, GearMaterials.polishedSteel);
        blade.position.y = 0.68 * s;
        group.add(blade);

        // Filigree Cup / Bowl Guard
        const cupGeo = new THREE.SphereGeometry(0.13 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const cup = new THREE.Mesh(cupGeo, GearMaterials.antiqueBronze);
        cup.rotation.x = Math.PI;
        cup.position.y = 0.02 * s;
        group.add(cup);

        // Straight crossguard quillons
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.025 * s, 0.025 * s), GearMaterials.brassGilded);
        cross.position.y = 0.03 * s;
        group.add(cross);

        // Grip & Urn pommel
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * s, 0.03 * s, 0.22 * s, 6), GearMaterials.darkLeather);
        grip.position.y = -0.1 * s;
        group.add(grip);

        const pommel = new THREE.Mesh(new THREE.ConeGeometry(0.045 * s, 0.08 * s, 6), GearMaterials.brassGilded);
        pommel.rotation.x = Math.PI;
        pommel.position.y = -0.23 * s;
        group.add(pommel);
        break;
      }

      case 'orchid_scimitar':
      default: {
        // Curved Eastern Pirate Scimitar with Circular Disc Guard & Dragon Pommel (Ref Image 3 The Orchid T1/T3)
        const bladeGeo = new THREE.BoxGeometry(0.09 * s, 1.15 * s, 0.032 * s);
        const posAttr = bladeGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const y = posAttr.getY(i);
          if (y > 0) {
            const curve = Math.pow(y / (1.15 * s), 1.8) * 0.12 * s;
            posAttr.setZ(i, posAttr.getZ(i) + curve);
          }
        }
        bladeGeo.computeVertexNormals();
        const blade = new THREE.Mesh(bladeGeo, GearMaterials.polishedSteel);
        blade.position.y = 0.58 * s;
        group.add(blade);

        // Brass disc guard (tsuba)
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.03 * s, 12), GearMaterials.brassGilded);
        disc.position.y = 0.01 * s;
        group.add(disc);

        // Red cord wrapped grip
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * s, 0.038 * s, 0.26 * s, 6), GearMaterials.crimsonSilk);
        grip.position.y = -0.13 * s;
        group.add(grip);

        // Gold dragon head / ring pommel
        const dragonPommel = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.02 * s, 4, 8), GearMaterials.goldLace);
        dragonPommel.position.y = -0.28 * s;
        group.add(dragonPommel);
        break;
      }
    }

    return group;
  }

  // ---------------------------------------------------------------------------
  // 3. CAPTAIN OUTFIT BUILDER (Reference Images 1 & 4)
  // ---------------------------------------------------------------------------

  public static createCaptainTorso(
    style: 'crimson_frock_coat' | 'navy_officer_coat' | 'buff_waistcoat' | 'khaki_corsair',
    hasCrossBaldric = true,
    scale = 1.0
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `torso-${style}`;
    const s = scale;

    const coatMat =
      style === 'crimson_frock_coat'
        ? GearMaterials.crimsonSilk
        : style === 'navy_officer_coat'
        ? GearMaterials.royalNavyWool
        : style === 'buff_waistcoat'
        ? GearMaterials.buffGoldWool
        : GearMaterials.russetLeather;

    // 1. Torso Core
    const torsoGeo = new THREE.BoxGeometry(0.72 * s, 0.95 * s, 0.46 * s);
    const torso = new THREE.Mesh(torsoGeo, coatMat);
    torso.position.y = 1.38 * s;
    torso.castShadow = true;
    group.add(torso);

    if (style !== 'buff_waistcoat') {
      // Flared Coat Skirt (knee length flared frock coat drapes, Ref Images 1 & 4)
      const skirtGeo = new THREE.CylinderGeometry(0.38 * s, 0.56 * s, 0.82 * s, 8, 1, true);
      const skirt = new THREE.Mesh(skirtGeo, coatMat);
      skirt.position.y = 0.8 * s;
      skirt.castShadow = true;
      group.add(skirt);

      // Gold Braided Lapels along front center
      const leftLapel = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.85 * s, 0.04 * s), GearMaterials.goldLace);
      leftLapel.position.set(-0.14 * s, 1.42 * s, 0.23 * s);
      leftLapel.rotation.z = -0.05;
      const rightLapel = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.85 * s, 0.04 * s), GearMaterials.goldLace);
      rightLapel.position.set(0.14 * s, 1.42 * s, 0.23 * s);
      rightLapel.rotation.z = 0.05;
      group.add(leftLapel, rightLapel);

      // Brass Buttons down coat
      for (let b = 0; b < 4; b++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024 * s, 5, 5), GearMaterials.brassGilded);
        btn.position.set(-0.06 * s, (1.2 + b * 0.14) * s, 0.24 * s);
        group.add(btn);
      }
    } else {
      // Buff Waistcoat open over gathered linen shirt
      const shirtLinen = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.8 * s, 0.48 * s), GearMaterials.creamLinen);
      shirtLinen.position.y = 1.4 * s;
      group.add(shirtLinen);
    }

    // 2. Silk Waist Sash (crimson or purple silk tied around hips)
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.76 * s, 0.16 * s, 0.48 * s), GearMaterials.scarletCloth);
    sash.position.y = 1.02 * s;
    group.add(sash);

    // 3. Wide Leather Belt with Giant Brass Buckle (Ref Image 4 center captain)
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.74 * s, 0.12 * s, 0.49 * s), GearMaterials.darkLeather);
    belt.position.y = 0.94 * s;
    group.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.16 * s, 0.04 * s), GearMaterials.brassGilded);
    buckle.position.set(0, 0.94 * s, 0.26 * s);
    group.add(buckle);

    // 4. Diagonal Cross-Chest Leather Baldric / Sword Bandolier with Brass Buckle (Ref Image 4 center captain!)
    if (hasCrossBaldric) {
      const baldricGeo = new THREE.BoxGeometry(0.15 * s, 1.25 * s, 0.5 * s);
      const baldric = new THREE.Mesh(baldricGeo, GearMaterials.russetLeather);
      baldric.rotation.z = 0.65; // Diagonal across chest from right shoulder to left hip
      baldric.position.set(0, 1.42 * s, 0.02 * s);
      group.add(baldric);

      // Ornate Brass Baldric Buckle Plate in center of chest
      const baldricBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.18 * s, 0.04 * s), GearMaterials.brassGilded);
      baldricBuckle.rotation.z = 0.65;
      baldricBuckle.position.set(0.04 * s, 1.46 * s, 0.26 * s);
      group.add(baldricBuckle);

      // Cutlass Frog / Scabbard Mount at Left Hip
      const frog = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.26 * s, 0.16 * s), GearMaterials.russetLeather);
      frog.position.set(-0.42 * s, 0.92 * s, 0.08 * s);
      frog.rotation.z = 0.3;
      group.add(frog);
    }

    return group;
  }

  /**
   * Builds Oversized Turned-Back Cuffs & Sleeves (Ref Images 1 & 4)
   */
  public static createCaptainArm(
    isLeft: boolean,
    coatMat: THREE.Material = GearMaterials.crimsonSilk,
    scale = 1.0
  ): THREE.Group {
    const group = new THREE.Group();
    const s = scale;
    const sign = isLeft ? -1 : 1;

    // Upper Arm & Forearm
    const armGeo = new THREE.CylinderGeometry(0.11 * s, 0.12 * s, 0.65 * s, 6);
    const arm = new THREE.Mesh(armGeo, coatMat);
    arm.position.set(sign * 0.44 * s, 1.45 * s, 0);
    group.add(arm);

    // Turned-back Deep Cuff with gold trim
    const cuffGeo = new THREE.CylinderGeometry(0.15 * s, 0.14 * s, 0.24 * s, 8);
    const cuff = new THREE.Mesh(cuffGeo, GearMaterials.goldLace);
    cuff.position.set(sign * 0.44 * s, 1.25 * s, 0);
    group.add(cuff);

    // Hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 6, 6), GearMaterials.pirateSkin);
    hand.position.set(sign * 0.44 * s, 1.05 * s, 0);
    group.add(hand);

    return group;
  }

  /**
   * Builds Cuffed Tall Leather Sea Boots (Ref Images 1 & 4)
   */
  public static createSeaBoots(scale = 1.0): THREE.Group {
    const group = new THREE.Group();
    const s = scale;

    [-0.24, 0.24].forEach((lx) => {
      // Leg / Breeches
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * s, 0.13 * s, 0.85 * s, 6),
        GearMaterials.creamLinen
      );
      leg.position.set(lx * s, 0.65 * s, 0);
      leg.castShadow = true;
      group.add(leg);

      // Folded-over Leather Boot Cuff
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17 * s, 0.15 * s, 0.22 * s, 8),
        GearMaterials.russetLeather
      );
      cuff.position.set(lx * s, 0.62 * s, 0);
      group.add(cuff);

      // Boot Shaft & Foot
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * s, 0.13 * s, 0.45 * s, 8),
        GearMaterials.darkLeather
      );
      shaft.position.set(lx * s, 0.35 * s, 0);
      group.add(shaft);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.28 * s, 0.22 * s, 0.46 * s),
        GearMaterials.darkLeather
      );
      foot.position.set(lx * s, 0.11 * s, 0.06 * s);
      foot.castShadow = true;
      group.add(foot);
    });

    return group;
  }

  /**
   * Pirate Facial Hair (Full Black/Brown Braided Beard, Mustache, and Sideburns)
   */
  public static createPirateFacialHair(style: 'full_beard' | 'goatee' | 'stubble' = 'full_beard', scale = 1.0): THREE.Group {
    const group = new THREE.Group();
    const s = scale;

    if (style === 'full_beard') {
      // Full bushy pirate beard draping from chin down to collar
      const beardGeo = new THREE.ConeGeometry(0.18 * s, 0.42 * s, 6);
      beardGeo.rotateX(0.2);
      const beard = new THREE.Mesh(beardGeo, GearMaterials.darkBeard);
      beard.position.set(0, -0.16 * s, 0.14 * s);
      group.add(beard);

      // Mustache
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.06 * s, 0.06 * s), GearMaterials.darkBeard);
      stache.position.set(0, 0.02 * s, 0.19 * s);
      group.add(stache);

      // Sideburns
      [-0.18, 0.18].forEach((bx) => {
        const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.22 * s, 0.12 * s), GearMaterials.darkBeard);
        sideburn.position.set(bx * s, 0, 0.02 * s);
        group.add(sideburn);
      });
    }

    return group;
  }

  // ---------------------------------------------------------------------------
  // 4. NIGHT BEACH CAMPFIRE (Reference Image 4)
  // ---------------------------------------------------------------------------

  public static createBeachCampfire(scale = 1.0): THREE.Group {
    const group = new THREE.Group();
    group.name = 'beach-campfire';
    const s = scale;

    // 1. Stone Hearth Ring
    const stones = 8;
    for (let i = 0; i < stones; i++) {
      const angle = (i / stones) * Math.PI * 2;
      const stoneGeo = new THREE.DodecahedronGeometry(0.22 * s, 0);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(Math.cos(angle) * 0.95 * s, 0.12 * s, Math.sin(angle) * 0.95 * s);
      group.add(stone);
    }

    // 2. Crossed Driftwood Timber Logs
    const logMat = new THREE.MeshStandardMaterial({ color: 0x271708, roughness: 0.95 });
    for (let l = 0; l < 4; l++) {
      const angle = (l / 4) * Math.PI;
      const logGeo = new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 1.6 * s, 6);
      logGeo.rotateZ(angle);
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.set(0, 0.18 * s + l * 0.04 * s, 0);
      group.add(log);
    }

    // 3. Glowing Embers & Coals in center
    const coalGeo = new THREE.SphereGeometry(0.55 * s, 8, 6);
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff4500,
      emissiveIntensity: 2.2,
      roughness: 0.7,
    });
    const coals = new THREE.Mesh(coalGeo, coalMat);
    coals.scale.set(1.0, 0.35, 1.0);
    coals.position.y = 0.15 * s;
    group.add(coals);

    // 4. Piercing Fire Flame Mesh (layered translucent cones)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.85,
    });
    const flameGeo = new THREE.ConeGeometry(0.42 * s, 1.25 * s, 6);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.75 * s;
    group.add(flame);

    // 5. Dynamic Warm Point Light illuminating captains & sand (no shadow passes for high 60fps)
    const fireLight = new THREE.PointLight(0xf97316, 4.2 * s, 18 * s);
    fireLight.position.set(0, 0.9 * s, 0);
    fireLight.castShadow = false;
    group.add(fireLight);

    return group;
  }

  // ---------------------------------------------------------------------------
  // 5. FULL PIRATE CAPTAIN NPC GENERATOR (Ref Images 1 & 4)
  // ---------------------------------------------------------------------------

  public static createPirateCaptainNPC(spec: {
    id: string;
    name: string;
    role: string;
    dialogue: string;
    pos: THREE.Vector3;
    rotY: number;
    outfit: 'crimson_frock_coat' | 'navy_officer_coat' | 'buff_waistcoat' | 'khaki_corsair';
    hat: PeriodHatType;
    sword:
      | 'blackbeard_cutlass_t1'
      | 'blackbeard_basket_t2'
      | 'blackbeard_falchion_t3'
      | 'siren_clamshell_t1'
      | 'siren_swept_t3'
      | 'duelist_rapier'
      | 'orchid_scimitar';
    hasCrossBaldric?: boolean;
    pose?: 'standing_sword_ready' | 'leaning_on_sword' | 'sitting_on_chest' | 'sitting_on_barrel';
    facialHair?: 'full_beard' | 'goatee' | 'stubble';
    scale?: number;
  }) {
    const group = new THREE.Group();
    group.name = `captain-${spec.id}`;
    group.position.copy(spec.pos);
    group.rotation.y = spec.rotY;

    const s = spec.scale || 1.0;
    const pose = spec.pose || 'standing_sword_ready';
    const isSitting = pose === 'sitting_on_chest' || pose === 'sitting_on_barrel';

    // 1. Seat Props if sitting
    if (pose === 'sitting_on_chest') {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.85 });
      const chestGeo = new THREE.BoxGeometry(0.7 * s, 0.5 * s, 0.5 * s);
      const chest = new THREE.Mesh(chestGeo, woodMat);
      chest.position.set(0, 0.25 * s, -0.05 * s);
      chest.castShadow = true;
      group.add(chest);

      // Iron corner straps
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.72 * s, 0.52 * s, 0.12 * s), ironMat);
      strap.position.set(0, 0.25 * s, -0.05 * s);
      group.add(strap);
    } else if (pose === 'sitting_on_barrel') {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
      const barrelGeo = new THREE.CylinderGeometry(0.35 * s, 0.4 * s, 0.65 * s, 10);
      const barrel = new THREE.Mesh(barrelGeo, woodMat);
      barrel.position.set(0, 0.32 * s, -0.08 * s);
      barrel.castShadow = true;
      group.add(barrel);
    }

    // 2. Torso with authentic captain outfit & cross-chest baldric
    const torso = PirateGearService.createCaptainTorso(
      spec.outfit,
      spec.hasCrossBaldric !== false,
      s
    );
    if (isSitting) {
      torso.position.y = -0.35 * s;
    }
    group.add(torso);

    // 3. Legs & Boots (Standing or Bent Sitting Pose)
    if (!isSitting) {
      const boots = PirateGearService.createSeaBoots(s);
      group.add(boots);
    } else {
      // Sitting Bent Legs
      [-0.24, 0.24].forEach((lx) => {
        // Thigh horizontal forward
        const thigh = new THREE.Mesh(
          new THREE.BoxGeometry(0.18 * s, 0.16 * s, 0.48 * s),
          GearMaterials.creamLinen
        );
        thigh.position.set(lx * s, 0.48 * s, 0.22 * s);
        group.add(thigh);

        // Shin vertical down
        const shin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12 * s, 0.13 * s, 0.48 * s, 6),
          GearMaterials.darkLeather
        );
        shin.position.set(lx * s, 0.24 * s, 0.42 * s);
        group.add(shin);

        // Boot
        const boot = new THREE.Mesh(
          new THREE.BoxGeometry(0.24 * s, 0.18 * s, 0.36 * s),
          GearMaterials.darkLeather
        );
        boot.position.set(lx * s, 0.09 * s, 0.5 * s);
        group.add(boot);
      });
    }

    // 4. Arms & Hands
    const coatMat =
      spec.outfit === 'crimson_frock_coat'
        ? GearMaterials.crimsonSilk
        : spec.outfit === 'navy_officer_coat'
        ? GearMaterials.royalNavyWool
        : spec.outfit === 'buff_waistcoat'
        ? GearMaterials.buffGoldWool
        : GearMaterials.russetLeather;

    const leftArm = PirateGearService.createCaptainArm(true, coatMat, s);
    const rightArm = PirateGearService.createCaptainArm(false, coatMat, s);

    if (isSitting) {
      leftArm.position.y = -0.35 * s;
      rightArm.position.y = -0.35 * s;
    }
    group.add(leftArm, rightArm);

    // 5. Sword / Cutlass Assembly
    const swordMesh = PirateGearService.createPeriodSword(spec.sword, s);
    const swordHolder = new THREE.Group();

    if (pose === 'leaning_on_sword') {
      // Leaning on sword point-down on ground (Ref Image 4 left captain)
      swordHolder.position.set(0.48 * s, 0.65 * s, 0.35 * s);
      swordMesh.rotation.x = Math.PI; // Blade points down
      swordHolder.add(swordMesh);
      // Right arm angles down to grip pommel
      rightArm.rotation.x = 0.25;
      rightArm.rotation.z = -0.15;
    } else if (isSitting) {
      // Resting horizontally across knee or beside hip
      swordHolder.position.set(0.38 * s, 0.5 * s, 0.2 * s);
      swordMesh.rotation.x = 0.4;
      swordMesh.rotation.z = 0.5;
      swordHolder.add(swordMesh);
    } else {
      // Ready in right hand
      swordHolder.position.set(0.46 * s, 1.25 * s, 0.15 * s);
      swordMesh.rotation.x = 0.45;
      swordHolder.add(swordMesh);
      rightArm.rotation.x = 0.35;
    }
    group.add(swordHolder);

    // 6. Neck & Head Bone (For dynamic hero tracking)
    const neckMat = GearMaterials.pirateSkin;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.13 * s, 0.18 * s, 6), neckMat);
    neck.position.set(0, (isSitting ? 1.6 : 1.95) * s, 0);
    group.add(neck);

    const headBone = new THREE.Group();
    headBone.position.set(0, (isSitting ? 1.76 : 2.12) * s, 0);

    // Head sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 8, 8), GearMaterials.pirateSkin);
    head.castShadow = true;
    headBone.add(head);

    // Facial hair (beard & mustache)
    const facialHair = PirateGearService.createPirateFacialHair(spec.facialHair || 'full_beard', s);
    headBone.add(facialHair);

    // Period Hat (Ref Image 2)
    const hat = PirateGearService.createPeriodHat(spec.hat, { scale: s });
    hat.position.y = 0.14 * s;
    headBone.add(hat);

    group.add(headBone);

    // 7. Overhead Interactive Badge & Nameplate
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 64;
    const bCtx = badgeCanvas.getContext('2d')!;
    bCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    bCtx.strokeStyle = '#f59e0b';
    bCtx.lineWidth = 3;
    bCtx.beginPath();
    bCtx.roundRect(8, 8, 240, 48, 10);
    bCtx.fill();
    bCtx.stroke();

    bCtx.font = 'bold 18px sans-serif';
    bCtx.fillStyle = '#fef08a';
    bCtx.textAlign = 'center';
    bCtx.fillText(`🏴‍☠️ ${spec.name}`, 128, 30);

    bCtx.font = 'bold 12px monospace';
    bCtx.fillStyle = '#fca5a5';
    bCtx.fillText(spec.role, 128, 48);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false }));
    badgeSprite.scale.set(2.4 * s, 0.6 * s, 1);
    badgeSprite.position.set(0, (isSitting ? 2.35 : 2.75) * s, 0);
    group.add(badgeSprite);

    const initialPos = spec.pos.clone();

    // 8. Captain Animation Loop
    const update = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
      // Harmonized upper body breathing (torso, arms, neck, and head move together as unified anatomy)
      const breath = Math.sin(animTime * 2.0 + initialPos.x) * 0.02 * s;
      const baseUpperY = (isSitting ? -0.35 : 0) * s;
      torso.position.y = baseUpperY + breath;
      leftArm.position.y = baseUpperY + breath;
      rightArm.position.y = baseUpperY + breath;
      neck.position.y = (isSitting ? 1.6 : 1.95) * s + breath;
      headBone.position.y = (isSitting ? 1.76 : 2.12) * s + breath * 1.1;

      // Track hero orientation with head when close (within 14 meters, zero allocation)
      group.getWorldPosition(_tempCapPos);
      const dx = heroPos.x - _tempCapPos.x;
      const dz = heroPos.z - _tempCapPos.z;
      const distToHero = Math.hypot(dx, dz);

      if (distToHero < 14.0) {
        const targetAngle = Math.atan2(dx, dz) - group.rotation.y;
        const clampedAngle = THREE.MathUtils.clamp(targetAngle, -1.15, 1.15);
        headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, clampedAngle, 7 * delta);
      } else {
        headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, 0, 4 * delta);
      }
    };

    return {
      id: spec.id,
      name: spec.name,
      role: spec.role,
      dialogue: spec.dialogue,
      group,
      headBone,
      swordMesh: swordHolder,
      initialPos,
      update,
    };
  }
}

