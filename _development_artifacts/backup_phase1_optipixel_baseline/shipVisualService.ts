/**
 * Realm of Crowns - 3D Procedural Ship Visual Service (Three.js)
 * Ported and enhanced from Corsairs / Sea Dogs II architecture.
 * Procedurally generates 17th century tall ships, galleons, sloops, and pirate corsairs:
 * hull tumblehome, decks, masts, billowing sails, gun ports, cannons, rigging, and flags.
 */

import * as THREE from 'three';

export interface ShipSpec {
  id: string;
  name: string;
  rank: number;
  hullMax: number;
  sailsMax: number;
  crewMax: number;
  cannons: number;
  baseSpeed: number;
  turnRate: number;
  masts: number;
  tiers: number;
  castle: number;
  length: number;
  beam: number;
  hasOars?: boolean;
  figurehead?: 'dragon' | 'mermaid' | 'skull';
  isJunk?: boolean;
  livery: {
    hull: number;
    upper: number;
    deck: number;
    trim: number;
    sail: number;
    flag: number;
  };
}

export const SHIP_CATALOG: Record<string, ShipSpec> = {
  tartane: {
    id: 'tartane',
    name: 'Coastal Tartane',
    rank: 7,
    hullMax: 250,
    sailsMax: 100,
    crewMax: 15,
    cannons: 4,
    baseSpeed: 11.0,
    turnRate: 30.0,
    masts: 1,
    tiers: 1,
    castle: 0,
    length: 12.0,
    beam: 4.0,
    livery: {
      hull: 0x5c3d2e,
      upper: 0x784f36,
      deck: 0xba9e74,
      trim: 0xd97706,
      sail: 0xfaf5eb,
      flag: 0x0284c7,
    },
  },
  lugger: {
    id: 'lugger',
    name: 'Swift Lugger',
    rank: 7,
    hullMax: 450,
    sailsMax: 150,
    crewMax: 40,
    cannons: 8,
    baseSpeed: 12.5,
    turnRate: 28.0,
    masts: 1,
    tiers: 2,
    castle: 0,
    length: 15.0,
    beam: 4.8,
    livery: {
      hull: 0x47301c,
      upper: 0x614328,
      deck: 0xb5996b,
      trim: 0xb45309,
      sail: 0xf5eee1,
      flag: 0x0369a1,
    },
  },
  sloop: {
    id: 'sloop',
    name: 'Coastal Sloop',
    rank: 6,
    hullMax: 700,
    sailsMax: 200,
    crewMax: 70,
    cannons: 12,
    baseSpeed: 13.0,
    turnRate: 26.0,
    masts: 1,
    tiers: 2,
    castle: 0,
    length: 18.0,
    beam: 5.5,
    livery: {
      hull: 0x4a3219,
      upper: 0x6e4e2a,
      deck: 0xb59a6c,
      trim: 0xd4af37,
      sail: 0xf5f0e1,
      flag: 0x1e3a8a,
    },
  },
  schooner: {
    id: 'schooner',
    name: 'War Schooner',
    rank: 6,
    hullMax: 850,
    sailsMax: 240,
    crewMax: 90,
    cannons: 16,
    baseSpeed: 13.5,
    turnRate: 24.0,
    masts: 2,
    tiers: 2,
    castle: 0,
    length: 22.0,
    beam: 6.2,
    livery: {
      hull: 0x3b2512,
      upper: 0x54371b,
      deck: 0xae9060,
      trim: 0xf59e0b,
      sail: 0xf8fafc,
      flag: 0x1d4ed8,
    },
  },
  barque: {
    id: 'barque',
    name: 'Trade Barque',
    rank: 5,
    hullMax: 1100,
    sailsMax: 300,
    crewMax: 110,
    cannons: 20,
    baseSpeed: 11.5,
    turnRate: 20.0,
    masts: 3,
    tiers: 2,
    castle: 1,
    length: 24.0,
    beam: 7.0,
    livery: {
      hull: 0x331f0f,
      upper: 0x4d3219,
      deck: 0xa88a59,
      trim: 0xd97706,
      sail: 0xeee8d9,
      flag: 0x2563eb,
    },
  },
  brig: {
    id: 'brig',
    name: 'War Brig',
    rank: 5,
    hullMax: 1400,
    sailsMax: 350,
    crewMax: 150,
    cannons: 24,
    baseSpeed: 12.0,
    turnRate: 19.0,
    masts: 2,
    tiers: 3,
    castle: 1,
    length: 26.0,
    beam: 7.5,
    livery: {
      hull: 0x24180d,
      upper: 0x3d2b18,
      deck: 0xaa8c5e,
      trim: 0xc49b38,
      sail: 0xeae3d2,
      flag: 0x1d4ed8,
    },
  },
  galleon: {
    id: 'galleon',
    name: 'Royal Galleon',
    rank: 4,
    hullMax: 2200,
    sailsMax: 450,
    crewMax: 250,
    cannons: 36,
    baseSpeed: 10.5,
    turnRate: 14.0,
    masts: 3,
    tiers: 3,
    castle: 2,
    figurehead: 'mermaid',
    length: 34.0,
    beam: 9.5,
    livery: {
      hull: 0x1b140e,
      upper: 0x5b2222,
      deck: 0x9c7f53,
      trim: 0xeab308,
      sail: 0xf3ede0,
      flag: 0xd97706,
    },
  },
  corvette: {
    id: 'corvette',
    name: 'Naval Corvette',
    rank: 3,
    hullMax: 2000,
    sailsMax: 480,
    crewMax: 280,
    cannons: 40,
    baseSpeed: 12.8,
    turnRate: 17.0,
    masts: 3,
    tiers: 3,
    castle: 1,
    figurehead: 'mermaid',
    length: 32.0,
    beam: 8.5,
    livery: {
      hull: 0x18181b,
      upper: 0x27272a,
      deck: 0xa18256,
      trim: 0xf59e0b,
      sail: 0xffffff,
      flag: 0x3b82f6,
    },
  },
  frigate: {
    id: 'frigate',
    name: 'Heavy Frigate',
    rank: 2,
    hullMax: 3200,
    sailsMax: 600,
    crewMax: 400,
    cannons: 48,
    baseSpeed: 12.2,
    turnRate: 15.0,
    masts: 3,
    tiers: 3,
    castle: 1,
    figurehead: 'mermaid',
    length: 40.0,
    beam: 10.5,
    livery: {
      hull: 0x1e293b,
      upper: 0x0f172a,
      deck: 0x856b46,
      trim: 0xf59e0b,
      sail: 0xf8fafc,
      flag: 0x2563eb,
    },
  },
  pirate_corsair: {
    id: 'pirate_corsair',
    name: 'Black Skull Corsair',
    rank: 3,
    hullMax: 2600,
    sailsMax: 500,
    crewMax: 320,
    cannons: 40,
    baseSpeed: 12.8,
    turnRate: 17.5,
    masts: 3,
    tiers: 3,
    castle: 1,
    figurehead: 'skull',
    length: 36.0,
    beam: 9.0,
    livery: {
      hull: 0x0f0b08,
      upper: 0x2a0d0d,
      deck: 0x544332,
      trim: 0xb91c1c,
      sail: 0x1e1e1e,
      flag: 0x991b1b,
    },
  },
  dragon_junk: {
    id: 'dragon_junk',
    name: 'Dragon War Junk',
    rank: 2,
    hullMax: 3500,
    sailsMax: 650,
    crewMax: 450,
    cannons: 44,
    baseSpeed: 12.0,
    turnRate: 17.0,
    masts: 3,
    tiers: 3,
    castle: 2,
    hasOars: true,
    figurehead: 'dragon',
    isJunk: true,
    length: 42.0,
    beam: 11.0,
    livery: {
      hull: 0x3b1d11,
      upper: 0x7c2d12,
      deck: 0xc29b62,
      trim: 0xd97706,
      sail: 0x991b1b,
      flag: 0xd97706,
    },
  },
  treasure_junk: {
    id: 'treasure_junk',
    name: 'Imperial Treasure Junk',
    rank: 1,
    hullMax: 5000,
    sailsMax: 800,
    crewMax: 600,
    cannons: 56,
    baseSpeed: 10.8,
    turnRate: 11.5,
    masts: 4,
    tiers: 3,
    castle: 3,
    hasOars: true,
    figurehead: 'dragon',
    isJunk: true,
    length: 50.0,
    beam: 13.5,
    livery: {
      hull: 0x27170e,
      upper: 0x991b1b,
      deck: 0xd4a373,
      trim: 0xf59e0b,
      sail: 0x7c2d12,
      flag: 0xd97706,
    },
  },
  galleass: {
    id: 'galleass',
    name: 'Venetian War Galleass',
    rank: 2,
    hullMax: 3300,
    sailsMax: 550,
    crewMax: 500,
    cannons: 46,
    baseSpeed: 12.5,
    turnRate: 18.0,
    masts: 3,
    tiers: 2,
    castle: 2,
    hasOars: true,
    figurehead: 'mermaid',
    length: 44.0,
    beam: 10.0,
    livery: {
      hull: 0x1e293b,
      upper: 0x831843,
      deck: 0xb5996b,
      trim: 0xf59e0b,
      sail: 0xfaf5eb,
      flag: 0xd97706,
    },
  },
  battleship: {
    id: 'battleship',
    name: 'Ship of the Line',
    rank: 1,
    hullMax: 4200,
    sailsMax: 750,
    crewMax: 550,
    cannons: 64,
    baseSpeed: 10.5,
    turnRate: 11.0,
    masts: 3,
    tiers: 4,
    castle: 2,
    length: 44.0,
    beam: 11.5,
    livery: {
      hull: 0x131722,
      upper: 0x1e293b,
      deck: 0x8c7047,
      trim: 0xeab308,
      sail: 0xf5f3ea,
      flag: 0x1d4ed8,
    },
  },
  manowar: {
    id: 'manowar',
    name: 'Sovereign Man-of-War',
    rank: 1,
    hullMax: 5500,
    sailsMax: 900,
    crewMax: 700,
    cannons: 92,
    baseSpeed: 9.8,
    turnRate: 9.5,
    masts: 3,
    tiers: 4,
    castle: 2,
    length: 48.0,
    beam: 12.5,
    livery: {
      hull: 0x17120e,
      upper: 0x134e4a,
      deck: 0x93764d,
      trim: 0xfacc15,
      sail: 0xf1efe7,
      flag: 0x0284c7,
    },
  },
};

import { FactionId, SailHeraldryService } from './SailHeraldryService';

export class ShipVisualService {
  private static materialCache: Map<string, THREE.Material> = new Map();
  private static geometryCache: Map<string, THREE.BufferGeometry> = new Map();

  private static getCachedMaterial<T extends THREE.Material>(key: string, factory: () => T): T {
    if (!this.materialCache.has(key)) {
      this.materialCache.set(key, factory());
    }
    return this.materialCache.get(key) as T;
  }

  public static getShipMaterials(spec: ShipSpec, isPirate: boolean, faction: FactionId) {
    const keyPrefix = `${faction}_${isPirate ? 'pirate' : 'reg'}`;
    const woodPlankDark = SailHeraldryService.getWoodPlankTexture(true);
    const woodPlankDeck = SailHeraldryService.getWoodPlankTexture(false);

    const hullMat = this.getCachedMaterial(`${keyPrefix}_hull`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0x33261d : 0x8b5a36,
      map: woodPlankDark,
      roughness: 0.78,
      metalness: 0.05,
    }));
    const upperMat = this.getCachedMaterial(`${keyPrefix}_upper`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0x450a0a : 0x854d27,
      map: woodPlankDark,
      roughness: 0.72,
    }));
    const deckMat = this.getCachedMaterial(`${keyPrefix}_deck`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0x5a4837 : 0xd4a373,
      map: woodPlankDeck,
      roughness: 0.85,
    }));
    const trimMat = this.getCachedMaterial(`${keyPrefix}_trim`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0xdc2626 : 0xf59e0b,
      roughness: 0.35,
      metalness: 0.75,
    }));
    const mastMat = this.getCachedMaterial('shared_mast', () => new THREE.MeshStandardMaterial({
      color: 0x4a321f,
      roughness: 0.88,
    }));
    const ropeMat = this.getCachedMaterial('shared_rope', () => new THREE.MeshBasicMaterial({
      color: 0x1c1917,
    }));
    const mainSailMat = this.getCachedMaterial(`${keyPrefix}_mainSail`, () => new THREE.MeshStandardMaterial({
      map: SailHeraldryService.getSailTexture(faction, true),
      roughness: 0.92,
      side: THREE.DoubleSide,
    }));
    const topSailMat = this.getCachedMaterial(`${keyPrefix}_topSail`, () => new THREE.MeshStandardMaterial({
      map: SailHeraldryService.getSailTexture(faction, false),
      roughness: 0.92,
      side: THREE.DoubleSide,
    }));
    const cannonMat = this.getCachedMaterial('shared_cannon', () => new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.88,
    }));
    const windowMat = this.getCachedMaterial('shared_window', () => new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.4,
    }));
    const copperMat = this.getCachedMaterial(`${keyPrefix}_copper`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0x14100d : 0x0891b2,
      roughness: 0.65,
      metalness: 0.32,
    }));
    const bootStripeMat = this.getCachedMaterial(`${keyPrefix}_bootStripe`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0x991b1b : 0xf8fafc,
      roughness: 0.45,
    }));
    const portLidMat = this.getCachedMaterial(`${keyPrefix}_portLid`, () => new THREE.MeshStandardMaterial({
      color: isPirate ? 0x7f1d1d : 0x991b1b,
      roughness: 0.65,
    }));
    const flagTexture = SailHeraldryService.getFlagTexture(faction);
    const flagMat = this.getCachedMaterial(`${keyPrefix}_flag`, () => new THREE.MeshStandardMaterial({
      map: flagTexture,
      side: THREE.DoubleSide,
      roughness: 0.88,
    }));

    return {
      hullMat,
      upperMat,
      deckMat,
      trimMat,
      mastMat,
      ropeMat,
      mainSailMat,
      topSailMat,
      cannonMat,
      windowMat,
      copperMat,
      bootStripeMat,
      portLidMat,
      flagMat,
    };
  }

  /**
   * Builds LOD0 (100% full-detail visual quality: carved stern gallery, leaded windows, brass cannons, authentic rigging)
   */
  public static createShipMeshLOD0(spec: ShipSpec, isPirate = false, factionOverride?: FactionId): THREE.Group {
    const shipGroup = new THREE.Group();
    shipGroup.name = `ship-${spec.id}-lod0`;

    const faction: FactionId = isPirate ? 'pirates' : (factionOverride || (spec.livery.flag === 0xd97706 ? 'spain' : 'sovereign'));
    const { length, beam, masts, tiers, castle } = spec;

    const mats = this.getShipMaterials(spec, isPirate, faction);
    const {
      hullMat,
      upperMat,
      deckMat,
      trimMat,
      mastMat,
      ropeMat,
      mainSailMat,
      topSailMat,
      cannonMat,
      windowMat,
      copperMat,
      bootStripeMat,
      portLidMat,
      flagMat,
    } = mats;

    // 1. Hull Base (Curved box / wedge geometry)
    const hullGroup = new THREE.Group();
    hullGroup.name = 'hull';

    const halfLen = length * 0.5;
    const halfBeam = beam * 0.5;
    const hullHeight = beam * 0.6;

    // Main bottom hull shape
    const mainHullGeo = new THREE.BoxGeometry(beam, hullHeight, length * 0.7);
    const mainHull = new THREE.Mesh(mainHullGeo, hullMat);
    mainHull.position.y = hullHeight * 0.4;
    mainHull.castShadow = true;
    mainHull.receiveShadow = true;
    hullGroup.add(mainHull);

    // Copper / Verdigris Waterline lower keel (Image 3 blueprint: turquoise copper bottom)
    const keelGeo = new THREE.BoxGeometry(beam * 0.94, hullHeight * 0.42, length * 0.74);
    const keel = new THREE.Mesh(keelGeo, copperMat);
    keel.position.y = hullHeight * 0.14;
    keel.castShadow = true;
    hullGroup.add(keel);

    // Waterline Boot-Topping Stripe (Image 3)
    const bootStripeGeo = new THREE.BoxGeometry(beam * 0.96, 0.32, length * 0.76);
    const bootStripe = new THREE.Mesh(bootStripeGeo, bootStripeMat);
    bootStripe.position.y = hullHeight * 0.35;
    hullGroup.add(bootStripe);

    // Bow Cathead Beams & Iron Fluke Anchors (Image 3 blueprint)
    for (let side = -1; side <= 1; side += 2) {
      const catheadGeo = new THREE.BoxGeometry(0.35, 0.35, 2.6);
      catheadGeo.rotateY(side * 0.48);
      const cathead = new THREE.Mesh(catheadGeo, mastMat);
      cathead.position.set(side * (halfBeam * 0.82), hullHeight * 0.78, halfLen * 0.66);
      hullGroup.add(cathead);

      const anchor = this.createIronAnchor();
      anchor.position.set(side * (halfBeam * 0.94), hullHeight * 0.42, halfLen * 0.64);
      anchor.rotation.y = side * 0.35;
      hullGroup.add(anchor);
    }

    // Bow (Pointed taper at the front)
    const bowGeo = new THREE.ConeGeometry(halfBeam * 1.3, length * 0.35, 4);
    bowGeo.rotateX(Math.PI * 0.5);
    const bow = new THREE.Mesh(bowGeo, upperMat);
    bow.position.set(0, hullHeight * 0.45, halfLen * 0.72);
    bow.scale.set(1.0, 0.75, 1.0);
    bow.castShadow = true;
    hullGroup.add(bow);

    // Bowsprit spar & figurehead
    const bowspritGeo = new THREE.CylinderGeometry(0.2, 0.4, length * 0.38, 6);
    bowspritGeo.rotateX(Math.PI * 0.35);
    const bowsprit = new THREE.Mesh(bowspritGeo, mastMat);
    bowsprit.position.set(0, hullHeight * 0.85, halfLen * 0.9);
    hullGroup.add(bowsprit);

    // Figurehead: Dragon, Mermaid, or Skull Ram
    const figureheadType = spec.figurehead || (isPirate ? 'skull' : (faction === 'dragon' ? 'dragon' : undefined));
    if (figureheadType) {
      let figureheadMesh: THREE.Group | undefined;
      if (figureheadType === 'dragon') {
        figureheadMesh = this.createDragonFigurehead(beam);
      } else if (figureheadType === 'mermaid') {
        figureheadMesh = this.createMermaidFigurehead(beam);
      } else if (figureheadType === 'skull') {
        figureheadMesh = this.createSkullRamFigurehead(beam, isPirate);
      }

      if (figureheadMesh) {
        figureheadMesh.position.set(0, hullHeight * 0.72, halfLen * 0.90);
        hullGroup.add(figureheadMesh);
      }
    }

    // Stern Transom & Quarterdeck castle (Tapered tumblehome upper deck)
    const sternHeight = hullHeight * (1 + castle * 0.38);
    const sternDepth = length * 0.28;
    const sternCenterZ = -halfLen * 0.68;
    const sternGeo = new THREE.BoxGeometry(beam * 0.88, sternHeight, sternDepth);
    const stern = new THREE.Mesh(sternGeo, upperMat);
    stern.position.set(0, hullHeight * 0.4 + (sternHeight - hullHeight) * 0.5, sternCenterZ);
    stern.castShadow = true;
    hullGroup.add(stern);

    // Exact rear face of the stern transom facing the camera (-Z)
    const rearFaceZ = sternCenterZ - sternDepth * 0.5;
    const sternZ = rearFaceZ - 0.06;
    const galleryY = hullHeight * 0.52 + castle * 0.95;
    const windowCols = Math.min(5, Math.max(3, Math.floor(beam * 0.6)));
    const winWidth = (beam * 0.68) / windowCols;

    // Transom Gold Molding Header & Base
    const moldUpperGeo = new THREE.BoxGeometry(beam * 0.84, 0.45, 0.25);
    const moldUpper = new THREE.Mesh(moldUpperGeo, trimMat);
    moldUpper.position.set(0, galleryY + 1.25, sternZ);
    hullGroup.add(moldUpper);

    const moldLowerGeo = new THREE.BoxGeometry(beam * 0.86, 0.45, 0.25);
    const moldLower = new THREE.Mesh(moldLowerGeo, trimMat);
    moldLower.position.set(0, galleryY - 1.25, sternZ);
    hullGroup.add(moldLower);

    for (let w = 0; w < windowCols; w++) {
      const wx = -beam * 0.34 + (w + 0.5) * winWidth;
      const winGeo = new THREE.PlaneGeometry(winWidth * 0.68, 2.0);
      const winMesh = new THREE.Mesh(winGeo, windowMat);
      winMesh.position.set(wx, galleryY, sternZ - 0.04);
      winMesh.rotation.y = Math.PI; // Face aft toward camera
      hullGroup.add(winMesh);

      // Carved gold pilaster between windows
      const pilasterGeo = new THREE.BoxGeometry(0.24, 2.3, 0.22);
      const pilaster = new THREE.Mesh(pilasterGeo, trimMat);
      pilaster.position.set(wx + winWidth * 0.42, galleryY, sternZ);
      hullGroup.add(pilaster);
    }

    // Tiered Chinese Pagoda Sterncastle (Asian War Junks & Treasure Ships)
    if (spec.isJunk) {
      const pagodaMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
      const pagodaTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.75 });
      const lanternSilkMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0xf97316),
        emissiveIntensity: 0.85,
        roughness: 0.3,
      });

      const tiersCount = spec.castle || 2;
      for (let t = 0; t < tiersCount; t++) {
        const tierY = galleryY + 2.2 + t * 2.2;
        const tierWidth = (beam * 0.95) * (1 - t * 0.12);
        const tierDepth = (sternDepth * 0.9) * (1 - t * 0.12);

        // Tier pavilion structure
        const tierBodyGeo = new THREE.BoxGeometry(tierWidth * 0.8, 1.8, tierDepth * 0.8);
        const tierBody = new THREE.Mesh(tierBodyGeo, upperMat);
        tierBody.position.set(0, tierY, sternCenterZ);
        hullGroup.add(tierBody);

        // Flared Pagoda Eaves
        const eaveGeo = new THREE.ConeGeometry(tierWidth * 0.72, 1.1, 4);
        eaveGeo.rotateY(Math.PI * 0.25);
        const eave = new THREE.Mesh(eaveGeo, pagodaMat);
        eave.position.set(0, tierY + 1.2, sternCenterZ);
        eave.scale.set(1.3, 0.6, 1.3);
        hullGroup.add(eave);

        if (t === tiersCount - 1) {
          const finialGeo = new THREE.CylinderGeometry(0.1, 0.3, 1.4, 6);
          const finial = new THREE.Mesh(finialGeo, pagodaTrimMat);
          finial.position.set(0, tierY + 2.0, sternCenterZ);
          hullGroup.add(finial);
        }

        // Hanging Red Silk Lanterns
        for (let c = -1; c <= 1; c += 2) {
          const lGeo = new THREE.SphereGeometry(0.35, 8, 8);
          lGeo.scale(0.8, 1.2, 0.8);
          const lMesh = new THREE.Mesh(lGeo, lanternSilkMat);
          lMesh.position.set(c * (tierWidth * 0.52), tierY + 0.6, sternCenterZ - tierDepth * 0.45);
          hullGroup.add(lMesh);
        }
      }
    }

    // Quarterdeck Stern Balustrade Railing
    const railGeo = new THREE.BoxGeometry(beam * 0.82, 0.35, 0.25);
    const rail = new THREE.Mesh(railGeo, trimMat);
    rail.position.set(0, galleryY + 2.5, sternZ + 0.3);
    hullGroup.add(rail);

    // Stern Balcony Lantern (Ornate Gilded Bronze)
    const lanternGeo = new THREE.CylinderGeometry(0.38, 0.55, 1.6, 6);
    const lantern = new THREE.Mesh(lanternGeo, trimMat);
    lantern.position.set(0, galleryY + 2.0, sternZ - 0.7);
    hullGroup.add(lantern);

    const sternLight = new THREE.PointLight(isPirate ? 0xef4444 : 0xf59e0b, 2.4, 40);
    sternLight.position.set(0, galleryY + 2.0, sternZ - 0.9);
    hullGroup.add(sternLight);

    // Ship's Steering Helm Wheel on Quarterdeck
    const helmX = 0;
    const helmY = hullHeight * 0.8 + castle * 0.95;
    const helmZ = sternCenterZ + sternDepth * 0.3;
    const helmPostGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.8, 6);
    const helmPost = new THREE.Mesh(helmPostGeo, mastMat);
    helmPost.position.set(helmX, helmY + 0.9, helmZ);
    hullGroup.add(helmPost);

    const wheelGeo = new THREE.TorusGeometry(0.65, 0.07, 6, 12);
    const wheelMesh = new THREE.Mesh(wheelGeo, trimMat);
    wheelMesh.position.set(helmX, helmY + 1.8, helmZ);
    hullGroup.add(wheelMesh);

    // Sweep Oars for Galleasses and War Junks
    const oarsNodes: THREE.Group[] = [];
    if (spec.hasOars) {
      const oarCountPerSide = Math.min(10, Math.max(5, Math.floor(length * 0.2)));
      const oarSpacing = (length * 0.52) / (oarCountPerSide + 1);
      const oarWoodMat = new THREE.MeshStandardMaterial({ color: 0x54371b, roughness: 0.85 });

      for (let side = -1; side <= 1; side += 2) {
        for (let o = 1; o <= oarCountPerSide; o++) {
          const oarZ = -halfLen * 0.32 + o * oarSpacing;
          const oarPivot = new THREE.Group();
          oarPivot.position.set(side * (halfBeam * 0.94), hullHeight * 0.42, oarZ);

          const oarLength = beam * 0.95;
          const shaftGeo = new THREE.CylinderGeometry(0.08, 0.12, oarLength, 6);
          shaftGeo.rotateZ(side * 0.45);
          const shaftMesh = new THREE.Mesh(shaftGeo, oarWoodMat);
          shaftMesh.position.set(side * (oarLength * 0.4), -oarLength * 0.18, 0);
          oarPivot.add(shaftMesh);

          const bladeGeo = new THREE.BoxGeometry(0.35, 0.05, 0.85);
          const bladeMesh = new THREE.Mesh(bladeGeo, oarWoodMat);
          bladeMesh.position.set(side * (oarLength * 0.82), -oarLength * 0.38, 0);
          oarPivot.add(bladeMesh);

          hullGroup.add(oarPivot);
          oarsNodes.push(oarPivot);
        }
      }
    }

    // Decorative Gold Trim & Gun Deck Wales
    const waleGeo = new THREE.BoxGeometry(beam * 1.03, 0.45, length * 0.8);
    const wale = new THREE.Mesh(waleGeo, trimMat);
    wale.position.set(0, hullHeight * 0.65, 0);
    hullGroup.add(wale);

    // Main Deck Planking
    const deckGeo = new THREE.BoxGeometry(beam * 0.88, 0.25, length * 0.85);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, hullHeight * 0.78, 0);
    deck.receiveShadow = true;
    hullGroup.add(deck);

    // Side Cannon Ports & Barrels with Hinged Port Lids (Image 3)
    const gunPortsPerSide = Math.min(8, Math.floor(spec.cannons / 2));
    const gunSpacing = (length * 0.55) / (gunPortsPerSide + 1);

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i <= gunPortsPerSide; i++) {
        const zPos = -halfLen * 0.3 + i * gunSpacing;
        const xPos = side * (halfBeam * 0.98);

        // Recessed Port Framing & Open Hinged Lid
        const lidGeo = new THREE.BoxGeometry(0.08, 0.65, 0.65);
        const lid = new THREE.Mesh(lidGeo, portLidMat);
        lid.position.set(xPos + side * 0.08, hullHeight * 0.65 + 0.42, zPos);
        lid.rotation.z = side * 0.55; // Angled open upward
        hullGroup.add(lid);

        // Heavy Iron Cannon Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6);
        barrelGeo.rotateZ(side * Math.PI * 0.5);
        const barrel = new THREE.Mesh(barrelGeo, cannonMat);
        barrel.position.set(xPos + side * 0.2, hullHeight * 0.65, zPos);
        hullGroup.add(barrel);
      }
    }

    shipGroup.add(hullGroup);

    // 2. Masts, Billowing Sails & Rigging
    const mastGroup = new THREE.Group();
    mastGroup.name = 'masts';

    const mastSpacing = (length * 0.55) / Math.max(1, masts);
    const mastStartZ = masts === 1 ? 0 : -halfLen * 0.25;

    for (let m = 0; m < masts; m++) {
      const mastZ = mastStartZ + m * mastSpacing;
      const mastHeight = length * (0.65 + (m === 1 ? 0.15 : 0)); // Mainmast tallest

      const mPoleGeo = new THREE.CylinderGeometry(0.25, 0.45, mastHeight, 6);
      const mastPole = new THREE.Mesh(mPoleGeo, mastMat);
      mastPole.position.set(0, hullHeight + mastHeight * 0.5 - 0.5, mastZ);
      mastPole.castShadow = true;
      mastGroup.add(mastPole);

      // Crow's nest
      const crowsGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.6, 6);
      const crows = new THREE.Mesh(crowsGeo, deckMat);
      crows.position.set(0, hullHeight + mastHeight * 0.65, mastZ);
      mastGroup.add(crows);

      // Shrouds & Ratlines (Rope ladder stays from hull to crow's nest)
      for (let side = -1; side <= 1; side += 2) {
        const shroudPoints = [
          new THREE.Vector3(side * (halfBeam * 0.9), hullHeight * 0.8, mastZ - 1.5),
          new THREE.Vector3(side * 0.75, hullHeight + mastHeight * 0.64, mastZ),
          new THREE.Vector3(side * (halfBeam * 0.9), hullHeight * 0.8, mastZ + 1.5),
        ];
        const shroudGeo = new THREE.BufferGeometry().setFromPoints(shroudPoints);
        const shroudLine = new THREE.Line(shroudGeo, ropeMat);
        mastGroup.add(shroudLine);

        // Horizontal ratline rungs
        for (let r = 1; r <= 6; r++) {
          const frac = r / 7;
          const rx = THREE.MathUtils.lerp(side * (halfBeam * 0.9), side * 0.75, frac);
          const ry = THREE.MathUtils.lerp(hullHeight * 0.8, hullHeight + mastHeight * 0.64, frac);
          const rungGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(rx, ry, mastZ - 1.2 * (1 - frac)),
            new THREE.Vector3(rx, ry, mastZ + 1.2 * (1 - frac)),
          ]);
          const rung = new THREE.Line(rungGeo, ropeMat);
          mastGroup.add(rung);
        }
      }

      // Yardarms & Billowing Square Sails with Heraldry
      for (let t = 0; t < tiers; t++) {
        const tierFrac = (t + 1) / (tiers + 1);
        const tierY = hullHeight + mastHeight * (0.28 + tierFrac * 0.62);
        const yardWidth = beam * (1.8 - tierFrac * 0.6);

        // Cross yardarm
        const yardGeo = new THREE.CylinderGeometry(0.12, 0.15, yardWidth, 6);
        yardGeo.rotateZ(Math.PI * 0.5);
        const yard = new THREE.Mesh(yardGeo, mastMat);
        yard.position.set(0, tierY, mastZ);
        mastGroup.add(yard);

        // Billowing curved sail with heraldic canvas
        const sailHeight = mastHeight * (0.22 / tiers) * 1.5;
        const sailGeo = this.createBillowingSailGeometry(yardWidth * 0.9, sailHeight, 0.6);
        const isLowestCourse = t === 0;
        const sail = new THREE.Mesh(sailGeo, isLowestCourse ? mainSailMat : topSailMat);
        sail.position.set(0, tierY - sailHeight * 0.5, mastZ + 0.1);
        sail.castShadow = true;
        mastGroup.add(sail);

        // Bamboo battens across fan lug sails for Asian Junks
        if (spec.isJunk) {
          const battenCount = 3;
          const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
          for (let b = 1; b <= battenCount; b++) {
            const bY = tierY - sailHeight * (b / (battenCount + 1));
            const battenGeo = new THREE.CylinderGeometry(0.08, 0.08, yardWidth * 0.92, 6);
            battenGeo.rotateZ(Math.PI * 0.5);
            const batten = new THREE.Mesh(battenGeo, bambooMat);
            batten.position.set(0, bY, mastZ + 0.16);
            mastGroup.add(batten);
          }
        }
      }
    }

    // 3. Image 2 Rigging Layout: Bowsprit Jibs, Inter-Mast Staysails & Mizzen Spanker
    const foreMastZ = mastStartZ + (masts - 1) * mastSpacing;
    const foreMastHeight = length * 0.65;
    const mainMastZ = mastStartZ + (masts === 3 ? 1 : 0) * mastSpacing;
    const mainMastHeight = length * 0.80;
    const mizzenMastZ = mastStartZ;
    const mizzenMastHeight = length * 0.60;

    // A. Triple Bowsprit Headsails / Jibs (Yellow in Image 2: Flying Jib, Outer Jib, Inner Jib)
    const jibDefs = [
      {
        tipZ: halfLen * 1.15,
        tipY: hullHeight * 0.85 + 0.8,
        stayY: hullHeight + foreMastHeight * 0.78,
        tackZ: halfLen * 0.82,
        belly: 0.65,
      },
      {
        tipZ: halfLen * 0.98,
        tipY: hullHeight * 0.85 + 0.4,
        stayY: hullHeight + foreMastHeight * 0.62,
        tackZ: halfLen * 0.68,
        belly: 0.55,
      },
      {
        tipZ: halfLen * 0.82,
        tipY: hullHeight * 0.85,
        stayY: hullHeight + foreMastHeight * 0.46,
        tackZ: halfLen * 0.58,
        belly: 0.45,
      },
    ];

    jibDefs.forEach((jd) => {
      const p1 = new THREE.Vector3(0, jd.tipY, jd.tipZ);
      const p2 = new THREE.Vector3(0, jd.stayY, foreMastZ);
      const p3 = new THREE.Vector3(0, hullHeight * 0.88, jd.tackZ);
      const jGeo = this.createTriangularSailGeometry(p1, p2, p3, jd.belly);
      const jMesh = new THREE.Mesh(jGeo, topSailMat);
      jMesh.castShadow = true;
      mastGroup.add(jMesh);
    });

    // B. Inter-Mast Staysails (Blue in Image 2)
    if (masts >= 2) {
      // Main Topmast Staysail (Between Fore Mast and Main Mast)
      const msP1 = new THREE.Vector3(0, hullHeight * 0.82, foreMastZ - 0.5);
      const msP2 = new THREE.Vector3(0, hullHeight + mainMastHeight * 0.72, mainMastZ);
      const msP3 = new THREE.Vector3(0, hullHeight + foreMastHeight * 0.45, foreMastZ);
      const msGeo = this.createTriangularSailGeometry(msP1, msP2, msP3, 0.55);
      const msMesh = new THREE.Mesh(msGeo, topSailMat);
      msMesh.castShadow = true;
      mastGroup.add(msMesh);

      // Main Lower Staysail
      const mlsP1 = new THREE.Vector3(0, hullHeight * 0.82, foreMastZ - 1.0);
      const mlsP2 = new THREE.Vector3(0, hullHeight + mainMastHeight * 0.45, mainMastZ);
      const mlsP3 = new THREE.Vector3(0, hullHeight * 0.95, (foreMastZ + mainMastZ) * 0.5);
      const mlsGeo = this.createTriangularSailGeometry(mlsP1, mlsP2, mlsP3, 0.45);
      const mlsMesh = new THREE.Mesh(mlsGeo, topSailMat);
      mlsMesh.castShadow = true;
      mastGroup.add(mlsMesh);
    }

    if (masts === 3) {
      // Mizzen Staysail (Between Main Mast and Mizzen Mast)
      const mzsP1 = new THREE.Vector3(0, hullHeight * 0.82, mizzenMastZ + 1.0);
      const mzsP2 = new THREE.Vector3(0, hullHeight + mainMastHeight * 0.55, mainMastZ);
      const mzsP3 = new THREE.Vector3(0, hullHeight + mizzenMastHeight * 0.45, mizzenMastZ);
      const mzsGeo = this.createTriangularSailGeometry(mzsP1, mzsP2, mzsP3, 0.50);
      const mzsMesh = new THREE.Mesh(mzsGeo, topSailMat);
      mzsMesh.castShadow = true;
      mastGroup.add(mzsMesh);

      // C. Mizzen Gaff Spanker / Driver Sail (Light Green in Image 2)
      // Gaff Spar angled upward toward the stern
      const gaffLen = beam * 1.35;
      const gaffGeo = new THREE.CylinderGeometry(0.10, 0.14, gaffLen, 6);
      gaffGeo.rotateX(Math.PI * 0.38);
      const gaff = new THREE.Mesh(gaffGeo, mastMat);
      gaff.position.set(0, hullHeight + mizzenMastHeight * 0.50, mizzenMastZ - gaffLen * 0.38);
      mastGroup.add(gaff);

      // Boom Spar horizontal over stern
      const boomLen = beam * 1.45;
      const boomGeo = new THREE.CylinderGeometry(0.12, 0.16, boomLen, 6);
      boomGeo.rotateX(Math.PI * 0.5);
      const boom = new THREE.Mesh(boomGeo, mastMat);
      boom.position.set(0, hullHeight * 0.92, mizzenMastZ - boomLen * 0.48);
      mastGroup.add(boom);

      // Billowing Spanker Sail Canvas
      const spankerPoints = [
        new THREE.Vector3(0, hullHeight * 0.92, mizzenMastZ), // Mast base
        new THREE.Vector3(0, hullHeight + mizzenMastHeight * 0.48, mizzenMastZ), // Mast gaff throat
        new THREE.Vector3(0, hullHeight + mizzenMastHeight * 0.72, mizzenMastZ - gaffLen * 0.75), // Gaff peak
        new THREE.Vector3(0, hullHeight * 0.92, mizzenMastZ - boomLen * 0.92), // Boom clew
      ];
      const sp1 = this.createTriangularSailGeometry(spankerPoints[0], spankerPoints[1], spankerPoints[2], 0.5);
      const sp2 = this.createTriangularSailGeometry(spankerPoints[0], spankerPoints[2], spankerPoints[3], 0.5);
      const sm1 = new THREE.Mesh(sp1, mainSailMat);
      const sm2 = new THREE.Mesh(sp2, mainSailMat);
      mastGroup.add(sm1);
      mastGroup.add(sm2);
    }

    // 3. Faction or Pirate Ensigns (Masthead pennant & Large Stern Flag)
    // A. Mainmast Truck Pennant
    const pennantGeo = new THREE.PlaneGeometry(isPirate ? 5.5 : 4.5, isPirate ? 2.8 : 2.2, 4, 2);
    const pennant = new THREE.Mesh(pennantGeo, flagMat);
    const mainmastHeight = length * (0.65 + (masts > 1 ? 0.15 : 0));
    pennant.position.set(0, hullHeight + mainmastHeight + 1.2, mastStartZ + (masts > 1 ? mastSpacing : 0) - 2.2);
    mastGroup.add(pennant);

    // B. Prominent Stern Flagstaff Ensign (Visible to player and targets)
    const sternStaffGeo = new THREE.CylinderGeometry(0.15, 0.2, 7.5, 6);
    sternStaffGeo.rotateX(Math.PI * 0.18);
    const sternStaff = new THREE.Mesh(sternStaffGeo, mastMat);
    sternStaff.position.set(0, hullHeight * 0.85 + castle * 1.0, -halfLen * 0.92);
    hullGroup.add(sternStaff);

    const sternEnsignGeo = new THREE.PlaneGeometry(isPirate ? 6.5 : 5.2, isPirate ? 4.0 : 3.2, 4, 3);
    const sternEnsign = new THREE.Mesh(sternEnsignGeo, flagMat);
    sternEnsign.position.set(0, hullHeight * 0.85 + castle * 1.0 + 3.2, -halfLen * 0.92 - 2.8);
    hullGroup.add(sternEnsign);

    shipGroup.add(mastGroup);

    // Save metadata on user data
    shipGroup.userData = {
      spec,
      isPirate,
      faction,
      sailsNode: mastGroup,
      flagNode: sternEnsign,
      pennantNode: pennant,
      oarsNodes,
    };

    return shipGroup;
  }

  /**
   * Builds LOD1 (Nearby ship 60m-160m: full silhouette, billowing sails, batched cannons, no micro-ratlines or pilasters)
   */
  public static createShipMeshLOD1(spec: ShipSpec, isPirate = false, factionOverride?: FactionId): THREE.Group {
    const shipGroup = new THREE.Group();
    shipGroup.name = `ship-${spec.id}-lod1`;

    const faction: FactionId = isPirate ? 'pirates' : (factionOverride || (spec.livery.flag === 0xd97706 ? 'spain' : 'sovereign'));
    const { length, beam, masts, tiers, castle } = spec;

    const mats = this.getShipMaterials(spec, isPirate, faction);
    const {
      hullMat, upperMat, deckMat, trimMat, mastMat, ropeMat,
      mainSailMat, topSailMat, cannonMat, windowMat, copperMat,
      bootStripeMat, flagMat
    } = mats;

    const hullGroup = new THREE.Group();
    hullGroup.name = 'hull';

    const halfLen = length * 0.5;
    const halfBeam = beam * 0.5;
    const hullHeight = beam * 0.6;

    // Main hull
    const mainHullGeo = new THREE.BoxGeometry(beam, hullHeight, length * 0.7);
    const mainHull = new THREE.Mesh(mainHullGeo, hullMat);
    mainHull.position.y = hullHeight * 0.4;
    mainHull.castShadow = false;
    hullGroup.add(mainHull);

    // Keel & Boot stripe
    const keelGeo = new THREE.BoxGeometry(beam * 0.94, hullHeight * 0.42, length * 0.74);
    const keel = new THREE.Mesh(keelGeo, copperMat);
    keel.position.y = hullHeight * 0.14;
    hullGroup.add(keel);

    const bootStripeGeo = new THREE.BoxGeometry(beam * 0.96, 0.32, length * 0.76);
    const bootStripe = new THREE.Mesh(bootStripeGeo, bootStripeMat);
    bootStripe.position.y = hullHeight * 0.35;
    hullGroup.add(bootStripe);

    // Bow
    const bowGeo = new THREE.ConeGeometry(halfBeam * 1.3, length * 0.35, 4);
    bowGeo.rotateX(Math.PI * 0.5);
    const bow = new THREE.Mesh(bowGeo, upperMat);
    bow.position.set(0, hullHeight * 0.45, halfLen * 0.72);
    bow.scale.set(1.0, 0.75, 1.0);
    hullGroup.add(bow);

    // Bowsprit
    const bowspritGeo = new THREE.CylinderGeometry(0.2, 0.4, length * 0.38, 5);
    bowspritGeo.rotateX(Math.PI * 0.35);
    const bowsprit = new THREE.Mesh(bowspritGeo, mastMat);
    bowsprit.position.set(0, hullHeight * 0.85, halfLen * 0.9);
    hullGroup.add(bowsprit);

    // Stern transom
    const sternHeight = hullHeight * (1 + castle * 0.38);
    const sternDepth = length * 0.28;
    const sternCenterZ = -halfLen * 0.68;
    const sternGeo = new THREE.BoxGeometry(beam * 0.88, sternHeight, sternDepth);
    const stern = new THREE.Mesh(sternGeo, upperMat);
    stern.position.set(0, hullHeight * 0.4 + (sternHeight - hullHeight) * 0.5, sternCenterZ);
    hullGroup.add(stern);

    const rearFaceZ = sternCenterZ - sternDepth * 0.5;
    const sternZ = rearFaceZ - 0.06;
    const galleryY = hullHeight * 0.52 + castle * 0.95;

    // Single unified transom window strip (omits 10+ pilaster meshes)
    const winStripGeo = new THREE.PlaneGeometry(beam * 0.68, 2.0);
    const winStrip = new THREE.Mesh(winStripGeo, windowMat);
    winStrip.position.set(0, galleryY, sternZ - 0.04);
    winStrip.rotation.y = Math.PI;
    hullGroup.add(winStrip);

    // Quarterdeck Railing
    const railGeo = new THREE.BoxGeometry(beam * 0.82, 0.35, 0.25);
    const rail = new THREE.Mesh(railGeo, trimMat);
    rail.position.set(0, galleryY + 2.5, sternZ + 0.3);
    hullGroup.add(rail);

    // Deck & Wales
    const deckGeo = new THREE.BoxGeometry(beam * 0.88, 0.25, length * 0.85);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, hullHeight * 0.78, 0);
    hullGroup.add(deck);

    const waleGeo = new THREE.BoxGeometry(beam * 1.03, 0.45, length * 0.8);
    const wale = new THREE.Mesh(waleGeo, trimMat);
    wale.position.set(0, hullHeight * 0.65, 0);
    hullGroup.add(wale);

    // Batched cannon barrels (simplified - no hinged lids or wheels)
    const gunPortsPerSide = Math.min(6, Math.floor(spec.cannons / 2));
    const gunSpacing = (length * 0.55) / (gunPortsPerSide + 1);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i <= gunPortsPerSide; i++) {
        const zPos = -halfLen * 0.3 + i * gunSpacing;
        const xPos = side * (halfBeam * 0.98);
        const barrelGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.1, 5);
        barrelGeo.rotateZ(side * Math.PI * 0.5);
        const barrel = new THREE.Mesh(barrelGeo, cannonMat);
        barrel.position.set(xPos + side * 0.15, hullHeight * 0.65, zPos);
        hullGroup.add(barrel);
      }
    }

    // Stern Flagstaff
    const sternStaffGeo = new THREE.CylinderGeometry(0.15, 0.2, 7.5, 5);
    sternStaffGeo.rotateX(Math.PI * 0.18);
    const sternStaff = new THREE.Mesh(sternStaffGeo, mastMat);
    sternStaff.position.set(0, hullHeight * 0.85 + castle * 1.0, -halfLen * 0.92);
    hullGroup.add(sternStaff);

    const sternEnsignGeo = new THREE.PlaneGeometry(isPirate ? 6.5 : 5.2, isPirate ? 4.0 : 3.2, 3, 2);
    const sternEnsign = new THREE.Mesh(sternEnsignGeo, flagMat);
    sternEnsign.position.set(0, hullHeight * 0.85 + castle * 1.0 + 3.2, -halfLen * 0.92 - 2.8);
    hullGroup.add(sternEnsign);

    shipGroup.add(hullGroup);

    // Masts & Sails (LOD1: primary shrouds line, omit ratline ladder rungs)
    const mastGroup = new THREE.Group();
    mastGroup.name = 'masts';

    const mastSpacing = (length * 0.55) / Math.max(1, masts);
    const mastStartZ = masts === 1 ? 0 : -halfLen * 0.25;

    for (let m = 0; m < masts; m++) {
      const mastZ = mastStartZ + m * mastSpacing;
      const mastHeight = length * (0.65 + (m === 1 ? 0.15 : 0));

      const mPoleGeo = new THREE.CylinderGeometry(0.25, 0.45, mastHeight, 5);
      const mastPole = new THREE.Mesh(mPoleGeo, mastMat);
      mastPole.position.set(0, hullHeight + mastHeight * 0.5 - 0.5, mastZ);
      mastGroup.add(mastPole);

      // Crow's nest
      const crowsGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.6, 5);
      const crows = new THREE.Mesh(crowsGeo, deckMat);
      crows.position.set(0, hullHeight + mastHeight * 0.65, mastZ);
      mastGroup.add(crows);

      // 2 Single shroud lines per side (no 12 horizontal rungs)
      for (let side = -1; side <= 1; side += 2) {
        const shroudPoints = [
          new THREE.Vector3(side * (halfBeam * 0.9), hullHeight * 0.8, mastZ - 1.2),
          new THREE.Vector3(side * 0.75, hullHeight + mastHeight * 0.64, mastZ),
          new THREE.Vector3(side * (halfBeam * 0.9), hullHeight * 0.8, mastZ + 1.2),
        ];
        const shroudGeo = new THREE.BufferGeometry().setFromPoints(shroudPoints);
        const shroudLine = new THREE.Line(shroudGeo, ropeMat);
        mastGroup.add(shroudLine);
      }

      // Billowing square sails
      for (let t = 0; t < tiers; t++) {
        const tierFrac = (t + 1) / (tiers + 1);
        const tierY = hullHeight + mastHeight * (0.28 + tierFrac * 0.62);
        const yardWidth = beam * (1.8 - tierFrac * 0.6);

        const yardGeo = new THREE.CylinderGeometry(0.12, 0.15, yardWidth, 5);
        yardGeo.rotateZ(Math.PI * 0.5);
        const yard = new THREE.Mesh(yardGeo, mastMat);
        yard.position.set(0, tierY, mastZ);
        mastGroup.add(yard);

        const sailHeight = mastHeight * (0.22 / tiers) * 1.5;
        const sailGeo = this.createBillowingSailGeometry(yardWidth * 0.9, sailHeight, 0.5);
        const sail = new THREE.Mesh(sailGeo, t === 0 ? mainSailMat : topSailMat);
        sail.position.set(0, tierY - sailHeight * 0.5, mastZ + 0.1);
        mastGroup.add(sail);
      }
    }

    // Headsail Jib
    const foreMastZ = mastStartZ + (masts - 1) * mastSpacing;
    const foreMastHeight = length * 0.65;
    const jP1 = new THREE.Vector3(0, hullHeight * 0.85, halfLen * 0.9);
    const jP2 = new THREE.Vector3(0, hullHeight + foreMastHeight * 0.65, foreMastZ);
    const jP3 = new THREE.Vector3(0, hullHeight * 0.88, halfLen * 0.65);
    const jGeo = this.createTriangularSailGeometry(jP1, jP2, jP3, 0.5);
    const jMesh = new THREE.Mesh(jGeo, topSailMat);
    mastGroup.add(jMesh);

    // Pennant
    const pennantGeo = new THREE.PlaneGeometry(isPirate ? 5.0 : 4.0, isPirate ? 2.5 : 2.0, 3, 2);
    const pennant = new THREE.Mesh(pennantGeo, flagMat);
    const mainmastHeight = length * (0.65 + (masts > 1 ? 0.15 : 0));
    pennant.position.set(0, hullHeight + mainmastHeight + 1.2, mastStartZ + (masts > 1 ? mastSpacing : 0) - 2.2);
    mastGroup.add(pennant);

    shipGroup.add(mastGroup);

    shipGroup.userData = {
      spec,
      isPirate,
      faction,
      sailsNode: mastGroup,
      flagNode: sternEnsign,
      pennantNode: pennant,
    };

    return shipGroup;
  }

  /**
   * Builds LOD2 (Fleet distance 160m-350m: simplified hull wedge, primary masts & square sails, flags, ~10 meshes)
   */
  public static createShipMeshLOD2(spec: ShipSpec, isPirate = false, factionOverride?: FactionId): THREE.Group {
    const shipGroup = new THREE.Group();
    shipGroup.name = `ship-${spec.id}-lod2`;

    const faction: FactionId = isPirate ? 'pirates' : (factionOverride || (spec.livery.flag === 0xd97706 ? 'spain' : 'sovereign'));
    const { length, beam, masts, castle } = spec;

    const mats = this.getShipMaterials(spec, isPirate, faction);
    const { hullMat, upperMat, deckMat, mastMat, mainSailMat, topSailMat, copperMat, flagMat } = mats;

    const halfLen = length * 0.5;
    const hullHeight = beam * 0.6;

    // Unified Hull Structure (Main hull + bow + stern in 5 clean meshes)
    const hullGeo = new THREE.BoxGeometry(beam, hullHeight, length * 0.7);
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.position.y = hullHeight * 0.4;
    shipGroup.add(hullMesh);

    const keelGeo = new THREE.BoxGeometry(beam * 0.94, hullHeight * 0.35, length * 0.74);
    const keelMesh = new THREE.Mesh(keelGeo, copperMat);
    keelMesh.position.y = hullHeight * 0.14;
    shipGroup.add(keelMesh);

    const bowGeo = new THREE.ConeGeometry(beam * 0.65, length * 0.35, 4);
    bowGeo.rotateX(Math.PI * 0.5);
    const bowMesh = new THREE.Mesh(bowGeo, upperMat);
    bowMesh.position.set(0, hullHeight * 0.45, halfLen * 0.72);
    shipGroup.add(bowMesh);

    const sternGeo = new THREE.BoxGeometry(beam * 0.88, hullHeight * (1 + castle * 0.3), length * 0.28);
    const sternMesh = new THREE.Mesh(sternGeo, upperMat);
    sternMesh.position.set(0, hullHeight * 0.5, -halfLen * 0.68);
    shipGroup.add(sternMesh);

    const deckGeo = new THREE.BoxGeometry(beam * 0.86, 0.2, length * 0.8);
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, hullHeight * 0.78, 0);
    shipGroup.add(deckMesh);

    // Simplified Masts and Sails
    const mastGroup = new THREE.Group();
    mastGroup.name = 'masts';

    const mastSpacing = (length * 0.55) / Math.max(1, masts);
    const mastStartZ = masts === 1 ? 0 : -halfLen * 0.25;

    for (let m = 0; m < masts; m++) {
      const mastZ = mastStartZ + m * mastSpacing;
      const mastHeight = length * (0.65 + (m === 1 ? 0.12 : 0));

      const poleGeo = new THREE.CylinderGeometry(0.25, 0.4, mastHeight, 4);
      const pole = new THREE.Mesh(poleGeo, mastMat);
      pole.position.set(0, hullHeight + mastHeight * 0.5 - 0.5, mastZ);
      mastGroup.add(pole);

      const totalSailHeight = mastHeight * 0.55;
      const sailWidth = beam * 1.5;
      const sailGeo = this.createBillowingSailGeometry(sailWidth, totalSailHeight, 0.45);
      const sail = new THREE.Mesh(sailGeo, m === 0 ? mainSailMat : topSailMat);
      sail.position.set(0, hullHeight + mastHeight * 0.45, mastZ + 0.1);
      mastGroup.add(sail);
    }

    // 1 Bowsprit jib
    const jP1 = new THREE.Vector3(0, hullHeight * 0.85, halfLen * 0.85);
    const jP2 = new THREE.Vector3(0, hullHeight + length * 0.45, mastStartZ + (masts - 1) * mastSpacing);
    const jP3 = new THREE.Vector3(0, hullHeight * 0.88, halfLen * 0.60);
    const jGeo = this.createTriangularSailGeometry(jP1, jP2, jP3, 0.4);
    const jMesh = new THREE.Mesh(jGeo, topSailMat);
    mastGroup.add(jMesh);

    // Stern Ensign Flag
    const flagGeo = new THREE.PlaneGeometry(isPirate ? 5.5 : 4.5, isPirate ? 3.5 : 2.8, 2, 2);
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0, hullHeight + 2.5, -halfLen * 0.95);
    shipGroup.add(flagMesh);

    shipGroup.add(mastGroup);

    // Disable all shadow casting on LOD2
    shipGroup.traverse(obj => {
      obj.castShadow = false;
      obj.receiveShadow = false;
    });

    shipGroup.userData = {
      spec,
      isPirate,
      faction,
      sailsNode: mastGroup,
      flagNode: flagMesh,
    };

    return shipGroup;
  }

  /**
   * Builds LOD3 (Horizon vessel >350m: ultra-light hull wedge + single combined sails plane, 3 meshes, ~40 tris)
   */
  public static createShipMeshLOD3(spec: ShipSpec, isPirate = false, factionOverride?: FactionId): THREE.Group {
    const shipGroup = new THREE.Group();
    shipGroup.name = `ship-${spec.id}-lod3`;

    const faction: FactionId = isPirate ? 'pirates' : (factionOverride || (spec.livery.flag === 0xd97706 ? 'spain' : 'sovereign'));
    const { length, beam } = spec;

    const mats = this.getShipMaterials(spec, isPirate, faction);
    const { hullMat, mainSailMat, flagMat } = mats;

    const hullHeight = beam * 0.55;

    // 1. Low-poly tapered Hull Wedge (Box)
    const hullGeo = new THREE.BoxGeometry(beam * 0.9, hullHeight, length * 0.85);
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.position.y = hullHeight * 0.4;
    shipGroup.add(hullMesh);

    // 2. Single Unified Fleet Sail Silhouette Plane
    const sailGeo = new THREE.PlaneGeometry(beam * 1.6, length * 0.65);
    const sailMesh = new THREE.Mesh(sailGeo, mainSailMat);
    sailMesh.position.set(0, hullHeight + length * 0.35, 0);
    sailMesh.rotation.y = 0;
    shipGroup.add(sailMesh);

    // 3. Small Stern Flag for Faction Recognition
    const flagGeo = new THREE.PlaneGeometry(3.5, 2.2);
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0, hullHeight + 1.8, -length * 0.45);
    shipGroup.add(flagMesh);

    // No shadows on LOD3
    shipGroup.traverse(obj => {
      obj.castShadow = false;
      obj.receiveShadow = false;
    });

    shipGroup.userData = {
      spec,
      isPirate,
      faction,
      sailsNode: sailMesh,
      flagNode: flagMesh,
    };

    return shipGroup;
  }

  /**
   * Master Ship Factory: Assembles a complete 4-tier Hierarchical LOD Ship Group
   */
  public static createShipMesh(spec: ShipSpec, isPirate = false, factionOverride?: FactionId): THREE.Group {
    const root = new THREE.Group();
    root.name = `ship-${spec.id}`;

    const faction: FactionId = isPirate ? 'pirates' : (factionOverride || (spec.livery.flag === 0xd97706 ? 'spain' : 'sovereign'));

    const lod0 = this.createShipMeshLOD0(spec, isPirate, faction);
    const lod1 = this.createShipMeshLOD1(spec, isPirate, faction);
    const lod2 = this.createShipMeshLOD2(spec, isPirate, faction);
    const lod3 = this.createShipMeshLOD3(spec, isPirate, faction);

    lod0.visible = true;
    lod1.visible = false;
    lod2.visible = false;
    lod3.visible = false;

    root.add(lod0);
    root.add(lod1);
    root.add(lod2);
    root.add(lod3);

    root.userData = {
      spec,
      isPirate,
      faction,
      currentLOD: 0,
      lodLevels: [lod0, lod1, lod2, lod3],
      sailsNode: lod0.userData?.sailsNode || lod0,
      flagNode: lod0.userData?.flagNode,
      pennantNode: lod0.userData?.pennantNode,
      oarsNodes: lod0.userData?.oarsNodes || [],
    };

    return root;
  }

  /**
   * Updates ship LOD level based on distance to camera using a 15m hysteresis buffer
   * to guarantee zero popping / rapid flickering at boundaries.
   */
  public static updateShipLOD(shipGroup: THREE.Group, distToCamera: number): number {
    const ud = shipGroup.userData;
    if (!ud || !ud.lodLevels) return 0;

    const currentLOD: number = ud.currentLOD ?? 0;
    let targetLOD = currentLOD;

    // 15m Hysteresis Thresholds:
    // LOD0 <-> LOD1: switch up at >65m, switch down at <50m
    // LOD1 <-> LOD2: switch up at >175m, switch down at <145m
    // LOD2 <-> LOD3: switch up at >365m, switch down at <335m
    if (currentLOD === 0) {
      if (distToCamera > 65) targetLOD = 1;
    } else if (currentLOD === 1) {
      if (distToCamera < 50) targetLOD = 0;
      else if (distToCamera > 175) targetLOD = 2;
    } else if (currentLOD === 2) {
      if (distToCamera < 145) targetLOD = 1;
      else if (distToCamera > 365) targetLOD = 3;
    } else if (currentLOD === 3) {
      if (distToCamera < 335) targetLOD = 2;
    }

    if (targetLOD !== currentLOD) {
      ud.currentLOD = targetLOD;
      const lods: THREE.Group[] = ud.lodLevels;
      for (let i = 0; i < lods.length; i++) {
        if (lods[i]) {
          lods[i].visible = (i === targetLOD);
        }
      }
      const activeLOD = lods[targetLOD];
      if (activeLOD?.userData?.flagNode) {
        ud.flagNode = activeLOD.userData.flagNode;
      }
      if (activeLOD?.userData?.pennantNode) {
        ud.pennantNode = activeLOD.userData.pennantNode;
      }
    }

    return targetLOD;
  }

  /**
   * Imperial Chinese Golden Dragon figurehead with glowing ruby eyes, horns, and whiskers
   */
  private static createDragonFigurehead(beam: number): THREE.Group {
    const dragon = new THREE.Group();
    dragon.name = 'figurehead-dragon';
    const s = THREE.MathUtils.clamp(beam * 0.16, 1.2, 2.8);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.85,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0xef4444),
      emissiveIntensity: 1.6,
      roughness: 0.1,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
    });

    // Dragon head snout
    const headGeo = new THREE.BoxGeometry(0.9 * s, 0.8 * s, 1.8 * s);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0, 0.2 * s, 0.9 * s);
    dragon.add(head);

    // Lower jaw
    const jawGeo = new THREE.BoxGeometry(0.8 * s, 0.3 * s, 1.4 * s);
    const jaw = new THREE.Mesh(jawGeo, goldMat);
    jaw.position.set(0, -0.35 * s, 0.8 * s);
    jaw.rotation.x = 0.2;
    dragon.add(jaw);

    // Sharp fangs
    for (let side = -1; side <= 1; side += 2) {
      const fangGeo = new THREE.ConeGeometry(0.1 * s, 0.35 * s, 4);
      fangGeo.rotateX(Math.PI);
      const fang = new THREE.Mesh(fangGeo, whiteMat);
      fang.position.set(side * 0.32 * s, -0.15 * s, 1.5 * s);
      dragon.add(fang);
    }

    // Glowing Ruby Eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.14 * s, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.42 * s, 0.45 * s, 1.2 * s);
      dragon.add(eye);
    }

    // Dragon Horns
    for (let side = -1; side <= 1; side += 2) {
      const hornGeo = new THREE.CylinderGeometry(0.06 * s, 0.14 * s, 1.6 * s, 6);
      hornGeo.rotateX(-0.65);
      hornGeo.rotateZ(side * 0.35);
      const horn = new THREE.Mesh(hornGeo, goldMat);
      horn.position.set(side * 0.38 * s, 0.9 * s, 0.2 * s);
      dragon.add(horn);
    }

    // Whiskers
    for (let side = -1; side <= 1; side += 2) {
      const whiskerGeo = new THREE.CylinderGeometry(0.03 * s, 0.05 * s, 1.8 * s, 5);
      whiskerGeo.rotateX(0.7);
      whiskerGeo.rotateZ(side * 0.55);
      const whisker = new THREE.Mesh(whiskerGeo, goldMat);
      whisker.position.set(side * 0.48 * s, 0.1 * s, 1.7 * s);
      dragon.add(whisker);
    }

    // Dorsal Spines along neck
    for (let sp = 0; sp < 4; sp++) {
      const spineGeo = new THREE.ConeGeometry(0.12 * s, 0.45 * s, 3);
      const spine = new THREE.Mesh(spineGeo, goldMat);
      spine.position.set(0, 0.65 * s + sp * 0.08 * s, -0.2 * s - sp * 0.4 * s);
      dragon.add(spine);
    }

    const eyeLight = new THREE.PointLight(0xef4444, 1.8, 12 * s);
    eyeLight.position.set(0, 0.4 * s, 1.5 * s);
    dragon.add(eyeLight);

    return dragon;
  }

  /**
   * Classical European Carved Golden Mermaid / Siren figurehead
   */
  private static createMermaidFigurehead(beam: number): THREE.Group {
    const mermaid = new THREE.Group();
    mermaid.name = 'figurehead-mermaid';
    const s = THREE.MathUtils.clamp(beam * 0.14, 1.0, 2.4);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.82,
    });

    // Torso tilted gracefully forward
    const torsoGeo = new THREE.CylinderGeometry(0.28 * s, 0.22 * s, 1.4 * s, 8);
    torsoGeo.rotateX(0.45);
    const torso = new THREE.Mesh(torsoGeo, goldMat);
    torso.position.set(0, 0.4 * s, 0.5 * s);
    mermaid.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.32 * s, 8, 8);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0, 1.1 * s, 0.85 * s);
    mermaid.add(head);

    // Tiara
    const crownGeo = new THREE.TorusGeometry(0.25 * s, 0.06 * s, 4, 8);
    crownGeo.rotateX(Math.PI * 0.5);
    const crown = new THREE.Mesh(crownGeo, goldMat);
    crown.position.set(0, 1.35 * s, 0.85 * s);
    mermaid.add(crown);

    // Flowing hair streaming back
    const hairGeo = new THREE.ConeGeometry(0.35 * s, 1.6 * s, 4);
    hairGeo.rotateX(-0.9);
    const hair = new THREE.Mesh(hairGeo, goldMat);
    hair.position.set(0, 0.9 * s, 0.2 * s);
    mermaid.add(hair);

    // Outstretched arms
    for (let side = -1; side <= 1; side += 2) {
      const armGeo = new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 1.0 * s, 6);
      armGeo.rotateZ(side * 0.55);
      armGeo.rotateX(0.6);
      const arm = new THREE.Mesh(armGeo, goldMat);
      arm.position.set(side * 0.45 * s, 0.55 * s, 0.9 * s);
      mermaid.add(arm);
    }

    // Curving Siren Fish Tail & Fluke Fins
    const tailGeo = new THREE.CylinderGeometry(0.18 * s, 0.08 * s, 1.3 * s, 6);
    tailGeo.rotateX(-0.5);
    const tail = new THREE.Mesh(tailGeo, goldMat);
    tail.position.set(0, -0.4 * s, 0.1 * s);
    mermaid.add(tail);

    const flukeGeo = new THREE.ConeGeometry(0.4 * s, 0.6 * s, 3);
    flukeGeo.rotateX(Math.PI * 0.5);
    const fluke = new THREE.Mesh(flukeGeo, goldMat);
    fluke.position.set(0, -0.85 * s, -0.2 * s);
    mermaid.add(fluke);

    return mermaid;
  }

  /**
   * Menacing Horned Demon Skull & Iron Ramming Beak for Pirate Corsairs
   */
  private static createSkullRamFigurehead(beam: number, isPirate: boolean): THREE.Group {
    const skullGroup = new THREE.Group();
    skullGroup.name = 'figurehead-skull';
    const s = THREE.MathUtils.clamp(beam * 0.15, 1.1, 2.5);

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xded6c5,
      roughness: 0.85,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.9,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // Cranium
    const skullGeo = new THREE.SphereGeometry(0.45 * s, 8, 8);
    skullGeo.scale(0.85, 1.0, 1.1);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.position.set(0, 0.3 * s, 0.6 * s);
    skullGroup.add(skull);

    // Jaw with teeth
    const jawGeo = new THREE.BoxGeometry(0.55 * s, 0.35 * s, 0.65 * s);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.position.set(0, -0.2 * s, 0.85 * s);
    skullGroup.add(jaw);

    // Glowing red ember eye sockets
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.12 * s, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, emberMat);
      eye.position.set(side * 0.2 * s, 0.35 * s, 1.05 * s);
      skullGroup.add(eye);
    }

    // Curved Demonic Ram Horns
    for (let side = -1; side <= 1; side += 2) {
      const hornGeo = new THREE.TorusGeometry(0.42 * s, 0.12 * s, 6, 10, Math.PI * 0.8);
      hornGeo.rotateY(side * 0.4);
      hornGeo.rotateZ(side * 0.85);
      const horn = new THREE.Mesh(hornGeo, ironMat);
      horn.position.set(side * 0.35 * s, 0.65 * s, 0.4 * s);
      skullGroup.add(horn);
    }

    // Reinforced Iron Ram Spur Beak
    const ramGeo = new THREE.ConeGeometry(0.35 * s, 1.8 * s, 4);
    ramGeo.rotateX(Math.PI * 0.5);
    const ram = new THREE.Mesh(ramGeo, ironMat);
    ram.position.set(0, -0.6 * s, 1.3 * s);
    skullGroup.add(ram);

    const emberLight = new THREE.PointLight(0xef4444, 2.0, 10 * s);
    emberLight.position.set(0, 0.3 * s, 1.2 * s);
    skullGroup.add(emberLight);

    return skullGroup;
  }

  /**
   * Creates a realistic curved, wind-billowing sail geometry
   */
  private static createBillowingSailGeometry(width: number, height: number, belly: number): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(width, height, 8, 6);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / (width * 0.5); // -1 to 1
      const v = pos.getY(i) / (height * 0.5); // -1 to 1

      // Convex belly bulge curve
      const factorX = 1 - u * u;
      const factorY = 1 - v * v;
      const displacementZ = factorX * factorY * belly;

      pos.setZ(i, pos.getZ(i) + displacementZ);
    }

    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Creates an authentic Age-of-Sail iron fluke anchor with wooden cross-stock
   */
  private static createIronAnchor(): THREE.Group {
    const anchor = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
      metalness: 0.85,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
    });

    // Anchor shank (vertical post)
    const shankGeo = new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6);
    const shank = new THREE.Mesh(shankGeo, ironMat);
    anchor.add(shank);

    // Anchor wooden stock (cross piece near top)
    const stockGeo = new THREE.BoxGeometry(2.4, 0.32, 0.32);
    const stock = new THREE.Mesh(stockGeo, woodMat);
    stock.position.set(0, 1.1, 0);
    anchor.add(stock);

    // Iron ring at top
    const ringGeo = new THREE.TorusGeometry(0.35, 0.08, 4, 8);
    const ring = new THREE.Mesh(ringGeo, ironMat);
    ring.position.set(0, 1.7, 0);
    anchor.add(ring);

    // Anchor crown & curved flukes (arms with triangular spades)
    const armGeo = new THREE.TorusGeometry(0.95, 0.12, 6, 8, Math.PI);
    armGeo.rotateZ(Math.PI);
    const arm = new THREE.Mesh(armGeo, ironMat);
    arm.position.set(0, -1.2, 0);
    anchor.add(arm);

    // Fluke spades
    for (let s = -1; s <= 1; s += 2) {
      const spadeGeo = new THREE.ConeGeometry(0.35, 0.7, 3);
      spadeGeo.rotateZ(s * -0.5);
      const spade = new THREE.Mesh(spadeGeo, ironMat);
      spade.position.set(s * 0.95, -0.65, 0);
      anchor.add(spade);
    }

    anchor.scale.set(0.72, 0.72, 0.72);
    return anchor;
  }

  /**
   * Creates a realistic curved, wind-billowing triangular sail geometry (Jibs & Staysails)
   */
  private static createTriangularSailGeometry(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    belly: number = 0.5
  ): THREE.BufferGeometry {
    const segments = 6;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const grid: number[][] = [];
    let vertIdx = 0;

    for (let i = 0; i <= segments; i++) {
      grid[i] = [];
      const v = i / segments;
      for (let j = 0; j <= segments - i; j++) {
        const u = j / segments;
        const w = 1 - u - v;

        const bx = u * p1.x + v * p2.x + w * p3.x;
        const by = u * p1.y + v * p2.y + w * p3.y;
        const bz = u * p1.z + v * p2.z + w * p3.z;

        // Aerodynamic wind bulge
        const bulge = Math.sin(Math.PI * (1 - w)) * Math.sin(Math.PI * (u + 0.1)) * belly;
        const dx = bulge * 0.6;
        const dz = bulge * 0.4;

        vertices.push(bx + dx, by, bz + dz);
        uvs.push(u, v);
        grid[i][j] = vertIdx++;
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments - i; j++) {
        const a = grid[i][j];
        const b = grid[i + 1][j];
        const c = grid[i][j + 1];
        indices.push(a, b, c);
        indices.push(a, c, b);

        if (j < segments - i - 1) {
          const d = grid[i + 1][j + 1];
          indices.push(b, d, c);
          indices.push(b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Generates a realistic wake foam mesh trailing behind the ship
   */
  public static createWakeMesh(length: number, beam: number): THREE.Mesh {
    const wakeGeo = new THREE.PlaneGeometry(beam * 1.6, length * 1.8, 12, 12);
    wakeGeo.rotateX(-Math.PI * 0.5);

    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const wake = new THREE.Mesh(wakeGeo, wakeMat);
    wake.position.set(0, 0.05, -length * 0.7);
    return wake;
  }
}
