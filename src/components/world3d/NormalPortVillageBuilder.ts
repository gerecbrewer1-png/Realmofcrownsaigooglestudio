/**
 * Realm of Crowns — Normal Port Village & Harbor Waterfront Builder
 *
 * Implements high-fidelity colonial/Mediterranean coastal villages and harbor quays
 * directly modeled after the provided architectural and waterfront references:
 * 1. Bustling Village Street Thoroughfare:
 *    - 2 to 3-story colonial/Mediterranean houses with warm stucco walls, clay-tile roofs,
 *      timber balconies with balusters, cantilevered support brackets, and exterior stairs.
 *    - Vibrant striped market awnings (terracotta/cream, ochre/tan, navy/linen).
 *    - Street-level artisan and vendor stalls loaded with crates of bright oranges/citrus,
 *      burlap grain sacks, rum barrels, and wooden spoked-wheel cargo carts.
 *    - Climbing green ivy, bougainvillea vines, and coastal tropical palm trees.
 * 2. Waterfront Boardwalk & Mooring Pilings (Direct Reference Match):
 *    - Rustic wooden plank pier jutting into clear turquoise waters.
 *    - Thick weathered timber mooring pilings tightly wrapped with coiled hemp ropes.
 *    - Pier-side wooden barrels for villagers to sit or rest against.
 * 3. Moored Tall Ship at the Harbor Edge:
 *    - Multi-masted tall ship (galleon/frigate) with standing rigging, ratlines, yardarms,
 *      and furled canvas sails towering dramatically at the harbor entrance.
 * 4. Distant Tropical Mountain Ridges across the bay with atmospheric aerial perspective.
 */

import * as THREE from 'three';

export interface NormalPortVillageOptions {
  havenName?: string;
  nation?: string;
}

export class NormalPortVillageBuilder {
  /**
   * Main entry point: constructs the entire normal port village environment
   */
  public static buildNormalPortVillage(
    scene: THREE.Group | THREE.Scene,
    stoneMat: THREE.Material,
    woodMat: THREE.Material,
    colliders: THREE.Box3[],
    options: NormalPortVillageOptions = {}
  ): THREE.Group {
    const root = new THREE.Group();
    root.name = 'normal-port-village-environment';
    scene.add(root);

    // Common Curated Materials
    const stuccoColors = [0xfef3c7, 0xfde68a, 0xfed7aa, 0xfafaf9, 0xf1f5f9];
    const roofColors = [0xb45309, 0xc2410c, 0x9a3412, 0xd97706];
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.88 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x29180b, roughness: 0.85 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.95 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85, flatShading: true });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xbe185d, roughness: 0.75, flatShading: true });
    const fruitOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
    const fruitYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.92 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.95 });
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95, flatShading: true });
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    // 1. Crystal Coastal Sea Water Plane (Y = -0.4)
    const oceanGeo = new THREE.PlaneGeometry(800, 800, 16, 16);
    oceanGeo.rotateX(-Math.PI * 0.5);
    const ocean = new THREE.Mesh(oceanGeo, seaMat);
    ocean.position.set(0, -0.4, -120);
    root.add(ocean);

    // 2. Sandy Coastal Beach Curve
    const beachGeo = new THREE.PlaneGeometry(360, 90);
    beachGeo.rotateX(-Math.PI * 0.5);
    const beach = new THREE.Mesh(beachGeo, sandMat);
    beach.position.set(0, 0.05, 50);
    root.add(beach);

    // 3. Distant Lush Tropical Mountains across the Bay (Matching Reference 2)
    for (let m = 0; m < 7; m++) {
      const peakGeo = new THREE.CylinderGeometry(18, 75, 120, 8);
      const peak = new THREE.Mesh(peakGeo, mountainMat);
      peak.position.set(-180 + m * 60, 55, 130 + (m % 3) * 30);
      root.add(peak);
    }

    // 4. Stone Quay & Waterfront Promenade (Walkable top surface Y = 1.0)
    const quayGeo = new THREE.BoxGeometry(160, 1.8, 48);
    const quay = new THREE.Mesh(quayGeo, stoneMat);
    quay.position.set(0, 0.1, 15);
    quay.receiveShadow = true;
    root.add(quay);

    // 5. Main Village Avenue Plaza with Cobblestones (Walkable Y = 1.0)
    const plazaGeo = new THREE.BoxGeometry(140, 1.8, 55);
    const plaza = new THREE.Mesh(plazaGeo, stoneMat);
    plaza.position.set(0, 0.1, 52);
    plaza.receiveShadow = true;
    root.add(plaza);

    // 6. Waterfront Boardwalk & Deep-Water Pier (Walkable Y = 1.0)
    const pierGeo = new THREE.BoxGeometry(22, 1.8, 68);
    const pier = new THREE.Mesh(pierGeo, woodMat);
    pier.position.set(0, 0.1, -26);
    pier.receiveShadow = true;
    root.add(pier);

    // 7. ROPE-WRAPPED WOODEN MOORING PILINGS / BOLLARDS (Direct Match to Reference 2)
    // Thick weathered pilings standing proud along both edges of the pier
    const pierEdgeZ = [-55, -45, -35, -25, -15, -5, 5];
    pierEdgeZ.forEach((pz) => {
      [-10.2, 10.2].forEach((px) => {
        const piling = this.createMooringPiling(darkWoodMat, ropeMat);
        piling.position.set(px, 1.0, pz);
        root.add(piling);

        // Add small collider so hero doesn't walk right through the piling
        const box = new THREE.Box3();
        box.setFromCenterAndSize(new THREE.Vector3(px, 2.5, pz), new THREE.Vector3(1.6, 5, 1.6));
        colliders.push(box);
      });
    });

    // 8. RUSTIC PIER-SIDE BARRELS (Where maidens and villagers sit, as in Reference 2)
    const pierBarrels = [
      { x: -8.8, z: -18, r: 0.1 },
      { x: -8.5, z: -32, r: -0.2 },
      { x: 8.8, z: -22, r: 0.15 },
      { x: 8.5, z: -40, r: -0.1 },
      { x: -8.8, z: 2, r: 0 },
      { x: 8.8, z: 2, r: 0 },
    ];
    pierBarrels.forEach((pb) => {
      const bGeo = new THREE.CylinderGeometry(0.75, 0.85, 1.8, 10);
      const bMesh = new THREE.Mesh(bGeo, timberMat);
      bMesh.position.set(pb.x, 1.9, pb.z);
      bMesh.rotation.y = pb.r;
      bMesh.castShadow = true;
      root.add(bMesh);

      // Iron hoops
      [-0.6, 0, 0.6].forEach((hy) => {
        const hoopGeo = new THREE.TorusGeometry(0.82, 0.03, 4, 12);
        const hoop = new THREE.Mesh(hoopGeo, ironMat);
        hoop.rotation.x = Math.PI * 0.5;
        hoop.position.set(pb.x, 1.9 + hy, pb.z);
        root.add(hoop);
      });
    });

    // 9. MULTI-STORY COLONIAL & MEDITERRANEAN VILLAGE HOUSES (Matching Reference 1 & 2)
    // Left side of the street (West side)
    const leftHouses = [
      { x: -32, z: 22, w: 20, h: 16, d: 18, colorIdx: 0, roofIdx: 0, hasBalcony: true, name: 'The Crown & Anchor Tavern' },
      { x: -34, z: 42, w: 22, h: 17, d: 18, colorIdx: 1, roofIdx: 1, hasBalcony: true, name: 'Merchant Exchange' },
      { x: -32, z: 64, w: 20, h: 15, d: 18, colorIdx: 2, roofIdx: 2, hasBalcony: false, name: 'Harbor Storehouse' },
      { x: -54, z: 32, w: 18, h: 14, d: 18, colorIdx: 3, roofIdx: 0, hasBalcony: false, name: 'Sailmaker Loft' },
      { x: -54, z: 54, w: 18, h: 15, d: 18, colorIdx: 4, roofIdx: 3, hasBalcony: true, name: 'Apothecary Guild' },
    ];

    // Right side of the street (East side)
    const rightHouses = [
      { x: 32, z: 22, w: 20, h: 16, d: 18, colorIdx: 1, roofIdx: 1, hasBalcony: true, name: 'Royal Shipwright Office' },
      { x: 34, z: 42, w: 22, h: 18, d: 18, colorIdx: 0, roofIdx: 0, hasBalcony: true, name: 'Customs & Admiralty House' },
      { x: 32, z: 64, w: 20, h: 15, d: 18, colorIdx: 3, roofIdx: 2, hasBalcony: false, name: 'Naval Armory' },
      { x: 54, z: 32, w: 18, h: 14, d: 18, colorIdx: 2, roofIdx: 3, hasBalcony: false, name: 'Cooperage & Barrel Works' },
      { x: 54, z: 54, w: 18, h: 15, d: 18, colorIdx: 4, roofIdx: 1, hasBalcony: true, name: 'Colonial Bank' },
    ];

    // Back Town Hall / Governor Chancellery at North End of Plaza
    const backPalace = { x: 0, z: 78, w: 32, h: 21, d: 20, colorIdx: 0, roofIdx: 0, hasBalcony: true, name: "Governor's Palace" };

    const allHouses = [...leftHouses, ...rightHouses, backPalace];

    allHouses.forEach((hSpec) => {
      const houseGroup = this.createColonialHouse(
        hSpec,
        stuccoColors[hSpec.colorIdx % stuccoColors.length],
        roofColors[hSpec.roofIdx % roofColors.length],
        timberMat,
        darkWoodMat,
        foliageMat,
        flowerMat
      );
      root.add(houseGroup);

      // Add to collision bounding boxes
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(hSpec.x, 10, hSpec.z),
        new THREE.Vector3(hSpec.w + 1.2, 30, hSpec.d + 1.2)
      );
      colliders.push(box);
    });

    // 10. BUSTLING STREET-SIDE MARKET STALLS WITH STRIPED AWNINGS (Matching Reference 1)
    // Left market stalls along the avenue
    const stall1 = this.createMarketStall(
      -15,
      28,
      0,
      'terracotta',
      timberMat,
      fruitOrangeMat,
      fruitYellowMat,
      sackMat,
      ironMat
    );
    root.add(stall1);

    const stall2 = this.createMarketStall(
      -15,
      48,
      0,
      'ochre',
      timberMat,
      fruitOrangeMat,
      fruitYellowMat,
      sackMat,
      ironMat
    );
    root.add(stall2);

    // Right market stalls along the avenue
    const stall3 = this.createMarketStall(
      15,
      28,
      Math.PI,
      'navy',
      timberMat,
      fruitOrangeMat,
      fruitYellowMat,
      sackMat,
      ironMat
    );
    root.add(stall3);

    const stall4 = this.createMarketStall(
      15,
      48,
      Math.PI,
      'olive',
      timberMat,
      fruitOrangeMat,
      fruitYellowMat,
      sackMat,
      ironMat
    );
    root.add(stall4);

    // Add stall collision boxes to prevent walking through the counters
    [-15, 15].forEach((sx) => {
      [28, 48].forEach((sz) => {
        const sBox = new THREE.Box3();
        sBox.setFromCenterAndSize(new THREE.Vector3(sx, 2.5, sz), new THREE.Vector3(6.5, 4, 4.5));
        colliders.push(sBox);
      });
    });

    // 11. WOODEN CARGO HANDCARTS WITH SPOKED WHEELS (From Reference 1)
    const cart1 = this.createCargoCart(-14, 38, -0.2, timberMat, darkWoodMat, ironMat, sackMat);
    root.add(cart1);

    const cart2 = this.createCargoCart(14, 38, 0.25, timberMat, darkWoodMat, ironMat, sackMat);
    root.add(cart2);

    // 12. TROPICAL PALM TREES & COASTAL GREENERY (From Reference 2)
    const palmPositions = [
      { x: -20, z: 12, s: 1.1, r: 0.4 },
      { x: 20, z: 12, s: 1.2, r: -0.5 },
      { x: -21, z: 62, s: 1.0, r: 1.2 },
      { x: 21, z: 62, s: 1.15, r: -1.0 },
      { x: -18, z: -8, s: 0.9, r: 0.8 },
      { x: 18, z: -8, s: 0.95, r: -0.7 },
      { x: -44, z: 46, s: 1.25, r: 2.1 },
      { x: 44, z: 46, s: 1.2, r: -2.3 },
    ];
    palmPositions.forEach((pp) => {
      const palm = this.createTropicalPalmTree(pp.s, timberMat, foliageMat);
      palm.position.set(pp.x, 1.0, pp.z);
      palm.rotation.y = pp.r;
      root.add(palm);
    });

    // 13. TOWN PLAZA WATER FOUNTAIN (Center of town plaza Z = 52)
    const fountain = this.createPlazaFountain(stoneMat, seaMat);
    fountain.position.set(0, 1.0, 52);
    root.add(fountain);

    const fountainBox = new THREE.Box3();
    fountainBox.setFromCenterAndSize(new THREE.Vector3(0, 2.5, 52), new THREE.Vector3(5.5, 5, 5.5));
    colliders.push(fountainBox);

    // 14. ELEGANT STREET LANTERNS ALONG THE THOROUGHFARE & QUAY
    const lampPositions = [
      { x: -14, z: 16 },
      { x: 14, z: 16 },
      { x: -14, z: 38 },
      { x: 14, z: 38 },
      { x: -14, z: 60 },
      { x: 14, z: 60 },
      { x: -11, z: -4 },
      { x: 11, z: -4 },
      { x: -11, z: -32 },
      { x: 11, z: -32 },
    ];
    lampPositions.forEach((lp) => {
      const lamp = this.createStreetLantern(darkWoodMat, ironMat);
      lamp.position.set(lp.x, 1.0, lp.z);
      root.add(lamp);
    });

    // 15. MAJESTIC MOORED TALL SHIP (GALLEON / FRIGATE) AT THE WATERFRONT (Matching Reference 1 & 2)
    // Towering ship moored alongside the pier at X = -28, Z = -38 (flanking pier opposite player ship)
    const mooredShip = this.createMooredTallShip(darkWoodMat, timberMat, ropeMat, ironMat);
    mooredShip.position.set(-28, -0.4, -38);
    mooredShip.rotation.y = Math.PI * 0.05;
    root.add(mooredShip);

    return root;
  }

  // -------------------------------------------------------------------------
  // PROCEDURAL COMPONENTS DIRECTLY INSPIRED BY THE USER'S REFERENCE IMAGES
  // -------------------------------------------------------------------------

  /**
   * Creates a multi-story Colonial / Mediterranean house with balcony, shutters,
   * clay-tile pitched roof, and climbing flowering vines
   */
  private static createColonialHouse(
    spec: { x: number; z: number; w: number; h: number; d: number; hasBalcony: boolean; name: string },
    wallColor: number,
    roofColor: number,
    timberMat: THREE.Material,
    darkWoodMat: THREE.Material,
    foliageMat: THREE.Material,
    flowerMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(spec.x, 1.0, spec.z);

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.86,
      flatShading: true,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.76,
      flatShading: true,
    });

    // 1. Main House Stucco Body
    const bodyGeo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = spec.h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Authentic Terracotta Clay-Tile Pitched Roof with Overhang
    const roofOverhang = 1.4;
    const roofH = 5.5;
    const roofGeo = new THREE.ConeGeometry(Math.max(spec.w, spec.d) * 0.72 + roofOverhang, roofH, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI * 0.25;
    roof.position.y = spec.h + roofH * 0.5;
    roof.castShadow = true;
    group.add(roof);

    // Terracotta roof ridge tiles
    const ridgeGeo = new THREE.CylinderGeometry(0.35, 0.4, spec.w + 1.2, 8);
    const ridge = new THREE.Mesh(ridgeGeo, roofMat);
    ridge.rotation.z = Math.PI * 0.5;
    ridge.position.y = spec.h + roofH;
    group.add(ridge);

    // 3. Lower Level Timber Lintel & Arch Doorway
    const isFacingEast = spec.x < 0;
    const doorFacingX = isFacingEast ? spec.w * 0.5 + 0.05 : -spec.w * 0.5 - 0.05;

    const doorGeo = new THREE.BoxGeometry(0.2, 4.2, 2.6);
    const door = new THREE.Mesh(doorGeo, darkWoodMat);
    door.position.set(doorFacingX, 2.1, 0);
    group.add(door);

    // 4. Cantilevered Wooden Balcony on Upper Floor (Matching Reference 1 & 2)
    if (spec.hasBalcony) {
      const bW = 2.4;
      const bL = spec.d * 0.65;
      const bY = spec.h * 0.55;

      const deckGeo = new THREE.BoxGeometry(bW, 0.35, bL);
      const deck = new THREE.Mesh(deckGeo, timberMat);
      deck.position.set(isFacingEast ? spec.w * 0.5 + bW * 0.5 : -spec.w * 0.5 - bW * 0.5, bY, 0);
      group.add(deck);

      // Balcony Railing Posts & Balusters
      const railGeo = new THREE.BoxGeometry(0.12, 1.4, bL);
      const rail = new THREE.Mesh(railGeo, darkWoodMat);
      rail.position.set(isFacingEast ? spec.w * 0.5 + bW : -spec.w * 0.5 - bW, bY + 0.7, 0);
      group.add(rail);

      // Diagonal Support Brackets under Balcony
      [-bL * 0.35, bL * 0.35].forEach((bz) => {
        const bracketGeo = new THREE.BoxGeometry(bW * 0.9, 0.25, 0.25);
        const bracket = new THREE.Mesh(bracketGeo, timberMat);
        bracket.rotation.z = isFacingEast ? -Math.PI * 0.25 : Math.PI * 0.25;
        bracket.position.set(isFacingEast ? spec.w * 0.5 + bW * 0.4 : -spec.w * 0.5 - bW * 0.4, bY - 1.0, bz);
        group.add(bracket);
      });
    }

    // 5. Windows with Wooden Shutters
    const winYLevels = [spec.h * 0.35, spec.h * 0.72];
    winYLevels.forEach((wy) => {
      [-spec.d * 0.28, spec.d * 0.28].forEach((wz) => {
        const winGeo = new THREE.BoxGeometry(0.15, 2.0, 1.6);
        const win = new THREE.Mesh(winGeo, darkWoodMat);
        win.position.set(doorFacingX, wy, wz);
        group.add(win);

        // Open wooden shutters on sides of window
        [-0.95, 0.95].forEach((sz) => {
          const shutterGeo = new THREE.BoxGeometry(0.12, 2.0, 0.7);
          const shutter = new THREE.Mesh(shutterGeo, timberMat);
          shutter.position.set(doorFacingX + (isFacingEast ? 0.08 : -0.08), wy, wz + sz);
          group.add(shutter);
        });
      });
    });

    // 6. Climbing Flowering Bougainvillea & Ivy Vines (From Reference 2)
    const vineCornerX = isFacingEast ? spec.w * 0.5 + 0.1 : -spec.w * 0.5 - 0.1;
    const vineCornerZ = spec.d * 0.48;
    for (let v = 0; v < 6; v++) {
      const leafGeo = new THREE.DodecahedronGeometry(0.65 + (v % 2) * 0.2, 0);
      const leaf = new THREE.Mesh(leafGeo, foliageMat);
      leaf.position.set(vineCornerX, 1.2 + v * 1.8, vineCornerZ - (v % 2) * 0.3);
      group.add(leaf);

      // Bright magenta bougainvillea flower cluster
      if (v % 2 === 0) {
        const flwGeo = new THREE.DodecahedronGeometry(0.35, 0);
        const flw = new THREE.Mesh(flwGeo, flowerMat);
        flw.position.set(vineCornerX + (isFacingEast ? 0.2 : -0.2), 1.4 + v * 1.8, vineCornerZ);
        group.add(flw);
      }
    }

    return group;
  }

  /**
   * Creates thick weathered wooden mooring pilings tightly wrapped with coiled hemp rope
   * (Direct Match to Reference Image 2)
   */
  private static createMooringPiling(darkWoodMat: THREE.Material, ropeMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Weathered timber pile
    const pileGeo = new THREE.CylinderGeometry(0.55, 0.62, 3.4, 10);
    const pile = new THREE.Mesh(pileGeo, darkWoodMat);
    pile.position.y = 1.7;
    pile.castShadow = true;
    group.add(pile);

    // Beveled top chamfer
    const capGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.25, 10);
    const cap = new THREE.Mesh(capGeo, darkWoodMat);
    cap.position.y = 3.45;
    group.add(cap);

    // Concentric coiled hemp rope wraps around the post (Prominent in Reference 2!)
    const ropeWrapHeights = [1.2, 1.4, 1.6, 1.8, 2.0];
    ropeWrapHeights.forEach((ry) => {
      const ropeGeo = new THREE.TorusGeometry(0.61, 0.08, 6, 16);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.rotation.x = Math.PI * 0.5;
      rope.position.y = ry;
      group.add(rope);
    });

    // Diagonal crossing rope knot
    const knotGeo = new THREE.TorusGeometry(0.63, 0.09, 6, 16);
    const knot = new THREE.Mesh(knotGeo, ropeMat);
    knot.rotation.x = Math.PI * 0.45;
    knot.rotation.z = Math.PI * 0.2;
    knot.position.y = 1.6;
    group.add(knot);

    return group;
  }

  /**
   * Creates a market stall with striped fabric awning, wooden crates of oranges/lemons,
   * grain sacks, and barrels (Direct Match to Reference Image 1)
   */
  private static createMarketStall(
    x: number,
    z: number,
    rotY: number,
    stripeTheme: 'terracotta' | 'ochre' | 'navy' | 'olive',
    timberMat: THREE.Material,
    fruitOrangeMat: THREE.Material,
    fruitYellowMat: THREE.Material,
    sackMat: THREE.Material,
    ironMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 1.0, z);
    group.rotation.y = rotY;

    // 1. Sturdy Wooden Counter Table
    const tableGeo = new THREE.BoxGeometry(6.2, 1.8, 3.2);
    const table = new THREE.Mesh(tableGeo, timberMat);
    table.position.y = 0.9;
    table.castShadow = true;
    table.receiveShadow = true;
    group.add(table);

    // 2. Corner Timber Posts Supporting Awning
    const postH = 4.2;
    [-2.8, 2.8].forEach((px) => {
      [-1.4, 1.4].forEach((pz) => {
        const postGeo = new THREE.CylinderGeometry(0.12, 0.14, postH, 6);
        const post = new THREE.Mesh(postGeo, timberMat);
        post.position.set(px, postH * 0.5, pz);
        group.add(post);
      });
    });

    // 3. Striped Canvas Awning Canopy
    const primaryColor =
      stripeTheme === 'terracotta' ? 0xc2410c : stripeTheme === 'ochre' ? 0xd97706 : stripeTheme === 'navy' ? 0x1e3a8a : 0x15803d;
    const secondaryColor = 0xfef3c7; // Warm cream canvas stripe

    const awningW = 6.8;
    const awningD = 4.0;
    const stripes = 8;
    const stripeW = awningW / stripes;

    for (let s = 0; s < stripes; s++) {
      const isPrimary = s % 2 === 0;
      const stripeMat = new THREE.MeshStandardMaterial({
        color: isPrimary ? primaryColor : secondaryColor,
        roughness: 0.85,
      });
      const sGeo = new THREE.BoxGeometry(stripeW, 0.2, awningD);
      const sMesh = new THREE.Mesh(sGeo, stripeMat);
      sMesh.position.set(-awningW * 0.5 + stripeW * 0.5 + s * stripeW, postH, 0);
      sMesh.rotation.x = -0.15; // Sloped forward for drainage
      sMesh.castShadow = true;
      group.add(sMesh);
    }

    // 4. Crates filled with Oranges & Lemons (From Reference 1!)
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.88 });
    [-1.8, 0, 1.8].forEach((cx, idx) => {
      const cBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.2), crateMat);
      cBox.position.set(cx, 1.95, 0.2);
      group.add(cBox);

      // Piled Fruit Spheres inside crate
      for (let f = 0; f < 8; f++) {
        const fruitGeo = new THREE.SphereGeometry(0.18, 6, 6);
        const fruit = new THREE.Mesh(fruitGeo, idx % 2 === 0 ? fruitOrangeMat : fruitYellowMat);
        const fx = cx - 0.5 + (f % 3) * 0.45;
        const fz = 0.2 - 0.3 + Math.floor(f / 3) * 0.35;
        fruit.position.set(fx, 2.35, fz);
        group.add(fruit);
      }
    });

    // 5. Bulging Burlap Sacks of Grain / Spices beside Stall
    [-3.2, 3.2].forEach((sx) => {
      const sackGeo = new THREE.SphereGeometry(0.7, 8, 8);
      sackGeo.scale(1.0, 1.35, 0.85);
      const sack = new THREE.Mesh(sackGeo, sackMat);
      sack.position.set(sx, 0.7, -0.6);
      sack.castShadow = true;
      group.add(sack);
    });

    // 6. Stacked Barrels behind stall
    const barrelGeo = new THREE.CylinderGeometry(0.7, 0.78, 1.6, 8);
    const barrel = new THREE.Mesh(barrelGeo, timberMat);
    barrel.position.set(2.8, 0.8, -1.8);
    group.add(barrel);

    return group;
  }

  /**
   * Creates a wooden cargo handcart with spoked wheels (From Reference 1)
   */
  private static createCargoCart(
    x: number,
    z: number,
    rotY: number,
    timberMat: THREE.Material,
    darkWoodMat: THREE.Material,
    ironMat: THREE.Material,
    sackMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 1.0, z);
    group.rotation.y = rotY;

    // Cart Bed
    const bedGeo = new THREE.BoxGeometry(2.4, 0.35, 4.5);
    const bed = new THREE.Mesh(bedGeo, timberMat);
    bed.position.y = 1.1;
    group.add(bed);

    // Slat sides
    [-1.2, 1.2].forEach((sx) => {
      const sideGeo = new THREE.BoxGeometry(0.15, 0.8, 4.5);
      const side = new THREE.Mesh(sideGeo, timberMat);
      side.position.set(sx, 1.5, 0);
      group.add(side);
    });

    // Spoked Wooden Wheels
    [-1.35, 1.35].forEach((wx) => {
      const wheelGeo = new THREE.TorusGeometry(0.9, 0.12, 6, 16);
      const wheel = new THREE.Mesh(wheelGeo, darkWoodMat);
      wheel.rotation.y = Math.PI * 0.5;
      wheel.position.set(wx, 0.9, 0);
      group.add(wheel);

      // Hub
      const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
      const hub = new THREE.Mesh(hubGeo, ironMat);
      hub.rotation.z = Math.PI * 0.5;
      hub.position.set(wx, 0.9, 0);
      group.add(hub);
    });

    // Cart Cargo (sacks and small barrels)
    for (let c = 0; c < 3; c++) {
      const sGeo = new THREE.SphereGeometry(0.55, 6, 6);
      sGeo.scale(1.0, 1.3, 0.9);
      const s = new THREE.Mesh(sGeo, sackMat);
      s.position.set(0, 1.6, -1.2 + c * 1.2);
      group.add(s);
    }

    return group;
  }

  /**
   * Creates an authentic tropical palm tree with curved trunk and broad palm fronds
   */
  private static createTropicalPalmTree(scale: number, timberMat: THREE.Material, foliageMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    group.scale.set(scale, scale, scale);

    // Segmented Curved Trunk
    const trunkSegments = 9;
    let currentY = 0;
    let currentCurveX = 0;

    for (let i = 0; i < trunkSegments; i++) {
      const segH = 1.1;
      const rBot = 0.5 - i * 0.025;
      const rTop = 0.46 - i * 0.025;
      const segGeo = new THREE.CylinderGeometry(rTop, rBot, segH, 8);
      const seg = new THREE.Mesh(segGeo, timberMat);
      seg.position.set(currentCurveX, currentY + segH * 0.5, 0);
      seg.rotation.z = -0.06;
      group.add(seg);

      currentY += segH * 0.95;
      currentCurveX += 0.22;
    }

    // Crown of Arching Palm Fronds
    const frondCount = 10;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondGeo = new THREE.ConeGeometry(1.4, 6.5, 4);
      frondGeo.scale(0.3, 1.0, 1.0);
      const frond = new THREE.Mesh(frondGeo, foliageMat);
      frond.position.set(currentCurveX, currentY, 0);
      frond.rotation.y = angle;
      frond.rotation.z = 1.15; // Arch downward
      group.add(frond);
    }

    return group;
  }

  /**
   * Creates an ornate town square fountain
   */
  private static createPlazaFountain(stoneMat: THREE.Material, waterMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Outer Basin
    const basinGeo = new THREE.CylinderGeometry(3.6, 4.0, 1.4, 12);
    const basin = new THREE.Mesh(basinGeo, stoneMat);
    basin.position.y = 0.7;
    basin.castShadow = true;
    group.add(basin);

    // Water Surface
    const waterGeo = new THREE.CircleGeometry(3.3, 16);
    waterGeo.rotateX(-Math.PI * 0.5);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 1.35;
    group.add(water);

    // Center Pedestal
    const pedGeo = new THREE.CylinderGeometry(0.8, 1.1, 2.8, 8);
    const ped = new THREE.Mesh(pedGeo, stoneMat);
    ped.position.y = 1.8;
    group.add(ped);

    // Upper Tier Basin
    const upperGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.7, 10);
    const upper = new THREE.Mesh(upperGeo, stoneMat);
    upper.position.y = 3.2;
    group.add(upper);

    return group;
  }

  /**
   * Creates an authentic street lantern post
   */
  private static createStreetLantern(darkWoodMat: THREE.Material, ironMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Timber post
    const postGeo = new THREE.CylinderGeometry(0.2, 0.25, 5.5, 8);
    const post = new THREE.Mesh(postGeo, darkWoodMat);
    post.position.y = 2.75;
    post.castShadow = true;
    group.add(post);

    // Iron crossarm
    const armGeo = new THREE.BoxGeometry(1.6, 0.15, 0.15);
    const arm = new THREE.Mesh(armGeo, ironMat);
    arm.position.y = 5.2;
    group.add(arm);

    // Hanging Glass Lantern
    const lanternGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.65, 6);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0.6, 4.65, 0);
    group.add(lantern);

    // Warm Point Light
    const light = new THREE.PointLight(0xfef08a, 1.2, 18);
    light.position.set(0.6, 4.65, 0);
    group.add(light);

    return group;
  }

  /**
   * Creates a magnificent tall ship (galleon/frigate) moored at the pier edge,
   * framing the waterfront view exactly as seen in Reference Images 1 & 2
   */
  private static createMooredTallShip(
    hullWoodMat: THREE.Material,
    deckWoodMat: THREE.Material,
    riggingMat: THREE.Material,
    ironMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'moored-tall-ship';

    const canvasSailMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });

    // 1. Ship Hull
    const hullLength = 48;
    const hullWidth = 14;
    const hullHeight = 11;

    const hullGeo = new THREE.BoxGeometry(hullWidth, hullHeight, hullLength);
    // Narrow bow and stern
    const posAttr = hullGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      const y = posAttr.getY(i);
      if (z > hullLength * 0.3) {
        // Taper bow
        const t = (z - hullLength * 0.3) / (hullLength * 0.2);
        posAttr.setX(i, posAttr.getX(i) * (1.0 - t * 0.55));
      } else if (z < -hullLength * 0.35) {
        // Broaden quarterdeck
        posAttr.setY(i, posAttr.getY(i) + 2.0);
      }
      if (y < 0) {
        // V-bottom keel taper
        posAttr.setX(i, posAttr.getX(i) * 0.65);
      }
    }
    hullGeo.computeVertexNormals();

    const hull = new THREE.Mesh(hullGeo, hullWoodMat);
    hull.position.y = hullHeight * 0.4;
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    // 2. White Waterline & Black Gunport Strake
    const strakeGeo = new THREE.BoxGeometry(hullWidth + 0.3, 1.8, hullLength + 0.2);
    const strakeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });
    const strake = new THREE.Mesh(strakeGeo, strakeMat);
    strake.position.y = hullHeight * 0.55;
    group.add(strake);

    // 3. Gunports (lids open with cannon barrels)
    for (let g = 0; g < 7; g++) {
      const gz = -14 + g * 4.5;
      [-hullWidth * 0.5 - 0.2, hullWidth * 0.5 + 0.2].forEach((gx) => {
        const portGeo = new THREE.BoxGeometry(0.35, 0.9, 0.9);
        const port = new THREE.Mesh(portGeo, ironMat);
        port.position.set(gx, hullHeight * 0.55, gz);
        group.add(port);
      });
    }

    // 4. Bowsprit Spar
    const bowspritGeo = new THREE.CylinderGeometry(0.3, 0.45, 18, 8);
    const bowsprit = new THREE.Mesh(bowspritGeo, deckWoodMat);
    bowsprit.rotation.x = Math.PI * 0.38;
    bowsprit.position.set(0, hullHeight * 0.75, hullLength * 0.5 + 6.5);
    group.add(bowsprit);

    // 5. Three Towering Masts: Foremast, Mainmast, Mizzenmast (With Spars & Furled Sails)
    const masts = [
      { z: 10, h: 36, r: 0.55 }, // Foremast
      { z: -2, h: 42, r: 0.65 }, // Mainmast
      { z: -14, h: 30, r: 0.45 }, // Mizzenmast
    ];

    masts.forEach((m) => {
      // Mast Column
      const mastGeo = new THREE.CylinderGeometry(m.r * 0.6, m.r, m.h, 10);
      const mast = new THREE.Mesh(mastGeo, deckWoodMat);
      mast.position.set(0, hullHeight * 0.7 + m.h * 0.5, m.z);
      group.add(mast);

      // Crow's Nest / Fighting Top
      const topGeo = new THREE.CylinderGeometry(2.0, 1.6, 1.2, 8);
      const top = new THREE.Mesh(topGeo, hullWoodMat);
      top.position.set(0, hullHeight * 0.7 + m.h * 0.6, m.z);
      group.add(top);

      // Yardarms & Furled Cream Sails (3 tiers per mast)
      const yardTiers = [0.4, 0.65, 0.88];
      yardTiers.forEach((yt) => {
        const yardW = (1.0 - yt * 0.35) * 20;
        const yardGeo = new THREE.CylinderGeometry(0.18, 0.22, yardW, 6);
        const yard = new THREE.Mesh(yardGeo, deckWoodMat);
        yard.rotation.z = Math.PI * 0.5;
        const yy = hullHeight * 0.7 + m.h * yt;
        yard.position.set(0, yy, m.z);
        group.add(yard);

        // Furled Canvas Sail Bundle under the Yard
        const sailGeo = new THREE.CylinderGeometry(0.45, 0.45, yardW * 0.92, 6);
        const sail = new THREE.Mesh(sailGeo, canvasSailMat);
        sail.rotation.z = Math.PI * 0.5;
        sail.position.set(0, yy - 0.45, m.z);
        group.add(sail);
      });

      // Standing Rigging Shrouds & Ratlines (Pyramidal ropes to hull edges)
      [-hullWidth * 0.48, hullWidth * 0.48].forEach((rx) => {
        const shroudGeo = new THREE.CylinderGeometry(0.04, 0.04, m.h * 0.65, 4);
        const shroud = new THREE.Mesh(shroudGeo, riggingMat);
        shroud.position.set(rx * 0.5, hullHeight * 0.7 + m.h * 0.32, m.z);
        shroud.rotation.z = rx > 0 ? -0.18 : 0.18;
        group.add(shroud);
      });
    });

    // 6. Royal / Maritime Ensign Flag at Stern
    const flagGeo = new THREE.PlaneGeometry(3.5, 2.2);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      side: THREE.DoubleSide,
      roughness: 0.6,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0, hullHeight * 0.85 + 4, -hullLength * 0.48);
    flag.rotation.y = Math.PI * 0.35;
    group.add(flag);

    return group;
  }
}
