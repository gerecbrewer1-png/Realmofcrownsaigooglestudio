/**
 * REALM OF CROWNS — Screen-Space 3D Projected Floating Combat Text
 * Projects 3D combat damage, critical strikes, blocks, and healing from world space to screen viewport.
 * Features spring pop-in, upward drift, and smooth alpha fade.
 */

import React, { useEffect, useState, useRef } from 'react';
import { PlayCanvasApp } from '../../game/playcanvas/PlayCanvasApp';
import * as pc from 'playcanvas';

interface ProjectedNumber {
  id: string;
  screenX: number;
  screenY: number;
  amount: number;
  isCrit: boolean;
  isHeal: boolean;
  color: string;
  opacity: number;
  scale: number;
  label?: string;
}

interface FloatingCombatTextProps {
  app: PlayCanvasApp | null;
  lootToasts?: Array<{ id: string; label: string; x: number; y: number; z: number; age: number }>;
}

export const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({ app, lootToasts = [] }) => {
  const [projectedItems, setProjectedItems] = useState<ProjectedNumber[]>([]);
  const screenVecRef = useRef(new pc.Vec3());
  const worldVecRef = useRef(new pc.Vec3());

  useEffect(() => {
    if (!app) return;

    let animId: number;

    const project = () => {
      const camera = app.getCameraComponent();
      if (!camera) {
        animId = requestAnimationFrame(project);
        return;
      }

      const canvas = app.canvas;
      if (!canvas) {
        animId = requestAnimationFrame(project);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const canvasW = rect.width;
      const canvasH = rect.height;

      const rawNumbers = app.combatSystem.getFloatingNumbers();
      const results: ProjectedNumber[] = [];

      for (const fn of rawNumbers) {
        worldVecRef.current.set(fn.x, fn.y, fn.z);

        // Project world to screen space
        const screen = screenVecRef.current;
        camera.worldToScreen(worldVecRef.current, screen);

        // Discard points behind camera
        if (screen.z < 0) continue;

        // In PlayCanvas worldToScreen, screen.x / screen.y are in physical or device pixels
        // Convert to percentage or CSS pixels
        const cssX = (screen.x / (canvas.width || 1)) * canvasW;
        const cssY = (screen.y / (canvas.height || 1)) * canvasH;

        // Check visible bounds
        if (cssX < -50 || cssX > canvasW + 50 || cssY < -50 || cssY > canvasH + 50) continue;

        const progress = 1.0 - fn.lifetime / fn.maxLifetime; // 0 to 1
        const opacity = Math.max(0, Math.min(1, 1.0 - Math.pow(progress, 2.5)));
        const scale = fn.isCrit
          ? progress < 0.2
            ? 1.0 + (progress / 0.2) * 0.6
            : 1.6 - ((progress - 0.2) / 0.8) * 0.4
          : progress < 0.15
          ? 1.0 + (progress / 0.15) * 0.25
          : 1.25 - ((progress - 0.15) / 0.85) * 0.25;

        results.push({
          id: fn.id,
          screenX: cssX,
          screenY: cssY,
          amount: fn.amount,
          isCrit: fn.isCrit,
          isHeal: fn.isHeal,
          color: fn.color,
          opacity,
          scale
        });
      }

      // Add Loot Toasts
      for (const toast of lootToasts) {
        worldVecRef.current.set(toast.x, toast.y + toast.age * 1.6, toast.z);
        const screen = screenVecRef.current;
        camera.worldToScreen(worldVecRef.current, screen);
        if (screen.z < 0) continue;

        const cssX = (screen.x / (canvas.width || 1)) * canvasW;
        const cssY = (screen.y / (canvas.height || 1)) * canvasH;

        results.push({
          id: toast.id,
          screenX: cssX,
          screenY: cssY,
          amount: 0,
          isCrit: false,
          isHeal: true,
          color: '#fbbf24',
          opacity: Math.max(0, 1.0 - toast.age / 1.5),
          scale: 1.2,
          label: toast.label
        });
      }

      setProjectedItems(results);
      animId = requestAnimationFrame(project);
    };

    animId = requestAnimationFrame(project);
    return () => cancelAnimationFrame(animId);
  }, [app, lootToasts]);

  if (projectedItems.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {projectedItems.map((item) => (
        <div
          key={item.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 font-black tracking-wider select-none"
          style={{
            left: `${item.screenX}px`,
            top: `${item.screenY}px`,
            opacity: item.opacity,
            transform: `translate(-50%, -50%) scale(${item.scale})`,
            color: item.color,
            textShadow: item.isCrit
              ? '0 0 8px rgba(255, 77, 79, 0.9), 0 2px 4px #000'
              : '0 2px 4px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.7)'
          }}
        >
          {item.label ? (
            <span className="text-amber-300 text-sm font-bold bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded shadow-lg">
              ✨ {item.label}
            </span>
          ) : item.isCrit ? (
            <span className="flex items-center gap-1 text-base md:text-lg text-rose-400">
              <span className="text-xs bg-rose-600 text-white px-1 py-0.5 rounded font-bold uppercase tracking-widest">
                CRIT
              </span>
              <span>-{item.amount}</span>
            </span>
          ) : item.isHeal ? (
            <span className="text-emerald-400 text-sm md:text-base font-bold">
              +{item.amount}
            </span>
          ) : (
            <span className="text-sm md:text-base">
              -{item.amount}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
