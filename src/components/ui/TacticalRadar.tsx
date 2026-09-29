/**
 * REALM OF CROWNS — Medieval Tactical Radar Minimap
 * Real-time top-down tactical radar displaying Hero, Vanguard units, Raiders,
 * Citadel landmark, active Move Order beacons, and Loot drops within a 50m perception radius.
 */

import React, { useState } from 'react';
import { Compass, Eye, EyeOff, Shield, Target } from 'lucide-react';

export interface RadarEntity {
  id: string;
  x: number;
  z: number;
  type: 'hero' | 'ally' | 'enemy' | 'neutral' | 'loot' | 'beacon';
  name?: string;
}

interface TacticalRadarProps {
  heroPos: { x: number; z: number; rotationY: number };
  entities: RadarEntity[];
  range?: number; // Distance in meters displayed (e.g. 45m radius)
  onPingLocation?: (worldX: number, worldZ: number) => void;
  className?: string;
}

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  heroPos,
  entities,
  range = 42,
  onPingLocation,
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const radarSize = 136; // px diameter
  const center = radarSize / 2;
  const scale = center / range; // px per meter

  const handleRadarClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPingLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - center;
    const clickY = e.clientY - rect.top - center;

    // Convert screen offset back to world coordinates relative to hero
    const worldX = heroPos.x + clickX / scale;
    const worldZ = heroPos.z + clickY / scale;
    onPingLocation(worldX, worldZ);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-stone-800 transition shadow-lg"
        title="Open Tactical Radar"
      >
        <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
        <span>Radar</span>
      </button>
    );
  }

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Radar Shell */}
      <div className="relative p-1 rounded-full bg-stone-950/85 backdrop-blur-md border-2 border-amber-600/60 shadow-[0_0_15px_rgba(0,0,0,0.8),inset_0_0_12px_rgba(217,119,6,0.2)]">
        {/* Cardinal Markers */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-400 pointer-events-none drop-shadow">
          N
        </span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-500/80 pointer-events-none drop-shadow">
          S
        </span>
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500/80 pointer-events-none drop-shadow">
          W
        </span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500/80 pointer-events-none drop-shadow">
          E
        </span>

        {/* SVG Canvas */}
        <svg
          width={radarSize}
          height={radarSize}
          className="rounded-full cursor-crosshair overflow-hidden"
          onClick={handleRadarClick}
        >
          <defs>
            {/* Range sweep rings */}
            <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(30, 41, 59, 0.4)" />
              <stop offset="70%" stopColor="rgba(15, 23, 42, 0.6)" />
              <stop offset="100%" stopColor="rgba(217, 119, 6, 0.25)" />
            </radialGradient>
          </defs>

          {/* Background & concentric range grids */}
          <circle cx={center} cy={center} r={center - 2} fill="url(#radarSweep)" />
          <circle cx={center} cy={center} r={(center - 2) * 0.33} fill="none" stroke="rgba(217, 119, 6, 0.2)" strokeDasharray="2,2" />
          <circle cx={center} cy={center} r={(center - 2) * 0.66} fill="none" stroke="rgba(217, 119, 6, 0.25)" strokeDasharray="3,3" />
          <circle cx={center} cy={center} r={center - 3} fill="none" stroke="rgba(217, 119, 6, 0.4)" />

          {/* Crosshair axes */}
          <line x1={center} y1={4} x2={center} y2={radarSize - 4} stroke="rgba(217, 119, 6, 0.2)" strokeWidth="1" />
          <line x1={4} y1={center} x2={radarSize - 4} y2={center} stroke="rgba(217, 119, 6, 0.2)" strokeWidth="1" />

          {/* Citadel Keep indicator at (0, 0) relative to hero */}
          {(() => {
            const keepRelX = (0 - heroPos.x) * scale;
            const keepRelZ = (0 - heroPos.z) * scale;
            const dist = Math.hypot(keepRelX, keepRelZ);
            if (dist < center - 6) {
              return (
                <rect
                  x={center + keepRelX - 4}
                  y={center + keepRelZ - 4}
                  width="8"
                  height="8"
                  fill="rgba(148, 163, 184, 0.5)"
                  stroke="rgba(203, 213, 225, 0.8)"
                  strokeWidth="1"
                />
              );
            }
            return null;
          })()}

          {/* Render Entities */}
          {entities.map((ent) => {
            const dx = (ent.x - heroPos.x) * scale;
            const dz = (ent.z - heroPos.z) * scale;
            const dist = Math.hypot(dx, dz);

            // Clamp to radar perimeter if beyond range
            let posX = center + dx;
            let posY = center + dz;
            if (dist > center - 6) {
              const ratio = (center - 6) / dist;
              posX = center + dx * ratio;
              posY = center + dz * ratio;
            }

            if (ent.type === 'enemy') {
              return (
                <circle
                  key={ent.id}
                  cx={posX}
                  cy={posY}
                  r="3.2"
                  fill="#ef4444"
                  stroke="#7f1d1d"
                  strokeWidth="1"
                  className="animate-pulse"
                />
              );
            }

            if (ent.type === 'ally') {
              return (
                <circle
                  key={ent.id}
                  cx={posX}
                  cy={posY}
                  r="2.4"
                  fill="#38bdf8"
                  stroke="#0369a1"
                  strokeWidth="0.8"
                />
              );
            }

            if (ent.type === 'loot') {
              return (
                <polygon
                  key={ent.id}
                  points={`${posX},${posY - 3} ${posX + 3},${posY} ${posX},${posY + 3} ${posX - 3},${posY}`}
                  fill="#fbbf24"
                  stroke="#78350f"
                  strokeWidth="0.8"
                  className="animate-spin-slow"
                />
              );
            }

            if (ent.type === 'beacon') {
              return (
                <circle
                  key={ent.id}
                  cx={posX}
                  cy={posY}
                  r="4"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  className="animate-ping"
                />
              );
            }

            if (ent.type === 'neutral') {
              return (
                <circle
                  key={ent.id}
                  cx={posX}
                  cy={posY}
                  r="2"
                  fill="#34d399"
                  stroke="#065f46"
                  strokeWidth="0.6"
                />
              );
            }

            return null;
          })}

          {/* Hero Marker at Center */}
          <circle cx={center} cy={center} r="4.2" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.2" />

          {/* Hero Orientation Heading Cone */}
          {(() => {
            const angleRad = heroPos.rotationY;
            const tipX = center + Math.sin(angleRad) * 11;
            const tipY = center - Math.cos(angleRad) * 11;
            const leftX = center + Math.sin(angleRad - 2.5) * 5;
            const leftY = center - Math.cos(angleRad - 2.5) * 5;
            const rightX = center + Math.sin(angleRad + 2.5) * 5;
            const rightY = center - Math.cos(angleRad + 2.5) * 5;

            return (
              <polygon
                points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
                fill="#60a5fa"
                stroke="#1d4ed8"
                strokeWidth="0.8"
              />
            );
          })()}
        </svg>

        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-stone-900 border border-amber-600/50 text-stone-400 hover:text-white transition shadow"
          title="Minimize Radar"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>

      {/* Mini Legend Bar */}
      <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-stone-950/80 backdrop-blur-sm border border-stone-800/80 rounded text-[9px] text-stone-300 font-medium">
        <span className="flex items-center gap-1 text-blue-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Ally
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Enemy
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Loot
        </span>
      </div>
    </div>
  );
};
