/**
 * Realm of Crowns — Sail Heraldry & Nautical Texture Service
 * Procedurally generates high-resolution canvas textures for 17th-century naval sails,
 * fluttering ensigns, pirate Jolly Rogers, faction crests, and timber planking.
 * 100% dependency-free, zero-network latency, and crystal-clear at all view distances.
 */

import * as THREE from 'three';

export type FactionId = 'pirates' | 'england' | 'spain' | 'france' | 'holland' | 'sovereign' | 'dragon';

export class SailHeraldryService {
  private static textureCache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Returns an authentic sail cloth texture with the faction's heraldic emblem
   */
  public static getSailTexture(faction: FactionId, isMainSail = true): THREE.CanvasTexture {
    const key = `sail_${faction}_${isMainSail ? 'main' : 'top'}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. Base Sail Cloth with woven texture & seams
    const isPirate = faction === 'pirates';
    const isDragon = faction === 'dragon';
    const baseColor = isDragon ? '#881337' : isPirate ? '#1e1c1a' : '#f5efe1';
    const seamColor = isDragon ? '#4c0519' : isPirate ? '#121110' : '#ded5c2';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    if (isDragon) {
      // Asian Battened Ribbed Bamboo Stays (Horizontal across sail)
      const battenCount = 6;
      for (let b = 1; b <= battenCount; b++) {
        const by = (512 / (battenCount + 1)) * b;

        // Dark bamboo shadow
        ctx.fillStyle = '#2a0a10';
        ctx.fillRect(0, by - 2, 512, 8);

        // Bamboo pole (warm golden-brown)
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, by, 512, 5);

        // Bamboo nodes / segment ties
        ctx.fillStyle = '#fde68a';
        for (let nx = 30; nx < 512; nx += 75) {
          ctx.fillRect(nx, by - 1, 4, 7);
        }

        // Rigging lashings & grommet rings
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        for (let nx = 32; nx < 512; nx += 75) {
          ctx.strokeRect(nx - 2, by - 3, 8, 11);
        }
      }
    } else {
      // Vertical European canvas bolt seams
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 3;
      const seamCount = 8;
      for (let i = 1; i < seamCount; i++) {
        const x = (512 / seamCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();

        // Stitching details
        ctx.strokeStyle = isPirate ? '#262320' : '#ece3d2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 2, 0);
        ctx.lineTo(x + 2, 512);
        ctx.stroke();
        ctx.strokeStyle = seamColor;
        ctx.lineWidth = 3;
      }
    }

    // Weathered edge shading
    const grad = ctx.createRadialGradient(256, 256, 120, 256, 256, 320);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, isDragon ? 'rgba(0,0,0,0.5)' : isPirate ? 'rgba(0,0,0,0.55)' : 'rgba(120,90,50,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Draw Faction Heraldic Emblem in center of sail
    if (isMainSail) {
      ctx.save();
      ctx.translate(256, 240);

      switch (faction) {
        case 'dragon':
          this.drawDragonEmblem(ctx, 1.35);
          break;
        case 'pirates':
          this.drawJollyRogerEmblem(ctx, 1.4);
          break;
        case 'spain':
          this.drawBurgundyCrossEmblem(ctx, 1.3);
          break;
        case 'france':
          this.drawFleurDeLisEmblem(ctx, 1.3);
          break;
        case 'holland':
          this.drawDutchNavalEmblem(ctx, 1.3);
          break;
        case 'england':
        case 'sovereign':
        default:
          this.drawSovereignCrownEmblem(ctx, 1.3);
          break;
      }

      ctx.restore();
    }

    // 3. Reinforcement grommets & reef bands
    ctx.strokeStyle = isDragon ? '#b45309' : isPirate ? '#2d2722' : '#c4b59c';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 496);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Returns a waving national / pirate ensign flag texture
   */
  public static getFlagTexture(faction: FactionId): THREE.CanvasTexture {
    const key = `flag_${faction}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    switch (faction) {
      case 'dragon':
        // Imperial Dragon Banner: Deep Crimson with Golden Dragon and Cloud Scrolls
        ctx.fillStyle = '#881337';
        ctx.fillRect(0, 0, 512, 320);

        // Golden Wave / Cloud border
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, 492, 300);

        ctx.save();
        ctx.translate(256, 160);
        this.drawDragonEmblem(ctx, 1.15);
        ctx.restore();
        break;

      case 'pirates':
        // Black flag with prominent white skull and cutlasses
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 512, 320);

        // Subtle border
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 500, 308);

        ctx.save();
        ctx.translate(256, 160);
        this.drawJollyRogerEmblem(ctx, 1.25);
        ctx.restore();
        break;

      case 'spain':
        // Spanish Imperial Burgundy Cross (Red ragged cross on ivory)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 512, 320);
        ctx.save();
        ctx.translate(256, 160);
        this.drawBurgundyCrossEmblem(ctx, 1.4);
        ctx.restore();
        break;

      case 'france':
        // Royal French Navy: Royal blue with 3 golden fleurs-de-lis
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, 0, 512, 320);
        ctx.save();
        ctx.translate(256, 160);
        this.drawFleurDeLisEmblem(ctx, 1.2);
        ctx.restore();
        break;

      case 'holland':
        // Dutch Princevlag: Orange, White, Blue horizontal tricolor
        ctx.fillStyle = '#ea580c'; // Dutch Orange
        ctx.fillRect(0, 0, 512, 107);
        ctx.fillStyle = '#ffffff'; // White
        ctx.fillRect(0, 107, 512, 106);
        ctx.fillStyle = '#1d4ed8'; // Royal Blue
        ctx.fillRect(0, 213, 512, 107);
        break;

      case 'england':
      case 'sovereign':
      default:
        // Sovereign Royal Navy: St. George Red Cross on White with Golden Crown
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 512, 320);

        // St. George Cross
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(226, 0, 60, 320);
        ctx.fillRect(0, 130, 512, 60);

        // Golden Crown Crest in Canton
        ctx.save();
        ctx.translate(110, 65);
        this.drawMiniCrown(ctx, 0.65);
        ctx.restore();
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Draws the classic Jolly Roger (Skull + Crossed Cutlasses/Bones)
   */
  private static drawJollyRogerEmblem(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.scale(scale, scale);

    // Crossed Bones / Cutlasses in background
    ctx.strokeStyle = '#f4f4f5';
    ctx.fillStyle = '#e4e4e7';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';

    // Blade 1 (Diagonal Left-Right)
    ctx.beginPath();
    ctx.moveTo(-90, -60);
    ctx.lineTo(90, 60);
    ctx.stroke();

    // Blade 2 (Diagonal Right-Left)
    ctx.beginPath();
    ctx.moveTo(90, -60);
    ctx.lineTo(-90, 60);
    ctx.stroke();

    // Bone knobby joints
    const joints = [
      [-90, -60],
      [90, -60],
      [-90, 60],
      [90, 60],
    ];
    joints.forEach(([jx, jy]) => {
      ctx.beginPath();
      ctx.arc(jx - 4, jy, 8, 0, Math.PI * 2);
      ctx.arc(jx + 4, jy, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Skull Cranium
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -18, 52, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skull Jaw / Maxilla
    ctx.beginPath();
    ctx.rect(-24, 16, 48, 26);
    ctx.fill();

    // Skull Eye Sockets (Dark hollows)
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(-18, -12, 14, 18, -0.15, 0, Math.PI * 2);
    ctx.ellipse(18, -12, 14, 18, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Nasal cavity
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-6, 16);
    ctx.lineTo(6, 16);
    ctx.closePath();
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#09090b';
    for (let t = -16; t <= 16; t += 8) {
      ctx.fillRect(t - 1.5, 22, 3, 14);
    }

    ctx.restore();
  }

  /**
   * Draws the Spanish Cross of Burgundy (Cruz de Borgoña)
   */
  private static drawBurgundyCrossEmblem(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#b91c1c'; // Burgundy Red
    ctx.lineWidth = 22;
    ctx.lineCap = 'square';

    // Main X beams
    ctx.beginPath();
    ctx.moveTo(-100, -80);
    ctx.lineTo(100, 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(100, -80);
    ctx.lineTo(-100, 80);
    ctx.stroke();

    // Saw-tooth knot branches (ragged trunk nodes)
    ctx.fillStyle = '#b91c1c';
    const nodes = [
      [-60, -48],
      [-25, -20],
      [25, 20],
      [60, 48],
      [60, -48],
      [25, -20],
      [-25, 20],
      [-60, 48],
    ];

    nodes.forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx + 8, ny - 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nx - 8, ny + 6, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Draws the French Royal Fleur-de-lis Crest
   */
  private static drawFleurDeLisEmblem(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.scale(scale, scale);

    // Golden Fleur-de-lis
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3;

    // Central spear petal
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.bezierCurveTo(25, -40, 20, 0, 0, 25);
    ctx.bezierCurveTo(-20, 0, -25, -40, 0, -80);
    ctx.fill();
    ctx.stroke();

    // Left curving petal
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.bezierCurveTo(-45, -30, -75, -20, -65, 5);
    ctx.bezierCurveTo(-55, 30, -25, 20, 0, 25);
    ctx.fill();
    ctx.stroke();

    // Right curving petal
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.bezierCurveTo(45, -30, 75, -20, 65, 5);
    ctx.bezierCurveTo(55, 30, 25, 20, 0, 25);
    ctx.fill();
    ctx.stroke();

    // Crossbar tie
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-35, 18, 70, 12);
    ctx.strokeRect(-35, 18, 70, 12);

    // Lower base
    ctx.beginPath();
    ctx.moveTo(-18, 30);
    ctx.lineTo(0, 55);
    ctx.lineTo(18, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws the Dutch Naval VOC / Rampant Lion Crest
   */
  private static drawDutchNavalEmblem(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.scale(scale, scale);

    // Shield outline
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-50, -60);
    ctx.lineTo(50, -60);
    ctx.lineTo(50, 20);
    ctx.bezierCurveTo(50, 70, 0, 90, 0, 90);
    ctx.bezierCurveTo(0, 90, -50, 70, -50, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden emblem in center
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -10, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    // Bundle of 7 arrows
    for (let a = -30; a <= 30; a += 10) {
      const rad = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(Math.sin(rad) * 45, -Math.cos(rad) * 45 + 10);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws the Sovereign / Royal Crown Emblem
   */
  private static drawSovereignCrownEmblem(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.scale(scale, scale);

    // Regal shield
    ctx.fillStyle = '#7f1d1d'; // Imperial Crimson
    ctx.strokeStyle = '#eab308'; // Gold trim
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(-60, -70);
    ctx.lineTo(60, -70);
    ctx.lineTo(60, 15);
    ctx.bezierCurveTo(60, 75, 0, 95, 0, 95);
    ctx.bezierCurveTo(0, 95, -60, 75, -60, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Crown inside shield
    ctx.save();
    ctx.translate(0, -5);
    this.drawMiniCrown(ctx, 0.85);
    ctx.restore();

    ctx.restore();
  }

  private static drawMiniCrown(ctx: CanvasRenderingContext2D, s: number): void {
    ctx.save();
    ctx.scale(s, s);

    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;

    // Crown Base Band
    ctx.fillRect(-35, 10, 70, 14);
    ctx.strokeRect(-35, 10, 70, 14);

    // Crown Peaks
    ctx.beginPath();
    ctx.moveTo(-35, 10);
    ctx.lineTo(-40, -25); // Left spire
    ctx.lineTo(-18, -5);
    ctx.lineTo(0, -40); // Center tallest spire
    ctx.lineTo(18, -5);
    ctx.lineTo(40, -25); // Right spire
    ctx.lineTo(35, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jewels on spire tips
    const tips = [
      [-40, -25],
      [0, -40],
      [40, -25],
    ];
    ctx.fillStyle = '#ef4444';
    tips.forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Draws a majestic Imperial Golden Dragon Emblem with serpentine body, claws, and flaming pearl
   */
  private static drawDragonEmblem(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.scale(scale, scale);

    // 1. Serpentine Dragon Body (Coiled S-Curves)
    ctx.strokeStyle = '#f59e0b'; // Imperial Gold
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(70, -25);
    ctx.bezierCurveTo(40, -80, -40, -70, -60, -30);
    ctx.bezierCurveTo(-80, 10, -20, 40, 20, 30);
    ctx.bezierCurveTo(60, 20, 70, 70, 20, 80);
    ctx.bezierCurveTo(-30, 90, -70, 60, -80, 40);
    ctx.stroke();

    // Scale highlights along spine
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Dorsal Fin Spines along body
    ctx.fillStyle = '#ef4444'; // Red spine frills
    const spinePoints = [
      [20, -75], [0, -75], [-20, -70], [-45, -55], [-65, -30],
      [-55, 0], [-35, 25], [-10, 35], [15, 30], [45, 25], [60, 45],
      [55, 65], [35, 78], [10, 83], [-20, 80]
    ];
    spinePoints.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 3, sy - 8);
      ctx.lineTo(sx + 4, sy - 4);
      ctx.closePath();
      ctx.fill();
    });

    // 2. Dragon Head
    ctx.save();
    ctx.translate(75, -28);

    // Cranium & Snout
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(25, -6);
    ctx.lineTo(35, 4);
    ctx.lineTo(15, 12);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();

    // Antler Horns
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-12, -22);
    ctx.lineTo(-6, -28);
    ctx.moveTo(-5, -12);
    ctx.lineTo(-2, -22);
    ctx.stroke();

    // Whiskers (Barbel)
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 6);
    ctx.quadraticCurveTo(45, 18, 55, 14);
    ctx.moveTo(32, 2);
    ctx.quadraticCurveTo(48, -4, 56, 2);
    ctx.stroke();

    // Glowing Ruby Eye
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(12, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Dragon Talons / Claws
    const talonPositions = [
      [-50, -20, -0.4],
      [40, 20, 0.6],
      [-40, 55, -0.7],
    ];
    talonPositions.forEach(([cx, cy, ang]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(t * 7 + 10, 12);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 4. Flaming Dragon Pearl / Sacred Orb
    ctx.save();
    ctx.translate(110, -10);

    // Flame wisps
    ctx.fillStyle = '#ef4444';
    for (let f = 0; f < 4; f++) {
      const fa = (f / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(fa) * 10, Math.sin(fa) * 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden Orb
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.restore();
  }

  /**
   * Generates a high-quality weathered wood planking texture for ship hulls and decks
   */
  public static getWoodPlankTexture(isDarkKeel = false): THREE.CanvasTexture {
    const key = `wood_plank_${isDarkKeel ? 'dark' : 'normal'}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base wood color - warm, rich golden oak and teak tones
    const baseTone = isDarkKeel ? '#52341f' : '#8a5e38';
    ctx.fillStyle = baseTone;
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal plank lines & caulk seams
    const plankHeight = 32;
    for (let y = 0; y < 512; y += plankHeight) {
      // Varying plank shades
      const shade = ((y / plankHeight) % 3) * 12;
      ctx.fillStyle = `rgba(255,255,255,${shade * 0.008})`;
      ctx.fillRect(0, y, 512, plankHeight);

      // Dark pitch caulking seam
      ctx.fillStyle = '#1c130d';
      ctx.fillRect(0, y, 512, 3);

      // Wood grain strokes
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const gy = y + 6 + g * 6;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(150, gy + 2, 350, gy - 2, 512, gy);
        ctx.stroke();
      }

      // Staggered vertical plank butt-joints
      const buttX1 = (y * 7) % 512;
      const buttX2 = (buttX1 + 240) % 512;
      ctx.fillStyle = '#1c130d';
      ctx.fillRect(buttX1, y, 3, plankHeight);
      ctx.fillRect(buttX2, y, 3, plankHeight);

      // Tree nails / brass rivets
      ctx.fillStyle = '#261b14';
      ctx.fillRect(buttX1 + 6, y + 6, 2, 2);
      ctx.fillRect(buttX1 + 6, y + plankHeight - 8, 2, 2);
      ctx.fillRect(buttX2 + 6, y + 6, 2, 2);
      ctx.fillRect(buttX2 + 6, y + plankHeight - 8, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Generates a procedural seamless water normal map for physical Three.js Water
   * Uses exact integer Fourier harmonics so it wraps without any seams or distortion artifacts
   */
  public static generateWaterNormalMap(): THREE.CanvasTexture {
    const key = 'water_normal_map_v2';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Broad, natural oceanic wave harmonics with silky gentle swells
    const harmonics = [
      { kx: 1, ky: 0, amp: 0.32 },
      { kx: 0, ky: 1, amp: 0.28 },
      { kx: 1, ky: 1, amp: 0.20 },
      { kx: -1, ky: 2, amp: 0.15 },
      { kx: 2, ky: -1, amp: 0.10 },
    ];

    for (let y = 0; y < size; y++) {
      const v = (y / size) * Math.PI * 2;
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const idx = (y * size + x) * 4;

        let dw_dx = 0;
        let dw_dy = 0;

        for (let h = 0; h < harmonics.length; h++) {
          const harm = harmonics[h];
          const phase = harm.kx * u + harm.ky * v;
          const c = Math.cos(phase) * harm.amp;
          dw_dx -= harm.kx * c;
          dw_dy -= harm.ky * c;
        }

        // Tangent space normal vector with soft, silky slope scaling
        const scale = 0.18;
        const nx = Math.max(-0.85, Math.min(0.85, dw_dx * scale));
        const ny = Math.max(-0.85, Math.min(0.85, dw_dy * scale));
        const nz = Math.sqrt(Math.max(0.1, 1 - nx * nx - ny * ny));

        data[idx] = Math.floor((nx * 0.5 + 0.5) * 255); // R = tangent X
        data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // G = tangent Y
        data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255); // B = surface Z
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textureCache.set(key, texture);
    return texture;
  }
}
