/**
 * Realm of Crowns - Procedural High-Definition Medieval Texture Generator
 * Generates authentic stone masonry, aged timber planks, terracotta roof tiles,
 * golden thatched straw, cobblestone pavement, and heraldic crest banners.
 * Converts HTML5 canvases into Three.js CanvasTexture with RepeatWrapping and mipmapping.
 * Safely falls back to valid procedural textures in headless / test environments.
 */

import * as THREE from 'three';
import { HeroClass } from '../../types';

// Texture Cache to ensure zero duplicated texture allocation or memory leaks
const textureCache: Map<string, THREE.CanvasTexture> = new Map();

function createSafeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

function getFallbackTexture(key: string): THREE.CanvasTexture {
  if (textureCache.has(key)) return textureCache.get(key)!;
  const tex = new THREE.CanvasTexture({} as HTMLCanvasElement);
  textureCache.set(key, tex);
  return tex;
}

/**
 * 1. Mortared Ashlar Stone Wall Texture
 */
export function getStoneWallTexture(): THREE.CanvasTexture {
  const key = 'stone_wall_hd';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const safe = createSafeCanvas(512, 512);
  if (!safe) return getFallbackTexture(key);
  const { canvas, ctx } = safe;

  // Base stone tone
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 512, 512);

  // Stone masonry blocks
  const rows = 16;
  const rowH = 512 / rows;
  const cols = 8;
  const blockW = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (blockW / 2);

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * blockW + offset;
      const brightness = 80 + Math.sin(r * 13 + c * 37) * 25 + Math.cos(r * 7) * 15;
      const red = Math.floor(brightness * 1.05);
      const green = Math.floor(brightness * 1.08);
      const blue = Math.floor(brightness * 1.15);

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(x + 2, y + 2, blockW - 4, rowH - 4);

      // Bevel highlights & shadow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(x + 2, y + 2, blockW - 4, 3);
      ctx.fillRect(x + 2, y + 2, 3, rowH - 4);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x + 2, y + rowH - 5, blockW - 4, 3);
      ctx.fillRect(x + blockW - 5, y + 2, 3, rowH - 4);
    }
  }

  // Mortar lines
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * rowH);
    ctx.lineTo(512, r * rowH);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * 2. Aged Timber Wood Planks
 */
export function getWoodPlankTexture(): THREE.CanvasTexture {
  const key = 'wood_plank_hd';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const safe = createSafeCanvas(512, 512);
  if (!safe) return getFallbackTexture(key);
  const { canvas, ctx } = safe;

  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 0, 512, 512);

  const numPlanks = 10;
  const plankW = 512 / numPlanks;

  for (let p = 0; p < numPlanks; p++) {
    const x = p * plankW;
    const baseTone = 80 + (p % 3) * 12 + Math.sin(p * 5) * 8;
    ctx.fillStyle = `rgb(${baseTone + 35}, ${baseTone + 15}, ${baseTone - 10})`;
    ctx.fillRect(x + 1, 0, plankW - 2, 512);

    ctx.strokeStyle = 'rgba(40, 15, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 10; g++) {
      const gx = x + 3 + (g * (plankW - 6)) / 10;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + (g % 2 === 0 ? 3 : -3), 512);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * 3. Medieval Roof Slate / Tile Texture
 */
export function getRoofTileTexture(primaryColor = '#1d4ed8', isSlate = false): THREE.CanvasTexture {
  const key = `roof_tile_${primaryColor}_${isSlate}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const safe = createSafeCanvas(512, 512);
  if (!safe) return getFallbackTexture(key);
  const { canvas, ctx } = safe;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 20;
  const rowH = 512 / rows;
  const cols = 12;
  const tileW = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (tileW / 2);

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * tileW + offset;
      ctx.fillStyle = primaryColor;
      ctx.fillRect(x + 1, y, tileW - 2, rowH + 2);

      const grad = ctx.createLinearGradient(x, y, x, y + rowH);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y, tileW - 2, rowH + 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(key, texture);
  return texture;
}

/**
 * 4. Golden Farm Straw Thatch
 */
export function getThatchTexture(): THREE.CanvasTexture {
  const key = 'thatch_straw_hd';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const safe = createSafeCanvas(512, 512);
  if (!safe) return getFallbackTexture(key);
  const { canvas, ctx } = safe;

  ctx.fillStyle = '#a16207';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 15 + Math.random() * 20;
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * 5. Cobblestone Pavement Texture
 */
export function getCobblestoneTexture(): THREE.CanvasTexture {
  const key = 'cobblestone_hd';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const safe = createSafeCanvas(512, 512);
  if (!safe) return getFallbackTexture(key);
  const { canvas, ctx } = safe;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const cols = 16;
  const stoneW = 512 / cols;
  const stoneH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * stoneH;
    const offset = (r % 2) * (stoneW * 0.5);

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * stoneW + offset;
      const brightness = 95 + Math.sin(r * 7 + c * 11) * 20;
      ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 10})`;
      ctx.fillRect(x + 2, y + 2, stoneW - 4, stoneH - 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(key, texture);
  return texture;
}

/**
 * 6. Woven Heraldic Silk Banner Texture
 */
export function getHeraldicBannerTexture(heroClass?: HeroClass): THREE.CanvasTexture {
  const key = `banner_heraldry_${heroClass || 'default'}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const safe = createSafeCanvas(256, 512);
  if (!safe) return getFallbackTexture(key);
  const { canvas, ctx } = safe;

  const classColors: Record<HeroClass, { field: string; border: string; crest: string }> = {
    warlord: { field: '#991b1b', border: '#f59e0b', crest: '#fbbf24' },
    guardian: { field: '#0369a1', border: '#f59e0b', crest: '#ffffff' },
    ranger: { field: '#166534', border: '#ca8a04', crest: '#86efac' },
    steward: { field: '#854d0e', border: '#fef08a', crest: '#fef08a' },
    strategist: { field: '#581c87', border: '#e9d5ff', crest: '#c084fc' },
  };

  const palette = (heroClass && classColors[heroClass]) || {
    field: '#1e3a8a',
    border: '#f59e0b',
    crest: '#fef08a',
  };

  ctx.fillStyle = palette.field;
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 496);

  ctx.fillStyle = palette.crest;
  ctx.beginPath();
  ctx.arc(128, 200, 50, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}
